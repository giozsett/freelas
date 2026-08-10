import django.db.models.deletion
from django.db import migrations, models


def garantir_tabela_avaliacoes(apps, schema_editor):
    """
    Cria a tabela em bancos novos ou completa a tabela já existente no Supabase.

    A tabela legada já possui id, criada_em, comentario, acordo_id,
    avaliador_id e avaliado_id. Os relacionamentos legados apontam para
    usuarios (UserProfile), por isso o estado Django usa o mesmo modelo.
    """

    Avaliacao = apps.get_model('core', 'Avaliacao')
    connection = schema_editor.connection
    table_name = Avaliacao._meta.db_table

    with connection.cursor() as cursor:
        existing_tables = connection.introspection.table_names(cursor)

    if table_name not in existing_tables:
        schema_editor.create_model(Avaliacao)
        return

    with connection.cursor() as cursor:
        description = connection.introspection.get_table_description(cursor, table_name)
        existing_columns = {column.name for column in description}

    for field_name in ('papel_avaliado', 'criterios', 'nota_geral'):
        field = Avaliacao._meta.get_field(field_name)
        if field.column not in existing_columns:
            schema_editor.add_field(Avaliacao, field)

    with connection.cursor() as cursor:
        existing_constraints = connection.introspection.get_constraints(cursor, table_name)

    for constraint in Avaliacao._meta.constraints:
        if constraint.name not in existing_constraints:
            schema_editor.add_constraint(Avaliacao, constraint)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_pagamento_checkout_cartao'),
    ]

    operations = [
        migrations.AddField(
            model_name='acordoservico',
            name='concluido_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Avaliacao',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('papel_avaliado', models.CharField(choices=[('freelancer', 'Freelancer'), ('contratante', 'Contratante')], max_length=20)),
                        ('criterios', models.JSONField(default=dict)),
                        ('nota_geral', models.DecimalField(decimal_places=2, max_digits=3)),
                        ('comentario', models.TextField()),
                        ('criado_em', models.DateTimeField(auto_now_add=True, db_column='criada_em')),
                        ('acordo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='avaliacoes', to='core.acordoservico')),
                        ('avaliado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='avaliacoes_recebidas', to='core.userprofile')),
                        ('avaliador', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='avaliacoes_enviadas', to='core.userprofile')),
                    ],
                    options={
                        'db_table': 'avaliacoes',
                        'ordering': ['-criado_em'],
                        'constraints': [
                            models.UniqueConstraint(
                                fields=('acordo', 'avaliador'),
                                name='avaliacao_unica_por_acordo_e_avaliador',
                            ),
                            models.CheckConstraint(
                                condition=models.Q(('nota_geral__gte', 1), ('nota_geral__lte', 5)),
                                name='avaliacao_nota_entre_um_e_cinco',
                            ),
                        ],
                    },
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(
            garantir_tabela_avaliacoes,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
