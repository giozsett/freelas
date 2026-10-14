"""
Exclusão física em cascata a partir da tabela `usuarios`.

O Django aplica o on_delete=CASCADE em Python: as FKs que ele cria no banco
são NO ACTION. Por isso um DELETE feito direto no banco (SQL Editor do
Supabase, psql...) não apaga nada em cascata e ainda falha se houver
registros dependentes. Esta migration leva a regra para o PostgreSQL:

1. As FKs passam a ter ON DELETE CASCADE (ou SET NULL, onde o model usa
   SET_NULL), incluindo as tabelas legadas do Supabase e as de apps de
   terceiros que dependem de auth_user.
2. Um trigger em `usuarios` apaga o auth_user do perfil removido. Assim o
   DELETE também alcança o que depende do login (anúncios, candidaturas,
   pagamentos, notificações, chat, conta Google...).

A exclusão de conta pela API continua sendo soft delete; nada muda nela.
"""

from django.db import migrations

CASCADE = 'CASCADE'
SET_NULL = 'SET NULL'
NO_ACTION = 'NO ACTION'

# (tabela, coluna, tabela referenciada, ação no DELETE)
# Tabelas ou FKs que não existem no banco são ignoradas: várias tabelas
# legadas só existem no Supabase e não em um banco criado pelas migrations.
REGRAS_FK = [
    # Dependem diretamente de usuarios
    ('anuncios', 'usuario_id', 'usuarios', CASCADE),
    ('candidaturas', 'usuario_id', 'usuarios', CASCADE),
    ('avaliacoes', 'avaliador_id', 'usuarios', CASCADE),
    ('avaliacoes', 'avaliado_id', 'usuarios', CASCADE),
    ('certificados', 'usuario_id', 'usuarios', CASCADE),
    ('experiencias', 'usuario_id', 'usuarios', CASCADE),
    ('assinaturas', 'usuario_id', 'usuarios', CASCADE),
    ('cancelamento_acordo', 'solicitante', 'usuarios', CASCADE),
    ('denuncia_usuario', 'denunciado_id', 'usuarios', CASCADE),
    ('denuncia_usuario', 'denunciante_id', 'usuarios', SET_NULL),
    ('denuncia_anuncio', 'denunciante_id', 'usuarios', SET_NULL),

    # Perfil <-> login
    ('usuarios', 'user_id', 'auth_user', CASCADE),
    ('core_userprofile', 'user_id', 'auth_user', CASCADE),

    # Dependem de auth_user
    ('anuncios', 'author_id', 'auth_user', CASCADE),
    ('core_ad', 'author_id', 'auth_user', CASCADE),
    ('candidaturas', 'user_id', 'auth_user', CASCADE),
    ('codigos_verificacao_email', 'usuario_id', 'auth_user', CASCADE),
    ('pagamentos', 'usuario_id', 'auth_user', CASCADE),
    ('cartoes_usuario', 'usuario_id', 'auth_user', CASCADE),
    ('notificacoes', 'usuario_id', 'auth_user', CASCADE),
    ('mensagens_chat', 'remetente_id', 'auth_user', CASCADE),
    ('solicitacoes_cancelamento_acordo', 'solicitante_id', 'auth_user', CASCADE),
    ('solicitacoes_cancelamento_acordo', 'analisado_por_id', 'auth_user', SET_NULL),
    ('solicitacoes_alteracao_acordo', 'solicitante_id', 'auth_user', CASCADE),
    ('solicitacoes_alteracao_acordo', 'decidido_por_id', 'auth_user', SET_NULL),
    ('denuncias', 'reporter_id', 'auth_user', SET_NULL),
    ('authtoken_token', 'user_id', 'auth_user', CASCADE),
    ('account_emailaddress', 'user_id', 'auth_user', CASCADE),
    ('account_emailconfirmation', 'email_address_id', 'account_emailaddress', CASCADE),
    ('socialaccount_socialaccount', 'user_id', 'auth_user', CASCADE),
    ('socialaccount_socialtoken', 'account_id', 'socialaccount_socialaccount', CASCADE),
    ('django_admin_log', 'user_id', 'auth_user', CASCADE),
    ('auth_user_groups', 'user_id', 'auth_user', CASCADE),
    ('auth_user_user_permissions', 'user_id', 'auth_user', CASCADE),

    # Dependem de anuncios
    ('candidaturas', 'anuncio_id', 'anuncios', CASCADE),
    ('candidaturas', 'ad_id', 'anuncios', CASCADE),
    ('anuncios_contratante', 'id', 'anuncios', CASCADE),
    ('anuncios_freelancer', 'id', 'anuncios', CASCADE),
    ('denuncia_anuncio', 'anuncio_id', 'anuncios', CASCADE),
    ('notificacoes', 'ad_id', 'anuncios', SET_NULL),

    # Dependem de candidaturas
    ('acordo_servico', 'candidatura_id', 'candidaturas', CASCADE),
    ('conversas', 'candidatura_id', 'candidaturas', CASCADE),

    # Dependem de acordo_servico
    ('avaliacoes', 'acordo_id', 'acordo_servico', CASCADE),
    ('mensagens_chat', 'acordo_id', 'acordo_servico', CASCADE),
    ('pagamentos', 'acordo_id', 'acordo_servico', SET_NULL),
    ('solicitacoes_cancelamento_acordo', 'acordo_id', 'acordo_servico', CASCADE),
    ('solicitacoes_alteracao_acordo', 'acordo_id', 'acordo_servico', CASCADE),
    ('cancelamento_acordo', 'acordo_id', 'acordo_servico', CASCADE),
    ('alteracoes_acordo', 'acordo_id', 'acordo_servico', CASCADE),

    # Outras
    ('criterios_avaliacao', 'avaliacao_id', 'avaliacoes', CASCADE),
    ('pgto_assinatura', 'id_assinatura', 'assinaturas', CASCADE),
]

