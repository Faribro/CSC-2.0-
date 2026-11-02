-- V1__baseline_schema.sql
-- CSC 2.0 Follow-Up Platform Baseline Schema
-- Managed strictly by csc2_migration role

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ACTORS & SCOPE ASSIGNMENTS (RBAC & Center Scope)
CREATE TABLE IF NOT EXISTS csc2.actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_ref VARCHAR(64) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'CSC_STAFF', 'OUTREACH_WORKER', 'CASE_MANAGER', 'CSC_ADMIN', 'SYSTEM_ADMIN'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS csc2.scope_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES csc2.actors(id) ON DELETE CASCADE,
    center_id VARCHAR(64) NOT NULL, -- e.g. 'CENTER_DELHI_01', 'CENTER_MUMBAI_02'
    district VARCHAR(100),
    state VARCHAR(100),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT uq_actor_center UNIQUE (actor_id, center_id)
);

-- 2. CLIENT BASELINE (CRF Core & Demographics)
CREATE TABLE IF NOT EXISTS csc2.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_ref VARCHAR(64) NOT NULL UNIQUE, -- Stable business ref (e.g. CSC-DL-0001)
    center_id VARCHAR(64) NOT NULL,
    assigned_worker_id UUID REFERENCES csc2.actors(id),
    
    -- Section A: Beneficiary Profile
    registration_date DATE NOT NULL,
    client_type VARCHAR(20) NOT NULL, -- '1': New, '2': Follow-up
    full_name VARCHAR(200) NOT NULL,
    alias_name VARCHAR(100),
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(20),
    caregiver_name VARCHAR(200),
    primary_phone VARCHAR(32),
    alternate_phone VARCHAR(32),
    in_school VARCHAR(10), -- 'yes', 'no'
    occupation VARCHAR(20),
    occupation_other TEXT,
    key_population VARCHAR(20), -- 'fsw', 'msm', 'tgh', 'pwid', 'none'
    
    -- Address
    address_current TEXT,
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),

    -- Section C: Clinical Baseline
    hiv_status VARCHAR(20), -- 'positive', 'negative', 'unknown'
    art_number VARCHAR(100),
    art_center_name VARCHAR(200),
    art_start_date DATE,
    cd4_count INT,
    cd4_percentage NUMERIC(5,2),
    viral_load_count INT,
    muac_cm NUMERIC(4,1),
    
    -- Section J: Declarations (Yes/No attestations, no file uploads)
    has_hiv_doc_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    has_address_doc_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    has_art_doc_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    doc_declaration_notes TEXT,

    -- Consents
    home_visit_consent BOOLEAN NOT NULL DEFAULT FALSE,
    messaging_consent BOOLEAN NOT NULL DEFAULT FALSE,
    sharing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Status & Optimistic Concurrency Control
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'LOST_TO_FOLLOWUP', 'TRANSFERRED', 'DECEASED'
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_clients_center_id ON csc2.clients(center_id);
CREATE INDEX IF NOT EXISTS idx_clients_worker_id ON csc2.clients(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_clients_ref ON csc2.clients(client_ref);

-- 3. CLIENT IDENTIFIERS (Alternative identifiers, Aadhaar ref, ART ID)
CREATE TABLE IF NOT EXISTS csc2.client_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    identifier_type VARCHAR(50) NOT NULL, -- 'ART_NUMBER', 'PREVIOUS_CSC_ID', 'RATION_CARD_REF'
    identifier_value VARCHAR(100) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_client_ident UNIQUE (client_id, identifier_type, identifier_value)
);

-- 4. REPEAT: B2_MEMBERS (Family Members)
CREATE TABLE IF NOT EXISTS csc2.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    age INT,
    gender VARCHAR(20),
    hiv_status VARCHAR(20),
    art_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. TASKS (Worklist items for follow-up)
