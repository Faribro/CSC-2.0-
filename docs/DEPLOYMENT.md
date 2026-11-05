# CSC 2.0 Deployment Specification & Register

## 1. Pre-Flight Verification Results
| Verification Gate | Command / Target | Result | Evidence / Details |
| :--- | :--- | :--- | :--- |
| **Backend Unit & Integration Tests** | `mvn test` | **PASSED** | 57 tests run, 0 failures, 0 errors, 0 skipped (Total time: 51.2s) |
| **Frontend TypeScript Typecheck** | `npm run typecheck` | **PASSED** | `tsc --noEmit` exited with code 0 |
| **Frontend ESLint Validation** | `npm run lint` | **PASSED** | Clean pass across all routes |
| **Frontend Production Build** | `npm run build` | **PASSED** | Optimized production build generated (12/12 static/dynamic pages) |
| **Emoji Linter** | `node scripts/lint_no_emoji.js` | **PASSED** | Zero emoji characters across 47 frontend source files |
| **Banned Color Linter** | `node scripts/lint_no_banned_colors.js`| **PASSED** | Zero blue/dark-green occurrences across 28 frontend source files |
| **Secret Scan (Git History)** | `python scripts/scan_secrets_history.py` | **PASSED** | Clean across full commit history; zero real keys/tokens committed |
| **Dev-Sink Profile Lockdown** | `StagingProfileSecurityTest` | **PASSED** | Dev sinks & mock adapters strictly absent in staging; app refuses startup if enabled |
| **Live Sheets Mirror (Real WebApp)** | `node scripts/test_sheets_mirror.js` | **PASSED** | 7/7 tests passed against real Apps Script WebApp (p50: 11.8s, p95: 12.1s under 50 concurrent requests) |

---

## 2. Infrastructure Deployment Targets & Pricing

### Render (Backend & PostgreSQL)
* **Project:** `prj-dbk38o7f3r2c738in13g`
* **Region:** `singapore` (`sin`) — closest available cloud region to India (low network latency to NACO/Alliance India).
* **Database Service:** `csc2-postgres` (PostgreSQL 16)
  * Plan: Free ($0.00/mo)
  * Storage limit: 1 GB
  * Backup/retention: Free instances do not include automated point-in-time recovery; expires after 30 days inactivity.
* **Web Service:** `csc2-backend` (Spring Boot 3.4.1 / Java 21 container)
  * Plan: Free ($0.00/mo)
  * Memory / CPU: 512 MB RAM / 0.1 CPU
  * JVM Tuning: `-XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError`
  * Hikari Pool: Maximum 3 connections
  * Health Probe Path: `/healthz` (public, HTTP 200, zero data returned)
  * Cost: **$0.00**

### Vercel (Frontend Next.js)
* **Project:** `csc2-frontend` (Account: `fsayyed-del`)
* **Framework Root:** `frontend/`
* **Target:** Production
* **Function Region:** `bom1` (Mumbai, India) or `sin1` (Singapore)
* **API Proxying:** Same-origin rewrite `/api/:path*` -> Backend URL (prevents CORS, keeps cookies first-party).
* **Plan:** Hobby ($0.00/mo)
* **Cost:** **$0.00**

---

## 3. Environment Variable Manifest (Names Only)
The following environment variable names are configured on Render / Vercel:
* `SPRING_PROFILES_ACTIVE`: `staging`
* `SPRING_DATASOURCE_URL` (internal connection string)
* `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`: `3`
* `FLYWAY_ENABLED`: `true`
* `FLYWAY_URL`
* `JWT_SIGNING_SECRET`
* `SERVICE_CREDENTIAL`
* `APPS_SCRIPT_GATEWAY_URL`
* `APPS_SCRIPT_GATEWAY_SECRET`
* `SMS_GATEWAY_URL`
* `SMS_GATEWAY_API_KEY`
* `SMTP_HOST`
* `SMTP_PORT`
* `SMTP_USER`
* `SMTP_PASSWORD`
* `ALLOWED_ORIGINS`
* `BACKEND_URL` (Vercel server-side proxy target)

---

## 4. Revocation Checklist
* [ ] Vercel CLI token (`vcp_...`): Revoke in Vercel Settings > Tokens after live demonstration.
* [ ] Apps Script gateway secret: Rotate in script properties and backend environment settings.
* [ ] Render temporary test database credentials: Drop/terminate database upon demonstration conclusion.
