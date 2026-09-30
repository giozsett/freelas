from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile
from .papeis import PAPEL_ADMIN

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Pega o nome completo e email que o Google fornece
        nome = f"{instance.first_name} {instance.last_name}".strip() or instance.username
        email = instance.email or f"{instance.username}@example.com"

        # Contas de administração só existem como superusuário/staff do Django
        # (não há cadastro de admin pela interface).
        papel = PAPEL_ADMIN if (instance.is_superuser or instance.is_staff) else None

        UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'nome_completo': nome,
                'email': email,
                'papel': papel,
            }
        )
