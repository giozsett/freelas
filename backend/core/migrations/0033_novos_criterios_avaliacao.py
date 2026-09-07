from decimal import Decimal
import django.db.models.deletion
from django.db import migrations, models


def aplicar_estruturas_supabase(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        # A tabela criterios_avaliacao já existia (legada, fora do controle do
        # Django) no Supabase de produção — por isso o restante desta função
        # usa ALTER TABLE. Em qualquer banco novo (ex.: banco de testes) essa
        # tabela nunca existiu, então criamos aqui com o formato legado antes
        # de aplicar os ALTER TABLE abaixo, mantendo a migração idempotente
        # tanto em produção quanto em bancos criados do zero.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS criterios_avaliacao (
                id bigserial PRIMARY KEY,
                avaliacao_id bigint NOT NULL REFERENCES avaliacoes (id) ON DELETE CASCADE,
                titulo varchar(255),
                nota smallint NOT NULL
            );
        """)
        cursor.execute("""
            ALTER TABLE criterios_avaliacao
            ADD COLUMN IF NOT EXISTS chave varchar(50),
            ADD COLUMN IF NOT EXISTS papel_avaliado varchar(20),
            ADD COLUMN IF NOT EXISTS modalidade varchar(20) DEFAULT 'remoto',
            ADD COLUMN IF NOT EXISTS peso numeric(3,2) DEFAULT 1.00,
            ADD COLUMN IF NOT EXISTS descricao varchar(255),
            ADD COLUMN IF NOT EXISTS criado_em timestamp with time zone DEFAULT now();
        """)
        cursor.execute("""
            ALTER TABLE criterios_avaliacao 
            DROP CONSTRAINT IF EXISTS check_nota_entre_um_e_cinco;
        """)
        cursor.execute("""
            ALTER TABLE criterios_avaliacao 
            ADD CONSTRAINT check_nota_entre_um_e_cinco CHECK (nota >= 1 AND nota <= 5);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_criterios_chave_papel 
            ON criterios_avaliacao (chave, papel_avaliado);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_criterios_avaliacao_id 
            ON criterios_avaliacao (avaliacao_id);
        """)
        cursor.execute("""
            ALTER TABLE avaliacoes 
            ADD COLUMN IF NOT EXISTS modalidade varchar(20) DEFAULT 'remoto';
        """)


def migrar_criterios_legados(apps, schema_editor):
    Avaliacao = apps.get_model('core', 'Avaliacao')
    CriterioAvaliacao = apps.get_model('core', 'CriterioAvaliacao')

    label_map = {
        'qualidade': 'Qualidade da entrega',
        'prazo': 'Cumprimento do prazo',
        'comunicacao': 'Comunicação',
        'clareza': 'Clareza das instruções',
        'pagamento': 'Pagamento e compromisso',
    }

    for avaliacao in Avaliacao.objects.all():
        if not avaliacao.detalhes_criterios.exists() and isinstance(avaliacao.criterios, dict):
            for chave, nota in avaliacao.criterios.items():
                if isinstance(nota, int):
                    CriterioAvaliacao.objects.create(
                        avaliacao=avaliacao,
                        chave=chave,
                        titulo=label_map.get(chave, chave),
                        nota=nota,
                        papel_avaliado=avaliacao.papel_avaliado,
                        modalidade=getattr(avaliacao, 'modalidade', 'remoto') or 'remoto',
                        peso=Decimal('1.00'),
                    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_report_reporter'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='avaliacao',
                    name='modalidade',
                    field=models.CharField(default='remoto', max_length=20),
                ),
                migrations.AlterField(
                    model_name='avaliacao',
                    name='comentario',
                    field=models.TextField(blank=True, default=''),
                ),
                migrations.CreateModel(
                    name='CriterioAvaliacao',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('chave', models.CharField(max_length=50)),
                        ('titulo', models.CharField(blank=True, max_length=255, null=True)),
                        ('nota', models.SmallIntegerField()),
                        ('papel_avaliado', models.CharField(blank=True, choices=[('freelancer', 'Freelancer'), ('contratante', 'Contratante')], max_length=20, null=True)),
                        ('modalidade', models.CharField(choices=[('remoto', 'Remoto'), ('presencial', 'Presencial')], default='remoto', max_length=20)),
                        ('peso', models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=3)),
                        ('descricao', models.CharField(blank=True, max_length=255, null=True)),
                        ('criado_em', models.DateTimeField(auto_now_add=True)),
                        ('avaliacao', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='detalhes_criterios', to='core.avaliacao')),
                    ],
                    options={
                        'db_table': 'criterios_avaliacao',
                        'ordering': ['id'],
                        'constraints': [
                            models.CheckConstraint(
                                condition=models.Q(('nota__gte', 1), ('nota__lte', 5)),
                                name='check_nota_entre_um_e_cinco',
                            ),
                        ],
                    },
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(
            aplicar_estruturas_supabase,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            migrar_criterios_legados,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
