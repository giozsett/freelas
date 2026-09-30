"""Dados de demonstração para a apresentação: contas, vagas, candidaturas e
um acordo em cada etapa do ciclo (docs/roteiro-apresentacao.md).

Só mexe em contas com e-mail @demo.freelas.com, então pode rodar no banco
compartilhado sem afetar dados reais. Rode no dia da apresentação: os prazos
de pagamento e de confirmação contam a partir da criação dos acordos.

    python manage.py popular_demo            # remove e recria os dados de demonstração
    python manage.py popular_demo --remover  # apenas remove
"""

from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.ciclo_acordo import expirar_pagamento
from core.models import (
    Ad,
    AcordoServico,
    Candidatura,
    MensagemChat,
    Pagamento,
    Report,
    SolicitacaoCancelamentoAcordo,
)
from core.notificacoes import criar_notificacao
from core.serializers import AvaliacaoSerializer, obter_criterios_definicao

DOMINIO_DEMO = 'demo.freelas.com'
SENHA_DEMO = 'Freelas@2026'

CONTRATANTES = [
    {
        'chave': 'clinica', 'nome': 'Renata Alves', 'plano': 'Platinum',
        'perfil': {
            'tipo_empresa': 'cnpj',
            'nome_empresa': 'Clínica Veterinária Pet Feliz',
            'ramos_atuacao': ['Pet e Veterinário', 'Saúde e Bem-estar'],
            'porte_empresa': 'pequena',
            'bio_empresa': 'Clínica veterinária com atendimento clínico, vacinação e banho e tosa.',
        },
    },
    {
        'chave': 'padaria', 'nome': 'Paulo Martins', 'plano': 'Gold',
        'perfil': {
            'tipo_empresa': 'cnpj',
            'nome_empresa': 'Padaria Doce Sabor',
            'ramos_atuacao': ['Alimentação e Restaurantes'],
            'porte_empresa': 'micro',
            'bio_empresa': 'Padaria artesanal com pães, bolos e entregas no bairro.',
        },
    },
    {
        'chave': 'marcos', 'nome': 'Marcos Oliveira', 'plano': 'Gratuito',
        'perfil': {'tipo_empresa': 'pessoa'},
    },
]

FREELANCERS = [
    {
        'chave': 'ana', 'nome': 'Ana Souza', 'plano': 'Gold',
        'perfil': {
            'bio': 'Designer gráfica há 6 anos, especialista em identidade visual para pequenos negócios.',
            'categories': ['Design Gráfico', 'UI/UX e Produto'],
            'skills': ['Identidade Visual', 'Criação de Logotipo', 'Illustrator', 'Figma'],
        },
    },
    {
        'chave': 'bruno', 'nome': 'Bruno Lima', 'plano': 'Gratuito',
        'perfil': {
            'bio': 'Desenvolvedor web full stack: sites institucionais, sistemas de agendamento e APIs.',
            'categories': ['Desenvolvimento Web'],
            'skills': ['React', 'Django', 'APIs REST', 'JavaScript'],
        },
    },
    {
        'chave': 'carla', 'nome': 'Carla Mendes', 'plano': 'Gratuito',
        'perfil': {
            'bio': 'Fotógrafa e editora de vídeo para redes sociais e eventos.',
            'categories': ['Vídeo, Áudio e Fotografia'],
            'skills': ['Fotografia', 'Tratamento de Imagem', 'Edição de Vídeo', 'Motion Design'],
        },
    },
]

