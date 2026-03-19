# Design System — KnowAI ERP

## Product Context
- **What this is:** Internal ERP for a creative content agency — managing HR, hiring, payroll, projects, content review, and team communication
- **Who it's for:** Internal team (~10-50 people), creative and technical roles
- **Space/industry:** Creative agency operations, internal tooling
- **Project type:** Web app / dashboard / internal tool

## Aesthetic Direction
- **Direction:** Luxury/Refined with Apple Glassmorphism
- **Decoration level:** Intentional — glassmorphism IS the decoration. Frosted glass panels, subtle vibrancy effects, light borders on translucent surfaces. No flat cards — surfaces have depth through translucency and blur.
- **Mood:** Premium, calm, professional. Think macOS Ventura control panels — every surface feels considered, every interaction feels precise. The tool should make your team feel like they're using something built with care.
- **Reference:** Apple macOS Ventura, iOS 17, visionOS design language

## Typography

### Font Stack
- **Display/Hero:** SF Pro Display — Apple's system display font
- **Body/UI:** SF Pro Text — optimized for readability at small sizes
- **Data/Tables:** SF Pro with `font-feature-settings: 'tnum'` — tabular numbers for financial column alignment
- **Code:** SF Mono — Apple's monospace
- **Fallback chain:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Geist', 'Helvetica Neue', sans-serif`
- **Mono fallback:** `'SF Mono', 'Geist Mono', 'Menlo', monospace`
- **Loading:** System font stack — no CDN required. Geist loaded from Google Fonts as cross-platform fallback.

### Type Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 40px | 700 | Page hero headings |
| H1 | 28px | 700 | Page titles |
| H2 | 24px | 700 | Section headings |
| H3 | 20px | 600 | Card titles |
| H4 | 17px | 600 | Sub-section headings |
| Body | 15px | 400 | Default body text |
| Body Small | 13px | 400 | Secondary text, metadata, captions |
| Caption | 11px | 600 | Table headers, section labels (uppercase, 0.5-1px tracking) |
| Code | 14px | 400 | Inline code, code blocks |

### Typography Rules
- Letter-spacing: -0.3px to -1.5px for headlines (tighter at larger sizes)
- Line-height: 1.1 for display, 1.3 for headings, 1.5 for body
- Section labels: 11px, 600 weight, uppercase, 0.5-1px letter-spacing, secondary color
- Financial numbers always use `font-variant-numeric: tabular-nums`

## Color

### Approach: Restrained (Apple System Palette)
Color is meaningful — status, alerts, data visualization. Never decorative.

### Core Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#007AFF` | Actions, links, active states, primary buttons |
| Primary Hover | `#0066D6` | Hover state for primary elements |
| Primary Tint | `rgba(0, 122, 255, 0.1)` | Selected rows, active sidebar items, focus rings |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#34C759` | Approved, active, completed, positive delta |
| Warning | `#FF9500` | Pending, on-leave, attention needed |
| Error | `#FF3B30` | Rejected, failed, negative delta, destructive actions |
| Info | `#5AC8FA` | In review, informational, neutral status |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| Text Primary | `#1D1D1F` | Headlines, body text, primary content |
| Text Secondary | `#86868B` | Metadata, captions, sidebar labels |
| Text Tertiary | `#AEAEB2` | Placeholders, disabled text |
| Background | `#F5F5F7` | Page background |
| Surface Solid | `#FFFFFF` | Elevated solid surfaces |
| Border | `rgba(0, 0, 0, 0.06)` | Subtle dividers |
| Divider | `rgba(0, 0, 0, 0.08)` | Table row borders |

### Dark Mode
Strategy: Redesign surfaces, not just invert.

| Token | Light | Dark |
|-------|-------|------|
| Text Primary | `#1D1D1F` | `#F5F5F7` |
| Text Secondary | `#86868B` | `#98989D` |
| Text Tertiary | `#AEAEB2` | `#636366` |
| Background | `#F5F5F7` | `#000000` |
| Surface Solid | `#FFFFFF` | `#1C1C1E` |
| Glass Surface | `rgba(255,255,255,0.72)` | `rgba(44,44,46,0.72)` |
| Glass Border | `rgba(255,255,255,0.18)` | `rgba(255,255,255,0.1)` |
| Border | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` |
| Shadows | Lower opacity | Higher opacity |

Dark mode semantic colors: success `#30D158`, warning `#FF9F0A`, error `#FF453A`, info `#64D2FF`

