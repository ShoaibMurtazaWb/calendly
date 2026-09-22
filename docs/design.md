# Sched Design System & Interface Specification (`docs/design.md`)

This document is the authoritative design system and interaction specification for **Sched**. It defines the visual foundations, semantic design tokens, component standards, UX patterns, and quality criteria for all existing screens and future product development.

---

## 1. Product Design Philosophy & Visual Intent

Sched is an operational, high-precision calendar scheduling platform engineered to eliminate scheduling friction for hosts and attendees across timezones.

### Experience Personalities & Density Rules

| Dimension | Host Dashboard | Public Booking Flow | Authentication | Landing Page |
|---|---|---|---|---|
| **Primary Intent** | Fast, dense, high-frequency operational control | Welcoming, low-friction, progressive single-task booking | Distraction-free credentials submission | Product-led capability demonstrations |
| **Information Density** | **High**: Tight 8px/12px padding, compact controls (`h-8`/`h-9`), tabular metrics | **Generous**: Visual breathing room, balanced columns, clear date/time selection | **Focused**: Minimal centered card, high contrast | **Structured**: Clear workflow grids, zero generic marketing blobs |
| **Navigation Model** | Instant topbar tabs, search (`⌘K`), quick-action dropdowns | Progressive multi-step (Event → Date → Time → Details) on mobile | Single linear form with back links | Sticky solid topbar with direct action CTAs |

---

## 2. Design Token Architecture & Semantic Foundation

To ensure maintainability and allow future theming (such as dark mode) without component rewrites, **shared components must consume semantic design tokens** rather than hardcoded primitive neutral or status classes.

```
┌────────────────────────────────────────────────────────┐
│  Primitive Tokens (Raw Palettes, Font Scales)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Semantic Tokens (--bg-canvas, --border-subtle, etc.)  │
│  (Enables future theming without component rewrites)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Component Rules & Action Hierarchies                  │
└────────────────────────────────────────────────────────┘
```

---

### Layer 1: Primitive Tokens

#### Neutral Palette (Zinc / Slate Foundation)
* `neutral-0`: `#FFFFFF`
* `neutral-50`: `#FAFAFA`
* `neutral-100`: `#F4F4F5`
* `neutral-200`: `#E4E4E7`
* `neutral-300`: `#D4D4D8`
* `neutral-400`: `#A1A1AA`
* `neutral-500`: `#71717A`
* `neutral-600`: `#52525B`
* `neutral-700`: `#3F3F46`
* `neutral-800`: `#27272A`
* `neutral-900`: `#18181B`
* `neutral-950`: `#09090B`

#### Semantic Color Primitives
* **Emerald (Available / Live / Success)**: `50: #ECFDF5`, `200: #A7F3D0`, `500: #10B981`, `700: #047857`, `800: #065F46`
* **Rose (Blackouts / Errors / Destructive)**: `50: #FFF1F2`, `200: #FECDD3`, `500: #F43F5E`, `700: #BE123C`, `800: #9F1239`
* **Blue / Sky (Info / Links)**: `50: #EFF6FF`, `200: #BFDBFE`, `500: #3B82F6`, `800: #1E40AF`
* **Amber (Unsaved / Warning)**: `50: #FFFBEB`, `200: #FDE68A`, `500: #F59E0B`, `800: #92400E`

---

### Layer 2: Semantic Design Tokens

All shared components must reference these semantic tokens declared in `apps/web/app/globals.css`:

```css
:root {
  color-scheme: light;

  /* Surfaces & Backgrounds */
  --bg-canvas: #FAFAFA;            /* Root body canvas */
  --bg-surface: #FFFFFF;           /* Cards, sheets, dialog surfaces */
  --bg-subtle: #F4F4F5;            /* Input wells, table headers, secondary items */
  --bg-muted: #E4E4E7;             /* Inactive rails, subtle dividers */

  /* Borders & Outlines */
  --border-subtle: #E4E4E7;         /* Hairline card borders, table dividers */
  --border-strong: #D4D4D8;         /* Inputs, interactive controls */
  --border-focus: #18181B;          /* Selected borders, active day border */
  --focus-ring: #18181B;            /* Universal keyboard focus-visible outline */

  /* Text Roles */
  --text-primary: #09090B;          /* Titles, headings, slot timestamps */
  --text-secondary: #52525B;        /* Form labels, subtitles, tabs */
  --text-muted: #71717A;            /* Helper text, captions */
  --text-disabled: #A1A1AA;         /* Disabled dates, past days */

  /* Status Colors */
  --status-success-bg: #ECFDF5;
  --status-success-border: #A7F3D0;
  --status-success-text: #065F46;

  --status-danger-bg: #FFF1F2;
  --status-danger-border: #FECDD3;
  --status-danger-text: #9F1239;

  --status-warning-bg: #FFFBEB;
  --status-warning-border: #FDE68A;
  --status-warning-text: #92400E;

  --status-info-bg: #EFF6FF;
  --status-info-border: #BFDBFE;
  --status-info-text: #1E40AF;
}
```

