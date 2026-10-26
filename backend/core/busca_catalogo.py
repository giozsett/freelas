"""Busca semântica local no catálogo de categorias e habilidades.

Quem digita "cuidar do meu filho à noite" recebe "Babá Noturna", mesmo sem
palavras em comum. Tudo roda na máquina, sem serviço na nuvem:

- O modelo de embeddings (fastembed/ONNX, multilíngue) é baixado uma vez para
  backend/.cache/busca_catalogo/modelos.
- Cada categoria e habilidade vira um vetor uma única vez; os vetores ficam em
  backend/.cache/busca_catalogo e só são refeitos quando o catálogo, os termos
  ou o modelo mudam.
- A nota final soma a semelhança semântica com um bônus para as palavras
  digitadas que aparecem no texto do item (busca híbrida): sem o bônus, o
  modelo pequeno confunde pedidos como "trocar o chuveiro".

Enquanto o modelo carrega (ou se o fastembed não estiver instalado), a busca
responde só pelo texto, para a tela nunca ficar sem sugestões.
"""
import hashlib
import json
import logging
import os
import re
import threading
import unicodedata
from functools import lru_cache

from django.conf import settings

from .catalogo import PASTA_DADOS, categorias_do_catalogo

logger = logging.getLogger(__name__)

MODELO_PADRAO = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
PASTA_CACHE_PADRAO = settings.BASE_DIR / '.cache' / 'busca_catalogo'
CAMINHO_TERMOS = PASTA_DADOS / 'termos-habilidades.json'

# Peso do bônus por palavra encontrada no texto do item (calibrado à mão com
# buscas reais; ver README, seção "Busca no catálogo")
PESO_TEXTO = 0.25
# Só entram resultados com nota de pelo menos 80% da melhor
CORTE_RELATIVO = 0.8
PALAVRAS_IGNORADAS = {
    'para', 'pra', 'minha', 'meu', 'meus', 'minhas', 'uma', 'com', 'que', 'dos', 'das',
    'quem', 'fazer', 'por', 'sua', 'seu', 'preciso', 'algum', 'alguem', 'alguma',
}


def normalizar(texto):
    return unicodedata.normalize('NFD', texto or '').encode('ascii', 'ignore').decode().lower()


def _palavras(texto):
    return [p for p in re.findall(r'\w+', normalizar(texto)) if len(p) >= 3 and p not in PALAVRAS_IGNORADAS]


@lru_cache(maxsize=1)
def termos_das_habilidades():
    with open(CAMINHO_TERMOS, encoding='utf-8') as arquivo:
        return json.load(arquivo)['termos']


def itens_do_catalogo():
    """Um item por categoria e um por habilidade (sem repetir a habilidade que
    aparece em mais de uma categoria), cada um com o texto a vetorizar."""
    termos = termos_das_habilidades()
    itens = []
    habilidades = {}
    for categoria, nomes in categorias_do_catalogo():
        itens.append({
            'tipo': 'categoria',
            'nome': categoria,
            'categorias': [categoria],
            'texto': f'{categoria}: {", ".join(nomes[:12])}',
        })
        for nome in nomes:
            habilidades.setdefault(nome, []).append(categoria)
    for nome, categorias in habilidades.items():
        texto = f'{nome} ({", ".join(categorias)})'
        if nome in termos:
            texto += f': {termos[nome]}'
        itens.append({'tipo': 'habilidade', 'nome': nome, 'categorias': categorias, 'texto': texto})
    return itens


def _carregar_fastembed():
    from fastembed import TextEmbedding

    return TextEmbedding(
        os.environ.get('BUSCA_CATALOGO_MODELO', MODELO_PADRAO),
        cache_dir=str(PASTA_CACHE_PADRAO / 'modelos'),
    )


