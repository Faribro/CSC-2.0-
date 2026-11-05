-- V6__programme_follow_up_rules.sql
-- CSC 2.0 Programme Follow-Up Rules, Rule Engine Suggestions, Manual Tracking Tags,
-- Application Additions (Non-CRF), and ART-Centre Priority List Import.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROGRAMME FOLLOW-UP RULES (Approved, versioned programme rule repository)
CREATE TABLE IF NOT EXISTS csc2.follow_up_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    title_en VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'ART_INITIATION', 'LFU_TRACKING', 'VIRAL_LOAD_REMINDER', 'PMTCT_MONITORING', 'TB_MONITORING', 'VALIDATION', 'COMPUTED_LABEL'
    trigger_type VARCHAR(50) NOT NULL, -- 'ART_START_DATE', 'CLIENT_TAG', 'MISSED_APPOINTMENT', 'UNTRACEABLE_VALIDATION', 'OPTED_OUT_VALIDATION', 'VIRAL_LOAD_SCHEDULE', 'PREGNANCY_INFANT_STATUS', 'TB_TREATMENT'
    trigger_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    interval_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    purpose_code VARCHAR(20), -- Canonical J5 purpose code e.g. '01', '02', '03'
    suggested_service_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_name VARCHAR(255) NOT NULL,
    source_edition VARCHAR(100) NOT NULL,
    source_url VARCHAR(500),
    source_section VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED'
    version INT NOT NULL DEFAULT 1,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    scope VARCHAR(50) NOT NULL DEFAULT 'NATIONAL', -- 'NATIONAL' or state code e.g. 'DL', 'MH'
    created_by VARCHAR(150) NOT NULL,
    reviewed_by VARCHAR(150),
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    change_note TEXT,
    auto_create_tasks BOOLEAN NOT NULL DEFAULT FALSE, -- [OPEN: default off]
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_follow_up_rule_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED'))
);

CREATE INDEX IF NOT EXISTS idx_follow_up_rule_status ON csc2.follow_up_rule(status, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_follow_up_rule_category ON csc2.follow_up_rule(category);
CREATE INDEX IF NOT EXISTS idx_follow_up_rule_trigger ON csc2.follow_up_rule(trigger_type);

-- 2. APPEND-ONLY RULE HISTORY (No hard deletes, audit every state change)
CREATE TABLE IF NOT EXISTS csc2.follow_up_rule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES csc2.follow_up_rule(id) ON DELETE CASCADE,
    version INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    rule_snapshot JSONB NOT NULL,
    changed_by VARCHAR(150) NOT NULL,
    change_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_rule_hist_rule ON csc2.follow_up_rule_history(rule_id, version);

-- 3. RULE SUGGESTIONS (Suggestions only, never auto-scheduled unless explicitly approved)
CREATE TABLE IF NOT EXISTS csc2.rule_suggestion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES csc2.tasks(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES csc2.follow_up_rule(id) ON DELETE CASCADE,
    rule_version INT NOT NULL,
    suggested_date DATE NOT NULL,
    suggested_purpose VARCHAR(50) NOT NULL,
    suggested_service_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation_en TEXT NOT NULL,
    explanation_hi TEXT NOT NULL,
    dates_used JSONB NOT NULL DEFAULT '{}'::jsonb,
    outcome VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'EDITED', 'DISMISSED'
    dismissed_reason TEXT,
    decided_by VARCHAR(150),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_rule_suggestion_outcome CHECK (outcome IN ('PENDING', 'ACCEPTED', 'EDITED', 'DISMISSED'))
);

CREATE INDEX IF NOT EXISTS idx_rule_suggestion_client ON csc2.rule_suggestion(client_id, outcome);
CREATE INDEX IF NOT EXISTS idx_rule_suggestion_rule ON csc2.rule_suggestion(rule_id, rule_version);
CREATE INDEX IF NOT EXISTS idx_rule_suggestion_outcome ON csc2.rule_suggestion(outcome, suggested_date);

-- 4. MANUAL TRACKING TAGS (Worker or Supervisor attached tracking reasons)
CREATE TABLE IF NOT EXISTS csc2.client_tracking_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES csc2.clients(id) ON DELETE CASCADE,
    tag_type VARCHAR(50) NOT NULL, -- 'NEWLY_STARTED', 'MISSED_VISIT', 'LOST_TO_FOLLOW_UP', 'BROUGHT_BACK'
    event_date DATE NOT NULL,
    notes TEXT,
    created_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_client_tracking_tag_type CHECK (tag_type IN ('NEWLY_STARTED', 'MISSED_VISIT', 'LOST_TO_FOLLOW_UP', 'BROUGHT_BACK'))
);

