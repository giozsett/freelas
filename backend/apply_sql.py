import psycopg2

conn = psycopg2.connect('postgresql://postgres.byxbinpzxafcfhumcdyw:Tccfreelas123@aws-0-us-west-2.pooler.supabase.com:5432/postgres')
conn.autocommit = True
cur = conn.cursor()

queries = [
    # Denuncias
    "ALTER TABLE IF EXISTS core_report RENAME TO denuncias;",
    
    # Usuarios
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS user_id integer;",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio text;",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS categories jsonb;",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS skills jsonb;",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS subscription_plan varchar(50);",
    
    # Anuncios
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS author_id integer;",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS title varchar(200);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS category varchar(100);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS price varchar(50);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS price_unit varchar(20);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS skills jsonb;",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS location_type varchar(50);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS address varchar(200);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS address_number varchar(50);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS description text;",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS role varchar(50);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS deadline varchar(100);",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS availability text;",
    "ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;",
]

for q in queries:
    try:
        cur.execute(q)
        print("Success:", q)
    except Exception as e:
        print("Error:", q, "->", e)

