# TODOS

## P1 — High Priority

~~### E2E Test Suite (Playwright)~~ ✅ DONE
- Playwright E2E tests for auth, navigation, API health, rate limiting
- 3 test files: auth.spec.ts, navigation.spec.ts, api-health.spec.ts
- CI pipeline runs API E2E tests with seeded database

## P2 — Post Foundation First

### API Documentation (OpenAPI)
- **What:** Generate OpenAPI spec from Zod schemas using zod-to-openapi
- **Why:** Self-documenting API reduces onboarding time for new developers
- **Effort:** S (human: 2 days / CC: ~20 min)
- **Depends on:** Zod validation layer (Foundation First)

### Sentry Alert Rules
- **What:** Configure Sentry alert rules for error rate spikes, new error types, and p95 latency threshold breaches
- **Why:** Without alert rules, errors go to Sentry dashboard but nobody gets notified. Errors are invisible until someone manually checks.
- **Effort:** S (human: 1 day / CC: ~15 min)
- **Depends on:** Sentry integration (Foundation First PR1)

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
