import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk } from "@/lib/create-handler";

const MOTIVATIONAL_QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "Act as if what you do makes a difference. It does. — William James",
  "Quality is not an act, it is a habit. — Aristotle",
  "Small daily improvements over time lead to stunning results. — Robin Sharma",
  "Focus on being productive instead of busy. — Tim Ferriss",
  "Your limitation — it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days. — Sam Walton",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key is not to prioritize what's on your schedule, but to schedule your priorities. — Stephen Covey",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Productivity is never an accident. It is always the result of a commitment to excellence. — Paul J. Meyer",
  "The way to get started is to quit talking and begin doing. — Walt Disney",
  "Start where you are. Use what you have. Do what you can. — Arthur Ashe",
];

// ─── Role group helpers ──────────────────────────────────────
type RoleGroup =
  | "executive"
  | "finance"
  | "hr"
  | "product"
  | "developer"
  | "content"
  | "client"
  | "minimal";

function getRoleGroup(role: string): RoleGroup {
  switch (role) {
    case "CEO":
    case "CTO":
    case "ADMIN":
      return "executive";
    case "CFO":
    case "SR_ACCOUNTANT":
    case "JR_ACCOUNTANT":
      return "finance";
    case "HR":
      return "hr";
    case "PRODUCT_OWNER":
      return "product";
    case "SR_DEVELOPER":
    case "JR_DEVELOPER":
      return "developer";
    case "SR_EDITOR":
    case "JR_EDITOR":
    case "SR_GRAPHIC_DESIGNER":
    case "JR_GRAPHIC_DESIGNER":
    case "SR_CONTENT_STRATEGIST":
    case "JR_CONTENT_STRATEGIST":
      return "content";
    case "BRAND_FACE":
    case "BRAND_PARTNER":
      return "client";
    case "GUY":
    case "OFFICE_BOY":
      return "minimal";
    default:
      return "minimal";
  }
}

