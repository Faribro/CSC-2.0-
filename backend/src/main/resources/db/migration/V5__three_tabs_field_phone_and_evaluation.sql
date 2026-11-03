-- V5__three_tabs_field_phone_and_evaluation.sql
-- CSC 2.0 Three-Tab Information Architecture, Phone OTP Field User Access,
-- SMS Outbox, State Reference Registry, Leadership Allowlist, and Argon2id Passwords.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STATE REFERENCE REGISTRY (ISO 3166-2:IN validated 36 states and UTs)
CREATE TABLE IF NOT EXISTS csc2.state_reference (
    state_code VARCHAR(10) PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    iso_code VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO csc2.state_reference (state_code, state_name, iso_code) VALUES
    ('AP', 'Andhra Pradesh', 'IN-AP'),
    ('AR', 'Arunachal Pradesh', 'IN-AR'),
    ('AS', 'Assam', 'IN-AS'),
    ('BR', 'Bihar', 'IN-BR'),
    ('CG', 'Chhattisgarh', 'IN-CG'),
    ('GA', 'Goa', 'IN-GA'),
    ('GJ', 'Gujarat', 'IN-GJ'),
    ('HR', 'Haryana', 'IN-HR'),
    ('HP', 'Himachal Pradesh', 'IN-HP'),
    ('JH', 'Jharkhand', 'IN-JH'),
    ('KA', 'Karnataka', 'IN-KA'),
    ('KL', 'Kerala', 'IN-KL'),
    ('MP', 'Madhya Pradesh', 'IN-MP'),
    ('MH', 'Maharashtra', 'IN-MH'),
    ('MN', 'Manipur', 'IN-MN'),
    ('ML', 'Meghalaya', 'IN-ML'),
    ('MZ', 'Mizoram', 'IN-MZ'),
    ('NL', 'Nagaland', 'IN-NL'),
    ('OD', 'Odisha', 'IN-OD'),
    ('PB', 'Punjab', 'IN-PB'),
    ('RJ', 'Rajasthan', 'IN-RJ'),
    ('SK', 'Sikkim', 'IN-SK'),
    ('TN', 'Tamil Nadu', 'IN-TN'),
    ('TS', 'Telangana', 'IN-TS'),
    ('TR', 'Tripura', 'IN-TR'),
    ('UP', 'Uttar Pradesh', 'IN-UP'),
    ('UK', 'Uttarakhand', 'IN-UK'),
    ('WB', 'West Bengal', 'IN-WB'),
    ('AN', 'Andaman and Nicobar Islands', 'IN-AN'),
    ('CH', 'Chandigarh', 'IN-CH'),
    ('DH', 'Dadra and Nagar Haveli and Daman and Diu', 'IN-DH'),
    ('DL', 'Delhi', 'IN-DL'),
    ('JK', 'Jammu and Kashmir', 'IN-JK'),
    ('LA', 'Ladakh', 'IN-LA'),
    ('LD', 'Lakshadweep', 'IN-LD'),
    ('PY', 'Puducherry', 'IN-PY')
ON CONFLICT (state_code) DO NOTHING;

-- 2. FIELD ROSTER (State Team approved worker mobile roster)
CREATE TABLE IF NOT EXISTS csc2.field_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 VARCHAR(20) NOT NULL UNIQUE,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    added_by VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_field_roster_status CHECK (status IN ('ACTIVE', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS idx_field_roster_phone ON csc2.field_roster (phone_e164);
CREATE INDEX IF NOT EXISTS idx_field_roster_state ON csc2.field_roster (state);

-- 3. FIELD USERS (Phone-verified caseworker identity)
CREATE TABLE IF NOT EXISTS csc2.field_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    phone_e164 VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    state VARCHAR(100),
    district VARCHAR(100),
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_field_user_status CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS idx_field_user_phone ON csc2.field_user (phone_e164);
CREATE INDEX IF NOT EXISTS idx_field_user_status ON csc2.field_user (status);

-- 4. PHONE OTP CHALLENGES (Zero plaintext; HMAC-SHA256 with server pepper)
CREATE TABLE IF NOT EXISTS csc2.phone_otp_challenge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    device_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_exp ON csc2.phone_otp_challenge (phone_e164, expires_at DESC);

-- 5. DEVICE SESSIONS (Persistent session per device for verified field workers)
CREATE TABLE IF NOT EXISTS csc2.device_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_user_id UUID NOT NULL REFERENCES csc2.field_user(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    phone_e164 VARCHAR(20) NOT NULL,
    session_token_hash VARCHAR(64) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    idle_expires_at TIMESTAMPTZ NOT NULL,
    absolute_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_device_session_user ON csc2.device_session (field_user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_device_session_token ON csc2.device_session (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_device_session_refresh ON csc2.device_session (refresh_token_hash);

-- 6. SMS OUTBOX (Transactional outbox for gateway dispatch)
CREATE TABLE IF NOT EXISTS csc2.sms_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 VARCHAR(20) NOT NULL,
    message_text VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    error_message TEXT,
    gateway_message_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_sms_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DELIVERED', 'FAILED', 'DEAD'))
);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_pending ON csc2.sms_outbox (status, created_at) WHERE status IN ('PENDING', 'FAILED');

-- 7. LEADERSHIP ALLOWLIST (Pre-approved national/state leadership emails)
CREATE TABLE IF NOT EXISTS csc2.leadership_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    organization VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leadership_email_lower ON csc2.leadership_allowlist (lower(email));

INSERT INTO csc2.leadership_allowlist (email, full_name, organization) VALUES
    ('director.sen@allianceindia.org', 'Director Rajesh Sen', 'India HIV/AIDS Alliance National'),
    ('lead.oversight@allianceindia.org', 'Dr. Meenakshi Sundaram', 'National Technical Oversight Group')
ON CONFLICT (email) DO NOTHING;

-- 8. PASSWORD CREDENTIALS (Argon2id hashes for State Team / Admin)
CREATE TABLE IF NOT EXISTS csc2.password_credential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES csc2.app_user(id) ON DELETE CASCADE UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'ARGON2ID',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. LINK BENEFICIARY RECORDS TO FIELD USER ID
ALTER TABLE csc2.clients ADD COLUMN IF NOT EXISTS field_user_id UUID REFERENCES csc2.field_user(id);
CREATE INDEX IF NOT EXISTS idx_clients_field_user ON csc2.clients (field_user_id);
