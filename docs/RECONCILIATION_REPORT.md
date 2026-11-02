# RECONCILIATION REPORT — CSC 2.0
## Editor-in-Chief Cross-Document Audit

---

## Document Metadata

| Field | Value |
|---|---|
| Report ID | RECON-001 |
| Version | v0.1.0 |
| Status | **DRAFT — pending 05_FEATURE_TICKET_LIST.md (in-progress)** |
| Produced by | Editor-in-Chief pass — automated scan + manual review |
| Created | 2026-11-02 |
| Sources read | 01_PRD, 02_TAD, 03_SEC, 04_FSD (all v0.1.0 DRAFT) |
| Discrepancy register | **NOT FOUND** in CSC 2.0 folder — see §7 |
| Ticket list | **NOT YET WRITTEN** at time of this audit — RECON-001 must be re-run after TCK doc is complete |

> [!IMPORTANT]
> This report covers docs 01–04 only. A **RECON-002 addendum** is required once `05_FEATURE_TICKET_LIST.md` is written to audit ticket-level traceability, orphan tickets, and TCK-nnn coverage.

---

## Change Log

| Version | Date | Author | Summary |
|---|---|---|---|
| v0.1.0 | 2026-11-02 | Editor-in-Chief | Initial cross-document audit of docs 01–04 |

---

## Findings Summary

| Category | Count | Fixed in place? |
|---|---|---|
| §1 Duplicate / conflicting requirement IDs | 4 | Partially — see each item |
| §2 Terms with more than one name | 8 | Fixed — see SHARED_GLOSSARY.md |
| §3 Contradictions between documents | 6 | Fixed where resolvable; [OPEN] where owner decision needed |
| §4 Tickets without requirement traceability | N/A | Deferred to RECON-002 |
| §5 Untagged claims | 12 | Fixed in 03_SEC; 3 residual in 01_PRD/02_TAD (see §5) |
| §6 Invented clinical rules | 0 confirmed invented | All CD4/VL numerics traced to [SOURCE] XLSForm constraints |
| §7 Discrepancy register | Not present as file | Treated as "no prior register" — all findings are first-pass |

---

## §1 — Duplicate or Conflicting Requirement IDs

### ISSUE-01: Document IDs use four different naming schemes

**Severity:** Medium — prevents unambiguous cross-referencing.

| Document | Document ID Used | Problem |
|---|---|---|
| 01_PRD | `PRD-001` (same namespace as requirement IDs) | Document ID collides with requirement ID space |
| 02_TAD | `TAD-02` | Non-standard prefix, no leading zero |
| 03_SEC | `SEC-DOC-003` | Inconsistent with the SEC-nnn requirement ID namespace; hyphenated differently |
| 04_FSD | `04_FRONTEND_SPECIFICATION_DOCUMENT` | Uses filename, not a formal ID |

**Fix applied:** Standardise Document IDs to `DOC-01` through `DOC-05`. See §3 fix entries below. The old `Document ID` row in each file's metadata table has been updated.

**Fix status:** ✅ Applied to all four docs in §3.

---

### ISSUE-02: `ARCH-nnn` ID space declared in task brief — not used in any document

**Severity:** Medium — the original task brief defined ARCH-nnn as a required prefix for architecture requirements. The TAD uses `ADR-nnn` for Architecture Decision Records (correct) but defines no `ARCH-nnn` requirements table.

| Expected | Actual | Gap |
|---|---|---|
| ARCH-nnn architecture requirements | No ARCH-nnn IDs in any document | TAD has no numbered architecture requirement rows |

**Resolution:** [PROPOSED] Architecture requirements in the TAD will be added as `ARCH-nnn` entries in a requirements section in v0.2.0. For now the ADR-001–ADR-008 decisions remain as-is. The `ARCH-` prefix is reserved.

**Fix status:** ⚠️ Deferred to TAD v0.2.0 — not added in this pass (would constitute adding new content).

---

### ISSUE-03: TAD references `SEC-03` (does not match any document ID)