VAGAS = [
    {
        'chave': 'identidade', 'autor': 'clinica', 'title': 'Identidade visual para clínica veterinária',
        'category': 'Design Gráfico', 'skills': ['Identidade Visual', 'Criação de Logotipo', 'Illustrator'],
        'price': '800', 'price_unit': 'total', 'dias_prazo': 20,
        'description': 'Logotipo, paleta de cores e aplicação em fachada, receituário e redes sociais.',
    },
    {
        'chave': 'site', 'autor': 'clinica', 'title': 'Site institucional com agendamento online',
        'category': 'Desenvolvimento Web', 'skills': ['React', 'Django', 'APIs REST'],
        'price': '2500', 'price_unit': 'total', 'dias_prazo': 30,
        'description': 'Site com páginas de serviços, equipe e agendamento de consultas integrado à agenda da clínica.',
    },
    {
        'chave': 'fotos_pets', 'autor': 'clinica', 'title': 'Ensaio fotográfico dos pacientes para as redes sociais',
        'category': 'Vídeo, Áudio e Fotografia', 'skills': ['Fotografia', 'Tratamento de Imagem'],
        'price': '400', 'price_unit': 'total', 'dias_prazo': 10, 'presencial': True,
        'description': 'Uma manhã de fotos na clínica, com 30 fotos tratadas para Instagram.',
    },
    {
        'chave': 'video', 'autor': 'clinica', 'title': 'Vídeo institucional de 1 minuto',
        'category': 'Vídeo, Áudio e Fotografia', 'skills': ['Edição de Vídeo', 'Motion Design'],
        'price': '900', 'price_unit': 'total', 'dias_prazo': 25,
        'description': 'Edição de vídeo institucional com imagens gravadas pela clínica, trilha e legendas.',
    },
    {
        'chave': 'cardapio', 'autor': 'padaria', 'title': 'Cardápio digital para pedidos de delivery',
        'category': 'Desenvolvimento Web', 'skills': ['HTML/CSS', 'JavaScript', 'WordPress'],
        'price': '1200', 'price_unit': 'total', 'dias_prazo': 15,
        'description': 'Página com o cardápio, fotos dos produtos e botão de pedido pelo WhatsApp.',
    },
    {
        'chave': 'fotos_produtos', 'autor': 'padaria', 'title': 'Fotos dos produtos para o cardápio',
        'category': 'Vídeo, Áudio e Fotografia', 'skills': ['Fotografia', 'Tratamento de Imagem'],
        'price': '350', 'price_unit': 'total', 'dias_prazo': 12, 'presencial': True,
        'description': 'Fotos de 25 produtos com fundo neutro, tratadas e entregues em alta resolução.',
    },
    {
        'chave': 'logotipo', 'autor': 'marcos', 'title': 'Logotipo para loja virtual de bolos caseiros',
        'category': 'Design Gráfico', 'skills': ['Criação de Logotipo', 'Canva'],
        'price': '300', 'price_unit': 'total', 'dias_prazo': 14,
        'description': 'Logotipo simples e versões para perfil do Instagram e etiqueta de embalagem.',
    },
    {
        'chave': 'planilha', 'autor': 'marcos', 'title': 'Planilha de controle financeiro da loja',
        'category': 'Dados e Inteligência Artificial', 'skills': ['Excel Avançado', 'Análise de Dados'],
        'price': '60', 'price_unit': '/h', 'dias_prazo': 10,
        'description': 'Planilha de entradas, saídas e estoque com gráfico mensal de vendas.',
    },
]


def email_demo(chave):
    return f'{chave}@{DOMINIO_DEMO}'


def remover_dados_demo():
    """Remove todas as contas @demo.freelas.com e o que pertence a elas."""
    ids = list(User.objects.filter(email__iendswith=f'@{DOMINIO_DEMO}').values_list('id', flat=True))
    anuncios = list(Ad.objects.filter(author_id__in=ids).values_list('id', flat=True))
    Report.objects.filter(
        Q(reporter_id__in=ids)
        | Q(type='user', target_id__in=[str(i) for i in ids])
        | Q(type='ad', target_id__in=[str(i) for i in anuncios])
    ).delete()
    # As solicitações protegem quem as criou (on_delete=PROTECT): apaga os acordos antes
    AcordoServico.objects.filter(
        Q(candidatura__user_id__in=ids) | Q(candidatura__ad__author_id__in=ids)
    ).delete()
    User.objects.filter(id__in=ids).delete()
    return len(ids)


