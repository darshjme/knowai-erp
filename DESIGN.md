# Design System — KnowAI ERP

Supersedes: Previous flat light design (2026-03-20)
Source: CRM Redesign Handoff V2 + CEO Plan Review (2026-03-21)

## Product Context
- **What this is:** Internal CRM/ERP for a creative content agency — managing HR, hiring, payroll, projects, content review, and team communication
- **Who it's for:** Internal team (~10-50 people), creative and technical roles, multiple device sizes
- **Space/industry:** Creative agency operations, internal tooling
- **Project type:** Web app / dashboard / internal tool

## Aesthetic Direction
- **Direction:** Dark, calm, professional — Linear-inspired data-driven UI with purple accent
- **Default theme:** Dark (light mode available via toggle)
- **Decoration level:** Minimal. Surfaces are dark solid colors with subtle borders. Visual hierarchy comes from typography, spacing, and restrained accent color.
- **Mood:** Focused, efficient, modern. Think Linear, Raycast, Arc Browser — tools built for power users. The interface should feel like a product, not an internal tool.
- **Reference:** Linear, Raycast, Vercel Dashboard, Figma (dark mode)

## Brand
- **Logo:** KnowAI SVG — white text with lime green (#D5FC0F) accent mark
- **Logo placement:** Sidebar top, 32x32px icon with 16px text
- **Logo color (#D5FC0F)** is brand-only — NOT part of the UI color palette

## Tech Stack (Styling)
- **CSS Framework:** Tailwind CSS with custom theme config
- **Component Library:** Headless UI (`@headlessui/react`) — unstyled, accessible
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Charts:** ApexCharts + react-apexcharts
- **Dark mode strategy:** Tailwind `darkMode: 'class'` — toggle sets `dark` class on `<html>`

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
| Element | Size | Weight | Font | Color Token | Usage |
|---------|------|--------|------|-------------|-------|
| Hero greeting | 24px / 1.5rem | 700 | Manrope | text-primary | Dashboard greeting |
| Page title | 18px / 1.125rem | 600 | Manrope | text-primary | Top bar page name |
| Section heading | 14px / 0.875rem | 600 | Inter | text-secondary | Card header titles |
| Stat number (large) | 22px / 1.375rem | 700 | Inter | text-primary | Key metric values |
| Stat number (medium) | 16px / 1rem | 600 | Inter | text-primary | Secondary metrics |
| Body text | 13px / 0.8125rem | 400 | Inter | text-secondary | Descriptions, labels |
| Caption / meta | 11px / 0.6875rem | 400 | Inter | text-muted | Dates, tags, hints |
| Nav items | 13px / 0.8125rem | 500 | Inter | text-secondary | Sidebar links |
| Button text | 13px / 0.8125rem | 600 | Inter | varies | CTA buttons |
| Section labels | 10px | 500 | Inter | text-muted | Uppercase labels (e.g., "OVERVIEW", "Quick actions") |

### Typography Rules
- Letter-spacing: -0.2px to -0.8px for Manrope headlines (tighter at larger sizes)
- Section labels: 10px, uppercase, letter-spacing 0.08em, text-muted
- Inter body text: default letter-spacing (0)
- Line-height: 1.1 for display, 1.3 for headings, 1.5 for body
- Financial numbers always use `font-variant-numeric: tabular-nums`
- Rupee (₹) values in stat cards: use 13px (smaller than default 18px) to prevent overflow

### Text Overflow Rules (MANDATORY)
- **ALL text** must handle overflow. No exceptions.
- Single-line text: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` + `title` attribute for full text on hover
- Multi-line text: `-webkit-line-clamp` with fallback, or `overflow: hidden; max-height` with gradient fade
- Stat card values: use `clamp(13px, 1.2vw, 18px)` for responsive sizing
- Table cells: `max-width` constraint + ellipsis
- Navigation items: truncate with ellipsis at sidebar width
- **Zero tolerance for text overflow at any viewport width (375px → 3840px)**

## Color

### Dark Theme Palette (Default)
| Token | Tailwind Key | Hex | Usage |
|-------|-------------|-----|-------|
| Background Primary | `bg-primary` | `#0F1117` | Main app background |
| Background Card | `bg-card` | `#1A1D2E` | All card surfaces |
| Background Elevated | `bg-elevated` | `#242736` | Hover states, dropdowns, inputs |
| Border Default | `border-default` | `#2D3148` | Card borders, dividers |
| Border Subtle | `border-subtle` | `#1E2135` | Inner separators |
| Text Primary | `text-primary` | `#F9FAFB` | Headings, key numbers |
| Text Secondary | `text-secondary` | `#9CA3AF` | Labels, descriptions |
| Text Muted | `text-muted` | `#8B95A5` | Hints, placeholders (lightened from #6B7280 for WCAG AA compliance — 5.0:1 on bg-primary, 4.5:1 on bg-card) |

### Light Theme Palette
| Token | Tailwind Key | Hex | Usage |
|-------|-------------|-----|-------|
| Background Primary | `bg-primary` | `#F9FAFB` | Main app background |
| Background Card | `bg-card` | `#FFFFFF` | All card surfaces |
| Background Elevated | `bg-elevated` | `#F3F4F6` | Hover states, dropdowns, inputs |
| Border Default | `border-default` | `#E5E7EB` | Card borders, dividers |
| Border Subtle | `border-subtle` | `#F3F4F6` | Inner separators |
| Text Primary | `text-primary` | `#111827` | Headings, key numbers |
| Text Secondary | `text-secondary` | `#6B7280` | Labels, descriptions |
| Text Muted | `text-muted` | `#9CA3AF` | Hints, placeholders |

### Accent Colors (Both Themes)
| Token | Tailwind Key | Hex | Usage |
|-------|-------------|-----|-------|
| Accent Purple | `accent-purple` | `#7C3AED` | Active nav, primary CTA, focus rings |
| Accent Blue | `accent-blue` | `#3B82F6` | Info states, links |
| Accent Green | `accent-green` | `#10B981` | Success, revenue up, active |
| Accent Amber | `accent-amber` | `#F59E0B` | Warnings, pending |
| Accent Red | `accent-red` | `#EF4444` | Danger, overdue |

### Color Approach
- Color is semantic — status, alerts, data visualization. Never decorative.
- Accent purple is the brand color in-UI — used for active states, primary CTAs, and focus rings
- Tinted backgrounds: accent color at 15-20% opacity (e.g., `bg-accent-purple/15`)
- Catch-all: if unsure which color, use `text-secondary` for text and `bg-elevated` for surfaces

### Surface Styling
All surfaces are solid — no transparency, no blur, no backdrop-filter.
```
/* Tailwind config extension — surfaces */
theme: {
  extend: {
    colors: {
      'bg-primary': 'var(--bg-primary)',
      'bg-card': 'var(--bg-card)',
      'bg-elevated': 'var(--bg-elevated)',
      'border-default': 'var(--border-default)',
      'border-subtle': 'var(--border-subtle)',
      'text-primary': 'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted': 'var(--text-muted)',
    }
  }
}
```

## Spacing

### Scale
| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| space-1 | 4px | `p-1` / `gap-1` | Icon gaps, tight internal spacing |
| space-2 | 8px | `p-2` / `gap-2` | Between inline elements, small padding |
| space-3 | 12px | `p-3` / `gap-3` | Card internal padding (small), right panel block gaps |
| space-4 | 16px | `p-4` / `gap-4` | Standard card padding, right panel padding |
| space-5 | 20px | `p-5` / `gap-5` | Section gaps within a page zone |
| space-6 | 24px | `p-6` / `gap-6` | Between major content blocks |
| space-8 | 32px | `p-8` / `gap-8` | Between page sections |

## Layout

### Three-Column Layout (Global)
This layout is shared across ALL pages. Only the main content area changes per route.

| Column | Width | Behavior |
|--------|-------|----------|
| Left Sidebar | 240px fixed | Full viewport height, no scroll, collapsible to 64px |
| Main Content | flex-1 | Takes remaining space, overflow-y: auto, independent scroll |
| Right Panel | 280px fixed | Full viewport height, independent scroll, collapsible |

```
Total: 240px + flex-1 + 280px = viewport width

┌──────────────────────────────────────────────────────┐
│                    Header (56px)                      │
│     [Logo] [Page Title] [⌘K Search] [🔔] [🌙] [👤]  │
├──────────┬─────────────────────────┬─────────────────┤
│          │                         │  Right Panel     │
│ Sidebar  │    Main Content         │  (280px)         │
│ (240px)  │    (flex-1)             │  Context-aware   │
│          │    Page-specific        │  Collapsible     │
│          │                         │                  │
└──────────┴─────────────────────────┴─────────────────┘
```

### Sidebar Specification
| Property | Value |
|----------|-------|
| Width | 240px fixed (64px collapsed) |
| Background | `bg-card` |
| Border right | 1px solid `border-default` |
| Logo area | 64px height, padding 0 16px, flex align-items center |
| Logo icon | 32x32px, border-radius 8px, KnowAI SVG |
| Logo text | 16px, font-weight 600, text-primary |
| Nav section label | 10px uppercase, letter-spacing 0.08em, text-muted, padding 16px 16px 4px |
| Nav item | height 36px, padding 0 12px, border-radius 8px, flex, align-items center, gap 10px |
| Nav item dot | 6px circle, border-default color |
| Nav item (active) | bg accent-purple/15, text accent-purple, dot accent-purple |
| Nav item (hover) | bg-elevated, text-primary |
| Nav sections | OVERVIEW (Dashboard, Analytics), WORK (Tasks, Projects, Calendar, Goals, Docs), PEOPLE (Team, HR, Payroll, Leaves, Hiring) |

### Top Bar Specification
| Property | Value |
|----------|-------|
| Height | 56px fixed |
| Background | `bg-card` with border-bottom 1px `border-default` |
| Layout | flex, align-items center, justify-content space-between, padding 0 20px |
| Left: Page title | 18px, font-weight 600, text-primary |
| Center: Search trigger | "⌘K" pill button, bg-elevated, border border-default, border-radius 8px, opens command palette |
| Right: Icons | Notification bell (20px), Theme toggle (20px), Avatar circle (32px, bg accent-purple, initials) |
| Icon gap | 12px between icons |

### Right Panel Specification
| Property | Value |
|----------|-------|
| Width | 280px fixed (360px on 4K/TV) |
| Background | `bg-card` |
| Border left | 1px solid `border-default` |
| Padding | 16px |
| Overflow | overflow-y: auto, custom scrollbar |
| Display | flex flex-col gap-12px |
| Position | sticky top-0, height calc(100vh - 56px) |
| Collapse | Double-click border or toggle icon to collapse. State persists in localStorage. |

#### Right Panel Blocks (Dashboard Default)

**Block 1 — Quick Actions**
| Property | Value |
|----------|-------|
| Title | 'Quick actions', 11px uppercase, text-muted, margin-bottom 8px |
| Layout | CSS Grid, grid-template-columns: 1fr 1fr, gap: 8px |
| Button | bg-elevated, border 1px border-default, border-radius 8px, padding 10px 8px, text-align center |
| Button icon | 18x18px rounded 4px, margin 0 auto 6px, color-coded per action |
| Button text | 10px, text-secondary |
| Buttons | New Task (blue), New Project (green), Add Member (amber), Log Expense (red) |
| Hover | bg-primary, border-color accent-purple/50 |

**Block 2 — Alerts (moved from main content)**
| Property | Value |
|----------|-------|
| Title | 'Alerts', 11px uppercase, text-muted |
| Alert card | bg-elevated, border-radius 8px, padding 10px 12px, flex, gap 10px |
| Alert icon | 28x28px circle, flex-shrink 0 |
| Verify Identity | amber icon, title 12px 500, subtitle 10px muted, CTA 10px accent-blue underline |
| Personality Test | blue icon, same structure |
| Dismiss | X icon top-right, 14px, text-muted, hover text-primary |

**Block 3 — Upcoming Tasks**
| Property | Value |
|----------|-------|
| Header | 'Upcoming tasks' left + 'See all' right (10px accent-blue), border-bottom 1px border-subtle |
| Task row | padding 8px 0, flex, align-items center, gap 8px |
| Priority dot | 8px circle — red=High, amber=Med, blue=Low |
| Task text | 12px text-primary, flex 1, text-overflow ellipsis |
| Priority tag | 9px, padding 2px 6px, border-radius 4px, colored bg matching dot |
| Max shown | 3 tasks, rest behind 'See all' link |

**Block 4 — Mini Calendar**
| Property | Value |
|----------|-------|
| Header | Month + Year left, nav arrows right |
| Day labels | Mon-Sun, 9px text-muted, text-align center |
| Day cells | 28px square, border-radius 6px, 11px text-secondary |
| Today | bg accent-purple, text white, font-weight 600 |
| Has event | 4px dot below number, accent-blue |
| Display | Current week only (compact) |

#### Context-Aware Right Panel (Per Page)
| Page | Right Panel Content |
|------|-------------------|
| Dashboard | Quick Actions, Alerts, Upcoming Tasks, Mini Calendar |
| Analytics | KPI sparkline cards (4, matching main KPIs), period toggle pills (M/Q/Y), Export CSV button (ghost style) |
| Tasks | When task selected: title (14px 600), description (13px, 3-line clamp), assignee avatar + name, due date, priority badge, status dropdown, time log entries. When none selected: "Select a task to see details" centered message. |
| Team | Hovered/selected member: avatar (64px), name (16px 600), role, department, status badge, email link, "Message" CTA button. When none: "Hover a team member for preview" |
| Projects | Selected project: title, progress bar (full width), milestone list (checkbox + name + date), budget bar (spent/total), team avatars row. When none: "Select a project for details" |
| HR Dashboard | Hiring funnel: Applied→Screening→Interview→Offer (mini horizontal bar chart), today's leave list (name + type), pending approval count badge with "Review" CTA |
| Calendar | Selected day's events list (time + title + color dot), "Add Event" CTA button at bottom |
| Settings | No right panel (collapsed by default) |
| All other pages | Default: Quick Actions + Upcoming Tasks |

### Responsive Breakpoints
| Name | Width | Sidebar | Main | Right Panel |
|------|-------|---------|------|-------------|
| iPhone SE | 375px | Hidden (hamburger) | Full width | Hidden (bottom sheet on toggle) |
| Mobile | <640px | Hidden (drawer overlay) | Full width | Hidden (bottom sheet on toggle) |
| Tablet | 640-1024px | Collapsed (64px icons) | flex-1 | Hidden (toggle in header) |
| Desktop | 1024-1280px | Full (240px) | flex-1 | Icon strip (48px, expand on click). Icons top-to-bottom: Grid (Quick Actions), Bell (Alerts), CheckCircle (Tasks), Calendar (Mini Cal). Click expands to 280px overlay. |
| Large | 1280-1920px | Full (240px) | flex-1 | Full (280px) |
| Ultra-wide | 1920-2560px | Full (240px) | flex-1 (wider gaps) | Full (280px) |
| 4K/TV | 2560px+ | Full (240px) | flex-1, max-width 1800px centered | Full (360px) |

### Border Radius
| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| radius-sm | 6px | `rounded-sm` | Badges, tags, pills, small chips |
| radius-md | 8px | `rounded-md` | Buttons, inputs, small cards, nav items |
| radius-lg | 12px | `rounded-lg` | Standard cards, panels |
| radius-xl | 16px | `rounded-xl` | Hero card, large containers |
| radius-full | 9999px | `rounded-full` | Avatar circles, toggle switches |

## Motion (Framer Motion)

### Philosophy
Motion is intentional and purposeful. Every animation confirms an interaction or draws attention to a change. Never decorative.

### Timing
| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| Micro | 150ms | `ease` | Hover color/background changes |
| Short | 200ms | `ease-out` | Card hover lift, tooltips, badge transitions |
| Medium | 250ms | `ease-out` | Sidebar toggle, panel collapse/expand |
| Long | 300ms | `ease-out` | Modals (scale + fade), page transitions, command palette |

### Motion Rules
- **Card hover:** `translateY(-2px)` + `box-shadow: 0 4px 12px rgba(124,58,237,0.15)` + `border-color: accent-purple/40`. Duration 200ms.
- **Panel collapse:** Framer Motion `AnimatePresence` with width animation 250ms
- **Page transitions:** Subtle fade-in (opacity 0→1, 200ms) on route change
- **Command palette:** Scale 0.95→1 + fade, overlay fade-in
- **Modals:** Scale 0.95→1 + fade-in, dismiss with fade-out
- **Kanban drag:** Framer Motion `Reorder` with spring physics (stiffness: 300, damping: 30)
- **Progress bars:** Animate width from 0% to actual on first render
- **Sparklines:** Draw path animation left-to-right on mount
- **Reduced motion:** Respect `prefers-reduced-motion: reduce` via `useReducedMotion()` hook — disable all transforms, keep opacity transitions only

### What NOT to animate
- Data table rows
- Form inputs
- Sidebar navigation clicks (instant highlight)
- Text content changes
- Badge count updates

## Component Patterns

### Stat Cards
| Property | Value |
|----------|-------|
| Background | bg-card |
| Border | 1px border-default |
| Border radius | 10px |
| Padding | 12px 10px |
| Text align | center |
| Icon wrapper | 20x20px, border-radius 5px, bg iconColor/20, margin 0 auto 8px |
| Value | clamp(13px, 1.2vw, 18px) bold text-primary |
| Label | 10px text-muted, margin-top 4px, line-height 1.3 |
| Trend | 9px, accent-green for positive, accent-red for negative, margin-top 3px |
| Sparkline | 7-point inline SVG below value, height 20px, stroke accent color |
| Hover | translateY(-2px), box-shadow 0 4px 12px rgba(124,58,237,0.15), transition 200ms |
| Grid | `grid-template-columns: repeat(7, minmax(0, 1fr))`, gap 8px |
| Responsive grid | Tablet: repeat(4, 1fr), Mobile: repeat(2, 1fr) |

### Page Header
| Property | Value |
|----------|-------|
| Container | flex, align-items center, justify-content space-between, margin-bottom 16px |
| Title | 18px 600 text-primary |
| Count badge | bg-elevated, border-radius 10px, padding 2px 10px, 13px text-secondary |
| Primary CTA | bg accent-purple, text white, border-radius 8px, padding 8px 16px, 13px 600 |
| Secondary CTA | bg transparent, border 1px border-default, text-secondary |

### Status Badges
Pill shape with tinted background:
- padding 2px 8px, border-radius 100px, font-size 10-12px, font-weight 500
- Color: semantic background at 15% opacity, text at full semantic color
- Active/On Track: accent-green
- Pending/At Risk: accent-amber
- Overdue/Delayed: accent-red
- In Review/Info: accent-blue

### Buttons
- **Primary:** bg accent-purple, text white, 8px radius. Hover: accent-purple/90.
- **Secondary:** bg transparent, border 1px border-default, text-secondary. Hover: bg-elevated.
- **Danger:** bg accent-red, text white. Hover: accent-red/90.
- **Ghost:** No background, no border. Hover: bg-elevated.

### Data Tables
bg-card container with border. Header row: bg-elevated, uppercase 11px labels, text-muted. Rows separated by border-subtle dividers. Hover: bg-elevated/50. No fancy effects.

### Alerts
bg-elevated, 8px border-radius, padding 10px 12px, flex with icon + content. Icon: 28px circle with semantic color. Dismiss: X icon top-right.

### Avatars
Colored backgrounds (unique per user from accent palette), white initials, border-radius: full. Sizes: 20px (inline), 32px (header), 48px (profile cards).

### Command Palette
- Trigger: ⌘K (Mac) / Ctrl+K (Windows/Linux)
- UI: Headless UI Dialog, centered, max-width 560px
- Overlay: bg-primary/80 backdrop
- Search input: 16px, no border, bg-card, autofocus
- Results: grouped by type in priority order: Recent (if query empty), Pages, Tasks, Projects, People. Max 8 visible.
- Result item: Lucide icon (16px, text-muted) + type label (10px uppercase, text-muted) + name (13px text-primary), hover bg-elevated, active/selected bg-accent-purple/10
- No results: "No results for '{query}'" centered, text-muted, with suggestion "Try searching for a page, task, or person"
- Keyboard nav: ↑↓ to navigate, Enter to select, Esc to close
- Animation: Framer Motion scale 0.95→1 + opacity fade
- Footer: "↑↓ Navigate · ↩ Open · esc Close" in 10px text-muted, padding 8px 16px, border-top border-subtle

## Surface Hierarchy
| Layer | Element | Dark Treatment | Light Treatment |
|-------|---------|---------------|----------------|
| 0 | Page background | `#0F1117` | `#F9FAFB` |
| 1 | Sidebar, Header | `#1A1D2E` + border | `#FFFFFF` + border |
| 2 | Cards, stat panels, right panel blocks | `#1A1D2E` + border | `#FFFFFF` + border |
| 3 | Elevated: dropdowns, inputs, hover | `#242736` | `#F3F4F6` |
| 4 | Modals, command palette | `#1A1D2E` + shadow | `#FFFFFF` + shadow |

## Per-Feature Interaction States

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Dashboard stats | 7 skeleton cards (rounded rect, shimmer) | "0" for each stat + label | Retry banner above stats | N/A | Show loaded cards, skeleton for failed |
| Dashboard charts | Chart-shaped skeleton | "No data yet" + date range info | "Chart unavailable" + retry | N/A | Show loaded chart, skeleton other |
| Right panel | 4 skeleton blocks | Default content per page | "Panel unavailable" fallback | N/A | Show loaded blocks, skeleton failed |
| Command palette | Spinner after 300ms debounce | "No results for '{query}'" + suggestion | "Search unavailable" inline | Navigate + close | N/A |
| Kanban board | 4 column skeletons with card placeholders | "No tasks yet. Create your first task." + CTA | Retry banner | Card moves with animation | Show loaded columns, retry failed |
| Team grid | 6 person-card skeletons | "No team members yet. Add your first." + CTA | Retry banner | N/A | Show loaded cards |
| Projects list | 4 list-item skeletons | "No projects yet. Create your first." + CTA | Retry banner | N/A | Show loaded items |
| Sparklines | Gray flat line placeholder | Hidden (show delta % only) | Hidden (show delta % only) | Animate draw | N/A |
| Mini calendar | Week skeleton | Current week, no event dots | "—" in day cells | N/A | N/A |
| Notification panel | 3 item skeletons | "All caught up!" with checkmark icon | "Couldn't load notifications" + retry | Mark-read animation (fade tint) | Show loaded, skeleton new |

## Micro-Interaction States

### Input Fields
- **Default:** bg-elevated, border border-default, text-primary, placeholder text-muted
- **Focus:** border accent-purple, ring 2px accent-purple/20, no bg change
- **Error:** border accent-red, ring 2px accent-red/20, error message below in 11px accent-red
- **Disabled:** opacity 0.5, cursor not-allowed, bg-elevated

### Buttons
- **Default:** as specified per variant (primary/secondary/danger/ghost)
- **Hover:** as specified
- **Active/Pressed:** scale(0.98) for 100ms, then release
- **Focus:** ring 2px accent-purple/40, 2px offset
- **Disabled:** opacity 0.5, cursor not-allowed, no hover effect
- **Loading:** spinner icon replaces text, width preserved, no layout shift

### Nav Items (Sidebar)
- **Default:** text-secondary, dot border-default
- **Hover:** bg-elevated, text-primary (instant, no transition)
- **Active:** bg accent-purple/15, text accent-purple, dot accent-purple
- **Focus (keyboard):** ring 2px accent-purple/40 inside the item

## Interaction State Kit

### Loading State
- **Skeleton loaders** — bg-elevated rectangles with shimmer animation
- Skeleton shapes mimic the content layout
- Animation: horizontal shimmer gradient, 1.5s duration, ease-in-out, infinite
- Never use a raw spinner for page-level loading. Spinners only for inline actions.

### Empty State
Every empty state has 3 elements:
1. **Icon** — Lucide icon at 48px, text-muted, 0.5 opacity
2. **Message** — Warm, human language. NOT "No items found."
3. **Primary action** — Button matching the page's main action

Empty state container: centered, max-width 400px, padding 48px.

### Error State
- Alert component — accent-red tint background
- Message: "Something went wrong loading [resource]. Please try again."
- Always include a "Retry" button
- Never show raw error messages or stack traces

### Success State
- Toast notification — slides in from top-right, bg-card + border + shadow
- Auto-dismiss after 4 seconds
- Includes dismiss button (X)
- Format: "[Action] successful."

### Partial State
- Show loaded content normally
- Failed sections show inline error with retry
- Never block the entire page for one failed section

## Notification UI (SSE)

### Notification Bell (Header)
- Lucide Bell icon, 20px
- Unread count: accent-red badge, min-width 18px, pill shape
- Click opens notification panel

### Notification Toast
- Top-right corner, bg-card + border + shadow, 360px max-width, border-radius 10px
- Icon + title + message + timestamp
- Auto-dismiss after 5 seconds, stack up to 3 visible

### Notification Panel
- Dropdown from bell, 400px wide, max-height 500px, scrollable
- bg-card + border + shadow
- Each item: icon + title + message + relative time
- Unread items: accent-purple tint background
- "Mark all as read" + "View all" links

## Role-Based Dashboard Views

| Role | Stat Cards | Charts |
|------|-----------|--------|
| CEO | All 7 (Team, Projects, Tasks, Revenue, Leaves, Expenses, Verifications) | Revenue Trend + Task Distribution |
| HR | Pending Leaves, Pending Verifications, Active Hiring, Team Size, On Leave Today | Leave Calendar + Hiring Pipeline |
| Developer | Open Tasks, My Projects, Sprint Velocity, PR Queue, Upcoming Deadlines | Task Completion + Sprint Burndown |
| Default | Same as CEO | Same as CEO |

## Page-Specific Layouts

### Dashboard (/dashboard)
- Hero card: full width, bg-card, border-radius 16px, padding 20px 24px
  - Left: greeting (24px bold, time-aware: "Good morning/afternoon/evening, {firstName}!"), date/time (13px, format: "Friday, 21 March 2026 · 10:45 PM"), role badge (amber pill, e.g., "CTO"), motivational line (12px italic text-muted — rotate from a curated list of 20 productivity quotes, NOT generic AI quotes. Examples: "Ship it.", "Focus is saying no.", "Done is better than perfect.")
  - Right: 3 metric pills showing TODAY's snapshot — not generic counters. Each pill: bg-elevated, border border-default, border-radius 10px, padding 10px 16px. Number (20px bold) + label (10px muted). Pills: "Tasks Today: {N}" / "Overdue: {N}" / "Upcoming: {N}". Overdue pill uses accent-red text if > 0.
  - Background decoration: subtle radial gradient in top-right corner using accent-purple at 5% opacity. NOT a generic gradient — just a hint of brand color.
- Stats grid: 7 cards, `repeat(7, minmax(0, 1fr))`, gap 8px
- Charts row: flex, gap 12px — Revenue (flex: 3, 60%) + Distribution (flex: 2, 40%)

### Analytics (/analytics)
- KPI row: 4 stat cards, `repeat(4, 1fr)`, with trend arrows
- Main chart: full width, period toggle (Monthly / Quarterly / Yearly)
- Bottom row: 2 charts side by side

### Tasks (/tasks) — Kanban
- Page header: title + count badge + filter + New Task CTA
- Board: flex, gap 12px, overflow-x auto
- 4 columns: To Do | In Progress | Review | Done (min-width 240px each)
- Task card: bg-card, border-radius 10px, padding 12px, title + tags + avatar + due date
- Done column: opacity 0.6, title strikethrough
- Drag: Framer Motion Reorder

### Team (/team) — Card Grid
- Grid: `repeat(3, 1fr)`, gap 12px
- Person card: bg-card, border-radius 12px, padding 20px, text-center
- Avatar (48px circle), Name (14px 500), Role (11px muted), Status badge

### Projects (/projects) — List View
- List item: bg-card, border-radius 12px, padding 16px, flex row
- Project icon (36x36px), title, meta, status badge, progress bar (4px height)

### Mobile Navigation (< 640px)
- **Hamburger icon:** 24px Menu icon (Lucide), top-left of header, replacing the logo
- **Sidebar drawer:** Full-width overlay from left, bg-card, z-index 1000. Framer Motion slide-in 250ms. Backdrop bg-primary/60, click to close. Contains full sidebar content + close X button top-right.
- **Right panel bottom sheet:** Swipe-up from bottom or tap toggle icon in header (PanelRight icon, 20px). Max-height 60vh, bg-card, border-top-left-radius 16px + border-top-right-radius 16px. Drag handle: 32px wide, 4px tall, bg-border-default, centered, margin 8px auto. Shows context-aware content. Swipe down or tap backdrop to dismiss.
- **Stat cards:** 2 columns on mobile (`repeat(2, 1fr)`). Sparklines hidden on mobile (show delta % only).
- **Charts:** Stack vertically (flex-col), full width each. Revenue above Distribution.
- **Kanban:** Single column view with horizontal swipe between columns. Column tabs at top (To Do | In Progress | Review | Done). Active column indicator: accent-purple underline.
- **Team grid:** 2 columns on mobile (`repeat(2, 1fr)`), reduced card padding (12px).
- **Command palette:** Full-screen modal on mobile (no max-width constraint), search input at top.

## Accessibility
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA (4.5:1 for body, 3:1 for large text) in BOTH themes
- **Keyboard navigation:** All interactive elements focusable via Tab
- **Focus ring:** 2px solid accent-purple, 2px offset
- **Screen readers:** ARIA landmarks — sidebar (nav), main content (main), header (banner)
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all Framer Motion animations via `useReducedMotion()` hook
- **data-testid:** All interactive elements have `data-testid` attributes for E2E testing

## User Journey — Emotional Arc

### First-Time User (Day 1)
| Step | User Does | User Feels | Design Supports |
|------|-----------|-----------|-----------------|
| 1 | Logs in | Uncertain — "where do I start?" | Greeting with name + role badge grounds them. Right panel Quick Actions give clear next steps. |
| 2 | Sees dashboard | Oriented — "I can see everything" | 7 stat cards give instant overview. Sparklines show trends without clicking. |
| 3 | Explores sidebar | Confident — "I know what's here" | Section labels (OVERVIEW, WORK, PEOPLE) group navigation logically. Active state is unambiguous. |
| 4 | Tries ⌘K | Delighted — "oh nice, this works" | Command palette finds anything instantly. Power-user tool that rewards curiosity. |
| 5 | Checks right panel | Productive — "things I need to do" | Upcoming tasks + alerts surface action items without hunting. |

### Power User (Day 100)
| Step | User Does | User Feels | Design Supports |
|------|-----------|-----------|-----------------|
| 1 | ⌘K → task name → Enter | Efficient — "2 seconds" | Command palette is the primary navigation method. Keyboard-first. |
| 2 | Collapses right panel | Focused — "more space for this" | Panel collapse persists. User controls their workspace. |
| 3 | Switches theme | Comfortable — "my preference" | Dark/light toggle respects user choice. No judgment. |
| 4 | Drags Kanban card | Satisfying — "that felt good" | Framer Motion spring physics on drag. Haptic-feeling animation. |

### Design Anti-Patterns to Avoid
- Never show a blank page with just a spinner — always skeleton loaders
- Never use "No data" — always warm, human language with a CTA
- Never block the whole page for one failed API call — partial state
- Never make the user confirm what they can see — if a task moved, show it moved
- Never auto-collapse UI elements the user explicitly expanded

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-19 | Initial glassmorphism design | User request for Apple aesthetic |
| 2026-03-20 | Glassmorphism → Clean Flat Design | Performance issues, data-driven ERP needs clarity not effects |
| 2026-03-21 | **Flat Light → Dark Design System V2** | Structural layout problems (dead whitespace, orphan stat card, no page differentiation) required a redesign. Dark theme with purple accent chosen. 3-column layout with context-aware right panel. Tailwind CSS migration from Bootstrap. Headless UI replacing React Bootstrap. Framer Motion for animations. Full responsive 375px-3840px+. |
