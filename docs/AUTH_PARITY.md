# Authentication & Onboarding Parity Specification

This document provides a flow-by-flow architectural comparison between the legacy TypeScript Next.js implementation (`Faribro/Childcare-Support---Phase-3-`, branch `main`) and the modern production-grade Spring Boot 3.3 + PostgreSQL 16 engine implemented in CSC 2.0.

---

## 1. Executive Summary & Flow Matrix

| Flow | Old App (`Childcare-Support-Phase-3-`) | CSC 2.0 (Spring Boot + PostgreSQL) | Strategy & Weakness Remediations |
| :--- | :--- | :--- | :--- |
| **State Manager Signup** | Next.js API route (`src/app/api/auth/state-team/register/route.ts`), in-memory/Supabase store (`src/lib/server/stateTeamAuthChallenge.ts`) | Spring Boot `@RestController` `/api/v1/auth/state-manager/register`, durable Flyway schema `csc2.state_registration` | **ADAPT & HARDEN**: Support single-name identities; validate domain allowlist from YAML config; email verification proves ownership, not authority. |
| **Email Verification & OTP** | 6-digit numeric OTP, 10 min expiry, in-memory Map for lockout (`sessionService.ts`), salt + sha256 hash | Durable `csc2.otp_challenge` table, constant-time compare, 5 attempts max with durable lock, zero OTP in subjects/logs | **REPLACE**: Eliminate in-memory lockout vulnerabilities. Ensure distributed multi-replica protection across all instances. |
| **State Code Generation** | Random `ALN-<STATE>-<XXXX>-<XXXX>` using `SAFE_CHARSET`, SHA-256 with random salt (`invitationCrypto.ts`) | Unambiguous charset `2-9, A-Z (excl. 0, O, 1, I)`, HMAC-SHA256 with server-side REQUIRED secret pepper (`csc2.state_code`) | **HARDEN**: One code per state; store only HMAC verifier; plaintext sent once via email; resend uses encrypted envelope without rotating code. |
| **Admin Approval** | Admin UI with pending list, approve/reject POST routes (`src/app/api/admin/registrations/[id]/approve`) | Role-gated authenticated POST `/api/v1/admin/registrations/{id}/approve`, deep link with state token, audit event | **ADAPT**: Strictly reject GET mutations. Deep links take administrator to an authenticated review screen where explicit POST is dispatched. |
| **Field Worker Onboarding** | Google OAuth 2.0 (`googleAuth.ts`), signed onboarding ticket cookie, Welcome Kite modal (`WelcomeKiteOnboardingModal.tsx`) | Google OAuth 2.0 (openid, email, profile), signed HMAC onboarding ticket, single mobile-first onboarding screen | **ADAPT**: State is locked by state code; atomic single redemption per user; returning logins bypass redemption without decrementing quota. |
| **Session Architecture** | Stateless HMAC tokens in cookies (`sessionService.ts`), in-memory session tracking | Server-side `csc2.session` table, HttpOnly Secure SameSite=Lax cookie, refresh token rotation with reuse detection | **REPLACE**: Server-enforced revocation, sliding idle expiry (30 days), absolute max lifetime, "Sign Out Everywhere" endpoint. |
| **Email Delivery** | Nodemailer with direct SMTP/Resend (`emailProvider.ts`), fallback to mock logger | Transactional `csc2.notification_outbox`, resilient asynchronous workers, fail-closed in production | **REPLACE**: Decouple request path from mail transport; support Apps Script gateway, SMTP, Resend; eliminate emoji glyphs. |

---

## 2. Flow 1: State Manager Registration & OTP Verification

### Old App Implementation
- **Source Files**:
  - `src/app/api/auth/state-team/register/route.ts`
  - `src/app/api/auth/state-team/verify-otp/route.ts`
  - `src/lib/server/stateTeamAuthChallenge.ts`
  - `src/lib/server/onboardingStore.ts`
- **Mechanism**:
  - Receives `firstName`, optional `lastName`, `workEmail`, `requestedState`, `organization`.
  - Generates a 6-digit numeric OTP and salted SHA-256 hash.
  - Stored in `MemoryOnboardingStore` or Supabase REST table `state_team_registrations`.
  - Checks domain against `CANONICAL_STATE_DOMAINS` allowlist; if matched, marks pre-approved.
