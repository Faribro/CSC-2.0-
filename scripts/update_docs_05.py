doc5_path = 'docs/05_FEATURE_TICKET_LIST.md'
with open(doc5_path, 'r', encoding='utf-8') as f:
    content5 = f.read()

slice6_tickets = """

---

# SLICE 6: Fast and Friendly Follow-Up Engine & Supervision (TCK-070 – TCK-077)

### TCK-070: Follow-Up Home on Forms Workspace
- **Status**: Complete / Verified
- **Assigned**: Frontend & Backend Engineers
- **Scope**: `<MyFollowUpsCard />` on `/work`.
- **Acceptance Criteria**:
  - Segmented into Today, Overdue, and Upcoming with live count badges.
  - Rows display client reference, bilingual J5 purpose label (EN/HI), due date chip, and single primary "Record visit" CTA button.
  - Zero health details, HIV/ART statuses, or phone numbers in linelists.
  - Bounded pagination (10 items per page) with segment, page, and scroll offset restored from `sessionStorage` upon return.
  - Default owner is the registering field caseworker; offline tasks cached per authenticated account.

### TCK-071: Client Header with Call Button & Sticky Mobile Action Bar
- **Status**: Complete / Verified
- **Assigned**: Frontend Engineer
- **Scope**: `/clients/[id]`
- **Acceptance Criteria**:
  - Beneficiary name, client reference, age, gender, and last contact summary chip in header.
  - Direct "Call" link (`tel:`) rendered ONLY on the client detail page; never leaked into linelists.
  - Mobile viewport sticky bottom action bar with 3 actions: `Record visit`, `Could not reach`, `Reschedule` (all 48px touch targets).
  - Two primary tabs maintained: Registration Form (View/Edit) and Follow-up History.

### TCK-072: Outcome Flow & Attempt State Invariance
- **Status**: Complete / Verified
- **Assigned**: Frontend & Backend Engineers
- **Scope**: `<FollowUpModal />` Step 1
- **Acceptance Criteria**:
  - Step 1 displays 3 large choice cards: `Visited/spoke`, `Tried but could not reach`, `Reschedule`.
  - Could Not Reach presents canonical reason choices (`no_answer`, `switched_off`, `wrong_number`, `refused`, `other`).
  - Saving Could Not Reach saves a `ContactAttempt` record; task remains OPEN (`PENDING`/`DUE`/`OVERDUE`); increments attempt count chip.
  - Reschedule requires a new due date (with date shortcuts `+1w`, `+2w`, `+1m`) and a mandatory reason; records audit entry.

### TCK-073: Short Visit Form & Section I Clinical Parity (Non-Copy-Forward)
- **Status**: Complete / Verified
- **Assigned**: Frontend & Backend Engineers
- **Scope**: Section I Collapsible Accordions in `<FollowUpModal />`
- **Acceptance Criteria**:
  - Short visit core: Date (default today), place of contact (remembered in `localStorage`), outcome notes.
  - Collapsible accordions for Section I: Anthropometry (Weight, Height, MUAC), ART regimen line, separate CD4 count and CD4 %, Viral Load, TB/ATT status, SWS linkages multiselect, Stigma.
  - **Clinical Non-Copy-Forward Rule**: Previous values shown as read-only hints (`prev: 450 cells/mm³`); never auto-populated into editable fields.

### TCK-074: Next Action Scheduling & Explicit Task Completion
- **Status**: Complete / Verified
- **Assigned**: Frontend & Backend Engineers
- **Scope**: `<FollowUpModal />` Step 2
- **Acceptance Criteria**:
  - Date shortcuts: `in 1 week`, `in 2 weeks`, `in 1 month`, `pick date` (none selected by default).
  - Purpose selection from canonical 13 J5 options; service selection from 114 service codes filtered by category.
  - Explicit Complete toggle: "Mark this follow-up task complete". Completing one task never completes others.
  - Planned services remain `PLANNED` until an explicit delivered service record is submitted.

### TCK-075: Save and Continue, Draft Autosave & Offline Queue
- **Status**: Complete / Verified
- **Assigned**: Frontend Engineer
- **Scope**: `<FollowUpModal />`
- **Acceptance Criteria**:
  - Clear save status banner: "Saved on the server" (online) or "Saved on this device, will send when online" (offline).
  - "Save & Next Client" button advances down the filtered linelist; "Save & Done" returns to linelist.
  - Form drafts autosaved per client in `localStorage` (`csc2_draft_visit_${clientId}`) to prevent data loss.

### TCK-076: Supervision Dashboard & One-Click Reassignment
- **Status**: Complete / Verified
- **Assigned**: Fullstack Engineers
- **Scope**: Evaluation Tab (`/admin`)
- **Acceptance Criteria**:
  - 4 Supervision Views: `OVERDUE`, `COULD_NOT_REACH`, `UNASSIGNED`, `RESCHEDULED_OFTEN`.
  - Filters for District, Worker, and configurable programme Escalation Threshold (default: 3 attempts).
  - One-click Reassign modal with worker select from active roster and mandatory reassignment reason.
  - Immutable audit trail logged in database with supervisor identity and IP address.

### TCK-077: Form Typography & Contiguous Address Grouping Parity
- **Status**: Complete / Verified
- **Assigned**: Frontend Engineer
- **Scope**: `globals.css`, `crfDefinitions.ts`, `RegistrationForm.tsx`
- **Acceptance Criteria**:
  - Applied `font-family: var(--font-josefin), 'Josefin Sans', sans-serif !important;` to all form controls.
  - Swapped Contact number with House/Door number so all physical address fields form a contiguous block ending with Address verified on and live GPS fetch button (`<LocationFetchButton />`).
"""

if "TCK-070: Follow-Up Home on Forms Workspace" not in content5:
    with open(doc5_path, 'w', encoding='utf-8') as f:
        f.write(content5 + slice6_tickets)
    print("Updated docs/05_FEATURE_TICKET_LIST.md with Slice 6 tickets successfully!")
else:
    print("docs/05 already has Slice 6 tickets!")
