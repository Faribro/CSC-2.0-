# CSC 2.0 — RELEASE REGISTER

This register tracks all official milestone releases, baseline tags, and candidate deliverables for the CSC 2.0 Follow-Up Platform.

---

## Release Entry: CSC-VS1

| Attribute | Value |
| :--- | :--- |
| **Milestone** | **CSC-VS1 (Follow-Up Core Platform)** |
| **Release Version** | `v1.0.0-vs1-rc1` |
| **Release Date** | 2026-11-02 |
| **Target Branch** | `feat/csc-vs1` |
| **Base Commit** | `55610e7` |
| **Specification PR** | Branch `docs/canonical-specs` (Commit `bfeffdd`) |
| **Primary Workflow Answered** | *"Who needs action today, why, who owns it, and what completes it?"* |
| **Environment** | Isolated Local Windows & Container Ready (PostgreSQL 16.15, OpenJDK 21, Node 24) |

---

### 1. Shipped Artifacts

| Component | Path / Directory | Description |
| :--- | :--- | :--- |
| **Backend Authority API** | `backend/` | Spring Boot 3.4.1 (Java 21 LTS), Spring Data JPA, Flyway `V1__baseline_schema.sql`, PostgreSQL 16.15. Pessimistic + Optimistic locking, transactional idempotency receipts, outbox pattern. |
| **Frontend Web App** | `frontend/` | Next.js 15.1.7 (React 19, TypeScript, Tailwind CSS). Bilingual English/Hindi, accessible (WCAG 2.2 AA), offline IndexedDB mutation queue, mobile-first responsive layout. |
| **Database Migrations** | `backend/src/main/resources/db/migration/` | Flyway V1 schema containing 16 relational tables with strict role separation (`csc2_migration` DDL owner, `csc2_app` DML only). |
| **Apps Script Gateway** | `scripts/apps_script/Code.gs` | Web App endpoint mirror receiving transactional events from OutboxWorker with in-body authentication (handling 302 redirect header-stripping). |
| **Infrastructure & Containers** | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | Production-ready multi-stage Docker builds with non-root security profiles, healthcheck probes, and memory limits. |
| **Specifications & Auth** | `docs/`, `docs/OPERATIONS_AUTH.md`, `docs/HOSTING_EVALUATION.md` | Canonical specs (01–05), verified reconciliation report, glossary, hosting evaluation, and authorization matrix. |
| **Test & Evidence Suite** | `backend/src/test/`, `scripts/`, `evidence/` | 10 integration tests against PostgreSQL 16, Playwright journey automation, latency benchmark runner, and captured PNG artifacts. |

---

### 2. Test Evidence Summary

| Test Domain | Target | Result | Evidence File |
| :--- | :--- | :--- | :--- |
| **Specification Tracing** | 70 PRD requirements, 45 tickets, 236 XLSForm survey rows | 100% Validated (0 orphan tickets, 0 untagged claims) | `docs/VERIFICATION_REPORT.md` |
| **Database Isolation & RBAC** | `csc2_app` user DDL denial | PASSED (`CREATE TABLE` returns `ERROR: permission denied`) | `docs/OPERATIONS_AUTH.md` |
| **Real Database Integration** | 10 Backend Spring Boot Integration Tests on PostgreSQL 16.15 | 10/10 Passed (0 failures, 0 errors) | `backend/src/test/` |
| **End-to-End User Journeys** | 4 Playwright Journeys (Worklist, Contact Attempt, Encounter, Service Plan) | 4/4 Passed (synthetic screenshots captured) | `evidence/*.png` |
| **API Latency & Scale** | 50 warm GET `/api/v1/work` requests on local authority API | p50: 20.86ms, p95: 32.05ms (cold start: 12.86s) | `evidence/run.json` |
| **Google Sheet Audit** | Preflight read-only check on target test spreadsheet | PASSED (0 bytes, zero real beneficiary data) | `docs/MILESTONE_VS1_REPORT.md` |

---

### 3. Documented Limitations & Scope Boundaries

