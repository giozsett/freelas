import dj_database_url
import os
from pathlib import Path

BASE_DIR = Path('/home/giovna/Documentos/05-tcc/freelas/backend')
url = f'sqlite:///{BASE_DIR / "db.sqlite3"}'
print('Fallback URL:', url)
dj_database_url.parse(url)

try:
    from dotenv import load_dotenv
    load_dotenv()
    print('DATABASE_URL from env:', os.environ.get('DATABASE_URL'))
    dj_database_url.parse(os.environ.get('DATABASE_URL'))
except Exception as e:
    print('Error parsing env:', e)
