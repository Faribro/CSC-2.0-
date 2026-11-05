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

---

## Release Entry: Three Top-Level Tabs, Field Phone Auth & Calm Comic Theme

| Attribute | Value |
| :--- | :--- |
| **Milestone** | **Three Top-Level Tabs, Field Phone Auth & Calm Comic Theme** |
| **Release Version** | `v1.2.0-three-tabs-comic-rc1` |
| **Release Date** | 2026-11-03 |
| **Target Branch** | `feat/three-tabs-comic-theme` |
| **Base Commit** | `b4e8758` |
| **Environment** | PostgreSQL 16.15, Spring Boot 3.4.1 (Java 21 LTS), Next.js 15.1.7 (React 19, Node 24) |

### 1. Shipped Artifacts

| Component | Path / File | Description |
| :--- | :--- | :--- |
| **Flyway V5 Schema Migration** | `backend/src/main/resources/db/migration/V5__three_tabs_field_phone_and_evaluation.sql` | 8 relational tables: `field_user`, `field_roster`, `phone_otp_challenge`, `device_session`, `sms_outbox`, `state_reference`, `leadership_allowlist`, `password_credential`. |
| **Field Phone Auth Engine** | `FieldUserAuthService.java`, `FieldUserAuthController.java` | 6-digit CSPRNG OTP challenge, pepper secret, constant-time compare, 5-attempt lock, 30-day sliding cookie session (`csc2_device_session`), dev test code `123456`. |
| **SMS Gateway Adapter Suite** | `SmsProvider.java`, `TextBeeSmsAdapter.java`, `MockSmsAdapter.java`, `LicensedProviderStubAdapter.java` | Multi-adapter SMS dispatch, transactional outbox durability, fail-closed outside local profile. |
| **Evaluation Oversight Engine** | `EvaluationService.java`, `EvaluationController.java` | Restricted supervisor and leadership access with email allowlist OTP, Argon2id passwords, and shackle unlock animation. |
| **Calm Comic Design System** | `tokens.css`, `tailwind.config.ts`, `MOBILE_DESIGN_SYSTEM_CONTRACT.md` | Warm canvas (`#FFFBF5`), coral/plum accents, 48px touch targets, zero blue/dark green tokens, 100% WCAG 2.2 AA compliant. |
| **GPS Live Address Fetch** | `LocationFetchButton.tsx`, `RegistrationForm.tsx` | Multi-tier geocoding fallback chain auto-filling grouped address fields (House/door no., street, city, district, state, pin). |
| **Address Part Grouping** | `crfDefinitions.ts` | Contact number moved up to residence header; contiguous address fields grouped together ending with Address verified on and Fetch Address. |
| **Automated Linters** | `lint_no_banned_colors.js`, `verify_wcag_tokens.js`, `lint_no_emoji.js` | Zero banned colors across 24 files; 100% WCAG contrast passing; zero unicode emojis across 31 frontend source files. |

### 2. Test & Verification Evidence Summary

| Test Domain | Target | Result | Evidence File / Proof |
| :--- | :--- | :--- | :--- |
| **Three Tabs & Phone Auth Tests** | 8 Spring Boot Integration Tests on PostgreSQL 16 | **8/8 Passed (0 failures, 0 errors)** | `ThreeTabsAndFieldPhoneIntegrationTest.java` |
| **Overall Backend Suite** | 37 Spring Boot Integration & Unit Tests on PostgreSQL 16 | **37/37 Passed (0 failures, 0 errors)** | `mvn test` |
| **Next.js Production Build** | Static generation & bundling for all 11 routes | **Build Success (11/11 pages compiled)** | `npx next build` |
| **Banned Colors Linter** | 24 frontend source files | **100% PASS (0 violations)** | `node scripts/lint_no_banned_colors.js` |
| **WCAG 2.2 AA Contrast Verifier** | 18 comic token pairs | **100% PASS (all >= 4.5:1 / 3:1)** | `node scripts/verify_wcag_tokens.js` |
| **Emoji Elimination Linter** | 31 frontend source files | **100% PASS (0 emojis)** | `node scripts/lint_no_emoji.js` |

### 3. Release Approval Gates

