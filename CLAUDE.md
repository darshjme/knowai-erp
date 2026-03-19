# KnowAI ERP — Project Configuration

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Tech Stack
- **Backend:** Next.js 15 (TypeScript) with API routes
- **Frontend:** React 19 + Vite (JSX, migrating to TSX)
- **Database:** PostgreSQL 16 via Prisma ORM
- **UI:** Bootstrap 5 + React Bootstrap + Lucide icons + SCSS
- **State:** Redux + redux-thunk
- **Auth:** JWT (jose) + bcryptjs
