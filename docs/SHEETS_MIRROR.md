# CSC 2.0 — Google Sheets Mirror & Outbox Integration Specification

**Status:** `[VERIFIED]`  
**Author:** CSC 2.0 Engineering Team  
**Deployment Target:** Google Apps Script WebApp `@2`  
**Reference ID:** `AKfycbwDZRDCm5TgOAL4wVkGgLBkxQtthZYBzkUTd_M3PNrSF_srx0a78rcEuSU7byHqp7AjnQ`  
**Target Spreadsheet:** `1onMDhrdr5c8fcBRsvtelN_vGQ0R8W8zMFeOU0pxEHVM`

---

## 1. Architectural Role & Boundary

The Google Sheets mirror provides an accessible, tabular reporting surface and supervisory dashboard for state coordinators and project leadership. It is **strictly a downstream projection** of the authoritative PostgreSQL 16 database.

```
+-------------------------------------------------------------+
|                 CSC 2.0 Authority System                    |
|                                                             |
|  [ Next.js Frontend ] ---> [ Spring Boot REST API ]         |
|                                   |                         |
|                           [ PostgreSQL 16 ]                 |
|                        (Single Atomic Commit)               |
|                                   |                         |
|                           [ outbox_events ]                 |
|                          (status = 'PENDING')               |
+-----------------------------------|-------------------------+
                                    |
                         (Async 5s Polling Batch)
                                    v
                          [ OutboxWorker.java ]
                                    |
                    (POST Body Ingestion + Auth Secret)
                                    v
+-------------------------------------------------------------+
|               Google Cloud Workspace Mirror                 |
|                                                             |
|               [ Apps Script WebApp /exec ]                  |
|                                   |                         |
|                   [ Google Sheets Projection ]              |
|        (MIRROR_CLIENTS, MIRROR_TASKS, MIRROR_ENCOUNTERS)    |
+-------------------------------------------------------------+
```

### Non-Negotiable Boundaries
1. **Unidirectional Flow:** Writes flow only from PostgreSQL -> Sheets. The Sheet is never an authority source.
2. **Asynchronous Decoupling:** Outages, network latencies, or quota limits on Google Workspace never block or roll back core client registration or clinical follow-up actions.
3. **Synthetic Data Hygiene:** Only synthetic or de-identified data is transmitted during staging and test validation.

---

## 2. Spreadsheet Tab Structure

| Tab Name | Purpose | Key Columns Projected |
| :--- | :--- | :--- |
| `MIRROR_CLIENTS` | Beneficiary linelist directory | `client_ref`, `center_id`, `full_name`, `age`, `gender`, `hiv_status`, `art_number`, `registration_date`, `has_hiv_doc`, `has_art_doc`, `home_visit_consent`, `status` |
| `MIRROR_TASKS` | Actionable worklist tracking | `task_ref`, `client_ref`, `center_id`, `purpose_code`, `title`, `due_date`, `status` (`DUE`, `OVERDUE`, `COMPLETED`), `version` |
| `MIRROR_ENCOUNTERS` | Clinical encounter log (Section I) | `encounter_id`, `client_ref`, `observation_date`, `encounter_type`, `art_adherence`, `nutrition`, `cd4_count`, `viral_load`, `weight_kg`, `action` |
| `MIRROR_SERVICES` | Planned and delivered services (J5) | `service_id`, `client_ref`, `service_code`, `service_name`, `target_due_date`, `delivery_date`, `facility`, `status` (`PLANNED`, `DELIVERED`) |
| `MIRROR_AUDIT` | Immutable supervisory audit log | `event_id`, `occurred_at`, `actor_id`, `actor_role`, `center_id`, `action`, `resource_type`, `resource_id`, `ip_address` |

---

## 3. Ingestion Triggers & Outbox Worker

### Trigger Mechanism
- **Engine:** `OutboxWorker.java` running on `@Scheduled(fixedDelay = 5000)`.
- **Batch Size:** 10 pending events per execution cycle.
- **Query:** `SELECT e FROM OutboxEvent e WHERE e.status = 'PENDING' ORDER BY e.createdAt ASC`.

### Payload Format (Body-Authenticated)
```json
{
  "secret": "APPS_SCRIPT_GATEWAY_SECRET",
  "eventId": "a7b3c2d1-8842-4f31-89ab-123456789abc",
  "eventType": "CLIENT_REGISTERED",
  "aggregateType": "CLIENT",
  "aggregateId": "580da592-95b4-4f55-989c-6faf74c0a439",
  "payload": "{\"clientRef\":\"CSC-DL-2026-0001\",\"centerId\":\"CENTER_DELHI_01\",\"fullName\":\"Sunita Verma (Synthetic)\"}"
}
```

---

## 4. Failure Handling & Resilience

| Failure Scenario | System Behavior | Remediation / Recovery |
| :--- | :--- | :--- |
| **Google Apps Script 503 / Rate Limit** | `OutboxWorker` catches `RestClientException`. The outbox event remains in `status = 'PENDING'`. Retry counter increments. | Re-attempted automatically on next 5-second cycle. Max 5 retries before transitioning to `FAILED`. |
| **Spring Boot Restart / Crash** | Transaction boundary in Spring Boot commits `outbox_events` and business tables atomically. | Upon restart, `OutboxWorker` immediately queries pending rows and resumes dispatch. Zero event loss. |
| **Invalid Secret Rejected (401)** | Apps Script returns `{"status":"UNAUTHORIZED"}`. Outbox worker logs warning. | Event retained in database for configuration resolution without affecting core operations. |
| **Duplicate Delivery (Idempotency)** | Google Sheets `appendRow` script checks for existing `eventId` / `taskRef` before appending. | Duplicate events are silently acknowledged without producing phantom rows. |

---

## 5. Header Reading Outcome (Definitive Proof)

### Finding
**Google Apps Script `doPost(e)` CANNOT read custom HTTP request headers.**

### Technical Explanation & RFC Evidence
1. **Google 302 Redirection:** In Google Apps Script WebApp deployments, incoming requests to `https://script.google.com/macros/s/{id}/exec` receive an immediate `HTTP 302 Found` redirecting to an ephemeral execution container hosted on `https://script.googleusercontent.com/macros/echo?...`.
2. **Header Stripping per RFC 7231 §6.4.3:** Per HTTP standards, automated HTTP clients and redirect handlers strip custom authorization headers (e.g., `Authorization: Bearer ...` and `X-Gateway-Secret: ...`) across cross-domain redirects to prevent credential leakage.
3. **V8 Runtime Event Object Limitation:** In the Google Apps Script V8 runtime environment, the `e` event argument passed to `doPost(e)` provides only the following properties:
   - `e.parameter`
   - `e.parameters`
   - `e.postData` (type, length, contents, name)
   - `e.queryString`
   - `e.contentLength`
   There is **no `e.headers` property** exposed to user scripts.

### Architectural Decision
**In-Body Authentication is Mandatory:** The gateway authentication secret (`secret`) is securely bundled within the JSON payload body (`e.postData.contents`). The Apps Script parser extracts and validates this field prior to processing any sheet row updates.
