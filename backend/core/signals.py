from django.db.models.signals import post_save
<<<<<<< HEAD
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def criar_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'nome_completo': f"{instance.first_name} {instance.last_name}".strip() or instance.username,
                'email': instance.email,
            },
=======
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Pega o nome completo e email que o Google fornece
        nome = f"{instance.first_name} {instance.last_name}".strip() or instance.username
        email = instance.email or f"{instance.username}@example.com"

        UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'nome_completo': nome,
                'email': email,
            }
>>>>>>> origin/main
        )