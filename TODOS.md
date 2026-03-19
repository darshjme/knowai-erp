# TODOS

## P2 — Post Foundation First

### API Documentation (OpenAPI)
- **What:** Generate OpenAPI spec from Zod schemas using zod-to-openapi
- **Why:** Self-documenting API reduces onboarding time for new developers
- **Effort:** S (human: 2 days / CC: ~20 min)
- **Depends on:** Zod validation layer (Foundation First)

### E2E Test Suite (Playwright)
- **What:** Playwright E2E tests for critical user journeys (auth, payroll, hiring, expenses)
- **Why:** Catches integration bugs that unit tests miss. Prevents regressions in UI flows
- **Effort:** M (human: 1 week / CC: ~1 hour)
- **Depends on:** Foundation First (test framework, rich seed data)

### Figma Design Tokens Sync
- **What:** Script to sync DESIGN.md tokens (colors, spacing, typography) to Figma variables via REST API
- **Why:** Eliminates manual translation between design and code. Single source of truth.
- **Effort:** M (human: 1 week / CC: ~45 min)
- **Depends on:** DESIGN.md (done), Figma Premium API access

### Staging Environment
- **What:** Docker Compose staging environment with separate DB, accessible to team
- **Why:** Prevents production incidents from untested deployments
- **Effort:** S (human: 2 days / CC: ~30 min)
- **Depends on:** CI/CD pipeline (Foundation First)
