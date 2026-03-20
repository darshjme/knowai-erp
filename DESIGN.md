# Design System — KnowAI ERP

## Product Context
- **What this is:** Internal ERP for a creative content agency — managing HR, hiring, payroll, projects, content review, and team communication
- **Who it's for:** Internal team (~10-50 people), creative and technical roles
- **Space/industry:** Creative agency operations, internal tooling
- **Project type:** Web app / dashboard / internal tool

## Aesthetic Direction
- **Direction:** Clean, flat, minimal — professional data-driven UI
- **Decoration level:** None. Surfaces are solid white with subtle borders. Visual hierarchy comes from typography weight, spacing, and restrained color — not effects.
- **Mood:** Focused, efficient, professional. Think Linear, Notion, Figma app — tools that get out of your way and let data speak. Every pixel serves a purpose.
- **Reference:** Linear, Notion, Figma, Vercel Dashboard, Stripe Dashboard

## Typography

### Font Stack
- **Headings/Display:** Manrope — geometric, modern, excellent for dashboards
- **Body/UI:** Inter — highly legible at all sizes, designed for screens
- **Data/Tables:** Inter with `font-feature-settings: 'tnum'` — tabular numbers for financial column alignment
- **Code:** JetBrains Mono — clean monospace with ligature support
- **Body fallback:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Heading fallback:** `'Manrope', 'Inter', -apple-system, sans-serif`
- **Mono fallback:** `'JetBrains Mono', 'Fira Code', 'Menlo', monospace`
- **Loading:** Google Fonts CDN for Inter (400, 500, 600) + Manrope (600, 700, 800)

### Type Scale
| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| Display | 36px | 800 | Manrope | Page hero headings |
| H1 | 28px | 700 | Manrope | Page titles |
| H2 | 22px | 700 | Manrope | Section headings |
| H3 | 18px | 600 | Manrope | Card titles |
| H4 | 16px | 600 | Inter | Sub-section headings |
| Body | 14px | 400 | Inter | Default body text |
| Body Small | 13px | 400 | Inter | Secondary text, metadata, captions |
| Caption | 11px | 600 | Inter | Table headers, section labels (uppercase, 0.5px tracking) |
| Code | 13px | 400 | JetBrains Mono | Inline code, code blocks |

### Typography Rules
- Letter-spacing: -0.2px to -0.8px for Manrope headlines (tighter at larger sizes)
- Inter body text: default letter-spacing (0)
- Line-height: 1.1 for display, 1.3 for headings, 1.5 for body
- Section labels: 11px, 600 weight, uppercase, 0.5px letter-spacing, secondary color
- Financial numbers always use `font-variant-numeric: tabular-nums`

## Color

### Approach: Restrained and Semantic
Color is meaningful — status, alerts, data visualization. Never decorative.

### Core Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#111827` | Actions, buttons, active states, primary fill |
| Primary Hover | `#1F2937` | Hover state for primary elements |
| Primary Tint | `rgba(17, 24, 39, 0.06)` | Selected rows, active sidebar items |
| Accent | `#3B82F6` | Links, info highlights, accent elements |
| Accent Hover | `#2563EB` | Hover state for accent elements |
| Accent Tint | `rgba(59, 130, 246, 0.08)` | Focus rings, accent backgrounds |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#16A34A` | Approved, active, completed, positive delta |
| Warning | `#F59E0B` | Pending, on-leave, attention needed |
| Danger | `#DC2626` | Rejected, failed, negative delta, destructive actions |
| Info | `#0EA5E9` | In review, informational, neutral status |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| Text Primary | `#111827` | Headlines, body text, primary content |
| Text Secondary | `#6B7280` | Metadata, captions, sidebar labels |
| Text Muted | `#9CA3AF` | Placeholders, disabled text |
| Background | `#F9FAFB` | Page background |
| Surface | `#FFFFFF` | Cards, panels, content areas |
| Border | `#E5E7EB` | Card borders, dividers, input borders |
| Divider | `#F3F4F6` | Table row separators, subtle dividers |

### Dark Mode
Strategy: Slate-based palette. Redesign surfaces, not just invert.

| Token | Light | Dark |
|-------|-------|------|
| Text Primary | `#111827` | `#F9FAFB` |
| Text Secondary | `#6B7280` | `#94A3B8` |
| Text Muted | `#9CA3AF` | `#475569` |
| Background | `#F9FAFB` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Border | `#E5E7EB` | `#334155` |
| Divider | `#F3F4F6` | `#1E293B` |

Dark mode semantic colors: success `#22C55E`, warning `#FBBF24`, danger `#EF4444`, info `#38BDF8`

