import prisma from "./prisma";
import { NotificationType } from "@prisma/client";

// ─── Core helper ────────────────────────────────────────────────
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      linkUrl: linkUrl ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

// ─── Task helpers ───────────────────────────────────────────────
export async function notifyTaskAssigned(
  taskId: string,
  assigneeId: string,
  assignerName: string,
  taskTitle: string
) {
  return createNotification(
    assigneeId,
    "TASK_ASSIGNED",
    "New task assigned to you",
    `${assignerName} assigned you "${taskTitle}"`,
    `/tasks?highlight=${taskId}`,
    { taskId, assignerName }
  );
}

export async function notifyTaskCompleted(
  taskId: string,
  task: { title: string; createdById?: string | null; assigneeId?: string | null }
) {
  const notifications: Promise<unknown>[] = [];

  // Notify task creator
  if (task.createdById) {
    notifications.push(
      createNotification(
        task.createdById,
        "TASK_COMPLETED",
        "Task completed",
        `"${task.title}" has been marked as completed`,
        `/tasks?highlight=${taskId}`,
        { taskId }
      )
    );
  }

  // Notify anyone whose tasks were blocked by this completed task
  const blockedDeps = await prisma.taskDependency.findMany({
    where: { blockingTaskId: taskId },
    include: { blockedTask: { include: { assignee: true } } },
  });

  for (const dep of blockedDeps) {
    if (dep.blockedTask.assigneeId) {
      notifications.push(
        createNotification(
          dep.blockedTask.assigneeId,
          "TASK_COMPLETED",
          "Blocker resolved",
          `"${task.title}" is done — your task "${dep.blockedTask.title}" is now unblocked`,
          `/tasks?highlight=${dep.blockedTask.id}`,
          { taskId, unblockedTaskId: dep.blockedTask.id }
        )
      );
    }
  }

  return Promise.all(notifications);
}

// ─── Task status change (notify superiors) ─────────────────────
export async function notifyTaskStatusChange(
  taskId: string,
  taskTitle: string,
  changedByUserId: string,
  changedByName: string,
  oldStatus: string,
  newStatus: string
) {
  // Find the user who changed the status
  const changedByUser = await prisma.user.findUnique({
    where: { id: changedByUserId },
    select: { role: true, workspaceId: true, department: true },
  });
  if (!changedByUser) return;

  // Determine which superiors to notify based on the changer's role
  let superiorFilter: Record<string, unknown>;
  const baseFilter = { workspaceId: changedByUser.workspaceId };

  switch (changedByUser.role) {
    case "DRIVER":
    case "GUY": {
      // Notify PRODUCT_OWNERs in same department + all ADMIN
      const productOwners = changedByUser.department
        ? prisma.user.findMany({
            where: { ...baseFilter, role: "PRODUCT_OWNER", department: changedByUser.department },
            select: { id: true },
          })
        : Promise.resolve([]);
      const admins = prisma.user.findMany({
        where: { ...baseFilter, role: "ADMIN" },
        select: { id: true },
      });
      const [pos, ads] = await Promise.all([productOwners, admins]);
      const superiorIds = [...new Set([...pos.map((u) => u.id), ...ads.map((u) => u.id)])];
      superiorFilter = { id: { in: superiorIds } };
      break;
    }
    case "PRODUCT_OWNER": {
      superiorFilter = { ...baseFilter, role: "ADMIN" };
      break;
    }
    case "HR":
    case "ADMIN":
      // HR / ADMIN — no upward notification needed
      return;
  }

  const superiors = await prisma.user.findMany({
    where: superiorFilter,
    select: { id: true },
  });

  if (superiors.length === 0) return;

  // Determine notification content based on the new status
  let title: string;
  let message: string;
  let type: NotificationType;

  if (newStatus === "IN_REVIEW") {
    title = "Task submitted for review";
    message = `${changedByName} moved "${taskTitle}" to In Review — requires your approval`;
    type = "TASK_ASSIGNED";
  } else if (newStatus === "IN_PROGRESS") {
    title = "Task started";
    message = `${changedByName} started working on "${taskTitle}"`;
    type = "SYSTEM";
  } else if (newStatus === "COMPLETED") {
    title = "Task completed";
    message = `${changedByName} completed "${taskTitle}"`;
    type = "TASK_COMPLETED";
  } else {
    title = "Task status changed";
    message = `${changedByName} moved "${taskTitle}" from ${oldStatus} to ${newStatus}`;
    type = "SYSTEM";
  }

  const linkUrl = `/tasks?highlight=${taskId}`;

  const notifications = superiors.map((s) =>
    createNotification(s.id, type, title, message, linkUrl, { taskId, changedByUserId, oldStatus, newStatus })
  );

  return Promise.all(notifications);
}

// ─── Leave helpers ──────────────────────────────────────────────
export async function notifyLeaveDecision(
  leaveId: string,
  userId: string,
  approved: boolean
) {
  return createNotification(
    userId,
    approved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    approved ? "Leave request approved" : "Leave request rejected",
    approved
      ? "Your leave request has been approved."
      : "Your leave request has been rejected.",
    `/hr/leave?highlight=${leaveId}`,
    { leaveId }
  );
}

// ─── Complaint helpers ──────────────────────────────────────────
export async function notifyComplaint(
  complaintId: string,
  targetUserId: string,
  fromName: string
) {
  return createNotification(
    targetUserId,
    "COMPLAINT_FILED",
    "New complaint filed",
    `${fromName} has filed a complaint that requires your attention.`,
    `/complaints?highlight=${complaintId}`,
    { complaintId, fromName }
  );
}

// ─── Broadcast helper ───────────────────────────────────────────
export async function notifyAll(
  workspaceId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  const users = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  if (users.length === 0) return [];

  return prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type,
      title,
      message,
    })),
  });
}
