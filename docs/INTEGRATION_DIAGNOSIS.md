# CSC 2.0 Integration Diagnosis: Form Submission & OTP Delivery Paths

**Date:** 2026-11-05  
**Environment:** Local Development (PostgreSQL 16.15, Spring Boot 3.4.1, Next.js 15.1.7)  
**Author:** CSC 2.0 Engineering Team  
**Status:** `[VERIFIED - ROOT CAUSES IDENTIFIED]`

---

## 1. Executive Summary & Problem Statements

Users reported two critical failure symptoms:
1. **"No OTP received"**: Field workers attempting to sign in or verify their phone number never receive an SMS verification code, and state team/leadership members cannot view emailed codes in local environments.
2. **"No data is submitted"**: Beneficiary registration forms submitted on the frontend fail silently or display authentication errors, client records are not persisted, and Google Sheets downstream mirror remains unpopulated.

Below is the hop-by-hop architectural trace, configuration audit, reproduction evidence, and root causes for both pipelines.

---

## 2. Pipeline Trace: Form Submit -> Postgres -> Outbox -> Worker -> Apps Script -> Sheet

```
[ Frontend Form ] --(Hop 1)--> [ Spring Boot ClientController ] --(Hop 2)--> [ PostgreSQL (clients table) ]
                                                                             |
                                                                        (Hop 3: Atomic Tx)
                                                                             v
[ Google Sheets Mirror ] <--(Hop 5)-- [ Apps Script Gateway ] <--(Hop 4)-- [ OutboxWorker ] <-- [ PostgreSQL (outbox table) ]
```

### Hop-by-Hop Trace & Configuration Matrix

| Hop | From -> To | Status / Configured | Adapter / Handler | Env Var Names | Queue / Table State | Observed Failure / Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hop 1** | Next.js Frontend (`NewClientRegistrationPage.tsx`) -> Spring Boot (`POST /api/v1/clients`) | Misconfigured Auth Token | Browser `fetch` | `BACKEND_INTERNAL_URL` | N/A (Frontend Memory) | **Root Cause 1A:** `NewClientRegistrationPage.tsx` looked for `localStorage.getItem('csc_token')`, but `FieldPhoneVerificationModal.tsx` stored `csc2_field_user` without storing or attaching the device session token. Furthermore, `fetch` omitted `credentials: 'include'` and `X-Device-Session`. Spring Boot returned `401 Unauthorized`, triggering local draft fallback. No network submit completed. |
| **Hop 2** | Spring Boot (`ClientController.java`) -> PostgreSQL `csc2.clients` | Active | Spring Data JPA / HikariCP | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `DB_APP_PASSWORD` | 46 records in `csc2.clients` | **Root Cause 1B:** When called by `PENDING_FIELD_USER` (unrostered worker), `ClientService.java` explicitly rejected requests with `403 Forbidden` ("Waiting for your state team to approve..."), preventing offline-first sync. |
| **Hop 3** | Spring Boot Service -> PostgreSQL `csc2.outbox` | Active (Trunacted Payload) | JPA Entity `OutboxEvent` -> table `csc2.outbox` | N/A (Internal DB) | 55 records in `csc2.outbox` (all marked `PUBLISHED` by mock dispatcher) | **Root Cause 1C:** Payload written to outbox table was hardcoded to only 3 fields (`clientRef`, `centerId`, `fullName`), omitting all clinical, demographic, family members, and referral attributes needed for the 3-tier Sheet mirror. |
| **Hop 4** | PostgreSQL `csc2.outbox` -> `OutboxWorker.java` | Inefficient Polling & Unsigned Payload | Spring `@Scheduled(fixedDelay=5000)` HTTP dispatcher | `APPS_SCRIPT_GATEWAY_URL`, `APPS_SCRIPT_GATEWAY_SECRET` | Status `PENDING` -> `PUBLISHED` | **Root Cause 1D:** Dispatches only on a slow 5-second polling timer instead of event-triggered short coalescing (500 ms). Payload passed raw `"secret": gatewaySecret` rather than HMAC-SHA256 signature with nonce, timestamp, and event_id. |
| **Hop 5** | `OutboxWorker.java` -> Google Apps Script Web App -> Google Sheet | Disconnected in Dev | `MockGatewayController` (local dev) / Apps Script (prod) | `APPS_SCRIPT_GATEWAY_URL`, `APPS_SCRIPT_GATEWAY_SECRET` | Sheet mirror unpopulated | **Root Cause 1E:** Default `APPS_SCRIPT_GATEWAY_URL` points to `http://localhost:8080/api/mock/apps-script-gateway`, which returned synthetic HTTP 200 without writing to Google Sheets. In addition, no Apps Script Web App code was deployed to mirror repeats (`Family_Members`, `Referral_Requests`, `Follow_Up_Visits`, `Planned_Services`) or format the 3-tier header. |