### Glassmorphism Recipe
```css
/* Light mode glass surface */
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* Dark mode glass surface */
[data-theme="dark"] .glass {
  background: rgba(44, 44, 46, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Glass hover state */
.glass:hover {
  background: rgba(255, 255, 255, 0.85);
}

[data-theme="dark"] .glass:hover {
  background: rgba(58, 58, 60, 0.85);
}
```

### When to use glass vs. solid
- **Glass:** Stat cards, sidebar, modals, dropdowns, tooltips, floating elements
- **Solid:** Data tables (performance), code blocks, form containers with many inputs
- **Rule:** If the element renders >20 rows of data, use solid background. Glass blur on large surfaces hurts scroll performance.

### Graceful Fallback
For browsers/devices without `backdrop-filter` support:
```css
.glass {
  /* Fallback: solid semi-transparent, no blur */
  background: rgba(255, 255, 255, 0.92);
}

@supports (backdrop-filter: blur(1px)) {
  .glass {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }
}
```
This ensures the app is usable on all devices while looking premium on modern ones.

### Accessibility Requirements
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Keyboard navigation:** All interactive elements focusable via Tab. Focus ring: 2px solid primary, 2px offset
- **Screen readers:** ARIA landmarks on sidebar (nav), main content (main), header (banner)
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all transforms and animations, keeps opacity transitions
- **Glass + contrast:** Semi-transparent surfaces must maintain text contrast. Test with busy backgrounds.

## Spacing
- **Base unit:** 8px
- **Density:** Spacious — Apple-style generous padding
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
| 4xl | 80px | Hero sections |

## Layout
- **Approach:** Grid-disciplined, spacious
- **Grid:** 12-column on desktop (>1024px), 6-column on tablet (768-1024px), 4-column on mobile (<768px)
- **Max content width:** 1200px
- **Sidebar:** 240px (expanded), 64px (collapsed), translucent glass background
- **Header:** 64px height

### Border Radius
Apple's signature rounded corners, hierarchical:

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Buttons, inputs, badges, small cards |
| md | 12px | Cards, table containers, dropdowns |
| lg | 16px | Stat cards, glass panels, modals |
| xl | 20px | Full-page containers, hero sections |
| pill | 50px | Pill buttons, status badges |
| full | 50% | Avatars, circular icons |

## Motion
- **Approach:** Intentional with spring physics
- **Philosophy:** Every motion aids comprehension. No motion for decoration.

### Timing
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| Micro | 150-200ms | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Hover, focus, toggle states |
| Short | 250ms | `ease-out` | Dropdowns, tooltips, badge transitions |
| Medium | 350ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, sidebar toggle |
| Long | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Modals (scale 0.95 -> 1.0 + fade), off-canvas panels |

### Motion Rules
- Hover: `translateY(-2px)` + shadow increase, 150ms
- Cards: scale(1.02) on hover, never on click
- Modals: fade-in + scale-up from 95%, dismiss with fade-out + scale-down
- Sidebar: slide with 250ms ease-out
- No spring physics on data-heavy interactions (table sort, filter) — instant response
- Reduced-motion: respect `prefers-reduced-motion: reduce` — disable transforms, keep opacity transitions

## Component Patterns

### Status Badges
Always use pill shape with tinted background:
```css
.badge {
  padding: 3px 10px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
  /* Color: semantic background at 12% opacity, text at full semantic color */
}
```

### Stat Cards
Glass surface, 20px padding, tabular numbers, delta indicator (green up / red down).

### Data Tables
Solid background container with glass-style border. Rows separated by subtle dividers. Hover: primary tint background. Headers: 11px uppercase, secondary color.

### Alerts
Full-width, no border, tinted background at 12% opacity. Icon + message. Border-radius: sm (8px).

### Avatars
Gradient backgrounds (unique per user), white initials, border-radius: full.

## Surface Hierarchy
Glass treatment depends on the element's layer in the visual stack:

