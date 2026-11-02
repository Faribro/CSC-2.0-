# Parity Inventory: Reference Repository vs CSC 2.0 Follow-Up Platform

| Metadata | Details |
| :--- | :--- |
| **Document ID** | `DOC-PARITY-01` |
| **Status** | `[PROPOSED]` / `[VERIFIED]` |
| **Reference Repository (Read-Only)** | `https://github.com/Faribro/Childcare-Support---Phase-3-.git` (Commit `5a3bcce`) |
| **Target System** | CSC 2.0 Follow-Up Platform (`feat/csc-vs1` & `feat/csc-form`) |
| **Evaluation Date** | 2026-11-02 |
| **Scope Boundaries** | Read-only analysis. Strictly zero copy of child-specific fields, child clinical rules, or Tigris document file uploads. |

---

## 1. Executive Parity Matrix

| Capability | Old Implementation (File Paths) | Needed for CSC? | Strategy | Justification & Architectural Decision |
| :--- | :--- | :---: | :---: | :--- |
| **Landing Page** | `src/app/page.tsx`<br>`src/components/landing/*` (NotebookHero, ConnectedCareStory, LivingRiver, FieldFaq) | Yes | **Adapt** | Adopt the warm editorial notebook visual language, Alliance green (`#047857`) and teal (`#0D9488`) palette, and mission clarity. Replace child-specific copy with adult/family CSC 2.0 follow-up mission, workflow indicators, and role entry points. |
| **Sign-In & Authentication** | `src/app/api/auth/*`<br>`src/components/auth/LeadershipOtpFlow.tsx`<br>`src/components/auth/StateTeamAuthFlow.tsx` | Yes | **Adapt** | Adapt role-based security model: `field_worker`, `supervisor`, `state_reviewer`, `administrator`, `leadership`. Implement session authentication with HttpOnly cookies, RBAC route guards, and mock/dev passkeys. Retire complex state-team multi-factor SMS OTP until Slice 3 approval. |
| **User Onboarding** | `src/components/auth/WelcomeKiteOnboardingModal.tsx`<br>`src/app/api/auth/field-user/complete-onboarding/route.ts` | Yes | **Adapt** | Retain welcoming first-time field worker experience explaining offline-first behavior and sync expectations. Replace kite theme with CSC community health and confidentiality commitment. |
| **Form Shell & Navigation** | `src/components/layout/AppShell.tsx`<br>`src/components/layout/CompactMasthead.tsx`<br>`src/components/layout/MobileContextBar.tsx`<br>`src/components/forms/MobileFormSectionRunner.tsx` | Yes | **Rebuild** | Rebuild for the CSC single-page form with TWO TABS: **Tab 1: Registration (Sections A–H, J)** and **Tab 2: Follow-Up**. Retain the sticky beneficiary context bar (name, age, gender, CSC, status), sticky section index (anchor links A–H, J), and mobile jump modal. Keep registration and visit recording strictly decoupled. |
| **Autosave & Local Drafts** | `src/lib/db/draftRepository.ts`<br>`src/lib/db/dexieDb.ts`<br>`src/app/assessment/drafts/page.tsx` | Yes | **Adapt** | Use IndexedDB (Dexie or native IDB) to isolate drafts per user account. Save local state with timestamps, display 3-state sync indicator (`Saved locally` / `Queued` / `Accepted by server`), and render review-before-submit summary. |
| **Offline Storage & Sync Queue** | `src/lib/platform/offlineFormManager.ts`<br>`src/lib/sync/syncOrchestrator.ts`<br>`src/lib/db/syncQueueRepository.ts` | Yes | **Rebuild** | Replace client-side Supabase REST writes with durable BFF dispatch to Spring Boot backend (`/api/v1/*`). Maintain queue of offline mutations with UUIDs, `Idempotency-Key`, and `expectedVersion`. Replay upon network reconnection. |
| **Supervisor & Leadership Views** | `src/app/supervisor/*`<br>`src/app/leadership/*`<br>`src/components/supervisor/*` (CaseStatusSummaryDashboard, linelistFilterUtils) | Yes | **Adapt** | Maintain role-gated navigation: `My Work`, `Clients`, `Reports`, `Admin`. Supervisors monitor overdue follow-ups, center-level linelists, and worker activity. Leadership accesses aggregated KPIs and export runbooks (leadership is strictly read-only, not admin). |
| **Reports & Linelists** | `src/features/leadership-reporting/*`<br>`src/features/leadership-reporting/linelist-excel-generator.ts` | Yes | **Adapt** | Adapt Excel/CSV generation patterns for CSC follow-up linelists. Base metrics strictly on canonical follow-up events (contact attempts, encounters, planned vs delivered services) rather than invented risk thresholds. |
| **PWA Install & Service Worker** | `src/components/pwa/PwaRegistration.tsx`<br>`src/sw.ts`<br>`public/manifest.json` | Yes | **Keep** | Retain lightweight PWA install banner (`beforeinstallprompt` event), offline asset caching, and standalone display mode for field Android tablets/phones. |
| **Child Anthropometry & Clinical Rules** | `src/lib/clinical/nutritionCalculations.ts`<br>`src/lib/clinical/artStatusLogic.ts`<br>`src/lib/clinical/viralLoadPolicy.ts` | **No** | **Retire** | **STRICTLY RETIRED**: Child Z-scores, MUAC child cutoffs, school fee aid grids, and child ART regimens. CSC 2.0 follows adult/general CRF from `CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx`. No invented clinical rules. |
| **Binary Document Uploads & Tigris S3** | `src/lib/server/tigrisStorageService.ts`<br>`src/lib/server/mediaProcessingService.ts`<br>`src/components/ui/PhotoUpload.tsx` | **No** | **Retire** | **STRICTLY RETIRED FOR MVP**: Per non-negotiable rules, document sighted questions (Aadhaar, ART card, income/caste certs) are **declarations only** (yes/no boolean attestations). Zero binary file uploads to S3/Tigris in CSC-VS1. |
| **Caregiver Signature Pad** | `src/components/ui/CaregiverSignaturePad.tsx`<br>`src/lib/db/dexieDb.ts` (SignatureAttachment) | **No** | **Retire** | **RETIRED**: CSC 2.0 CRF records worker-attested verbal/written consent as boolean flags (`a08_consent_status`), not canvas PNG signatures. |
| **WhatsApp AI Multimodal Agent** | `src/features/ai-multimodal/*`<br>`src/features/whatsapp-document-loop/*` | **No** | **Retire** | **DEFERRED**: Multi-modal document classification and WhatsApp conversational bots are out-of-scope for CSC-VS1 core authority platform. Deferred to future extension slices. |

---

## 2. Design System & Component Visual Language

To preserve brand family unity with `Childcare-Support---Phase-3-`, CSC 2.0 adopts the identical typography and color tokens:

### 2.1 Color Tokens
- **Alliance Emerald**: `#047857` (Primary Alliance identity)
- **Brand Teal**: `#0D9488` (Primary Action & Active States)
- **Surface Canvas**: `#F8FAFC` (Slate 50 background)
- **Surface Card**: `#FFFFFF` with `border border-slate-200 shadow-sm`
- **Ink Primary**: `#0F172A` (Slate 900)
- **Ink Secondary**: `#475569` (Slate 600)
- **Alert Amber**: `#B45309` / Light `#FFFBEB` (Upcoming / Warning)
- **Alert Rose**: `#BE123C` / Light `#FFF1F2` (Overdue / Critical Error)

### 2.2 Typography & Accessibility
- **Font Stack**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
- **Touch Target Sizes**: All interactive elements maintain `min-height: 48px` (compact: `44px`)
- **Bilingual Support**: Strict English and Hindi parity across labels, hints, validation messages, and buttons.
