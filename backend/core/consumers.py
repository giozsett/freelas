"""Consumer WebSocket do chat — entrega mensagens em tempo real via Redis Pub/Sub.

Fluxo:
1. O cliente conecta em  `/ws/chat/{acordo_id}/?token=<token>`.
2. O consumer autentica pelo token REST e valida que o usuário participa do acordo.
3. Assina o canal Redis Pub/Sub `chat:{acordo_id}:pubsub`.
4. Quando `enviar_mensagem` publica nesse canal (via `core.chat`), a mensagem é
   repassada ao navegador em tempo real.

Optou-se por Redis Pub/Sub direto (em vez de Django Channels groups via
channels-redis) por compatibilidade com Python 3.14 deste ambiente.
"""

import asyncio
import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer

# Canal Pub/Sub compartilhado com core/chat._canal_pubsub
def _canal_pubsub(acordo_id):
    return f'chat:{acordo_id}:pubsub'


def _autenticar_por_token(token):
    """Autentica usando o Token REST. Retorna o usuário ou None."""
    from rest_framework.authtoken.models import Token
    try:
        token_obj = Token.objects.select_related('user').get(key=token)
        return token_obj.user
    except Token.DoesNotExist:
        return None


def _acordo_e_participacao(acordo_id, user):
    """Retorna (acordo, participa) — participa se é parte ou moderador."""
    from .models import AcordoServico
    from .chat import partes_do_acordo

    try:
        acordo = AcordoServico.objects.select_related(
            'candidatura__user',
            'candidatura__ad__author',
        ).get(pk=acordo_id)
    except AcordoServico.DoesNotExist:
        return None, False

    if user.is_staff or user.is_superuser:
        return acordo, True
    contratante, freelancer = partes_do_acordo(acordo)
    return acordo, user in {contratante, freelancer}


def _marcar_lidas_sync(acordo_id, user_id):
    from .chat import marcar_lidas
    try:
        marcar_lidas(acordo_id, user_id)
    except Exception:
        pass


def _redis_url():
    from django.conf import settings
    return getattr(settings, 'REDIS_URL', 'redis://127.0.0.1:6379/0')


class ChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        raw = self.scope['url_route']['kwargs'].get('acordo_id')
        self.acordo_id = int(raw) if str(raw).isdigit() else None
        if not self.acordo_id:
            await self.close(code=4401)
            return

        from asgiref.sync import sync_to_async
        user = await sync_to_async(_autenticar_por_token)(self._obter_token())
        if user is None or user.is_anonymous:
            await self.close(code=4401)
            return

        _, participa = await sync_to_async(_acordo_e_participacao)(
            self.acordo_id, user
        )
        if not participa:
            await self.close(code=4403)
            return

        self.scope['user'] = user
        self._pubsub_task = None
        self._redis_client = None

        await self.accept()
        # Inicia a escuta do canal Pub/Sub em segundo plano.
        self._pubsub_task = asyncio.create_task(
            self._escutar_pubsub(), name=f'chat_{self.acordo_id}'
        )
        await self.send_json({'tipo': 'conectado', 'acordo_id': self.acordo_id})

    async def _escutar_pubsub(self):
        import redis.asyncio as aioredis

        try:
            self._redis_client = aioredis.from_url(_redis_url())
            pubsub = self._redis_client.pubsub()
            await pubsub.subscribe(_canal_pubsub(self.acordo_id))

            while True:
                try:
                    mensagem = await pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                except Exception:
                    break
                if mensagem is None:
                    continue
                try:
                    payload = json.loads(mensagem['data'])
                except (TypeError, ValueError):
                    continue
                if payload.get('tipo') == 'nova_mensagem' and payload.get('mensagem'):
                    await self.send_json(payload)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass
        finally:
            try:
                if self._redis_client is not None:
                    await self._redis_client.aclose()
            except Exception:
                pass

    async def disconnect(self, code):
        if getattr(self, '_pubsub_task', None):
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except (asyncio.CancelledError, Exception):
                pass
            self._pubsub_task = None

    def _obter_token(self):
        qs = (self.scope.get('query_string') or b'').decode('utf-8', 'ignore')
        for parte in qs.split('&'):
            if parte.startswith('token='):
                return parte.split('=', 1)[1]
        return ''

    async def receive_json(self, content, **kwargs):
        """Recebe eventos do cliente (ex.: confirmação de leitura)."""
        if content.get('tipo') == 'ler':
            from asgiref.sync import sync_to_async
            await sync_to_async(_marcar_lidas_sync)(
                self.acordo_id, self.scope['user'].id
            )
