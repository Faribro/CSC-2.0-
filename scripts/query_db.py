import psycopg2

conn = psycopg2.connect('postgresql://csc2:csc2_dev_password@localhost:5432/csc2_dev')
cur = conn.cursor()

cur.execute('SELECT id, phone_e164, state, district, status FROM csc2.field_roster ORDER BY created_at DESC LIMIT 5;')
rows = cur.fetchall()
print('Total in field_roster sample:', len(rows))
for r in rows:
    print(r)

cur.execute('SELECT id, email, role, state FROM csc2.app_users ORDER BY created_at DESC LIMIT 5;')
users = cur.fetchall()
print('\nRecent app_users:')
for u in users:
    print(u)

cur.close()
conn.close()
