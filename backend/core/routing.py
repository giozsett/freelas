"""Roteamento WebSocket do app core (chat e notificações em tempo real)."""

from django.urls import re_path

from .consumers import ChatConsumer, NotificacaoConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<acordo_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/notificacoes/$', NotificacaoConsumer.as_asgi()),
]
