# Task Plan: Three Top-Level Tabs, Field Phone Verification & Calm Comic Theme

## Goal Statement
Rework entry and access into three top-level tabs (Forms, Submitted Surveys, Evaluation) with a simple phone-verified screen for field users, SMS delivery architecture via Android gateway (TextBee candidate analysis), state team/leadership access in Evaluation, and a calm, friendly "comic" design token palette (no blue, no dark green, WCAG 2.2 AA compliant). Backed by PostgreSQL Flyway migrations, Spring Boot REST APIs, and automated Playwright walkthrough.

## Phases
- [ ] Phase 1: Planning, Reference Analysis & TextBee Research
  - [ ] 1.1 Create planning files (`task_plan.md`, `findings.md`, `progress.md`)
  - [ ] 1.2 Inspect reference project in `D:\OneDrive - INDIA HIV AIDS ALLIANCE\Desktop\Software Development\Childcare-Support-Phase-3(1)`
  - [ ] 1.3 Research TextBee documentation, terms, rate limits, Android gateway specs, and write `docs/SMS_GATEWAY.md`
  - [ ] 1.4 Validate contrast and design tokens for Comic theme
- [ ] Phase 2: Design Tokens & Comic Theme Implementation
  - [ ] 2.1 Implement design tokens in `frontend/styles/tokens.css` and `frontend/tailwind.config.ts`
  - [ ] 2.2 Create token WCAG 2.2 AA contrast checker `scripts/verify_wcag_tokens.js`
  - [ ] 2.3 Create banned colors linter `scripts/lint_no_banned_colors.js`
  - [ ] 2.4 Update all components to use the comic palette & tokens (remove raw hex, blue, dark-green)
- [ ] Phase 3: Flyway Data Model & Domain Entities (Flyway V5)
  - [ ] 3.1 Create `V5__three_tabs_field_phone_and_evaluation.sql`
  - [ ] 3.2 Create entities: `FieldUser`, `FieldRoster`, `PhoneOtpChallenge`, `DeviceSession`, `SmsOutbox`, `StateReference`, `LeadershipAllowlist`, `PasswordCredential`
  - [ ] 3.3 Create corresponding JPA repositories
- [ ] Phase 4: SMS Provider Interface & Gateway Adapters
  - [ ] 4.1 Define `SmsProvider` interface & `SmsDeliveryResult`
  - [ ] 4.2 Implement `TextBeeSmsAdapter`
  - [ ] 4.3 Implement `MockSmsAdapter` (local profile only, fail closed outside local)
  - [ ] 4.4 Implement `LicensedProviderStubAdapter`
  - [ ] 4.5 Implement transactional `SmsOutboxService` & retry worker
- [ ] Phase 5: Field User Phone Auth & Verification Engine
  - [ ] 5.1 Implement `FieldUserAuthService` (send OTP, verify OTP, neutral response for unrostered, rate limits)
  - [ ] 5.2 Implement `FieldUserAuthController` (`/v1/auth/field/...`)
  - [ ] 5.3 Enforce field user scope: `field_user_id` ownership, PENDING submission gate, own records only
- [ ] Phase 6: Evaluation Tab: State Team & Leadership Engine
  - [ ] 6.1 State team signup, ISO 3166-2:IN state codes, email verification, Argon2id passwords
  - [ ] 6.2 Leadership allowlist and OTP on fresh login
  - [ ] 6.3 State team roster management (single, CSV bulk, suspend, delete)
  - [ ] 6.4 State team supervision linelist and leadership aggregates
- [ ] Phase 7: Frontend 3-Tab Architecture & UI Rebuild
  - [ ] 7.1 Rebuild AppShell with 3 top-level tabs (bottom tab bar on mobile, top tabs on desktop)
  - [ ] 7.2 Implement Forms tab (Start New Registration, Drafts, Waiting, Submitted, My follow-ups, Resume/Delete)
  - [ ] 7.3 Implement Submitted Surveys tab (field user's own submissions, search, pagination, View/Edit)
  - [ ] 7.4 Implement Evaluation tab (State Team / Leadership login, signup, roster management, supervision)
  - [ ] 7.5 Implement Field User First-Time Phone Verification modal / screen
- [ ] Phase 8: Testing & Verification Suite
  - [ ] 8.1 Run token WCAG contrast checker
  - [ ] 8.2 Run banned colors linter
  - [ ] 8.3 Run Spring Boot backend integration test suite against PostgreSQL
  - [ ] 8.4 Run Playwright end-to-end walkthrough (mobile & desktop, English & Hindi, 44+ screenshots)
- [ ] Phase 9: Documentation Updates & Pull Request
  - [ ] 9.1 Update `docs/SMS_GATEWAY.md`
  - [ ] 9.2 Update `docs/AUTH_PARITY.md`
  - [ ] 9.3 Update `docs/02_TECHNICAL_ARCHITECTURE_DOCUMENT.md`
  - [ ] 9.4 Update `docs/03_SECURITY_AND_ACCESS_DOCUMENT.md`
  - [ ] 9.5 Update `docs/04_FRONTEND_SPECIFICATION_DOCUMENT.md`
  - [ ] 9.6 Update `docs/05_FEATURE_TICKET_LIST.md`
  - [ ] 9.7 Update `MOBILE_DESIGN_SYSTEM_CONTRACT.md`
  - [ ] 9.8 Update `README.md` and `RELEASE_REGISTER.md`
  - [ ] 9.9 List of `[OPEN]` decisions and create PR branch commit

## Key Requirements & Constraints
- Synthetic data only. Zero real beneficiary or caseworker information.
- Secrets ONLY as environment variables (never in chat, code, logs or docs).
- No invented clinical rules. Derive strictly from canonical codes.
- Zero emojis in source code or rendered DOM; Lucide icons only.
- Strict color rules: no blue and no dark green anywhere; calm comic palette via tokens.
- All backend tests run against real PostgreSQL.
- Paste actual command output for every verification claim.