### Surface Styling
All surfaces are solid — no transparency, no blur, no backdrop-filter.
```css
/* Standard card surface */
.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
}

/* Dark mode surface */
[data-theme="dark"] .card {
  background: #1E293B;
  border: 1px solid #334155;
}

/* Elevated surface (dropdowns, modals) */
.elevated {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}
```

### Accessibility Requirements
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Keyboard navigation:** All interactive elements focusable via Tab. Focus ring: 2px solid `#3B82F6`, 2px offset
- **Screen readers:** ARIA landmarks on sidebar (nav), main content (main), header (banner)
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all transforms and animations, keeps opacity transitions

## Spacing
- **Base unit:** 8px
- **Density:** Moderate — balanced between spacious and compact. Enough breathing room for clarity without wasting screen space.
- **Scale:**

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (badge padding, inline spacing) |
| sm | 8px | Compact gaps (between related elements) |
| md | 16px | Default content padding |
| lg | 24px | Section padding, card padding |
| xl | 32px | Page section gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level vertical rhythm |

## Layout
- **Approach:** Grid-disciplined, moderate density
- **Grid:** 12-column on desktop (>1024px), 6-column on tablet (768-1024px), 4-column on mobile (<768px)
- **Max content width:** 1200px
- **Sidebar:** 240px (expanded), 64px (collapsed), solid white background with right border
- **Header:** 56px height, solid white background with bottom border
- **Responsive breakpoints:**
  - Mobile: <768px — sidebar hidden, overlay on toggle
  - Tablet: 768-1024px — sidebar collapsed (64px icons only)
  - Desktop: >1024px — sidebar expanded (240px)
  - Large: >1440px — wider content area

### Border Radius
Clean, consistent corners — not overly rounded:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Small badges, tiny elements |
| sm | 6px | Buttons, inputs, badges |
| md | 8px | Default — dropdowns, alerts, small cards |
| lg | 10px | Cards, table containers, modals |
| xl | 16px | Large panels, hero sections |
| pill | 100px | Pill buttons, status badges |
| full | 50% | Avatars, circular icons |

### Shadows
Very subtle, used sparingly for elevation:

| Token | Value | Usage |
|-------|-------|-------|
| sm | `0 1px 2px rgba(0, 0, 0, 0.05)` | Buttons, inputs on focus |
| md | `0 1px 3px rgba(0, 0, 0, 0.1)` | Dropdowns, popovers |
| lg | `0 4px 6px rgba(0, 0, 0, 0.07)` | Modals, floating panels |

## Motion
- **Approach:** Minimal and functional
- **Philosophy:** Motion should be nearly invisible. Quick, subtle transitions that confirm interaction without drawing attention.

### Timing
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| Micro | 150ms | `ease` | Hover, focus, toggle states, color changes |
| Short | 200ms | `ease-out` | Dropdowns, tooltips, badge transitions |
| Medium | 250ms | `ease-out` | Sidebar toggle, panel open/close |
| Long | 300ms | `ease-out` | Modals (fade + slight translate), page transitions |

### Motion Rules
- Hover: color/background change only, 150ms. No translateY, no scale, no shadow lift.
- Cards: No hover animation. No scale. No lift. Static until clicked.
- Modals: fade-in + translateY(-8px to 0), dismiss with fade-out
- Sidebar: width transition 250ms ease-out
- No spring physics. No bouncing. No scale transforms on interactive elements.
- Reduced-motion: respect `prefers-reduced-motion: reduce` — disable all transitions

## Component Patterns

### Status Badges
Pill shape with tinted background:
```css
.badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  /* Color: semantic background at 10% opacity, text at full semantic color */
}
```

### Stat Cards
Solid white surface with border, 20px padding, tabular numbers, delta indicator (green up / red down). No hover effects. No shadow lift.

### Data Tables
Solid white container with border. Clean header row (gray-50 background, uppercase 11px labels). Rows separated by subtle dividers. Hover: faint gray background. No fancy effects.

### Buttons
- **Primary:** `#111827` fill, white text, 6px radius. Hover: `#1F2937`.
- **Secondary:** White fill, `#E5E7EB` border, dark text. Hover: `#F9FAFB` fill.
- **Danger:** `#DC2626` fill, white text. Hover: `#B91C1C`.
- **Ghost:** No background, no border. Hover: faint gray background.

### Alerts
Full-width, subtle border, tinted background at 8% opacity. Icon + message. Border-radius: 8px.

### Avatars
Gradient backgrounds (unique per user), white initials, border-radius: full.

