from django.db import migrations, models
from django.db.models import Count


def limpar_candidaturas_duplicadas(apps, schema_editor):
    """Deixa uma única candidatura ativa por (freelancer, anúncio) antes de
    criar a restrição única.

    Se o contratante já recusou alguma das cópias, todas passam a recusadas.
    Fica visível a aprovada (se houver) ou a mais antiga; as demais são
    excluídas logicamente (deletado=True), como no resto da plataforma.
    """
    Candidatura = apps.get_model('core', 'Candidatura')
    ativas = Candidatura.objects.filter(deletado=False, user__isnull=False, ad__isnull=False)
    grupos = (
        ativas.values('user_id', 'ad_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    for grupo in grupos:
        copias = ativas.filter(user_id=grupo['user_id'], ad_id=grupo['ad_id'])
        if copias.filter(status='recusada').exists():
            copias.update(status='recusada')
        mantida = (
            copias.filter(status='aprovada').order_by('enviado_em', 'id').first()
            or copias.order_by('enviado_em', 'id').first()
        )
        copias.exclude(pk=mantida.pk).update(deletado=True)


class Migration(migrations.Migration):
    # O Postgres não cria o índice na mesma transação em que a limpeza deixou
    # triggers de FK pendentes; por isso a limpeza roda numa transação própria.
    atomic = False

    dependencies = [
        ('core', '0047_perfil_contratante'),
    ]

    operations = [
        migrations.RunPython(limpar_candidaturas_duplicadas, migrations.RunPython.noop, atomic=True),
        migrations.AddConstraint(
            model_name='candidatura',
            constraint=models.UniqueConstraint(
                condition=models.Q(deletado=False),
                fields=('user', 'ad'),
                name='candidatura_ativa_unica_por_usuario_e_anuncio',
            ),
        ),
    ]
