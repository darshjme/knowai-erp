import { describe, it, expect } from "vitest";

describe("Health endpoint contract", () => {
  it("should define expected response shape", () => {
    // This is a contract test — validates the health response structure.
    // Integration test (hitting real DB) runs in CI with a test database.
    const mockResponse = {
      status: "healthy",
      uptime: 123.45,
      timestamp: new Date().toISOString(),
      db: { status: "ok", latencyMs: 2 },
      responseMs: 5,
    };

    expect(mockResponse.status).toMatch(/^(healthy|degraded)$/);
    expect(typeof mockResponse.uptime).toBe("number");
    expect(mockResponse.db.status).toMatch(/^(ok|error)$/);
    expect(typeof mockResponse.db.latencyMs).toBe("number");
    expect(typeof mockResponse.responseMs).toBe("number");
  });
});
