"""
ASGI config for server project.

Expõe a aplicação ASGI usada pelo Daphne (via `runserver` com o app `daphne`)
e encaminha as conexões WebSocket do chat para o consumer correspondente.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

# Deve ser importado depois de definir as settings (o Django precisa estar carregado).
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

import core.routing as core_routing


application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': AuthMiddlewareStack(URLRouter(core_routing.websocket_urlpatterns)),
    }
)
