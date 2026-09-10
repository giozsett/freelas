"""Chat entre freelancer e contratante restrito ao acordo de serviço.

As mensagens são a fonte de verdade no Postgres (tabela `mensagens_chat`),
então continuam disponíveis mesmo se o Redis reiniciar ou ficar fora do ar.

O Redis Pub/Sub é usado só para empurrar a mensagem nova em tempo real pros
WebSockets já conectados — é um "sininho": se ele falhar, quem estiver com o
chat aberto simplesmente não recebe a atualização instantânea (o polling do
frontend cobre esse caso), mas nenhuma mensagem é perdida.

O chat "nasce" automaticamente quando a candidatura é aprovada (o modelo já
cria o AcordoServico com status "Pendente Pagamento") e fica somente leitura
quando o acordo é concluído ou cancelado.
"""

import json

import redis as redis_lib
from django.conf import settings

# Status em que as duas partes podem trocar mensagens
STATUS_CHAT_ATIVO = {'Pendente Pagamento', 'Ativo'}


class ChatIndisponivel(Exception):
    """Mantida por compatibilidade — não é mais levantada pelas operações
    de mensagens (que agora usam o Postgres), só existe caso algum chamador
    externo ainda a capture."""


# Pool de conexões compartilhado: evita abrir uma nova conexão a cada operação,
# o que era a principal causa de lentidão no chat (cada conexão nova a
# "localhost" podia levar ~2s nesta máquina).
_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        _pool = redis_lib.ConnectionPool.from_url(settings.REDIS_URL)
    return _pool


def get_client():
    return redis_lib.Redis(connection_pool=_get_pool(), decode_responses=True)


def chat_ativo(acordo):
    return bool(acordo and acordo.status_acordo in STATUS_CHAT_ATIVO)


def partes_do_acordo(acordo):
    """Retorna (contratante, freelancer)."""
    if not acordo or not acordo.candidatura:
        return None, None
    candidatura = acordo.candidatura
    freelancer = candidatura.user if candidatura else None
    contratante = candidatura.ad.author if candidatura and candidatura.ad else None
    return contratante, freelancer


# Canal Pub/Sub onde os consumers WebSocket escutam novas mensagens do chat.
def _canal_pubsub(acordo_id):
    return f'chat:{acordo_id}:pubsub'


def _notificar_websocket(acordo_id, mensagem):
    """Publica a mensagem no canal Pub/Sub para entrega imediata via WebSocket.

    Best-effort: se o Redis estiver fora do ar, a mensagem já está salva no
    Postgres — quem estiver com o chat aberto só não recebe a atualização
    instantânea (o polling do frontend cobre esse caso).
    """
    try:
        r = get_client()
        r.publish(
            _canal_pubsub(acordo_id),
            json.dumps(
                {'tipo': 'nova_mensagem', 'mensagem': mensagem},
                ensure_ascii=False,
            ),
        )
    except Exception:
        pass


def _nome_usuario(user):
    if not user:
        return 'Desconhecido'
    profile = getattr(user, 'profile', None)
    if profile and profile.nome_completo:
        return profile.nome_completo
    return user.get_full_name() or user.username


def _serializar_mensagem(msg):
    return {
        'id': msg.id,
        'acordo_id': msg.acordo_id,
        'remetente_id': msg.remetente_id,
        'remetente_nome': _nome_usuario(msg.remetente),
        'texto': msg.texto,
        'criado_em': msg.criado_em.isoformat(),
    }


def total_nao_lidas_usuario(user):
    """Total de mensagens não lidas do usuário em todas as conversas."""
    from django.db.models import Q

    from .models import AcordoServico

    if user.is_staff or user.is_superuser:
        acordos = AcordoServico.objects.all()
    else:
        acordos = AcordoServico.objects.filter(
            Q(candidatura__user=user) | Q(candidatura__ad__author=user)
        )
    return total_nao_lidas(acordos.values_list('id', flat=True), user.id)


def _publicar_nao_lidas_da_outra_parte(acordo, remetente):
    """Notifica a(s) outra(s) parte(s) do acordo com o novo total não lido
    via WebSocket pessoal (badge de mensagens, sem polling)."""
    from .notificacoes import publicar_chat_nao_lidas

    contratante, freelancer = partes_do_acordo(acordo)
    for outra_parte in (contratante, freelancer):
        if outra_parte and outra_parte.id != remetente.id:
            publicar_chat_nao_lidas(
                outra_parte.id, total_nao_lidas_usuario(outra_parte)
            )


def enviar_mensagem(acordo, remetente, texto):
    from .models import MensagemChat

    msg = MensagemChat.objects.create(acordo=acordo, remetente=remetente, texto=texto)
    mensagem = _serializar_mensagem(msg)
    _notificar_websocket(acordo.id, mensagem)
    _publicar_nao_lidas_da_outra_parte(acordo, remetente)
    return mensagem


def listar_mensagens(acordo_id):
    from .models import MensagemChat

    qs = MensagemChat.objects.filter(acordo_id=acordo_id).select_related('remetente__profile')
    return [_serializar_mensagem(m) for m in qs]


def ultima_mensagem(acordo_id):
    from .models import MensagemChat

    msg = (
        MensagemChat.objects.filter(acordo_id=acordo_id)
        .select_related('remetente__profile')
        .order_by('-criado_em')
        .first()
    )
    return _serializar_mensagem(msg) if msg else None


def nao_lidas(acordo_id, user_id):
    from .models import MensagemChat

    return (
        MensagemChat.objects.filter(acordo_id=acordo_id, lida=False)
        .exclude(remetente_id=user_id)
        .count()
    )


def total_nao_lidas(acordo_ids, user_id):
    """Total de mensagens não lidas do usuário somando várias conversas de
    uma vez (evita uma query por acordo)."""
    from .models import MensagemChat

    return (
        MensagemChat.objects.filter(acordo_id__in=list(acordo_ids), lida=False)
        .exclude(remetente_id=user_id)
        .count()
    )


def marcar_lidas(acordo_id, user_id):
    from .models import MensagemChat

    MensagemChat.objects.filter(acordo_id=acordo_id, lida=False).exclude(
        remetente_id=user_id
    ).update(lida=True)
    # Atualiza o badge de mensagens do usuário via WebSocket.
    from django.contrib.auth.models import User

    from .notificacoes import publicar_chat_nao_lidas

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return
    publicar_chat_nao_lidas(user_id, total_nao_lidas_usuario(user))
