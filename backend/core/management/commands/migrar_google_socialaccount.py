from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from allauth.socialaccount.models import SocialAccount


class Command(BaseCommand):
    help = (
        'Cria registros SocialAccount (provider=google) para usuários que foram '
        'registrados pelo fluxo antigo de login Google (sem senha válida), '
        'para que o allauth reconheça a conta.'
    )

    def handle(self, *args, **options):
        criados = 0
        ignorados = 0

        # Usuários criados pelo fluxo Google antigo NÃO têm senha utilizável
        for user in User.objects.all():
            email = user.email
            if not email:
                continue

            if SocialAccount.objects.filter(provider='google', uid=email).exists():
                continue

            SocialAccount.objects.create(
                provider='google',
                uid=email,
                user=user,
                extra_data={},
            )
            criados += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{criados} registros SocialAccount criados, {ignorados} ignorados.'
            )
        )