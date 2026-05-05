import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

with connection.cursor() as cursor:
    try:
        cursor.execute('ALTER TABLE candidaturas ADD COLUMN user_id integer;')
        print("user_id added.")
    except Exception as e:
        print("Error adding user_id:", e)
    
    # Needs to commit explicitly if outside standard transaction management or try another block
    
    try:
        cursor.execute('ALTER TABLE candidaturas ADD COLUMN ad_id bigint;')
        print("ad_id added.")
    except Exception as e:
        print("Error adding ad_id:", e)

