from django.db import migrations


def unificar_identificador_simulacao(apps, schema_editor):
    Pagamento = apps.get_model('core', 'Pagamento')
    Pagamento.objects.filter(
        forma_pagamento__in=['simulacao_academica', 'simulacao_teste'],
    ).update(forma_pagamento='simulacao_pagamento')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_acordoservico_cancelado_em_and_more'),
    ]

    operations = [
        migrations.RunPython(
            unificar_identificador_simulacao,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
