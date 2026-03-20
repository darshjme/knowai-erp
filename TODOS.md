# TODOS

## P1 — High Priority

~~### E2E Test Suite (Playwright)~~ ✅ DONE
- Playwright E2E tests for auth, navigation, API health, rate limiting
- 3 test files: auth.spec.ts, navigation.spec.ts, api-health.spec.ts
- CI pipeline runs API E2E tests with seeded database

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

### Figma Design Tokens Sync
- **What:** Script to sync DESIGN.md tokens (colors, spacing, typography) to Figma variables via REST API
- **Why:** Eliminates manual translation between design and code. Single source of truth.
- **Effort:** M (human: 1 week / CC: ~45 min)
- **Depends on:** DESIGN.md (done), Figma Premium API access

### Cloud File Storage (S3/R2)
- **What:** Migrate file uploads (resumes, profile photos, gov IDs) from local filesystem to S3 or Cloudflare R2
- **Why:** Local filesystem storage is lost if server is replaced. Not suitable for horizontal scaling or container deployments.
- **Effort:** S (human: 2 days / CC: ~30 min)
- **Depends on:** Onboarding overhaul (file uploads now include photos + gov IDs)

### Staging Environment
- **What:** Docker Compose staging environment with separate DB, accessible to team
- **Why:** Prevents production incidents from untested deployments
- **Effort:** S (human: 2 days / CC: ~30 min)
- **Depends on:** CI/CD pipeline (Foundation First)
