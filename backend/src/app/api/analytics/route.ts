import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// ── Role-to-scope mapping ───────────────────────────────────────────────────
type AnalyticsScope = "full" | "financial" | "people" | "product" | "personal";

function getScopeForRole(role: string): AnalyticsScope {
  switch (role) {
    case "CEO":
    case "CTO":
    case "ADMIN":
      return "full";
    case "CFO":
    case "ACCOUNTING":
      return "financial";
    case "HR":
      return "people";
    case "PRODUCT_OWNER":
      return "product";
    default:
      return "personal";
  }
}

// ── Date helpers ────────────────────────────────────────────────────────────
function parseDateRange(searchParams: URLSearchParams) {
  const now = new Date();
  const period = searchParams.get("period") || "month";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (fromParam) {
    const from = new Date(fromParam);
    const to = toParam ? new Date(toParam) : now;
    return { dateFrom: from, dateTo: to };
  }

  let dateFrom: Date;
  switch (period) {
    case "week":
      dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case "quarter":
      dateFrom = new Date(now);
      dateFrom.setMonth(dateFrom.getMonth() - 3);
      break;
    case "year":
      dateFrom = new Date(now);
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
    case "all":
      return { dateFrom: undefined, dateTo: now };
    case "month":
    default:
      dateFrom = new Date(now);
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      break;
  }

  return { dateFrom, dateTo: now };
}

// ── CSV export helper ───────────────────────────────────────────────────────
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","));
  }
  return lines.join("\n");
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ── Metric builders ─────────────────────────────────────────────────────────

