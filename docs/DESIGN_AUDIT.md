# CSC 2.0 Design Audit: From Templated to Purpose-Built

**Date:** 2026-11-03  
**Status:** Complete  
**Scope:** Forms (`/work`), Records Linelist (`/clients`), Client Detail (`/clients/[id]`), and Evaluation (`/admin`)  
**Personas Evaluated:**
1. **Field Caseworker** (Mobile & Desktop outreach worker)
2. **State Reviewer / Supervisor** (District operations & casework triage)
3. **National Leadership** (Strategic health monitoring & compliance)

---

## 1. Executive Summary & Core Gaps

Prior to this pass, several screens exhibited symptoms of generic dashboard templates:
- **Card Grid Proliferation:** Top-level screens relied on standard 3-card KPI grids (`Total Submissions`, `Waiting to Sync`, `Unfinished Forms`), forcing the primary operational work (today's follow-ups) below the fold.
- **Equal-Weight Actions:** "Start New Registration", "Sync Outbox", and "View Record" competed for visual prominence without respecting field triage priorities.
- **Privacy & Stigma Exposure:** List views in `/clients` displayed clinical attributes (`HIV / ART Status`), conflicting with NACO community-based confidentiality standards where lists must display only non-stigmatizing operational identifiers (Ref, Center, Sync Status).
- **One-Size-Fits-All Evaluation:** The Evaluation tab presented identical cards and tables to both State Reviewers (who need an operational work queue) and National Leadership (who need calm aggregated indicators with explicit denominators and no individual PII).

---

## 2. Screen-by-Screen Audit & Purpose-Built Specifications

### Screen 1: Forms Home (`/work`)
- **Primary Role:** Field Caseworker (Smartphone / Tablet in field outreach)
- **Current Templated Symptoms:**
  - Hero banner with generic decorative SVG shapes.
  - 3 generic metric cards (`Unfinished Forms`, `Waiting to Sync`, `Total Submissions`) consuming primary screen real estate.
  - Follow-up worklist buried beneath metrics.
- **Single Most Important Action:**
  - **Triage and execute today's scheduled follow-ups and overdue visits**, with a direct secondary path to "+ Start New Registration" when registering a new beneficiary.
- **Information Needed to Decide Action:**
  - Counts of visits due **Today** vs **Overdue** vs **Unfinished Drafts**.
  - A prioritized work queue showing Client Ref, Due Date relative badge, and J5 Visit Purpose.
- **Purpose-Built Redesign:**
  - Replace the 3 generic cards with an integrated **"Today's Work Summary" Triage Bar**:
    - Compact status pills: `Today's Due (N)` | `Overdue (N)` | `Local Drafts (N)`.
    - Prominent but contextually balanced "+ Start New Registration" button.
  - Surface `MyFollowUpsCard` immediately beneath the triage bar so field users open the app directly to their daily task agenda.
  - Warm, respectful empty and success microcopy in English and Hindi (e.g., *"All caught up for today! • आज के लिए कोई लंबित कार्य नहीं है"*).

---

### Screen 2: Submitted Records & Follow-up Directory (`/clients`)
- **Primary Role:** Field Caseworker & State Supervisor
- **Current Templated Symptoms:**
  - Linelist displays `HIV / ART Status` column directly in tabular rows (violates stigma & privacy rules).
  - Lacks status filter chips (`Draft sent`, `Synced`, `Needs attention`).
  - Table header and pagination styled like a standard developer database browser.
- **Single Most Important Action:**
  - **Locate a specific client by reference or name** to review registration history, check sync integrity, or launch a visit encounter.
- **Information Needed to Decide Action:**
  - Client Reference ID (e.g., `CSC-PUN-001`), Beneficiary Name, Center/District, Registration Date, and Sync Status badge (`Synced`, `Draft sent`, `Needs attention`).
  - Strict omission of any clinical diagnostics or phone numbers from the list view.
- **Purpose-Built Redesign:**
  - Search bar + quick status filter chips (`All`, `Synced`, `Draft sent`, `Needs attention`).
  - Remove all clinical data columns from the linelist.
  - Clean action buttons (`View Record`, `Record Visit`) with 44px+ touch targets for mobile accessibility.

---

### Screen 3: Client Record & Follow-up Hub (`/clients/[id]`)
- **Primary Role:** Field Caseworker
- **Current State:**
  - Header: Name, reference, age, `Call` button (tel: link, only on this page), last contact summary.
  - Sticky bottom action bar: `Record visit` | `Could not reach` | `Reschedule`.
  - Deep-linkable tabs (`Registration`, `Follow-up`).
- **Single Most Important Action:**
  - **Record encounter outcome** (Visited, Could not reach, Reschedule) or view/edit baseline intake details.
- **Information Needed to Decide Action:**
  - Contact history, previous visit outcomes, open task due date, and contact telephone number.
- **Purpose-Built Polish:**
  - Maintain the comic theme while standardizing button paddings and focus rings.
  - Ensure read-only clinical hints never copy forward without explicit re-entry.
  - Replace generic loading and error spinners with respectful, brand-aligned illustrations and messages.

---

### Screen 4: Evaluation — State Team Operations (`/admin?role=state`)
- **Primary Role:** State Reviewer / Field Supervisor
- **Reference Model:** `Childcare-Support-Phase-3(1)` (`SupervisorTabNav`, `StateDistrictFilterBar`, `CaseStatusSummaryDashboard`)
- **Current Templated Symptoms:**
  - Card grid and horizontal tabs mixing operational tasks, raw user roster, and database outbox.
  - Supervision filters placed inside table controls rather than an ergonomic workflow layout.
- **Single Most Important Action:**
  - **Monitor and reassign unaddressed, overdue, or unreachable cases** to balance caseworker load and prevent beneficiaries from falling out of care.
- **Information Needed to Decide Action:**
  - District filter, Caseworker filter, Task status (`OVERDUE`, `COULD_NOT_REACH`, `UNASSIGNED`, `RESCHEDULED_OFTEN`), days past due, attempt count, and caseworker workload.
- **Purpose-Built Redesign:**
  - Two-column ergonomic work-queue layout:
    - **Left Filter Rail:** State / District selector, Caseworker selector, Queue filter pills (`Overdue`, `Could Not Reach`, `Unassigned`), and Escalation threshold selector.
    - **Main Work Queue Table:** Task Reference, Client Reference, District, Assigned Worker, Attempt Count, Due Date, and 1-click `Reassign Worker` action.
  - Dedicated sub-tabs mirroring `Childcare-Support-Phase-3`:
    - `Work Queue (Supervision)`
    - `Caseworker Roster` (Active vs Suspended, Add Caseworker, Bulk CSV)
    - `Programme Rules Registry` (V6 NACO Guidelines, DRAFT status, triggers)
    - `Audit & Outbox` (Mirror status, Sheets sync, transaction log)

---

### Screen 5: Evaluation — Leadership Dashboard (`/admin?role=leadership`)
- **Primary Role:** National Leadership & Program Directors
- **Current Templated Symptoms:**
  - Identical to the state view; exposes raw caseworker names and unaggregated tables.
- **Single Most Important Action:**
  - **Evaluate strategic program performance and district-level health coverage** to allocate interventions and funding.
- **Information Needed to Decide Action:**
  - Aggregated cohort KPIs: Active Cohort, 6-Month Retention Rate, Viral Suppression Rate, LFU Recovery Rate, and Follow-up Completion Rate.
  - **Zero individual client PII or personal identifying information.**
  - **Explicit definitions and denominators under every single metric** (e.g., `88% (440 of 500 active beneficiaries)`).
- **Purpose-Built Redesign:**
  - Clean executive summary dashboard with high-contrast indicator cards.
  - District performance ranking table (Aggregated: Total Enrolled, Completed Follow-ups, Retention %, Overdue Rate).
  - Clear methodology documentation pills explaining exact numerator, denominator, and guideline source for every figure.

---

### Screen 6: Sign-In & Verification Flows (`PhoneVerificationModal`, `EvaluationLoginModal`)
- **Primary Role:** All Users
- **Current Templated Symptoms:**
  - Evaluation modal uses technical prompts like "JWT Bearer Token" or developer terminology.
- **Single Most Important Action:**
  - **Authenticate into the authorized session without friction or technical confusion.**
- **Information Needed to Decide Action:**
  - Clear explanation of access requirements (State PIN / National Passcode vs Field +91 SMS OTP).
  - Role-specific tabs (State Supervisor vs National Leadership).
- **Purpose-Built Redesign:**
  - Step indicator for field SMS verification (`Step 1: Phone` -> `Step 2: 6-Digit OTP` -> `Verified`).
  - Plain English / Hindi messaging explaining that access is restricted to authorized Alliance India personnel.
  - Zero developer jargon; clear error alerts with actionable retry instructions.

---

## 3. Implementation Plan
1. **Refactor `/work` (Forms Home):** Replace the 3-card metric grid with a unified "Today's Work Summary" triage bar; surface `MyFollowUpsCard` as the primary hero component.
2. **Refactor `/clients` (Records Directory):** Remove clinical columns from directory list; add status filter pills (`Draft sent`, `Synced`, `Needs attention`); ensure 100% stigma-safe display.
3. **Refactor `/admin` (Evaluation Hub):**
   - Provide clean split views for **State Reviewer** (Work Queue with Left Filter Rail + Linelist + Roster + Rules) vs **Leadership** (Executive KPIs with denominators, zero PII, District drill-downs).
   - Integrate `Childcare-Support-Phase-3(1)` inspired navigation and filtering.
4. **Verification:** Capture before/after screenshots across desktop/mobile and EN/HI; verify test suite and TypeScript types.
