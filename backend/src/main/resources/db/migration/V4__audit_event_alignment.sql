-- V4__audit_event_alignment.sql
-- Drop legacy actors foreign key constraint on audit_log so that AppUser IDs can be safely recorded
ALTER TABLE csc2.audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey;

-- Ensure audit_event table has center_id
ALTER TABLE csc2.audit_event ADD COLUMN IF NOT EXISTS center_id VARCHAR(64);
