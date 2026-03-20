import { NextResponse, type NextRequest } from "next/server";
import { type ZodSchema, ZodError } from "zod";
import { getAuthUser } from "./api-utils";
import { jsonOk, jsonError } from "./api-utils";
import { checkRateLimit, WRITE_LIMIT } from "./rate-limiter";
import { requestLogger } from "./logger";
import { logger } from "./logger";

/**
 * createHandler — composable route handler wrapper.
 *
 *   Request
 *     │
 *     ├── Body size check ──► 413 (if > maxBodySize)
 *     │
 *     ├── Rate limit ──► 429 + Retry-After
 *     │   (userId for auth'd, IP for public)
 *     │
 *     ├── Auth check ──► 401 (no token / user deleted)
 *     │              ──► 403 (wrong role)
 *     │
 *     ├── Body parse ──► 400 (malformed JSON)
 *     │
 *     ├── Zod validate ──► 400 + field errors
 *     │
 *     └── Handler ──► 2xx / 500 (caught + logged)
 *
 * Usage:
 *   export const POST = createHandler({
 *     roles: ["CEO", "CFO", "ADMIN"],
 *     schema: createExpenseSchema,
 *     rateLimit: "write",
 *   }, async (req, { user, body, log }) => {
 *     // body is typed from schema, user is guaranteed non-null
 *     return jsonOk({ created: true });
 *   });
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

interface HandlerContext<T = unknown> {
  user: AuthUser;
  body: T;
  log: ReturnType<typeof requestLogger>;
}

interface PublicHandlerContext<T = unknown> {
  user: null;
  body: T;
  log: ReturnType<typeof requestLogger>;
}

interface HandlerOptions<T = unknown> {
  /** Roles allowed to access this endpoint. Omit for any authenticated user. */
  roles?: string[];
  /** Zod schema for request body validation. Only used for POST/PUT/PATCH. */
  schema?: ZodSchema<T>;
  /** Rate limit tier: "read" (default, 100/min) or "write" (30/min). */
  rateLimit?: "read" | "write";
  /** Max request body size in bytes. Default: 1MB (1_048_576). */
  maxBodySize?: number;
  /** If true, skip auth — for public endpoints like login, signup, careers. */
  public?: boolean;
}

const DEFAULT_MAX_BODY_SIZE = 1_048_576; // 1MB

// ─── IP Extraction ───────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  // x-forwarded-for can be a comma-separated list; the first entry is the client
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// ─── Handler Factory ─────────────────────────────────────────────────────────

export function createHandler<T = unknown>(
  options: HandlerOptions<T>,
  handler: (
    req: NextRequest,
    ctx: HandlerContext<T>
  ) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;
  const rateLimitConfig = options.rateLimit === "write" ? WRITE_LIMIT : undefined;

  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // ── 1. Body size check (for methods with body) ──
      if (hasBody(req.method)) {
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
          return jsonError(
            `Request body too large. Maximum size is ${Math.round(maxBodySize / 1024)}KB.`,
            413
          );
        }
      }

      // ── 2. Rate limit check ──
      const rateLimitKey = options.public
        ? `ip:${getClientIp(req)}`
        : req.headers.get("x-user-id") || `ip:${getClientIp(req)}`;

      const rateCheck = checkRateLimit(rateLimitKey, rateLimitConfig);
      if (!rateCheck.allowed) {
        const retryAfter = Math.ceil((rateCheck.retryAfterMs || 1000) / 1000);
        const response = jsonError("Too many requests. Please slow down.", 429);
        response.headers.set("Retry-After", String(retryAfter));
        response.headers.set("X-RateLimit-Remaining", "0");
        return response;
      }

      // ── 3. Auth check ──
      let user: AuthUser | null = null;
      if (!options.public) {
        user = await getAuthUser(req);
        if (!user) {
          return jsonError("Unauthorized", 401);
        }

        // Role check
        if (options.roles && options.roles.length > 0) {
          if (!options.roles.includes(user.role)) {
            return jsonError("Access denied", 403);
          }
        }
      }

      // ── 4. Body parse + validate ──
      let body: T = undefined as T;
      if (hasBody(req.method) && options.schema) {
        let rawBody: unknown;
        try {
          rawBody = await req.json();
        } catch {
          return jsonError("Invalid JSON in request body", 400);
        }

        try {
          body = options.schema.parse(rawBody);
        } catch (err) {
          if (err instanceof ZodError) {
            return NextResponse.json(
              {
                error: "Validation failed",
                issues: err.issues.map((i) => ({
                  field: i.path.join("."),
                  message: i.message,
                })),
              },
              { status: 400 }
            );
          }
          throw err;
        }
      }

      // ── 5. Create logger ──
      const log = requestLogger(req, user);

      // ── 6. Execute handler ──
      const ctx = { user, body, log } as HandlerContext<T>;
      return await handler(req, ctx);
    } catch (err) {
      // ── Error boundary ──
      const url = new URL(req.url);
      logger.error(
        {
          err,
          method: req.method,
          path: url.pathname,
          userId: req.headers.get("x-user-id"),
        },
        "Unhandled route error"
      );

      // Sentry capture (if available)
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(err, {
          extra: {
            method: req.method,
            path: url.pathname,
            userId: req.headers.get("x-user-id"),
          },
        });
      } catch {
        // Sentry not available — already logged above
      }

      return jsonError("Internal server error", 500);
    }
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasBody(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

// Re-export for convenience
export { jsonOk, jsonError };
