import { describe, it, expect } from "vitest";
import { checkRateLimit, WRITE_LIMIT } from "@/lib/rate-limiter";

describe("Rate Limiter", () => {
  it("should allow requests within the limit", () => {
    const userId = "test-rate-limit-allow";
    const result = checkRateLimit(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should block after exceeding the limit", () => {
    const userId = "test-rate-limit-block";
    // Exhaust all tokens (default: 100)
    for (let i = 0; i < 100; i++) {
      checkRateLimit(userId);
    }
    const result = checkRateLimit(userId);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should use stricter limits for write operations", () => {
    const userId = "test-rate-limit-write";
    // Exhaust write tokens (30)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(userId, WRITE_LIMIT);
    }
    const result = checkRateLimit(userId, WRITE_LIMIT);
    expect(result.allowed).toBe(false);
  });
});
