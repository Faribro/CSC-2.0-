# SMS Gateway Technical Evaluation & Specification: TextBee Candidate

## Document Metadata
- **Document ID:** DOC-SMS-01
- **Status:** DRAFT / PROVISIONAL
- **Author:** CSC 2.0 Engineering Team
- **Date:** 2026-11-03
- **Classification:** Tier 2 Confidential (System Security & Access Architecture)

---

## 1. Executive Summary & Problem Context
CSC 2.0 introduces field-user first-time phone OTP verification. To minimize infrastructure complexity during initial pilots while providing a clear transition path to enterprise telecom aggregators, this document audits the **TextBee** Android gateway candidate, defines the adapter architecture (`SmsProvider`), models the durable Postgres outbox, establishes the dedicated hardware runbook, and evaluates Indian telecom regulatory considerations.

---

## 2. TextBee Candidate Analysis

### 2.1 Technology Overview & Open-Source Pedigree
- **Repository:** `https://github.com/textbee/textbee`
- **License:** MIT License (confirmed)
- **Tech Stack:** NestJS backend, Next.js web dashboard, Kotlin companion Android app (`SMS Gateway for Android`).
- **Official Documentation:** `https://textbee.dev/docs` (Accessed: 2026-11-03)
- **Self-Hosting Option:** TextBee is 100% open-source and self-hostable via Docker/Node.js, allowing the entire gateway relay infrastructure to run within project-controlled VPC boundaries without sending recipient phone numbers or OTP tokens through third-party cloud multi-tenant infrastructure.

### 2.2 API Contract & Endpoints
TextBee provides a clean REST API interface:
- **Endpoint:** `POST https://api.textbee.dev/api/v1/gateway/send-sms` (or self-hosted equivalent `/api/v1/gateway/send-sms`)
- **Authentication Header:** `x-api-key: <TEXTBEE_API_KEY>`
- **Request Headers:** `Content-Type: application/json`
- **Payload Schema:**
  ```json
  {
    "recipients": ["+919876543210"],
    "message": "[CSC 2.0] Your verification code is 123456. Valid for 10 minutes. Do not share.",
    "deviceId": "DEVICE_ID_HEX",
    "simSubscriptionId": 1
  }
  ```
- **Responses:**
  - `200 OK`: `{"success": true, "messageId": "...", "status": "queued"}`
  - `401 Unauthorized`: Invalid API key
  - `429 Too Many Requests`: Rate limit or quota exhaustion

### 2.3 Tiering & Throughput Limits
- **Free Tier [UNVERIFIED as stable long-term SLA]:** Up to ~300 SMS/month on hosted cloud.
- **Pro Tier [UNVERIFIED pricing stability]:** ~$14.99/month for higher hosted volume (up to 5,000 SMS/month).
- **Self-Hosted:** Zero licensing fees; cost is bounded strictly by cloud hosting and SIM telecom tariff plans.
- **Hardware Throughput Limit:** 10 to 15 SMS per minute per physical SIM card, bounded by Android OS SMS dispatch pipelines and radio modem serialization.

---

## 3. Dedicated Gateway Hardware Runbook

Using a personal mobile device is **strictly forbidden**. The SMS gateway requires a dedicated, managed field device.

### 3.1 Device Specifications & Prerequisites
- **Hardware:** Dedicated spare Android smartphone (Android 10+ recommended).
- **SIM Card:** Dedicated post-paid or prepaid corporate SIM card with unlimited SMS tariff.
- **Charging & Battery Health:** Device must remain connected to continuous power via a low-amperage smart plug; battery charge limiting (80% battery protection mode in Android settings) enabled to prevent battery swelling.
- **Operating System Settings:**
  - `Battery Optimization`: Disabled for TextBee (`Settings -> Apps -> TextBee -> Battery -> Unrestricted`).
  - `Background Data`: Unrestricted.
  - `Auto-Update`: Disabled for OS; app auto-updates managed manually.
  - `Android SMS Dispatch Limit`: Android enforces a default throttle of 30 SMS per 30 minutes. Run via ADB during device commissioning:
    ```bash
    adb shell settings put global sms_outgoing_check_max_count 200
    adb shell settings put global sms_outgoing_check_interval_ms 60000
    ```
- **Heartbeat & Monitoring:** The backend polls device availability via TextBee device status API (`GET /api/v1/devices/{deviceId}`) every 5 minutes. If offline for > 15 minutes, an operational alert is dispatched to the state IT administrator.

### 3.2 Operational Incident Runbook

| Failure Mode | Detection | Immediate Action | Escalation / Fallback |
|---|---|---|---|
| **Device Offline (Wi-Fi dropped / Dead)** | Heartbeat probe fails > 3 cycles; Outbox queue builds up with `PENDING` rows | Field lead inspects physical device power and Wi-Fi connection; restarts app | State Team triggers Manual Approval fallback in Evaluation Tab |
| **SIM Blocked / Carrier Spam Flag** | Outbox rows marked `FAILED` with error `Carrier rejected / FUP exceeded` | Rotate to backup SIM card in SIM Slot 2 or swap physical device | Contact telecom carrier relationship manager |
| **Tariff Exhaustion** | Outbox failures with balance alerts | Immediate online recharge via corporate account | Secondary backup SIM auto-selected via `simSubscriptionId` |
| **API Key Compromise** | Alert or periodic credential rotation | Rotate `TEXTBEE_API_KEY` in environment variables and restart API daemon; never commit key to Git | Security lead notifies project administrator |
| **Physical Phone Lost / Stolen** | Device offline alert | Remote wipe via Google Find My Device; immediately revoke TextBee device token and API key; block SIM IMEI with carrier | File physical security incident report |

