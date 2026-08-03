# Generated manually for the Mercado Pago checkout flow.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_pagamento'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='pagamento',
            name='status',
            field=models.CharField(
                choices=[
                    ('pendente', 'Pendente'),
                    ('pago', 'Pago'),
                    ('falhou', 'Falhou'),
                    ('cancelado', 'Cancelado'),
                ],
                default='pendente',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='pagamento',
            name='valor',
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AddField(
            model_name='pagamento',
            name='aprovado_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pagamento',
            name='checkout_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='pagamento',
            name='detalhe_status',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='pagamento',
            name='forma_pagamento',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.CreateModel(
            name='CartaoUsuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mp_card_id', models.CharField(blank=True, max_length=255, null=True)),
                ('bandeira', models.CharField(max_length=50)),
                ('ultimos_quatro', models.CharField(max_length=4)),
                ('mes_expiracao', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('ano_expiracao', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('nome_titular', models.CharField(blank=True, max_length=255, null=True)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cartoes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'cartoes_usuario',
                'ordering': ['-atualizado_em'],
            },
        ),
        migrations.AddConstraint(
            model_name='cartaousuario',
            constraint=models.UniqueConstraint(
                fields=('usuario', 'bandeira', 'ultimos_quatro'),
                name='cartao_usuario_bandeira_final_unico',
            ),
        ),
    ]
