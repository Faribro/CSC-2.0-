# 03 — Security and Access Document
## CSC 2.0 — Community Support Centre Follow-Up Platform

---

## Document Metadata

| Field | Value |
|---|---|
| Document ID | DOC-03 |
| Version | v0.1.1 |
| Status | **DRAFT** |
| Classification | SENSITIVE — restricted to project security reviewers and technical leads |
| Owners | TBD — security lead, technical architect, programme data officer |
| Created | 2026-11-02 |
| Last Updated | 2026-11-02 |
| **Shared Glossary** | See `SHARED_GLOSSARY.md` (canonical terms, role codes, ID namespace) |

### Change Log

| Version | Date | Author | Description |
|---|---|---|---|
| v0.1.0 | 2026-11-02 | Security Architecture Working Group | Initial security and access baseline document covering data classification, STRIDE threat model, RBAC/ABAC matrices, and audit logging specifications [PROPOSED] |
| v0.1.1 | 2026-11-02 | Security Lead / Editor-in-Chief | Reconciliation pass: normalized Document ID to DOC-03, added explicit tagging on all normative rules, aligned canonical role codes with SHARED_GLOSSARY.md, scoped ABUSE-03 as conditional on OTP adoption, and rejected the `user-select: none` screenshot antipattern [PROPOSED] |

### Cross-Document Traceability

| Document ID | Title | Relationship to this Document |
|---|---|---|
| DOC-01 | Product Requirements Document (PRD) | Defines business objectives, user journeys, functional requirements (PRD-001 through PRD-070), and open decisions (OD-001 through OD-015) [SOURCE] |
| DOC-02 | Technical Architecture Document (TAD) | Defines system boundaries, runtime topology, component ownership, database schema, and ADRs (ADR-001 through ADR-008) [PROPOSED] |
| DOC-04 | Frontend Specification Document (FSD) | Defines UI screen contracts, client-side state handling, offline draft storage, and responsive layout guidelines [PROPOSED] |
| DOC-05 | Feature Ticket List | Decomposes architecture and security requirements into implementation work tickets (TCK-001 through TCK-056) [PROPOSED] |
| DOC-GLO | Shared Glossary (`SHARED_GLOSSARY.md`) | Canonical naming registry, role codes, entity naming, and ID namespace definitions [PROPOSED] |
| DOC-RECON | Reconciliation Report (`RECONCILIATION_REPORT.md`) | Cross-document consistency audit, discrepancy tracking, and resolution history [PROPOSED] |

### Evidence Tag Legend

| Tag | Meaning | Usage Rule |
|---|---|---|
| `[SOURCE]` | Directly traceable to CRF PDF or XLSForm specification (`CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx`) | Used for field names, CRF questions, choices, and source validation constraints [SOURCE] |
| `[PROPOSED]` | Architectural or security design choice established by technical leadership | Used for threat mitigations, cryptographic controls, database policies, and RBAC rules [PROPOSED] |
| `[ASSUMPTION]` | Working operational premise requiring ongoing operational validation | Used for infrastructure baselines, deployment network boundaries, and volume models [ASSUMPTION] |
| `[OPEN]` | Unresolved decision or parameter requiring formal stakeholder sign-off | Used where policy, clinical thresholds, retention intervals, or vendor choices are pending [OPEN] |
| `[UNVERIFIED]` | Prior assertion not yet formally validated against technical evidence | Used as a temporary marker pending technical spike or verification [UNVERIFIED] |

---

## Executive Summary & Security Principles

The Community Support Centre Follow-Up Platform (CSC 2.0) handles highly sensitive health, behavioral, and demographic information concerning People Living with HIV (PLHIV) and Key Populations (KP) across India [SOURCE]. Unauthorized exposure, tampering, or loss of this data can lead to extreme real-world harms, including social ostracization, physical violence, legal jeopardy, and disruption of life-sustaining antiretroviral therapy (ART) [PROPOSED].

This document establishes the end-to-end security architecture, cryptographic safeguards, authorization boundaries, threat mitigations, and verification regimes governing all components of CSC 2.0 [PROPOSED]. The platform adheres to six non-negotiable security principles:

1. **Defense in Depth**: Security controls are applied across network boundaries, transport channels, application gateways, service layers, and storage tiers; no single defensive layer is relied upon in isolation [PROPOSED].
2. **Principle of Least Privilege**: Users, micro-components, database roles, and background workers operate with the absolute minimum access permissions and geographic scope required to perform their explicit functions [PROPOSED].
3. **Zero Trust Across Trust Boundaries**: Next.js BFF assertions, browser headers, and external webhooks are treated as untrusted inputs; Spring Boot acts as the sole authoritative enforcement point and must independently validate all cryptographic tokens and claims [PROPOSED].
4. **Deny-by-Default Authorization**: Access to any endpoint, entity, or field is denied unless an explicit allow rule matches the actor's authenticated identity, verified role, and assigned geographic scope [PROPOSED].
5. **Complete and Immutable Auditability**: Every state-changing operation, data access attempt, export event, and administrative action is written atomically to an append-only audit log protected against deletion and modification [PROPOSED].
6. **Privacy by Design & Data Minimization**: Data collection is strictly limited to authorized fields in the Case Record Form (CRF); PII is masked or excluded from logs, error reports, and non-privileged interfaces [PROPOSED].

---

## §1 — Data Classification

### 1.1 Data Classification Tiers

The CSC 2.0 platform processes multiple categories of data requiring distinct handling, encryption, log redaction, export constraints, and role-based access boundaries [PROPOSED]. Data is categorized into three strict tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CSC 2.0 DATA CLASSIFICATION                       │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 1: HIGHLY SENSITIVE (Special Category Health & Behavioral Data)  │
│  • HIV Status, CD4/Viral Load Counts, ART Regimen & Adherence          │
│  • Key Population Identification (FSW, MSM, TGH, PWID)                 │
│  • Harm Reduction & Substance Use (OST, NSEP, Overdose History)        │
│  • Sexual History, STI Screening, and Risk Assessment Details          │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 2: SENSITIVE (Personally Identifiable Information - PII)         │
│  • Beneficiary Full Name, Phone Number, Residential Address            │
│  • Government & Health Identifiers (UID, ABHA Number, ARTC Number)     │
│  • Family Member Directory & Relationships                             │
│  • Mortality Date & Cause, Disability Status, Stigma Incidents         │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 3: INTERNAL (De-identified & Aggregate Operational Data)         │
│  • Block & District Aggregates, Monthly Cohort Progress Indicators     │
│  • De-identified Dashboard Metrics, Anonymised Caseload Statistics     │
│  • System Configuration, Reference Lookups, Master Facility Lists      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tier 1 — Highly Sensitive (Health, Sexual Behavior, Substance Use, KP Category, Laboratory Results)
- **Scope & Definitions**: Encompasses medical status, diagnostic findings, biological measurements, substance consumption patterns, sexual practices, and key population vulnerability indicators [SOURCE].
- **CRF & XLSForm Fields**:
  - `c1_hiv_confirmed` (HIV confirmation status) [SOURCE]
  - `c12b_cd4_count`, `c12b_cd4_pct` (CD4 cell counts and percentages) [SOURCE]
  - `c13b_vl_count` (Viral load quantitative count) [SOURCE]
  - `b1_kp` (Key population classification: FSW, MSM, TGH, PWID) [SOURCE]
  - `e1_sexwork` (Commercial sex work engagement) [SOURCE]
  - `e2_ost` (Opioid Substitution Therapy enrollment) [SOURCE]
  - `e3_nsep` (Needle and Syringe Exchange Programme access) [SOURCE]
  - `e9a`–`e9e` (Substance usage details: alcohol, cannabis, opioids, sedatives, stimulants) [SOURCE]
  - `b2_members` clinical repeat entries: `b2_hiv` (family member HIV status), `b2_cd4`, `b2_vl`, `b2_art` [SOURCE]
  - `ic_art_status`, `id_vl_suppressed`, `ie_opportunistic_inf` (Section I follow-up encounter health updates) [SOURCE]
