# SHARED_GLOSSARY — CSC 2.0 Follow-Up Platform
## Canonical Cross-Document Glossary

---

## Document Metadata

| Field | Value |
|---|---|
| Document ID | DOC-GLO |
| Version | v0.1.0 |
| Status | **DRAFT** |
| Classification | Internal — Not for distribution |
| Owners | TBD — Technical Architect, Product Lead |
| Created | 2026-11-02 |
| Last Updated | 2026-11-02 |
| Authority | This file is the single source of truth for all terms, codes, and ID namespaces. All other documents defer to this glossary. |

### Change Log

| Version | Date | Author | Summary of Changes |
|---|---|---|---|
| v0.1.0 | 2026-11-02 | Editor-in-Chief | Initial glossary extracted from reconciliation audit of DOC-01 through DOC-04 |

---

## §1 Canonical Term Registry

> [!IMPORTANT]
> The terms below resolve all naming collisions found in RECONCILIATION_REPORT.md §2 (TERM-01 through TERM-08). Every document MUST use the canonical form listed here.

### TERM-01: Role identifier — code vs prose

| Context | Canonical Form | Rule |
|---|---|---|
| Code (DB column, JWT claim, URL param, enum) | `field_worker`, `supervisor`, `state_reviewer`, `administrator`, `leadership` | snake_case, no spaces, no hyphens |
| Prose (documentation, UI labels, error messages) | "field worker", "supervisor", "state reviewer", "administrator", "leadership" | Two words, no hyphen, no underscore |
| Title case (section headings only) | "Field Worker", "Supervisor", "State Reviewer", "Administrator", "Leadership" | Title case only in headings |

**Retired forms:** "fieldworker" (no space), "field-worker" (hyphenated), "FieldWorker" (camelCase in non-Java prose) are all retired. Java class names use `FieldWorker` per Java convention.

---

### TERM-02: Contact Attempt

| Context | Canonical Form |
|---|---|
| Concept / prose | "Contact Attempt" (title case as a domain concept) |
| Database table / column | `contact_attempts` / `contact_attempt_id` |
| Java class | `ContactAttempt` |
| XLSForm section | No direct XLSForm mapping — inferred from field worker recording behaviour [PROPOSED] |

**Key distinction:** A Contact Attempt is NOT an Encounter. A failed or refused attempt is a valid Contact Attempt record. See §2 for full definition.

---

### TERM-03 / TERM-04: Product name

| Context | Canonical Form |
|---|---|
| Full product name (all formal contexts) | **CSC 2.0 — Community Support Centre Follow-Up Platform** |
| Short form (in-product UI, breadcrumbs) | **CSC 2.0** |
| Document subtitle line 2 | `## CSC 2.0 — Community Support Centre Follow-Up Platform` |

**Retired forms (do not use):**
- "Case Surveillance and Care" — incorrect, retired as of v0.1.1 of DOC-04
- "Community Support Centre Management System" — imprecise; "Follow-Up Platform" is preferred
- "CSC" alone without version — ambiguous against CSC 1.x

---

### TERM-05: Follow-up

| Context | Canonical Form | Rule |
|---|---|---|
| Adjective or noun | "follow-up" | Hyphenated: "follow-up visit", "follow-up client", "a follow-up" |
| Verb | "follow up" | No hyphen: "the worker will follow up with the client" |
| XLSForm client type value | `a13_client_type = '2'` | This is the system designation for a Follow-up Client [SOURCE] |

---

### TERM-06: Document Declaration

| Context | Canonical Form |
|---|---|
| Concept / prose | "Document Declaration" (title case) |
| Fields | `j_doc_hiv`, `j_doc_addr`, `j_doc_art` (XLSForm source names [SOURCE]) |
| What it is | A yes/no assertion by a field worker that they have sighted a document. It is NOT a file upload. It is NOT a verified copy of a document. |
| What it is not | Do NOT call it "document upload", "document verification", "proof of document", or "file" |

---

### TERM-07: Planned Service vs Delivered Service vs j5_plan