| Layer | Element | Treatment | Rationale |
|-------|---------|-----------|-----------|
| 0 | Page background | Solid `#F5F5F7` / `#000000` | Base canvas, no blur needed |
| 1 | Sidebar, Header | Glass (translucent + blur) | Always visible, establishes depth |
| 2 | Stat cards, filter panels, action bars | Glass | Floating on page background |
| 3 | Data tables, forms with >5 inputs | Solid surface | Performance — blur on large surfaces causes jank |
| 4 | Modals, dropdowns, tooltips, toasts | Glass | Floating above everything |

## Interaction State Kit
Every page follows these standard patterns. No per-page design decisions needed.

### Loading State
- **Skeleton loaders** that match the glass surface style — translucent rectangles with a subtle shimmer animation
- Skeleton shapes mimic the content layout (stat cards = rounded rectangles, table rows = horizontal bars, etc.)
- Animation: horizontal shimmer gradient, 1.5s duration, ease-in-out, infinite
- Never use a raw spinner for page-level loading. Spinners only for inline actions (button submit, etc.)

### Empty State
Every empty state has 3 elements:
1. **Icon** — Lucide icon at 48px, secondary text color, 0.5 opacity
2. **Message** — Warm, human language. NOT "No items found." Examples:
   - Payroll: "No payroll records yet. Create your first payroll run to get started."
   - Hiring: "No job postings yet. Post your first opening to start building your team."
   - Chat: "No messages yet. Say hello to get the conversation started."
3. **Primary action** — Button matching the page's main action (e.g., "+ Create Payroll", "+ Post Job")

Empty state container: centered vertically and horizontally, max-width 400px, padding 48px.

### Error State
- **Alert component** — error style (red tint background, error text color)
- Message format: "Something went wrong loading [resource]. Please try again."
- Always include a "Retry" button
- Never show raw error messages or stack traces to users

### Success State
- **Toast notification** — slides in from top-right, glass surface, success tint
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
- Unread count: red badge (Apple style — min-width 18px, centered number, pill shape)
- Click opens notification panel (dropdown or slide-in panel)

### Notification Toast
- New notifications trigger a toast in the top-right corner
- Glass surface, 360px max-width, border-radius lg (16px)
- Icon (by notification type) + title + message + timestamp
- Auto-dismiss after 5 seconds, stack up to 3 visible
- Subtle notification sound (already exists in Header.jsx)

### Notification Panel
- Dropdown from bell icon, 400px wide, max-height 500px, scrollable
- Glass surface with blur
- Each item: icon + title + message + relative time ("2m ago")
- Unread items have primary tint background
- "Mark all as read" link at top
- "View all" link at bottom → /notifications page

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-19 | Apple glassmorphism direction | User requested Apple-inspired design with glassmorphism, SF Pro fonts, and Apple color palette |
| 2026-03-19 | SF Pro + Geist fallback | SF Pro renders on Apple devices (likely majority of creative agency team). Geist is the closest cross-platform fallback. |
| 2026-03-19 | Dropped purple secondary (#8B3FE9) | Single-accent (Apple blue) reduces visual noise. Color is semantic only. |
| 2026-03-19 | Glass for cards, solid for tables | Performance: backdrop-filter blur on 50+ row tables causes jank. Solid bg for data-dense views. |
| 2026-03-19 | 8px base unit (up from 4px) | Apple uses generous spacing. Spacious density matches premium glassmorphism feel. |
| 2026-03-19 | Standard interaction state kit | Skeleton loaders, warm empty states with CTAs, error alerts with retry, toast success |
| 2026-03-19 | Surface hierarchy (5 layers) | Glass for floating elements, solid for data-dense views. Performance-driven. |
| 2026-03-19 | Glass sidebar in light, opaque in dark | Matches Apple Finder/Notes behavior. Avoids visual noise in dark mode. |
| 2026-03-19 | Graceful glass fallback | @supports query — solid semi-transparent when backdrop-filter unavailable |
| 2026-03-19 | Notification UI spec | Toast (top-right, glass, auto-dismiss 5s), bell badge (red pill), notification panel (glass dropdown 400px) |