---

## 3. Z-Index & Elevation Scale

To prevent stacking context conflicts across fixed bars, dropdowns, and dialogs:

| Layer Token | Z-Index Value | Usage |
|---|---|---|
| **`z-base`** | `0` | Default card surfaces, page content |
| **`z-sticky`** | `40` | Sticky dashboard navbar, sticky public header |
| **`z-dropdown`** | `50` | User avatar menu, timezone dropdown popovers |
| **`z-floating-dock`** | `60` | Bottom floating unsaved-changes action bar |
| **`z-dialog`** | `100` | Modals, confirmation dialogs, mobile navigation sheets |
| **`z-toast`** | `150` | Global toast notifications |
| **`z-tooltip`** | `200` | Micro-tooltips and copy indicators |

---

## 4. Action Hierarchy

Buttons and interactive triggers must follow a strict semantic hierarchy:

1. **Primary Action**:
   * *Purpose*: The single most critical action in a view (e.g. *"Create Event Type"*, *"Save Changes"*, *"Confirm & Reserve Slot"*).
   * *Style*: `bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs active:scale-[0.98]`
   * *Rule*: At most **one** primary CTA per view or card hierarchy.
2. **Secondary Action**:
   * *Purpose*: Supporting actions (e.g. *"Copy Link"*, *"Edit"*, *"Custom Hours"*).
   * *Style*: `border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 shadow-2xs`
3. **Tertiary / Ghost Action**:
   * *Purpose*: Low-prominence navigation or supplementary triggers (e.g. *"View Public Page →"*, *"Discard"*, *"Cancel"*).
   * *Style*: `text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg`
4. **Destructive Action**:
   * *Purpose*: Reversible archive or irreversible deletion.
   * *Style*: `text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg` (or `bg-rose-600 text-white` for irreversible modal confirmations).
5. **Overflow Action**:
   * *Purpose*: Compact options grouped in dropdown menus (e.g. user profile menu, extra card actions).

---

## 5. Shared Component Standards

### Control Heights & Ergonomic Scale
* **`h-8` (32px)**: Default compact controls (time dropdowns, interval add/remove buttons, tab triggers, badge actions).
* **`h-9` (36px)**: Standard form inputs (email, title, password, slug inputs, search bar).
* **`h-10` (40px)**: Primary CTA buttons (Confirm reservation, Get Started hero button).
* **Mobile Ergonomic Exception**: On touch devices (screens `< 640px`), primary interactive targets (e.g. calendar day cells, time slot buttons, form submit buttons) should provide an effective touch target area of approximately **44px** where practical.

### Semantic Radii Standards
* **`rounded-md` (6px)**: Inline tags, calendar date cells, micro-badges.
* **`rounded-lg` (8px)**: Inputs, selects, compact buttons, dropdown items.
* **`rounded-xl` (12px)**: Standard application surfaces (dashboard cards, navigation bar, floating dock, modal containers).
* **`rounded-2xl` (16px)**: High-emphasis containers (hero live preview frame, master public booking shell).

### Focus Rings & Transitions
* **Focus Outline**: Every interactive component must consume `--focus-ring` consistently:
  `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1`
* **Explicit Transitions**: Avoid `transition-all`. Explicitly declare transitioned properties:
  `transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out`

---

## 6. Typography & Tabular Precision Rules

### Tabular Numerals (`tabular-nums`) vs. Monospace (`font-mono`)

| Data Type | Typography Rule | Example | Rationale |
|---|---|---|---|
| **Time values & ranges** | `tabular-nums font-sans` | `09:00 AM – 05:00 PM` | Prevents layout shift; aligns colons optically in dropdowns and lists |
| **Duration indicators** | `tabular-nums font-sans` | `30 min`, `45m` | Clean proportional letterforms with fixed digit widths |
| **Metric counts** | `tabular-nums font-sans` | `12 slots`, `5 events` | Numbers align across rows without column drift |
| **Timezone Identifiers** | `font-mono text-xs` | `America/New_York` | Technical IANA identifier |
| **UTC Offsets & ISO Dates** | `font-mono text-xs` | `2026-10-15`, `GMT+5` | Standard technical machine format |
| **Public URLs & Slugs** | `font-mono text-xs` | `sched.com/public/alex/30min` | Technical web URL path |

---

## 7. Product-Specific UX Patterns