CREATE INDEX IF NOT EXISTS idx_client_tracking_tag_client ON csc2.client_tracking_tag(client_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_tracking_tag_type ON csc2.client_tracking_tag(tag_type);

-- 5. CLIENT APPLICATION ADDITIONS (Optional non-CRF fields behind owner approval flag)
CREATE TABLE IF NOT EXISTS csc2.client_application_addition (
    client_id UUID PRIMARY KEY REFERENCES csc2.clients(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_art_centre_contact_date DATE,
    art_centre_next_due_date DATE,
    latest_viral_load_date DATE,
    pregnancy_status VARCHAR(50),
    expected_delivery_date DATE,
    infant_dob DATE,
    updated_by VARCHAR(150),
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. ART-CENTRE PRIORITY LIST CSV IMPORT (Validated, audited, dry-run first, non-destructive)
CREATE TABLE IF NOT EXISTS csc2.art_centre_priority_import (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    imported_by VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- SEED RULES: ALL 9 RULES CREATED AS STATUS 'DRAFT', NONE ACTIVE.
-- Tagged [PROPOSED] until approved. Source editions and access dates recorded.
-- ============================================================================

INSERT INTO csc2.follow_up_rule (
    id, code, title_en, title_hi, category, trigger_type, trigger_params,
    interval_spec, purpose_code, suggested_service_codes,
    source_name, source_edition, source_url, source_section,
    status, version, scope, created_by, change_note
) VALUES
-- a. Newly started on ART -> monthly contact for 6 months, one home visit in the first month
(
    '10000000-0000-0000-0000-000000000001',
    'RULE-NACO-2025-ART-INIT',
    '[PROPOSED] Newly Started on ART - 6-Month Intensive Contact Protocol',
    '[PROPOSED] एआरटी पर नए शुरू हुए - 6 महीने का गहन संपर्क प्रोटोकॉल',
    'ART_INITIATION',
    'ART_START_DATE',
    '{"trigger_field": "art_start_date", "unverified": true, "access_date": "2026-11-03", "superseded_warning": "Pending NACO CSC 2025 Full Operational PDF verification"}'::jsonb,
    '{"every": "1 month", "for": "6 months", "start_from": "art_start_date", "home_visit_in_month_1": true}'::jsonb,
    '01',
    '["01-01", "01-02"]'::jsonb,
    'NACO CSC Operational Guidelines 2025 [UNVERIFIED: confirm against the full PDF]',
    'Draft 2025 Edition',
    'https://naco.gov.in/guidelines/csc-operational-2025',
    'Section 4.2 - Care & Support Retention',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Initial seed rule per Task specification: monthly contact for 6 months with home visit in month 1.'
),

-- b. Lost to follow-up -> weekly until a definite tracking outcome
(
    '10000000-0000-0000-0000-000000000002',
    'RULE-NACO-2025-LFU-TRACK',
    '[PROPOSED] Lost to Follow-Up - Weekly Tracing Protocol',
    '[PROPOSED] फॉलो-अप छूटे लाभार्थी - साप्ताहिक ट्रैकिंग प्रोटोकॉल',
    'LFU_TRACKING',
    'CLIENT_TAG',
    '{"tag_type": "LOST_TO_FOLLOW_UP", "unverified": true, "access_date": "2026-11-03"}'::jsonb,
    '{"every": "1 week", "until": "definite_tracking_outcome"}'::jsonb,
    '02',
    '["02-01"]'::jsonb,
    'NACO CSC Operational Guidelines 2025 [UNVERIFIED]',
    'Draft 2025 Edition',
    'https://naco.gov.in/guidelines/csc-operational-2025',
    'Section 4.5 - LFU Tracking & Re-engagement',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Initial seed rule: weekly tracing for LFU clients until verified outcome.'
),

-- c. Brought back to care -> monthly for 3 months and until a viral load test
(
    '10000000-0000-0000-0000-000000000003',
    'RULE-NACO-2025-RE-ENGAGED',
    '[PROPOSED] Brought Back to Care - 3-Month Stabilization & VL Monitoring',
    '[PROPOSED] पुनः देखरेख में लाए गए - 3 महीने का स्थिरीकरण एवं वीएल निगरानी',
    'LFU_TRACKING',
    'CLIENT_TAG',
    '{"tag_type": "BROUGHT_BACK", "unverified": true, "access_date": "2026-11-03"}'::jsonb,
    '{"every": "1 month", "for": "3 months", "requires_vl_test": true}'::jsonb,
    '01',
    '["01-03"]'::jsonb,
    'NACO CSC Operational Guidelines 2025 [UNVERIFIED]',
    'Draft 2025 Edition',
    'https://naco.gov.in/guidelines/csc-operational-2025',
    'Section 4.6 - Post-Return Stabilization',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Initial seed rule: monthly follow-up for 3 months after re-engagement.'
),

-- d. Untraceable only after 2 phone attempts + 1 home visit within one month (validation rule)
(
    '10000000-0000-0000-0000-000000000004',
    'RULE-NACO-2025-VAL-UNTRACEABLE',
    '[PROPOSED] Untraceable Classification Prerequisite Validation',
    '[PROPOSED] अप्राप्य वर्गीकरण पूर्व-शर्त सत्यापन',
    'VALIDATION',
    'UNTRACEABLE_VALIDATION',
    '{"min_phone_attempts": 2, "min_home_visits": 1, "within_window_days": 30, "access_date": "2026-11-03"}'::jsonb,
    '{"window_days": 30}'::jsonb,
    '02',
    '[]'::jsonb,
    'NACO CSC Operational Guidelines 2025',
    'Edition 2025',
    'https://naco.gov.in/guidelines/csc-operational-2025',
    'Section 4.7 - Non-Traceable Protocol Criteria',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Validation rule: requires at least 2 distinct phone attempts and 1 distinct home visit within 30 days.'
),

-- e. Opted out requires counselling and three documented contacts (validation rule)
(
    '10000000-0000-0000-0000-000000000005',
    'RULE-NACO-2025-VAL-OPTED-OUT',
    '[PROPOSED] Opted Out Classification Prerequisite Validation',
    '[PROPOSED] सेवा समाप्ति (ऑप्ट-आउट) पूर्व-शर्त सत्यापन',
    'VALIDATION',
    'OPTED_OUT_VALIDATION',
    '{"requires_counselling": true, "min_documented_contacts": 3, "access_date": "2026-11-03"}'::jsonb,
    '{"contacts_count": 3}'::jsonb,
    '05',
    '[]'::jsonb,
    'NACO CSC Operational Guidelines 2025',
    'Edition 2025',
    'https://naco.gov.in/guidelines/csc-operational-2025',
    'Section 4.8 - Beneficiary Opt-Out Protocol',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Validation rule: requires documented counselling and 3 contacts before opting out beneficiary.'
),

-- f. WHO 2021/2024: start tracing when a scheduled visit/pick-up is missed by more than 7 days; LFU definition 28 days or more (display label rules)
(
    '10000000-0000-0000-0000-000000000006',
    'RULE-WHO-2024-COMPUTED-LABELS',
    '[PROPOSED] Tracing Triggers and LFU Threshold Display Rules',
    '[PROPOSED] ट्रैकिंग ट्रिगर्स एवं एलएफयू सीमा प्रदर्शन नियम',
    'COMPUTED_LABEL',
    'MISSED_APPOINTMENT',
    '{"missed_days_threshold": 7, "lfu_days_threshold": 28, "access_date": "2026-11-03"}'::jsonb,
    '{"thresholds": [7, 28]}'::jsonb,
    '02',
    '[]'::jsonb,
    'WHO Consolidated Guidelines on HIV Prevention, Testing, Treatment, Service Delivery and Monitoring',
    '2021 / 2024 Update',
    'https://www.who.int/publications/i/item/9789240031593',
    'Chapter 4 - Differentiated Service Delivery',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Computed label rule: missed visit > 7 days triggers tracing alert; >= 28 days marks LFU.'
),

-- g. NACO national guidelines: viral load at 6 months, 12 months after ART start, then yearly; every 6 months on second/third line; CD4 six-monthly where applicable
(
    '10000000-0000-0000-0000-000000000007',
    'RULE-NACO-2021-VIRAL-LOAD',
    '[PROPOSED] Viral Load and CD4 Routine Monitoring Schedule',
    '[PROPOSED] वायरल लोड एवं सीडी4 नियमित निगरानी अनुसूची',
    'VIRAL_LOAD_REMINDER',
    'VIRAL_LOAD_SCHEDULE',
    '{"vl_first_test_months": 6, "vl_second_test_months": 12, "vl_subsequent_months": 12, "second_third_line_months": 6, "cd4_interval_months": 6, "access_date": "2026-11-03", "superseded_warning": "Check if HCTS 2026 guideline on NACO website supersedes"}'::jsonb,
    '{"routine_vl": ["6 months", "12 months", "yearly"]}'::jsonb,
    '03',
    '["03-01"]'::jsonb,
    'NACO National Guidelines for HIV Care and Treatment',
    '2021 Edition (Note: HCTS 2026 listed on site may supersede)',
    'https://naco.gov.in/guidelines/treatment-2021',
    'Section 5.3 - Viral Load Monitoring Algorithm',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Reminder prompts only: viral load routine schedule and CD4 reminders.'
),

-- h. NACO/EVTHS 2024: pregnant women and exposed infants tracked to 18 months or 3 months after breastfeeding stops; viral load at 32-36 weeks in pregnancy
(
    '10000000-0000-0000-0000-000000000008',
    'RULE-NACO-2024-EVTHS-PMTCT',
    '[PROPOSED] Elimination of Vertical Transmission (EVTHS) & Infant Cohort Tracking',
    '[PROPOSED] वर्टिकल ट्रांसमिशन उन्मूलन (EVTHS) एवं शिशु समूह ट्रैकिंग',
    'PMTCT_MONITORING',
    'PREGNANCY_INFANT_STATUS',
    '{"track_infant_months": 18, "post_breastfeeding_months": 3, "vl_gestational_weeks": "32-36", "requires_application_addition": true, "access_date": "2026-11-03"}'::jsonb,
    '{"infant_max_months": 18, "vl_weeks": [32, 36]}'::jsonb,
    '04',
    '["04-01"]'::jsonb,
    'NACO/EVTHS Operational Guidelines for Prevention of Vertical Transmission',
    '2024 Edition',
    'https://naco.gov.in/guidelines/evths-2024',
    'Chapter 6 - Infant Tracking and Maternal Viral Load',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Requires application addition data (pregnancy / infant dob). Inactive if missing.'
),

-- i. NTEP: monthly during TB treatment; 6, 12, 18, 24 months after treatment
(
    '10000000-0000-0000-0000-000000000009',
    'RULE-NTEP-2024-TB-ATT',
    '[PROPOSED] NTEP Collaborative TB Treatment & Post-Treatment Surveillance',
    '[PROPOSED] एनटीईपी सहयोगात्मक टीबी उपचार एवं उपचार-उपरांत निगरानी',
    'TB_MONITORING',
    'TB_TREATMENT',
    '{"monthly_during_att": true, "post_treatment_months": [6, 12, 18, 24], "requires_application_addition": true, "access_date": "2026-11-03"}'::jsonb,
    '{"during_treatment": "1 month", "post_treatment": ["6 months", "12 months", "18 months", "24 months"]}'::jsonb,
    '06',
    '["06-01"]'::jsonb,
    'National Tuberculosis Elimination Programme (NTEP) Technical Guidelines',
    '2024 Edition',
    'https://tbcindia.gov.in/ntep-guidelines-2024',
    'Section 3.4 - HIV-TB Collaborative Activities',
    'DRAFT',
    1,
    'NATIONAL',
    'system.seed@allianceindia.org',
    'Requires TB treatment dates. Inactive if missing.'
)
ON CONFLICT (code) DO NOTHING;

-- Initialise append-only rule history for seed rules
INSERT INTO csc2.follow_up_rule_history (rule_id, version, status, rule_snapshot, changed_by, change_note)
SELECT 
    id, 
    version, 
    status, 
    to_jsonb(r), 
    created_by, 
    'Initial seed DRAFT creation [PROPOSED]'
FROM csc2.follow_up_rule r
WHERE code LIKE 'RULE-%'
ON CONFLICT DO NOTHING;