- **Handling Requirements**:
  - Encrypted at rest using AES-256 at the storage tier or via database-level cryptographic mechanisms [PROPOSED].
  - Encrypted in transit using TLS 1.2 or TLS 1.3 with modern cipher suites; plaintext HTTP is prohibited [PROPOSED].
  - STRICT log redaction: Tier 1 values MUST NEVER appear in application logs, web server logs, system consoles, stack traces, or APM telemetry [PROPOSED].
  - Access is restricted exclusively to authenticated users holding the `field_worker` role (assigned clients only within geographic scope), `supervisor` (assigned workers' clients), and `administrator` (system maintenance with mandatory audit trail) [PROPOSED].
  - NEVER visible to the `leadership` role or `state_reviewer` role in disaggregated or identifiable form [PROPOSED].
  - Bulk or line-level export requires `supervisor` or `administrator` privilege; every export transaction is recorded in `audit_log` with actor identity, timestamp, filter parameters, and record volume [PROPOSED].

#### Tier 2 — Sensitive (Personally Identifiable Information — Identity, Contact, Family, Stigma, Death)
- **Scope & Definitions**: Encompasses personal identifiers, contact coordinates, government-issued IDs, family rosters, mortality records, and reports of discrimination or physical impairment [SOURCE].
- **CRF & XLSForm Fields**:
  - `a04_name` (Beneficiary full name) [SOURCE]
  - `a12_phone` (Primary and alternate telephone contact) [SOURCE]
  - `a14_uid` (National identification number / UID) [SOURCE]
  - `a15_abha` (Ayushman Bharat Health Account number) [SOURCE]
  - `a05_address`, `a06_state`, `a07_district` (Locality and residential coordinates) [SOURCE]
  - `h1_death_date`, `h2_death_cause` (Mortality reporting fields) [SOURCE]
  - `f1_discrimination`, `f2_incident_type` (Stigma and rights violation reporting) [SOURCE]
  - `g1_disability`, `g2_disability_type` (Functional impairment classifications) [SOURCE]
  - `b2_name`, `b2_relation`, `b2_phone` (Family roster demographic fields) [SOURCE]
- **Handling Requirements**:
  - Encrypted at rest using AES-256 database storage encryption [PROPOSED].
  - Encrypted in transit using TLS 1.2+ [PROPOSED].
  - Log redaction: Full name and phone numbers MUST be completely redacted or cryptographically hashed (SHA-256 with salt) if required for diagnostic correlation [PROPOSED].
  - Access is constrained strictly by geographic Role-Based and Attribute-Based Access Control (RBAC/ABAC); `field_worker` can view only assigned clients; `supervisor` views clients within their assigned CSC facility; `state_reviewer` receives stripped or de-identified extracts only [PROPOSED].
  - Export controls mirror Tier 1 requirements: restricted to authorized supervisors and administrators with mandatory audit logging [PROPOSED].

#### Tier 3 — Internal (Aggregate, Anonymised Programme Data & Operational Configuration)
- **Scope & Definitions**: Encompasses statistical summaries, cohort monitoring indicators, geographic heatmaps, reference catalogs, facility dictionaries, and workflow status records that contain zero direct or indirect PII [PROPOSED].
- **Data Elements**:
  - Monthly active client counts grouped by district, block, or CSC facility [PROPOSED].
  - Aggregated referral completion counts and planned service distribution percentages [PROPOSED].
  - System reference tables (ART centre master lists, ICD diagnostic lookups, dropdown choice vocabularies) [PROPOSED].
  - Anonymous platform health telemetry, API response latencies, and worker queue depths [PROPOSED].
- **Handling Requirements**:
  - Encrypted in transit (TLS 1.2+) and standard encrypted volume storage at rest [PROPOSED].
  - Standard operational logging permitted; no PII present to redact [PROPOSED].
  - Accessible to `leadership`, `state_reviewer`, `supervisor`, and `administrator` roles [PROPOSED].
  - Readily exportable by authorized reporting roles for programme governance and donor reporting [PROPOSED].

### 1.2 Data Handling Rules Summary

| Data Classification Tier | At-Rest Encryption | In-Transit Encryption | Log Redaction & Masking | Export Controls | Permitted Roles | Evidence Tag |
|---|---|---|---|---|---|---|
| **Tier 1 — Highly Sensitive** (HIV, CD4, VL, KP, OST/NSEP, Substance Use) | AES-256 storage encryption; column-level encryption for clinical tables [PROPOSED] | Mandatory TLS 1.2+ (TLS 1.3 preferred); HSTS enforced [PROPOSED] | 100% redacted; zero clinical or diagnostic values permitted in any log stream [PROPOSED] | Restricted to `supervisor` and `administrator`; mandatory `audit_log` row written with query hash and row count [PROPOSED] | `field_worker` (strictly assigned clients), `supervisor` (assigned facility), `administrator` (system maintenance only) | [SOURCE] / [PROPOSED] |
| **Tier 2 — Sensitive** (Name, Phone, UID, ABHA, Address, Death, Stigma) | AES-256 storage volume encryption [PROPOSED] | Mandatory TLS 1.2+; HSTS enforced [PROPOSED] | Names, phone numbers, and IDs masked or SHA-256 hashed; never logged in plaintext [PROPOSED] | Restricted to `supervisor` and `administrator`; scope constrained by geographic assignment; fully audit-logged [PROPOSED] | `field_worker` (assigned scope), `supervisor` (assigned facility), `administrator` | [SOURCE] / [PROPOSED] |
| **Tier 3 — Internal** (Aggregate indicators, counts, configuration) | Standard encrypted volume at rest [PROPOSED] | Mandatory TLS 1.2+ [PROPOSED] | Standard operational logging; no PII present [PROPOSED] | Unrestricted for authorized reporting roles; rate-limited to prevent scraping [PROPOSED] | `leadership`, `state_reviewer`, `supervisor`, `administrator` | [PROPOSED] |

### 1.3 Field-Level Handling Catalog (CRF Sections A–J)

The following catalog establishes the mandatory data handling, masking, and export governance rules for every core entity field in the CSC 2.0 domain model [SOURCE] / [PROPOSED]:

| CRF Section | Field Identifier | Field Label / Meaning | Tier | In-Transit | At-Rest | Log Handling | Export Authority |
|---|---|---|---|---|---|---|---|
| Section A | `a01_reg_date` | Registration Date | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section A | `a04_name` | Beneficiary Full Name | Tier 2 | TLS 1.2+ | Encrypted | **MASKED** (`J*** D**`) [PROPOSED] | `supervisor`+ [PROPOSED] |
| Section A | `a04_age` | Age (Years: 0–120) [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section A | `a04_gender` | Gender (Male, Female, TG) [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section A | `a08_consent` | Consent for Home Visit [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Boolean flag allowed | `supervisor`+ [PROPOSED] |
| Section A | `a09_artc_code` | ART Centre Code [SOURCE] | Tier 3 | TLS 1.2+ | Encrypted | Plaintext allowed | `field_worker`+ [PROPOSED] |
| Section A | `a10_csc_code` | CSC Facility Code [SOURCE] | Tier 3 | TLS 1.2+ | Encrypted | Plaintext allowed | `field_worker`+ [PROPOSED] |
| Section A | `a12_phone` | Telephone Number [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | **REDACTED** or Salted Hash | `supervisor`+ [PROPOSED] |
| Section A | `a13_client_type` | Client Type (1=New, 2=Follow-up) [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Enum value allowed | `field_worker`+ [PROPOSED] |
| Section A | `a14_uid` | National Identification Number [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | **REDACTED** (Mask last 8 digits) | `administrator` only [PROPOSED] |
| Section A | `a15_abha` | ABHA Health ID [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | **REDACTED** (Mask last 10 digits) | `supervisor`+ [PROPOSED] |
| Section B | `b1_kp` | Key Population Category [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section B | `b2_members` | Family Member Repeat Roster [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Names masked; IDs redacted | `supervisor`+ [PROPOSED] |
| Section B | `b2_hiv` | Family Member HIV Status [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section C | `c1_hiv_confirmed` | Confirmed HIV Positive [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section C | `c10_height` | Height (30–230 cm) [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section C | `c11_weight` | Weight (1–200 kg) [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section C | `c12b_cd4_count` | CD4 Count (0–5000) [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section C | `c13b_vl_count` | Viral Load Count (≥0) [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section D | `d5_referrals` | Social Scheme Referrals [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Scheme name allowed | `supervisor`+ [PROPOSED] |
| Section E | `e1_sexwork` | Sex Work Engagement [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section E | `e2_ost` | OST Enrollment [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section E | `e3_nsep` | NSEP Usage [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section E | `e9a`–`e9e` | Substance Usage Breakdowns [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section F | `f1_discrimination`| Stigma / Discrimination Report [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Categorical code allowed | `supervisor`+ [PROPOSED] |
| Section G | `g1_disability` | Disability Sighted [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Boolean flag allowed | `supervisor`+ [PROPOSED] |
| Section H | `h1_death_date` | Date of Beneficiary Death [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section H | `h2_death_cause`| Recorded Cause of Death [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Category allowed | `supervisor`+ [PROPOSED] |
| Section I | `ia_visit_date` | Follow-up Encounter Date [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Plaintext allowed | `supervisor`+ [PROPOSED] |
| Section I | `ic_art_status` | ART Status at Encounter [SOURCE] | **Tier 1** | TLS 1.2+ | Column Encrypted | **STRICT REDACTION** | `supervisor`+ [PROPOSED] |
| Section J | `j_doc_hiv` | Sighted HIV Doc Declaration [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Boolean flag allowed | `supervisor`+ [PROPOSED] |
| Section J | `j_doc_addr` | Sighted Address Doc Declaration [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Boolean flag allowed | `supervisor`+ [PROPOSED] |
| Section J | `j_doc_art` | Sighted ART Doc Declaration [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Boolean flag allowed | `supervisor`+ [PROPOSED] |
| Section J | `j5_plan` | Planned Service Entries [SOURCE] | Tier 2 | TLS 1.2+ | Encrypted | Service category allowed | `field_worker`+ [PROPOSED] |

---

## §2 — Threat Model (STRIDE + Abuse Cases)

### 2.1 System Architecture & Trust Boundaries

The system security architecture establishes clear isolation zones between untrusted external actors, intermediate proxies, core transactional authorities, and external mirror destinations [PROPOSED].

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CSC 2.0 TRUST BOUNDARIES                                       │
│                                                                                                  │
│   UNTRUSTED NETWORK ZONE                                                                         │
│   ┌──────────────────────────┐                                                                   │
│   │ Client Browser / Mobile  │                                                                   │
│   │ (Field Worker Device)    │                                                                   │
│   └─────────────┬────────────┘                                                                   │
│                 │ HTTPS / WSS (Cookie or Bearer)                                                 │
│   ══════════════╪═════════════════════════════════════════════════════════════════════════════   │
│                 │  TRUST BOUNDARY 1: Web Application Firewall & Edge Ingress                     │
│   PERIMETER / DMZ                                                                                │
│   ┌─────────────▼────────────┐                                                                   │
│   │ Next.js BFF (Port 3000)  │                                                                   │
│   │ • UI Rendering & SSR     │                                                                   │
│   │ • Identity Forwarding    │                                                                   │
│   └─────────────┬────────────┘                                                                   │
│                 │ Internal HTTPS (Forwarded JWT + Service Credential)                            │
│   ══════════════╪═════════════════════════════════════════════════════════════════════════════   │
│                 │  TRUST BOUNDARY 2: Core Authority Boundary (Zero Trust Enforcement)            │
│   INTERNAL AUTHORITATIVE ZONE                                                                    │
│   ┌─────────────▼────────────────────────────────────────────────────────┐                       │
│   │ Spring Boot API Authority (Port 8080)                                │                       │
│   │ • Independent JWT Cryptographic Validation                           │                       │
│   │ • Business Logic Enforcement & Validation Engine                     │                       │
│   │ • RBAC / ABAC Geographic Scoping Engine                              │                       │
│   │ • Atomic Transaction Manager (Domain Write + Audit Log + Outbox)     │                       │
│   │                                                                      │                       │
│   │  ┌───────────────────────┐         ┌──────────────────────────────┐  │                       │
│   │  │ Outbox Poller Worker  │         │ Spring Security Filter Chain │  │                       │
│   │  └──────────┬────────────┘         └──────────────────────────────┘  │                       │
│   └─────────────┼───────────────────────────────────────┬────────────────┘                       │
│                 │                                       │ Local SQL Connection (Least Privilege) │
│                 │                                       ▼                                        │
│                 │                      ┌─────────────────────────────────┐                       │
│                 │                      │ PostgreSQL 16+ Primary Database │                       │
│                 │                      │ • Domain Tables (Clients, Tasks)│                       │
│                 │                      │ • audit_log (Append-Only)       │                       │
│                 │                      │ • outbox & idempotency_receipts │                       │
│                 │                      └─────────────────────────────────┘                       │
│                 │                                                                                │
│   ══════════════╪═════════════════════════════════════════════════════════════════════════════   │
│                 │  TRUST BOUNDARY 3: Egress Gateway Boundary (External Mirror Target)            │
│   EXTERNAL MIRROR ZONE (LOWER TRUST)                                                             │
│   ┌─────────────▼─────────────────────────┐     Sheets API      ┌─────────────────────────────┐  │
│   │ Google Apps Script Adapter (doPost)   ├────────────────────►│ Google Sheets Mirror Target│  │
│   │ (Write-Only Ingestion Gateway)        │                     │ (Read-Only Secondary Mirror)│  │
│   └───────────────────────────────────────┘                     └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 STRIDE Threat Model

The following matrix documents STRIDE threats evaluated across all trust boundaries, mapping attack vectors directly to required architectural mitigations [PROPOSED]:

| Threat ID | STRIDE Category | Description | Attack Surface | Technical Mitigation & Architectural Control | Evidence Tag |
|---|---|---|---|---|---|
| **THREAT-S-001** | Spoofing | Adversary uses compromised or brute-forced credentials to impersonate a legitimate field worker | Next.js BFF Login Gateway (`/api/auth/login`) | Spring Boot validates credentials against salted Argon2id password hashes; rate-limiting on login endpoint (5 attempts per minute per IP); account lockout after 5 consecutive failures; JWT issued with cryptographic signature [PROPOSED] | [PROPOSED] |
| **THREAT-S-002** | Spoofing | Adversary captures and replays a valid JWT token intercepted via network sniffing or cached browser artifacts | Inbound API Gateway (`/api/v1/**`) | Enforce short JWT Time-To-Live (TTL); maintain an active server-side revocation list (Redis or PostgreSQL table) checked on every request; TLS 1.2+ mandatory across all hops [OPEN — revocation mechanism TBD] | [OPEN] / [PROPOSED] |
| **THREAT-S-003** | Spoofing | Adversary modifies JWT payload claims (e.g., tampering `role` from `field_worker` to `administrator`) | Inbound HTTP Headers / JWT Bearer | Spring Boot API MUST independently re-validate JWT cryptographic signature using the private/public signing key; Spring Boot MUST NOT trust any role or identity assertion from Next.js BFF without valid signature [PROPOSED] | [PROPOSED] |
| **THREAT-S-004** | Spoofing | Session fixation or session abandonment on shared Android devices in field CSC facilities | Client Browser Session Cookie | Clear session cookie on explicit logout; enforce `HttpOnly`, `Secure`, and `SameSite=Strict` cookie flags; implement client-side warning dialog if unsaved drafts exist before clearing; never wipe drafts silently [PROPOSED] | [PROPOSED] |
| **THREAT-S-005** | Spoofing | Adversary spoofs user identity by injecting forged HTTP proxy headers (`X-User-Id`, `X-User-Role`) from an untrusted client | BFF to Spring Boot API Bridge | Spring Boot ignores unauthenticated HTTP identity headers; user identity and role MUST be extracted exclusively from cryptographically verified JWT claims passed along the trusted mTLS/secret-protected bridge [PROPOSED] | [PROPOSED] |
| **THREAT-T-001** | Tampering | Malicious actor modifies a beneficiary record directly in PostgreSQL, bypassing domain validation rules | PostgreSQL Database Engine | Direct database access restricted to dedicated service accounts on isolated private subnet; database user roles granted least privilege; application role has NO DDL or unrestricted update capabilities [PROPOSED] | [PROPOSED] |
| **THREAT-T-002** | Tampering | Rogue administrator or compromised application role modifies or purges historical audit records to conceal illicit activity | PostgreSQL `audit_log` Table | Database role isolation: PostgreSQL application user is granted `INSERT` and `SELECT` ONLY on `audit_log`; `UPDATE`, `DELETE`, and `TRUNCATE` privileges are strictly revoked at the database permissions level [PROPOSED] | [PROPOSED] |
| **THREAT-T-003** | Tampering | Forged or tampered outbox messages injected into Google Apps Script adapter from unauthorized internet sources | Google Apps Script `doPost` Webhook | Apps Script endpoint validates gateway credential passed in payload or query parameters on every invocation; Outbox Worker signs payload with shared HMAC secret [OPEN per OD-006] | [OPEN] / [PROPOSED] |
| **THREAT-R-001** | Repudiation | Field worker denies having modified, created, or recorded contact attempts for a specific beneficiary | Client Record Mutation Endpoints | Synchronous write to immutable `audit_log` in the same database transaction as the domain update; captures `actor_id`, exact server `recorded_at` timestamp, `action`, `old_value`, `new_value`, and SHA-256 hash of IP address [PROPOSED] | [PROPOSED] |
| **THREAT-I-001** | Information Disclosure | Broken Object-Level Authorization (BOLA/IDOR): Field worker attempts to access client records outside assigned geographic catchment | `/api/v1/clients/{id}` and query endpoints | Every read and write query executes mandatory geographic predicate: `WHERE client.assigned_geography IN (actor.authorised_geographies)`; unauthorized requests return HTTP 404 (Not Found) rather than 403 to prevent ID enumeration [PROPOSED] | [PROPOSED] |
| **THREAT-I-002** | Information Disclosure | Sensitive beneficiary PII (full name, phone, ABHA ID) leaked into application logging pipelines or crash reports | Application Logger (Logback / SLF4J) | Logback masking filters automatically redact regex matches for phone numbers (`^[6-9]\d{9}$`), ABHA IDs, and names; PII field logging strictly forbidden; compliance enforced via automated CI pipeline log-assertion tests [PROPOSED] | [PROPOSED] |
| **THREAT-I-003** | Information Disclosure | Mass exfiltration of beneficiary data via automated bulk export misuse | `/api/v1/reports/export` Endpoint | Export permissions restricted to `supervisor` and `administrator`; export dataset strictly scoped to user's authorized geography; max export threshold enforced; every export logged in `audit_log` with row counts [PROPOSED] | [PROPOSED] |
| **THREAT-I-004** | Information Disclosure | Hardcoded database passwords, JWT secrets, or API tokens committed to version control repositories | Git Source Control & CI Pipelines | Zero secrets in source control or documentation; secrets injected exclusively via environment variables or secret managers at runtime; pre-commit hooks and CI automated scans using `git-secrets` / TruffleHog [PROPOSED] | [PROPOSED] |
| **THREAT-D-001** | Denial of Service | External Google Apps Script quota exhaustion or transient network failure halts outbox processing | Outbox Background Dispatcher | Outbox Worker implements exponential backoff with jitter (max 5 retries); persistent failures transition outbox row to `dead_letter` status; database operations remain unaffected due to asynchronous decoupling [PROPOSED] | [PROPOSED] |
| **THREAT-D-002** | Denial of Service | Malicious or buggy script floods API with high-concurrency requests, causing database connection exhaustion | Spring Boot API Endpoints | Ingress rate limiting (Bucket4j / Redis token bucket); enforced cursor-based pagination with max limit of 50 records per page; HikariCP connection pool caps and query timeout limits (5 seconds max) [PROPOSED] | [PROPOSED] |
| **THREAT-E-001** | Elevation of Privilege | Field worker attempts to escalate privileges to supervisor or administrator by altering request payloads or headers | Spring Security Authorization Filter | Role assertions inside request bodies or unverified headers are ignored; user authority is derived strictly from validated JWT claims; role hierarchy enforced via Spring Security `@PreAuthorize` annotations [PROPOSED] | [PROPOSED] |
| **THREAT-E-002** | Elevation of Privilege | Compromised Google Apps Script adapter attempts to execute unauthorized writes back into the core PostgreSQL database | Google Sheets Mirror Interface | Network-level one-way isolation: Google Apps Script has zero network route or database credentials to PostgreSQL; Outbox Worker pushes data outbound only; Sheets is strictly an egress mirror [PROPOSED] | [PROPOSED] |

### 2.3 Abuse Cases and Adversarial Scenarios

#### ABUSE-01: Broken Object-Level Authorization (BOLA / IDOR) Across CSC Catchments
- **Adversary Profile**: A field worker assigned to CSC Block Alpha attempts to inspect records belonging to a celebrity or acquaintance residing in CSC Block Beta by incrementing or guessing client UUIDs [PROPOSED].
- **Threat Vector**: Invocations to `GET /api/v1/clients/{uuid}` or `GET /api/v1/clients/{uuid}/encounters` using manipulated UUID parameters [PROPOSED].
- **Exploitation Impact**: Catastrophic breach of confidentiality regarding HIV status and key population affiliation [PROPOSED].
- **Mandatory Mitigation**:
  1. Every database retrieval query executed by the Spring Boot API MUST include an explicit join or filter against the actor's authorized geographic scope: `WHERE client.csc_code IN (:actor_authorised_cscs)` [PROPOSED].
  2. If a client record exists in the database but falls outside the actor's authorized geographic boundaries, the API MUST return `HTTP 404 Not Found` (NOT `HTTP 403 Forbidden`). Returning 403 confirms the existence of the client ID, enabling geographic enumeration attacks [PROPOSED].

#### ABUSE-02: Scope Escalation by State-Level Reviewers
- **Adversary Profile**: A state reviewer holding analytical oversight privileges attempts to extract line-level PII or identifiable medical histories of specific clients [PROPOSED].
- **Threat Vector**: State reviewer queries operational API endpoints intended for field operations (`/api/v1/clients/**`) or manipulates aggregation filters to isolate single-individual cells [PROPOSED].
- **Exploitation Impact**: Unintended surveillance and privacy compromise by government or donor-level monitoring personnel [PROPOSED].
- **Mandatory Mitigation**:
  1. Spring Security strictly limits the `state_reviewer` role to `/api/v1/analytics/**` and `/api/v1/aggregates/**` endpoints; any attempt to invoke `/api/v1/clients/**` returns `HTTP 403 Forbidden` [PROPOSED].
  2. Analytical queries enforce minimum cell suppression (k-anonymity): any aggregate grouping resulting in fewer than 5 individuals is masked or suppressed to prevent small-cell re-identification [PROPOSED].

#### ABUSE-03: OTP Replay and Interception
- **Status & Scope**: `[OPEN — mechanism NOT confirmed in source documents. Documented conditionally if multi-factor or phone-based OTP authentication is adopted per OD-009 / OD-AUTH-01.]` [OPEN].
- **Adversary Profile**: Adversary intercepts an SMS OTP transmitted over unencrypted cellular channels or replays an expired verification code [PROPOSED].
- **Exploitation Impact**: Unauthorized account takeover and field worker impersonation [PROPOSED].
- **Mandatory Mitigation (Conditional on Adoption)**:
  1. OTP codes MUST be single-use and have a maximum validity window of 5 minutes (300 seconds) [PROPOSED].
  2. Server-side persistence must store OTP state with a boolean `consumed` flag; upon initial verification attempt, the flag is set to `true` atomically within a database transaction [PROPOSED].
  3. Strict rate-limiting: maximum 3 incorrect attempts before the OTP is invalidated and account verification is locked for 15 minutes [PROPOSED].

#### ABUSE-04: Malicious File Upload Disguised as Document Proof
- **Clarification & Status**: The source CRF and XLSForm specify Document Declarations (`j_doc_hiv`, `j_doc_addr`, `j_doc_art`) exclusively as boolean yes/no assertions where a field worker certifies sighting physical documentation [SOURCE]. Physical file upload is NOT implemented in MVP [PROPOSED].
- **Adversary Profile**: If file upload capability is ever introduced via a future Architecture Decision Record (ADR), an attacker could attempt to upload executable payloads (e.g., webshells, Polyglot PDFs) to compromise server infrastructure [PROPOSED].
- **Mandatory Mitigation (Future Reference if ADR Adopted)**:
  1. Uploads must be restricted to non-executable MIME types (e.g., `image/jpeg`, `image/png`, `application/pdf`) with strict magic-byte file signature validation, NOT trusting client-supplied headers or extensions [PROPOSED].
  2. Files stored outside web server docroots on object storage with randomized UUID keys and zero execute permissions [PROPOSED].
  3. Maximum file size capped at 5 MB; automated antivirus / malware scanning integrated prior to storage [PROPOSED].

#### ABUSE-05: Shared Device Session Takeover in Field Facilities
- **Adversary Profile**: In field offices, multiple workers frequently share communal Android tablets or desktop terminals. Worker B accesses the device immediately after Worker A steps away without explicitly closing the browser [PROPOSED].
- **Threat Vector**: Browser history navigation, active session token reuse, or recovery of unsubmitted drafts in local browser storage [PROPOSED].
- **Exploitation Impact**: Cross-worker data pollution, unauthorized record inspection, and attribution repudiation [PROPOSED].
- **Mandatory Mitigation**:
  1. Explicit user logout MUST completely invalidate the server-side session and clear the `HttpOnly` session cookie [PROPOSED].
  2. Local drafts stored in IndexedDB must be partitioned by authenticated `user_id`; Worker B logging in cannot view or submit Worker A's drafts [PROPOSED].
  3. When Worker A triggers logout, the UI checks for unsubmitted drafts: if present, a prominent warning alerts the worker to synchronize pending drafts; the system MUST NOT silently wipe drafts, but must require explicit user confirmation before session termination [PROPOSED].
  4. Inactivity timeout: automatic session termination after 15 minutes of zero user interaction [PROPOSED].

#### ABUSE-06: Mass Beneficiary Data Exfiltration via Bulk Export Misuse
- **Adversary Profile**: A disgruntled supervisor or compromised administrative account attempts to download the entire state or national beneficiary registry for unauthorized commercial or illicit distribution [PROPOSED].
- **Threat Vector**: Repeated or automated pagination requests to export APIs (`/api/v1/reports/export`) [PROPOSED].
- **Exploitation Impact**: Mass catastrophic privacy violation impacting thousands of vulnerable PLHIV and KP individuals [PROPOSED].
- **Mandatory Mitigation**:
  1. Line-level exports are restricted exclusively to `supervisor` and `administrator` roles, strictly bounded by assigned facility or district geography [PROPOSED].
  2. Rate limiting: maximum 2 export requests per hour per user account [PROPOSED].
  3. Maximum export batch limit capped at 1,000 records per export; larger extracts require asynchronous administrative batch approval [PROPOSED].
  4. Every export action generates an immutable `audit_log` event capturing user ID, timestamp, target parameters, IP hash, and total row count [PROPOSED].

#### ABUSE-07: Accidental Secret Leakage in Source Control and Configuration Dumps
- **Adversary Profile**: Internal developer or automated CI job accidentally leaks production database credentials or JWT private signing keys into public or shared Git repositories [PROPOSED].
- **Threat Vector**: Unmasked environment variables in build logs, uncommitted `.env` files pushed to GitHub, or plain-text secrets in architectural markdown documents [PROPOSED].
- **Exploitation Impact**: Total system compromise, complete data breach, and loss of cryptographic authority [PROPOSED].
- **Mandatory Mitigation**:
  1. Mandatory pre-commit hooks configured across all developer workstations using `git-secrets` to block commits containing high-entropy strings or secret key patterns [PROPOSED].
  2. Continuous Integration (CI) pipeline executes automated secret scanning on every pull request using TruffleHog or Gitleaks [PROPOSED].
  3. Absolute prohibition of credentials or actual tokens in any technical specification, commit message, or configuration template [PROPOSED].

#### ABUSE-08: Prompt Injection and Model Manipulation
- **Clarification & Status**: `[OPEN — No AI, Large Language Model (LLM), or natural language processing component is currently in scope for CSC 2.0. Documented conditionally if future ADR introduces automated summary or transcription features.]` [OPEN].
- **Adversary Profile**: An attacker inputs crafted prompt-injection strings into free-text CRF fields (e.g., `f2_incident_notes`, `contact_notes`) designed to subvert backend LLM evaluation [PROPOSED].
- **Mandatory Mitigation (Conditional on Adoption)**:
  1. Free-text inputs MUST be strictly sanitized and demarcated within structured prompt templates using clear delimiters [PROPOSED].
  2. Model outputs must be treated as untrusted and never executed directly as administrative commands or database queries [PROPOSED].

### 2.4 Rejection of Client-Side Security Antipatterns

> [!CAUTION]
> **Explicit Rejection of `user-select: none` Antipattern**
> The CSS declaration `user-select: none` MUST NOT be used or claimed as a security control for data loss prevention [PROPOSED]. It offers zero technical protection against screenshots, browser developer tools DOM inspection, print commands, or network traffic capture, while severely impairing accessibility for users relying on screen readers or assistive copy tools [PROPOSED]. True confidentiality is maintained exclusively via server-side authorization, strict field-level redaction, and access controls [PROPOSED].

---

## §3 — Authentication Map

### 3.1 Network Hops and Authentication Architecture

The following matrix documents the authentication mechanisms, credential types, verification authorities, and controls enforced across every communication hop in the CSC 2.0 system [PROPOSED]:

| Hop Identifier | Source Component | Destination Component | Transport Protocol | Authentication Mechanism | Authority & Status | Required Cryptographic & Security Controls |
|---|---|---|---|---|---|---|
| **HOP-01** | Client Browser / Mobile Web | Next.js BFF (`port 3000`) | HTTPS (TLS 1.2+) | JWT via `HttpOnly` Cookie (Preferred) OR Bearer Token in `Authorization` Header | [OPEN per OD-004 — cookie preferred to prevent XSS exfiltration] | Cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`; Token signed with RS256/EdDSA; CSRF protection enabled if cookies used [PROPOSED] |
| **HOP-02** | Next.js BFF (`port 3000`) | Spring Boot API (`port 8080`) | Internal HTTPS (mTLS or Private Network) | Dual Authentication: Service Credential (shared secret or mTLS) PLUS Forwarded End-User JWT Claims (`sub`, `role`, `scope`) | [OPEN per OD-005 — shared secret vs mTLS] | **CRITICAL**: Spring Boot MUST independently re-validate JWT cryptographic signature; Spring Boot MUST NOT trust BFF assertion without valid cryptographic proof [PROPOSED] |
| **HOP-03** | Spring Boot API (`port 8080`) | PostgreSQL Database (`port 5432`) | Internal Encrypted SQL (TLS) | Dedicated PostgreSQL Role Credentials with Least Privilege | [PROPOSED] | Separate DB roles for application runtime vs schema migrations; application role has zero superuser or DDL privileges; connection pool isolated [PROPOSED] |
| **HOP-04** | Outbox Worker (inside Spring Boot) | Google Apps Script Adapter | HTTPS (TLS 1.2+) | Gateway Credential (Signed HMAC Token or Header Key) | [OPEN per OD-006 — Apps Script header stripping verification required] | Outbox Worker validates HTTP 200 and success response payload from Apps Script before marking outbox record as `sent`; retry with exponential backoff on failure [PROPOSED] |
| **HOP-05** | CI/CD Pipeline Runners | Deployment Infrastructure Hosts | SSH / Cloud API (TLS 1.2+) | Short-lived OIDC Identity Tokens (e.g., GitHub Actions OIDC) | [PROPOSED] | Zero long-lived SSH private keys or administrative passwords stored in CI repository secrets; ephemeral least-privilege credentials only [PROPOSED] |

### 3.2 Session Lifecycle and Token Management

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       SESSION & TOKEN LIFECYCLE                                        │
│                                                                                                        │
│   1. AUTHENTICATE                                                                                      │
│   User submits credentials ──► Spring Boot validates ──► Issues RS256 JWT (Short TTL: e.g. 15-30m)   │
│                                                                                                        │
│   2. ACTIVE SESSION                                                                                    │
│   Requests carry JWT in HttpOnly Cookie ──► Validated on every call against revocation registry        │
│                                                                                                        │
│   3. SILENT REFRESH                                                                                    │
│   Client initiates refresh 5m before expiry ──► Re-evaluates account state ──► Issues rotated JWT      │
│                                                                                                        │
│   4. REVOCATION / LOGOUT                                                                               │
│   Explicit Logout OR Admin Lock ──► JWT added to Revocation Table ──► HttpOnly Cookie Cleared          │
│   * If local drafts exist: Prompt user to sync before logout; DO NOT silently wipe drafts.             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Token Issuance**: Upon successful credential validation at `/api/auth/login`, the Spring Boot authentication authority generates a cryptographically signed JSON Web Token (JWT) [PROPOSED].
2. **JWT Payload Claims Specification**:
   - `sub`: Canonical UUID of the authenticated user [PROPOSED].
   - `role`: Exactly one canonical role code (`field_worker`, `supervisor`, `state_reviewer`, `administrator`, `leadership`) [PROPOSED].
   - `csc_code`: Primary CSC facility identifier (e.g., `CSC-DL-001`) [PROPOSED].
   - `district_code`: District administrative identifier [PROPOSED].
   - `state_code`: State administrative identifier [PROPOSED].
   - `iss`: Issuer identifier (`https://auth.csc2.allianceindia.org`) [PROPOSED].
   - `aud`: Audience identifier (`https://api.csc2.allianceindia.org`) [PROPOSED].
   - `iat`: Timestamp of issuance (epoch seconds) [PROPOSED].
   - `exp`: Timestamp of token expiration (epoch seconds) [PROPOSED].
   - `jti`: Unique token identifier (UUIDv4) for replay tracking and targeted revocation [PROPOSED].
3. **Token TTL & Silent Renewal**:
   - Access token lifespan: [OPEN — duration TBD; proposed 15–30 minutes] [PROPOSED].
   - Silent renewal: Next.js BFF triggers token refresh within 5 minutes of expiration if active user interaction is detected [PROPOSED].
4. **Revocation Mechanism**:
   - A distributed in-memory or database revocation cache stores revoked `jti` identifiers until their natural expiration timestamp [OPEN — mechanism TBD] [PROPOSED].
   - Immediate revocation is triggered upon: user logout, administrative account suspension, password change, or detected session anomaly [PROPOSED].
5. **Logout Workflow & Draft Preservation**:
   - When a user initiates logout, the client application inspects IndexedDB for unsubmitted local drafts [PROPOSED].
   - If unsent drafts are present, the interface displays an alert informing the user of pending data and offering an immediate synchronization attempt [PROPOSED].
   - The system MUST NOT silently wipe or destroy unsaved field drafts upon session logout, preventing catastrophic loss of offline field interviews [PROPOSED].
   - Upon confirmed termination, the `HttpOnly` session cookie is cleared with an expired date header, and the JWT `jti` is submitted to the revocation registry [PROPOSED].

---

## §4 — Authorization: Permission Matrix

### 4.1 Canonical Role Definitions

All authorization policies in CSC 2.0 reference the five canonical role codes defined in `SHARED_GLOSSARY.md` §3 [PROPOSED]:

- **`field_worker`**: Community outreach personnel responsible for registering clients, executing follow-up visits, recording contact attempts, and updating CRF sections within their explicitly assigned geographic catchment [SOURCE] / [PROPOSED].
- **`supervisor`**: Facility-level manager responsible for overseeing field workers, reassigning cases, auditing CRF declarations, validating mortality reports, and exporting operational datasets for an assigned CSC facility or block [PROPOSED].
- **`state_reviewer`**: Regional monitoring and evaluation officer holding read-only access to aggregated performance dashboards and de-identified district indicators. Strictly denied access to individual beneficiary PII or raw clinical forms [PROPOSED].
- **`administrator`**: Technical systems operator responsible for provisioning user accounts, maintaining reference dictionaries, monitoring outbox delivery queues, configuring system parameters, and inspecting audit logs. Denied routine access to clinical observations outside technical maintenance [PROPOSED].
- **`leadership`**: Strategic executive decision-maker requiring macro-level epidemiological and programme delivery dashboards. Strictly separated from administrator privileges; zero access to PII or raw operational records [PROPOSED].

### 4.2 Comprehensive RBAC Permission Matrix

The following matrix defines the authoritative permissions across all system capabilities for the five canonical roles [PROPOSED]:

*Legend: ✅ = Unrestricted Permission; 🔒 = Permission Strictly Constrained by Geographic Scope / Assignment; ❌ = Access Explicitly Denied (HTTP 403 or 404)*

| Domain Action / System Function | `field_worker` | `supervisor` | `state_reviewer` | `administrator` | `leadership` | Evidence Tag |
|---|---|---|---|---|---|---|
| **Register New Client (Sections A–E)** | 🔒 Assigned Area | 🔒 Assigned Facility | ❌ Denied | ❌ Denied | ❌ Denied | [SOURCE] / [PROPOSED] |
| **View Assigned Client Details & CRF** | 🔒 Assigned Clients Only | 🔒 Facility Scope | ❌ Denied (No PII) | 🔒 Admin Maintenance | ❌ Denied (No PII) | [PROPOSED] |
| **Edit Demographics & Contact Info** | 🔒 Assigned Clients Only | 🔒 Facility Scope | ❌ Denied | 🔒 Admin Maintenance | ❌ Denied | [PROPOSED] |
| **Record Contact Attempt** | 🔒 Assigned Clients Only | 🔒 Facility Scope | ❌ Denied | ❌ Denied | ❌ Denied | [PROPOSED] |
| **Record Follow-up Encounter (`i_updates`)** | 🔒 Assigned Clients Only | 🔒 Facility Scope | ❌ Denied | ❌ Denied | ❌ Denied | [SOURCE] / [PROPOSED] |
| **Record Document Declarations (`j_doc_*`)**| 🔒 Sighted in person | 🔒 Facility Scope | ❌ Denied | ❌ Denied | ❌ Denied | [SOURCE] / [PROPOSED] |
| **Record Mortality Data (Section H)** | 🔒 Assigned Clients Only | 🔒 Facility Scope | ❌ Denied | ❌ Denied | ❌ Denied | [SOURCE] / [PROPOSED] |
| **Reassign Client to Another Worker** | ❌ Denied | 🔒 Within Facility | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |
| **Soft-Delete Beneficiary Record** | ❌ Denied | 🔒 Facility Scope | ❌ Denied | ✅ Audit Required | ❌ Denied | [PROPOSED] |
| **Export Beneficiary Line-Level Data** | ❌ Denied | 🔒 Facility Scope (Logged) | ❌ Denied | ✅ Logged Audit | ❌ Denied | [PROPOSED] |
| **Export District Aggregates (No PII)** | ❌ Denied | 🔒 Facility Scope | ✅ State Scope | ✅ Full System | ✅ Full System | [PROPOSED] |
| **View Operational Field Worklist** | 🔒 Own Worklist Only | 🔒 Facility Overview | ❌ Denied | ❌ Denied | ❌ Denied | [PROPOSED] |
| **View Regional Analytical Dashboards** | ❌ Denied | 🔒 Facility Summary | ✅ State Aggregates | ✅ Full System | ✅ Executive View | [PROPOSED] |
| **Manage User Accounts & Roles** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |
| **Reset User Password / Credentials** | ❌ Self Only | 🔒 Field Workers | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |
| **Inspect System Audit Logs** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |
| **Inspect Outbox Queue & Retry Status** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |
| **Modify System Reference Dictionaries** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Full System | ❌ Denied | [PROPOSED] |

### 4.3 Mandatory Authorization Rules

1. **Deny-by-Default Policy**: Any endpoint invoked without a valid role claim, or by an unrecognized role code, MUST immediately result in `HTTP 403 Forbidden` [PROPOSED].
2. **Object-Level Geographic Isolation (ABAC)**: For all beneficiary-specific read or write endpoints (`/api/v1/clients/{id}/**`), the Spring Boot API enforces an attribute check comparing the client's registered CSC/district code against the actor's authorized geographic scopes [PROPOSED]. If the client belongs to a different geographic jurisdiction, the server MUST return `HTTP 404 Not Found` (NOT 403) to prevent client enumeration and geographic presence discovery [PROPOSED].
3. **Strict Separation of Leadership and Administrator Roles**: The `leadership` role is strictly an executive analytics role with zero write privileges and zero access to identifiable beneficiary records; the `administrator` role manages user accounts, system configuration, and technical queues, but has no routine medical or case management authority [PROPOSED].

### 4.4 Negative Authorization Test Scenarios

The following test cases define the mandatory security verification scenarios that must pass across the API boundary [PROPOSED]:

| Negative Test ID | Actor Role | Attempted Action & Targeted Endpoint | Expected HTTP Status | Expected Error Code & Response Body | Security Rationale |
|---|---|---|---|---|---|
| **NEG-AUTH-001** | `field_worker` (Assigned Block A) | Attempts to view client registered in Block B: `GET /api/v1/clients/{block_b_uuid}` | **404 Not Found** | `CLIENT_NOT_FOUND` | Prevents enumeration of out-of-scope clients across geographic boundaries [PROPOSED] |
| **NEG-AUTH-002** | `state_reviewer` | Attempts to access line-level client list: `GET /api/v1/clients` | **403 Forbidden** | `ACCESS_DENIED` | Enforces structural block on state reviewers accessing individual PII [PROPOSED] |
| **NEG-AUTH-003** | `leadership` | Attempts to fetch beneficiary detail: `GET /api/v1/clients/{uuid}` | **403 Forbidden** | `ACCESS_DENIED` | Prevents executive leadership accounts from accessing clinical records [PROPOSED] |
| **NEG-AUTH-004** | Unauthenticated | Invokes any secured endpoint: `GET /api/v1/worklist` without token | **401 Unauthorized** | `AUTHENTICATION_REQUIRED` | Blocks unauthenticated ingress at perimeter [PROPOSED] |
| **NEG-AUTH-005** | `field_worker` | Attempts to delete a beneficiary record: `DELETE /api/v1/clients/{uuid}` | **403 Forbidden** | `INSUFFICIENT_PERMISSIONS` | Hard and soft deletion prohibited for field workers [PROPOSED] |
| **NEG-AUTH-006** | `supervisor` | Attempts to create an administrator user: `POST /api/v1/admin/users` | **403 Forbidden** | `INSUFFICIENT_PERMISSIONS` | Prevents horizontal privilege escalation to system administrator [PROPOSED] |
| **NEG-AUTH-007** | `field_worker` | Attempts to execute bulk data export: `GET /api/v1/reports/export` | **403 Forbidden** | `INSUFFICIENT_PERMISSIONS` | Blocks mass data extraction by frontline staff [PROPOSED] |
| **NEG-AUTH-008** | `supervisor` | Attempts to export data outside assigned CSC facility | **404 Not Found** or **403 Forbidden** | `GEOGRAPHIC_SCOPE_VIOLATION` | Restricts supervisor exports strictly to local facility boundaries [PROPOSED] |
| **NEG-AUTH-009** | Malicious Actor | Replays expired JWT: `GET /api/v1/clients/{id}` with `exp` in the past | **401 Unauthorized** | `TOKEN_EXPIRED` | Validates strict signature and expiry enforcement on every hop [PROPOSED] |
| **NEG-AUTH-010** | Malicious Actor | Submits forged JWT with altered `role: administrator` and invalid signature | **401 Unauthorized** | `INVALID_SIGNATURE` | Validates independent cryptographic verification by Spring Boot [PROPOSED] |

---

## §5 — Secrets Inventory

> [!IMPORTANT]
> **No Real Secrets Policy**
> This section catalogs secret identifiers, functional purposes, storage mechanisms, rotation policies, and compromise response procedures only. No actual passwords, private cryptographic keys, API tokens, or production values appear in this document or in any specification file [PROPOSED].

### 5.1 Secrets Catalog

| Secret Name | Functional Purpose | Development Storage | Production Storage | Rotation Schedule | Compromise & Exposure Response Protocol |
|---|---|---|---|---|---|
| `DB_PASSWORD` | Authenticates Spring Boot connection pool to primary PostgreSQL database | Local `.env` (gitignored); Docker secret [PROPOSED] | AWS Secrets Manager / HashiCorp Vault; injected into container env [PROPOSED] | Quarterly (90 days) or immediately upon compromise [PROPOSED] | 1. Rotate password in secret manager.<br>2. Update RDS/PostgreSQL user password.<br>3. Trigger rolling restart of Spring Boot containers.<br>4. Invalidate all active connections [PROPOSED]. |
| `JWT_SIGNING_KEY` | Signs and verifies RS256/EdDSA JWT authorization tokens issued to clients | Local RSA private key file (gitignored) [PROPOSED] | Hardware Security Module (HSM) or Secret Manager [PROPOSED] | Semi-annually (180 days) or on suspected breach [PROPOSED] | 1. Generate new cryptographic key pair immediately.<br>2. Deploy public key to Spring Boot verification chain.<br>3. Invalidate all active sessions globally.<br>4. Force re-authentication across all active users [PROPOSED]. |
| `BFF_SERVICE_CREDENTIAL` | Authenticates Next.js BFF server requests to Spring Boot API authority | Environment variable in local runtime [OPEN per OD-005] | Injected via Secret Manager or mutual TLS (mTLS) certificate [OPEN] | On compromise or semi-annually [PROPOSED] | 1. Generate new shared secret or rotate client mTLS certificate.<br>2. Synchronously redeploy Next.js BFF and Spring Boot API.<br>3. Verify bridge health [PROPOSED]. |
| `APPS_SCRIPT_GATEWAY_CREDENTIAL` | Authenticates Outbox Worker background requests to Google Apps Script Adapter | Local environment variable [OPEN per OD-006] | Encrypted environment variable or Secret Manager [OPEN] | Annually or upon credential exposure [PROPOSED] | 1. Update gateway secret inside Google Apps Script Script Properties.<br>2. Update secret in Outbox Worker environment.<br>3. Dispatch test outbox payload to verify sync [PROPOSED]. |
| `SESSION_COOKIE_SECRET` | Encrypts and cryptographically signs client-side session cookies in Next.js | Local `.env` (gitignored) [PROPOSED] | Managed container secret [PROPOSED] | Semi-annually [PROPOSED] | 1. Rotate secret key in Next.js deployment.<br>2. All active browser sessions terminated immediately; users re-login [PROPOSED]. |

### 5.2 Mandatory Rules for Secret Governance

All software engineers, DevOps practitioners, and system administrators must strictly enforce the following six rules for secrets governance [PROPOSED]:

1. **Absolute Prohibition in Version Control**: No secret, password, private key, or credential may ever be committed to source code repositories, `.env` files committed to Git, pull requests, issue trackers, or documentation files [PROPOSED].
2. **Runtime Environment Injection**: All runtime credentials must be loaded dynamically from environment variables or fetched directly from a managed secret repository (AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault) upon service initialization [PROPOSED].
3. **Zero Secret Logging**: Application logging frameworks MUST be configured to mask or drop any variable matching known secret naming patterns (`*PASSWORD*`, `*KEY*`, `*SECRET*`, `*TOKEN*`). Secrets must never appear in application logs, debugging output, or heap dumps [PROPOSED].
4. **Pre-Production Staging Rotation Testing**: All credential rotation and revocation procedures must be executed and validated in a staging environment prior to execution in production [PROPOSED].
5. **Documented Exposure Response Protocol**: Any accidental exposure of a credential triggers an immediate severity-1 security incident: the compromised key is rotated immediately, dependent active user sessions are invalidated, and an incident postmortem is conducted [PROPOSED].
6. **Automated Pipeline Scanning**: Continuous integration pipelines must execute automated high-entropy scanning tools (`git-secrets`, TruffleHog) on every commit and branch push. Any detected secret pattern immediately halts the build pipeline [PROPOSED].

---

## §6 — Privacy & Data Protection

> [!NOTE]
> **Regulatory Notice**
> This section defines architectural privacy controls, data minimization workflows, and proposal baselines. It does NOT constitute formal legal advice or assert absolute compliance with the Digital Personal Data Protection Act (DPDPA) or international regulations. All data retention durations, consent withdrawal workflows, and deletion procedures marked `[OPEN]` require authoritative legal counsel and programme leadership review before production deployment [PROPOSED].

### 6.1 Consent Architecture & Capture

1. **Home Visit Consent (`a08_consent`)**:
   - The Case Record Form captures a single explicit boolean declaration (`a08_consent`: yes/no) at initial client registration indicating whether the beneficiary consents to home visits by CSC field personnel [SOURCE].
   - **Immutability Baseline**: The consent declaration is recorded as part of the immutable baseline registration submission [OPEN per OD-001 / OD-006].
   - **Consent Rescission Proposal**: If a beneficiary subsequently requests to rescind home visit consent, the proposed operational workflow requires a `supervisor` to record a formal consent update encounter, updating the active status to `withdrawn` while preserving historical records in `consents` table [OPEN per OD-006].
2. **Messaging & Digital Outreach Consent**:
   - The current source XLSForm contains NO field capturing explicit consent for cellular SMS, WhatsApp, or telephonic outreach [SOURCE].
   - If digital automated reminders are introduced in future releases, a formal consent flag (`messaging_consent`) and an accompanying ADR must be approved prior to activating telephonic features [OPEN].

### 6.2 Data Retention Proposals

The following lifecycle retention durations are proposed for stakeholder and legal determination [OPEN per OD-008]:

| Data Entity / Category | Proposed Retention Duration | Handling Upon Expiry | Governance Status |
|---|---|---|---|
| **Active Beneficiary Records** | Maintained for the active duration of beneficiary engagement plus [3–5 years] following last recorded contact [OPEN] | Archived to cold encrypted storage; soft-delete flag set [PROPOSED] | [OPEN per OD-008 — requires legal and donor review] |
| **Deceased Beneficiary Records (Section H)** | Retained for [5 years] post-reporting to satisfy public health surveillance and audit compliance [OPEN] | Anonymised or transferred to permanent public health archive [PROPOSED] | [OPEN — requires programme review] |
| **System Audit Logs (`audit_log`)** | Retained indefinitely (minimum 7 years) as an immutable security trail [PROPOSED] | Permanent cold archival in append-only WORM (Write Once, Read Many) storage [PROPOSED] | [PROPOSED] |
| **Temporary Export Artifacts** | Retained for a maximum of 24 hours on temporary storage volumes [PROPOSED] | Automatically purged via scheduled cron job [PROPOSED] | [PROPOSED] |
| **Outbox Processed Records** | Retained in `sent` status for 30 days in PostgreSQL [PROPOSED] | Truncated / archived via automated maintenance worker [PROPOSED] | [PROPOSED] |

### 6.3 Deletion Governance: Prohibition of Hard Deletes

1. **Prohibition of Hard Deletion**: Physical hard deletes (`DELETE FROM clients WHERE id = ...`) of beneficiary entities, encounters, clinical measurements, or family members are STRICTLY PROHIBITED in the application runtime [PROPOSED].
2. **Soft-Delete Architecture**:
   - All domain tables incorporate a `deleted_at TIMESTAMPTZ` column, defaulting to `NULL` [PROPOSED].
   - When a deletion is approved and executed by an authorized supervisor or administrator, the API executes:
     ```sql
     UPDATE clients 
     SET deleted_at = CURRENT_TIMESTAMP, 
         version = version + 1 
     WHERE id = :client_id AND deleted_at IS NULL;
     ```
   - All standard operational queries, worklist aggregations, and export routines enforce: `WHERE deleted_at IS NULL` [PROPOSED].
3. **Right to Erasure / DPDPA Compliance**:
   - If legal counsel determines that statutory "Right to Erasure" applies to specific beneficiary scenarios, an administrative scrubbing routine must be developed [OPEN].
   - The proposed erasure workflow cryptographically scrubs Tier 2 PII (overwriting names and phone numbers with randomized hashes) while maintaining de-identified Tier 1 clinical indicators for aggregate epidemiological reporting [OPEN].

### 6.4 Auditable Data Exports

1. **Mandatory Audit Logging on Export**: Any invocation of export endpoints (`/api/v1/reports/export/**`) triggers a synchronous insert into `audit_log` before generating or streaming the payload [PROPOSED].
2. **Audit Metadata Captured**: The log event records the actor's UUID, role, IP hash, exact timestamp, requested filter criteria, format (CSV/XLSX), and total record count delivered [PROPOSED].
3. **Strict Geographic Bounding**: Export queries MUST enforce the actor's geographic scope filter. A supervisor at CSC facility Alpha cannot export records belonging to facility Beta [PROPOSED].

---

## §7 — Apps Script Security

> [!WARNING]
> **Open Decision OD-006: Platform Limitation Verification**
> Google Apps Script web applications deployed with `doPost(e)` triggers have documented platform limitations regarding external HTTP header handling. Specifically, Google's execution environment may strip or fail to expose custom `Authorization: Bearer <token>` headers passed by external callers [OPEN — VERIFY]. This behavior must be validated against the target Google Workspace environment prior to Slice 4 implementation [OPEN].

### 7.1 Architecture and Trust Isolation

The Google Apps Script adapter functions strictly as an outbound egress mirror [PROPOSED]. It has zero authority over platform data and zero inbound access to core databases [PROPOSED]:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               APPS SCRIPT EGRESS SECURITY MODEL                                   │
│                                                                                                   │
│   AUTHORITATIVE ZONE                            EXTERNAL EGRESS ZONE (LOWER TRUST)                │
│   ┌───────────────────────────────┐             ┌──────────────────────────────────────────────┐  │
│   │ Spring Boot Outbox Worker     │             │ Google Apps Script Web App (doPost)          │  │
│   │ • Scheduled poller            │             │ • Receives single-event or batch payload     │  │
│   │ • Reads pending outbox rows   │  POST (TLS) │ • Verifies gateway credential                │  │
│   │ • Attaches gateway credential ├────────────►│ • Writes row to Google Sheets                │  │
│   │ • Handles backoff & retry     │             │ • Returns JSON confirmation { status: "ok" } │  │
│   └───────────────▲───────────────┘             └──────────────────────┬───────────────────────┘  │
│                   │                                                    │ Internal Sheets API      │
│                   │ Read / Mark Sent                                   ▼                          │
│   ┌───────────────┴───────────────┐             ┌──────────────────────────────────────────────┐  │
│   │ PostgreSQL Database           │             │ Google Sheets Target Workbook                │  │
│   │ • outbox table                │             │ (Read-Only Mirror — NOT Authority)           │  │
│   │ • ZERO ACCESS FROM APPS SCRIPT│             │                                              │  │
│   └───────────────────────────────┘             └──────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Verification Protocol & Fallback Credentials

1. **Technical Spike Requirement (OD-006)**:
   - Prior to finalizing the Outbox Worker delivery adapter, execute a verification script dispatching an HTTPS POST with custom `Authorization` headers to a sample Apps Script web app [OPEN — VERIFY].
   - If the script demonstrates that custom headers are dropped by the Google proxy infrastructure, the fallback authentication pattern MUST be adopted [PROPOSED].
2. **Fallback Authentication Pattern**:
   - The gateway credential must be passed within the POST request JSON body as a signed HMAC token, or as an encrypted query parameter:
     ```json
     {
       "gateway_token": "hmac_sha256_signature_string",
       "timestamp": 1798886400,
       "aggregate_type": "client",
       "aggregate_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
       "event_type": "CLIENT_CREATED",
       "payload": { ... }
     }
     ```
3. **Deployment Access Configuration**:
   - The Google Apps Script project MUST be configured as:
     - **Execute as**: `Me (script owner)` [PROPOSED].
     - **Who has access**: Restricted to a dedicated Google Service Account if enterprise domain features permit, or managed API key validation within the script [OPEN].
4. **Credential Storage in Apps Script**:
   - Gateway secrets MUST NOT be hardcoded in Apps Script `.gs` source files [PROPOSED].
   - All secrets must be stored within **Script Properties** (`PropertiesService.getScriptProperties().getProperty("GATEWAY_SECRET")`) [PROPOSED].
5. **Strict Network & Database Isolation**:
   - Apps Script has NO direct network pathway, credentials, or connection pooling to the PostgreSQL database [PROPOSED].
   - It cannot initiate reads or writes against the primary store; communication is exclusively one-way outbound from Spring Boot to Apps Script [PROPOSED].

---

## §8 — Logging, Monitoring, and Audit

### 8.1 Log Redaction and Data Minimization Rules

To prevent accidental data exposure across log aggregators (ELK, CloudWatch, Datadog), strict redaction rules are enforced in the logging configuration [PROPOSED]:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOGGING REDACTION POLICY                        │
├────────────────────────────────────────────────────────────────────────┤
│  STRICTLY PROHIBITED IN ALL LOGS (INFO / WARN / ERROR):                │
│  ❌ Beneficiary Full Name (a04_name)                                   │
│  ❌ Phone Numbers (a12_phone, b2_phone)                                │
│  ❌ National Identification Numbers (a14_uid, a15_abha)                │
│  ❌ Detailed Residential Address (a05_address)                         │
│  ❌ HIV Confirmation & Clinical Diagnostics (c1_hiv_confirmed)         │
│  ❌ CD4 Counts (c12b_cd4_count) & Viral Load (c13b_vl_count)           │
│  ❌ Key Population Affiliation (b1_kp)                                 │
│  ❌ Substance Use & Harm Reduction History (e1_sexwork, e2_ost, e9a-e) │
├────────────────────────────────────────────────────────────────────────┤
│  PERMITTED FOR OPERATIONAL & DIAGNOSTIC LOGGING:                       │
│  ✅ Client UUID (e.g. 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d)            │
│  ✅ Authenticated Actor UUID (actor_id)                                │
│  ✅ Actor Canonical Role (e.g. field_worker, supervisor)               │
│  ✅ Action Category (CREATE, UPDATE, DELETE, LOGIN, EXPORT)             │
│  ✅ Target Entity Type (clients, encounters, tasks)                    │
│  ✅ Target Entity UUID (entity_id)                                     │
│  ✅ HTTP Method, Path, Response Status Code, Latency (ms)              │
│  ✅ Correlation ID (X-Correlation-Id UUID)                             │
│  ✅ SHA-256 Hash of Requester IP Address                               │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Log Level Management**: `DEBUG` and `TRACE` log levels MUST be disabled in production deployments to prevent intermediate framework logging of raw HTTP request bodies [PROPOSED].
2. **Logback Automated Masking**: The Spring Boot application must incorporate a custom Logback masking converter that replaces telephone patterns and ABHA numbers with `[REDACTED]` prior to console or file output [PROPOSED].
3. **CI Validation Gate**: Automated unit tests in the CI pipeline will verify that attempting to log client entities redacts sensitive fields before emission [PROPOSED].

### 8.2 Audit Event Schema (`audit_log` Table)

Every create, update, soft-delete, login, and export operation is captured synchronously in the `audit_log` PostgreSQL table [PROPOSED]:

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address_hash VARCHAR(64) NOT NULL,
    correlation_id UUID NOT NULL
);

-- Indexing for performance and security investigations
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_id);
CREATE INDEX idx_audit_log_recorded_at ON audit_log (recorded_at);
```

#### Detailed Column Specification

| Column Name | Data Type | Nullable | Description & Security Purpose | Evidence Tag |
|---|---|---|---|---|
| `id` | `UUID` | No | Unique surrogate primary key for the audit record [PROPOSED] | [PROPOSED] |
| `actor_id` | `UUID` | No | Foreign identifier representing the authenticated user who initiated the request [PROPOSED] | [PROPOSED] |
| `actor_role` | `VARCHAR(50)` | No | Canonical role code (`field_worker`, `supervisor`, etc.) held by actor at execution time [PROPOSED] | [PROPOSED] |
| `action` | `VARCHAR(30)` | No | Operation type: `CREATE`, `UPDATE`, `SOFT_DELETE`, `LOGIN`, `LOGOUT`, `EXPORT`, `REASSIGN` [PROPOSED] | [PROPOSED] |
| `entity_type` | `VARCHAR(50)` | No | Name of affected domain entity table (e.g., `clients`, `encounters`, `planned_services`) [PROPOSED] | [PROPOSED] |
| `entity_id` | `UUID` | No | Primary key UUID of the specific domain record affected [PROPOSED] | [PROPOSED] |
| `old_value` | `JSONB` | Yes | State before the mutation (NULL for `CREATE` actions; redacted of raw Tier 1 secrets) [PROPOSED] | [PROPOSED] |
| `new_value` | `JSONB` | Yes | State after the mutation (NULL for soft-deletions; captures modified attributes) [PROPOSED] | [PROPOSED] |
| `recorded_at` | `TIMESTAMPTZ` | No | Authoritative server acceptance timestamp when write was committed (NOT client date) [PROPOSED] | [PROPOSED] |
| `ip_address_hash` | `VARCHAR(64)` | No | SHA-256 hash of the client's public IP address (enables forensic tracking without logging raw IP) [PROPOSED] | [PROPOSED] |
| `correlation_id` | `UUID` | No | Unique request correlation identifier correlating with frontend logs and APM traces [PROPOSED] | [PROPOSED] |

### 8.3 Immutability and Transaction Guarantees

1. **Atomic Transaction Coupling**:
   - The domain update, the `audit_log` insert, and the `outbox` queue entry MUST execute within the exact same database transaction:
     ```
     BEGIN TRANSACTION;
       1. Mutate domain entity (clients / encounters)
       2. Insert into audit_log
       3. Insert into outbox
     COMMIT;
     ```
   - If any step fails, the entire transaction rolls back, guaranteeing zero untracked domain mutations and zero orphaned audit entries [PROPOSED].
2. **Database Role Privileges (Least Privilege)**:
   - The PostgreSQL user role utilized by the Spring Boot application is granted:
     ```sql
     GRANT SELECT, INSERT ON TABLE audit_log TO csc_app_user;
     REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_log FROM csc_app_user;
     ```
   - This cryptographic and structural enforcement guarantees that even if the web application layer is compromised, historical audit records cannot be purged or altered by the attacker [PROPOSED].

---

## §9 — Security Test Plan and Release Gates

### 9.1 Security Test Plan

The following test plan defines the mandatory security test scenarios that must be executed and evidenced prior to production deployment [PROPOSED]:

| Test Identifier | Category | Test Scenario & Verification Steps | Evidence Label | Release Gate Status | Evidence Tag |
|---|---|---|---|---|---|
| **SEC-TEST-001** | AuthN | Submit valid username and password to `/api/auth/login` → Expect HTTP 200, valid JWT token issued with correct claims | REAL DATABASE | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-002** | AuthN | Submit incorrect password to `/api/auth/login` 5 consecutive times → Expect HTTP 401 on attempts 1–5, HTTP 429 / lockout on attempt 6 | REAL DATABASE | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-003** | AuthN | Submit API request to `/api/v1/clients` with expired JWT (`exp` in the past) → Expect HTTP 401 Unauthorized with `TOKEN_EXPIRED` | UNIT | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-004** | AuthZ / BOLA | Authenticated `field_worker` in Block A attempts to access client belonging to Block B: `GET /api/v1/clients/{block_b_id}` → Expect HTTP 404 Not Found | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-005** | AuthZ / Scope | Authenticated `state_reviewer` attempts to invoke client detail: `GET /api/v1/clients/{id}` → Expect HTTP 403 Forbidden with `ACCESS_DENIED` | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-006** | AuthZ / Scope | Authenticated `leadership` attempts to fetch client list: `GET /api/v1/clients` → Expect HTTP 403 Forbidden | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-007** | AuthN / Boundary| Dispatch unauthenticated request to `/api/v1/clients` without cookie or Bearer token → Expect HTTP 401 Unauthorized | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-008** | Audit Trail | Execute client registration POST → Query `audit_log` table within same test transaction → Verify audit row exists with matching `actor_id`, `new_value`, and `correlation_id` | REAL DATABASE | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-009** | Audit Immutability | Using application DB role `csc_app_user`, execute: `UPDATE audit_log SET action = 'ALTERED'` or `DELETE FROM audit_log` → Expect PostgreSQL error: `permission denied for table audit_log` | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-010** | Data Privacy | Execute full registration flow while monitoring INFO-level log output stream → Assert that beneficiary phone, name, and ABHA ID are ABSENT from logs | UNIT + STAGING | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-011** | Idempotency | Dispatch duplicate POST request with identical `Idempotency-Key` header → Assert identical response returned, exactly one domain row created, and exactly one audit log row created | REAL DATABASE + CONCURRENCY | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-012** | Session Term | User invokes `/api/auth/logout` → Verify `HttpOnly` cookie cleared → Submit subsequent request using captured cookie → Expect HTTP 401 Unauthorized | REAL DATABASE | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-013** | Secrets Hygiene | Commit simulated secret token pattern to test branch → Run CI pipeline → Assert `git-secrets` scan halts the pipeline with non-zero exit code | STAGING | **Mandatory Release Gate** | [PROPOSED] |
| **SEC-TEST-014** | ABAC Routing | Inquire client via search API with out-of-catchment district filter → Assert 0 rows returned, and raw direct UUID query returns HTTP 404 | REAL DATABASE + SECURITY | **Mandatory Release Gate** | [PROPOSED] |

### 9.2 Production Release Gates

A software release of CSC 2.0 MUST NOT be deployed to production environments unless all of the following four conditions are fully satisfied [PROPOSED]:

1. **100% Pass Rate on Security Test Plan**: All fourteen test cases (`SEC-TEST-001` through `SEC-TEST-014`) pass cleanly in the staging environment with automated test reports archived [PROPOSED].
2. **Automated Dependency Vulnerability Clearance**: Static analysis and software composition analysis (OWASP Dependency-Check or Snyk) reports ZERO unresolved `CRITICAL` or `HIGH` vulnerabilities in project dependencies [PROPOSED].
3. **Zero Static Code Analysis Security Findings**: SonarQube / Semgrep analysis reports zero unmitigated OWASP Top 10 security findings (SQL injection, broken access control, hardcoded secrets) [PROPOSED].
4. **Formal Security Sign-off**: Written sign-off executed by the Technical Architect, Lead Security Reviewer, and Programme Data Officer [OPEN — approvers TBD].

---

## §10 — Open Decisions (OD) Registry

The following table catalogs all open architectural, security, and policy decisions governing the CSC 2.0 security baseline [OPEN]:

| Decision ID | Document Section | Cross-Ref ID | Description of Open Decision | Options Under Evaluation | Blocking Status & Target |
|---|---|---|---|---|---|
| **OPEN-001** | §3.1 | OD-004 | Session Mechanism: Browser to Next.js BFF | (A) HttpOnly, Secure, SameSite=Strict Cookie (Preferred);<br>(B) Bearer Token in Authorization header | **Yes** — Blocks TCK-005 (Auth Slice 0) [OPEN] |
| **OPEN-002** | §3.1 | OD-005 | BFF to Spring Boot Bridge Authentication | (A) Mutual TLS (mTLS) with client certificates;<br>(B) Pre-shared service secret + signed forwarded JWT | **Yes** — Blocks TCK-005 (Auth Slice 0) [OPEN] |
| **OPEN-003** | §3.2 | — | JWT Access Token Time-To-Live (TTL) | (A) 15 minutes;<br>(B) 30 minutes;<br>(C) 60 minutes with silent sliding refresh | **Yes** — Blocks TCK-005 (Auth Slice 0) [OPEN] |
| **OPEN-004** | §3.2 | — | Server-Side JWT Revocation Registry Architecture | (A) Redis in-memory token blacklist;<br>(B) PostgreSQL `revoked_tokens` table with automated TTL purging | **Yes** — Blocks TCK-005 (Auth Slice 0) [OPEN] |
| **OPEN-005** | §5.1 | OD-005 | Storage Mechanism for `BFF_SERVICE_CREDENTIAL` | (A) AWS Secrets Manager / Azure Key Vault;<br>(B) Kubernetes / Docker Secret injected into environment | **Yes** — Blocks TCK-005 (Auth Slice 0) [OPEN] |
| **OPEN-006** | §7.2 | OD-006 | Verification of Apps Script `doPost` Header Behavior | Technical spike required to verify if Apps Script strips custom `Authorization` headers; adopt body HMAC fallback if stripped | **Yes** — Blocks TCK-050 (Sheets Slice 4) [OPEN] |
| **OPEN-007** | §7.2 | — | Google Apps Script Deployment Access Model | (A) Execute as Me, Anyone access with internal HMAC verification;<br>(B) Dedicated Google Workspace Service Account | **Yes** — Blocks TCK-050 (Sheets Slice 4) [OPEN] |
| **OPEN-008** | §6.1 | OD-001 | Immutability and Rescission of `a08_consent` | (A) Strictly immutable after first submission;<br>(B) Supervisor can record formal consent rescission date and reason | **Yes** — Blocks TCK-012 (Client Reg) [OPEN] |
| **OPEN-009** | §6.2 | OD-008 | Beneficiary Data Retention & Archival Periods | Determine statutory retention durations for active, inactive, and deceased client records with legal counsel | **No** — Required before production go-live [OPEN] |
| **OPEN-010** | §6.3 | — | Formal Right to Erasure / DPDPA Implementation | Determine if full cryptographic data scrubbing is required for withdrawn beneficiaries under Indian data privacy law | **No** — Requires formal legal opinion [OPEN] |
| **OPEN-011** | §9.2 | — | Designated Security Sign-off Authorities | Formal nomination of individual security lead and technical approvers for release sign-off | **Yes** — Blocks production deployment [OPEN] |
| **OPEN-012** | §9.2 | — | Standard Tool Selection for Dependency Scanning | (A) OWASP Dependency-Check (Open Source);<br>(B) Snyk CLI;<br>(C) GitHub Dependabot / Trivy | **No** — Resolved in build configuration [OPEN] |
| **OPEN-013** | §2.3 | OD-009 | Multi-Factor / OTP Authentication Adoption (ABUSE-03) | Decision on whether field worker mobile login requires cellular SMS OTP or hardware-bound 2FA | **No** — Conditional on OD-AUTH-01 [OPEN] |
| **OPEN-014** | §2.3 | — | Future AI / LLM Feature Integration (ABUSE-08) | Confirmation of zero AI models in MVP; establishes guidelines if future ADR introduces automated summaries | **No** — Conditional on future ADR [OPEN] |
| **OPEN-015** | §3.1 | OD-006 | Apps Script Gateway Credential Mechanism | Finalize format of credential passed to Apps Script (Query param vs Body token) following spike | **Yes** — Blocks TCK-050 (Sheets Slice 4) [OPEN] |

---

## §11 — Document Self-Check & Verification

The following self-check confirms compliance with all mandatory documentation, tagging, and architectural constraints established for DOC-03 [PROPOSED]:

| Verification Criterion | Target Standard | Assessment Result & Notes | Evidence Tag |
|---|---|---|---|
| **Statement Tagging Completeness** | Every statement tagged `[SOURCE]`, `[PROPOSED]`, `[ASSUMPTION]`, `[OPEN]`, or `[UNVERIFIED]` | **COMPLIANT** — All technical claims, architectural choices, and field references carry explicit evidence tags [PROPOSED]. | [PROPOSED] |
| **No Invented Clinical Rules** | Zero invented thresholds, laboratory normal ranges, or clinical formulas | **COMPLIANT** — All numeric ranges for CD4, VL, height, weight, and age cite XLSForm constraints; no clinical interpretation invented [PROPOSED]. | [SOURCE] / [PROPOSED] |
| **Declarations vs Uploads** | Document declarations treated as boolean assertions, NOT file uploads | **COMPLIANT** — Explicitly clarified that `j_doc_hiv`, `j_doc_addr`, and `j_doc_art` are yes/no declarations; file uploads excluded from MVP [PROPOSED]. | [SOURCE] / [PROPOSED] |
| **Privacy & Legal Claims** | Zero unverified legal compliance claims; proposals framed for review | **COMPLIANT** — Section 6 explicitly disclaims formal legal advice; retention and erasure rules marked [OPEN] for legal review [PROPOSED]. | [PROPOSED] |
| **Zero Secrets & Real Data** | Zero passwords, actual tokens, or live beneficiary PII in document | **COMPLIANT** — Secrets cataloged by identifier and purpose only; no tokens or real beneficiary records present [PROPOSED]. | [PROPOSED] |
| **Architecture Proportionality** | No unmeasured microservices, Kafka, or Kubernetes architectures | **COMPLIANT** — Architecture constrained strictly to Next.js BFF, Spring Boot monolith, PostgreSQL, and outbox worker [PROPOSED]. | [PROPOSED] |
| **ABUSE-03 Conditional Scoping** | OTP replay abuse case framed as conditional on OTP adoption | **COMPLIANT** — Explicitly marked conditional on OD-009 / OD-AUTH-01; not asserted as active MVP scope [PROPOSED]. | [PROPOSED] |
| **Screenshot Antipattern Rejection** | Explicit rejection of `user-select: none` CSS antipattern | **COMPLIANT** — Section 2.4 explicitly documents why `user-select: none` is rejected as an invalid security control [PROPOSED]. | [PROPOSED] |
| **Document Metadata & ID** | Document ID = `DOC-03`, Title = `03 — Security and Access Document` | **COMPLIANT** — Standardized metadata block referencing `SHARED_GLOSSARY.md` included [PROPOSED]. | [PROPOSED] |
| **Apps Script Header Limitations** | Apps Script header stripping documented as `[OPEN — VERIFY]` | **COMPLIANT** — Documented under §7 and §10 with spike protocol and fallback authentication pattern [PROPOSED]. | [PROPOSED] |
| **Open Decisions Registry** | All 15 Open Decisions cataloged with blocking status and cross-refs | **COMPLIANT** — OPEN-001 through OPEN-015 exhaustively recorded in §10 table [PROPOSED]. | [PROPOSED] |

---

*End of DOC-03 — Security and Access Document (v0.1.1 DRAFT)*