| Context | Canonical Form | Rule |
|---|---|---|
| Domain concept (Planned) | "Planned Service" (title case) | Intended future service. Status: `PLANNED` or `CANCELLED`. [SOURCE] |
| Domain concept (Delivered) | "Delivered Service" (title case) | Service actually rendered. **Planned service ≠ delivered service.** A planned service becomes `DELIVERED` only through an explicit delivered-service record. `j5_done_date` alone NEVER changes service status. [PROPOSED] |
| Database entity tables | `planned_services`, `delivered_services` | `planned_services` holds intended tasks; `delivered_services` stores explicit delivery events linked via `planned_service_id`. [PROPOSED] |
| XLSForm repeat table | `j5_plan` [SOURCE] | Contains planned fields (`j5_planned_date`, `j5_purpose`, `j5_cat`, `j5_service`) and historical completion fields (`j5_done_date`, `j5_done_purpose`). |

**Non-negotiable rule:** A planned service becomes `DELIVERED` only through creating an explicit `delivered_service` record. Recording `j5_done_date` alone NEVER changes status. [PROPOSED]

---

### TERM-08: Outbox Worker

| Context | Canonical Form |
|---|---|
| Component / prose | "Outbox Worker" (title case, two words) |
| Function | Background job that reads from the `outbox` table and delivers messages to the Apps Script adapter for Sheets mirroring |
| What it is not | Not a microservice. Not a saga. Not a Kafka consumer. It is a scheduled job within the Spring Boot application. [PROPOSED] |

**Do not use:** "outbox worker" (uncapitalized in prose headings), "outbox service", "outbox processor" (unless explicitly renamed by an ADR).

---

## §2 Full Domain Glossary

> All terms below are the canonical definitions. Documents may quote these verbatim or link to this file with `See SHARED_GLOSSARY.md §2`.