## Surface Hierarchy
All surfaces are flat and solid. Hierarchy comes from borders and subtle shadows:

| Layer | Element | Treatment | Rationale |
|-------|---------|-----------|-----------|
| 0 | Page background | Solid `#F9FAFB` / `#0F172A` | Base canvas |
| 1 | Sidebar, Header | Solid white, border separators | Fixed navigation chrome |
| 2 | Cards, stat panels, filter bars | Solid white, 1px border `#E5E7EB` | Content containers |
| 3 | Data tables, forms | Solid white, 1px border | Data-dense views |
| 4 | Modals, dropdowns, tooltips, toasts | Solid white, border + shadow-lg | Elevated floating elements |

## Interaction State Kit
Every page follows these standard patterns. No per-page design decisions needed.

### Loading State
- **Skeleton loaders** — solid gray rectangles (#F3F4F6) with a subtle shimmer animation
- Skeleton shapes mimic the content layout (stat cards = rounded rectangles, table rows = horizontal bars, etc.)
- Animation: horizontal shimmer gradient, 1.5s duration, ease-in-out, infinite
- Never use a raw spinner for page-level loading. Spinners only for inline actions (button submit, etc.)

### Empty State
Every empty state has 3 elements:
1. **Icon** — Lucide icon at 48px, text-muted color, 0.5 opacity
2. **Message** — Warm, human language. NOT "No items found." Examples:
   - Payroll: "No payroll records yet. Create your first payroll run to get started."
   - Hiring: "No job postings yet. Post your first opening to start building your team."
   - Chat: "No messages yet. Say hello to get the conversation started."
3. **Primary action** — Button matching the page's main action (e.g., "+ Create Payroll", "+ Post Job")

Empty state container: centered vertically and horizontally, max-width 400px, padding 48px.

### Error State
- **Alert component** — danger style (red tint background, danger text color)
- Message format: "Something went wrong loading [resource]. Please try again."
- Always include a "Retry" button
- Never show raw error messages or stack traces to users

### Success State
- **Toast notification** — slides in from top-right, solid white surface with border + shadow
- Auto-dismiss after 4 seconds
- Includes dismiss button (X)
- Format: "[Action] successful." e.g., "Payroll created successfully."

### Partial State
- Show loaded content normally
- Failed sections show inline error with retry
- Never block the entire page for one failed section

## Notification UI (SSE)
Real-time notifications arrive via Server-Sent Events and display in two places:

### Notification Bell (Header)
- Lucide Bell icon in header
- Unread count: red badge (min-width 18px, centered number, pill shape)
- Click opens notification panel (dropdown or slide-in panel)

### Notification Toast
- New notifications trigger a toast in the top-right corner
- Solid white surface with border and shadow, 360px max-width, border-radius 10px
- Icon (by notification type) + title + message + timestamp
- Auto-dismiss after 5 seconds, stack up to 3 visible

### Notification Panel
- Dropdown from bell icon, 400px wide, max-height 500px, scrollable
- Solid white surface with border and shadow
- Each item: icon + title + message + relative time ("2m ago")
- Unread items have accent tint background
- "Mark all as read" link at top
- "View all" link at bottom → /notifications page

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-19 | Apple glassmorphism direction | Initial design direction based on user request |
| 2026-03-19 | SF Pro + Geist fallback | Initial typography choice for Apple aesthetic |
| 2026-03-19 | 8px base unit | Balanced spacing for dashboard density |
| 2026-03-19 | Standard interaction state kit | Skeleton loaders, warm empty states with CTAs, error alerts with retry, toast success |
| 2026-03-19 | Notification UI spec | Toast (top-right, auto-dismiss 5s), bell badge (red pill), notification panel (dropdown 400px) |
| 2026-03-20 | **Redesign: Glassmorphism → Clean Flat Design** | Complete redesign based on Figma implementation. Replaced glassmorphism with clean, flat, solid surfaces. Rationale: glassmorphism added visual complexity without improving usability, caused performance issues with backdrop-filter on data-heavy views, and conflicted with the data-driven nature of an ERP. New direction inspired by Linear/Notion/Figma — professional tools that prioritize content clarity over visual effects. Typography changed from SF Pro to Inter + Manrope (openly licensed, cross-platform consistent, loaded via Google Fonts). Colors shifted from Apple blue (#007AFF) to dark primary (#111827) + blue accent (#3B82F6) for a more neutral, professional palette. All translucency, blur, and glass effects removed. Borders changed from rgba to solid hex values. Border radii reduced for a tighter, more utilitarian feel. Motion simplified — no hover lifts, no scale transforms, just color transitions. |
