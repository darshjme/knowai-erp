import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/api-utils";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/events — Server-Sent Events endpoint for real-time notifications.
 *
 * Uses PostgreSQL LISTEN/NOTIFY for cross-server event delivery.
 *
 *   Client (EventSource) ──► SSE endpoint ──► PostgreSQL LISTEN
 *                                                  │
 *   Route handler (task/expense/etc.) ──► NOTIFY ──┘
 *                                                  │
 *   SSE endpoint receives event ──► push to client ◄┘
 *
 * Channel: "notifications:{userId}" — each user gets their own channel.
 *
 * NOTE: This SSE endpoint is NOT wrapped with createHandler because it returns
 * a streaming Response (not NextResponse/JSON), and manages its own auth.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const channel = `notifications_${user.id.replace(/-/g, "")}`;
  const encoder = new TextEncoder();
  let pgClient: ReturnType<typeof prisma.$queryRawUnsafe> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: user.id })}\n\n`));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      try {
        // Use raw pg connection for LISTEN (Prisma doesn't natively support it)
        // For now, poll notifications table as a reliable fallback
        // TODO: Upgrade to raw pg LISTEN/NOTIFY when connection pooling is configured
        const pollInterval = setInterval(async () => {
          if (closed) {
            clearInterval(pollInterval);
            return;
          }
          try {
            const unread = await prisma.notification.findMany({
              where: {
                userId: user.id,
                read: false,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                id: true,
                type: true,
                title: true,
                message: true,
                linkUrl: true,
                createdAt: true,
              },
            });

            if (unread.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `event: notifications\ndata: ${JSON.stringify(unread)}\n\n`
                )
              );
            }
          } catch (err) {
            logger.error({ err, userId: user.id }, "SSE poll error");
          }
        }, 5_000); // Poll every 5 seconds

        // Cleanup on disconnect
        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(heartbeat);
          clearInterval(pollInterval);
          controller.close();
        });
      } catch (err) {
        logger.error({ err, userId: user.id }, "SSE stream error");
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
