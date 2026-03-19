import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// ── Role-to-tab access mapping ──────────────────────────────────────────────
const ROLE_TAB_ACCESS: Record<string, string[]> = {
  CEO: ["executive", "performance", "financial", "project", "hr"],
  CTO: ["executive", "performance", "financial", "project", "hr"],
  ADMIN: ["executive", "performance", "financial", "project", "hr"],
  CFO: ["financial"],
  SR_ACCOUNTANT: ["financial"],
  JR_ACCOUNTANT: ["financial"],
  HR: ["hr"],
  PRODUCT_OWNER: ["project"],
};

// Everyone has access to "personal" tab
const PERSONAL_TAB = "personal";

function getAllowedTabs(role: string): string[] {
  const tabs = ROLE_TAB_ACCESS[role] || [];
  return [...tabs, PERSONAL_TAB];
}

// ── Date helpers ────────────────────────────────────────────────────────────
function parseDateRange(searchParams: URLSearchParams) {
  const now = new Date();
  const period = searchParams.get("period") || "all";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Custom date range takes priority
  if (fromParam) {
    const from = new Date(fromParam);
    const to = toParam ? new Date(toParam) : now;
    return { dateFrom: from, dateTo: to };
  }

  let dateFrom: Date | undefined;
  if (period === "week") {
    dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 7);
  } else if (period === "month") {
    dateFrom = new Date(now);
    dateFrom.setMonth(dateFrom.getMonth() - 1);
  } else if (period === "quarter") {
    dateFrom = new Date(now);
    dateFrom.setMonth(dateFrom.getMonth() - 3);
  } else if (period === "year") {
    dateFrom = new Date(now);
    dateFrom.setFullYear(dateFrom.getFullYear() - 1);
  }

  return { dateFrom, dateTo: now };
}