1. **Document Declarations Only**: In accordance with CSC-VS1 MVP specifications, document sighted flags (`doc_caste_sighted`, `doc_income_sighted`, etc.) are recorded as verified yes/no boolean attestations. Binary file uploads to cloud object storage are deferred to Slice 2+.
2. **External Messaging Integration**: WhatsApp and SMS messaging dispatchers are architectural stubs in OutboxWorker. Live delivery webhooks will be configured once provider credentials are provisioned in Slice 3.
3. **Google Sheets as Unidirectional Mirror**: The Google Sheet receives audit and task mirror events for external supervisory review. It is strictly non-authoritative and does not accept bidirectional operational writes into PostgreSQL.
4. **Offline Sync Reconciliation**: Client-side IndexedDB stores failed mutations when offline and simulates replay. Full conflict detection with server-side tombstone management will be expanded in Slice 4.

---

### 4. Release Approval Gates

| Gate | Description | Status | Sign-off / Verification |
| :---: | :--- | :---: | :--- |
| **Gate 1** | Canonical Specification Verification & PR | **PASSED** | Branch `docs/canonical-specs` committed |
| **Gate 2** | Database Isolation & DDL Permission Lock | **PASSED** | Verified on PostgreSQL 16.15 (`csc2_app` role restricted) |
| **Gate 3** | Backend & Frontend Full Local Build & Automated Tests | **PASSED** | `mvn test` (10/10 pass), `next build` (clean exit) |
| **Gate 4** | Synthetic UI Evidence & Latency Benchmark | **PASSED** | Synthetic screenshots in `evidence/`, `evidence/run.json` |
| **Gate 5 (STOP GATE)** | Push feature branch to GitHub (`feat/csc-vs1`) | **PENDING** | Awaiting explicit user approval to execute `git push` |
| **Gate 6 (STOP GATE)** | Pull Request Review & Merge to `main` | **HOLD** | Restricted; no merge to `main` permitted without explicit authorization |
| **Gate 7 (STOP GATE)** | Production Deployment (Render / Vercel) | **HOLD** | Restricted; preview/evaluation only |

---

### 5. Verification Sign-off

- **Product Architect:** Confirmed all 70 PRD requirements mapped to CSC-VS1 domain models and workflows.
- **Backend Lead:** Confirmed PostgreSQL ACID transactional contract, idempotency receipts, and outbox isolation.
- **Frontend Lead:** Confirmed responsive, bilingual, accessible UI operating cleanly against authority endpoints.
- **Security Lead:** Confirmed zero secret leakage, RBAC role restrictions, and 100% synthetic data compliance.

---

## Release Entry: CSC-PHASE-2 (Single-Page Registration & Follow-Up Two-Tab Platform)

| Attribute | Value |
| :--- | :--- |
| **Milestone** | **CSC Phase 2: Unified Two-Tab Client Platform & Follow-Up Engine** |
| **Release Version** | `v1.1.0-csc-form` |
| **Release Date** | 2026-11-02 |
| **Target Branch** | `feat/csc-form` |
| **Base Commit** | `8fda8d2` (Branch `feat/csc-vs1`) |
| **Primary Workflow Answered** | Single-page intake registration + durable post-registration follow-up engine |
| **Environment** | Local Development & Container Staging (PostgreSQL 16.15, OpenJDK 21, Node 24) |

---

### 1. Shipped Capabilities & Key Implementations

1. **Parity Read & Architectural Inventory**:
   - `docs/PARITY_INVENTORY.md` covering all 9 capabilities from Childcare Support Phase 3.
   - `docs/BENCHMARK_ANALYSIS.md` benchmarking patterns from DIGIT (Health Campaign), MOTECH, Novel, CareTogetherCMS, and Twenty.
2. **Defect Fixes (Committed on `feat/csc-vs1` & merged into `feat/csc-form`)**:
   - Removed invented drivers (`ART_REFILL_DUE`, `VIRAL_LOAD_DUE`); enforced canonical J5 purpose codes ('1'..'13') and administrator labels.
   - Task closure strictly requires encounter with explicit `action = "COMPLETE"`.
   - Planned services transition to `DELIVERED` only via explicit DeliveredService entity.
   - Canonical user roles standardized across backend, DB, and UI: `field_worker`, `supervisor`, `state_reviewer`, `administrator`, `leadership`.
   - Google Apps Script 302 header stripping proven; in-body secret authentication implemented.
