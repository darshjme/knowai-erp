import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createHandler } from "@/lib/create-handler";

// Mock getAuthUser to avoid DB dependency in unit tests
vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual("@/lib/api-utils");
  return {
    ...actual,
    getAuthUser: vi.fn(),
  };
});

// Mock Sentry to avoid import errors in tests
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { getAuthUser } from "@/lib/api-utils";
const mockGetAuthUser = vi.mocked(getAuthUser);

function makeRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  const url = "http://localhost:3000/api/test";
  const init: RequestInit = { method, headers: { ...headers } };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    init.body = bodyStr;
    (init.headers as Record<string, string>)["content-type"] = "application/json";
    (init.headers as Record<string, string>)["content-length"] = String(
      Buffer.byteLength(bodyStr)
    );
  }
  return new NextRequest(url, init);
}

const mockUser = {
  id: "user-1",
  email: "ceo@knowai.club",
  role: "CEO",
  workspaceId: "ws-1",
  name: "Test CEO",
  tokenVersion: 0,
  workspace: { id: "ws-1", name: "Test" },
};

describe("createHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ──

  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const handler = createHandler({}, async (_req, { user }) => {
      return new (await import("next/server")).NextResponse(
        JSON.stringify({ ok: true }),
        { status: 200 }
      );
    });

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user role is not in allowed roles", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler(
      { roles: ["HR", "ADMIN"] },
      async (_req, { user }) => {
        return new (await import("next/server")).NextResponse(
          JSON.stringify({ ok: true }),
          { status: 200 }
        );
      }
    );

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("passes when user has correct role", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler(
      { roles: ["CEO", "CTO"] },
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ ok: true });
      }
    );

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(200);
  });

  it("passes for any authenticated user when no roles specified", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler({}, async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(200);
  });

  // ── Public routes ──

  it("skips auth for public routes", async () => {
    const handler = createHandler({ public: true }, async (_req, { user }) => {
      const { NextResponse } = await import("next/server");
      expect(user).toBeNull();
      return NextResponse.json({ ok: true });
    });

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(200);
    expect(mockGetAuthUser).not.toHaveBeenCalled();
  });

  // ── Zod validation ──

  it("validates body with Zod schema on POST", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const schema = z.object({
      title: z.string().min(1),
      amount: z.number().positive(),
    });

    const handler = createHandler({ schema }, async (_req, { body }) => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ created: true, title: body.title });
    });

    const res = await handler(
      makeRequest("POST", { title: "Test", amount: 100 })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Test");
  });

  it("returns 400 with field errors when Zod validation fails", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const schema = z.object({
      title: z.string().min(1),
      amount: z.number().positive(),
    });

    const handler = createHandler({ schema }, async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    const res = await handler(
      makeRequest("POST", { title: "", amount: -5 })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
    expect(data.issues).toHaveLength(2);
    expect(data.issues[0].field).toBe("title");
    expect(data.issues[1].field).toBe("amount");
  });

  it("returns 400 for malformed JSON body", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const schema = z.object({ title: z.string() });

    const handler = createHandler({ schema }, async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: "not-json{{{",
      headers: {
        "content-type": "application/json",
        "content-length": "11",
      },
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("skips body validation for GET requests even with schema", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const schema = z.object({ title: z.string() });

    const handler = createHandler({ schema }, async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(200);
  });

  // ── Body size ──

  it("returns 413 for oversized body", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler(
      { maxBodySize: 100 },
      async () => {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ ok: true });
      }
    );

    const largeBody = JSON.stringify({ data: "x".repeat(200) });
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: largeBody,
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(largeBody)),
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  // ── Error boundary ──

  it("catches unhandled handler errors and returns 500", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler({}, async () => {
      throw new Error("Something broke");
    });

    const res = await handler(makeRequest("GET"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });

  // ── Rate limiting ──

  it("returns 429 when rate limit is exceeded", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    const handler = createHandler({}, async () => {
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    // Exhaust rate limit (default: 100 tokens)
    const results = [];
    for (let i = 0; i < 105; i++) {
      const req = makeRequest("GET", undefined, {
        "x-user-id": "rate-test-user",
      });
      results.push(await handler(req));
    }

    const lastFive = results.slice(-5);
    const rateLimited = lastFive.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    const limitedRes = rateLimited[0];
    expect(limitedRes.headers.get("Retry-After")).toBeTruthy();
    expect(limitedRes.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  // ── Handler context ──

  it("passes user and log to handler context", async () => {
    mockGetAuthUser.mockResolvedValue(mockUser as any);
    let receivedUser: any = null;
    let receivedLog: any = null;

    const handler = createHandler({}, async (_req, { user, log }) => {
      receivedUser = user;
      receivedLog = log;
      const { NextResponse } = await import("next/server");
      return NextResponse.json({ ok: true });
    });

    await handler(makeRequest("GET"));
    expect(receivedUser).toBe(mockUser);
    expect(receivedLog).toBeTruthy();
    expect(typeof receivedLog.info).toBe("function");
  });
});