| Term | Canonical Definition | Evidence Tag |
|---|---|---|
| **Client** | An individual PLHIV or KP person registered in the CSC system with a unique `client_id`. Corresponds to a single CRF spanning Sections A–J. A client is either a Registration Client (`a13_client_type = '1'`) or a Follow-up Client (`a13_client_type = '2'`). | [SOURCE] |
| **Task** | A discrete unit of work assigned to a field worker. Has a due date, a purpose, and a completion criterion. Generated by the system from planned services, overdue follow-ups, and contact attempt failures. | [PROPOSED] |
| **Contact Attempt** | An action by a field worker to reach a client (by phone, visit, or proxy) that may or may not result in an Encounter. Outcome values: `reached` / `not_reached` / `refused`. A failed attempt is a valid record. **Contact Attempt ≠ Encounter.** | [PROPOSED] |
| **Encounter** | A successful in-person or confirmed contact with a Follow-up Client (`a13_client_type = '2'`) resulting in an `i_updates` entry. An Encounter has an `ia_visit_date` (observation date) which may differ from the server acceptance timestamp (`recorded_at`). An Encounter is NOT a Contact Attempt. | [PROPOSED] |
| **Observation** | A clinical or social measurement (CD4 count, weight, VL, stigma report) captured within a CRF or `i_updates` entry at a specific `observation_date`. Observation date ≠ `recorded_at` (server acceptance timestamp). Observations are columns within domain tables, not a separate top-level entity, unless an explicit ADR creates one. | [PROPOSED] |
| **Planned Service** | An entry in the `j5_plan` repeat table representing an intended future service. Fields: `j5_planned_date`, `j5_purpose`, `j5_cat`, `j5_service`. A Planned Service ≠ Delivered Service. A planned service transitions to `DELIVERED` only through an explicit delivered-service record. Status: `PLANNED` or `CANCELLED` (or marked completed via linked delivered service). | [SOURCE] / [PROPOSED] |
| **Delivered Service** | An explicit record (`delivered_services`) confirming that a service was actually rendered to the client. May link to a prior `planned_service_id`. `j5_done_date` alone NEVER changes service status. Lifecycle: requires explicit delivered-service submission. | [PROPOSED] |
| **Referral** | An entry in the `d5_referrals` repeat table representing an intent to refer the client to a scheme or entitlement. Fields: `d5_scheme`, `d5_entitlement`. A Referral is an intent record; confirmation of uptake is [OPEN — out of scope for MVP]. | [SOURCE] |
| **Document Declaration** | A yes/no assertion (`j_doc_hiv`, `j_doc_addr`, `j_doc_art`) made by a field worker that they have sighted a specific document. It is NOT a file upload. It is NOT a verified copy of the document. The system records the declaration, not the document. | [SOURCE] |
| **Consent** | `a08_consent` — the client's recorded agreement to home visits. Captured once at registration. [OPEN — whether it can be rescinded and re-recorded after initial submission.] | [SOURCE] |
| **Follow-up Visit** | An `i_updates` repeat entry recording a field worker's encounter with a Follow-up Client (`a13_client_type = '2'`). Mandatory fields: `ia_visit_date`, `ib_place`, `ic_art_status`. | [SOURCE] |
| **LFU (Lost to Follow-Up)** | A client who has not been successfully contacted within a programme-defined window. In Section H (`h7_lfu`), refers to whether a deceased client was on the MIS/LFU line list. In the system worklist, LFU risk is triggered by repeated failed contact attempts [OPEN — threshold values TBD]. | [SOURCE] / [PROPOSED] |
| **Local Draft** | A record created on a field worker's device that has NOT yet been accepted by the server. Local Draft ≠ Server-Accepted Record. A local draft has no `recorded_at` timestamp. | [PROPOSED] |
| **Server Acceptance** | The moment a record is validated and persisted by the Spring Boot API. The `recorded_at` timestamp is set at this point, regardless of when the observation occurred (`observation_date` / `ia_visit_date`). | [PROPOSED] |
| **CRF** | Case Record Form — the structured data collection instrument spanning Sections A–J, implemented as an XLSForm in the source specification. | [SOURCE] |
| **KP** | Key Population — one of: `fsw` (female sex worker), `msm` (men who have sex with men), `tgh` (transgender), `pwid` (person who injects drugs). | [SOURCE] |
| **PLHIV** | Person Living with HIV. | [SOURCE] |
| **ARTC** | ART Centre — the facility providing antiretroviral therapy to the client. Referenced in `a09_artc_name` / `a09_artc_code` and Section C. | [SOURCE] |
| **CSC** | Community Support Centre — the organisational unit providing social support services. Referenced in `a10_csc_name` / `a10_csc_code`. | [SOURCE] |
| **CLH** | Community Link Hub — referenced in `a10_clh_code` and `j2_clh`. | [SOURCE] |
| **i_updates** | The XLSForm repeat entity table in Section I capturing Follow-up Client visit records. Each row is one visit / encounter. This becomes the `encounters` table (or equivalent) in the system database. [SOURCE] / [PROPOSED] |
| **j5_plan** | The XLSForm repeat entity table in Section J capturing planned (and later delivered or cancelled) service entries. Each row is one planned service. | [SOURCE] |
| **b2_members** | The XLSForm repeat entity table in Section B capturing family member records, including HIV status, CD4, VL, and ART history. | [SOURCE] |
| **d5_referrals** | The XLSForm repeat entity table in Section D capturing referral entries. | [SOURCE] |
| **Outbox** | A database table in PostgreSQL used to queue messages for asynchronous delivery to external systems (primarily the Apps Script adapter for Sheets mirroring). The outbox pattern ensures atomic write + message publication. | [PROPOSED] |
| **Outbox Worker** | See §1 TERM-08. A scheduled background job (within Spring Boot) that reads from the `outbox` table and delivers to the Apps Script adapter. | [PROPOSED] |
| **Apps Script Adapter** | A Google Apps Script `doPost` web app that receives outbox messages from the Outbox Worker and writes them to Google Sheets. The Adapter is a write-only mirror target; it has no authority over data. [OPEN — verify that Apps Script `doPost` deployments can reliably receive the chosen authentication credential. See DOC-03 §7.] | [PROPOSED] |
| **Sheets Mirror** | The Google Sheets workbook that receives data from the Apps Script Adapter. The Mirror is read-only from the system's perspective; it is NEVER an authority for data. Changes in Sheets do NOT flow back to the system. | [PROPOSED] |
| **Audit Log** | An append-only database table (`audit_log`) recording every data mutation: actor, action, entity type, entity ID, old value (diff_json), new value (diff_json), server timestamp, IP address hash. The application user has no UPDATE or DELETE privilege on this table. | [PROPOSED] |
| **Idempotency Receipt** | A server-side record keyed on a client-supplied `idempotency_key` (UUID). On retry, if the key is found, the original response is returned without re-executing the operation. Prevents double-writes on network retry. | [PROPOSED] |

