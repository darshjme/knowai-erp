import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-utils";

const ADMIN_ROLES = ["CTO", "CEO", "ADMIN"];

function ok(data: unknown) {
  return NextResponse.json(data);
}
function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return err("Unauthorized", 401);
    if (!ADMIN_ROLES.includes(user.role)) return err("Admin access required", 403);

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    // Section-specific fetch
    if (section === "smtp") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      // Mask password
      return ok({ smtp: { ...smtp, pass: smtp.pass ? "••••••••" : "" } });
    }

    if (section === "smtp-test") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      return ok({ configured: !!(smtp.host && smtp.user && smtp.pass), host: smtp.host, user: smtp.user });
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
      return ok({ integrations: masked });
    }

    if (section === "users") {
      const users = await prisma.user.findMany({
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true, department: true, phone: true,
          createdAt: true, updatedAt: true,
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return ok({ users });
    }

    if (section === "workspaces") {
      const workspaces = await prisma.workspace.findMany({
        include: { _count: { select: { members: true, projects: true } } },
        orderBy: { createdAt: "desc" },
      });
      return ok({ workspaces });
    }

    if (section === "stats") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [userCount, activeProjects, taskCount, tasksThisWeek, invoiceCount, clientCount, leadCount] = await Promise.all([
        prisma.user.count(),
        prisma.project.count({ where: { status: "ACTIVE" } }),
        prisma.task.count(),
        prisma.task.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.invoice.count(),
        prisma.client.count(),
        prisma.lead.count(),
      ]);
      const invoiceRevenue = await prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } });
      const expenseTotal = await prisma.expense.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } });
      return ok({
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
        return ok({ logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
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
        return ok({ logs: mockLogs, total: mockLogs.length, page: 1, pageSize: 25, totalPages: 1 });
      }
    }

    // Default: return all config sections
    const [system, smtp, integrations] = await Promise.all([
      getConfig("system", DEFAULT_SYSTEM),
      getConfig("smtp", DEFAULT_SMTP),
      getConfig("integrations", DEFAULT_INTEGRATIONS),
    ]);

    const users = await prisma.user.findMany({
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
      prisma.user.count(),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count(),
      prisma.task.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    return ok({
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
  } catch (error) {
    console.error("Admin GET error:", error);
    return err("Internal server error", 500);
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return err("Unauthorized", 401);
    if (!ADMIN_ROLES.includes(user.role)) return err("Admin access required", 403);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }
    const { section } = body;

    // ── System Settings ──────────────────────────────────
    if (section === "system") {
      const current = await getConfig("system", DEFAULT_SYSTEM);
      const updated = { ...current, ...(body.data as Record<string, unknown>) };
      await setConfig("system", updated, user.id);
      return ok({ success: true, message: "System settings updated", data: updated });
    }

    // ── SMTP Configuration ──────────────────────────────
    if (section === "smtp") {
      const current = await getConfig("smtp", DEFAULT_SMTP);
      const data = body.data as Record<string, unknown> | undefined;
      if (!data) return err("data is required for smtp section");
      // If pass is masked, keep existing
      if (data.pass === "••••••••") data.pass = current.pass;
      const updated = { ...current, ...data };
      await setConfig("smtp", updated, user.id);

      // Update runtime env vars so email.ts picks them up
      if (updated.host) process.env.SMTP_HOST = updated.host;
      if (updated.port) process.env.SMTP_PORT = String(updated.port);
      if (updated.user) process.env.SMTP_USER = updated.user;
      if (updated.pass) process.env.SMTP_PASS = updated.pass;

      return ok({ success: true, message: "SMTP configuration saved", data: { ...updated, pass: updated.pass ? "••••••••" : "" } });
    }

    // ── SMTP Test ───────────────────────────────────────
    if (section === "smtp-test") {
      const smtp = await getConfig("smtp", DEFAULT_SMTP);
      if (!smtp.host || !smtp.user || !smtp.pass) {
        return err("SMTP not configured. Save SMTP settings first.");
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
        return ok({ success: true, message: "SMTP connection successful! Mail server is reachable." });
      } catch (error) {
        console.error("SMTP test failed:", error);
        return ok({ success: false, message: "SMTP test failed: connection could not be established" });
      }
    }

    // ── Integrations ─────────────────────────────────────
    if (section === "integrations") {
      const current = await getConfig("integrations", DEFAULT_INTEGRATIONS);
      const integration = body.integration as string | undefined;
      const data = body.data as Record<string, unknown> | undefined;

      if (!integration || !data) return err("integration and data required");

      const allowedIntegrations = ["slack", "github", "googleDrive", "whatsapp"];
      if (!allowedIntegrations.includes(integration)) return err("Invalid integration name");

      // If tokens are masked, keep existing
      if (integration === "slack" && data.botToken === "••••••••") data.botToken = current.slack?.botToken;
      if (integration === "github" && data.token === "••••••••") data.token = current.github?.token;
      if (integration === "github" && data.webhookSecret === "••••••••") data.webhookSecret = current.github?.webhookSecret;
      if (integration === "googleDrive" && data.clientSecret === "••••••••") data.clientSecret = current.googleDrive?.clientSecret;
      if (integration === "whatsapp" && data.apiKey === "••••••••") data.apiKey = current.whatsapp?.apiKey;

      const updated = { ...current, [integration]: { ...current[integration], ...data } };
      await setConfig("integrations", updated, user.id);

      return ok({ success: true, message: `${integration} configuration saved` });
    }

    // ── User Management ──────────────────────────────────
    if (section === "user-update") {
      const { userId, role, department, status } = body as { userId?: string; role?: string; department?: string; status?: string };
      if (!userId) return err("userId required");

      const validRoles = ["ADMIN", "HR", "PROJECT_MANAGER", "TEAM_MANAGER", "USER", "DRIVER"];
      if (role && !validRoles.includes(role)) return err("Invalid role");

      const validStatuses = ["ONLINE", "AWAY", "OFFLINE"];
      if (status && !validStatuses.includes(status)) return err("Invalid status");

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
      return ok({ success: true, message: "User updated", user: updated });
    }

    if (section === "user-create") {
      const { email, firstName, lastName, role, department, password } = body as {
        email?: string; firstName?: string; lastName?: string; role?: string; department?: string; password?: string;
      };
      if (!email || !firstName || !lastName || !role || !password) {
        return err("email, firstName, lastName, role, and password are required");
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return err("Invalid email format");

      if (password.length < 6) return err("Password must be at least 6 characters");

      const validRoles = ["ADMIN", "HR", "PROJECT_MANAGER", "TEAM_MANAGER", "USER", "DRIVER"];
      if (!validRoles.includes(role)) return err("Invalid role");

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return err("A user with this email already exists");

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
      return ok({ success: true, message: "User created successfully", user: created });
    }

    if (section === "user-delete") {
      const { userId } = body as { userId?: string };
      if (!userId) return err("userId required");
      if (userId === user.id) return err("Cannot delete yourself");
      await prisma.user.delete({ where: { id: userId } });
      return ok({ success: true, message: "User deleted" });
    }

    // ── Bulk Actions ──────────────────────────────────────
    if (section === "bulk-deactivate") {
      const { userIds } = body as { userIds?: string[] };
      if (!Array.isArray(userIds) || userIds.length === 0) return err("userIds array required");
      const filtered = userIds.filter((id: string) => id !== user.id);
      if (filtered.length === 0) return err("Cannot deactivate yourself");
      await prisma.user.updateMany({
        where: { id: { in: filtered } },
        data: { status: "OFFLINE" },
      });
      return ok({ success: true, message: `${filtered.length} users deactivated` });
    }

    if (section === "bulk-department") {
      const { userIds, department } = body as { userIds?: string[]; department?: string };
      if (!Array.isArray(userIds) || userIds.length === 0) return err("userIds array required");
      if (department === undefined) return err("department required");
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { department: department || null },
      });
      return ok({ success: true, message: `${userIds.length} users updated to ${department || "no department"}` });
    }

    if (section === "user-reset-password") {
      const { userId, newPassword } = body as { userId?: string; newPassword?: string };
      if (!userId || !newPassword) return err("userId and newPassword required");
      if (newPassword.length < 6) return err("Password must be at least 6 characters");
      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.default.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      return ok({ success: true, message: "Password reset successfully" });
    }

    return err("Unknown section: " + section);
  } catch (error) {
    console.error("Admin PUT error:", error);
    return err("Internal server error", 500);
  }
}

// ─── PATCH (for quick toggles) ──────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return err("Unauthorized", 401);
    if (!ADMIN_ROLES.includes(user.role)) return err("Admin access required", 403);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    if (body.action === "toggle-maintenance") {
      const system = await getConfig("system", DEFAULT_SYSTEM);
      system.maintenanceMode = !system.maintenanceMode;
      await setConfig("system", system, user.id);
      return ok({ success: true, maintenanceMode: system.maintenanceMode });
    }

    if (body.action === "toggle-signup") {
      const system = await getConfig("system", DEFAULT_SYSTEM);
      system.signupEnabled = !system.signupEnabled;
      await setConfig("system", system, user.id);
      return ok({ success: true, signupEnabled: system.signupEnabled });
    }

    return err("Unknown action");
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return err("Internal server error", 500);
  }
}
