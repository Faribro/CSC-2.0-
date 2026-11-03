-- V2__client_profile_revisions.sql
-- Client profile revision history, audit tracking, soft-deletes, and actor lockout

-- 1. Profile Revisions Table
CREATE TABLE IF NOT EXISTS csc2.profile_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    author_id UUID REFERENCES csc2.actors(id),
    author_name VARCHAR(150),
    change_reason TEXT NOT NULL,
    diff JSONB NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_client_revision UNIQUE (client_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_profile_revisions_client ON csc2.profile_revisions(client_id, revision_number DESC);

-- 2. Soft-delete and audit columns for repeat tables
ALTER TABLE csc2.family_members ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE csc2.family_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

ALTER TABLE csc2.referral_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Actor lockout & failed attempt tracking
ALTER TABLE csc2.actors ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE csc2.actors ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