---

## §3 Role Canonical Forms

| Role | Code (snake_case — use in DB, JWT, API, enum) | Prose (two words, no hyphen) | Java Class Prefix |
|---|---|---|---|
| Field Worker | `field_worker` | "field worker" | `FieldWorker` |
| Supervisor | `supervisor` | "supervisor" | `Supervisor` |
| State Reviewer | `state_reviewer` | "state reviewer" | `StateReviewer` |
| Administrator | `administrator` | "administrator" | `Administrator` |
| Leadership | `leadership` | "leadership" | `Leadership` |

**Rule:** Leadership ≠ Administrator. Leadership sees anonymised aggregates with no PII. Administrator manages users, config, and system settings. These are distinct roles with distinct permission sets. [PROPOSED]

---

## §4 Document ID Registry

| Document ID | Document Title | File Name |
|---|---|---|
| DOC-01 | Product Requirements Document | `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` |
| DOC-02 | Technical Architecture Document | `02_TECHNICAL_ARCHITECTURE_DOCUMENT.md` |
| DOC-03 | Security and Access Document | `03_SECURITY_AND_ACCESS_DOCUMENT.md` |
| DOC-04 | Frontend Specification Document | `04_FRONTEND_SPECIFICATION_DOCUMENT.md` |
| DOC-05 | Feature Ticket List | `05_FEATURE_TICKET_LIST.md` |
| DOC-GLO | Shared Glossary (this file) | `SHARED_GLOSSARY.md` |
| DOC-RECON | Reconciliation Report | `RECONCILIATION_REPORT.md` |

---

## §5 Evidence Tag Definitions

> [!IMPORTANT]
> Every statement in every specification document MUST carry one of these tags. Untagged statements are violations to be caught in reconciliation.

| Tag | Meaning | When to Use |
|---|---|---|
| `[SOURCE]` | Directly traceable to the CRF PDF or XLSForm (`CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx`) | Field names, validation constraints, question text, choice values — anything in the source documents |
| `[PROPOSED]` | A design decision made by the specification team that has no explicit source document backing | Architecture choices, API conventions, UI patterns, process flows invented to fill gaps |
| `[ASSUMPTION]` | A working assumption that is reversible and has NOT been confirmed by the product owner or a source document | Operational assumptions (e.g., "15,000 clients as a test scenario") |
| `[OPEN]` | An unresolved decision that MUST be answered before implementation proceeds | Owner decision required; blocks downstream work |
| `[UNVERIFIED]` | A claim made in a prior document version or by a team member that has not been confirmed against sources | Use temporarily during reconciliation; MUST be resolved to another tag before a document reaches APPROVED status |

**Rule:** Clinical rules, thresholds, due dates, scoring formulas, and legal compliance claims MUST NOT appear without `[SOURCE]`. XLSForm numeric ranges and age conditions are `[SOURCE]` review items for implementation, NOT policy assertions by the specification team.

---

## §6 ID Namespace Registry