// ── CSV/PDF export helpers ──────────────────────────────────────────────────
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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const workspaceId = user.workspaceId;
    const now = new Date();

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "auto";
    const exportFormat = searchParams.get("export"); // "csv" or "pdf"

    const { dateFrom, dateTo } = parseDateRange(searchParams);

    // Determine effective tab based on role
    const allowedTabs = getAllowedTabs(user.role);
    let effectiveTab = tab;
    if (tab === "auto") {
      // Default tab based on role
      if (["CEO", "CTO", "ADMIN"].includes(user.role)) effectiveTab = "executive";
      else if (["CFO", "SR_ACCOUNTANT", "JR_ACCOUNTANT"].includes(user.role)) effectiveTab = "financial";
      else if (user.role === "HR") effectiveTab = "hr";
      else if (user.role === "PRODUCT_OWNER") effectiveTab = "project";
      else effectiveTab = "personal";
    }

    if (!allowedTabs.includes(effectiveTab)) {
      return jsonError(`Forbidden: your role (${user.role}) cannot access the "${effectiveTab}" report. Allowed: ${allowedTabs.join(", ")}`, 403);
    }

    // Date filters for Prisma queries
    const taskDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};
    const leaveDateFilter = dateFrom ? { startDate: { gte: dateFrom, lte: dateTo } } : {};
    const invoiceDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};
    const expenseDateFilter = dateFrom ? { createdAt: { gte: dateFrom, lte: dateTo } } : {};

    // ── Shared: workspace users ──────────────────────────────────
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

    // ══════════════════════════════════════════════════════════════
    // TAB: PERSONAL (available to all roles)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "personal") {
      const [myTasks, myLeaves, myExpenses, myTimeEntries] = await Promise.all([
        prisma.task.findMany({
          where: { assigneeId: user.id, project: { workspaceId }, ...taskDateFilter },
          select: {
            id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.leaveRequest.findMany({
          where: { employeeId: user.id, ...leaveDateFilter },
          select: { id: true, type: true, status: true, startDate: true, endDate: true, reason: true },
          orderBy: { startDate: "desc" },
        }),
        prisma.expense.findMany({
          where: { submitterId: user.id, ...expenseDateFilter },
          select: { id: true, title: true, amount: true, category: true, status: true, expenseDate: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.timeEntry.findMany({
          where: { userId: user.id, ...(dateFrom ? { date: { gte: dateFrom, lte: dateTo } } : {}) },
          select: { id: true, hours: true, date: true, description: true, task: { select: { title: true, project: { select: { name: true } } } } },
          orderBy: { date: "desc" },
        }),
      ]);

      const totalTasks = myTasks.length;
      const completedTasks = myTasks.filter((t) => t.status === "COMPLETED").length;
      const overdueTasks = myTasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now).length;
      const inProgressTasks = myTasks.filter((t) => t.status === "IN_PROGRESS").length;

      const totalHours = myTimeEntries.reduce((s, e) => s + e.hours, 0);
      const totalExpenseAmount = myExpenses.reduce((s, e) => s + e.amount, 0);

      const leaveDays = myLeaves.filter((l) => l.status === "APPROVED").reduce((s, l) => {
        return s + Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      const data = {
        summary: {
          totalTasks, completedTasks, inProgressTasks, overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          totalHoursLogged: Math.round(totalHours * 10) / 10,
          totalExpenses: totalExpenseAmount,
          approvedLeaveDays: leaveDays,
        },
        tasks: myTasks,
        leaves: myLeaves,
        expenses: myExpenses,
        timeEntries: myTimeEntries,
      };

      if (exportFormat === "csv") {
        const rows = myTasks.map((t) => ({
          Title: t.title, Status: t.status, Priority: t.priority,
          DueDate: t.dueDate?.toISOString() || "", Project: t.project?.name || "",
        }));
        return csvResponse(toCsv(rows), "my-tasks-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    // ══════════════════════════════════════════════════════════════
    // TAB: EXECUTIVE SUMMARY (CEO/CTO/ADMIN)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "executive") {
      // Revenue
      const invoices = await prisma.invoice.findMany({
        where: { createdById: { in: users.map((u) => u.id) }, ...invoiceDateFilter },
        select: { total: true, status: true, dueDate: true, createdAt: true },
      });

      const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
      const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
      const totalOutstanding = invoices.filter((i) => ["SENT", "DRAFT"].includes(i.status)).reduce((s, i) => s + i.total, 0);
      const totalOverdueInv = invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.total, 0);

      // Projects
      const projects = await prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true, status: true, progress: true },
      });

      const projectsByStatus: Record<string, number> = {};
      for (const p of projects) {
        projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
      }

      // Team utilization
      const allTasks = await prisma.task.findMany({
        where: { project: { workspaceId }, ...taskDateFilter },
        select: { assigneeId: true, status: true },
      });

      const assigneesWithTasks = new Set(allTasks.map((t) => t.assigneeId).filter(Boolean));
      const activeMembers = assigneesWithTasks.size;
      const idleMembers = users.length - activeMembers;
      const avgTasksPerPerson = users.length > 0 ? Math.round((allTasks.length / users.length) * 10) / 10 : 0;

      // Expenses
      const expenses = await prisma.expense.findMany({
        where: { submitter: { workspaceId }, ...expenseDateFilter },
        select: { amount: true, category: true, status: true, createdAt: true },
      });

      const totalExpenses = expenses.filter((e) => e.status !== "REJECTED").reduce((s, e) => s + e.amount, 0);
      const profitMargin = totalPaid > 0 ? Math.round(((totalPaid - totalExpenses) / totalPaid) * 100) : 0;

      // Payroll for burn rate
      const payrolls = await prisma.payroll.findMany({
        where: { employee: { workspaceId } },
        select: { totalPay: true, month: true, year: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

      const monthlyPayrollMap: Record<string, number> = {};
      for (const p of payrolls) {
        const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
        monthlyPayrollMap[key] = (monthlyPayrollMap[key] || 0) + p.totalPay;
      }
      const recentMonths = Object.values(monthlyPayrollMap).slice(0, 3);
      const monthlyBurnRate = recentMonths.length > 0 ? Math.round(recentMonths.reduce((s, v) => s + v, 0) / recentMonths.length) : 0;

      // Clients & Leads
      const clientCount = await prisma.client.count({ where: { workspaceId } });
      const leads = await prisma.lead.findMany({
        where: { workspaceId },
        select: { status: true, value: true },
      });
      const activeLeads = leads.filter((l) => !["WON", "LOST"].includes(l.status)).length;
      const wonLeads = leads.filter((l) => l.status === "WON").length;
      const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

      // Revenue trend (last 6 months)
      const revenueTrend: { month: string; invoiced: number; paid: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const mInvoices = invoices.filter((inv) => inv.createdAt >= mStart && inv.createdAt <= mEnd);
        revenueTrend.push({
          month: mLabel,
          invoiced: mInvoices.reduce((s, inv) => s + inv.total, 0),
          paid: mInvoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + inv.total, 0),
        });
      }

      // Expense by category
      const expenseByCategory: Record<string, number> = {};
      for (const e of expenses) {
        if (e.status !== "REJECTED") {
          expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
        }
      }

      const data = {
        revenue: { totalInvoiced, totalPaid, totalOutstanding, totalOverdue: totalOverdueInv },
        projectHealth: { total: projects.length, byStatus: projectsByStatus, avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0 },
        teamUtilization: { total: users.length, active: activeMembers, idle: idleMembers, avgTasksPerPerson },
        financialKPIs: { totalExpenses, totalRevenue: totalPaid, profitMargin, monthlyBurnRate },
        clientMetrics: { totalClients: clientCount, activeLeads, wonLeads, conversionRate, totalLeads: leads.length },
        charts: {
          revenueTrend,
          projectStatus: Object.entries(projectsByStatus).map(([name, value]) => ({ name, value })),
          expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })),
        },
      };

      if (exportFormat === "csv") {
        const rows = revenueTrend.map((r) => ({ Month: r.month, Invoiced: r.invoiced, Paid: r.paid }));
        return csvResponse(toCsv(rows), "executive-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    // ══════════════════════════════════════════════════════════════
    // TAB: PERFORMANCE (CEO/CTO/ADMIN)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "performance") {
      const employeeStats = await Promise.all(
        users.map(async (u) => {
          const [total, completed, inProgress, inReview, overdue] = await Promise.all([
            prisma.task.count({ where: { assigneeId: u.id, project: { workspaceId }, ...taskDateFilter } }),
            prisma.task.count({ where: { assigneeId: u.id, status: "COMPLETED", project: { workspaceId }, ...taskDateFilter } }),
            prisma.task.count({ where: { assigneeId: u.id, status: "IN_PROGRESS", project: { workspaceId }, ...taskDateFilter } }),
            prisma.task.count({ where: { assigneeId: u.id, status: "IN_REVIEW", project: { workspaceId }, ...taskDateFilter } }),
            prisma.task.count({ where: { assigneeId: u.id, status: { not: "COMPLETED" }, dueDate: { lt: now }, project: { workspaceId }, ...taskDateFilter } }),
          ]);
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, department: u.department, totalTasks: total, completedTasks: completed, inProgressTasks: inProgress, inReviewTasks: inReview, overdueTasks: overdue, completionRate };
        })
      );

      const underperformers = [...employeeStats].filter((e) => e.totalTasks > 0).sort((a, b) => a.completionRate - b.completionRate).slice(0, 10);

      const overdueTasksByEmployee = await Promise.all(
        employeeStats
          .filter((e) => e.overdueTasks > 0)
          .sort((a, b) => b.overdueTasks - a.overdueTasks)
          .slice(0, 15)
          .map(async (e) => {
            const tasks = await prisma.task.findMany({
              where: { assigneeId: e.id, status: { not: "COMPLETED" }, dueDate: { lt: now }, project: { workspaceId }, ...taskDateFilter },
              select: { id: true, title: true, status: true, priority: true, dueDate: true, project: { select: { name: true } } },
              orderBy: { dueDate: "asc" },
              take: 5,
            });
            return { id: e.id, firstName: e.firstName, lastName: e.lastName, role: e.role, overdueCount: e.overdueTasks, tasks };
          })
      );

      const teamPerformance = [...employeeStats].filter((e) => e.totalTasks > 0).sort((a, b) => b.completionRate - a.completionRate).map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, role: e.role, completionRate: e.completionRate, totalTasks: e.totalTasks, completedTasks: e.completedTasks }));

      const leaveStats = await Promise.all(
        users.map(async (u) => {
          const leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: u.id, status: { in: ["APPROVED", "PENDING"] }, ...leaveDateFilter },
            select: { type: true, startDate: true, endDate: true },
          });
          let totalDays = 0, paidDays = 0, unpaidDays = 0, sickDays = 0, casualDays = 0, halfDays = 0, wfhDays = 0;
          for (const leave of leaves) {
            const days = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            totalDays += days;
            switch (leave.type) {
              case "PAID": paidDays += days; break;
              case "UNPAID": unpaidDays += days; break;
              case "SICK": sickDays += days; break;
              case "HALF_DAY": halfDays += days; break;
              case "WORK_FROM_HOME": wfhDays += days; break;
            }
          }
          return { id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role, totalDays, paidDays, unpaidDays, sickDays, casualDays, halfDays, wfhDays, leaveCount: leaves.length };
        })
      );
      const leaveAbuse = [...leaveStats].filter((l) => l.totalDays > 0).sort((a, b) => b.totalDays - a.totalDays).slice(0, 15);

      const avgTasks = employeeStats.length > 0 ? employeeStats.reduce((sum, e) => sum + e.totalTasks, 0) / employeeStats.length : 0;
      const workloadDistribution = [...employeeStats].sort((a, b) => b.totalTasks - a.totalTasks).map((e) => ({
        id: e.id, name: `${e.firstName} ${e.lastName}`, role: e.role, totalTasks: e.totalTasks, completedTasks: e.completedTasks, inProgressTasks: e.inProgressTasks, overdueTasks: e.overdueTasks, deviation: Math.round(e.totalTasks - avgTasks),
        status: e.totalTasks > avgTasks * 1.5 ? "overloaded" : e.totalTasks < avgTasks * 0.5 ? "underutilized" : "balanced",
      }));

      const summary = {
        totalEmployees: users.length,
        totalTasks: employeeStats.reduce((s, e) => s + e.totalTasks, 0),
        totalCompleted: employeeStats.reduce((s, e) => s + e.completedTasks, 0),
        totalOverdue: employeeStats.reduce((s, e) => s + e.overdueTasks, 0),
        avgCompletionRate: employeeStats.filter((e) => e.totalTasks > 0).length > 0 ? Math.round(employeeStats.filter((e) => e.totalTasks > 0).reduce((s, e) => s + e.completionRate, 0) / employeeStats.filter((e) => e.totalTasks > 0).length) : 0,
        avgTasksPerEmployee: Math.round(avgTasks * 10) / 10,
        totalLeaveDays: leaveStats.reduce((s, l) => s + l.totalDays, 0),
      };

      const data = { summary, underperformers, overdueTasksByEmployee, teamPerformance, leaveAbuse, workloadDistribution };

      if (exportFormat === "csv") {
        const rows = teamPerformance.map((t) => ({
          Name: t.name, Role: t.role, TotalTasks: t.totalTasks,
          CompletedTasks: t.completedTasks, CompletionRate: `${t.completionRate}%`,
        }));
        return csvResponse(toCsv(rows), "performance-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    // ══════════════════════════════════════════════════════════════
    // TAB: FINANCIAL (CEO/CTO/ADMIN/CFO/ACCOUNTING)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "financial") {
      const invoices = await prisma.invoice.findMany({
        where: { createdById: { in: users.map((u) => u.id) }, ...invoiceDateFilter },
        select: { id: true, invoiceNumber: true, clientName: true, total: true, status: true, dueDate: true, createdAt: true },
      });

      const invoiceByStatus: Record<string, { count: number; total: number }> = {};
      for (const inv of invoices) {
        if (!invoiceByStatus[inv.status]) invoiceByStatus[inv.status] = { count: 0, total: 0 };
        invoiceByStatus[inv.status].count++;
        invoiceByStatus[inv.status].total += inv.total;
      }

      const expenses = await prisma.expense.findMany({
        where: { submitter: { workspaceId }, ...expenseDateFilter },
        select: { id: true, title: true, amount: true, category: true, status: true, expenseDate: true, createdAt: true },
      });

      const expenseByCategory: Record<string, number> = {};
      const expenseByStatus: Record<string, { count: number; total: number }> = {};
      for (const e of expenses) {
        if (e.status !== "REJECTED") {
          expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
        }
        if (!expenseByStatus[e.status]) expenseByStatus[e.status] = { count: 0, total: 0 };
        expenseByStatus[e.status].count++;
        expenseByStatus[e.status].total += e.amount;
      }

      const payrolls = await prisma.payroll.findMany({
        where: { employee: { workspaceId } },
        select: { totalPay: true, month: true, year: true, employee: { select: { department: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

      const payrollByMonth: Record<string, number> = {};
      const payrollByDept: Record<string, number> = {};
      for (const p of payrolls) {
        const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
        payrollByMonth[key] = (payrollByMonth[key] || 0) + p.totalPay;
        const dept = p.employee.department || "Unassigned";
        payrollByDept[dept] = (payrollByDept[dept] || 0) + p.totalPay;
      }

      // Revenue vs Expenses chart (last 6 months)
      const revenueVsExpense: { month: string; revenue: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const mLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const mRev = invoices.filter((inv) => inv.status === "PAID" && inv.createdAt >= mStart && inv.createdAt <= mEnd).reduce((s, inv) => s + inv.total, 0);
        const mExp = expenses.filter((e) => e.status !== "REJECTED" && e.createdAt >= mStart && e.createdAt <= mEnd).reduce((s, e) => s + e.amount, 0);
        revenueVsExpense.push({ month: mLabel, revenue: mRev, expenses: mExp });
      }

      const data = {
        invoiceSummary: { total: invoices.length, totalAmount: invoices.reduce((s, i) => s + i.total, 0), byStatus: invoiceByStatus },
        expenseSummary: { total: expenses.length, totalAmount: expenses.reduce((s, e) => s + e.amount, 0), byCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })), byStatus: expenseByStatus },
        payrollSummary: { byMonth: Object.entries(payrollByMonth).map(([month, total]) => ({ month, total })).slice(0, 12), byDepartment: Object.entries(payrollByDept).map(([dept, total]) => ({ dept, total })) },
        charts: { revenueVsExpense },
      };

      if (exportFormat === "csv") {
        const rows = invoices.map((inv) => ({
          InvoiceNumber: inv.invoiceNumber, Client: inv.clientName, Total: inv.total,
          Status: inv.status, DueDate: inv.dueDate?.toISOString() || "",
        }));
        return csvResponse(toCsv(rows), "financial-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    // ══════════════════════════════════════════════════════════════
    // TAB: PROJECT (CEO/CTO/ADMIN/PRODUCT_OWNER)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "project") {
      const projects = await prisma.project.findMany({
        where: { workspaceId },
        select: {
          id: true, name: true, status: true, progress: true, dueDate: true, createdAt: true,
          manager: { select: { firstName: true, lastName: true } },
          tasks: { select: { id: true, status: true, dueDate: true, assigneeId: true, createdAt: true } },
          client: { select: { id: true, name: true } },
        },
      });

      const projectDetails = projects.map((p) => {
        const filteredTasks = dateFrom
          ? p.tasks.filter((t) => t.createdAt >= dateFrom!)
          : p.tasks;
        const totalTasks = filteredTasks.length;
        const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED").length;
        const overdueTasks = filteredTasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now).length;
        const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const assignees = new Set(filteredTasks.map((t) => t.assigneeId).filter(Boolean));

        // Velocity: completed tasks per week in the period
        const periodDays = dateFrom ? Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))) : 30;
        const velocity = Math.round((completedTasks / (periodDays / 7)) * 10) / 10;

        return {
          id: p.id, name: p.name, status: p.status, progress: p.progress, dueDate: p.dueDate, createdAt: p.createdAt,
          manager: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : "Unassigned",
          client: p.client?.name || "Internal",
          totalTasks, completedTasks, overdueTasks, taskCompletion, velocity,
          teamSize: assignees.size,
        };
      });

      // Risk: projects sorted by overdue tasks desc
      const riskProjects = [...projectDetails].filter((p) => p.overdueTasks > 0).sort((a, b) => b.overdueTasks - a.overdueTasks);

      // Resource allocation
      const resourceAllocation = projectDetails.map((p) => ({
        project: p.name, status: p.status, teamSize: p.teamSize, totalTasks: p.totalTasks,
      }));

      // Client report: group projects by client
      const clientMap: Record<string, { projects: number; tasks: number; completed: number; overdue: number }> = {};
      for (const p of projectDetails) {
        if (!clientMap[p.client]) clientMap[p.client] = { projects: 0, tasks: 0, completed: 0, overdue: 0 };
        clientMap[p.client].projects++;
        clientMap[p.client].tasks += p.totalTasks;
        clientMap[p.client].completed += p.completedTasks;
        clientMap[p.client].overdue += p.overdueTasks;
      }
      const clientReport = Object.entries(clientMap).map(([client, stats]) => ({ client, ...stats }));

      const data = { projects: projectDetails, riskProjects, resourceAllocation, clientReport };

      if (exportFormat === "csv") {
        const rows = projectDetails.map((p) => ({
          Project: p.name, Status: p.status, Progress: `${p.progress}%`, Manager: p.manager,
          Client: p.client, Tasks: p.totalTasks, Completed: p.completedTasks,
          Overdue: p.overdueTasks, Velocity: p.velocity,
        }));
        return csvResponse(toCsv(rows), "project-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    // ══════════════════════════════════════════════════════════════
    // TAB: HR (CEO/CTO/ADMIN/HR)
    // ══════════════════════════════════════════════════════════════
    if (effectiveTab === "hr") {
      // Headcount by department and role
      const headcountByDept: Record<string, number> = {};
      const headcountByRole: Record<string, number> = {};
      for (const u of users) {
        const dept = u.department || "Unassigned";
        headcountByDept[dept] = (headcountByDept[dept] || 0) + 1;
        headcountByRole[u.role] = (headcountByRole[u.role] || 0) + 1;
      }

      // Attrition: users who were created vs. current count (simple proxy)
      const newHires = dateFrom
        ? users.filter((u) => u.createdAt >= dateFrom!).length
        : users.filter((u) => {
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return u.createdAt >= threeMonthsAgo;
          }).length;

      // Leave utilization
      const leaveUtilization = await Promise.all(
        users.map(async (u) => {
          const leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: u.id, status: "APPROVED", ...leaveDateFilter },
            select: { type: true, startDate: true, endDate: true },
          });
          let totalDays = 0;
          const byType: Record<string, number> = {};
          for (const l of leaves) {
            const days = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            totalDays += days;
            byType[l.type] = (byType[l.type] || 0) + days;
          }
          return { id: u.id, name: `${u.firstName} ${u.lastName}`, department: u.department || "Unassigned", role: u.role, leaveDays: totalDays, leaveCount: leaves.length, byType };
        })
      );

      // Hiring pipeline
      const jobPostings = await prisma.jobPosting.findMany({
        where: { createdById: { in: users.map((u) => u.id) } },
        select: { id: true, title: true, status: true, department: true, candidates: { select: { status: true } } },
      });

      const openPositions = jobPostings.filter((j) => j.status === "OPEN").length;
      const totalCandidates = jobPostings.reduce((s, j) => s + j.candidates.length, 0);
      const offeredCount = jobPostings.reduce((s, j) => s + j.candidates.filter((c) => c.status === "OFFERED").length, 0);
      const hiredCount = jobPostings.reduce((s, j) => s + j.candidates.filter((c) => c.status === "HIRED").length, 0);
      const offerAcceptRate = offeredCount + hiredCount > 0 ? Math.round((hiredCount / (offeredCount + hiredCount)) * 100) : 0;

      // Pipeline breakdown
      const pipelineByStage: Record<string, number> = {};
      for (const j of jobPostings) {
        for (const c of j.candidates) {
          pipelineByStage[c.status] = (pipelineByStage[c.status] || 0) + 1;
        }
      }

      // Complaints
      const complaints = await prisma.complaint.findMany({
        where: { workspaceId },
        select: { status: true, category: true },
      });

      const complaintsByStatus: Record<string, number> = {};
      const complaintsByCategory: Record<string, number> = {};
      for (const c of complaints) {
        complaintsByStatus[c.status] = (complaintsByStatus[c.status] || 0) + 1;
        complaintsByCategory[c.category] = (complaintsByCategory[c.category] || 0) + 1;
      }

      const data = {
        headcount: {
          total: users.length,
          newHires,
          byDepartment: Object.entries(headcountByDept).map(([dept, count]) => ({ dept, count })),
          byRole: Object.entries(headcountByRole).map(([role, count]) => ({ role: role.replace(/_/g, " "), count })),
        },
        leaveUtilization: leaveUtilization.filter((l) => l.leaveDays > 0).sort((a, b) => b.leaveDays - a.leaveDays),
        hiring: { openPositions, totalCandidates, hiredCount, offerAcceptRate, pipelineByStage: Object.entries(pipelineByStage).map(([stage, count]) => ({ stage: stage.replace(/_/g, " "), count })) },
        complaints: { total: complaints.length, byStatus: complaintsByStatus, byCategory: Object.entries(complaintsByCategory).map(([cat, count]) => ({ category: cat.replace(/_/g, " "), count })) },
      };

      if (exportFormat === "csv") {
        const rows = users.map((u) => ({
          Name: `${u.firstName} ${u.lastName}`, Email: u.email, Role: u.role,
          Department: u.department || "Unassigned", JoinDate: u.createdAt.toISOString(),
        }));
        return csvResponse(toCsv(rows), "hr-report.csv");
      }

      return jsonOk({ success: true, allowedTabs, data });
    }

    return jsonError("Invalid tab parameter. Use: executive, performance, financial, project, hr, personal", 400);
  } catch (error) {
    console.error("Reports GET error:", error);
    return jsonError("Internal server error", 500);
  }
}
