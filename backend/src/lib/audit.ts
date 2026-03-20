import prisma from "./prisma";
import { logger } from "./logger";

interface AuditEntry {
  userId: string;
  userName?: string;
  action: string;      // CREATE, UPDATE, DELETE, LOGIN, APPROVE, REJECT
  entity: string;      // USER, TASK, EXPENSE, PAYROLL, LEAVE, etc.
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  workspaceId: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userName: entry.userName || "System",
        action: entry.action as any,
        entity: entry.entity as any,
        entityId: entry.entityId,
        entityName: entry.entityName,
        description: entry.description,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        workspaceId: entry.workspaceId,
      },
    });
  } catch (err) {
    // Never let audit logging break the main operation
    logger.error({ err, entry }, "Failed to write audit log");
  }
}