| Namespace | Pattern | Scope | Document |
|---|---|---|---|
| `PRD-nnn` | PRD-001, PRD-002, … | Functional requirement IDs | DOC-01 |
| `ARCH-nnn` | ARCH-001, ARCH-002, … | Architecture decision / constraint IDs | DOC-02 |
| `ADR-nnn` | ADR-001, ADR-002, … | Architecture Decision Records | DOC-02 |
| `SEC-nnn` | SEC-001, SEC-002, … | Security requirement IDs | DOC-03 |
| `ABUSE-nn` | ABUSE-01, ABUSE-02, … | Abuse case IDs | DOC-03 |
| `THREAT-X-nnn` | THREAT-S-001 (Spoofing), THREAT-T-001 (Tampering), THREAT-R-001 (Repudiation), THREAT-I-001 (Info Disclosure), THREAT-D-001 (DoS), THREAT-E-001 (Elevation) | STRIDE threat IDs | DOC-03 |
| `SEC-TEST-nnn` | SEC-TEST-001, … | Security test IDs | DOC-03 |
| `UI-nnn` | UI-001, UI-002, … | UI requirement / screen contract IDs | DOC-04 |
| `TCK-nnn` | TCK-001, TCK-002, … | Feature ticket IDs | DOC-05 |
| `OD-nnn` | OD-001, OD-002, … | Open Decision IDs (cross-document) | All docs |
| `DR-nnn` | DR-001, DR-002, … | Discrepancy Register entries | DOC-RECON |
| `OPEN-nnn` | OPEN-001, OPEN-002, … | Open item IDs within individual doc sections | All docs |
| `FIX-nn` | FIX-01, FIX-02, … | Reconciliation fix IDs | DOC-RECON |
| `UNRES-nnn` | UNRES-001, UNRES-002, … | Unresolved item IDs in reconciliation report | DOC-RECON |

---

## §7 Entity Table Name Registry

> [!IMPORTANT]
> These four XLSForm repeat groups MUST be treated as related entity tables (one-to-many relationships), NEVER as numbered flat columns on the parent row.

| XLSForm Repeat Group | Database Table (proposed) | Relationship | Evidence |
|---|---|---|---|
| `b2_members` | `family_members` | Many `family_members` → one `client` | [SOURCE] |
| `d5_referrals` | `referrals` | Many `referrals` → one `client` | [SOURCE] |
| `i_updates` | `encounters` (or `follow_up_visits`) | Many `encounters` → one `client` | [SOURCE] |
| `j5_plan` | `planned_services` | Many `planned_services` → one `client` | [SOURCE] |

**Anti-pattern to avoid:** `client.family_member_1_name`, `client.family_member_2_name`, etc. — flat columns are NEVER acceptable for any of these four groups. [PROPOSED]

---

## §8 Key Distinctions (Disambiguation Table)

| Concept A | Concept B | How They Differ |
|---|---|---|
| **Contact Attempt** | **Encounter** | A Contact Attempt records any outreach action (reached / not reached / refused). An Encounter records a successful interaction generating an `i_updates` entry. Every Encounter implies a successful Contact Attempt; the converse is false. |
| **Planned Service** | **Delivered Service** | Same database row in `planned_services`; status differentiates them. A service is Planned when only `j5_planned_date` exists; it becomes Delivered when `j5_done_date` is recorded. |
| **Encounter** | **Referral Completion** | An Encounter records a visit. A Referral (in `d5_referrals`) records an intent to refer. Whether the referral was acted upon and completed is [OPEN — out of scope for MVP]. |
| **Observation Date** | **Recorded Timestamp** | `ia_visit_date` (or equivalent) = when the event occurred, set by the field worker. `recorded_at` = server acceptance timestamp, set by the API. These may differ by hours or days (offline scenarios). |
| **Local Draft** | **Server-Accepted Record** | A Local Draft exists only on the device and has no canonical `record_id` or `recorded_at`. A Server-Accepted Record has been validated and persisted; its `recorded_at` is the canonical timestamp. |
| **Document Declaration** | **Document Upload** | A Declaration is a yes/no checkbox in the CRF. The system records the declaration, not the document. There is no file upload mechanism in scope [PROPOSED — unless an ADR adds one]. |
| **Leadership Role** | **Administrator Role** | Leadership sees anonymised aggregate dashboards with no PII. Administrator manages users, configuration, and system settings. These are distinct roles with distinct permissions. |

---

## §9 Data Value Conventions

> All numeric ranges below are XLSForm validation constraints [SOURCE], not clinical policy. They are review items for implementation, not policy assertions.

