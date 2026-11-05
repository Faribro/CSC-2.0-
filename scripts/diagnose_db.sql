SELECT 'csc2.outbox' as table_name, count(*) as count FROM csc2.outbox
UNION ALL
SELECT 'csc2.sms_outbox', count(*) FROM csc2.sms_outbox
UNION ALL
SELECT 'csc2.notification_outbox', count(*) FROM csc2.notification_outbox
UNION ALL
SELECT 'csc2.otp_challenge', count(*) FROM csc2.otp_challenge
UNION ALL
SELECT 'csc2.phone_otp_challenge', count(*) FROM csc2.phone_otp_challenge
UNION ALL
SELECT 'csc2.clients', count(*) FROM csc2.clients
UNION ALL
SELECT 'csc2.field_roster', count(*) FROM csc2.field_roster
UNION ALL
SELECT 'csc2.device_session', count(*) FROM csc2.device_session
UNION ALL
SELECT 'csc2.audit_event', count(*) FROM csc2.audit_event;

\echo '=== LATEST 3 OUTBOX EVENTS ==='
SELECT id, event_type, status, attempts, error_message, created_at FROM csc2.outbox ORDER BY created_at DESC LIMIT 3;

\echo '=== LATEST 3 SMS OUTBOX ==='
SELECT id, phone_e164, status, attempts, last_error_code, error_message, created_at FROM csc2.sms_outbox ORDER BY created_at DESC LIMIT 3;

\echo '=== LATEST 3 NOTIFICATION OUTBOX ==='
SELECT id, type, recipient, template, status, attempts, last_error_code, created_at FROM csc2.notification_outbox ORDER BY created_at DESC LIMIT 3;