- **Weaknesses Identified**:
  - In-memory challenge store fell back to memory when Supabase credentials were not active.
  - Lockout tracking relied on local process memory (`loginAttemptsMap`), enabling an attacker to bypass brute-force limits by distributing requests across serverless container instances.
  - Plain SHA-256 was used without a server-side pepper secret.

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.domain.StateRegistration`
  - `org.allianceindia.csc2.domain.OtpChallenge`
  - `org.allianceindia.csc2.service.StateManagerAuthService`
  - `org.allianceindia.csc2.controller.StateManagerAuthController`
- **Database Schema**:
  - `csc2.state_registration`: Stores identity, organization, email verification timestamp, approval state (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`).
  - `csc2.otp_challenge`: Durable OTP challenge record with `email`, `otp_hash`, `salt`, `attempts`, `expires_at`, `consumed_at`.
- **Invariants**:
  - Single-name identity support (optional `last_name`).
  - Durable sliding window rate limiter (`csc2.auth_rate_limit`) across all backend API instances.
  - Constant-time verification (`MessageDigest.isEqual`) to prevent timing side channels.
  - Verification of OTP proves email ownership, NOT state administrative authority. If not on allowlist, user enters `PENDING_APPROVAL` and triggers an admin notification.

---

## 3. Flow 2: State Code Generation & Protected Resend

### Old App Implementation
- **Source Files**:
  - `src/lib/server/invitationCrypto.ts`
  - `src/app/api/auth/state-team/invitation/issue/route.ts`
- **Mechanism**:
  - Generates structured token: `ALN-<STATE>-<XXXX>-<XXXX>` with `crypto.randomBytes`.
  - Alphabet: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (excludes `0, O, 1, I`).
  - Encrypted envelope used AES-256-GCM.
- **Weaknesses Identified**:
  - Re-issuance logic in `issue/route.ts` lacked atomic multi-user collision guards if two managers registered concurrently for the same state.
  - Potential to rotate an existing active state code upon simple OTP resend.

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.domain.StateCode`
  - `org.allianceindia.csc2.service.StateCodeService`
- **Database Schema**:
  - `csc2.state_code`: `state` (UNIQUE for active code), `code_verifier` (HMAC-SHA256 with REQUIRED server-side pepper `app.security.state-code-pepper`), `status` (`ACTIVE`, `ROTATED`, `REVOKED`), `max_redemptions` (default 50), `redemption_count`, `expires_at` (default 30 days).
- **Invariants**:
  - Strict **One Active Code per State**. If a state already has an active code, signup does NOT rotate or generate a new code.
  - Verifier uses `HMAC-SHA256(normalized_code, pepper)`. The pepper is injected via environment variable and fails closed if missing.
  - Resending OTP or code envelope re-encrypts the existing code reference without mutating the active state code verifier.

---

## 4. Flow 3: Administrator Review & Approval

### Old App Implementation
- **Source Files**:
  - `src/app/api/admin/registrations/route.ts`
  - `src/app/api/admin/registrations/[id]/approve/route.ts`
  - `src/app/api/admin/registrations/[id]/reject/route.ts`
  - `src/app/supervisor/registrations/page.tsx`
- **Mechanism**:
  - Listed pending state team registrations.
  - Administrator triggered POST `/approve` or `/reject`.
  - Dispatched approval email to the state manager.
- **Weaknesses Identified**:
  - Notification emails sent in the HTTP request thread; if mail server timed out, the request hung.
  - Lack of deep link token validation: receiving an email should never infer administrative session.

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.controller.AdminRegistrationController`
  - `org.allianceindia.csc2.service.AdminRegistrationService`
- **Invariants**:
  - Deep link in notification email directs to `/admin/registrations?id={id}`, requiring full administrator authentication.
  - Approvals and rejections are strictly authenticated `POST` endpoints. `GET` requests never mutate state.
  - Every action appends an immutable audit event to `csc2.audit_log` and enqueues an applicant notification to `csc2.notification_outbox`.

---

## 5. Flow 4: Field Worker Onboarding & Google OAuth

### Old App Implementation
- **Source Files**:
  - `src/lib/server/googleAuth.ts`
  - `src/app/api/auth/google/login/route.ts`
  - `src/app/api/auth/google/callback/route.ts`
  - `src/app/api/auth/field-user/complete-onboarding/route.ts`
  - `src/components/auth/WelcomeKiteOnboardingModal.tsx`