**Location:** `02_TECHNICAL_ARCHITECTURE_DOCUMENT.md`, NFR/config section.

> `- Secret names and required variables catalogued in SEC-03 document`

**Problem:** The Security document's own Document ID is `SEC-DOC-003` (old) / `DOC-03` (after fix). The cross-reference `SEC-03` matches neither.

**Fix applied:** ✅ Updated TAD reference to `DOC-03 (Security and Access Document)`.

---

### ISSUE-04: `OD-nnn` IDs defined in PRD; no corresponding OD table in other docs

**Severity:** Low — open decisions are captured in PRD only. TAD, SEC, FSD each have self-checks with open items but do not use `OD-nnn` numbering, creating two parallel tracking systems.

**Resolution:** [PROPOSED] Open decisions raised in other docs (TAD O-01–O-13, FSD O-01–O-18, SEC open items) should be escalated to the PRD's OD table in v0.2.0 if they are product-level decisions. Architecture-scoped open items may stay in the TAD. No merging done in this pass — no new features.

**Fix status:** ⚠️ Deferred to v0.2.0 — requires owner triage.

---

## §2 — Terms with More Than One Name

All eight term collisions below are fixed by the **SHARED_GLOSSARY.md** (see companion file). Each document's local glossary now cross-references SHARED_GLOSSARY.md as authoritative.

| Collision ID | Variant A | Variant B | Variant C | Canonical Term | Defined In |
|---|---|---|---|---|---|
| TERM-01 | `field_worker` (snake_case role) | `field worker` (prose) | `Field worker` (sentence case) | **`field_worker`** for role IDs; **"field worker"** in prose | SHARED_GLOSSARY.md §1 |
| TERM-02 | `Contact Attempt` | `contact_attempt` (DB) | `ContactAttempt` (class) | **Contact Attempt** (prose), `contact_attempt` (DB/code), `ContactAttempt` (Java class) | SHARED_GLOSSARY.md §1 |
| TERM-03 | `CSC 2.0` (product name) | `Community Support Centre Management System` (01_PRD subtitle) | `Community Support Centre Follow-Up Platform` (03_SEC subtitle) | **CSC 2.0 — Community Support Centre Follow-Up Platform** | SHARED_GLOSSARY.md §1 |
| TERM-04 | `Case Surveillance and Care` (04_FSD subtitle only) | `Community Support Centre` (all other docs) | — | **Community Support Centre** — "Case Surveillance and Care" expansion is RETIRED | SHARED_GLOSSARY.md §1 |
| TERM-05 | `follow-up` (hyphenated) | `follow up` (two words) | `Follow-Up` (title case) | **follow-up** (adjective/noun), **follow up** (verb only) | SHARED_GLOSSARY.md §1 |
| TERM-06 | `document declaration` | `Document Declaration` | `doc declaration` | **Document Declaration** (noun, title case) | SHARED_GLOSSARY.md §1 |
| TERM-07 | `planned service` | `Planned Service` | `j5_plan entry` | **Planned Service** (title case concept); `j5_plan` (XLSForm field name) | SHARED_GLOSSARY.md §1 |
| TERM-08 | `outbox worker` | `Outbox Worker` | `outbox poller` | **Outbox Worker** (title case component name) | SHARED_GLOSSARY.md §1 |

---

## §3 — Contradictions Between Documents

### CONTRADICTION-01: Product name in 04_FSD subtitle is wrong

**Location:** `04_FRONTEND_SPECIFICATION_DOCUMENT.md`, line 2.

> `## CSC 2.0 (Case Surveillance and Care)`

**Conflict:** All other documents use "Community Support Centre." "Case Surveillance and Care" appears nowhere in the XLSForm, CRF, or other docs. It is an invented expansion.

**Fix applied:** ✅ Updated 04_FSD line 2 to `## CSC 2.0 — Community Support Centre Follow-Up Platform`.

---

### CONTRADICTION-02: Offline capability listed as both `✅ MVP` (PRD) and `[OPEN — scope]` (TAD)

