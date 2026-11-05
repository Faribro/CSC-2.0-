import os

doc4_path = 'docs/04_FRONTEND_SPECIFICATION_DOCUMENT.md'
with open(doc4_path, 'r', encoding='utf-8') as f:
    content4 = f.read()

section15 = """

---

## 15. Fast and Friendly Follow-Up Engine Specification (Slice 6)

### 15.1 Follow-Up Home (Forms Tab — `/work`)
- **Component**: `<MyFollowUpsCard />` integrated directly into the Forms tab.
- **Segmentation**: 3 segments with dynamic count badges:
  - **Today (आज)**: Tasks with `dueDate <= today` and not overdue.
  - **Overdue (अतिदेय)**: Tasks with `dueDate < today`.
  - **Upcoming (आगामी)**: Tasks with `dueDate > today` within 30 days.
- **Linelist Row Display**:
  - Client Reference ID (monospace, clickable).
  - Follow-up Purpose Reason (canonical J5 bilingual label EN/HI).
  - Due Date chip (warning coral when overdue).
  - Single primary CTA button: **"Record visit"** (min 44px touch target).
  - **Strict Privacy Rule**: Zero health details, HIV/ART statuses, or phone numbers in linelists.
- **Bounded Pagination & Restoration**:
  - 10 rows per page.
  - Active segment, current page, and scroll offset persisted in `sessionStorage` so workers return to the exact same position after recording visits.
- **Default Task Ownership**:
  - Follow-up tasks are owned by the field worker who registered the client (`assignedWorkerId = registration actor`).
  - State Team can reassign via the Evaluation tab.

### 15.2 Client Detail Page (`/clients/[id]`)
- **Header Summary Card**:
  - Client full name, client reference ID, age, gender.
  - **Call Button**: Direct `<a href="tel:...">` phone dialer link shown **ONLY** on this page (hidden in linelists).
  - **Last Contact Summary**: Chip displaying last contact attempt outcome and date.
- **Sticky Bottom Action Bar on Mobile Viewports**:
  - Always thumb-accessible at bottom of viewport:
    - **Record visit** (Primary coral button)
    - **Could not reach** (Amber outline button)
    - **Reschedule** (Plum outline button)
- **Tab Layout**:
  - Tab 1: **Registration Form** (Full CRF Enketo form with View/Edit toggle).
  - Tab 2: **Follow-up & Visits** (Task history, contact attempts, and encounter audit cards).

### 15.3 Outcome Flow & Modal Engine (`<FollowUpModal />`)
- **Step 1: Primary Action Cards (3 Large Thumb Targets)**:
  - Choice A: **Visited / Spoke (विज़िट किया / बात हुई)** -> proceeds to short visit form.
  - Choice B: **Could Not Reach (संपर्क नहीं हो सका)** -> proceeds to contact attempt form.
  - Choice C: **Reschedule (पुनर्निर्धारित करें)** -> proceeds to reschedule date picker.
- **Flow A: Could Not Reach Client**:
  - Reason options: `no_answer` (No answer / Rang out), `switched_off` (Phone switched off), `wrong_number` (Wrong number), `refused` (Refused to speak), `other` (Other reason).
  - Attempt date (defaults today).
  - Optional field notes.
  - **Non-Negotiable Rule**: Saves as a `ContactAttempt` only; task status remains **OPEN** (PENDING/DUE/OVERDUE); increments attempt count chip.
- **Flow B: Reschedule Follow-up**:
  - Date helper shortcuts: `+1 Week`, `+2 Weeks`, `+1 Month`, or custom HTML5 date picker.
  - Mandatory reschedule reason textarea (e.g. client traveling, hospital admission).
  - Audit trail preserved: previous due date, new due date, reason, and actor recorded.
- **Flow C: Short Visit Form & Section I Parity**:
  - Date (defaults to today).
  - Place of contact (Home, ART Centre, CSC, Phone; remembered in `localStorage`).
  - Visit outcome / general counseling notes.
  - **Section I Collapsible Accordions**:
    - *Anthropometry & Vitals*: Weight (kg), Height (cm), MUAC (cm).
    - *ART Status, Regimen & Lab Tests*: Current ART status, regimen line (1st/2nd/3rd line), CD4 count (cells/mm³), CD4 percentage (%), Viral Load count (copies/mL).
    - *TB & Comorbidities*: TB screening status (Screened negative, Presumptive, Confirmed, On ATT).
    - *Social Protection & Entitlements*: SWS linkage multiselect (Ration card, Pension, Travel concession, Education support, Legal aid).
    - *Stigma & Discrimination*: Stigma reported checkbox and perpetrator source.
  - **Clinical Non-Copy-Forward Rule**: Previous clinical values are displayed as read-only hint badges (e.g. `Previous: 450 cells/mm³`). They are **NEVER** copied into input fields, requiring fresh observation or explicit non-entry.
- **Step 2: Next Action Flow**:
  - Date shortcuts: `in 1 week`, `in 2 weeks`, `in 1 month`, `pick date` (none selected by default).
  - Purpose selection from canonical 13 J5 purpose codes.
  - Service selection filtered by category (114 services).
  - Explicit Complete Toggle: `Mark this follow-up task complete`. Completing this task never closes sibling tasks.
- **Step 3: Save and Continue**:
  - Clear feedback badge: "Saved on the server" (online) or "Saved on this device, will send when online" (offline outbox).
  - **Save & Next Client**: Saves current record and immediately opens the next client from the filtered linelist.
  - **Save & Done**: Saves current record and returns to the linelist.
  - Local visit drafts autosaved per client in `localStorage` (`csc2_draft_visit_${clientId}`).

### 15.4 Supervision Dashboard (Evaluation Tab — `/admin`)
- **4 Supervision Views**:
  - `OVERDUE`: Overdue tasks by field worker.
  - `COULD_NOT_REACH`: Clients with contact attempts >= escalation threshold.
  - `UNASSIGNED`: Registered clients without an assigned caseworker.
  - `RESCHEDULED_OFTEN`: Tasks rescheduled frequently.
- **Configurable Programme Setting**:
  - Escalation threshold is a configurable number input (default: 3 attempts before escalation).
- **One-Click Reassignment**:
  - Modal with worker selection from approved roster and mandatory reassignment reason.
  - Immutable audit trail logged in database with supervisor identity and IP address.

### 15.5 Typography & Layout Parity
- **Typography**: Applied `font-family: var(--font-josefin), 'Josefin Sans', sans-serif !important;` across all form elements, inputs, selects, textareas, and labels.
- **Address & GPS Geolocation**: Swapped Contact number with House/Door number so that all physical address fields form a contiguous group ending with Address verified on and the live GPS fetch button (`<LocationFetchButton />`).
"""

if "## 15. Fast and Friendly Follow-Up Engine Specification" not in content4:
    with open(doc4_path, 'w', encoding='utf-8') as f:
        f.write(content4 + section15)
    print("Updated docs/04_FRONTEND_SPECIFICATION_DOCUMENT.md successfully!")
else:
    print("docs/04 already has Section 15!")