class IndiceCatalogo:
    def __init__(self, pasta_cache=PASTA_CACHE_PADRAO, carregar_modelo=_carregar_fastembed):
        self.pasta_cache = pasta_cache
        self._carregar_modelo = carregar_modelo
        self._trava = threading.Lock()
        self._carregando = False
        self.itens = itens_do_catalogo()
        self._textos_normalizados = [normalizar(item['texto']) for item in self.itens]
        self._modelo = None
        self._vetores = None

    @property
    def pronto(self):
        return self._vetores is not None

    def carregar(self):
        """Carrega o modelo e os vetores agora (demora na primeira vez, por
        causa do download). Sem fastembed, fica no modo texto."""
        try:
            import numpy as np

            modelo = self._carregar_modelo()
            vetores = self._vetores_do_cache_ou_novos(modelo, np)
        except Exception:  # noqa: BLE001 - qualquer falha deixa a busca no modo texto
            logger.warning('Busca semântica indisponível; usando busca por texto.', exc_info=True)
            return False
        self._modelo, self._vetores = modelo, vetores
        return True

    def carregar_em_segundo_plano(self):
        with self._trava:
            if self.pronto or self._carregando:
                return
            self._carregando = True

        def tarefa():
            try:
                self.carregar()
            finally:
                self._carregando = False

        threading.Thread(target=tarefa, name='carregar-busca-catalogo', daemon=True).start()

    def _vetores_do_cache_ou_novos(self, modelo, np):
        textos = [item['texto'] for item in self.itens]
        nome_modelo = getattr(modelo, 'model_name', type(modelo).__name__)
        assinatura = hashlib.sha256(json.dumps([nome_modelo, textos]).encode('utf-8')).hexdigest()[:16]
        caminho = os.path.join(self.pasta_cache, f'vetores-{assinatura}.npy')
        if os.path.exists(caminho):
            return np.load(caminho)
        vetores = np.array(list(modelo.passage_embed(textos)), dtype='float32')
        vetores /= np.linalg.norm(vetores, axis=1, keepdims=True) + 1e-9
        os.makedirs(self.pasta_cache, exist_ok=True)
        np.save(caminho, vetores)
        return vetores

    def _notas_texto(self, palavras):
        if not palavras:
            return [0.0] * len(self.itens)
        padroes = [re.compile(r'\b' + re.escape(p)) for p in palavras]
        return [
            sum(1 for padrao in padroes if padrao.search(texto)) / len(padroes)
            for texto in self._textos_normalizados
        ]

    def buscar(self, consulta, categoria=None, tipo=None, limite=8):
        notas = self._notas_texto(_palavras(consulta))
        modo = 'texto'
        if self.pronto:
            import numpy as np

            vetor = np.array(list(self._modelo.query_embed(consulta))[0], dtype='float32')
            vetor /= np.linalg.norm(vetor) + 1e-9
            semelhancas = self._vetores @ vetor
            notas = [float(s) + PESO_TEXTO * n for s, n in zip(semelhancas, notas)]
            modo = 'semantica'

        if tipo == 'categoria':
            # "babá" encontra "Cuidados Pessoais": a categoria vale a melhor
            # nota entre ela e as habilidades dela
            melhor_por_categoria = {}
            for nota, item in zip(notas, self.itens):
                for nome in item['categorias']:
                    melhor_por_categoria[nome] = max(melhor_por_categoria.get(nome, 0), nota)
            notas = [
                melhor_por_categoria[item['nome']] if item['tipo'] == 'categoria' else nota
                for nota, item in zip(notas, self.itens)
            ]

        candidatos = [
            (nota, item) for nota, item in zip(notas, self.itens)
            if (not tipo or item['tipo'] == tipo)
            and (not categoria or (item['tipo'] == 'habilidade' and categoria in item['categorias']))
            and nota > 0
        ]
        candidatos.sort(key=lambda par: par[0], reverse=True)
        if candidatos:
            melhor = candidatos[0][0]
            candidatos = [par for par in candidatos if par[0] >= melhor * CORTE_RELATIVO]
        return {
            'modo': modo,
            'resultados': [
                {
                    'tipo': item['tipo'],
                    'nome': item['nome'],
                    'categorias': item['categorias'],
                    'pontuacao': round(nota, 3),
                }
                for nota, item in candidatos[:limite]
            ],
        }


# Índice usado pela API; o modelo só carrega na primeira busca (ou com o
# comando `manage.py preparar_busca_catalogo`)
indice = IndiceCatalogo()
