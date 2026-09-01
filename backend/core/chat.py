"""Chat entre freelancer e contratante restrito ao acordo de serviço.

As mensagens são armazenadas no Redis (NoSQL), com a seguinte estrutura:

    chat:{acordo_id}:messages   -> LIST de mensagens (JSON), ordem cronológica
    chat:{acordo_id}:unread     -> HASH {user_id: quantidade de não lidas}

O chat "nasce" automaticamente quando a candidatura é aprovada (o modelo já
cria o AcordoServico com status "Pendente Pagamento") e fica somente leitura
quando o acordo é concluído ou cancelado.
"""

import json
import uuid

import redis as redis_lib
from django.conf import settings
from django.utils import timezone

# Status em que as duas partes podem trocar mensagens
STATUS_CHAT_ATIVO = {'Pendente Pagamento', 'Ativo'}


class ChatIndisponivel(Exception):
    """Redis inacessível — o chat não pode ser usado no momento."""


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
    try:
        return redis_lib.Redis(connection_pool=_get_pool(), decode_responses=True)
    except Exception:
        raise ChatIndisponivel()


def _seguro(fn):
    """Executa a operação no Redis e converte falhas de conexão em erro amigável."""
    try:
        return fn()
    except redis_lib.RedisError:
        raise ChatIndisponivel()


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


def _chave(acordo_id, sufixo):
    return f'chat:{acordo_id}:{sufixo}'

# Canal Pub/Sub onde os consumers WebSocket escutam novas mensagens do chat.
def _canal_pubsub(acordo_id):
    return f'chat:{acordo_id}:pubsub'


def _notificar_websocket(r, acordo_id, mensagem):
    """Publica a mensagem no canal Pub/Sub para entrega imediata via WebSocket."""
    try:
        r.publish(
            _canal_pubsub(acordo_id),
            json.dumps(
                {'tipo': 'nova_mensagem', 'mensagem': mensagem},
                ensure_ascii=False,
            ),
        )
    except Exception:
        # O chat continua funcionando sem o WebSocket (fallback para o polling).
        pass


def _nome_usuario(user):
    if not user:
        return 'Desconhecido'
    profile = getattr(user, 'profile', None)
    if profile and profile.nome_completo:
        return profile.nome_completo
    return user.get_full_name() or user.username


def enviar_mensagem(acordo, remetente, texto):
    mensagem = {
        'id': uuid.uuid4().hex,
        'acordo_id': acordo.id,
        'remetente_id': remetente.id,
        'remetente_nome': _nome_usuario(remetente),
        'texto': texto,
        'criado_em': timezone.now().isoformat(),
    }
    r = get_client()
    chave_mensagens = _chave(acordo.id, 'messages')
    _seguro(lambda: r.rpush(chave_mensagens, json.dumps(mensagem, ensure_ascii=False)))

    # Incrementa o contador de não lidas da outra parte
    contratante, freelancer = partes_do_acordo(acordo)
    outra_parte = freelancer if remetente.id == contratante.id else contratante
    if outra_parte:
        _seguro(lambda: r.hincrby(_chave(acordo.id, 'unread'), str(outra_parte.id), 1))

    # Publica a mensagem no canal Pub/Sub para entrega em tempo real
    _notificar_websocket(r, acordo.id, mensagem)

    return mensagem


def listar_mensagens(acordo_id):
    r = get_client()
    registros = _seguro(lambda: r.lrange(_chave(acordo_id, 'messages'), 0, -1))
    return [json.loads(item) for item in registros]


def ultima_mensagem(acordo_id):
    r = get_client()
    registros = _seguro(lambda: r.lrange(_chave(acordo_id, 'messages'), -1, -1))
    if not registros:
        return None
    try:
        return json.loads(registros[0])
    except (json.JSONDecodeError, TypeError):
        return None


def nao_lidas(acordo_id, user_id):
    r = get_client()
    valor = _seguro(lambda: r.hget(_chave(acordo_id, 'unread'), str(user_id)))
    try:
        return int(valor) if valor is not None else 0
    except (TypeError, ValueError):
        return 0


def marcar_lidas(acordo_id, user_id):
    r = get_client()
    _seguro(lambda: r.hdel(_chave(acordo_id, 'unread'), str(user_id)))