class Command(BaseCommand):
    help = 'Cria (ou remove) os dados de demonstração usados na apresentação.'

    def add_arguments(self, parser):
        parser.add_argument('--remover', action='store_true', help='Apenas remove os dados de demonstração.')

    def handle(self, *args, **options):
        with transaction.atomic():
            removidas = remover_dados_demo()
            if options['remover']:
                self.stdout.write(self.style.SUCCESS(f'{removidas} conta(s) de demonstração removida(s).'))
                return
            self.agora = timezone.now()
            self.usuarios = {}
            self._criar_contas()
            self.vagas = {v['chave']: self._criar_vaga(v) for v in VAGAS}
            acordos = self._criar_cenarios()
        self._imprimir_resumo(acordos)

    # ── Contas ──

    def _criar_contas(self):
        for dados in CONTRATANTES:
            self.usuarios[dados['chave']] = self._criar_usuario(dados, 'contratante')
        for dados in FREELANCERS:
            self.usuarios[dados['chave']] = self._criar_usuario(dados, 'freelancer')

    def _criar_usuario(self, dados, papel):
        email = email_demo(dados['chave'])
        primeiro, _, sobrenome = dados['nome'].partition(' ')
        user = User.objects.create_user(
            username=email, email=email, password=SENHA_DEMO, first_name=primeiro, last_name=sobrenome,
        )
        profile = user.profile
        profile.papel = papel
        profile.nome_completo = dados['nome']
        profile.subscription_plan = dados['plano']
        profile.cidade = 'Araçatuba'
        profile.estado = 'SP'
        profile.aceitou_termos_empresa = papel == 'contratante'
        profile.aceitou_termos_freelancer = papel == 'freelancer'
        for campo, valor in dados['perfil'].items():
            setattr(profile, campo, valor)
        if profile.ramos_atuacao:
            profile.ramo_empresa = ', '.join(profile.ramos_atuacao)
        profile.save()
        return user

    def _criar_vaga(self, dados):
        presencial = dados.get('presencial', False)
        return Ad.objects.create(
            author=self.usuarios[dados['autor']],
            role='contractor',
            title=dados['title'],
            description=dados['description'],
            category=dados['category'],
            skills=dados['skills'],
            price=dados['price'],
            price_unit=dados['price_unit'],
            location_type='presencial' if presencial else 'remoto',
            estado='SP' if presencial else '',
            cidade='Araçatuba' if presencial else '',
            deadline=(timezone.localdate() + timedelta(days=dados['dias_prazo'])).isoformat(),
            status_anuncio='Em aberto',
        )

    # ── Cenários ──

    def _candidatar(self, freelancer, vaga, mensagem):
        return Candidatura.objects.create(
            user=self.usuarios[freelancer], ad=self.vagas[vaga], status='pendente', mensagem=mensagem,
        )

    def _aprovar(self, candidatura):
        candidatura.status = 'aprovada'
        candidatura.save()
        return AcordoServico.objects.get(candidatura=candidatura)

    def _pagar(self, acordo):
        contratante, _ = acordo.partes()
        Pagamento.objects.create(
            usuario=contratante,
            tipo='acordo',
            status='pago',
            valor=acordo.valor_total_com_taxa,
            referencia_externa=f'demo:acordo:{acordo.pk}:{uuid4().hex}',
            acordo=acordo,
            mp_payment_id=f'DEMO-{uuid4().hex}',
            forma_pagamento='demonstracao',
            detalhe_status='dados_de_demonstracao',
            aprovado_em=self.agora - timedelta(days=3),
        )
        acordo.status_acordo = 'Ativo'
        acordo.save(update_fields=['status_acordo'])

    def _conversar(self, acordo, *falas):
        for remetente, texto in falas:
            MensagemChat.objects.create(acordo=acordo, remetente=self.usuarios[remetente], texto=texto)

    def _avaliar(self, acordo, avaliador, notas, comentario):
        usuario = self.usuarios[avaliador]
        contratante, _ = acordo.partes()
        papel_avaliado = 'freelancer' if usuario == contratante else 'contratante'
        modalidade = 'presencial' if acordo.candidatura.ad.location_type == 'presencial' else 'remoto'
        criterios = {
            item['chave']: nota
            for item, nota in zip(obter_criterios_definicao(papel_avaliado, modalidade), notas)
        }
        serializer = AvaliacaoSerializer(
            data={'acordo': acordo.id, 'criterios': criterios, 'comentario': comentario},
            context={'request': SimpleNamespace(user=usuario)},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

    def _criar_cenarios(self):
        acordos = []

        # 1. Concluído e avaliado pelas duas partes (reputação nos perfis)
        concluido = self._aprovar(self._candidatar(
            'ana', 'identidade', 'Tenho portfólio com identidades para clínicas e pet shops. Entrego em 10 dias.',
        ))
        self._pagar(concluido)
        AcordoServico.objects.filter(pk=concluido.pk).update(
            status_acordo='Concluído',
            entregue_em=self.agora - timedelta(days=2),
            concluido_em=self.agora - timedelta(days=1),
        )
        concluido.refresh_from_db()
        self._avaliar(concluido, 'clinica', [5, 5, 4], 'Entregou antes do prazo e captou bem a proposta da clínica.')
        self._avaliar(concluido, 'ana', [5, 5, 5], 'Briefing claro e pagamento sem atrasos.')
        acordos.append(concluido)

        # 2. Em andamento e pago: o freelancer pode marcar a entrega ao vivo
        andamento = self._aprovar(self._candidatar(
            'bruno', 'site', 'Já fiz sistemas de agendamento em Django e React. Posso mostrar dois projetos.',
        ))
        self._pagar(andamento)
        self._conversar(
            andamento,
            ('clinica', 'Oi, Bruno! Consegue integrar o agendamento com a nossa agenda do Google?'),
            ('bruno', 'Consigo sim. Vou mandar o protótipo das telas até sexta.'),
        )
        acordos.append(andamento)

        # 3. Entregue, aguardando a confirmação do contratante
        entregue = self._aprovar(self._candidatar(
            'carla', 'fotos_pets', 'Levo iluminação portátil e entrego as fotos tratadas em 3 dias.',
        ))
        self._pagar(entregue)
        entregue.status_acordo = 'Aguardando confirmação'
        entregue.entregue_em = self.agora - timedelta(hours=20)
        entregue.save(update_fields=['status_acordo', 'entregue_em'])
        self._conversar(
            entregue,
            ('carla', 'As 30 fotos já estão na pasta compartilhada!'),
            ('clinica', 'Ficaram lindas, vou revisar com a equipe hoje.'),
        )
        criar_notificacao(
            usuario=self.usuarios['clinica'], tipo='acordo', titulo='Serviço entregue',
            mensagem=f'O freelancer marcou o acordo "{entregue.titulo_anuncio}" como entregue. Confirme a conclusão ou relate um problema.',
            link='/my-freelas',
        )
        acordos.append(entregue)

        # 4. Aguardando pagamento: o contratante paga ao vivo com o cartão de teste
        pendente = self._aprovar(self._candidatar(
            'ana', 'logotipo', 'Faço o logotipo e as versões para Instagram e etiqueta.',
        ))
        acordos.append(pendente)

        # 5. Problema relatado aguardando a moderação (serviço atrasado)
        problema = self._aprovar(self._candidatar(
            'bruno', 'cardapio', 'Entrego o cardápio em WordPress com botão de pedido pelo WhatsApp.',
        ))
        self._pagar(problema)
        AcordoServico.objects.filter(pk=problema.pk).update(
            conclusao_prevista=timezone.localdate() - timedelta(days=2),
        )
        SolicitacaoCancelamentoAcordo.objects.create(
            acordo=problema,
            solicitante=self.usuarios['padaria'],
            papel_solicitante='contratante',
            motivo='nao_entregou',
            justificativa='O prazo combinado passou e o freelancer não entregou nem respondeu às mensagens.',
        )
        problema.refresh_from_db()
        acordos.append(problema)

        # 6. Cancelado por falta de pagamento: a vaga voltou a receber candidaturas
        self._candidatar('ana', 'fotos_produtos', 'Tenho estúdio portátil e fundo infinito para fotos de produto.')
        expirado = self._aprovar(self._candidatar(
            'carla', 'fotos_produtos', 'Posso fotografar os produtos na própria padaria.',
        ))
        expirar_pagamento(expirado)
        expirado.refresh_from_db()
        acordos.append(expirado)

        # 7. Vaga aberta com candidaturas para o contratante aprovar ao vivo
        for freelancer, mensagem in (
            ('bruno', 'Monto a planilha com painel de vendas e controle de estoque.'),
            ('carla', 'Tenho experiência com planilhas de pequenos negócios.'),
        ):
            self._candidatar(freelancer, 'planilha', mensagem)
            criar_notificacao(
                usuario=self.usuarios['marcos'], tipo='candidatura', titulo='Nova candidatura no seu anúncio',
                mensagem=f'{self.usuarios[freelancer].profile.nome_completo} se candidatou ao anúncio "{{ad_titulo}}".',
                link=f'/my-ads/manage/{self.vagas["planilha"].id}', ad=self.vagas['planilha'],
            )

        # 8. Denúncia pendente para a moderação julgar
        Report.objects.create(
            type='user',
            target_id=str(self.usuarios['marcos'].id),
            target_name='Marcos Oliveira',
            reporter=self.usuarios['bruno'],
            category='fraude',
            comment='Pediu para combinar o pagamento por fora da plataforma.',
        )

        # A vaga "Vídeo institucional" fica aberta e sem candidaturas.
        return acordos

    def _imprimir_resumo(self, acordos):
        escrever = self.stdout.write
        escrever(self.style.SUCCESS(f'Dados de demonstração criados. Senha de todas as contas: {SENHA_DEMO}'))
        escrever('\nContratantes:')
        for dados in CONTRATANTES:
            nome = dados['perfil'].get('nome_empresa') or f'{dados["nome"]} (pessoa física)'
            escrever(f'  {email_demo(dados["chave"]):<28} {nome} · plano {dados["plano"]}')
        escrever('\nFreelancers:')
        for dados in FREELANCERS:
            escrever(f'  {email_demo(dados["chave"]):<28} {dados["nome"]} · plano {dados["plano"]}')
        escrever('\nAcordos:')
        for acordo in acordos:
            extra = ' (problema relatado)' if acordo.solicitacoes_cancelamento.filter(status='pendente').exists() else ''
            escrever(f'  #{acordo.id:<5} {acordo.status_acordo:<24} {acordo.titulo_anuncio}{extra}')
        escrever(
            '\nOs prazos contam a partir de agora: rode este comando no dia da apresentação.'
            '\nAdministração: use a conta de superusuário já existente (login de moderação).'
        )