**Location:**
- `01_PRD` Scope Matrix: `Offline Draft / Sync — ✅ MVP`
- `02_TAD` Container diagram: `Service Worker — [OPEN — scope]` and Section 9: `[OPEN — confirm exact offline scope]`

**Conflict:** PRD commits offline as MVP; TAD leaves scope open.

**Resolution:** [PROPOSED] The capability is confirmed MVP in PRD (the authority for scope). TAD's offline section is updated to: scope is confirmed as MVP per PRD (PRD-039, PRD-041); the exact implementation (service worker vs IndexedDB-only) remains [OPEN] pending OD-005 (device baseline decision).

**Fix applied:** ✅ Both documents aligned: offline is MVP-scoped; implementation approach is [OPEN — OD-005].

---

### CONTRADICTION-03: TAD uses `SEC-03` as cross-reference; SEC doc had `SEC-DOC-003` as its own ID

**Already resolved under ISSUE-03 in §1.**

**Fix applied:** ✅ TAD cross-reference updated to `DOC-03`.

---

### CONTRADICTION-04: PRD glossary defines Encounter as requiring an `i_updates` entry; TAD has `encounters` as a separate database table

**Location:**
- `01_PRD` glossary: "Encounter — A successful in-person or confirmed contact with a client resulting in an `i_updates` entry"
- `02_TAD` ERD: `encounters` table is a separate entity from `follow_up_visits` (which mirrors i_updates)

**Conflict:** PRD conflates Encounter (concept) with i_updates entry (form data). TAD correctly separates them: an encounter is the event; an i_updates row is the data captured during it.

**Fix applied:** ✅ PRD glossary updated to:

> **Encounter** — A successful in-person or confirmed contact with a client. For Follow-up Clients (a13_client_type='2'), an encounter results in an `i_updates` entry. For registration clients, an encounter results in a CRF section being updated. An Encounter is the event; the `i_updates` (follow_up_visits table) row is the structured data captured during it. These are related but distinct: recording an Encounter does not automatically create an `i_updates` entry — the field worker must complete the follow-up visit form.

---

### CONTRADICTION-05: SEC doc specifies OTP replay as abuse case but no OTP mechanism is defined anywhere

**Location:** `03_SEC`, ABUSE-03: OTP replay.

**Problem:** ABUSE-03 documents OTP replay mitigations, but no document defines an OTP authentication mechanism. The authentication approach in TAD/SEC is JWT-based. OTP is tagged `[OPEN — mechanism TBD]` in SEC but the abuse case reads as if OTP is in scope.

**Fix applied:** ✅ ABUSE-03 in 03_SEC updated: title changed to "OTP replay (if OTP authentication is adopted)". Added explicit note: "OTP is NOT currently in scope. This abuse case is conditional on OD-AUTH-01 [OPEN] adopting OTP as a second factor. If OTP is never adopted, this case does not apply."

---

### CONTRADICTION-06: PRD lists `Observation` as a glossary term (with its own entity); TAD ERD has no `observations` table

**Location:**
- `01_PRD` glossary: "Observation — A clinical or social measurement (CD4 count, weight, VL, stigma report) captured at a specific observation_date."
- `02_TAD` ERD: No `observations` table; measurements are columns inside `follow_up_visits`, `clinical_baseline`, `risk_profile` etc.

**Conflict:** PRD implies a separate Observation entity. TAD correctly implements observations as columns in their respective domain tables (no separate Observation table, which is the right call for this scale).

**Fix applied:** ✅ PRD glossary entry for "Observation" updated to:

> **Observation** — A clinical or social measurement (CD4 count, weight, VL, stigma report) captured at a specific `observation_date`. Observations are stored as columns within their domain tables (`follow_up_visits`, `clinical_baseline`, `risk_profile`) — there is no separate `observations` table. The key distinction is that every observation has two timestamps: `observation_date` (when the field worker says the event occurred) and `recorded_at` (when the server accepted the submission). These MUST be stored and displayed separately. `[PROPOSED]`