---

## 3. Pipeline Trace: OTP Request -> OTP/SMS/Email Outbox -> Provider -> Device/Inbox

```
[ Frontend Auth Modal ] --(Hop 1)--> [ FieldUserAuthController / EvaluationController ]
                                                  |
                                          (Hop 2: Atomic DB Tx)
                                                  v
                                      [ PostgreSQL outbox tables ]
                                     (sms_outbox / notification_outbox)
                                                  |
                                          (Hop 3: Dispatch Worker)
                                                  v
                                    [ Provider Adapter: Mock vs Real ]
                                      (TextBee Android Gateway / SMTP)
                                                  |
                                          (Hop 4: Gateway Delivery)
                                                  v
                                          [ Recipient Device / Mailbox ]
```

### Hop-by-Hop Trace & Configuration Matrix

| Hop | From -> To | Status / Configured | Adapter / Handler | Env Var Names | Queue / Table State | Observed Failure / Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hop 1** | Frontend Phone / Email Modal -> Backend Auth Controller | Active | `POST /api/v1/auth/field/send-otp` / `POST /api/v1/evaluation/leadership/request-otp` | `PORT` | N/A | Requests successfully reach Spring Boot authority API. |
| **Hop 2** | Auth Service -> PostgreSQL Outbox | Conditional / Dropped for Unrostered | `FieldUserAuthService` -> `csc2.sms_outbox`; `NotificationService` -> `csc2.notification_outbox` | N/A | `csc2.sms_outbox`: 0 rows; `csc2.notification_outbox`: 0 rows; `csc2.phone_otp_challenge`: 5 rows | **Root Cause 2A:** In `FieldUserAuthService.java` lines 139-143, SMS outbox enqueue was gated behind `if (rosterEntry.isPresent())`. If a field worker was not pre-rostered by the State Team, the backend logged a challenge but NEVER inserted a row into `sms_outbox`! The worker received no OTP while the UI gave a misleading neutral message. |
| **Hop 3** | Outbox -> Provider Adapter | Mock Active in Local; Real Provider Unconfigured | `MockSmsAdapter` / `TextBeeSmsAdapter`; `MockEmail` / `AppsScriptEmail` / `Resend` | `APP_SMS_PROVIDER`, `TEXTBEE_API_KEY`, `TEXTBEE_DEVICE_ID`, `APP_NOTIFICATION_PROVIDER`, `APPS_SCRIPT_URL`, `RESEND_API_KEY` | Zero outbox items processed by real gateway | **Root Cause 2B:** In local development, `MockSmsAdapter` and `MockEmail` only logged to server stdout. There was no local dev sink UI for developers or QA to inspect dispatched SMS messages or email verification tokens. In production, if `TEXTBEE_API_KEY` was empty, `TextBeeSmsAdapter` failed with `CONFIG_MISSING`. |
| **Hop 4** | Provider Adapter -> Device / Inbox | Unformatted SMS | Android WebOTP format missing | N/A | N/A | **Root Cause 2C:** The SMS payload text was `"Your CSC 2.0 verification code is: 123456. Valid for 10 minutes. Do not share."` It lacked the standardized Android WebOTP auto-fill footer (`@<origin> #<code>`), and the input element on frontend was missing `autocomplete="one-time-code"` and `inputmode="numeric"`. |

