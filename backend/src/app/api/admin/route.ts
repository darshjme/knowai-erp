import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { adminPutSchema, adminPatchSchema } from "@/schemas/admin";

const ADMIN_ROLES = ["CTO", "CEO", "ADMIN"];

// ─── Helper: get or create config ────────────────────────────────────────────

async function getConfig(key: string, defaultValue: unknown) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (row) {
    try { return JSON.parse(row.value); } catch { return row.value; }
  }
  return defaultValue;
}

async function setConfig(key: string, value: unknown, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: JSON.stringify(value), updatedBy: userId },
    create: { key, value: JSON.stringify(value), updatedBy: userId },
  });
}

// ─── Default configs ─────────────────────────────────────────────────────────

const DEFAULT_SYSTEM = {
  appName: "KnowAI CRM",
  appUrl: "http://localhost:3000",
  defaultTimezone: "Asia/Kolkata",
  defaultLanguage: "en",
  maintenanceMode: false,
  signupEnabled: true,
  maxFileUploadMb: 50,
  sessionTimeoutMin: 60,
  auditLogRetentionDays: 90,
};

const DEFAULT_SMTP = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "KnowAI CRM",
  fromEmail: "",
  enabled: false,
};

const DEFAULT_INTEGRATIONS = {
  slack: { enabled: false, webhookUrl: "", channel: "", botToken: "" },
  github: { enabled: false, token: "", org: "", webhookSecret: "" },
  googleDrive: { enabled: false, clientId: "", clientSecret: "", redirectUri: "" },
  whatsapp: { enabled: false, apiKey: "", phoneNumberId: "" },
};

// ─── GET ─────────────────────────────────────────────────────────────────────

