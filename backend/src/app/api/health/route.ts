import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/health
 * Returns service health: DB connectivity, uptime, and version.
 * Used by load balancers, monitoring, and CI smoke tests.
 */
export async function GET() {
  const start = Date.now();
  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "ok";
  } catch {
    // DB is down — still return 200 so the health endpoint itself is reachable,
    // but flag the DB as unhealthy in the response body.
  }

  const status = dbStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      responseMs: Date.now() - start,
    },
    { status }
  );
}
