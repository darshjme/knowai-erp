/**
 * In-memory token bucket rate limiter.
 * Tracks requests per user ID with configurable limits per route group.
 *
 *   ┌─────────────┐     ┌──────────────┐     ┌────────────┐
 *   │   Request    │────►│ Rate Limiter  │────►│  Allowed?  │
 *   │ (userId)     │     │ (token bucket)│     │  Y → next  │
 *   └─────────────┘     └──────────────┘     │  N → 429   │
 *                                             └────────────┘
 *
 * For single-server deployment. Replace with Redis for horizontal scaling.
 */

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;    // Max requests in the window
  refillRate: number;   // Tokens added per second
  windowMs: number;     // Window duration in ms (for cleanup)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 100,       // 100 requests
  refillRate: 2,        // 2 tokens/sec = ~120/min
  windowMs: 60_000,     // 1 minute window
};

// Stricter config for write operations
export const WRITE_LIMIT: RateLimitConfig = {
  maxTokens: 30,        // 30 writes
  refillRate: 0.5,      // 0.5 tokens/sec = ~30/min
  windowMs: 60_000,
};

const buckets = new Map<string, BucketEntry>();

function getBucket(key: string, config: RateLimitConfig): BucketEntry {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry) {
    entry = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, entry);
    return entry;
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  const refill = Math.floor(elapsed * config.refillRate);
  if (refill > 0) {
    entry.tokens = Math.min(config.maxTokens, entry.tokens + refill);
    entry.lastRefill = now;
  }

  return entry;
}

export function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const key = `rl:${userId}`;
  const bucket = getBucket(key, config);

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, remaining: bucket.tokens };
  }

  // No tokens left — calculate retry time
  const retryAfterMs = Math.ceil(1000 / config.refillRate);
  return { allowed: false, remaining: 0, retryAfterMs };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.lastRefill > 300_000) { // 5 min stale
      buckets.delete(key);
    }
  }
}, 300_000);