| Gate | Description | Status | Sign-off / Verification |
| :---: | :--- | :---: | :--- |
| **Gate 1** | Three Top-Level Tabs & Comic Theme UI | **PASSED** | Verified on `http://localhost:3000` |
| **Gate 2** | Field Phone Auth & Device Session Persistence | **PASSED** | 8/8 Integration Tests passing on PostgreSQL 16.15 |
| **Gate 3** | TextBee SMS Gateway Audit & Outbox Durability | **PASSED** | `docs/SMS_GATEWAY.md`, outbox entity, tests |
| **Gate 4** | GPS Address Fetch & Grouped Address Layout | **PASSED** | Integrated beside Address verified on in Section A |
| **Gate 5 (STOP GATE)** | Push feature branch to GitHub (`feat/three-tabs-comic-theme`) | **HOLD** | Stopped at gate; awaiting user explicit approval |
| **Gate 6 (STOP GATE)** | Merge to `main` | **HOLD** | Restricted; work strictly on branches |
| **Gate 7 (STOP GATE)** | Production Deployments / Shared DB Migrations | **HOLD** | Restricted |


---

## Release Entry: End-to-End Functional Hardening & Pre-Deployment Security Review

| Attribute | Value |
| :--- | :--- |
| **Milestone** | **End-to-End Functional Hardening & Pre-Deployment Security Review** |
| **Release Version** | `v1.3.0-e2e-security-rc1` |
| **Release Date** | 2026-11-05 |
| **Target Branch** | `feat/three-tabs-comic-theme` |
| **Base Commit** | `9154ac9` |
| **Environment** | PostgreSQL 16.15, Spring Boot 3.4.1 (Java 21 LTS), Next.js 15.1.7 (React 19, Node 24) |

### 1. Shipped Artifacts

