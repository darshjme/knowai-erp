import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { auditRollbackSchema } from "@/schemas/admin";

// ─── Role-based audit access control ────────────────────────────
// CEO, CTO, ADMIN: full access to all audit logs
// HR: only people-related entities (USER, CREDENTIAL)
// ACCOUNTING: only financial entities (PAYROLL, EXPENSE, CONTACT)
// All other roles: no access (403)

const FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN"] as const;

const ROLE_ENTITY_ACCESS: Record<string, string[]> = {
  HR: ["USER", "CREDENTIAL"],
  SR_ACCOUNTANT: ["PAYROLL", "EXPENSE", "CONTACT"],
  JR_ACCOUNTANT: ["PAYROLL", "EXPENSE", "CONTACT"],
};

type AuditAccess =
  | { level: "full" }
  | { level: "scoped"; entities: string[] }
  | { level: "none" };

function getAuditAccess(role: string): AuditAccess {
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) {
    return { level: "full" };
  }
  const entities = ROLE_ENTITY_ACCESS[role];
  if (entities) {
    return { level: "scoped", entities };
  }
  return { level: "none" };
}

// Allowed roles: full access + scoped access roles
const AUDIT_ROLES = [...FULL_ACCESS_ROLES, "HR", "SR_ACCOUNTANT", "JR_ACCOUNTANT"];

export const GET = createHandler(
  { roles: AUDIT_ROLES },
  async (req, { user }) => {
    // Determine access level based on role
    const access = getAuditAccess(user.role);

    if (access.level === "none") {
      return jsonError("Insufficient permissions to view audit logs", 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const where: Record<string, unknown> = {
      workspaceId: user.workspaceId,
    };

    // For scoped roles, restrict to allowed entities only
    if (access.level === "scoped") {
      if (entity) {
        // If client requests a specific entity, verify it is within allowed set
        if (!access.entities.includes(entity)) {
          return jsonError("You do not have access to this entity type", 403);
        }
        where.entity = entity;
      } else {
        where.entity = { in: access.entities };
      }
    } else {
      // Full access -- optionally filter by entity if requested
      if (entity) where.entity = entity;
    }

    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.createdAt = dateFilter;
    }

    try {
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return jsonOk({
        success: true,
        data: logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      // If audit_logs table doesn't exist yet, return mock data
      if ((error as any).message?.includes("no such table")) {
        return getMockAuditLogs(req);
      }
      throw error;
    }
  }
);

// Rollback endpoint - revert a specific action
export const POST = createHandler(
  { roles: [...FULL_ACCESS_ROLES], schema: auditRollbackSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { logId } = body;

    const log = await prisma.auditLog.findFirst({
      where: { id: logId, workspaceId: user.workspaceId },
    });

    if (!log) return jsonError("Audit log not found", 404);

    // Parse metadata to get previous state
    const metadata = log.metadata ? JSON.parse(log.metadata) : {};

    let rollbackResult = null;

    // Handle rollback based on entity type
    switch (log.entity) {
      case "TASK":
        if (log.action === "UPDATE" && metadata.previousState && log.entityId) {
          rollbackResult = await prisma.task.update({
            where: { id: log.entityId },
            data: metadata.previousState,
          });
        } else if (log.action === "DELETE" && metadata.deletedData) {
          rollbackResult = await prisma.task.create({
            data: metadata.deletedData,
          });
        }
        break;

      case "PROJECT":
        if (log.action === "UPDATE" && metadata.previousState && log.entityId) {
          rollbackResult = await prisma.project.update({
            where: { id: log.entityId },
            data: metadata.previousState,
          });
        }
        break;

      case "CONTACT":
        if (log.action === "DELETE" && metadata.deletedData) {
          rollbackResult = await prisma.contact.create({
            data: metadata.deletedData,
          });
        }
        break;

      default:
        return jsonError(`Rollback not supported for ${log.entity}`, 400);
    }

    if (!rollbackResult) {
      return jsonError("Rollback failed - insufficient data", 400);
    }

    // Create a new audit log for the rollback action
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: log.entity,
        entityId: log.entityId,
        entityName: log.entityName,
        description: `Rolled back: ${log.description}`,
        metadata: JSON.stringify({ rollbackOf: logId }),
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        workspaceId: user.workspaceId,
      },
    });

    return jsonOk({
      success: true,
      message: "Action rolled back successfully",
      data: rollbackResult
    });
  }
);

// Mock data fallback for when database isn't migrated yet
function getMockAuditLogs(req: NextRequest) {
  const mockLogs = [
    {
      id: "1",
      action: "UPDATE",
      entity: "TASK",
      entityId: "task-123",
      entityName: "Dashboard Analytics Widget",
      description: "Status changed from TODO to IN_PROGRESS",
      metadata: JSON.stringify({ field: "status", from: "TODO", to: "IN_PROGRESS" }),
      userId: "user-1",
      userName: "Sarah Johnson",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "2",
      action: "CREATE",
      entity: "PROJECT",
      entityId: "proj-456",
      entityName: "Mobile App Redesign",
      description: "New project created",
      metadata: JSON.stringify({ status: "PLANNING", manager: "Michael Chen" }),
      userId: "user-2",
      userName: "Michael Chen",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "3",
      action: "DELETE",
      entity: "FILE",
      entityId: "file-789",
      entityName: "old-design.fig",
      description: "File deleted from workspace",
      metadata: JSON.stringify({ size: "12.5 MB", type: "figma" }),
      userId: "user-1",
      userName: "Sarah Johnson",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "4",
      action: "UPDATE",
      entity: "CONTACT",
      entityId: "contact-321",
      entityName: "John Doe",
      description: "Contact label changed from LEAD to CLIENT",
      metadata: JSON.stringify({ field: "label", from: "LEAD", to: "CLIENT" }),
      userId: "user-3",
      userName: "Emily Davis",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.102",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "5",
      action: "LOGIN",
      entity: "USER",
      entityId: "user-2",
      entityName: "Michael Chen",
      description: "User logged in",
      metadata: JSON.stringify({ device: "Desktop", browser: "Chrome" }),
      userId: "user-2",
      userName: "Michael Chen",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "6",
      action: "EXPORT",
      entity: "PROJECT",
      entityId: "proj-456",
      entityName: "Mobile App Redesign",
      description: "Project data exported to CSV",
      metadata: JSON.stringify({ format: "csv", records: 45 }),
      userId: "user-2",
      userName: "Michael Chen",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
    {
      id: "7",
      action: "CREATE",
      entity: "TASK",
      entityId: "task-555",
      entityName: "Security Audit",
      description: "New task created with URGENT priority",
      metadata: JSON.stringify({ priority: "URGENT", assignee: "Alex Rivera" }),
      userId: "user-1",
      userName: "Sarah Johnson",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "8",
      action: "UPDATE",
      entity: "WORKSPACE",
      entityId: "workspace-1",
      entityName: "Team Workspace",
      description: "Workspace settings updated",
      metadata: JSON.stringify({ field: "name", from: "Default Workspace", to: "Team Workspace" }),
      userId: "user-1",
      userName: "Sarah Johnson",
      workspaceId: "workspace-1",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  ];

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  return jsonOk({
    success: true,
    data: mockLogs.slice((page - 1) * pageSize, page * pageSize),
    total: mockLogs.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockLogs.length / pageSize),
  });
}