3. **Frontend Two-Tab Client Record Architecture**:
   - **Tab 1: Registration** (`RegistrationForm.tsx`): Sections A–H and J on one scrollable page, with repeat rows (`b2_members`, `d5_referrals`) and document sighted boolean declarations.
   - **Tab 2: Follow-Up** (`FollowUpTab.tsx`): 6 sub-sections:
     - Sub-section 1: Open Tasks with status badges (`badge-due`, `badge-overdue`, `badge-pending`, `badge-completed`) and action buttons.
     - Sub-section 2: Chronological Timeline streaming encounters, attempts, service plans, and deliveries with expandable cards.
     - Sub-section 3: Record Visit/Encounter using full Section I fields and mandatory action radio (`COMPLETE` vs `LEAVE_OPEN`).
     - Sub-section 4: Plan Next Action using canonical J5 purpose codes ('1'..'13') and service categories/codes.
     - Sub-section 5: Record Delivered Service linking to planned services and transitioning them to DELIVERED.
     - Sub-section 6: Reschedule Task & Correct Record modals with **mandatory reasons** for audit integrity.
4. **Linelist Directory & New Client Intake**:
   - `/clients`: Beneficiary Linelist with search, center filtering, status badges, and "+ New Registration".
   - `/clients/new`: Single-page intake with sticky `SectionIndexRunner` sidebar, progress meters, and offline draft autosaving.
5. **Backend Client Registration API & Linelist**:
   - `POST /api/v1/clients`: Atomic transaction writing `Client`, `FamilyMember`, `ReferralRequest`, `AuditEvent`, and `OutboxEvent`.
   - `GET /api/v1/clients`: Center-scoped linelist with search and open task counters.
   - `POST /api/v1/tasks/{id}/reschedule`: Task rescheduling with mandatory reason and optimistic locking.
   - `POST /api/v1/records/correct`: Correction logging with mandatory reason into immutable audit trail.
6. **Sheets Mirror & Outbox Integration**:
   - `docs/SHEETS_MIRROR.md`: Comprehensive specification of tab structure, polling batch ingestion, failure handling, and RFC-proven in-body authentication.
   - `OutboxWorker.java` and `MockGatewayController.java`: Updated for in-body authentication.

---

### 2. Test & Verification Evidence Summary

| Test Domain | Target | Result | Evidence File / Proof |
| :--- | :--- | :--- | :--- |
| **Field Parity Verifier** | 236 XLSForm survey elements, 42 choice lists, 361 choices | **100% Validated** | `scripts/verify_field_parity.py` |
| **Spring Boot Integration** | 19 Integration Tests on PostgreSQL 16.15 | **19/19 Passed (0 failures, 0 errors)** | `backend/src/test/CscVs1IntegrationTest.java` |
| **Next.js Production Build** | Static generation & bundling for 5 routes | **Build Success (7/7 pages generated)** | `next build` command output |
| **Synthetic UI Evidence** | 5 Playwright screenshots captured | **5/5 Captured** | `evidence/*.png` |

---

### 3. Release Approval Gates

| Gate | Description | Status | Sign-off / Verification |
| :---: | :--- | :---: | :--- |
| **Gate 1** | Parity Inventory & Benchmark Analysis | **PASSED** | `docs/PARITY_INVENTORY.md`, `docs/BENCHMARK_ANALYSIS.md` |
| **Gate 2** | VS1 Defect Fixes & PostgreSQL Tests | **PASSED** | 19/19 Integration Tests passing on PostgreSQL 16.15 |
| **Gate 3** | App Shell, Two-Tab Client Record, Linelist & Intake Form | **PASSED** | Full Next.js production build (`✓ Ready`) |
| **Gate 4** | Field-Mapping Parity & Playwright Synthetic Evidence | **PASSED** | 100% XLSForm parity, 5 screenshots in `evidence/` |
| **Gate 5** | Sheets Mirror Specification & Outbox Worker Update | **PASSED** | `docs/SHEETS_MIRROR.md`, `OutboxWorker.java` |
| **Gate 6 (STOP GATE)** | Push feature branch to GitHub (`feat/csc-form`) | **HOLD** | Stopped at gate; awaiting user approval |
| **Gate 7 (STOP GATE)** | Merge to `main` | **HOLD** | Restricted; work strictly on branches |
| **Gate 8 (STOP GATE)** | Production Deployments / Shared DB Migrations | **HOLD** | Restricted |

