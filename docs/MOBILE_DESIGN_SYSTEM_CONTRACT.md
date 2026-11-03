# Mobile Design System Contract (Calm Comic Theme)
## CSC 2.0 — Community Support Centre Intake & Follow-Up Platform

---

## 1. Overview & Principles

The CSC 2.0 design system applies a **calm, friendly, and readable comic theme** optimized for frontline field workers in India operating low-cost Android mobile devices in challenging field environments (bright sunlight, intermittent connectivity).

### Core Principles
1. **Calm Comic Aesthetic**: Restrained, warm, and approachable without childish distractions, cartoon characters, bouncing animations, or confetti.
2. **Accessible Contrast (WCAG 2.2 AA)**: Every text-background pair strictly satisfies or exceeds WCAG 2.2 AA contrast (minimum 4.5:1 for body copy; 3:1 for large text and UI boundaries).
3. **Banned Color Policy**: Zero blue and zero dark-green colors anywhere in UI elements, buttons, links, cards, icons, borders, or charts. The Alliance India brand mark is preserved as an unmodified static asset.
4. **Touch & Ergonomics**: Minimum 48 px touch targets across all mobile interactive controls; generous padding and spacing; bottom navigation on mobile, top navigation on desktop.
5. **No Unicode Emojis**: System icons use standardized `lucide-react` SVG glyphs with accessible aria labels; no platform-dependent raw emojis.

---

## 2. Token Specification (`tokens.css`)

All colors are controlled exclusively through CSS custom properties and Tailwind tokens. No component or style may introduce raw hex colors or Tailwind default palette classes.

| Token | CSS Variable | Hex Value | Purpose / Role | WCAG Contrast on Canvas / Surface |
|---|---|---|---|---|
| **Canvas** | `--canvas` | `#FFFBF5` | Warm white page background | Background base |
| **Surface** | `--surface` | `#FFFFFF` | Cards, modals, inputs, containers | Background surface |
| **Ink** | `--ink` | `#3B2F3F` | Primary text and headings | 12.2:1 (Canvas), 12.6:1 (Surface) |
| **Ink Muted** | `--ink-muted` | `#6B5B6E` | Secondary captions, helper text | 6.1:1 (Canvas), 6.3:1 (Surface) |
| **Primary Action** | `--primary` | `#C8472F` | Coral; primary buttons & active CTA | 4.8:1 (White text on Primary) |
| **Primary Dark** | `--primary-dark`| `#B93A24` | Coral hover/pressed state | 5.7:1 (White text on Hover) |
| **Plum / Link** | `--plum` | `#7B3F8C` | Secondary actions, links, focus ring | 7.2:1 (White on Plum); 6.9:1 on Canvas |
| **Sun Accent** | `--sun` | `#FFD166` | Sunshine highlight badge / indicator | 8.8:1 (Ink on Sun) |
| **Mint Tint** | `--mint` | `#BFEBDD` | Success background, verified pill | 9.7:1 (Ink on Mint) |
| **Lavender Tint**| `--lavender` | `#E4D8F7` | Neutral badge, draft pill | 9.3:1 (Ink on Lavender) |
| **Peach Tint** | `--peach` | `#FFE1CC` | Pending sync pill, warning chip | 10.2:1 (Ink on Peach) |
| **Pink Tint** | `--pink` | `#FFD6E0` | Attention indicator, highlight chip | 9.6:1 (Ink on Pink) |
| **Border** | `--border` | `#8A7A8D` | Component boundaries, card outlines | 4.0:1 on White Surface |

### Semantic State Tokens

- **Success**: Text `#1F6B52` on Background `#E6F8F1` (5.8:1 contrast) paired with Lucide `<Check />` icon.
- **Warning**: Text `#7A4A00` on Background `#FFF3C4` (6.7:1 contrast) paired with Lucide `<AlertTriangle />` icon.
- **Error**: Text `#A3213C` on Background `#FFF0F3` (6.7:1 contrast) paired with Lucide `<AlertCircle />` icon.
- **Focus Ring**: `3px solid #7B3F8C` with `2px offset` on all interactive keyboard/touch targets.

---

## 3. Geometry & Typography

### Geometry Tokens
- **Card Corners**: `rounded-2xl` (`16px`) with 2px subtle border (`border-2 border-border/40`).
- **Button Corners**: `rounded-xl` (`12px`) with 48px minimum hit target.
- **Input Corners**: `rounded-lg` (`10px`) with 44px minimum hit target and 2px focus ring.
- **Shadows**: Low-contrast comic soft shadow:
  - `shadow-comic`: `0 4px 0 0 rgba(138, 122, 141, 0.2), 0 8px 16px -4px rgba(59, 47, 63, 0.08)`
  - `shadow-comic-sm`: `0 2px 0 0 rgba(138, 122, 141, 0.15)`

### Typography
- **Font Stack**: System sans-serif with self-hosted Devanagari font fallback.
- **Body Text**: 14–16 px (`text-sm` / `text-base`), 1.5 line height.
- **Headings**: Semibold to Black (`font-bold` / `font-black`), tracking slightly tight (`tracking-tight`).

---

## 4. Navigation Architecture (Three Top-Level Tabs)

CSC 2.0 provides 3 top-level navigation tabs:
1. **Forms (`/work`)**:
   - Default home for field workers.
   - Header with Alliance India brand, "CSC 2.0" masthead, live connectivity pulsating dot, and EN/HI toggle.
   - Action bar with "+ Start New Registration" CTA.
   - 3-Card Summary Grid: *Unfinished Forms*, *Queued Sync*, *Records & Follow-ups*.
   - In-Progress Drafts linelist with Resume and Delete actions.
2. **Records & Follow-ups (`/clients`)**:
   - Linelist directory of client records submitted by this device/worker.
   - Search bar and filter controls.
   - View / Edit triggers opening single-page registration form.
3. **Evaluation (`/admin`)**:
   - Restricted tab for State Team & Leadership oversight.
   - Inactive/muted appearance with Lock icon and `(Restricted)` label by default.
   - Interactive shackle unlock animation upon credential verification before routing to evaluation view.

---

## 5. Verification & Automated Linters

The project includes two automated linters in `scripts/`:
1. `node scripts/lint_no_banned_colors.js`:
   - Scans all frontend `.tsx`, `.ts`, `.css` files.
   - Asserts zero blue or dark-green color tokens outside the static logo.
2. `node scripts/verify_wcag_tokens.js`:
   - Calculates relative luminance and contrast ratios across all token pairs.
   - Asserts 100% compliance with WCAG 2.2 AA (min 4.5:1 text, min 3.0:1 UI boundaries).
3. `node scripts/lint_no_emoji.js`:
   - Enforces zero unicode emoji characters across frontend source files.
