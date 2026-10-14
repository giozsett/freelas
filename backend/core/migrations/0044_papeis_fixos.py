"""
Papéis fixos: freelancer, contratante e administrador.

- O valor 'empresa' passa a se chamar 'contratante' (mesmo papel, nome único
  em todo o sistema).
- Superusuários e staff do Django (a conta `admin` do painel, por exemplo)
  recebem o papel 'administrador'.
"""

from django.db import migrations, models


def aplicar_papeis(apps, schema_editor):
    UserProfile = apps.get_model('core', 'UserProfile')
    UserProfile.objects.filter(papel='empresa').update(papel='contratante')
    UserProfile.objects.filter(
        models.Q(user__is_superuser=True) | models.Q(user__is_staff=True),
    ).update(papel='administrador')


def reverter_papeis(apps, schema_editor):
    UserProfile = apps.get_model('core', 'UserProfile')
    UserProfile.objects.filter(papel='contratante').update(papel='empresa')
    UserProfile.objects.filter(papel='administrador').update(papel=None)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0043_exclusao_fisica_usuarios_em_cascata'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='papel',
            field=models.CharField(
                blank=True,
                choices=[
                    ('freelancer', 'Freelancer'),
                    ('contratante', 'Contratante'),
                    ('administrador', 'Administrador'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.RunPython(aplicar_papeis, reverse_code=reverter_papeis),
    ]
