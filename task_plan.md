# Task Plan: End-to-End Functional Hardening & Pre-Deployment Security Review

## Goal
Make the CSC 2.0 application fully functional end-to-end (form submission -> Postgres -> outbox -> Apps Script -> Sheet mirror; OTP delivery via SMS/Email sinks and real providers; OWASP ASVS L2 / NIST SP 800-63B login/signup security; mobile-first offline PWA with IndexedDB) and verified through real database, security, and multi-viewport automated testing, ready for pre-deployment security review.

## Scope Boundaries
- **In Scope:**
  - Section 0: Systematic diagnosis of form submission pipeline & OTP paths (`docs/INTEGRATION_DIAGNOSIS.md`).
  - Section 1: Secure OTP delivery (Android WebOTP auto-fill, CSPRNG, Argon2/HMAC pepper, lockout caps in Postgres, dev-only sinks, visible outbox, docs/SMS_GATEWAY.md).
  - Section 2: Google Sheet Mirror (Apps Script Web App, 3-tier header, repeatable tabs, hidden _Index/_Schema/_Log, HMAC signing, LockService, latency & quota benchmarks).
  - Section 3: OWASP ASVS Level 2 Auth (Argon2id, breached password list, MFA OTP, HttpOnly cookies, session rotation & reuse detection, CSRF/origin checks, rate limits in Postgres, threat model refresh in docs/03).
  - Section 4: Mobile-First Offline PWA (Hide redundant in-page Back buttons on mobile, manifest & service worker, IndexedDB outbox/drafts/task cache, 409 conflict handling, 48px touch targets).
  - Section 5: Rigorous Test Gates (Two-instance concurrent API tests, Apps Script contract tests, Playwright mobile 360/390px + desktop EN/HI, full backend suite, SAST/secret scans, docs/MILESTONE_FUNCTIONAL_REPORT.md, docs 02-05 and RELEASE_REGISTER updates, PR readiness).
- **Out of Scope / Restrictions:**
  - NO real beneficiary/patient data (strictly synthetic).
  - NO hardcoded secrets or API keys in git/chat/docs.
  - NO push to remote `main`, NO merge, NO deployment without explicit user approval.
  - Strictly adhere to color rules (no unauthorized blues or dark greens) and non-stigma guidelines.

## Phases

### Phase 0: Diagnosis & Pipeline Tracing (`docs/INTEGRATION_DIAGNOSIS.md`)
- [x] Reproduce and trace Form Submit -> Postgres -> Outbox -> Worker -> Apps Script -> Sheet.
- [x] Reproduce and trace OTP Request -> Outbox -> Provider / Local Sink -> Client.
- [x] Check mock vs real adapter configuration guards (strictly impossible outside local profile).
- [x] Write `docs/INTEGRATION_DIAGNOSIS.md` with verified logs, queue states, and env var names.
- **Status:** complete

### Phase 1: Robust OTP Delivery & Dev Sinks
- [x] Review & verify SMS provider specs (Android gateway adapter, WebOTP format `@origin #code`, `autocomplete="one-time-code"`, `inputmode="numeric"`).
- [x] Implement/verify dev-only local mail/SMS sink dashboard, strictly restricted to local profile.
- [x] Ensure 6-digit CSPRNG, HMAC pepper, 10-min TTL, 5-attempt lockout, DB rate-limiting caps, constant-time verification, neutral enumeration-safe responses.
- [x] Outbox status lifecycle (ACCEPTED -> DELIVERED / FAILED) with bounded backoff + jitter and dead-letter queue.
- [x] Update `docs/SMS_GATEWAY.md`.
- **Status:** complete

### Phase 2: Google Sheets Mirror Architecture
- [x] Verify/deploy Google Apps Script Web App for single workbook mirror (`scripts/apps_script/Code.gs`).
- [x] Design 3-tier header on `Clients` sheet (Title, Category Bands, Field Headers) + repeat tabs (`Family_Members`, `Referral_Requests`, `Follow_Up_Visits`, `Planned_Services`) + system tabs (`_Index`, `_Schema`, `_Log`).
- [x] Implement HMAC body signing with timestamp, nonce, event_id idempotency, LockService, formula-injection sanitization.
- [x] Benchmark mirror latency and queue processing under concurrent load (50 concurrent requests, p95 150ms).
- **Status:** complete

### Phase 3: Login & Signup Security Hardening (OWASP ASVS L2 / NIST SP 800-63B)
- [x] Implement Argon2id password hashing with length-based policy (min 12 chars) + breached/common password check.
- [x] Session security: HttpOnly, Secure, SameSite cookies; rotating refresh tokens with reuse detection; device inventory and revocation endpoints.
- [x] CSRF tokens, strict CORS, Security Headers (CSP, HSTS, frame-ancestors, Permissions-Policy).
- [x] Database-backed rate limits & lockout per account/IP/device.
- [x] Update threat model in `docs/03_SECURITY_AND_ACCESS_DOCUMENT.md`.
- [x] SAST / secret scanning / endpoint authorization matrix (401/403/404).
- **Status:** complete

### Phase 4: Mobile-First & Offline Resilience
- [x] Eliminate in-page redundant Back button on mobile records/follow-up screens (test at 360px & 390px).
- [x] Configure PWA manifest and compatible Service Worker for Next.js.
- [x] Migrate client cache, drafts, and mutation queue from localStorage to scoped IndexedDB.
- [x] Background/foreground sync with 409 conflict resolution and zero account queue leakage.
- [x] Verify 48px touch targets and layout stability.
- **Status:** complete

### Phase 5: Verification Gates & Documentation
- [ ] Run full backend integration suite (55+ tests) with real Postgres.
- [ ] Run two-instance concurrency and race condition tests.
- [ ] Run Apps Script contract and security tests.
- [ ] Run complete Playwright suite across mobile (360px, 390px) and desktop in EN and HI.
- [ ] Run lint, tsc, a11y (axe), emoji, and color audit.
- [ ] Compile `docs/MILESTONE_FUNCTIONAL_REPORT.md` and update `docs/02`, `docs/03`, `docs/04`, `docs/05`, and `RELEASE_REGISTER.md`.
- [ ] Prepare clean PR on git branch.
- **Status:** pending

## Errors & Incidents Log
| Date | Component | Error Description | Attempt | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| 2026-11-05 | Playwright | Strict mode violation on `SYNTHETIC DEMO` locator | 1 | Refined locator to exact match / first() |
| 2026-11-05 | Playwright | Hindi switch on admin assertion 6 failed | 1 | Set session and explicitly trigger header toggle |
