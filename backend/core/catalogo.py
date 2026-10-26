"""Catálogo de categorias e habilidades de serviço.

A fonte é o mesmo JSON usado pelo frontend (src/data/professional-options.json),
para que o backend aceite exatamente as opções que os filtros da página inicial
e o formulário de anúncio oferecem. Cada categoria é ampla (ex.: "Cuidados
Pessoais") e as habilidades a especificam (ex.: "Babá", "Manicure").
"""
import json
from functools import lru_cache

from django.conf import settings

PASTA_DADOS = settings.BASE_DIR.parent / 'src' / 'data'
CAMINHO_CATALOGO = PASTA_DADOS / 'professional-options.json'
MAX_HABILIDADES_ANUNCIO = 5


@lru_cache(maxsize=1)
def categorias_do_catalogo():
    """Lista de (categoria, [habilidades]) na ordem do arquivo."""
    with open(CAMINHO_CATALOGO, encoding='utf-8') as arquivo:
        categorias = json.load(arquivo)['categories']
    return tuple((categoria['name'], tuple(categoria['skills'])) for categoria in categorias)


@lru_cache(maxsize=1)
def habilidades_por_categoria():
    return {nome: frozenset(habilidades) for nome, habilidades in categorias_do_catalogo()}