export const GET = createHandler(
  { roles: ADMIN_ROLES },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    // Section-specific fetch
    if (section === "smtp") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      // Mask password
      return jsonOk({ smtp: { ...smtp, pass: smtp.pass ? "••••••••" : "" } });
    }

    if (section === "smtp-test") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      return jsonOk({ configured: !!(smtp.host && smtp.user && smtp.pass), host: smtp.host, user: smtp.user });
    }

    if (section === "integrations") {
      const integrations = await getConfig("integrations", DEFAULT_INTEGRATIONS);
      // Mask secrets
      const masked = { ...integrations };
      if (masked.slack?.botToken) masked.slack.botToken = "••••••••";
      if (masked.github?.token) masked.github.token = "••••••••";
      if (masked.github?.webhookSecret) masked.github.webhookSecret = "••••••••";
      if (masked.googleDrive?.clientSecret) masked.googleDrive.clientSecret = "••••••••";
      if (masked.whatsapp?.apiKey) masked.whatsapp.apiKey = "••••••••";
      return jsonOk({ integrations: masked });
    }

    if (section === "users") {
      const users = await prisma.user.findMany({
        where: { workspaceId: user.workspaceId },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true, department: true, phone: true,
          createdAt: true, updatedAt: true,
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ users });
    }

    if (section === "workspaces") {
      const workspaces = await prisma.workspace.findMany({
        include: { _count: { select: { members: true, projects: true } } },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ workspaces });
    }

    if (section === "stats") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [userCount, activeProjects, taskCount, tasksThisWeek, invoiceCount, clientCount, leadCount] = await Promise.all([
        prisma.user.count({ where: { workspaceId: user.workspaceId } }),
        prisma.project.count({ where: { status: "ACTIVE", workspaceId: user.workspaceId } }),
        prisma.task.count({ where: { project: { workspaceId: user.workspaceId } } }),
        prisma.task.count({ where: { createdAt: { gte: weekAgo }, project: { workspaceId: user.workspaceId } } }),
        prisma.invoice.count({ where: { createdBy: { workspaceId: user.workspaceId } } }),
        prisma.client.count({ where: { workspaceId: user.workspaceId } }),
        prisma.lead.count({ where: { workspaceId: user.workspaceId } }),
      ]);
      const invoiceRevenue = await prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } });
      const expenseTotal = await prisma.expense.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } });
      return jsonOk({
        stats: {
          users: userCount,
          activeProjects,
          tasks: taskCount,
          tasksThisWeek,
          invoices: invoiceCount,
          clients: clientCount,
          leads: leadCount,
          revenue: invoiceRevenue._sum.total || 0,
          expenses: expenseTotal._sum.amount || 0,
          storageUsedMb: 0, // placeholder - implement with file storage backend
        },
      });
    }

    if (section === "audit-logs") {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = Math.min(parseInt(searchParams.get("pageSize") || "25", 10), 100);
      const pageSize = Math.max(1, limit);

      try {
        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          prisma.auditLog.count(),
        ]);
        return jsonOk({ logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
      } catch {
        // Fallback mock data if table doesn't exist
        const mockLogs = [
          { id: "1", action: "UPDATE", entity: "TASK", entityName: "Dashboard Analytics", description: "Status changed from TODO to IN_PROGRESS", userName: "Darshan Joshi", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
          { id: "2", action: "CREATE", entity: "PROJECT", entityName: "Mobile App Redesign", description: "New project created", userName: "Darshan Joshi", createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
          { id: "3", action: "LOGIN", entity: "USER", entityName: "Admin", description: "User logged in", userName: "Admin", createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
          { id: "4", action: "UPDATE", entity: "SETTINGS", entityName: "System Settings", description: "Maintenance mode toggled", userName: "Darshan Joshi", createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
          { id: "5", action: "DELETE", entity: "FILE", entityName: "old-backup.zip", description: "File deleted", userName: "Darshan Joshi", createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: "6", action: "CREATE", entity: "USER", entityName: "New Employee", description: "User account created", userName: "Admin", createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
          { id: "7", action: "EXPORT", entity: "PROJECT", entityName: "Q1 Report", description: "Data exported to CSV", userName: "Darshan Joshi", createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
          { id: "8", action: "UPDATE", entity: "WORKSPACE", entityName: "Know AI", description: "Workspace settings updated", userName: "Admin", createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
        ];
        return jsonOk({ logs: mockLogs, total: mockLogs.length, page: 1, pageSize: 25, totalPages: 1 });
      }
    }

    // Default: return all config sections
    const [system, smtp, integrations] = await Promise.all([
      getConfig("system", DEFAULT_SYSTEM),
      getConfig("smtp", DEFAULT_SMTP),
      getConfig("integrations", DEFAULT_INTEGRATIONS),
    ]);

    const users = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, department: true, phone: true,
        createdAt: true, updatedAt: true,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [userCount, activeProjects, taskCount, tasksThisWeek] = await Promise.all([
      prisma.user.count({ where: { workspaceId: user.workspaceId } }),
      prisma.project.count({ where: { status: "ACTIVE", workspaceId: user.workspaceId } }),
      prisma.task.count({ where: { project: { workspaceId: user.workspaceId } } }),
      prisma.task.count({ where: { createdAt: { gte: weekAgo }, project: { workspaceId: user.workspaceId } } }),
    ]);

    return jsonOk({
      systemSettings: system,
      smtp: { ...smtp, pass: smtp.pass ? "••••••••" : "" },
      integrations,
      users,
      stats: {
        users: userCount,
        activeProjects,
        tasks: taskCount,
        tasksThisWeek,
        storageUsedMb: 0,
      },
    });
  }
);

// ─── PUT ─────────────────────────────────────────────────────────────────────

export const PUT = createHandler(
  { roles: ADMIN_ROLES, schema: adminPutSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { section } = body;

    // ── System Settings ──────────────────────────────────
    if (section === "system") {
      const current = await getConfig("system", DEFAULT_SYSTEM);
      const updated = { ...current, ...(body.data as Record<string, unknown>) };
      await setConfig("system", updated, user.id);
      return jsonOk({ success: true, message: "System settings updated", data: updated });
    }

    // ── SMTP Configuration ──────────────────────────────
    if (section === "smtp") {
      const current = await getConfig("smtp", DEFAULT_SMTP);
      const data = body.data as Record<string, unknown> | undefined;
      if (!data) return jsonError("data is required for smtp section");
      // If pass is masked, keep existing
      if (data.pass === "••••••••") data.pass = current.pass;
      const updated = { ...current, ...data };
      await setConfig("smtp", updated, user.id);

      // Update runtime env vars so email.ts picks them up
      if (updated.host) process.env.SMTP_HOST = updated.host;
      if (updated.port) process.env.SMTP_PORT = String(updated.port);
      if (updated.user) process.env.SMTP_USER = updated.user;
      if (updated.pass) process.env.SMTP_PASS = updated.pass;

      return jsonOk({ success: true, message: "SMTP configuration saved", data: { ...updated, pass: updated.pass ? "••••••••" : "" } });
    }

    // ── SMTP Test ───────────────────────────────────────
    if (section === "smtp-test") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      if (!smtp.host || !smtp.user || !smtp.pass) {
        return jsonError("SMTP not configured. Save SMTP settings first.");
      }

      try {
        const nodemailer = await import("nodemailer");
        const testTransport = nodemailer.default.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: { user: smtp.user, pass: smtp.pass },
        });

        await testTransport.verify();
        return jsonOk({ success: true, message: "SMTP connection successful! Mail server is reachable." });
      } catch (error) {
        console.error("SMTP test failed:", error);
        return jsonOk({ success: false, message: "SMTP test failed: connection could not be established" });
      }
    }

    // ── Integrations ─────────────────────────────────────
    if (section === "integrations") {
      const current = await getConfig("integrations", DEFAULT_INTEGRATIONS);
      const integration = body.integration as string | undefined;
      const data = body.data as Record<string, unknown> | undefined;

      if (!integration || !data) return jsonError("integration and data required");

      const allowedIntegrations = ["slack", "github", "googleDrive", "whatsapp"];
      if (!allowedIntegrations.includes(integration)) return jsonError("Invalid integration name");

      // If tokens are masked, keep existing
      if (integration === "slack" && data.botToken === "••••••••") data.botToken = current.slack?.botToken;
      if (integration === "github" && data.token === "••••••••") data.token = current.github?.token;
      if (integration === "github" && data.webhookSecret === "••••••••") data.webhookSecret = current.github?.webhookSecret;
      if (integration === "googleDrive" && data.clientSecret === "••••••••") data.clientSecret = current.googleDrive?.clientSecret;
      if (integration === "whatsapp" && data.apiKey === "••••••••") data.apiKey = current.whatsapp?.apiKey;

      const updated = { ...current, [integration]: { ...current[integration], ...data } };
      await setConfig("integrations", updated, user.id);

      return jsonOk({ success: true, message: `${integration} configuration saved` });
    }

    // ── User Management ──────────────────────────────────
    if (section === "user-update") {
      const { userId, role, department, status } = body as { userId?: string; role?: string; department?: string; status?: string };
      if (!userId) return jsonError("userId required");

      // Verify target user belongs to same workspace
      const targetUser = await prisma.user.findFirst({ where: { id: userId, workspaceId: user.workspaceId } });
      if (!targetUser) return jsonError("User not found", 404);

      const validRoles = ["CEO", "CTO", "CFO", "BRAND_FACE", "ADMIN", "HR", "PRODUCT_OWNER", "BRAND_PARTNER", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "SR_DEVELOPER", "JR_DEVELOPER", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "SR_EDITOR", "JR_EDITOR", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "DRIVER", "GUY", "OFFICE_BOY"];
      if (role && !validRoles.includes(role)) return jsonError("Invalid role");

      const validStatuses = ["ONLINE", "AWAY", "OFFLINE"];
      if (status && !validStatuses.includes(status)) return jsonError("Invalid status");

      const updateData: Record<string, unknown> = {};
      if (role) {
        updateData.role = role;
        // Bump tokenVersion to invalidate existing JWTs with the old role
        updateData.tokenVersion = { increment: 1 };
      }
      if (department !== undefined) updateData.department = department || null;
      if (status !== undefined) updateData.status = status;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, status: true },
      });
      return jsonOk({ success: true, message: "User updated", user: updated });
    }

    if (section === "user-create") {
      const { email, firstName, lastName, role, department, password } = body as {
        email?: string; firstName?: string; lastName?: string; role?: string; department?: string; password?: string;
      };
      if (!email || !firstName || !lastName || !role || !password) {
        return jsonError("email, firstName, lastName, role, and password are required");
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return jsonError("Invalid email format");

      if (password.length < 6) return jsonError("Password must be at least 6 characters");

      const validRoles = ["CEO", "CTO", "CFO", "BRAND_FACE", "ADMIN", "HR", "PRODUCT_OWNER", "BRAND_PARTNER", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "SR_DEVELOPER", "JR_DEVELOPER", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "SR_EDITOR", "JR_EDITOR", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "DRIVER", "GUY", "OFFICE_BOY"];
      if (!validRoles.includes(role)) return jsonError("Invalid role");

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return jsonError("A user with this email already exists");

      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.default.hash(password, 10);

      let workspace = await prisma.workspace.findFirst();
      if (!workspace) {
        workspace = await prisma.workspace.create({ data: { name: "Know AI", type: "DEFAULT" } });
      }

      const created = await prisma.user.create({
        data: {
          email,
          password: hashed,
          firstName,
          lastName,
          role: role as any,
          department: department || null,
          workspaceId: workspace.id,
          status: "ONLINE",
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, status: true, createdAt: true },
      });
      return jsonOk({ success: true, message: "User created successfully", user: created });
    }

    if (section === "user-delete") {
      const { userId } = body as { userId?: string };
      if (!userId) return jsonError("userId required");
      if (userId === user.id) return jsonError("Cannot delete yourself");

      // Verify target user belongs to same workspace
      const deleteTarget = await prisma.user.findFirst({ where: { id: userId, workspaceId: user.workspaceId } });
      if (!deleteTarget) return jsonError("User not found", 404);

      await prisma.user.delete({ where: { id: userId } });
      return jsonOk({ success: true, message: "User deleted" });
    }

    // ── Bulk Actions ──────────────────────────────────────
    if (section === "bulk-deactivate") {
      const { userIds } = body as { userIds?: string[] };
      if (!Array.isArray(userIds) || userIds.length === 0) return jsonError("userIds array required");
      const filtered = userIds.filter((id: string) => id !== user.id);
      if (filtered.length === 0) return jsonError("Cannot deactivate yourself");
      await prisma.user.updateMany({
        where: { id: { in: filtered }, workspaceId: user.workspaceId },
        data: { status: "OFFLINE" },
      });
      return jsonOk({ success: true, message: `${filtered.length} users deactivated` });
    }

    if (section === "bulk-department") {
      const { userIds, department } = body as { userIds?: string[]; department?: string };
      if (!Array.isArray(userIds) || userIds.length === 0) return jsonError("userIds array required");
      if (department === undefined) return jsonError("department required");
      await prisma.user.updateMany({
        where: { id: { in: userIds }, workspaceId: user.workspaceId },
        data: { department: department || null },
      });
      return jsonOk({ success: true, message: `${userIds.length} users updated to ${department || "no department"}` });
    }

    if (section === "user-reset-password") {
      const { userId, newPassword } = body as { userId?: string; newPassword?: string };
      if (!userId || !newPassword) return jsonError("userId and newPassword required");
      if (newPassword.length < 6) return jsonError("Password must be at least 6 characters");

      // Verify target user belongs to same workspace
      const resetTarget = await prisma.user.findFirst({ where: { id: userId, workspaceId: user.workspaceId } });
      if (!resetTarget) return jsonError("User not found", 404);

      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.default.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      return jsonOk({ success: true, message: "Password reset successfully" });
    }

    return jsonError("Unknown section: " + section);
  }
);

// ─── PATCH (for quick toggles) ──────────────────────────────────────────────

export const PATCH = createHandler(
  { roles: ADMIN_ROLES, schema: adminPatchSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    if (body.action === "toggle-maintenance") {
      const system = await getConfig("system", DEFAULT_SYSTEM);
      system.maintenanceMode = !system.maintenanceMode;
      await setConfig("system", system, user.id);
      return jsonOk({ success: true, maintenanceMode: system.maintenanceMode });
    }

    if (body.action === "toggle-signup") {
      const system = await getConfig("system", DEFAULT_SYSTEM);
      system.signupEnabled = !system.signupEnabled;
      await setConfig("system", system, user.id);
      return jsonOk({ success: true, signupEnabled: system.signupEnabled });
    }

    return jsonError("Unknown action");
  }
);
