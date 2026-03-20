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