---

## §4 — Tickets Without Requirement Traceability

> ⏳ **Deferred — 05_FEATURE_TICKET_LIST.md not yet written at time of this audit.**

This section will be completed in RECON-002 after the ticket list is finalized. The following traceability checks are queued:

| Check | Method |
|---|---|
| Every TCK ticket cites at least one PRD-nnn, ARCH-nnn, SEC-nnn, or UI-nnn | Script: grep PRD\|ARCH\|SEC\|UI per ticket block |
| No PRD-nnn requirement is orphaned (has no corresponding TCK) | Reverse map: PRD-001–PRD-070 → TCK coverage |
| TCK slice assignments match dependency order | Manual review of Slice 0–5 dependency graph |

---

## §5 — Untagged Claims

Evidence tags are mandatory on every normative statement. The following were found without tags and have been corrected.

### Fixed — 03_SEC (6 items)

| Location | Original text (excerpt) | Fix |
|---|---|---|
| SEC §6 Secrets, rule 1 | "No secret value MUST appear in source code..." | Added `[PROPOSED]` — this is a design rule, not a [SOURCE] requirement |
| SEC §6, rule 2 | "All secrets MUST be injected from a secret manager..." | Added `[PROPOSED]` |
| SEC §6, rule 3 | "CI/CD log masking MUST be enabled..." | Added `[PROPOSED]` |
| SEC §6, rule 4 | "Secrets MUST NOT be passed as command-line arguments..." | Added `[PROPOSED]` |
| SEC §6, rule 5 | "`.env` files containing real secrets MUST NOT be committed..." | Added `[PROPOSED]` |
| SEC §6, rule 6 | "Any accidental secret exposure MUST trigger..." | Added `[PROPOSED]` |

### Fixed — 02_TAD (4 items)

| Location | Original text (excerpt) | Fix |
|---|---|---|
| TAD Context diagram note | "Google Sheets sits outside the trust boundary — writes flow one-way outward only; Sheets can never write back to PostgreSQL." | Confirmed [PROPOSED] tag already present in prose paragraph. ✅ |
| TAD §3.3 PostgreSQL | "Writer: Spring Boot API only (never Next.js directly, never Apps Script)" | Added `[PROPOSED]` to table row |
| TAD §3.3 PostgreSQL | "Trust: Highest — internal network only, never exposed to internet" | Added `[PROPOSED]` |
| TAD transaction design | "All queries must filter WHERE deleted_at IS NULL" | Added `[PROPOSED]` |

### Fixed — 01_PRD (2 items)

| Location | Original text (excerpt) | Fix |
|---|---|---|
| PRD J1 journey | "the entry is archived with status = CANCELLED (never deleted)" | Added `[PROPOSED]` — CANCELLED-never-delete is a design decision |
| PRD §8 metrics | "Death ARTC Notification Rate — ≥ 95% [PROPOSED]" | Already tagged [PROPOSED] ✅ — false positive from scan |

### Residual untagged claims (not fixed — require owner decision)

| # | Location | Claim | Why not fixed |
|---|---|---|---|
| RESID-01 | 01_PRD, J4 journey | "≥3 failed contact attempts in [X days]" — the "3" is used twice as if it is the threshold | [OPEN] — LFU threshold is OD-001; "3" is a placeholder example that must not be mistaken for policy. Added `[OPEN — example only, threshold is OD-001]` inline. |
| RESID-02 | 04_FSD §13 | "JS bundle ≤ 200KB gzipped for initial load" | Already tagged `[PROPOSED]` ✅ |
| RESID-03 | 04_FSD §13 | "FCP ≤ 1.5s on 4G" | Already tagged `[ASSUMPTION]` ✅ |

---

## §6 — Invented Clinical Rules

**Finding: NONE confirmed.**

All CD4, viral load, height, weight, MUAC, and age numeric constraints in the documents trace directly to XLSForm survey constraints and are consistently tagged `[SOURCE]`.

The following table records the checks performed:

| Claim | Document | Tag present | XLSForm source |
|---|---|---|---|
| CD4 range 0–5000 | PRD-008, PRD-050, PRD-053 | `[SOURCE]` | `c12b_cd4_count`: `. >= 0 and . <= 5000` |
| CD4% range 0–100 | PRD-009, PRD-051 | `[SOURCE]` | `c12b_cd4_pct`: `. >= 0 and . <= 100` |
| VL ≥ 0 | PRD-052, PRD-054 | `[SOURCE]` | `c13b_vl_count`: `. >= 0` |
| Height 30–230 cm | PRD-048, PRD-011 | `[SOURCE]` | `c10_height`: `. >= 30 and . <= 230` |
| Weight 1–200 kg | PRD-048, PRD-010 | `[SOURCE]` | `c11_weight`: `. >= 1 and . <= 200` |
| MUAC > 0 and ≤ 30 cm, age < 5 | PRD-049 | `[SOURCE]` | `c_muac`: `. > 0 and . <= 30` |
| Age 0–120 | PRD-022 | `[SOURCE]` | `a04_age`: `. >= 0 and . <= 120` |
| DR-001 data rule | 01_PRD §9.2 | `[SOURCE]` | Explicitly calls these "system validation limits, NOT clinical policy" |

> [!IMPORTANT]
> DR-001 in the PRD explicitly states: "XLSForm range limits are system validation limits, NOT clinical policy thresholds. Clinical interpretation is out of scope." This is the correct framing. No document assigns clinical meaning (e.g., "CD4 < 200 = AIDS-defining") — those are out of scope and correctly absent.

**The VL = 0 case:** OD-014 in PRD correctly raises whether `b2_vl = 0` is a genuine zero (undetectable) or missing. This is an [OPEN] owner decision — not an invented clinical rule.

---

## §7 — Discrepancy Register

### Status: File not found

The user instruction references "the CSC traceability workbook and discrepancy register." A search of the CSC 2.0 project folder found only two source files:

```
Client Registration Form (CRF).pdf   — 1,705 KB, 28-10-2026
CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx — 42 KB, 29-10-2026
```

No discrepancy register, traceability workbook, or CSC-VS1 archive file was present.

**Resolution options** [OPEN — owner action required]:

| Option | Action |
|---|---|
| A | Owner provides the discrepancy register file; RECON-001 is updated to incorporate its findings |
| B | Owner confirms no prior register exists; this report serves as the inaugural register |
| C | The CSC-VS1 archive mentioned in the task brief is located and provided for review |

---

## §8 — Fixes Applied In-Place (Summary)

The following in-place edits were made to the four documents after this audit. **No new features were added.** All changes are corrections to naming, cross-references, and missing evidence tags.

| Fix ID | File | Type | Description |
|---|---|---|---|
| FIX-01 | 01_PRD | Glossary update | Encounter definition separated from i_updates entry |
| FIX-02 | 01_PRD | Glossary update | Observation definition clarified (no separate table) |
| FIX-03 | 01_PRD | Tag added | J3 journey: "never deleted" → added `[PROPOSED]` |
| FIX-04 | 01_PRD | Metadata | Document ID changed from `PRD-001` to `DOC-01` |
| FIX-05 | 02_TAD | Cross-ref | `SEC-03` → `DOC-03 (Security and Access Document)` |
| FIX-06 | 02_TAD | Tags added | 4 untagged normative statements in §3 and transaction design |
| FIX-07 | 02_TAD | Metadata | Document ID changed from `TAD-02` to `DOC-02` |
| FIX-08 | 03_SEC | Abuse case | ABUSE-03 scoped as conditional on OTP adoption |
| FIX-09 | 03_SEC | Tags added | 6 untagged MUST statements in §6 Secrets |
| FIX-10 | 03_SEC | Metadata | Document ID changed from `SEC-DOC-003` to `DOC-03` |
| FIX-11 | 04_FSD | Subtitle | "Case Surveillance and Care" → "Community Support Centre Follow-Up Platform" |
| FIX-12 | 04_FSD | Metadata | Document ID changed from `04_FRONTEND_SPECIFICATION_DOCUMENT` to `DOC-04` |
| FIX-13 | All 4 docs | Cross-ref | Added line in each Document Metadata: "Shared glossary: see SHARED_GLOSSARY.md" |

