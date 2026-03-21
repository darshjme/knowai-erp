# TODOS

## P1 — High Priority

~~### E2E Test Suite (Playwright)~~ ✅ DONE
- Playwright E2E tests for auth, navigation, API health, rate limiting
- 3 test files: auth.spec.ts, navigation.spec.ts, api-health.spec.ts
- CI pipeline runs API E2E tests with seeded database

### Rewrite DESIGN.md for Dark Design System
- **What:** Replace DESIGN.md entirely with CRM Redesign V2 specs — dark theme tokens, Tailwind config, Framer Motion philosophy, responsive breakpoints, new component patterns
- **Why:** DESIGN.md is the source of truth (per CLAUDE.md). Current version describes the old light flat design. Must be updated BEFORE implementation.
- **Context:** Handoff doc (KnowAI_CRM_Redesign_Handoff.docx) + CEO plan at `~/.gstack/projects/darshjme-knowai-erp/ceo-plans/2026-03-21-crm-redesign-v2.md` define the new system. Include: dark/light tokens, Tailwind config structure, Framer Motion rules, responsive breakpoints (375px-3840px+), component patterns, text overflow rules.
- **Effort:** S (CC: ~15 min) | **Priority:** P1 | **Blocks:** All CRM Redesign V2 implementation

### Search API Endpoint for Command Palette
- **What:** Create GET /api/search endpoint with role-based filtering
- **Why:** Command palette needs server-side search to prevent cross-role data leakage
- **Context:** Searches team members, tasks, projects, pages. Filters by user's role via existing RBAC. Returns typed results (icon + type label + name). Debounce 200ms client-side. Max 8 results grouped by type.
- **Effort:** M (CC: ~15 min) | **Priority:** P1 | **Blocks:** Command palette feature

### Dashboard Historical Data API (Sparklines)
- **What:** Extend GET /api/dashboard to return 7-day historical values per stat card
- **Why:** Sparklines need daily data points. Currently only returns current values.
- **Context:** 7 stat cards × 7 daily values. Options: compute on-the-fly from existing data or add a daily snapshot cron job. On-the-fly is simpler for small dataset (~50 employees).
- **Effort:** M (CC: ~20 min) | **Priority:** P2 | **Blocks:** Sparkline feature (not critical path)

## P2 — Post Foundation First

~~### API Documentation (OpenAPI)~~ ✅ DONE
- OpenAPI 3.1 spec auto-generated from Zod schemas via zod-openapi
- Served at GET /api/docs/openapi
- Covers auth, expenses, payroll, invoices, tasks, hiring, onboarding

### Sentry Alert Rules
- **What:** Configure Sentry alert rules in the Sentry dashboard
- **Why:** Without alert rules, errors are invisible until someone manually checks
- **How:** Go to Sentry → Alerts → Create Rule:
  1. **Error rate spike:** Alert when error count > 10 in 5 minutes
  2. **New issue:** Alert on first occurrence of any new error type
  3. **P95 latency:** Alert when p95 transaction duration > 3 seconds
- **Status:** Requires manual Sentry dashboard configuration — cannot be automated via code

~~### Figma Design Tokens Sync~~ ✅ DONE
- Script at scripts/sync-figma-tokens.ts syncs design-tokens.json to Figma Variables API
- Run: `npm run sync:figma` (or `--dry-run` to preview)
- Requires FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY env vars

~~### Cloud File Storage (S3/R2)~~ ✅ DONE
- S3-compatible storage abstraction at backend/src/lib/storage.ts
- Works with Hetzner Object Storage (or any S3-compatible service)
- Falls back to local filesystem when S3 env vars are not set
- Onboarding uploads (resume, photo, gov ID) use the new abstraction
- Requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY env vars

~~### Staging Environment~~ ✅ DONE
- docker-compose.staging.yml with Postgres 16, backend (Next.js), frontend (nginx)
- Separate staging DB on port 5433, backend on 3001, frontend on 5174
- Run: `docker compose -f docker-compose.staging.yml up --build`