---

## 4. Verification Evidence (Database Query Output)

Command executed via PostgreSQL 16 `psql`:
```sql
SELECT 'csc2.outbox' as table_name, count(*) as count FROM csc2.outbox
UNION ALL SELECT 'csc2.sms_outbox', count(*) FROM csc2.sms_outbox
UNION ALL SELECT 'csc2.notification_outbox', count(*) FROM csc2.notification_outbox
UNION ALL SELECT 'csc2.phone_otp_challenge', count(*) FROM csc2.phone_otp_challenge
UNION ALL SELECT 'csc2.clients', count(*) FROM csc2.clients
UNION ALL SELECT 'csc2.field_roster', count(*) FROM csc2.field_roster;
```

**Pasted Database Output:**
```
        table_name        | count 
--------------------------+-------
 csc2.outbox              |    55
 csc2.sms_outbox          |     0
 csc2.notification_outbox |     0
 csc2.phone_otp_challenge |     5
 csc2.clients             |    46
 csc2.field_roster        |     2
```

### Analysis of Evidence
1. **0 rows in `csc2.sms_outbox`:** Proves that despite 5 phone OTP challenges requested (`csc2.phone_otp_challenge = 5`), zero SMS messages were enqueued because the test phone numbers were not in `csc2.field_roster` with `ACTIVE` status.
2. **55 rows in `csc2.outbox`:** Outbox events were saved and dispatched to the local mock endpoint (`MockGatewayController`), but never sent to a Google Sheet.

---

## 5. Security Guard: Mock Adapter Enforcement

Per requirements, **mock adapters must be impossible to select outside the `local` profile**.

### Guard Implementation:
1. `MockSmsAdapter.java` and `NotificationService.java` check `Environment.getActiveProfiles()`.
2. If the active profile contains `prod`, `production`, or `staging`, any attempt to configure `mock` throws a hard startup fatal exception (`IllegalStateException`) or fails closed at runtime with `MOCK_DISABLED_IN_PROD`.

---

## 6. Targeted Fixes Required

1. **Fix 1: Auth & Token Propagation on Frontend:**
   - Update `FieldPhoneVerificationModal.tsx` to store `tokens.sessionToken` in `localStorage` under `csc2_device_session_token` and pass `credentials: 'include'`.
   - Update `NewClientRegistrationPage.tsx` and all mutation calls to attach `X-Device-Session: token` and `credentials: 'include'`.
2. **Fix 2: Universal OTP Enqueue:**
   - In `FieldUserAuthService.java`, enqueue SMS to `sms_outbox` for ALL valid phone numbers requesting verification. If unrostered, user verifies and transitions to `PENDING_FIELD_USER` status on device, awaiting state supervisor activation.
   - Generate cryptographically secure 6-digit CSPRNG codes (`secureRandom.nextInt(900000) + 100000`) instead of hardcoded `"123456"`.
   - Append Android WebOTP format: `\n\n@csc2.allianceindia.org #123456`.
3. **Fix 3: Dev-Only Local Mail & SMS Sink:**
   - Create dev-only controller `/api/dev/sinks` returning recent records from `csc2.sms_outbox` and `csc2.notification_outbox`, active ONLY in `local` profile (`@Profile("local")`).
   - Add dev-only frontend sink viewer at `/dev-sinks` for rapid local inspection.
4. **Fix 4: Google Sheets Mirror Payload & HMAC Authentication:**
   - Build complete client payload serializer in `ClientService.java` emitting all CRF attributes and repeat sections (`familyMembers`, `referralRequests`).
   - Upgrade `OutboxWorker.java` to compute HMAC-SHA256 signature across `{ body, timestamp, nonce, eventId }` and dispatch via short 500 ms coalescing.
   - Provide complete, verified Google Apps Script Web App implementation with 3-tier headers and repeat tabs.