---

## 4. Indian Telecom & Regulatory Compliance `[OPEN]`

> [!WARNING]
> Automated SMS originating from consumer SIMs in India are subject to TRAI (Telecom Regulatory Authority of India) regulations.

1. **TRAI TCCCPR 2018 (DLT Framework):** In India, Application-to-Person (A2P) commercial and transactional messaging requires registration of Principle Entities, Headers (Sender IDs), and Content Templates on telecom DLT distributed ledger platforms (e.g., Jio, Airtel, Vodafone DLT).
2. **Personal SIM FUP Restrictions:** Telecom carriers in India enforce a strict Fair Usage Policy (typically 100 SMS/day per SIM) for personal numbers to prevent spam. Exceeding this threshold can result in automated SIM barring.
3. **Regulatory Classification `[OPEN]`:** Using an Android gateway SIM for organizational OTPs must undergo legal review by Alliance India compliance officers. If classified as transactional A2P, the system must swap to a licensed DLT-registered enterprise aggregator (e.g., Gupshup, ValueFirst, Airtel IQ, Twilio India) using the `SmsProvider` interface.

---

## 5. Architectural Implementation: `SmsProvider` & Outbox Pattern

### 5.1 Provider Interface Contract
```java
public interface SmsProvider {
    SmsDeliveryResult sendSms(String phoneE164, String text);
    String getProviderId();
    boolean isAvailable();
}
```

### 5.2 Supported Provider Adapters
1. **`TextBeeSmsAdapter`:** Production/staging candidate communicating with TextBee gateway using `TEXTBEE_API_KEY` and `TEXTBEE_DEVICE_ID` environment variables.
2. **`MockSmsAdapter`:** Local testing sink. Stores OTPs in memory for automated integration tests and Playwright walkthroughs. **Strictly disabled outside local profile**; backend refuses to initialize if active in production without real provider.
3. **`LicensedProviderStubAdapter`:** Extensibility hook for future enterprise DLT-registered A2P telecom providers.

### 5.3 Asynchronous Outbox & Resiliency Pattern
- **Atomic Creation:** When an OTP is requested for an approved/rostered number, the `phone_otp_challenge` record and the `sms_outbox` row are created in the **same database transaction**.
- **Asynchronous Dispatch:** `SmsOutboxWorker` reads `PENDING` outbox records, attempts dispatch through `SmsProvider`, and transitions status:
  - `PENDING` &rarr; `ACCEPTED` &rarr; `DELIVERED` (if delivery receipts available)
  - Failure &rarr; Exponential backoff with jitter up to 3 attempts &rarr; `DEAD`
- **Fault Tolerance:** If the SMS gateway is completely down, **core data collection, beneficiary registration, and offline drafting are NOT blocked**. The UI presents an honest message: *"SMS gateway temporarily unavailable. Please contact your State Supervisor for administrative manual approval."*

### 5.4 SMS Text Template & Android WebOTP Auto-Fill Specification
To maintain strict confidentiality, maximize deliverability, and provide zero-friction auto-fill on Android field devices:
- **Standard Template (WebOTP Compliant):**
  ```text
  <#> Your CSC 2.0 verification code is: {code}. Valid for 10 minutes. Do not share.

  @csc2.allianceindia.org #{code}
  ```
- **Android Auto-Fill Support:**
  - The leading `<#>` prefix and trailing `@<origin> #<code>` tag adhere strictly to the W3C WebOTP API and Google Play Services SMS Retriever API specifications.
  - The frontend modal OTP input specifies `autocomplete="one-time-code"` and `inputmode="numeric"` with `pattern="[0-9]{6}"`.
- **Confidentiality & Content Safety Constraints:**
  - Zero beneficiary or caseworker names.
  - Zero health, HIV, ART, clinic, or diagnostic terms.
  - Codes are never exposed in application logs, subjects, query strings, or unauthenticated responses.

### 5.5 Local Development Sink & Production Profile Guards
- **Local Dev Sink Route:** A dev-only outbox viewer is accessible at `/dev-sinks` (and `/api/v1/dev-sinks/sms` / `/email`) exclusively in `local`, `dev`, and `test` Spring profiles.
- **Fail-Closed Guard:** The `MockSmsAdapter` and mock notification dispatchers verify active profiles; if `prod`, `production`, or `staging` profiles are detected, any attempt to use mock adapters throws a security fatal error (`MOCK_DISABLED_IN_PROD`) and halts execution.
- **PostgreSQL Rate Limiting:** Cooldown (60s), per-phone (5/hr), per-IP (15/hr), and global caps (1000/hr) are enforced durably in the `csc2.auth_rate_limit` table.
- **Dead-Letter View & Retry Backoff:** Outbox items retry using bounded exponential backoff (`3^attempts + jitter`) up to 3 retries before transitioning to `DEAD` status for supervisor inspection.

### 5.6 Privacy & Data Sovereignty
- **Data in Transit:** Phone numbers and OTP hashes pass through the gateway. If using the multi-tenant TextBee cloud, numbers are routed through their infrastructure.
- **Recommendation:** Self-host the TextBee gateway backend container inside Alliance India's private infrastructure to retain complete data sovereignty.
- **Classification:** Phone numbers are classified as **Tier 2 Confidential PII**. When mirrored or exported to administrative views or Google Sheets, phone numbers are masked (`+91 98*** **210`).
