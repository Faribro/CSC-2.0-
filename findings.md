# Technical Findings & Architecture Research

## Current System State

### 1. Backend Authority API (Spring Boot 3.4.1, Java 21)
- **Database:** PostgreSQL 16.15 running locally (`csc2_dev` database).
- **Outbox System:** Currently has `OutboxWorker` (or equivalent) polling `outbox_event` or transactional tables. Let's inspect the exact tables and workers.
- **Auth System:**
  - Field users: OTP via SMS (`/api/v1/auth/field/send-otp`, `/api/v1/auth/field/verify-otp`).
  - State Team / Leadership: Email OTP and Password flow in `EvaluationService` / `EvaluationController`.
- **Profiles:**
  - `local`: uses dev sinks / mock adapters.
  - `prod` / non-local: must reject mock adapters and enforce real adapters.

### 2. Frontend (Next.js 15, React 19, TypeScript)
- Bilingual EN/HI.
- Storage currently partially uses `localStorage` for some cached state, needs clean IndexedDB offline store.
- Forms submit to backend `/api/v1/forms` or `/api/v1/clients`.

### 3. Google Sheet Mirror
- Code exists in `scripts/apps_script/Code.gs`.
- Needs real single-workbook layout with 3-tier header, repeatable tabs, system tabs (`_Index`, `_Schema`, `_Log`), HMAC signing, and latency benchmarks.

### 4. Security Baseline
- Need Argon2id password hashing parameters documented.
- Need breached password dictionary check.
- Need HttpOnly, Secure, SameSite session cookies and rotating refresh tokens with reuse detection.
- Need CSRF and security headers.
