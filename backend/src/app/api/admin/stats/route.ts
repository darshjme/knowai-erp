import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

const ADMIN_ROLES = ["CTO", "CEO", "ADMIN"];

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);
    if (!ADMIN_ROLES.includes(user.role)) return jsonError("Admin access required", 403);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── User stats ──────────────────────────────────────────
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ONLINE" } }),
      prisma.user.groupBy({ by: ["role"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    ]);

    // ── Project & Task stats ────────────────────────────────
    const [totalProjects, activeProjects, totalTasks, completedTasks, tasksThisWeek, tasksByStatus] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.task.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    // ── Invoice & Revenue stats ─────────────────────────────
    let totalInvoices = 0;
    let revenue = 0;
    let pendingPayments = 0;
    try {
      const [invoiceCount, revenueAgg, pendingAgg] = await Promise.all([
        prisma.invoice.count(),
        prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
        prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PENDING" as any } }),
      ]);
      totalInvoices = invoiceCount;
      revenue = Number(revenueAgg._sum.total ?? 0);
      pendingPayments = Number(pendingAgg._sum.total ?? 0);
    } catch {
      // Invoice table may not have data
    }

    // ── File stats ──────────────────────────────────────────
    let totalFiles = 0;
    let storageUsedBytes = 0;
    try {
      const [fileCount, storageAgg] = await Promise.all([
        prisma.file.count(),
        prisma.file.aggregate({ _sum: { size: true } }),
      ]);
      totalFiles = fileCount;
      storageUsedBytes = Number(storageAgg._sum.size ?? 0);
    } catch {
      // File table may not exist or be empty
    }

    // ── Chat stats ──────────────────────────────────────────
    let totalChatRooms = 0;
    let totalMessages = 0;
    try {
      [totalChatRooms, totalMessages] = await Promise.all([
        prisma.chatRoom.count(),
        prisma.chatMessage.count(),
      ]);
    } catch {
      // Chat tables may not exist
    }

    // ── Additional counts ───────────────────────────────────
    let totalClients = 0;
    let totalLeads = 0;
    let totalExpenses = 0;
    let expenseTotal = 0;
    try {
      const [clientCount, leadCount, expenseCount, expenseAgg] = await Promise.all([
        prisma.client.count(),
        prisma.lead.count(),
        prisma.expense.count(),
        prisma.expense.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } }),
      ]);
      totalClients = clientCount;
      totalLeads = leadCount;
      totalExpenses = expenseCount;
      expenseTotal = Number(expenseAgg._sum.amount ?? 0);
    } catch {
      // Tables may not exist
    }

    // ── New users this month ────────────────────────────────
    let newUsersThisMonth = 0;
    try {
      newUsersThisMonth = await prisma.user.count({ where: { createdAt: { gte: monthAgo } } });
    } catch {
      // ignore
    }

    // ── DB table counts ─────────────────────────────────────
    const dbTables: Record<string, number> = {
      users: totalUsers,
      projects: totalProjects,
      tasks: totalTasks,
      invoices: totalInvoices,
      files: totalFiles,
      chatRooms: totalChatRooms,
      chatMessages: totalMessages,
      clients: totalClients,
      leads: totalLeads,
      expenses: totalExpenses,
    };

    // ── System info ─────────────────────────────────────────
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    return jsonOk({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
          byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          thisWeek: tasksThisWeek,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          byStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count.id })),
        },
        invoices: {
          total: totalInvoices,
          revenue,
          pendingPayments,
        },
        files: {
          total: totalFiles,
          storageUsedBytes,
          storageUsedMB: Math.round(storageUsedBytes / (1024 * 1024) * 100) / 100,
        },
        chat: {
          rooms: totalChatRooms,
          messages: totalMessages,
        },
        clients: totalClients,
        leads: totalLeads,
        expenses: {
          total: totalExpenses,
          approvedAmount: expenseTotal,
        },
        system: {
          uptime: `${uptimeHours}h ${uptimeMinutes}m`,
          uptimeSeconds: Math.floor(uptimeSeconds),
          nodeVersion: process.version,
          platform: process.platform,
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024) * 100) / 100,
        },
        dbTables,
      },
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return jsonError("Internal server error", 500);
  }
}