| Component | Path / File | Description |
| :--- | :--- | :--- |
| **Google Sheets Mirror** | `scripts/apps_script/Code.gs`, `docs/SHEETS_MIRROR.md` | Google Apps Script Web App receiving outbox events. 3-tier header, sub-sheets for family repeats and referrals, LockService concurrency guards, prepended apostrophe formula injection neutralization, body HMAC verification. |
| **WebOTP SMS Delivery** | `FieldUserAuthService.java`, `docs/SMS_GATEWAY.md` | Standard Android WebOTP format (`@csc2.allianceindia.org #<code>`), 6-digit CSPRNG code with SHA-256 HMAC pepper, 10-minute expiry, 5-attempt lock, neutral user enumeration defense. |
| **Dev Sinks Engine** | `DevSinkController.java`, `/api/v1/dev-sinks` | Local profile dev-only inspectable outbox sinks (`/sms`, `/email`, `/clear`, `/roster`), strictly disabled in production. |
| **ASVS L2 / NIST SP 800-63B Auth** | `SecurityConfig.java`, `PasswordValidatorService.java`, `docs/03_SECURITY_AND_ACCESS_DOCUMENT.md` | Argon2id password hashing (m=65536, t=3, p=1), 12-char minimum passphrase, breached/common dictionary screening, HSTS max-age=31536000, X-Frame-Options: DENY, Referrer-Policy, MutationOriginFilter CSRF defense, rotating refresh tokens with automated reuse revocation. |
| **Concurrency & Idempotency** | `ClientService.java`, `ClientController.java`, `PhoneOtpChallengeRepository.java` | Row-level pessimistic locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`), PostgreSQL unique constraint idempotency handling with polling replay. |
| **Purpose-Built UI Polish** | `AppShell.tsx`, `work/page.tsx`, `clients/page.tsx`, `clients/[id]/page.tsx` | Mobile back-button suppression, single large Plus-icon registration button, wifi network indicator, follow-ups consolidated into records toolbar, clean mobile sticky bar stacking (`bottom-14`). |

### 2. Test & Verification Evidence Summary

| Test Domain | Target | Result | Evidence File / Proof |
| :--- | :--- | :--- | :--- |
| **Backend Integration Suite** | 55 Spring Boot Integration Tests on PostgreSQL 16 | **55/55 Passed (0 failures, 0 errors)** | `cmd.exe /c "cd backend && mvn test"` |
| **Interactive Follow-Up E2E** | 10 user flows across Desktop-Chrome and Mobile-Chrome | **20/20 Passed (0 failures)** | `npx playwright test e2e/followup-interactive.spec.ts` |
| **Evaluation Assertions E2E** | Header wifi, stigma defense, role gating, PII isolation | **12/12 Passed (0 failures)** | `npx playwright test e2e/evaluation-honest-assertions.spec.ts` |
| **Follow-Up Flow E2E** | Visit recording, unreachable attempt, rescheduling, Hindi | **10/10 Passed (0 failures)** | `npx playwright test e2e/followup-flow.spec.ts` |
| **Google Sheets Mirror Suite** | 7 tests: HMAC verification, idempotency, formula escaping, 50-request concurrent load (p95: 34ms) | **7/7 Passed (0 failures)** | `node scripts/test_sheets_mirror.js` |
| **ASVS L2 Security Suite** | 9 tests: Security headers, 12-char passphrase, dictionary check, Argon2id, CSRF origin, 429 lockout, token reuse revocation, 401 auth | **9/9 Passed (0 failures)** | `node scripts/test_security_asvs.js` |
| **Concurrency & Race Suite** | 3 tests: Concurrent OTP verification, refresh token reuse detection, 4x double-click idempotency deduplication | **3/3 Passed (0 failures)** | `node scripts/test_concurrency_race.js` |
| **Local Sinks & Evaluation Auth** | 8 tests: Leadership neutral OTP, state signup, roster enrollment, outbox delivery, supervision queue | **8/8 Passed (0 failures)** | `node scripts/test_sinks_and_auth_e2e.js` |
| **Controls Deduplication & Emoji** | DOM scan across all routes in English & Hindi | **100% Passed (0 emojis, 1 New Reg)** | `node scripts/verify_controls_and_emoji.js` |
| **WCAG 2.2 AA Contrast** | 18 color token pairs | **100% Passed (all >= 4.5:1 / 3:1)** | `node scripts/verify_wcag_tokens.js` |
| **TypeScript Static Analysis** | Full Next.js frontend compilation | **0 Errors** | `npx tsc --noEmit` |

### 3. Data Integrity & Stigma Disclosures

1. **Synthetic Demonstration Data**: All client names, phones, ART numbers, and addresses are purely synthetic demonstration data containing zero real protected health information (PHI) or personally identifiable information (PII).
2. **Evaluation Metrics**: Leadership indicators carry the `SYNTHETIC DEMO` tag with explicit numerator, denominator, and operational definitions. Client-level data is strictly gated from national leadership views.
3. **Stigma Defense**: Phone numbers and clinical diagnosis details are never exposed in linelists, table DOMs, or URL parameters. Phone dialing is restricted to the verified client detail view with explicit intent.

### 4. Release Approval Gates

| Gate | Description | Status | Sign-off / Verification |
| :---: | :--- | :---: | :--- |
| **Gate 1** | Real Google Sheets Mirror with HMAC, 3-Tier Header & Formula Escaping | **PASSED** | 7/7 Tests passing (`scripts/test_sheets_mirror.js`) |
| **Gate 2** | Real WebOTP SMS Delivery with Android Format & Neutral Enumeration Defense | **PASSED** | 8/8 Tests passing (`scripts/test_sinks_and_auth_e2e.js`) |
| **Gate 3** | OWASP ASVS L2 & NIST SP 800-63B Authentication Hardening | **PASSED** | 9/9 Tests passing (`scripts/test_security_asvs.js`) |
| **Gate 4** | Concurrency, Race Condition, & Idempotency Deduplication Defense | **PASSED** | 3/3 Tests passing (`scripts/test_concurrency_race.js`) |
| **Gate 5** | Purpose-Built Mobile UI, Touch Accessibility, & Zero Emoji/Color Violations | **PASSED** | 42/42 Playwright tests passing, 0 emojis, WCAG AA compliant |
| **Gate 6 (STOP GATE)** | Push feature branch to GitHub (`feat/three-tabs-comic-theme`) | **HOLD** | Stopped at gate; awaiting user explicit approval |
| **Gate 7 (STOP GATE)** | Merge to `main` | **HOLD** | Restricted; work strictly on branches |
| **Gate 8 (STOP GATE)** | Production Deployments / Shared DB Migrations | **HOLD** | Restricted |