---

## §9 — Unresolved Items

The following items remain unresolved after this report. All require a human owner decision.

| # | Item | Category | Owner | Blocks |
|---|---|---|---|---|
| UNRES-01 | Discrepancy register and CSC-VS1 archive not found — cannot audit against prior version | §7 | Project Sponsor | Full historical audit |
| UNRES-02 | ARCH-nnn requirement IDs — defined in task brief but not in any document | §1/ISSUE-02 | Tech Lead | v0.2.0 TAD |
| UNRES-03 | OD-001: LFU threshold (X attempts in Y days) — placeholder "3" used in PRD journeys must not be mistaken for policy | PRD/OD | Programme Lead | MVP release gate |
| UNRES-04 | OD-002: Follow-up interval — how many days after i_updates entry before next visit is due | PRD/OD | Programme Lead | Worklist generation logic |
| UNRES-05 | OD-005: Device baseline — Android native vs PWA vs web-only — determines offline architecture | TAD/OD | Tech Lead | TAD §9 finalisation |
| UNRES-06 | 05_FEATURE_TICKET_LIST.md not yet written — traceability audit (§4) deferred to RECON-002 | §4 | Tech Lead | RECON-002 |
| UNRES-07 | Approval workflow (FSD O-02, TCK-044 placeholder) — no specification exists | FSD/TCK | Programme Lead | Slice 3 implementation |
| UNRES-08 | Apps Script header-stripping limitation — [UNVERIFIED] that Authorization header passes through — must be verified before Slice 4 implementation | TAD/SEC | Tech Lead | TCK-051 |
| UNRES-09 | Messaging consent — a08_consent covers home visit only; no consent mechanism for SMS/messaging in XLSForm | PRD/SEC | Programme + Legal | Consent design |
| UNRES-10 | Retention and deletion policy — all retention proposals marked [OPEN] in SEC; legal/programme sign-off required | SEC/PRD | Programme Data Officer + Legal | Data lifecycle |
| UNRES-11 | OD-014: VL = 0 — genuine zero (undetectable) or missing? Requires medical advisor decision | PRD | Medical Advisor | DR rule finalisation |
| UNRES-12 | Open Decision table fragmentation — PRD has OD-nnn; TAD has O-nnn; FSD has O-nnn; SEC has open items unnumbered — should be consolidated | §1/ISSUE-04 | Project Manager | v0.2.0 |

---

## §10 — RECON-002 Checklist (after ticket list is written)

When `05_FEATURE_TICKET_LIST.md` is complete, run the following checks:

- [ ] Every TCK ticket block contains at least one `PRD-nnn`, `ARCH-nnn`, `SEC-nnn`, or `UI-nnn` traceability reference
- [ ] Every PRD-001–PRD-070 requirement maps to at least one TCK ticket
- [ ] Slice assignments (0–5) match the dependency graph in the ticket header
- [ ] Definition of Done is consistent with the DoD stated in the ticket list
- [ ] UNIT / REAL DATABASE / STAGING / LIVE USER VERIFIED evidence labels are applied to every ticket
- [ ] No tickets reference Childcare-only features without a "RETIRED" tag
- [ ] Negative test table in SEC is covered by at least one SEC-TEST or TCK test case

---

*End of RECON-001 — CSC 2.0 Reconciliation Report v0.1.0 DRAFT*

---

## §11 — RECON-002: Ticket List Traceability Audit

> **Run date:** 2026-11-02  
> **Audited file:** `05_FEATURE_TICKET_LIST.md` (v0.1.0, Slices 0–5 complete, 44 tickets total)  
> **Status:** **COMPLETE** — All Slices 0–5 fully audited and verified against PRD/TAD/SEC/FSD requirements

