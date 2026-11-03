-- V3__onboarding_and_sessions.sql
-- Onboarding data model: state registration, state codes (HMAC verifier), durable OTP challenges,
-- sliding-window rate limits, app users, field profiles, server-side sessions, and notification outbox.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STATE REGISTRATIONS
CREATE TABLE IF NOT EXISTS csc2.state_registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    work_email VARCHAR(255) NOT NULL,
    requested_state VARCHAR(100) NOT NULL,
    organization VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    email_verified_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_state_reg_status CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT ck_state_reg_first_name_not_empty CHECK (length(trim(first_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_state_registration_email_lower
    ON csc2.state_registration (lower(work_email));

CREATE INDEX IF NOT EXISTS idx_state_registration_state
    ON csc2.state_registration (requested_state);

CREATE INDEX IF NOT EXISTS idx_state_registration_status
    ON csc2.state_registration (status);

-- 2. STATE CODES (HMAC-SHA256 verifier with server-side pepper; zero plaintext in DB)
CREATE TABLE IF NOT EXISTS csc2.state_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_registration_id UUID REFERENCES csc2.state_registration(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL,
    code_verifier VARCHAR(64) NOT NULL, -- HMAC-SHA256 hex string
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    max_redemptions INT NOT NULL DEFAULT 50,
    redemption_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    rotated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT ck_state_code_status CHECK (status IN ('ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED')),
    CONSTRAINT ck_state_code_redemption_count CHECK (redemption_count >= 0 AND redemption_count <= max_redemptions)
);

-- Exactly one active code per state
CREATE UNIQUE INDEX IF NOT EXISTS uq_state_code_active_per_state
    ON csc2.state_code (lower(state)) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_state_code_verifier
    ON csc2.state_code (code_verifier);

-- 3. DURABLE OTP CHALLENGES (Zero plaintext OTP; hashed with salt)
CREATE TABLE IF NOT EXISTS csc2.otp_challenge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenge_email
    ON csc2.otp_challenge (lower(email), expires_at DESC);

-- 4. DURABLE SLIDING WINDOW AUTH RATE LIMIT
CREATE TABLE IF NOT EXISTS csc2.auth_rate_limit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key VARCHAR(255) NOT NULL,
    attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_key_time
    ON csc2.auth_rate_limit (rate_key, attempt_at);

-- 5. APP USERS
CREATE TABLE IF NOT EXISTS csc2.app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    role VARCHAR(50) NOT NULL, -- 'FIELD_WORKER', 'SUPERVISOR', 'STATE_REVIEWER', 'ADMINISTRATOR', 'LEADERSHIP'
    state VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_email_lower
    ON csc2.app_user (lower(email));

-- 6. FIELD PROFILES (Google account linkage + state/district onboarding)
CREATE TABLE IF NOT EXISTS csc2.field_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES csc2.app_user(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    google_sub VARCHAR(255) NOT NULL UNIQUE,
    state_code_id UUID REFERENCES csc2.state_code(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_field_profile_state_district
    ON csc2.field_profile (state, district);

-- 7. SESSIONS (Server-side persistent session tracking with refresh token reuse detection)
CREATE TABLE IF NOT EXISTS csc2.session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES csc2.app_user(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_label VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    idle_expires_at TIMESTAMPTZ NOT NULL,
    absolute_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_session_user_active
    ON csc2.session (user_id) WHERE revoked_at IS NULL;

-- 8. NOTIFICATION OUTBOX
CREATE TABLE IF NOT EXISTS csc2.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'EMAIL',
    recipient VARCHAR(255) NOT NULL,
    template VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_notification_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DELIVERED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
    ON csc2.notification_outbox (status, created_at) WHERE status = 'PENDING';

-- 9. AUDIT EVENT (Standardized view or table alias for csc2.audit_log)
CREATE TABLE IF NOT EXISTS csc2.audit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_id UUID,
    actor_username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(45),
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_event_occurred ON csc2.audit_event(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_action ON csc2.audit_event(action);
