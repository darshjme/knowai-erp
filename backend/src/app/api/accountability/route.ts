import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// GET: Accountability report - who is blocking whom
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "team"; // "me" | "team" | "all"

  // Get all task dependencies where the blocking task is NOT completed
  const blockingChains = await prisma.taskDependency.findMany({
    where: {
      blockingTask: {
        status: { not: "COMPLETED" },
        project: { workspaceId: user.workspaceId },
      },
    },
    include: {
      blockingTask: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          project: { select: { id: true, name: true } },
        },
      },
      blockedTask: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Build accountability alerts
  const alerts: {
    id: string;
    type: "blocking" | "blocked";
    severity: "critical" | "warning" | "info";
    blocker: { id: string; name: string; avatar?: string | null; role: string };
    blockerTask: { id: string; title: string; status: string; dueDate?: string | null; project?: string };
    blocked: { id: string; name: string; avatar?: string | null; role: string };
    blockedTask: { id: string; title: string; status: string; dueDate?: string | null; project?: string };
    message: string;
    daysOverdue: number;
  }[] = [];

  const now = new Date();

  for (const dep of blockingChains) {
    const bt = dep.blockingTask;
    const bd = dep.blockedTask;
    if (!bt.assignee || !bd.assignee) continue;

    // Filter by scope
    if (scope === "me" && bt.assignee.id !== user.id && bd.assignee.id !== user.id) continue;

    const daysOverdue = bt.dueDate ? Math.max(0, Math.floor((now.getTime() - new Date(bt.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isOverdue = bt.dueDate && new Date(bt.dueDate) < now;
    const severity = isOverdue && daysOverdue > 3 ? "critical" : isOverdue ? "warning" : "info";

    const blockerName = `${bt.assignee.firstName} ${bt.assignee.lastName}`;
    const blockedName = `${bd.assignee.firstName} ${bd.assignee.lastName}`;

    alerts.push({
      id: dep.id,
      type: bt.assignee.id === user.id ? "blocking" : "blocked",
      severity,
      blocker: { id: bt.assignee.id, name: blockerName, avatar: bt.assignee.avatar, role: bt.assignee.role },
      blockerTask: {
        id: bt.id, title: bt.title, status: bt.status,
        dueDate: bt.dueDate?.toISOString() || null,
        project: bt.project?.name,
      },
      blocked: { id: bd.assignee.id, name: blockedName, avatar: bd.assignee.avatar, role: bd.assignee.role },
      blockedTask: {
        id: bd.id, title: bd.title, status: bd.status,
        dueDate: bd.dueDate?.toISOString() || null,
        project: bd.project?.name,
      },
      message: bt.assignee.id === user.id
        ? `You are blocking ${blockedName} — your task "${bt.title}" must be completed before they can work on "${bd.title}"${isOverdue ? ` (${daysOverdue} days overdue!)` : ''}`
        : `${blockerName} has not completed "${bt.title}" which is blocking your task "${bd.title}"${isOverdue ? ` (${daysOverdue} days overdue!)` : ''}`,
      daysOverdue,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Summary stats
  const myBlocking = alerts.filter(a => a.type === "blocking").length;
  const myBlocked = alerts.filter(a => a.type === "blocked").length;

  return jsonOk({
    alerts,
    summary: {
      totalBlockingChains: blockingChains.length,
      youAreBlocking: myBlocking,
      youAreBlockedBy: myBlocked,
      criticalCount: alerts.filter(a => a.severity === "critical").length,
    },
  });
});

// POST: Send accountability notification to a user
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { targetUserId, blockingTaskId, blockedTaskId, message } = body;

  if (!targetUserId || !message) {
    return jsonError("targetUserId and message are required", 400);
  }

  // Create notification
  await prisma.notification.create({
    data: {
      type: "TASK_OVERDUE",
      title: "Accountability Alert",
      message,
      userId: targetUserId,
      linkUrl: `/tasks`,
      metadata: JSON.stringify({ blockingTaskId, blockedTaskId, sentBy: user.id }),
    },
  });

  return jsonOk({ success: true, message: "Accountability notification sent" });
});
