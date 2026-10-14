from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication

from .moderacao import MENSAGEM_CONTA_BANIDA


class TokenAuthenticationSemBanidos(TokenAuthentication):
    """Token do DRF que recusa contas banidas pela moderação, mesmo que o
    token tenha sido emitido antes do banimento."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        profile = getattr(user, 'profile', None)
        if profile and profile.banido:
            raise exceptions.AuthenticationFailed(MENSAGEM_CONTA_BANIDA)
        return user, token
