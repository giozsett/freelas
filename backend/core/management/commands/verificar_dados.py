"""Relatório (somente leitura) de dados que não seguem as regras atuais:
papéis fixos, só contratante publica, só freelancer se candidata, acordo só
fica ativo com pagamento. Não altera nada: serve para o grupo decidir a
limpeza antes da apresentação.

    python manage.py verificar_dados
    python manage.py verificar_dados --detalhes   # lista até 20 registros por item
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db.models import Q

from core.models import Ad, AcordoServico, Candidatura

LIMITE_DETALHES = 20


def verificacoes():
    """Lista de (descrição, queryset, formatador de cada registro)."""
    contas_ativas = User.objects.filter(is_active=True).exclude(profile__deletado=True)
    anuncios = Ad.objects.exclude(deletado=True)
    return [
        (
            'Contas sem papel (ainda não escolheram freelancer ou contratante)',
            contas_ativas.filter(is_staff=False, is_superuser=False).filter(
                Q(profile__papel__isnull=True) | Q(profile__papel='')
            ),
            lambda u: f'usuário #{u.id} {u.email}',
        ),
        (
            "Perfis com o papel antigo 'empresa' (a migration 0044 ainda não foi aplicada)",
            contas_ativas.filter(profile__papel='empresa'),
            lambda u: f'usuário #{u.id} {u.email}',
        ),
        (
            "Superusuários/staff sem o papel 'administrador'",
            contas_ativas.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(profile__papel='administrador'),
            lambda u: f'usuário #{u.id} {u.username}',
        ),
        (
            'Anúncios antigos publicados por freelancers (ficam ocultos e não recebem candidaturas)',
            anuncios.filter(role='freelancer'),
            lambda a: f'anúncio #{a.id} "{a.title}" de {a.author.email if a.author else "?"}',
        ),
        (
            'Vagas cujo autor não é contratante',
            anuncios.exclude(role='freelancer').exclude(author__profile__papel='contratante'),
            lambda a: f'anúncio #{a.id} "{a.title}" de {a.author.email if a.author else "?"}',
        ),
        (
            'Candidaturas enviadas por quem não é freelancer',
            Candidatura.objects.exclude(deletado=True).exclude(user__profile__papel='freelancer'),
            lambda c: f'candidatura #{c.id} de {c.user.email if c.user else "?"} no anúncio #{c.ad_id}',
        ),
        (
            'Acordos com as partes trocadas (contratante que não é contratante ou freelancer que não é freelancer)',
            AcordoServico.objects.filter(
                ~Q(candidatura__ad__author__profile__papel='contratante')
                | ~Q(candidatura__user__profile__papel='freelancer')
            ),
            lambda a: f'acordo #{a.id} "{a.titulo_anuncio}" ({a.status_acordo})',
        ),
        (
            'Acordos em andamento sem pagamento aprovado',
            AcordoServico.objects.filter(
                status_acordo__in=['Ativo', 'Aguardando confirmação'],
            ).exclude(pagamentos__status='pago'),
            lambda a: f'acordo #{a.id} "{a.titulo_anuncio}" ({a.status_acordo})',
        ),
        (
            'Candidaturas aprovadas sem acordo',
            Candidatura.objects.exclude(deletado=True).filter(status='aprovada', acordos__isnull=True),
            lambda c: f'candidatura #{c.id} no anúncio #{c.ad_id}',
        ),
    ]


class Command(BaseCommand):
    help = 'Mostra (sem alterar) os dados que não seguem as regras atuais da plataforma.'

    def add_arguments(self, parser):
        parser.add_argument('--detalhes', action='store_true', help=f'Lista até {LIMITE_DETALHES} registros por item.')

    def handle(self, *args, **options):
        problemas = 0
        for descricao, queryset, formatar in verificacoes():
            total = queryset.distinct().count()
            problemas += total
            estilo = self.style.WARNING if total else self.style.SUCCESS
            self.stdout.write(estilo(f'[{total:>4}] {descricao}'))
            if options['detalhes'] and total:
                for registro in queryset.distinct()[:LIMITE_DETALHES]:
                    self.stdout.write(f'         - {formatar(registro)}')

        if problemas:
            self.stdout.write(self.style.WARNING(
                f'\n{problemas} registro(s) fora das regras. Nada foi alterado; '
                'decidam em grupo o que limpar (e façam backup antes).'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('\nNenhuma inconsistência encontrada.'))
