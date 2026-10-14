"""Regras de moderação: pontos de infração, banimento e soft ban de denúncias.

- Denúncia procedente ou disputa decidida contra uma parte soma 1 ponto de
  infração (RN08, RN09). Com LIMITE_PONTOS_BANIMENTO pontos a conta é banida:
  o login e o token deixam de funcionar (core/autenticacao.py) e os anúncios
  somem das listagens.
- Soft ban de denúncias (RN10): quem tiver SOFT_BAN_MIN_IMPROCEDENTES ou mais
  denúncias improcedentes entre as enviadas nos últimos SOFT_BAN_JANELA_DIAS,
  representando pelo menos SOFT_BAN_TAXA delas, não pode denunciar enquanto a
  condição durar (janela móvel, sem campo extra no banco).
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token

from .models import Ad, Report, UserProfile

LIMITE_PONTOS_BANIMENTO = 3
SOFT_BAN_JANELA_DIAS = 30
SOFT_BAN_MIN_IMPROCEDENTES = 5
SOFT_BAN_TAXA = 0.5

MENSAGEM_CONTA_BANIDA = (
    'Sua conta foi banida por acumular infrações às regras da plataforma. '
    'Em caso de dúvida, entre em contato com o suporte.'
)


def aplicar_infracao(usuario, motivo):
    """Soma um ponto de infração ao usuário e bane a conta ao atingir o limite.

    Retorna True quando esta infração causou o banimento.
    """
    from .notificacoes import criar_notificacao

    if not usuario:
        return False
    with transaction.atomic():
        profile = UserProfile.objects.select_for_update().filter(user=usuario).first()
        if not profile:
            return False
        profile.pontos_infracao += 1
        banido_agora = not profile.banido and profile.pontos_infracao >= LIMITE_PONTOS_BANIMENTO
        if banido_agora:
            profile.banido = True
        profile.save(update_fields=['pontos_infracao', 'banido', 'atualizado_em'])

    if banido_agora:
        # Encerra as sessões abertas; novos logins são recusados
        Token.objects.filter(user=usuario).delete()
    else:
        criar_notificacao(
            usuario=usuario,
            tipo='sistema',
            titulo='Você recebeu um ponto de infração',
            mensagem=(
                f'{motivo} Você tem {profile.pontos_infracao} de {LIMITE_PONTOS_BANIMENTO} pontos; '
                f'ao chegar a {LIMITE_PONTOS_BANIMENTO}, a conta é banida.'
            ),
        )
    return banido_agora


def usuario_denunciado(tipo, alvo_id):
    """Dono do alvo da denúncia: o próprio usuário ou o autor do anúncio."""
    try:
        alvo_id = int(alvo_id)
    except (TypeError, ValueError):
        return None
    if tipo == 'user':
        return User.objects.filter(pk=alvo_id).first()
    if tipo == 'ad':
        ad = Ad.objects.select_related('author').filter(pk=alvo_id).first()
        return ad.author if ad else None
    return None


def em_soft_ban_de_denuncias(usuario):
    desde = timezone.now() - timedelta(days=SOFT_BAN_JANELA_DIAS)
    enviadas = Report.objects.filter(reporter=usuario, created_at__gte=desde)
    total = enviadas.count()
    improcedentes = enviadas.filter(status='improcedente').count()
    return (
        improcedentes >= SOFT_BAN_MIN_IMPROCEDENTES
        and improcedentes / total >= SOFT_BAN_TAXA
    )