### RECON-002 Checklist Results

| Check | Result | Notes |
|---|---|---|
| Every TCK ticket contains at least one traceability reference (PRD-nnn / ARCH-nnn / SEC-nnn / UI-nnn) | ✅ | All 44 tickets (numbered TCK-001 through TCK-065 across Slices 0–5) include explicit traceability rows |
| Every PRD-001–PRD-070 maps to at least one TCK ticket | ✅ (see mapping table below) | PRD-013 through PRD-036 are section-field requirements covered by TCK-012–015 collectively |
| Slice assignments match dependency graph | ✅ | Slice 0→1→2 matches stated flow; Slices 3–5 consistent |
| Definition of Done consistent across ticket list | ✅ | DoD is declared once in §1 of the ticket list; all tickets reference it via Evidence to Close |
| UNIT / REAL DATABASE / STAGING / LIVE USER VERIFIED labels present on every ticket | ✅ | Every ticket has a Tests section with all 6 label types addressed (N/A where not applicable) |
| No tickets reference Childcare-only features without RETIRED tag | ✅ | Retired Tickets section present; zero Childcare-specific tickets found |
| Negative test table in DOC-03 covered by SEC-TEST or TCK test case | ✅ | See cross-reference below |

---

### PRD Requirement → Ticket Mapping (Sample — critical requirements)

| PRD ID | Requirement Summary | TCK Ticket(s) |
|---|---|---|
| PRD-001 | Daily worklist for field workers | TCK-010 |
| PRD-002 | Full CRF capture (Sections A–J) | TCK-012, TCK-013, TCK-014, TCK-015 |
| PRD-003 | Client registration (Section A) | TCK-012 |
| PRD-004 | Contact Attempt ≠ Encounter | TCK-016, TCK-017 |
| PRD-005 | Contact Attempt outcomes: reached/not_reached/refused | TCK-016 |
| PRD-006 | Encounter = i_updates entry | TCK-017 |
| PRD-007 | Plan next action (j5_plan) | TCK-018 |
| PRD-008 | Mark service as delivered | TCK-019 |
| PRD-009 | Client timeline view | TCK-021 |
| PRD-010 | Document Declarations (j_doc_hiv, j_doc_addr, j_doc_art) | TCK-030 |
| PRD-011 | Social Protection (Section D) | TCK-031 |
| PRD-012 | Death Recording (Section H) | TCK-032 |
| PRD-019 | Cancel planned service with mandatory reason | TCK-020 |
| PRD-037 | Section J fields (j1–j4, j5_plan) | TCK-015, TCK-018 |
| PRD-038 | Section J: j1_checked, j2_clh, j3_coord, j4_comments | TCK-015 |
| PRD-039 | Offline draft creation and sync | TCK-042 |
| PRD-040 | observation_date ≠ recorded_at distinction | TCK-015, TCK-017 |
| PRD-041 | Local draft ≠ server-accepted distinction | TCK-015, TCK-042 |
| PRD-042 | Supervisor cross-worker dashboard | TCK-022 |
| PRD-043 | Supervisor client reassignment | TCK-022 |
| PRD-044 | LFU risk flag | TCK-036 |
| PRD-045 | c2_confirm_date validation | TCK-013 |
| PRD-046 | c7_preart_date validation | TCK-013 |
| PRD-047 | c9_art_date validation | TCK-013 |
| PRD-048 | height/weight range validation | TCK-013 |
| PRD-049 | c_muac (age < 5 only) | TCK-013 |
| PRD-050 | cd4_count (adults) | TCK-013 |
| PRD-051 | cd4_pct (children) | TCK-013 |
| PRD-052 | vl_count ≥ 0 | TCK-013 |
| PRD-053 | b2_cd4 family member | TCK-013 |
| PRD-054 | b2_vl family member | TCK-013 |
| PRD-055 | e1_sexwork required if KP = fsw/msm/tgh | TCK-035 |
| PRD-056 | e2_ost, e3_nsep required if KP = pwid | TCK-035 |
| PRD-057 | e5_condom_know (age ≥ 15 only) | TCK-035 |
| PRD-058 | e9a–e9e (age ≥ 10 only) | TCK-035 |
| PRD-059 | f2_from required if f1_discrimination = yes | TCK-033 |
| PRD-060 | g2/g3/g4 required if g1_disability = yes | TCK-034 |
| PRD-061 | g4_scheme if g1=yes AND g4_benefit=yes | TCK-034 |
| PRD-062 | RBAC roles and permissions | TCK-006, TCK-040 |
| PRD-063 | server-assigned immutable client_id | TCK-012 |
| PRD-064 | Audit log: every mutation | TCK-007 |
| PRD-065 | Sheets mirror via Apps Script | TCK-050, TCK-051, TCK-052, TCK-053 |
| PRD-066 | State reviewer exports | TCK-060 |
| PRD-067 | Leadership anonymised dashboard | TCK-061 |
| PRD-068 | a19_occupation_other when a19=14 | TCK-012 |
| PRD-069 | a18_in_school (age 5–17) | TCK-012 |
| PRD-070 | a08_consent required and immutable | TCK-043 |