- **Mechanism**:
  - Initiates Google OAuth with minimal scopes: `openid`, `email`, `profile`.
  - On callback, checks if user profile exists in `field_user_profiles`.
  - If existing, establishes session immediately. If new, sets signed cookie `field_onboarding_ticket` and opens Welcome Kite modal.
  - Modal prompts for: `First Name`, `Last Name`, `State`, `District`, `State Invitation Code`.
  - Calls PostgreSQL function `redeem_state_team_invitation` using row-level locking (`FOR UPDATE`).
- **Weaknesses Identified**:
  - Next.js Edge JWT tokens lacked server-side revocation capability.
  - Redemption count could theoretically race if calling external Supabase RPC over network without serializable transactions.

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.domain.AppUser`
  - `org.allianceindia.csc2.domain.FieldProfile`
  - `org.allianceindia.csc2.service.FieldUserOnboardingService`
  - `org.allianceindia.csc2.controller.FieldUserOnboardingController`
- **Frontend Components**:
  - `frontend/components/auth/FieldUserOnboardingModal.tsx`
  - `frontend/app/sign-in/page.tsx`
- **Invariants**:
  - Minimal Google OAuth scopes (`openid`, `email`, `profile`). Local development includes an identity stub.
  - Atomic code redemption using `SELECT ... FOR UPDATE` in PostgreSQL.
  - State is strictly verified against the state assigned to the code.
  - Returning logins never re-consume or decrement the code quota.
  - Single mobile-first onboarding screen directing straight to `/work`.

---

## 6. Flow 5: Persistent Server-Side Sessions & PWA Readiness

### Old App Implementation
- **Source Files**:
  - `src/lib/server/sessionService.ts`
  - `src/components/pwa/PwaRegistration.tsx`
- **Mechanism**:
  - Signed HMAC cookie `evaluation_session_token` with 8-hour fixed TTL.
- **Weaknesses Identified**:
  - No server-side session table: impossible to revoke individual sessions, detect stolen tokens, or implement "Sign Out Everywhere".
  - Fixed short TTL did not provide mobile caseworkers with a seamless "mobile-app feel" (requiring frequent re-authentications in the field).

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.domain.UserSession`
  - `org.allianceindia.csc2.service.SessionManagementService`
  - `org.allianceindia.csc2.repository.UserSessionRepository`
- **Database Schema**:
  - `csc2.session`: `id`, `user_id`, `refresh_token_hash`, `device_label`, `created_at`, `last_used_at`, `idle_expires_at` (sliding 30 days), `absolute_expires_at` (hard cap 90 days), `revoked_at`.
- **Invariants**:
  - Session cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`.
  - Refresh rotation with **reuse detection**: if an old refresh token is reused, all sessions for that user are immediately revoked.
  - Zero tokens stored in `localStorage`.
  - Sign-out warns about unsent offline drafts and preserves them without wiping; switching accounts never leaks drafts across identities.
  - PWA manifest, service worker offline shell, 44-48px touch targets, safe-area insets, and instant resume.

---

## 7. Flow 6: Transactional Notification Outbox

### Old App Implementation
- **Source Files**:
  - `src/lib/server/emailProvider.ts`
- **Mechanism**:
  - Immediate inline Nodemailer transmission.
- **Weaknesses Identified**:
  - Network jitter caused 500 errors in user signup requests.
  - No durable retry loop or dead-letter queue.
  - Emojis in subject lines and HTML bodies caused rendering bugs and spam triggers.

### CSC 2.0 Architecture
- **Backend Components**:
  - `org.allianceindia.csc2.domain.NotificationOutbox`
  - `org.allianceindia.csc2.service.NotificationService`
  - `org.allianceindia.csc2.repository.NotificationOutboxRepository`
- **Database Schema**:
  - `csc2.notification_outbox`: `id`, `type`, `recipient`, `template`, `payload`, `status` (`PENDING`, `ACCEPTED`, `DELIVERED`, `FAILED`), `attempts`, `last_attempt_at`, `last_error_code`.
- **Invariants**:
  - Atomic enqueuing within business transaction: email failure leaves zero orphaned challenges or records.
  - Adapters: Google Apps Script gateway (credential in body), SMTP, Resend, and local synthetic mock.
  - Plain, clean text formatting: zero emojis, clear visual hierarchy, accessible bilingual EN/HI templates.