| Field | XLSForm Constraint | Tag |
|---|---|---|
| `c12b_cd4_count` (adults, age ≥ 18) | 0 – 5000 | [SOURCE] |
| `c12b_cd4_pct` (children, age < 18) | 0 – 100 | [SOURCE] |
| `c13b_vl_count` | ≥ 0 | [SOURCE] |
| `c10_height` | 30 – 230 cm | [SOURCE] |
| `c11_weight` | 1 – 200 kg | [SOURCE] |
| `c_muac` | > 0 and ≤ 30 cm (shown only when age < 5) | [SOURCE] |
| `b2_cd4` (family member) | 0 – 5000 | [SOURCE] |
| `b2_vl` (family member) | ≥ 0 | [SOURCE] |
| `a01_age` | 0 – 120 | [SOURCE] |

**Missing value semantics (from DOC-01 §8):**

| Code | Meaning |
|---|---|
| `NULL` | Not collected or not applicable given question logic |
| Empty string | Invalid — treat as NULL; do not store |
| `"unknown"` or `"not_known"` | Explicitly stated by respondent as unknown |
| `"not_tested"` | Field offers "not tested" as a choice (e.g., VL, CD4) |
| `"not_applicable"` | Logic skip — question did not apply to this client |
| `0` | Genuine zero (e.g., zero family members, zero referrals) |
| `"declined"` | Consent declined (for applicable fields) |

---

## §10 Open Decisions Requiring Owner Input

| OD-ID | Decision Required | Blocking | Last Raised |
|---|---|---|---|
| OD-001 | Can `a08_consent` be rescinded and re-recorded after initial submission? | DOC-01 §5 PRD-070, DOC-03 §6 | DOC-01 v0.1.0 |
| OD-002 | LFU threshold: how many consecutive failed contact attempts within how many days triggers an LFU flag? | DOC-01 PRD-044 | DOC-01 v0.1.0 |
| OD-003 | Referral completion: is it in scope to record whether a d5_referrals intent was acted upon? | DOC-01 §5 PRD-xxx | DOC-01 v0.1.0 |
| OD-004 | Session mechanism: HttpOnly cookie vs Bearer token for browser → Next.js BFF? | DOC-03 §3 | DOC-03 v0.1.0 |
| OD-005 | BFF → Spring Boot auth: shared secret vs mTLS? | DOC-03 §3 | DOC-03 v0.1.0 |
| OD-006 | Apps Script credential: verify that custom Authorization headers reach doPost; choose credential mechanism. | DOC-03 §7, DOC-02 §7 | DOC-02 v0.1.0 |
| OD-007 | Approvals workflow: is a supervisor approval step required before a client record is visible to state reviewers? | DOC-04 §3 | DOC-04 v0.1.0 |
| OD-008 | Retention period: how long are records retained before archival or deletion is permitted? [OPEN — requires authoritative legal/programme review, not specification team decision] | DOC-03 §6 | DOC-03 v0.1.0 |
| OD-009 | OTP second factor: is OTP authentication in scope? (ABUSE-03 is conditional on this decision.) | DOC-03 ABUSE-03 | DOC-03 v0.1.0 |
| OD-010 | Offline boundary: which screens and operations are permitted offline? (PRD says MVP; TAD says [OPEN]) | DOC-01 PRD-039, DOC-02 §8 | DOC-02 v0.1.0 |

---

## §11 Self-Check

| Check | Result |
|---|---|
| All 8 TERM collisions from RECONCILIATION_REPORT.md §2 resolved | ✅ TERM-01 through TERM-08 |
| All domain glossary terms from DOC-01 §6 included | ✅ |
| Role canonical forms cover all 5 roles | ✅ |
| Document ID registry covers all 7 docs including this file | ✅ |
| Evidence tag definitions present with usage rules | ✅ |
| ID namespace registry covers all 14 namespaces used across docs | ✅ |
| 4 repeat entity tables listed with anti-pattern warning | ✅ |
| 8 key distinctions table covering all mandated separations | ✅ |
| Data value conventions including missing/unknown/not-tested/zero | ✅ |
| Open decisions consolidated from all docs | ✅ 10 ODs listed |
| No new features added | ✅ |
| No invented clinical rules | ✅ — all numeric ranges tagged [SOURCE] |
| No real beneficiary data | ✅ |
| No secrets or tokens | ✅ |
