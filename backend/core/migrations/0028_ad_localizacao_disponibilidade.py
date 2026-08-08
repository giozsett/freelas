import json

from django.db import migrations, models


def preparar_disponibilidade(apps, schema_editor):
    Ad = apps.get_model('core', 'Ad')
    for ad in Ad.objects.all():
        valor = ad.availability
        if valor is None or not str(valor).strip():
            ad.availability = '{}'
            ad.save(update_fields=['availability'])
            continue
        try:
            json.loads(valor)
        except (json.JSONDecodeError, TypeError):
            ad.availability = json.dumps({'legado': valor}, ensure_ascii=False)
            ad.save(update_fields=['availability'])


def finalizar_disponibilidade(apps, schema_editor):
    Ad = apps.get_model('core', 'Ad')
    for ad in Ad.objects.all():
        valor = ad.availability
        if isinstance(valor, str):
            ad.availability = {'legado': valor}
            ad.save(update_fields=['availability'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_notificacao'),
    ]

    operations = [
        migrations.RunPython(preparar_disponibilidade, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='ad',
            name='availability',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(finalizar_disponibilidade, migrations.RunPython.noop),
        migrations.AddField(model_name='ad', name='estado', field=models.CharField(blank=True, max_length=2, null=True)),
        migrations.AddField(model_name='ad', name='cidade', field=models.CharField(blank=True, max_length=120, null=True)),
        migrations.AddField(model_name='ad', name='bairro', field=models.CharField(blank=True, max_length=120, null=True)),
        migrations.AddField(model_name='ad', name='latitude', field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
        migrations.AddField(model_name='ad', name='longitude', field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
    ]