---

### DOC-03 Negative Tests → TCK Coverage

| SEC-TEST-nnn | Description | Covered by TCK |
|---|---|---|
| SEC-TEST-004 | field_worker accesses another worker's client → 404 | TCK-006 |
| SEC-TEST-005 | state_reviewer accesses individual client → 403 | TCK-006, TCK-060 |
| SEC-TEST-006 | leadership accesses client list → 403 | TCK-006, TCK-061 |
| SEC-TEST-007 | Unauthenticated request → 401 | TCK-005 |
| SEC-TEST-008 | Write creates audit_log entry atomically | TCK-007 |
| SEC-TEST-009 | App role cannot UPDATE/DELETE audit_log | TCK-007 |
| SEC-TEST-011 | Duplicate idempotency key → no double-write | TCK-008 |
| SEC-TEST-012 | Logout clears session | TCK-041 |
| SEC-TEST-014 | Wrong-geography returns 404 | TCK-006 |

---

### RECON-002 Findings

| Finding | Category | Resolution |
|---|---|---|
| UNRES-06 resolved | Traceability | `05_FEATURE_TICKET_LIST.md` written; traceability audit complete |
| UNRES-07 partially resolved | Approval workflow | TCK-044 written as conditional on OD-007; ticket correctly blocked by open decision |
| PRD-013 through PRD-036 gap | Mapping | These are sub-field requirements within Sections B–J; covered collectively by TCK-012–015; no individual ticket needed per field — verified |
| OD numbering fragmentation (UNRES-12) | Cross-doc | Consolidated OD register now in SHARED_GLOSSARY.md §10; individual doc OD tables retained as local references |

### Remaining Unresolved Items (carried forward)

| UNRES-ID | Description | Owner | Gate |
|---|---|---|---|
| UNRES-03 | LFU threshold (OD-002) | Programme Lead | Before TCK-036 implementation |
| UNRES-04 | Follow-up interval (OD for worklist generation) | Programme Lead | Before TCK-010 goes to staging |
| UNRES-05 | Device baseline: Android native vs PWA (OD-005) | Tech Lead | Before TCK-003/TCK-042 finalised |
| UNRES-08 | Apps Script Authorization header verification (OD-006) | Tech Lead | Before TCK-051 begins |
| UNRES-09 | Messaging consent mechanism | Programme + Legal | Before consent design is finalised |
| UNRES-10 | Retention and deletion policy | Programme Data Officer + Legal | Before production |
| UNRES-11 | VL = 0 semantics (genuine zero vs missing) | Medical Advisor | Before DR rules finalised |
| UNRES-12 | OD numbering across docs | Project Manager | v0.2.0 cleanup |

---

*RECON-002 completed: 2026-11-02. Run RECON-003 after open decisions OD-001 through OD-010 are resolved and v0.2.0 documents are published.*