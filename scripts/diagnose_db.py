import psycopg2
import json

conn = psycopg2.connect(
    dbname="csc2_dev",
    user="csc2",
    password="csc2_dev_password",
    host="localhost",
    port=5432
)
cur = conn.cursor()

tables = [
    "csc2.outbox_events",
    "csc2.sms_outbox",
    "csc2.notification_outbox",
    "csc2.otp_challenge",
    "csc2.phone_otp_challenges",
    "csc2.clients",
    "csc2.field_roster",
    "csc2.device_sessions",
    "csc2.audit_events"
]

results = {}
for t in tables:
    cur.execute(f"SELECT count(*) FROM {t};")
    results[t] = cur.fetchone()[0]

print("TABLE ROW COUNTS:")
for t, c in results.items():
    print(f"  {t}: {c}")

print("\nLATEST 3 OUTBOX EVENTS:")
cur.execute("SELECT id, event_type, status, attempts, error_message, created_at FROM csc2.outbox_events ORDER BY created_at DESC LIMIT 3;")
for row in cur.fetchall():
    print(f"  {row}")

print("\nLATEST 3 SMS OUTBOX:")
cur.execute("SELECT id, phone_e164, status, attempts, last_error_code, error_message, created_at FROM csc2.sms_outbox ORDER BY created_at DESC LIMIT 3;")
for row in cur.fetchall():
    print(f"  {row}")

print("\nLATEST 3 NOTIFICATION OUTBOX:")
cur.execute("SELECT id, channel, recipient, template, status, attempts, last_error_code, created_at FROM csc2.notification_outbox ORDER BY created_at DESC LIMIT 3;")
for row in cur.fetchall():
    print(f"  {row}")

cur.close()
conn.close()