async function buildFinancialAnalytics(workspaceId: string, userIds: string[], dateFrom: Date | undefined, dateTo: Date, now: Date) {
  const invoiceDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};
  const expenseDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};

  const [invoices, expenses, payrolls] = await Promise.all([
    prisma.invoice.findMany({
      where: { createdById: { in: userIds }, ...invoiceDateFilter },
      select: { total: true, status: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { submitter: { workspaceId }, ...expenseDateFilter },
      select: { amount: true, category: true, status: true, createdAt: true },
    }),
    prisma.payroll.findMany({
      where: { employee: { workspaceId } },
      select: { totalPay: true, month: true, year: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  const totalRevenue = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalExpenses = expenses.filter((e) => e.status !== "REJECTED").reduce((s, e) => s + e.amount, 0);
  const profitMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;

  // Revenue trend (last 6 months)
  const revenueTrend: { month: string; revenue: number; expenses: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mRev = invoices.filter((inv) => inv.status === "PAID" && inv.createdAt >= mStart && inv.createdAt <= mEnd).reduce((s, inv) => s + inv.total, 0);
    const mExp = expenses.filter((e) => e.status !== "REJECTED" && e.createdAt >= mStart && e.createdAt <= mEnd).reduce((s, e) => s + e.amount, 0);
    revenueTrend.push({ month: mLabel, revenue: mRev, expenses: mExp, profit: mRev - mExp });
  }

  // Expense breakdown by category
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    if (e.status !== "REJECTED") {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
  }

  // Payroll trend
  const payrollByMonth: Record<string, number> = {};
  for (const p of payrolls) {
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    payrollByMonth[key] = (payrollByMonth[key] || 0) + p.totalPay;
  }

  return {
    kpis: { totalRevenue, totalInvoiced, totalExpenses, profitMargin, totalPayroll: payrolls.reduce((s, p) => s + p.totalPay, 0) },
    revenueTrend,
    expenseBreakdown: Object.entries(expenseByCategory).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })),
    payrollTrend: Object.entries(payrollByMonth).map(([month, total]) => ({ month, total })).slice(0, 12),
  };
}

async function buildPeopleAnalytics(workspaceId: string, users: { id: string; firstName: string; lastName: string; role: string; department: string | null; createdAt: Date }[], dateFrom: Date | undefined, dateTo: Date, now: Date) {
  const leaveDateFilter = dateFrom ? { startDate: { gte: dateFrom, lte: dateTo } } : {};

  // Team growth (monthly new joins over last 12 months)
  const teamGrowth: { month: string; count: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const joined = users.filter((u) => u.createdAt >= mStart && u.createdAt <= mEnd).length;
    cumulative += joined;
    teamGrowth.push({ month: mLabel, count: joined, cumulative });
  }

  // Department distribution
  const deptDistribution: Record<string, number> = {};
  for (const u of users) {
    const dept = u.department || "Unassigned";
    deptDistribution[dept] = (deptDistribution[dept] || 0) + 1;
  }

  // Leave trends (by month, last 6 months)
  const allLeaves = await prisma.leaveRequest.findMany({
    where: { employeeId: { in: users.map((u) => u.id) }, status: "APPROVED", ...leaveDateFilter },
    select: { type: true, startDate: true, endDate: true },
  });

  const leaveTrend: { month: string; days: number }[] = [];
  const leaveByType: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    let monthDays = 0;
    for (const l of allLeaves) {
      if (l.startDate >= mStart && l.startDate <= mEnd) {
        const days = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        monthDays += days;
      }
    }
    leaveTrend.push({ month: mLabel, days: monthDays });
  }
  for (const l of allLeaves) {
    const days = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    leaveByType[l.type] = (leaveByType[l.type] || 0) + days;
  }

  // Hiring funnel
  const jobPostings = await prisma.jobPosting.findMany({
    where: { createdById: { in: users.map((u) => u.id) } },
    select: { id: true, title: true, status: true, department: true, candidates: { select: { status: true } } },
  });

  const hiringFunnel: Record<string, number> = {};
  let totalCandidates = 0;
  for (const j of jobPostings) {
    for (const c of j.candidates) {
      hiringFunnel[c.status] = (hiringFunnel[c.status] || 0) + 1;
      totalCandidates++;
    }
  }

  return {
    kpis: {
      totalHeadcount: users.length,
      newHires: users.filter((u) => {
        const threshold = dateFrom || new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return u.createdAt >= threshold;
      }).length,
      openPositions: jobPostings.filter((j) => j.status === "OPEN").length,
      totalCandidates,
      totalLeaveDays: allLeaves.reduce((s, l) => s + Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, 0),
    },
    teamGrowth,
    departmentDistribution: Object.entries(deptDistribution).map(([name, value]) => ({ name, value })),
    leaveTrend,
    leaveByType: Object.entries(leaveByType).map(([type, days]) => ({ type: type.replace(/_/g, " "), days })),
    hiringFunnel: Object.entries(hiringFunnel).map(([stage, count]) => ({ stage: stage.replace(/_/g, " "), count })),
  };
}

async function buildProductAnalytics(workspaceId: string, dateFrom: Date | undefined, dateTo: Date, now: Date) {
  const taskDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: {
      id: true, name: true, status: true, progress: true, createdAt: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      tasks: {
        where: taskDateFilter,
        select: { id: true, status: true, dueDate: true, createdAt: true, assigneeId: true },
      },
    },
  });

  // Project metrics
  const projectMetrics = projects.map((p) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
    const overdueTasks = p.tasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now).length;
    const periodDays = dateFrom ? Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))) : 30;
    const velocity = Math.round((completedTasks / (periodDays / 7)) * 10) / 10;
    return {
      id: p.id, name: p.name, status: p.status, progress: p.progress,
      manager: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : "Unassigned",
      totalTasks, completedTasks, overdueTasks, velocity,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  });

  // Completion trend (last 6 months)
  const allTasks = projects.flatMap((p) => p.tasks);
  const completionTrend: { month: string; created: number; completed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const created = allTasks.filter((t) => t.createdAt >= mStart && t.createdAt <= mEnd).length;
    const completed = allTasks.filter((t) => t.status === "COMPLETED" && t.createdAt >= mStart && t.createdAt <= mEnd).length;
    completionTrend.push({ month: mLabel, created, completed });
  }

  // Client engagement: tasks and projects per client
  const clientMap: Record<string, { projects: number; tasks: number; completed: number; avgProgress: number; progressSum: number }> = {};
  for (const p of projects) {
    const clientName = (p as any).client?.name || "Internal";
    if (!clientMap[clientName]) clientMap[clientName] = { projects: 0, tasks: 0, completed: 0, avgProgress: 0, progressSum: 0 };
    clientMap[clientName].projects++;
    clientMap[clientName].tasks += p.tasks.length;
    clientMap[clientName].completed += p.tasks.filter((t) => t.status === "COMPLETED").length;
    clientMap[clientName].progressSum += p.progress;
  }
  const clientEngagement = Object.entries(clientMap).map(([client, stats]) => ({
    client, projects: stats.projects, tasks: stats.tasks, completed: stats.completed,
    avgProgress: stats.projects > 0 ? Math.round(stats.progressSum / stats.projects) : 0,
  }));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  return {
    kpis: {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => (p.status as string) === "IN_PROGRESS" || (p.status as string) === "ACTIVE").length,
      avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter((t) => t.status === "COMPLETED").length,
      overdueTasks: allTasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now).length,
    },
    projectMetrics,
    completionTrend,
    clientEngagement,
    projectStatusDistribution: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
  };
}