### A. Host Dashboard & Navigation (`/dashboard/*`)
* **Header / Topbar**: Sticky `bg-white/95 border-b border-neutral-200/80 px-4 sm:px-8 py-3`.
* **Navigation Tabs**: Pill buttons (`text-xs font-medium px-3.5 py-1.5 rounded-lg`), with active state (`bg-neutral-900 text-white`) and disabled badges (`"Soon"`).
* **Timezone Clock**: Digital clock in host timezone (`text-xs font-mono tabular-nums text-neutral-500`) updated at **minute-level** intervals (`HH:mm [Timezone]`) to prevent unnecessary per-second repaints.
* **User Profile Menu**: Initials avatar with dropdown menu containing username, timezone, public link shortcut, and sign-out action.

### B. Event Types Management (`/dashboard`)
* **Search & Filter**: `Input` with search icon, shortcut indicator (`⌘K`), and Active / Archived segmented toggle.
* **Event Card Hierarchy**:
  1. Top row: Duration pill (`30m` in `tabular-nums font-sans`) and active status indicator (emerald dot).
  2. Middle row: Title (`text-lg font-bold text-neutral-900`) and 2-line description (`text-sm text-neutral-600 line-clamp-2`).
  3. Link bar: Slug URL in `font-mono text-xs text-neutral-600`, one-click copy button, and inline tactile checkmark feedback (`"Copied"` for 2000ms).
  4. Footer toolbar: `Copy Link`, `Edit` button, `View Public Page →` external link, and `Archive` button.
* **Archive & Undo Pattern**:
  * Archiving an event type performs an **immediate archive with proximal Undo banner** rather than forcing an unnecessary blocking confirmation modal.
* **Empty State**: Centered dashed container (`border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center`), plus icon button, explanatory text, and direct creation CTA.

### C. Availability Settings Editor (`/dashboard/availability`)
* **General Settings**: Schedule name input and IANA timezone select dropdown.
* **Weekly Recurring Hours**:
  * Row per day (Monday–Sunday) with checkbox, day label (`w-32`), and intervals container.
  * Time dropdowns styled with `h-8 py-0 tabular-nums font-sans` in 15-minute increments.
  * Dash separator (`—`) vertically centered.
  * Delete trash button (`h-8 w-8 text-neutral-400 hover:text-rose-600`).
  * `+ Add interval` button for split shifts (`h-8 text-xs font-medium border border-dashed border-neutral-300`).
* **Date Overrides Manager**:
  * Date picker input (`h-8`), Type switch (`Unavailable (All day)` vs `Custom Hours`), and Add button.
  * Overrides list distinguishing Blackout dates (Rose badge) from Custom Hours (Neutral/Emerald badge) with individual delete buttons.
* **Minimal Dirty-State Unsaved Changes Bar**:
  * Derived strictly from form dirty state (`isDirty = current !== initial`).
  * Floating bottom dock (`z-floating-dock bg-neutral-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center justify-between gap-4 max-w-xl mx-auto`).
  * Actions: `Discard` (resets form to initial state) and `Save Changes` (dispatches PUT request with localized progress spinner).

### D. Public Booking Experience (`/public/:username` & `/public/:username/:eventSlug`)
* **Host Landing Page (`/public/:username`)**:
  * Host profile card with avatar initials, `@username`, and host local timezone clock.
  * Active event types grid with duration badges and 1-click select actions.
  * "Powered by Sched" footer.
* **Event Booking Calendar (`/public/:username/:eventSlug`)**:
  * **Desktop Layout (1024px+)**: Balanced 3-column layout (Host & Event Details | Month Calendar Picker | Real-Time Time Slots Grid).
  * **Mobile Layout (< 768px)**: **Progressive disclosure flow** (Event Summary → Date Selection → Time Slot Grid → Confirmation Review) rather than an overwhelming vertical stack.
  * **Slot Button States**:
    * Available: `border border-neutral-200 bg-white text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 font-sans tabular-nums text-xs font-semibold py-2 px-3`
    * Selected: `border-neutral-900 bg-neutral-900 text-white shadow-xs`
    * In-flight / Booking: `opacity-60 pointer-events-none`
  * **Booking Preview State Refinement**:
    * When an attendee clicks a time slot, a refined summary card appears within the existing slot column displaying the selected date and time with a direct *"Confirm & Reserve Slot"* CTA.

---

## 8. Feedback, Loading & Notification Strategy

### Loading & Mutation Strategy
1. **Initial Content Loading**: Use structural skeleton loaders (`animate-pulse bg-neutral-200/70 rounded-md`) matching the exact geometry of the target card or calendar grid.
2. **Mutations & Dispatches**: Use localized progress indicators (e.g. disabled button with inline spinning icon for saving schedules, archiving events, or reserving slots) to preserve spatial context.

### Feedback Routing Rules
* **Proximal Inline Feedback**: Use for immediate user actions where the visual origin is active on screen (e.g. *"Copied"* checkmark on copy button, inline field error text below inputs, save banner in forms).
* **Toast Notifications**: Reserved strictly for global or background events where the action origin is no longer in the user's active viewport.

