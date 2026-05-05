import os
import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres.byxbinpzxafcfhumcdyw:Tccfreelas123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'candidaturas';
    """)
    rows = cur.fetchall()
    if rows:
        print("Columns in candidaturas table:")
        for row in rows:
            print(row)
    else:
        print("Table 'candidaturas' not found.")
        
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public';
    """)
    print("\nTables in public schema:")
    for t in cur.fetchall():
        print(t[0])
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
