"""Reseta o banco de teste (test_postgres no Supabase) para os testes rodarem com --keepdb.

O pooler do Supabase segura conexoes e impede DROP/CREATE do banco, entao a
estrategia e: limpar todas as tabelas de dados, manter o registro das migracoes
(exceto as ainda nao aplicadas ao banco de teste) e deixar o Django aplicar as
pendentes na proxima execucao de `manage.py test --keepdb`.

Uso:
    python reset_test_db.py
    python manage.py test core.tests.<Classe> --keepdb --noinput
"""
import os
from datetime import datetime, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

import django
django.setup()

import psycopg2
from django.conf import settings
from django.db.migrations.loader import MigrationLoader


def main():
    db = settings.DATABASES['default'].copy()
    db['NAME'] = 'test_postgres'

    conn = psycopg2.connect(
        host=db['HOST'],
        port=db['PORT'],
        user=db['USER'],
        password=db['PASSWORD'],
        dbname=db['NAME'],
        connect_timeout=30,
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    tabelas = [row[0] for row in cur.fetchall()]

    limpar = [t for t in tabelas if t != 'django_migrations']
    if limpar:
        sql = 'TRUNCATE {} RESTART IDENTITY CASCADE;'.format(
            ', '.join('"{}"'.format(t) for t in limpar)
        )
        cur.execute(sql)
        print('Truncadas:', len(limpar), 'tabela(s) preservando django_migrations.')

    # Garante o site default (migracao de dados do django.contrib.sites)
    cur.execute("SELECT count(*) FROM django_site")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO django_site (id, domain, name) VALUES (1, 'example.com', 'example.com')"
        )
        print('Site default recriado.')

    loader = MigrationLoader(None, ignore_no_migrations=True)
    pendentes_pre = [
        (app, name)
        for app, name in loader.disk_migrations
        if not (app == 'core' and name == '0040_userprofile_aceitou_termos_freelancer')
    ]

    cur.execute("SELECT count(*) FROM django_migrations")
    if cur.fetchone()[0] == 0:
        for app, name in pendentes_pre:
            cur.execute(
                'INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)',
                (app, name, datetime.now(timezone.utc)),
            )
        print('django_migrations repovoado com {} registro(s).'.format(len(pendentes_pre)))
        print('A migracao core.0040 sera aplicada pelo proximo `manage.py test --keepdb`.')
    else:
        print('django_migrations ja tinha registros; apenas dados foram limpos.')

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()