# FKs declaradas nos models que não existem no Supabase (as tabelas já
# existiam antes do Django). Sem elas a cascata não chega aos anúncios e
# candidaturas pelo auth_user; são criadas como o Django as criaria.
FKS_A_CRIAR_SE_FALTAREM = {
    ('usuarios', 'user_id'),
    ('anuncios', 'author_id'),
    ('candidaturas', 'user_id'),
    ('candidaturas', 'ad_id'),
}

CRIAR_TRIGGER = """
CREATE OR REPLACE FUNCTION usuarios_apagar_auth_user() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.user_id IS NOT NULL THEN
        DELETE FROM auth_user WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_apagar_auth_user ON usuarios;
CREATE TRIGGER usuarios_apagar_auth_user
    AFTER DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION usuarios_apagar_auth_user();
"""

REMOVER_TRIGGER = """
DROP TRIGGER IF EXISTS usuarios_apagar_auth_user ON usuarios;
DROP FUNCTION IF EXISTS usuarios_apagar_auth_user();
"""


def _buscar_fk(cursor, tabela, coluna, referencia):
    cursor.execute(
        """
        SELECT c.conname, c.condeferrable, c.condeferred, ref.attname
        FROM pg_constraint c
        JOIN pg_attribute col ON col.attrelid = c.conrelid AND col.attnum = c.conkey[1]
        JOIN pg_attribute ref ON ref.attrelid = c.confrelid AND ref.attnum = c.confkey[1]
        WHERE c.contype = 'f'
          AND c.conrelid = to_regclass(%s)
          AND c.confrelid = to_regclass(%s)
          AND col.attname = %s
        """,
        [tabela, referencia, coluna],
    )
    return cursor.fetchone()


def _coluna_existe(cursor, tabela, coluna):
    cursor.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = %s AND column_name = %s
        """,
        [tabela, coluna],
    )
    return cursor.fetchone() is not None


def _redefinir_fks(schema_editor, reverter=False):
    qn = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        for tabela, coluna, referencia, acao in REGRAS_FK:
            fk = _buscar_fk(cursor, tabela, coluna, referencia)
            if fk:
                nome, deferrable, deferred, coluna_ref = fk
                schema_editor.execute(f'ALTER TABLE {qn(tabela)} DROP CONSTRAINT {qn(nome)}')
            elif (tabela, coluna) in FKS_A_CRIAR_SE_FALTAREM and _coluna_existe(cursor, tabela, coluna):
                nome, deferrable, deferred, coluna_ref = f'{tabela}_{coluna}_fkey', True, True, 'id'
            else:
                continue

            adiamento = ''
            if deferrable:
                adiamento = ' DEFERRABLE INITIALLY DEFERRED' if deferred else ' DEFERRABLE'
            schema_editor.execute(
                f'ALTER TABLE {qn(tabela)} ADD CONSTRAINT {qn(nome)} '
                f'FOREIGN KEY ({qn(coluna)}) REFERENCES {qn(referencia)} ({qn(coluna_ref)}) '
                f'ON DELETE {NO_ACTION if reverter else acao}{adiamento}'
            )


def aplicar_cascata(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    _redefinir_fks(schema_editor)
    schema_editor.execute(CRIAR_TRIGGER)


def reverter_cascata(apps, schema_editor):
    # Volta ao comportamento padrão do Django (NO ACTION). As FKs criadas por
    # FKS_A_CRIAR_SE_FALTAREM continuam existindo, pois estão nos models.
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(REMOVER_TRIGGER)
    _redefinir_fks(schema_editor, reverter=True)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0042_userprofile_ramos_atuacao'),
        # As FKs dessas apps também apontam para auth_user e precisam
        # existir antes de serem redefinidas.
        ('account', '0009_emailaddress_unique_primary_email'),
        ('socialaccount', '0006_alter_socialaccount_extra_data'),
        ('authtoken', '0004_alter_tokenproxy_options'),
        ('admin', '0003_logentry_add_action_flag_choices'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(aplicar_cascata, reverse_code=reverter_cascata),
    ]