CREATE TABLE IF NOT EXISTS csc2.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_ref VARCHAR(64) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    assigned_worker_id UUID REFERENCES csc2.actors(id),
    center_id VARCHAR(64) NOT NULL,
    
    task_type VARCHAR(50) NOT NULL, -- 'FOLLOW_UP_VISIT', 'ART_REFILL_DUE', 'VIRAL_LOAD_DUE', 'SOCIAL_PROTECTION'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DUE', 'OVERDUE', 'DELIVERED', 'CANCELLED'
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES csc2.actors(id),
    
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_tasks_center_due ON csc2.tasks(center_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_tasks_worker_status ON csc2.tasks(assigned_worker_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON csc2.tasks(client_id);

-- 6. CONTACT ATTEMPTS (Attempts keep the task open; contact attempt != encounter)
CREATE TABLE IF NOT EXISTS csc2.contact_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES csc2.tasks(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES csc2.actors(id),
    
    attempt_date DATE NOT NULL,
    attempt_time TIME NOT NULL DEFAULT CURRENT_TIME,
    channel VARCHAR(30) NOT NULL, -- 'PHONE', 'HOME_VISIT', 'PHYSICAL_CSC', 'WHATSAPP'
    outcome VARCHAR(30) NOT NULL, -- 'reached', 'not_reached', 'refused'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_task ON csc2.contact_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_client ON csc2.contact_attempts(client_id);

-- 7. REPEAT: I_UPDATES (Encounters / Follow-Up Visits)
-- Observation date != recorded timestamp
CREATE TABLE IF NOT EXISTS csc2.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES csc2.actors(id),
    task_id UUID REFERENCES csc2.tasks(id),
    
    observation_date DATE NOT NULL, -- Date encounter clinically occurred
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- Timestamp written to system
    encounter_type VARCHAR(50) NOT NULL, -- 'HOME_VISIT', 'CSC_VISIT', 'PHONE_COUNSELING'
    
    -- Clinical Observations recorded during visit
    art_adherence_assessment VARCHAR(50),
    nutrition_assessment VARCHAR(50),
    mental_health_notes TEXT,
    general_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_encounters_client ON csc2.encounters(client_id);

-- 8. OBSERVATIONS (Discrete clinical observations: CD4, VL, Weight, MUAC)
CREATE TABLE IF NOT EXISTS csc2.observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES csc2.encounters(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    
    observation_code VARCHAR(50) NOT NULL, -- 'CD4_COUNT', 'CD4_PCT', 'VIRAL_LOAD', 'WEIGHT_KG', 'MUAC_CM'
    value_numeric NUMERIC(10,2),
    value_text VARCHAR(100),
    unit VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_observations_client ON csc2.observations(client_id, observation_code);

-- 9. REPEAT: J5_PLAN (Planned Services)
-- Planned service != Delivered service
CREATE TABLE IF NOT EXISTS csc2.planned_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    task_id UUID REFERENCES csc2.tasks(id),
    service_code VARCHAR(50) NOT NULL, -- 'ART_REFILL', 'CD4_TEST', 'VIRAL_LOAD', 'FOOD_BASKET', 'COUNSELING'
    service_name VARCHAR(150) NOT NULL,
    target_due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED', 'DELIVERED', 'CANCELLED'
    notes TEXT,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_planned_services_client ON csc2.planned_services(client_id);

-- 10. DELIVERED SERVICES (Explicit Delivered Service Records)
-- A planned service becomes DELIVERED ONLY through an explicit delivered_service row!
CREATE TABLE IF NOT EXISTS csc2.delivered_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planned_service_id UUID REFERENCES csc2.planned_services(id),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    delivered_by UUID NOT NULL REFERENCES csc2.actors(id),
    task_id UUID REFERENCES csc2.tasks(id),
    
    delivery_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    service_code VARCHAR(50) NOT NULL,
    facility_name VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_delivered_services_client ON csc2.delivered_services(client_id);
CREATE INDEX IF NOT EXISTS idx_delivered_services_planned ON csc2.delivered_services(planned_service_id);

-- 11. REPEAT: D5_REFERRALS (Referral Requests & Outcomes)
-- Referral request != Referral outcome
CREATE TABLE IF NOT EXISTS csc2.referral_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    referred_by UUID NOT NULL REFERENCES csc2.actors(id),
    
    referral_date DATE NOT NULL,
    service_category VARCHAR(100) NOT NULL, -- 'HEALTH', 'LEGAL', 'SOCIAL_PROTECTION', 'NUTRITION'
    target_facility VARCHAR(200) NOT NULL,
    reason TEXT,
    
    -- Outcome details (filled when resolved)
    status VARCHAR(30) NOT NULL DEFAULT 'REFERRED', -- 'REFERRED', 'COMPLETED', 'LOST_TO_FOLLOWUP', 'CANCELLED'
    outcome_date DATE,
    outcome_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_referral_requests_client ON csc2.referral_requests(client_id);

-- 12. AUDIT LOG (Immutable append-only audit trail)
CREATE TABLE IF NOT EXISTS csc2.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_id UUID REFERENCES csc2.actors(id),
    actor_username VARCHAR(100),
    center_id VARCHAR(64),
    action VARCHAR(100) NOT NULL, -- e.g. 'CLIENT_REGISTERED', 'CONTACT_ATTEMPT_RECORDED', 'SERVICE_DELIVERED'
    resource_type VARCHAR(50) NOT NULL, -- 'CLIENT', 'TASK', 'CONTACT_ATTEMPT', 'ENCOUNTER', 'DELIVERED_SERVICE'
    resource_id UUID NOT NULL,
    ip_address VARCHAR(45),
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON csc2.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred ON csc2.audit_log(occurred_at);

-- 13. TRANSACTIONAL OUTBOX (Mirroring & Event Streaming)
CREATE TABLE IF NOT EXISTS csc2.outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- 'CLIENT_UPSERT', 'TASK_STATUS_CHANGED', 'SERVICE_DELIVERED', 'CONTACT_ATTEMPTED'
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'
    attempts INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON csc2.outbox(status, created_at) WHERE status = 'PENDING';

-- 14. IDEMPOTENCY RECEIPTS (Duplicate Submission Protection)
CREATE TABLE IF NOT EXISTS csc2.idempotency_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    actor_id UUID REFERENCES csc2.actors(id),
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    http_status INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON csc2.idempotency_receipts(idempotency_key);
