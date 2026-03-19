import { getAuthUser } from "./api-utils";
import { jsonError } from "./api-utils";
import { checkRateLimit, WRITE_LIMIT } from "./rate-limiter";
import { requestLogger } from "./logger";
import type { NextResponse } from "next/server";

/**
 * withAuth — unified auth + role + rate limiting wrapper for API routes.
 *
 *   Request ──► getAuthUser ──► tokenVersion check ──► role check
 *       │            │                │                     │
 *       │       null → 401       stale → 401          denied → 403
 *       │                                                   │
 *       └──► rate limit check ──► exceeded → 429            │
 *                   │                                       │
 *                   └──► return { user, log } ◄─────────────┘
 *
 * Usage in route handlers:
 *   const auth = await withAuth(req, { roles: ['CEO', 'CTO', 'ADMIN'] });
 *   if (auth instanceof NextResponse) return auth; // error response
 *   const { user, log } = auth;
 */

interface WithAuthOptions {
  /** Roles allowed to access this endpoint. Omit for any authenticated user. */
  roles?: string[];
  /** Use stricter rate limit for write operations. Default: false (read limit). */
  writeLimit?: boolean;
}

type AuthSuccess = {
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  log: ReturnType<typeof requestLogger>;
};

export async function withAuth(
  req: Request,
  options: WithAuthOptions = {}
): Promise<AuthSuccess | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  // Role check
  if (options.roles && options.roles.length > 0) {
    if (!options.roles.includes(user.role)) {
      return jsonError("Access denied", 403);
    }
  }

  // Rate limit check
  const config = options.writeLimit ? WRITE_LIMIT : undefined;
  const rateCheck = checkRateLimit(user.id, config);
  if (!rateCheck.allowed) {
    const response = jsonError("Too many requests. Please slow down.", 429);
    response.headers.set("Retry-After", String(Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)));
    return response;
  }

  const log = requestLogger(req, user);

  return { user, log };
}

/** Type guard to check if withAuth returned an error response */
export function isAuthError(result: AuthSuccess | NextResponse): result is NextResponse {
  return result instanceof Response;
}
