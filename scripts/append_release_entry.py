# scripts/append_release_entry.py
with open('RELEASE_REGISTER.md', 'r', encoding='utf-8') as f:
    text = f.read()

new_release = '''

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
'''

if '## Release Entry: End-to-End Functional Hardening' not in text:
    with open('RELEASE_REGISTER.md', 'a', encoding='utf-8', newline='') as f:
        f.write(new_release)
    print('SUCCESS: Appended release entry to RELEASE_REGISTER.md')
else:
    print('Already present')