async function buildPersonalAnalytics(userId: string, workspaceId: string, dateFrom: Date | undefined, dateTo: Date, now: Date) {
  const taskDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};
  const timeFilter = dateFrom ? { date: { gte: dateFrom, lte: dateTo } } : {};

  const [myTasks, myTimeEntries, myExpenses] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, project: { workspaceId }, ...taskDateFilter },
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: { userId, ...timeFilter },
      select: { hours: true, date: true, task: { select: { title: true, project: { select: { name: true } } } } },
    }),
    prisma.expense.findMany({
      where: { submitterId: userId, ...(dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}) },
      select: { amount: true, category: true, status: true },
    }),
  ]);

  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter((t) => t.status === "COMPLETED").length;
  const overdueTasks = myTasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now).length;
  const totalHours = myTimeEntries.reduce((s, e) => s + e.hours, 0);

  // Productivity trend (tasks completed per week, last 6 weeks)
  const productivityTrend: { week: string; completed: number; hours: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    const label = weekStart.toLocaleString("en-US", { month: "short", day: "numeric" });
    const weekCompleted = myTasks.filter((t) => t.status === "COMPLETED" && t.createdAt >= weekStart && t.createdAt <= weekEnd).length;
    const weekHours = myTimeEntries.filter((e) => e.date >= weekStart && e.date <= weekEnd).reduce((s, e) => s + e.hours, 0);
    productivityTrend.push({ week: label, completed: weekCompleted, hours: Math.round(weekHours * 10) / 10 });
  }

  // Time distribution by project
  const timeByProject: Record<string, number> = {};
  for (const e of myTimeEntries) {
    const proj = e.task?.project?.name || "Unassigned";
    timeByProject[proj] = (timeByProject[proj] || 0) + e.hours;
  }

  // Task distribution by status
  const taskByStatus: Record<string, number> = {};
  for (const t of myTasks) {
    taskByStatus[t.status] = (taskByStatus[t.status] || 0) + 1;
  }

  // Task distribution by priority
  const taskByPriority: Record<string, number> = {};
  for (const t of myTasks) {
    taskByPriority[t.priority] = (taskByPriority[t.priority] || 0) + 1;
  }

  return {
    kpis: {
      totalTasks, completedTasks, overdueTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalHoursLogged: Math.round(totalHours * 10) / 10,
      totalExpenses: myExpenses.reduce((s, e) => s + e.amount, 0),
    },
    productivityTrend,
    timeDistribution: Object.entries(timeByProject).map(([project, hours]) => ({ project, hours: Math.round(hours * 10) / 10 })),
    tasksByStatus: Object.entries(taskByStatus).map(([name, value]) => ({ name, value })),
    tasksByPriority: Object.entries(taskByPriority).map(([name, value]) => ({ name, value })),
  };
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const workspaceId = user.workspaceId;
    const now = new Date();

    const { searchParams } = new URL(req.url);
    const exportFormat = searchParams.get("export"); // "csv" or "pdf"
    const { dateFrom, dateTo } = parseDateRange(searchParams);

    const scope = getScopeForRole(user.role);

    // Fetch workspace users (shared across scopes)
    const users = await prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });
    const userIds = users.map((u) => u.id);

    // ── FULL scope (CEO/CTO/ADMIN) ─────────────────────────────
    if (scope === "full") {
      const [financial, people, product] = await Promise.all([
        buildFinancialAnalytics(workspaceId, userIds, dateFrom, dateTo, now),
        buildPeopleAnalytics(workspaceId, users, dateFrom, dateTo, now),
        buildProductAnalytics(workspaceId, dateFrom, dateTo, now),
      ]);

      // Recent activity
      const recentActivity = await prisma.task.findMany({
        where: { project: { workspaceId } },
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true, updatedAt: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });

      const data = {
        scope: "full",
        financial,
        people,
        product,
        companyKpis: {
          totalRevenue: financial.kpis.totalRevenue,
          totalExpenses: financial.kpis.totalExpenses,
          profitMargin: financial.kpis.profitMargin,
          headcount: people.kpis.totalHeadcount,
          activeProjects: product.kpis.activeProjects,
          taskCompletionRate: product.kpis.totalTasks > 0 ? Math.round((product.kpis.completedTasks / product.kpis.totalTasks) * 100) : 0,
        },
        recentActivity,
      };

      if (exportFormat === "csv") {
        const rows = financial.revenueTrend.map((r) => ({
          Month: r.month, Revenue: r.revenue, Expenses: r.expenses, Profit: r.profit,
        }));
        return csvResponse(toCsv(rows), "company-analytics.csv");
      }

      return jsonOk({ success: true, data });
    }

    // ── FINANCIAL scope (CFO/ACCOUNTING) ────────────────────────
    if (scope === "financial") {
      const financial = await buildFinancialAnalytics(workspaceId, userIds, dateFrom, dateTo, now);

      if (exportFormat === "csv") {
        const rows = financial.revenueTrend.map((r) => ({
          Month: r.month, Revenue: r.revenue, Expenses: r.expenses, Profit: r.profit,
        }));
        return csvResponse(toCsv(rows), "financial-analytics.csv");
      }

      return jsonOk({ success: true, data: { scope: "financial", financial } });
    }

    // ── PEOPLE scope (HR) ───────────────────────────────────────
    if (scope === "people") {
      const people = await buildPeopleAnalytics(workspaceId, users, dateFrom, dateTo, now);

      if (exportFormat === "csv") {
        const rows = people.teamGrowth.map((r) => ({
          Month: r.month, NewJoins: r.count, Cumulative: r.cumulative,
        }));
        return csvResponse(toCsv(rows), "people-analytics.csv");
      }

      return jsonOk({ success: true, data: { scope: "people", people } });
    }

    // ── PRODUCT scope (PRODUCT_OWNER) ───────────────────────────
    if (scope === "product") {
      const product = await buildProductAnalytics(workspaceId, dateFrom, dateTo, now);

      if (exportFormat === "csv") {
        const rows = product.projectMetrics.map((p) => ({
          Project: p.name, Status: p.status, Progress: `${p.progress}%`, Client: p.client,
          Tasks: p.totalTasks, Completed: p.completedTasks, Overdue: p.overdueTasks,
          Velocity: p.velocity, CompletionRate: `${p.completionRate}%`,
        }));
        return csvResponse(toCsv(rows), "product-analytics.csv");
      }

      return jsonOk({ success: true, data: { scope: "product", product } });
    }

    // ── PERSONAL scope (all other roles) ────────────────────────
    const personal = await buildPersonalAnalytics(user.id, workspaceId, dateFrom, dateTo, now);

    if (exportFormat === "csv") {
      const rows = personal.productivityTrend.map((w) => ({
        Week: w.week, TasksCompleted: w.completed, Hours: w.hours,
      }));
      return csvResponse(toCsv(rows), "my-analytics.csv");
    }

    return jsonOk({ success: true, data: { scope: "personal", personal } });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return jsonError("Internal server error", 500);
  }
}
