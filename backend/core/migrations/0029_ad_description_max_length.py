from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_ad_localizacao_disponibilidade'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ad',
            name='description',
            field=models.TextField(blank=True, max_length=1000, null=True),
        ),
    ]
