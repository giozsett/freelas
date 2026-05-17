from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import core.signals   # ← isso faz o signal ser carregado quando o app sobe