// ─── IST helpers ─────────────────────────────────────────────
function getISTGreeting(): string {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istHour = new Date(utcMs + istOffsetMs).getHours();

  if (istHour < 12) return "Good Morning";
  if (istHour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getISTToday(): { todayStart: Date; tomorrowStart: Date } {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istNow = new Date(utcMs + istOffsetMs);

  const todayStart = new Date(
    Date.UTC(istNow.getFullYear(), istNow.getMonth(), istNow.getDate()) -
      istOffsetMs
  );
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  return { todayStart, tomorrowStart };
}

function formatISTDate(): string {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istNow = new Date(utcMs + istOffsetMs);

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${days[istNow.getDay()]}, ${months[istNow.getMonth()]} ${istNow.getDate()}, ${istNow.getFullYear()}`;
}

function getRandomQuote(): string {
  return MOTIVATIONAL_QUOTES[
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  ];
}

export const GET = createHandler({}, async (_req: NextRequest, { user }) => {
  const workspaceId = user.workspaceId;
  const userId = user.id;
  const role = user.role;
  const roleGroup = getRoleGroup(role);

  const { todayStart, tomorrowStart } = getISTToday();
  const now = new Date();

  const next7Days = new Date(tomorrowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Week boundaries (Monday to Sunday) for weekly trend
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istNow = new Date(utcMs + istOffsetMs);
  const istDayOfWeek = istNow.getDay(); // 0=Sun
  const mondayOffset = istDayOfWeek === 0 ? -6 : 1 - istDayOfWeek;
  const weekStart = new Date(todayStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ─── Common queries for ALL users ──────────────────────────────
  const [
    todayTasks,
    upcomingTasks,
    backlogTasks,
    inProgressTasks,
    inReviewTasks,
    recentlyCompleted,
    totalTasksCompleted,
    totalTasksAssigned,
    unreadNotifications,
    recentNotifications,
    tasksCompletedThisWeek,
    tasksCompletedLastWeek,
    last30CompletedTasks,
    overdueCount,
    thisWeekCompletedTasks,
    completedTasksForStreak,
  ] = await Promise.all([
    // todayTasks
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { gte: todayStart, lt: tomorrowStart },
        status: { not: "COMPLETED" },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { priority: "desc" },
    }),
    // upcomingTasks (next 7 days, not today)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { gte: tomorrowStart, lt: next7Days },
        status: { not: "COMPLETED" },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    // backlogTasks (overdue)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { lt: todayStart },
        status: { not: "COMPLETED" },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    // inProgressTasks
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "IN_PROGRESS",
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // inReviewTasks
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "IN_REVIEW",
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // recentlyCompleted (last 7 days)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
        updatedAt: { gte: sevenDaysAgo },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    // totalTasksCompleted (all time)
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
      },
    }),
    // totalTasksAssigned
    prisma.task.count({
      where: { assigneeId: userId },
    }),
    // unreadNotifications
    prisma.notification.count({
      where: { userId, read: false },
    }),
    // recentNotifications
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // tasksCompletedThisWeek
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    // tasksCompletedLastWeek
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
        updatedAt: { gte: lastWeekStart, lt: weekStart },
      },
    }),
    // last30CompletedTasks (for avg completion time and on-time rate)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
      },
      select: {
        createdAt: true,
        updatedAt: true,
        dueDate: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    // overdueCount
    prisma.task.count({
      where: {
        assigneeId: userId,
        dueDate: { lt: todayStart },
        status: { not: "COMPLETED" },
      },
    }),
    // thisWeekCompletedTasks (for weekly trend, with updatedAt)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
        updatedAt: { gte: weekStart, lt: weekEnd },
      },
      select: { updatedAt: true },
    }),
    // completedTasksForStreak (last 90 days of completed tasks, for streak calc)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: "COMPLETED",
        updatedAt: {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // ─── Compute KPI metrics ──────────────────────────────────────
  const avgCompletionTimeDays =
    last30CompletedTasks.length > 0
      ? Math.round(
          (last30CompletedTasks.reduce((sum, t) => {
            const diffMs = t.updatedAt.getTime() - t.createdAt.getTime();
            return sum + diffMs / (1000 * 60 * 60 * 24);
          }, 0) /
            last30CompletedTasks.length) *
            10
        ) / 10
      : 0;

  const tasksWithDueDate = last30CompletedTasks.filter((t) => t.dueDate !== null);
  const onTimeCount = tasksWithDueDate.filter(
    (t) => t.updatedAt <= new Date(t.dueDate!.getTime() + 24 * 60 * 60 * 1000)
  ).length;
  const onTimeCompletionRate =
    tasksWithDueDate.length > 0
      ? Math.round((onTimeCount / tasksWithDueDate.length) * 100 * 10) / 10
      : 0;

  // Weekly trend (Mon-Sun)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyTrend = dayLabels.map((day, idx) => {
    const dayStart = new Date(weekStart.getTime() + idx * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const completed = thisWeekCompletedTasks.filter(
      (t) => t.updatedAt >= dayStart && t.updatedAt < dayEnd
    ).length;
    return { day, completed };
  });

  // Streak calculation (consecutive days from yesterday going back)
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const completedDateSet = new Set<string>();
  for (const t of completedTasksForStreak) {
    const d = new Date(t.updatedAt.getTime() + istOffsetMs);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    completedDateSet.add(key);
  }
  let streakDays = 0;
  let checkDate = yesterday;
  while (true) {
    const cd = new Date(checkDate.getTime() + istOffsetMs);
    const key = `${cd.getFullYear()}-${cd.getMonth()}-${cd.getDate()}`;
    if (completedDateSet.has(key)) {
      streakDays++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  const taskCompletionRate =
    totalTasksAssigned > 0
      ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100 * 10) / 10
      : 0;

  // ─── Additional common queries ───────────────────────────────
  const [
    upcomingEvents,
    activityNotifications,
    overdueTasks,
    todayLeaves,
    allTodoCount,
    allInProgressCount,
    allInReviewCount,
    allCompletedCount,
  ] = await Promise.all([
    // Next 3 upcoming calendar events for this user
    prisma.calendarEvent.findMany({
      where: {
        createdById: userId,
        startDate: { gte: now },
      },
      orderBy: { startDate: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        color: true,
        calendarType: true,
      },
    }),
    // Activity feed: recent workspace notifications (last 7 days)
    prisma.notification.findMany({
      where: {
        user: { workspaceId },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        type: true,
        message: true,
        read: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    // Overdue tasks (full objects for deadline alerts)
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { lt: todayStart },
        status: { not: "COMPLETED" },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Who's on leave today (approved leaves overlapping today)
    prisma.leaveRequest.findMany({
      where: {
        employee: { workspaceId },
        status: "APPROVED",
        startDate: { lte: tomorrowStart },
        endDate: { gte: todayStart },
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
        },
      },
    }),
    // Pipeline counts for current user's tasks
    prisma.task.count({
      where: { assigneeId: userId, status: "TODO" },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: "IN_PROGRESS" },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: "IN_REVIEW" },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: "COMPLETED" },
    }),
  ]);

  // ─── Base response for ALL roles ────────────────────────────────
  const data: Record<string, unknown> = {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
    },
    roleGroup,
    greeting: getISTGreeting(),
    todayDate: formatISTDate(),
    motivationalQuote: getRandomQuote(),
    todayTasks,
    upcomingTasks,
    backlogTasks,
    inProgressTasks,
    inReviewTasks,
    recentlyCompleted,
    totalTasksCompleted,
    totalTasksAssigned,
    taskCompletionRate,
    unreadNotifications,
    recentNotifications,
    streakDays,
    kpiMetrics: {
      tasksCompletedThisWeek,
      tasksCompletedLastWeek,
      avgCompletionTimeDays,
      onTimeCompletionRate,
      overdueCount,
      weeklyTrend,
    },
    upcomingEvents,
    activityFeed: activityNotifications,
    overdueTasks,
    todayLeaves,
    taskPipeline: {
      todo: allTodoCount,
      inProgress: allInProgressCount,
      inReview: allInReviewCount,
      completed: allCompletedCount,
    },
  };

  // ─── EXECUTIVE: CEO / CTO / ADMIN ─────────────────────────────
  if (roleGroup === "executive") {
    const sixMonthsAgo = new Date(todayStart);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      totalMembers,
      activeProjects,
      totalTasks,
      completedTasks,
      revenueAgg,
      expenseAgg,
      todoCount,
      inProgressCount,
      inReviewCount,
      completedCount,
      overdueTasksCount,
      revenueInvoices,
      recentExpenses,
      teamMembersWithStats,
      clientCount,
      leadPipeline,
      payrollAgg,
      recentActivityAll,
    ] = await Promise.all([
      prisma.user.count({ where: { workspaceId } }),
      prisma.project.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.task.count({ where: { project: { workspaceId } } }),
      prisma.task.count({
        where: { project: { workspaceId }, status: "COMPLETED" },
      }),
      prisma.invoice.aggregate({
        where: { createdBy: { workspaceId }, status: "PAID" },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: {
          submitter: { workspaceId },
          status: { in: ["APPROVED", "REIMBURSED"] },
        },
        _sum: { amount: true },
      }),
      prisma.task.count({
        where: { project: { workspaceId }, status: "TODO" },
      }),
      prisma.task.count({
        where: { project: { workspaceId }, status: "IN_PROGRESS" },
      }),
      prisma.task.count({
        where: { project: { workspaceId }, status: "IN_REVIEW" },
      }),
      prisma.task.count({
        where: { project: { workspaceId }, status: "COMPLETED" },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          dueDate: { lt: todayStart },
          status: { not: "COMPLETED" },
        },
      }),
      prisma.invoice.findMany({
        where: {
          createdBy: { workspaceId },
          status: "PAID",
          paidOn: { gte: sixMonthsAgo },
        },
        select: { total: true, paidOn: true },
      }),
      prisma.expense.findMany({
        where: {
          submitter: { workspaceId },
          status: { in: ["APPROVED", "REIMBURSED"] },
          expenseDate: { gte: sixMonthsAgo },
        },
        select: { amount: true, expenseDate: true },
      }),
      prisma.user.findMany({
        where: { workspaceId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          _count: {
            select: {
              tasks: { where: { status: "COMPLETED" } },
            },
          },
        },
        orderBy: { firstName: "asc" },
      }),
      // Client count
      prisma.client.count({ where: { workspaceId } }),
      // Lead pipeline values grouped by status
      prisma.lead.groupBy({
        by: ["status"],
        where: { workspaceId },
        _sum: { value: true },
        _count: { id: true },
      }),
      // Payroll summary (current month or latest)
      prisma.payroll.aggregate({
        where: {
          employee: { workspaceId },
          status: "PAID",
        },
        _sum: { totalPay: true },
        _count: { id: true },
      }),
      // Recent activity across workspace (all types)
      prisma.notification.findMany({
        where: {
          user: { workspaceId },
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
    ]);

    // Build revenue vs expenses chart (last 6 months)
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const revenueByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      revenueByMonth[key] = 0;
      expenseByMonth[key] = 0;
    }

    for (const inv of revenueInvoices) {
      if (inv.paidOn) {
        const d = new Date(inv.paidOn);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (key in revenueByMonth) {
          revenueByMonth[key] += inv.total;
        }
      }
    }

    for (const exp of recentExpenses) {
      const d = new Date(exp.expenseDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (key in expenseByMonth) {
        expenseByMonth[key] += exp.amount;
      }
    }

    const revenueVsExpenses = Object.keys(revenueByMonth).map((month) => ({
      month: month.split(" ")[0],
      revenue: revenueByMonth[month],
      expenses: expenseByMonth[month],
    }));

    // Task status distribution
    const taskStatusDistribution = [
      { name: "To Do", value: todoCount, color: "#64748b" },
      { name: "In Progress", value: inProgressCount, color: "#3b82f6" },
      { name: "In Review", value: inReviewCount, color: "#f59e0b" },
      { name: "Completed", value: completedCount, color: "#10b981" },
      { name: "Overdue", value: overdueTasksCount, color: "#ef4444" },
    ].filter((s) => s.value > 0);

    // Team performance
    const teamMemberIds = teamMembersWithStats.map((m) => m.id);
    const totalTasksByUser = await prisma.task.groupBy({
      by: ["assigneeId"],
      where: { assigneeId: { in: teamMemberIds } },
      _count: { id: true },
    });
    const totalTasksMap: Record<string, number> = {};
    for (const entry of totalTasksByUser) {
      if (entry.assigneeId) {
        totalTasksMap[entry.assigneeId] = entry._count.id;
      }
    }

    const teamPerformance = teamMembersWithStats
      .map((m) => {
        const completedTaskCount = m._count.tasks;
        const totalTaskCount = totalTasksMap[m.id] || 0;
        return {
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          avatar: m.avatar,
          role: m.role,
          completedTasks: completedTaskCount,
          totalTasks: totalTaskCount,
          completionRate:
            totalTaskCount > 0
              ? Math.round((completedTaskCount / totalTaskCount) * 100 * 10) / 10
              : 0,
        };
      })
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10);

    // Lead pipeline formatted
    const leadPipelineFormatted = leadPipeline.map((lp) => ({
      status: lp.status,
      count: lp._count.id,
      totalValue: lp._sum.value || 0,
    }));

    data.teamStats = {
      totalMembers,
      activeProjects,
      totalTasks,
      completedTasks,
      revenue: revenueAgg._sum.total || 0,
      expenses: expenseAgg._sum.amount || 0,
      clientCount,
      payrollTotal: payrollAgg._sum.totalPay || 0,
      payrollCount: payrollAgg._count.id,
    };
    // Flat stat card fields (consumed by frontend Dashboard.tsx)
    data.totalTeam = totalMembers;
    data.activeProjects = activeProjects;
    data.openTasks = todoCount + inProgressCount + inReviewCount;
    data.revenue = revenueAgg._sum.total || 0;
    data.pendingLeaves = (await prisma.leaveRequest.count({
      where: { employee: { workspaceId }, status: "PENDING" },
    }));
    data.expensesThisMonth = expenseAgg._sum.amount || 0;
    data.revenueVsExpenses = revenueVsExpenses;
    data.taskStatusDistribution = taskStatusDistribution;
    data.teamPerformance = teamPerformance;
    data.leadPipeline = leadPipelineFormatted;
    data.recentActivityAll = recentActivityAll;
  }

  // ─── FINANCE: CFO / ACCOUNTING ────────────────────────────────
  if (roleGroup === "finance") {
    const sixMonthsAgo = new Date(todayStart);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const currentMonth = istNow.getMonth() + 1;
    const currentYear = istNow.getFullYear();

    const [
      revenueAgg,
      expenseAgg,
      payrollThisMonth,
      payrollAllTime,
      invoiceStats,
      revenueInvoices,
      recentExpensesData,
      pendingExpenseApprovals,
      overdueInvoices,
      cashFlowInvoices,
      cashFlowExpenses,
    ] = await Promise.all([
      // Total revenue (paid invoices)
      prisma.invoice.aggregate({
        where: { createdBy: { workspaceId }, status: "PAID" },
        _sum: { total: true },
      }),
      // Total expenses (approved/reimbursed)
      prisma.expense.aggregate({
        where: {
          submitter: { workspaceId },
          status: { in: ["APPROVED", "REIMBURSED"] },
        },
        _sum: { amount: true },
      }),
      // Payroll this month
      prisma.payroll.aggregate({
        where: {
          employee: { workspaceId },
          month: currentMonth,
          year: currentYear,
        },
        _sum: { totalPay: true },
        _count: { id: true },
      }),
      // Payroll all time paid
      prisma.payroll.aggregate({
        where: {
          employee: { workspaceId },
          status: "PAID",
        },
        _sum: { totalPay: true },
      }),
      // Invoice stats by status
      prisma.invoice.groupBy({
        by: ["status"],
        where: { createdBy: { workspaceId } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Revenue invoices for chart (last 6 months)
      prisma.invoice.findMany({
        where: {
          createdBy: { workspaceId },
          status: "PAID",
          paidOn: { gte: sixMonthsAgo },
        },
        select: { total: true, paidOn: true },
      }),
      // Recent expenses for chart
      prisma.expense.findMany({
        where: {
          submitter: { workspaceId },
          status: { in: ["APPROVED", "REIMBURSED"] },
          expenseDate: { gte: sixMonthsAgo },
        },
        select: { amount: true, expenseDate: true, category: true },
      }),
      // Pending expense approvals
      prisma.expense.count({
        where: {
          submitter: { workspaceId },
          status: "SUBMITTED",
        },
      }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: {
          createdBy: { workspaceId },
          status: "OVERDUE",
        },
        select: {
          id: true,
          invoiceNumber: true,
          clientName: true,
          total: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      // Cash flow: paid invoices last 6 months
      prisma.invoice.findMany({
        where: {
          createdBy: { workspaceId },
          status: "PAID",
          paidOn: { gte: sixMonthsAgo },
        },
        select: { total: true, paidOn: true },
      }),
      // Cash flow: expenses last 6 months
      prisma.expense.findMany({
        where: {
          submitter: { workspaceId },
          status: { in: ["APPROVED", "REIMBURSED"] },
          expenseDate: { gte: sixMonthsAgo },
        },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    // Build cash flow chart (monthly inflow vs outflow)
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const inflowByMonth: Record<string, number> = {};
    const outflowByMonth: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      inflowByMonth[key] = 0;
      outflowByMonth[key] = 0;
    }

    for (const inv of cashFlowInvoices) {
      if (inv.paidOn) {
        const d = new Date(inv.paidOn);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (key in inflowByMonth) inflowByMonth[key] += inv.total;
      }
    }

    for (const exp of cashFlowExpenses) {
      const d = new Date(exp.expenseDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (key in outflowByMonth) outflowByMonth[key] += exp.amount;
    }

    const cashFlow = Object.keys(inflowByMonth).map((month) => ({
      month: month.split(" ")[0],
      inflow: inflowByMonth[month],
      outflow: outflowByMonth[month],
      net: inflowByMonth[month] - outflowByMonth[month],
    }));

    // Expense by category
    const expenseByCategory: Record<string, number> = {};
    for (const exp of recentExpensesData) {
      expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount;
    }

    const invoiceStatsFormatted = invoiceStats.map((is) => ({
      status: is.status,
      count: is._count.id,
      totalAmount: is._sum.total || 0,
    }));

    data.financeStats = {
      totalRevenue: revenueAgg._sum.total || 0,
      totalExpenses: expenseAgg._sum.amount || 0,
      netProfit: (revenueAgg._sum.total || 0) - (expenseAgg._sum.amount || 0),
      payrollThisMonth: payrollThisMonth._sum.totalPay || 0,
      payrollThisMonthCount: payrollThisMonth._count.id,
      payrollAllTimePaid: payrollAllTime._sum.totalPay || 0,
      pendingExpenseApprovals,
    };
    data.invoiceStats = invoiceStatsFormatted;
    data.overdueInvoices = overdueInvoices;
    data.cashFlow = cashFlow;
    data.expenseByCategory = Object.entries(expenseByCategory).map(([category, amount]) => ({
      category,
      amount,
    }));
  }

  // ─── HR ───────────────────────────────────────────────────────
  if (roleGroup === "hr") {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      headcount,
      employeesByRole,
      employeesByDepartment,
      pendingLeaves,
      openPositions,
      recentHires,
      complaintsOpen,
      complaintsTotal,
      documentsPending,
      documentsUnderReview,
    ] = await Promise.all([
      prisma.user.count({ where: { workspaceId } }),
      // Employees grouped by role
      prisma.user.groupBy({
        by: ["role"],
        where: { workspaceId },
        _count: { id: true },
      }),
      // Employees grouped by department
      prisma.user.groupBy({
        by: ["department"],
        where: { workspaceId },
        _count: { id: true },
      }),
      // Pending leave requests
      prisma.leaveRequest.count({
        where: {
          employee: { workspaceId },
          status: "PENDING",
        },
      }),
      // Open job positions
      prisma.jobPosting.count({
        where: {
          createdBy: { workspaceId },
          status: "OPEN",
        },
      }),
      // Recent hires (joined in last 90 days)
      prisma.user.findMany({
        where: {
          workspaceId,
          joinDate: { gte: ninetyDaysAgo },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          joinDate: true,
          avatar: true,
        },
        orderBy: { joinDate: "desc" },
        take: 10,
      }),
      // Open complaints count
      prisma.complaint.count({
        where: {
          workspaceId,
          status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] },
        },
      }),
      // Total complaints
      prisma.complaint.count({
        where: { workspaceId },
      }),
      // Documents pending verification
      prisma.employeeDocument.count({
        where: {
          employee: { workspaceId },
          status: "PENDING",
        },
      }),
      // Documents under review
      prisma.employeeDocument.count({
        where: {
          employee: { workspaceId },
          status: "UNDER_REVIEW",
        },
      }),
    ]);

    const employeesByRoleFormatted = employeesByRole.map((er) => ({
      role: er.role,
      count: er._count.id,
    }));

    const employeesByDepartmentFormatted = employeesByDepartment
      .filter((ed) => ed.department !== null)
      .map((ed) => ({
        department: ed.department,
        count: ed._count.id,
      }));

    data.hrStats = {
      headcount,
      pendingLeaves,
      openPositions,
      complaintsOpen,
      complaintsTotal,
      documentsPending,
      documentsUnderReview,
    };
    data.employeesByRole = employeesByRoleFormatted;
    data.employeesByDepartment = employeesByDepartmentFormatted;
    data.recentHires = recentHires;
  }

  // ─── PRODUCT_OWNER ────────────────────────────────────────────
  if (roleGroup === "product") {
    const [
      projectsByStatus,
      allProjectTasks,
      allProjectTasksCompleted,
      clientEngagement,
      leadPipeline,
      teamVelocityThisWeek,
      teamVelocityLastWeek,
      myProjects,
    ] = await Promise.all([
      // Projects grouped by status
      prisma.project.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { id: true },
      }),
      // Total tasks across workspace projects
      prisma.task.count({
        where: { project: { workspaceId } },
      }),
      // Completed tasks across workspace projects
      prisma.task.count({
        where: { project: { workspaceId }, status: "COMPLETED" },
      }),
      // Client engagement: recent clients with activity
      prisma.client.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          company: true,
          _count: {
            select: {
              leads: true,
              invoices: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      // Lead pipeline
      prisma.lead.groupBy({
        by: ["status"],
        where: { workspaceId },
        _sum: { value: true },
        _count: { id: true },
      }),
      // Team velocity: tasks completed this week (all workspace)
      prisma.task.count({
        where: {
          project: { workspaceId },
          status: "COMPLETED",
          updatedAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      // Team velocity: tasks completed last week (all workspace)
      prisma.task.count({
        where: {
          project: { workspaceId },
          status: "COMPLETED",
          updatedAt: { gte: lastWeekStart, lt: weekStart },
        },
      }),
      // Projects managed by this user
      prisma.project.findMany({
        where: { managerId: userId },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          dueDate: true,
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const projectsByStatusFormatted = projectsByStatus.map((ps) => ({
      status: ps.status,
      count: ps._count.id,
    }));

    const leadPipelineFormatted = leadPipeline.map((lp) => ({
      status: lp.status,
      count: lp._count.id,
      totalValue: lp._sum.value || 0,
    }));

    const overallTaskCompletionRate =
      allProjectTasks > 0
        ? Math.round((allProjectTasksCompleted / allProjectTasks) * 100 * 10) / 10
        : 0;

    data.productStats = {
      overallTaskCompletionRate,
      totalProjects: projectsByStatus.reduce((s, p) => s + p._count.id, 0),
      totalTasks: allProjectTasks,
      completedTasks: allProjectTasksCompleted,
      teamVelocityThisWeek,
      teamVelocityLastWeek,
      velocityChange:
        teamVelocityLastWeek > 0
          ? Math.round(
              ((teamVelocityThisWeek - teamVelocityLastWeek) / teamVelocityLastWeek) * 100 * 10
            ) / 10
          : 0,
    };
    data.projectsByStatus = projectsByStatusFormatted;
    data.clientEngagement = clientEngagement;
    data.leadPipeline = leadPipelineFormatted;
    data.myProjects = myProjects;
  }

  // ─── DEVELOPER: SR_DEVELOPER / JR_DEVELOPER ───────────────────
  if (roleGroup === "developer") {
    const [
      myTasksByStatus,
      myTimeThisWeek,
      myUpcomingDeadlines,
      myProjects,
    ] = await Promise.all([
      // My tasks grouped by status
      prisma.task.groupBy({
        by: ["status"],
        where: { assigneeId: userId },
        _count: { id: true },
      }),
      // Time tracked this week
      prisma.timeEntry.aggregate({
        where: {
          userId,
          startTime: { gte: weekStart, lt: weekEnd },
        },
        _sum: { duration: true },
        _count: { id: true },
      }),
      // Upcoming deadlines (next 14 days)
      prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { not: "COMPLETED" },
          dueDate: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      // Projects I'm assigned to (via tasks)
      prisma.project.findMany({
        where: {
          tasks: { some: { assigneeId: userId } },
        },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          _count: {
            select: {
              tasks: { where: { assigneeId: userId } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const myTasksByStatusFormatted = myTasksByStatus.map((ts) => ({
      status: ts.status,
      count: ts._count.id,
    }));

    data.devStats = {
      myTasksByStatus: myTasksByStatusFormatted,
      timeTrackedThisWeekMinutes: myTimeThisWeek._sum.duration || 0,
      timeEntriesThisWeek: myTimeThisWeek._count.id,
    };
    data.myUpcomingDeadlines = myUpcomingDeadlines;
    data.myProjects = myProjects;
  }

  // ─── CONTENT: EDITOR / GRAPHIC_DESIGNER / CONTENT_STRATEGIST ──
  if (roleGroup === "content") {
    const [
      myTasksByStatus,
      myRecentFiles,
      myDocsActivity,
    ] = await Promise.all([
      // My tasks grouped by status
      prisma.task.groupBy({
        by: ["status"],
        where: { assigneeId: userId },
        _count: { id: true },
      }),
      // Recent files uploaded by me
      prisma.file.findMany({
        where: { uploadedById: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          fileType: true,
          size: true,
          createdAt: true,
        },
      }),
      // Recent docs activity (created or updated by me)
      prisma.doc.findMany({
        where: { createdById: userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          icon: true,
          updatedAt: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    const myTasksByStatusFormatted = myTasksByStatus.map((ts) => ({
      status: ts.status,
      count: ts._count.id,
    }));

    data.contentStats = {
      myTasksByStatus: myTasksByStatusFormatted,
    };
    data.myRecentFiles = myRecentFiles;
    data.myDocsActivity = myDocsActivity;
  }

  // ─── CLIENT: BRAND_FACE / BRAND_PARTNER ───────────────────────
  if (roleGroup === "client") {
    const [
      myClients,
      myLeads,
      upcomingMeetings,
    ] = await Promise.all([
      // Clients created by me
      prisma.client.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          industry: true,
          _count: {
            select: {
              leads: true,
              invoices: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
      // Leads assigned to me
      prisma.lead.findMany({
        where: { assigneeId: userId },
        select: {
          id: true,
          title: true,
          value: true,
          status: true,
          nextFollowUp: true,
          client: { select: { id: true, name: true, company: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
      // Upcoming meetings/events
      prisma.calendarEvent.findMany({
        where: {
          createdById: userId,
          startDate: { gte: now },
        },
        orderBy: { startDate: "asc" },
        take: 10,
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          color: true,
          calendarType: true,
        },
      }),
    ]);

    // Lead stats summary
    const leadsByStatus: Record<string, { count: number; totalValue: number }> = {};
    for (const lead of myLeads) {
      if (!leadsByStatus[lead.status]) {
        leadsByStatus[lead.status] = { count: 0, totalValue: 0 };
      }
      leadsByStatus[lead.status].count++;
      leadsByStatus[lead.status].totalValue += lead.value || 0;
    }

    data.clientStats = {
      totalClients: myClients.length,
      totalLeads: myLeads.length,
      leadsByStatus: Object.entries(leadsByStatus).map(([status, vals]) => ({
        status,
        ...vals,
      })),
    };
    data.myClients = myClients;
    data.myLeads = myLeads;
    data.upcomingMeetings = upcomingMeetings;
  }

  // ─── MINIMAL: GUY / OFFICE_BOY ───────────────────────────────
  // These roles already get base data (todayTasks, upcomingEvents, etc.)
  // Just add a focused calendar view
  if (roleGroup === "minimal") {
    const myCalendarToday = await prisma.calendarEvent.findMany({
      where: {
        createdById: userId,
        startDate: { gte: todayStart, lt: tomorrowStart },
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        color: true,
        calendarType: true,
      },
    });

    const upcomingCalendarEvents = await prisma.calendarEvent.findMany({
      where: {
        createdById: userId,
        startDate: { gte: tomorrowStart },
      },
      orderBy: { startDate: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        color: true,
        calendarType: true,
      },
    });

    data.myCalendarToday = myCalendarToday;
    data.upcomingCalendarEvents = upcomingCalendarEvents;
  }

  return jsonOk({ success: true, data });
});
