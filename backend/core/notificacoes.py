"""Notificações do usuário + publicador WebSocket (Redis Pub/Sub).

Quando uma notificação é criada ou lida, um evento é publicado no canal
pessoal do usuário (`notif:{user_id}:pubsub`). O `NotificacaoConsumer`
(em `core/consumers.py`) entrega isso em tempo real ao navegador, sem
necessidade de polling.

O Redis é usado só como "sininho": se ele falhar, a notificação já está
salva no Postgres — quem estiver desconectado recebe o estado correto na
próxima reconexão do WebSocket (o consumidor envia um snapshot completo ao
conectar).
"""

import json

from .models import Notificacao


def canal_notificacoes(user_id):
    """Canal Pub/Sub pessoal do usuário para eventos de notificação."""
    return f'notif:{user_id}:pubsub'


def _get_client():
    from .chat import get_client
    return get_client()


def _publicar(user_id, payload):
    """Publica um evento no canal pessoal do usuário (best-effort)."""
    if not user_id:
        return
    try:
        r = _get_client()
        r.publish(
            canal_notificacoes(user_id),
            json.dumps(payload, ensure_ascii=False),
        )
    except Exception:
        pass


def resumo_nao_lidas(usuario):
    """Retorna o resumo de notificações não lidas do usuário."""
    if not usuario or not usuario.id:
        return {'naoLidas': 0, 'tipos': {}}
    from django.db.models import Count

    nao_lidas = Notificacao.objects.filter(usuario=usuario, lida=False)
    return {
        'naoLidas': nao_lidas.count(),
        'tipos': dict(
            nao_lidas.values_list('tipo').annotate(total_tipo=Count('id'))
        ),
    }


def publicar_resumo_notificacoes(usuario):
    """Publica o snapshot atual de não lidas do usuário no WebSocket."""
    _publicar(usuario.id, {
        'tipo': 'sincronizacao',
        **resumo_nao_lidas(usuario),
    })


def publicar_chat_nao_lidas(user_id, total):
    """Publica o total de mensagens não lidas do chat para o usuário."""
    _publicar(user_id, {'tipo': 'chat_nao_lidas', 'total': total})


def criar_notificacao(usuario, tipo, titulo, mensagem='', link=''):
    """Cria um registro de notificação para um usuário (sem lançar erro)
    e publica o evento no WebSocket pessoal do usuário."""
    if not usuario:
        return None
    try:
        notificacao = Notificacao.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo[:255],
            mensagem=mensagem or '',
            link=link or '',
        )
    except Exception:
        return None

    _publicar(usuario.id, {
        'tipo': 'nova_notificacao',
        'notificacao': {
            'id': notificacao.id,
            'tipo': notificacao.tipo,
            'titulo': notificacao.titulo,
            'mensagem': notificacao.mensagem,
            'link': notificacao.link,
            'lida': notificacao.lida,
            'criado_em': notificacao.criado_em.isoformat() if notificacao.criado_em else None,
        },
        **resumo_nao_lidas(usuario),
    })
    return notificacao