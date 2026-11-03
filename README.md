# CSC 2.0 Follow-Up Platform

> **Care & Support Centre Follow-Up & Beneficiary Linelist Platform**  
> Core Question: *"Who needs action today, why, who owns it, and what completes it?"*

---

## 1. System Architecture

CSC 2.0 is designed as a secure, role-governed follow-up engine for Care & Support Centres:
- **Frontend:** Next.js 15 (App Router, React 19, Tailwind CSS) operating as a thin BFF with client-side state caching, IndexedDB draft recovery, and bilingual UI (English / Hindi).
  - **Enketo-Style Centered CRF Form:** Complete 187-field intake instrument across Sections A through J, full XLSForm relevance and skipping engine (`lib/crfLogic.ts`), repeat groups for Family Members (B2), Referral Requests (D5), and Planned Services (J5), horizontal progress navigation tabs with error counters, and clean paper layout (`max-w-4xl mx-auto`) without distracting sidebars.
  - **Zero-Emoji Architecture:** 100% of emojis eliminated from source code, translations, and rendered DOM, replaced with pinned, verified `lucide-react@0.475.0` iconography. Enforced via `scripts/lint_no_emoji.js` and automated browser DOM assertions (`scripts/verify_controls_and_emoji.js`).
  - **Record View / Edit & Audit History:** Dual-mode single-page CRF supporting read-only View and permission-gated Edit with optimistic concurrency (`expectedVersion`), client-side diff preview, and revision history timeline.
- **Backend API:** Java 21 with Spring Boot 3.4, Spring Security stateless JWT authentication, and transactional integrity.
  - **Legacy Onboarding & Session Engine (Rebuilt):** Flyway migrations `V2` (profile revisions), `V3` (onboarding & session persistence), and `V4` (audit alignment).
  - **State Manager Flow:** Work email signup, domain allowlist, HMAC-SHA256 state code generation (`ALN-<STATE>-XXXX-XXXX`), 6-digit OTP (10 min expiry, 5 attempt lockout), authenticated POST admin approval.
  - **Field Worker Flow:** Minimal-scope Google sign-in, atomic single-use state code redemption with pessimistic locking `findByCodeVerifierForUpdate`.
  - **Persistent Sessions (RFC 6819):** HttpOnly Secure SameSite cookie, server-side session persistence in `csc2.session`, 30-day sliding idle expiry with 90-day absolute cap, refresh token rotation with user-wide revocation on token reuse detection.
- **Database:** PostgreSQL 16 with relational schema, Flyway migrations, pessimistic concurrency locks on tasks, and immutable append-only audit logging.
- **Asynchronous Mirroring:** Transactional Outbox pattern asynchronously synchronizing client registrations, profile revisions, and encounters to Google Sheets via Google Apps Script WebApp.

---

## 2. Prerequisites

| Tool | Version Requirement | Local Dev Verification |
|------|--------------------|------------------------|
| **Java** | OpenJDK 21 LTS | `java -version` |
| **Maven** | Apache Maven 3.9+ | `mvn -v` |
| **Node.js** | Node.js 18+ (tested on v24.11) | `node -v` |
| **PostgreSQL** | PostgreSQL 16.x | `psql -V` on `localhost:5432` |
| **Python** | Python 3.10+ | `python --version` (for seeding script) |

---

## 3. One-Command Local Startup

### Windows (PowerShell)
```powershell
powershell -File scripts/dev.ps1
```

### macOS / Linux (Bash)
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

The script automatically:
1. Verifies Java 21, Maven 3.9, Node.js, and PostgreSQL.
2. Applies Flyway migrations (`V1__baseline_schema.sql`).
3. Runs idempotent local seed data generator (`scripts/seed_synthetic_data.py`), seeding 33 synthetic clients, family members, tasks, and 6 test users.
4. Starts Spring Boot backend on `http://localhost:8080`.
5. Starts Next.js production frontend on `http://localhost:3000`.
6. Validates health endpoints and prints live platform URLs. Zero secrets printed.

---

## 4. Platform Routes & Permissions

| Route | Purpose | Permitted Roles | Notes |
|-------|---------|-----------------|-------|
| `/` | Root Entry | Public | Redirects: unauthenticated &rarr; `/sign-in`, authenticated &rarr; `/work` |
| `/sign-in` | Test Identity Selector | Public (Local Only) | Clearly labeled *"LOCAL TEST IDENTITY – SYNTHETIC DATA"*. Fails closed in production. |
| `/work` | My Work (Worklist) | `field_worker`, `supervisor`, `leadership`, `administrator` | Today, Overdue, Upcoming follow-up tasks. Clicking a task opens its client on Follow-up tab. |
| `/clients` | Beneficiary Directory | All authenticated roles | Filter by center, search by name/ref/ART. Direct link to `+ New Registration`. |
| `/clients/new` | Single-Page Intake CRF | `field_worker`, `supervisor`, `administrator` | Full Sections A–H & J on one page. Sticky index runner, IndexedDB auto-save, modal review before submit. |
| `/clients/[id]` | Client Record Page | All authenticated roles | Deep-linkable tabs: `?tab=registration` (baseline CRF) & `?tab=follow-up` (visits, tasks, services). Preserves tab on refresh. |
| `/reports` | Metrics & Analytics | `supervisor`, `state_reviewer`, `leadership`, `administrator` | Real aggregate counts: Active Clients, Tasks Due, Overdue, Completed Encounters, Center Breakdown. |
| `/admin` | System Reconciliation | `administrator` strictly | Outbox queue monitor, Google Sheets mirror status, Center scopes, Immutable audit viewer. |
| `/not-permitted`| 403 Forbidden Page | Any | Helpful error page explaining why a role cannot view a resource with return link. |