---

## 9. Motion & Interaction Timing Tokens

Motion is functional, restrained, and purposeful. All transitions must respect `@media (prefers-reduced-motion: reduce)`.

### Timing Scale
* **Micro-Transitions (Hover, Focus, Press)**: `duration-150 ease-out` (`150ms cubic-bezier(0.16, 1, 0.3, 1)`)
* **Medium Expansion (Accordion, Split Shift Insert, Dropdown)**: `duration-200 ease-out` (`200ms cubic-bezier(0.16, 1, 0.3, 1)`)
* **Floating Bar / Modal Entry**: `duration-250 ease-out` (`250ms cubic-bezier(0.16, 1, 0.3, 1)`)

### Motion Triggers

| Action / Trigger | Interaction Motion Behavior |
|---|---|
| **Button Hover / Press** | Explicit background/border transition (`duration-150`); optional `active:scale-[0.98]` on primary CTAs |
| **Tab Switch** | Content swap with active indicator background shift (`duration-150`) |
| **Dropdown Open / Close** | Fade + translateY(2px) entry (`duration-150`) |
| **Interval Add / Remove** | Smooth height collapse/expand (`duration-200`) |
| **Unsaved Changes Bar** | Slide up from bottom viewport with fade-in (`duration-200`) |
| **Copy Link Feedback** | Checkmark icon swap with 2000ms timer reset |
| **Calendar Month Nav** | Instant date grid re-render without disorienting sliding loops |
| **Slot Selection** | High-contrast dark fill swap (`duration-150`) |
| **Skeleton to Content** | Shimmer pulse during fetch; instant crossfade upon resolution |

---

## 10. Product Microcopy Guidelines

* **Voice & Tone**: Direct, factual, active voice, and professional.
* **No Unverified Jargon**: Never use *"autonomous scheduling"*, *"zero conflicts"*, *"sub-second"*, or *"AI powered"*.
* **Standard Phrasing**:
  * Time settings: *"Weekly Hours"*, *"Date-Specific Overrides"*, *"Host Timezone"*.
  * Meeting duration: *"30 min meeting"*, *"15 min quick sync"*.
  * Copy actions: *"Copy Link"*, *"Link copied!"*.
  * Unsaved state: *"You have unsaved changes"*, *"Discard"*, *"Save Changes"*.
  * Empty states: *"No active event types yet"*, *"Create your first event type to share your booking link."*

---

## 11. Anti-Patterns Master Reference

Before writing any new component, verify it does **NOT** contain:
1. ❌ Glassmorphism / Frosted backdrop blur layers that reduce text contrast.
2. ❌ Decorative gradient background blobs or artificial glow effects.
3. ❌ Synthetic AI/feature badges (e.g. "STRATEGIC CALL", "LEADERSHIP").
4. ❌ Arbitrary non-standard control heights (must strictly follow default `h-8`, `h-9`, `h-10` scale with documented exceptions).
5. ❌ Global monospace typography on plain text or numbers (reserve `font-mono` for timezone IDs, URLs, and machine data).
6. ❌ Repetitive 3-card generic SaaS marketing blocks.
7. ❌ Excessive pill shapes or nested card containers.
8. ❌ Unverified marketing claims without measured technical validation.

---

## 12. Design QA Checklist

- [ ] Components consume semantic tokens (`--bg-surface`, `--border-subtle`, `--text-primary`, `--focus-ring`) rather than raw hardcoded values.
- [ ] Explicit transitions used instead of `transition-all`.
- [ ] Times, ranges, and metric values use `tabular-nums font-sans`.
- [ ] Monospace (`font-mono`) is used strictly for timezone IDs (`America/New_York`), UTC offsets, URLs, and slugs.
- [ ] Form controls adhere to default heights (`h-8`, `h-9`, `h-10`) with ~44px mobile touch ergonomics where practical.
- [ ] Every interactive component implements all states applicable to its role (rest, hover, focus-visible, active, selected, disabled, invalid, loading).
- [ ] Card radii adhere to semantics: `rounded-xl` for normal surfaces, `rounded-2xl` for high-emphasis shells.
- [ ] Skeletons render for content loading; localized spinners for mutations.
- [ ] Unsaved changes dock appears only when `isDirty` is true and dismisses on save/discard.
- [ ] Reversible archive operations use immediate archive + Undo rather than blocking modals.
- [ ] Animations collapse instantly under `@media (prefers-reduced-motion: reduce)`.
- [ ] Mobile public booking operates as a clean progressive disclosure flow.
- [ ] Tested and verified across 375px, 768px, 1024px, and 1440px viewports.
- [ ] All existing test suites pass without regression.
