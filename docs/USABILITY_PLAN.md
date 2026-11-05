# CSC 2.0 Field & State Usability Evaluation Plan

**Standard:** NACO Community Care & Support Operational Guidelines (2025 Edition)  
**Methodology:** Direct task completion, tap efficiency measurement, qualitative observation sheet.  
**Constraint:** No arbitrary pass/fail timing criteria (removed 60/30/90s stops); evaluations record tap counts, cognitive clarity, and error recovery.

---

## 1. Participant Cohort Profiles

### A. Field Outreach Caseworkers (5 Participants)
- **Profile 1 (FW-01):** Senior Outreach Worker, 8 years community experience, primary language Hindi, low smartphone typing speed.
- **Profile 2 (FW-02):** Peer Educator / Caseworker, 3 years experience, bilingual (Marathi/Hindi), uses mobile portrait orientation exclusively.
- **Profile 3 (FW-03):** New Field Outreach Worker, 6 months experience, English & Hindi, focuses on doorstep nutrition and ART adherence counseling.
- **Profile 4 (FW-04):** Community Linkage Volunteer, 5 years experience, Hindi, conducts home visits in semi-urban resettlement colonies.
- **Profile 5 (FW-05):** ORW Team Leader, 10 years experience, Hindi & English, handles client intake and high-risk lost-to-follow-up tracing.

### B. State Team & Supervision Officers (3 Participants)
- **Profile 1 (ST-01):** State Monitoring & Evaluation Officer (Maharashtra State AIDS Control Society), desktop user, manages district casework quotas.
- **Profile 2 (ST-02):** CSC Project Coordinator (Alliance India State Lead), dual mobile/desktop user, triages overdue follow-ups and unassigned clients.
- **Profile 3 (ST-03):** National Strategic Surveillance Reviewer, desktop user, evaluates district retention rates, viral load suppression, and guideline compliance.

---

## 2. Test Tasks & Success Criteria

### Part I: Field Caseworker Protocol (Mobile Form Factor)

| Task ID | Task Description | Primary Starting Screen | Target Outcome | Target Tap Count |
| :--- | :--- | :--- | :--- | :--- |
| **FW-T1** | **Morning Workload Triage** | `/work` (Forms Home) | View today's due visits and overdue tasks on the daily agenda bar; navigate to overdue list. | **2 taps** |
| **FW-T2** | **Record Successful Home Visit** | `/work` -> Task Row | Tap "Record visit" -> confirm place of contact -> enter visit outcome -> save follow-up encounter. | **5 taps** |
| **FW-T3** | **Record Failed Phone Contact** | `/clients/[id]` -> Follow-up Tab | Tap "Could not reach" -> select reason ("Phone switched off") -> confirm attempt without closing task. | **3 taps** |
| **FW-T4** | **Reschedule Agreed Follow-up** | `/clients/[id]` -> Follow-up Tab | Tap "Reschedule" -> tap shortcut "+2 weeks" -> confirm reason ("Client traveling for harvesting"). | **4 taps** |
| **FW-T5** | **Find Client in Confidential Registry** | `/clients` (Linelist) | Search by client reference ID (`CSC-PUN-001`) -> verify sync status chip (`Synced`) -> launch record. | **3 taps** |

### Part II: State Supervision Protocol (Desktop Form Factor)

| Task ID | Task Description | Primary Starting Screen | Target Outcome | Target Tap / Click Count |
| :--- | :--- | :--- | :--- | :--- |
| **ST-T1** | **Filter Escalated Cases by District** | `/admin` (Work Queue) | Select "Pune" from district dropdown -> toggle "Could Not Reach (≥3 Attempts)" view. | **2 clicks** |
| **ST-T2** | **Reassign Task with Mandatory Audit** | `/admin` (Work Queue) | Click "Reassign" on overdue task -> pick replacement worker from active roster -> submit reason. | **4 clicks + typing** |
| **ST-T3** | **Enroll Field Worker on State Roster** | `/admin` (Roster Tab) | Click "+ Add Caseworker" -> enter +91 mobile and district -> verify "ACTIVE" badge. | **3 clicks + typing** |
| **ST-T4** | **Inspect DRAFT Programme Rules** | `/admin` (Rules Tab) | Navigate to rules registry -> verify 5 seed rules tagged `[PROPOSED] DRAFT` with NACO sources. | **1 click** |
| **ST-T5** | **Review Strategic District Retention** | `/admin` (Leadership View) | Switch to Leadership Overview -> examine 6-month retention denominator and expand Pune drill-down. | **2 clicks** |

---

## 3. Evaluator Observation Sheet Template

```markdown
### Participant Session Sheet
**Participant ID:** [FW-01 .. FW-05 / ST-01 .. ST-03]  
**Device / Screen Size:** [e.g. Redmi Note 11 (390x844) / Chrome Desktop 1920x1080]  
**Selected Language:** [EN / HI]  
**Evaluator:** Alliance India Digital Health Team  

| Task | Completed? (Y/N) | Actual Taps | Hesitations / Doubts Observed | User Verbal Feedback |
| :--- | :---: | :---: | :--- | :--- |
| T1   |               |      |                               |                      |
| T2   |               |      |                               |                      |
| T3   |               |      |                               |                      |
| T4   |               |      |                               |                      |
| T5   |               |      |                               |                      |

**Post-Session Usability Questions (1-5 Likert Scale):**
1. Was it clear what you needed to do today as soon as you opened the app? [1-5]
2. Did any medical or sensitive information show up in client lists where others might see it? [Yes/No]
3. How natural did the Hindi labels and options feel compared to your daily field conversations? [1-5]
4. For state officers: Did the work queue make it easy to spot lagging districts and reassign workers? [1-5]
```

---

## 4. Qualitative Safety & Non-Stigma Checkpoints
1. **Screen Gaze Test:** Stand 1 meter behind field worker while they view `/work` and `/clients`. Confirm that no HIV diagnostic terms, ART numbers, or phone numbers are legible in lists or headers.
2. **Offline Resilience Test:** Disconnect Wi-Fi/mobile data during visit entry. Confirm that a subtle "Saved to device" notification appears and no error dialog blocks the worker.
3. **Hindi Glyph Inspection:** Ensure Devanagari conjuncts (e.g., `प्र`, `ष्ट्र`, `स्थि`, `क्षित`) render crisply with self-hosted fonts without clipping or fallback to system serif fonts.