---

## 5. Seeded Test Identities

All pre-seeded test accounts use the password: `TestPass123!`

| Username | Full Name | Canonical Role | Jurisdiction / Center Scope |
|----------|-----------|----------------|-----------------------------|
| `fw_delhi_a` | Ananya Sharma | `field_worker` | `CENTER_DELHI_01` (LNJP Hospital Delhi) |
| `fw_delhi_b` | Ravi Kumar | `field_worker` | `CENTER_DELHI_01` (LNJP Hospital Delhi) |
| `sup_delhi` | Dr. Sunita Rao | `supervisor` | `CENTER_DELHI_01` (Delhi Center Worklist) |
| `state_rev_delhi`| Vikram Mehta | `state_reviewer`| `STATE_DELHI` (State-level Linelist & Reports) |
| `admin_national` | Pooja Verma | `administrator`| `ALL` (National Scope & Admin Operations) |
| `lead_national` | Director Rajesh Sen | `leadership` | `ALL` (National Scope View-Only Oversight) |

---

## 6. End-to-End Walkthrough & Verification

### Automated Test Suite Commands:

1. **Zero-Emoji Static & Source Lint:**
   ```bash
   node scripts/lint_no_emoji.js
   ```
   Asserts zero emojis across all frontend TypeScript / TSX components, JSON translations, and definitions.

2. **Control Deduplication & Rendered DOM Emoji Scan:**
   ```bash
   node scripts/verify_controls_and_emoji.js
   ```
   Asserts zero emojis in the live rendered DOM across all routes (`/sign-in`, `/work`, `/clients`, `/clients/new`, `/clients/[id]`) in both English and Hindi. Asserts exactly 1 primary action per page (`+ New Registration` on `/work`, 'View' and 'Edit' actions per row on `/clients`).

3. **Playwright End-to-End Walkthrough (4 Matrices):**
   ```bash
   node scripts/run_walkthrough.js
   ```
   Automated Playwright test suite covers the complete workflow across **4 matrices**:
   - Desktop English (`1280x820`)
   - Mobile English (`390x844`)
   - Desktop Hindi (`1280x820`)
   - Mobile Hindi (`390x844`)

   Each run asserts every step and outputs 44 evidence screenshots in `evidence/walkthrough/`:
   1. `*_01_signin.png` &mdash; Test identity selector & security banner
   2. `*_02_my_work.png` &mdash; My Work worklist with today/overdue/upcoming tabs
   3. `*_03_open_task_followup.png` &mdash; Client detail page deep-linked to Follow-up tab
   4. `*_04_record_attempt.png` &mdash; Recorded contact attempt with channel & outcome
   5. `*_05_record_encounter.png` &mdash; Clinical visit (Section I) with explicit `COMPLETE` action
   6. `*_06_plan_service.png` &mdash; Next planned action (Section J5 canonical codes)
   7. `*_07_clients_directory.png` &mdash; Beneficiary linelist table
   8. `*_08_registered_new_client.png` &mdash; Single-page registration submission with success banner
   9. `*_09_found_new_client.png` &mdash; Linelist search finding newly registered client
   10. `*_10_switch_language_hi.png` &mdash; Bilingual switch (EN &harr; HI)
   11. `*_11_sign_out.png` &mdash; Sign out preserving local drafts

4. **Spring Boot Backend Integration Suite (Real PostgreSQL):**
   ```bash
   cd backend && mvn test
   ```
   Runs 29 integration tests across Flyway migrations, task concurrency, outbox dispatch, optimistic locking (`expectedVersion`), 409 conflict detection, OTP challenge/lockout, atomic state code redemption, and refresh token reuse revocation.

---

## 7. Non-Negotiable Rules & Clinical Safety

1. **Synthetic Data Only:** Real beneficiary data or personally identifiable health information must never be committed, logged, or entered.
2. **Clinical Safety:** No invented clinical rules, due dates, or scoring thresholds. Task reasons are strictly derived from canonical J5 purpose codes ('1'..'13') or administrator labels. Age rules are tagged `[OPEN]` for clinical review.
3. **Explicit Task Completion:** A follow-up task closes **ONLY** through an encounter with the explicit action `COMPLETE`. Contact attempts keep tasks open.
4. **Explicit Delivered Service:** A planned service becomes `DELIVERED` **ONLY** via an explicit delivered-service record.
5. **Document Declarations:** Physical sighting attestations only (Yes/No); no file uploads.
6. **Outbox HTTP Limitation:** Google Apps Script WebApp 302 redirects strip custom headers (`Authorization`, `X-`); authentication secret is transmitted inside the request body payload.
7. **Production Release Guard:** Do not push to remote `main`, merge branches, or deploy to production without explicit user authorization.
