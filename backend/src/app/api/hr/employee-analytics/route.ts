import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

const HR_ROLES = ["CTO", "CEO", "ADMIN", "HR", "BRAND_FACE"];

// ── Personality Type Descriptions (brief) ────────────────────────────────

const TYPE_TITLES: Record<string, string> = {
  INTJ: "The Architect",
  INTP: "The Logician",
  ENTJ: "The Commander",
  ENTP: "The Debater",
  INFJ: "The Advocate",
  INFP: "The Mediator",
  ENFJ: "The Protagonist",
  ENFP: "The Campaigner",
  ISTJ: "The Inspector",
  ISFJ: "The Protector",
  ESTJ: "The Executive",
  ESFJ: "The Consul",
  ISTP: "The Virtuoso",
  ISFP: "The Adventurer",
  ESTP: "The Entrepreneur",
  ESFP: "The Entertainer",
};

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);
    if (!HR_ROLES.includes(user.role)) return jsonError("Access denied", 403);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (userId) {
      return await getSingleEmployee(userId, user.workspaceId);
    }

    return await getTeamOverview(user.workspaceId);
  } catch (err: unknown) {
    console.error("Employee analytics GET error:", err);
    return jsonError("Failed to fetch employee analytics", 500);
  }
}

// ── Single Employee Full Profile ──────────────────────────────────────────

async function getSingleEmployee(userId: string, workspaceId: string) {
  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      designation: true,
      department: true,
      salary: true,
      joinDate: true,
      phone: true,
      avatar: true,
      status: true,
      personalityType: true,
      personalityTestTaken: true,
      personalityTestDate: true,
      personalityTestData: true,
      behaviorScore: true,
      attendanceRate: true,
      taskCompletionRate: true,
      avgResponseTime: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  if (!employee) return jsonError("Employee not found", 404);

  // Complaints filed BY them
  const complaintsFiled = await prisma.complaint.findMany({
    where: { filedById: userId },
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      against: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Complaints filed AGAINST them
  const complaintsAgainst = await prisma.complaint.findMany({
    where: { againstId: userId },
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      subject: true,
      status: true,
      createdAt: true,
      filedBy: { select: { firstName: true, lastName: true } },
      isAnonymous: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Leave history
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: userId },
    select: {
      id: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const leavesByType: Record<string, number> = {};
  let totalLeavesTaken = 0;
  let pendingLeaves = 0;
  for (const leave of leaves) {
    if (leave.status === "APPROVED") {
      totalLeavesTaken++;
      leavesByType[leave.type] = (leavesByType[leave.type] || 0) + 1;
    }
    if (leave.status === "PENDING") pendingLeaves++;
  }

  // Expense history
  const expenses = await prisma.expense.findMany({
    where: { submitterId: userId },
    select: {
      id: true,
      title: true,
      amount: true,
      status: true,
      category: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let totalSubmitted = 0;
  let totalApproved = 0;
  let totalRejected = 0;
  for (const exp of expenses) {
    totalSubmitted += exp.amount;
    if (exp.status === "APPROVED" || exp.status === "REIMBURSED") totalApproved += exp.amount;
    if (exp.status === "REJECTED") totalRejected += exp.amount;
  }

  // Task performance
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let completedOnTime = 0;
  let completedLate = 0;
  let totalCompleted = 0;
  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      totalCompleted++;
      if (task.dueDate && task.updatedAt > task.dueDate) {
        completedLate++;
      } else {
        completedOnTime++;
      }
    }
  }

  // Time tracking summary (hours this month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      userId,
      startTime: { gte: startOfMonth },
    },
    select: { duration: true },
  });

  const hoursThisMonth = timeEntries.reduce((sum, te) => sum + (te.duration || 0), 0) / 60;

  // Personality type info
  const personalityInfo = employee.personalityType
    ? {
        type: employee.personalityType,
        title: TYPE_TITLES[employee.personalityType] || employee.personalityType,
        testDate: employee.personalityTestDate,
      }
    : null;

  return jsonOk({
    employee: {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      designation: employee.designation,
      department: employee.department,
      salary: employee.salary,
      joinDate: employee.joinDate,
      phone: employee.phone,
      avatar: employee.avatar,
      status: employee.status,
      lastActiveAt: employee.lastActiveAt,
      createdAt: employee.createdAt,
    },
    personality: personalityInfo,
    behavioralMetrics: {
      behaviorScore: employee.behaviorScore,
      attendanceRate: employee.attendanceRate,
      taskCompletionRate: employee.taskCompletionRate,
      avgResponseTime: employee.avgResponseTime,
    },
    complaints: {
      filed: { count: complaintsFiled.length, details: complaintsFiled },
      against: {
        count: complaintsAgainst.length,
        details: complaintsAgainst.map((c) => ({
          ...c,
          filedBy: c.isAnonymous ? { firstName: "Anonymous", lastName: "" } : c.filedBy,
        })),
      },
    },
    leaves: {
      totalTaken: totalLeavesTaken,
      pending: pendingLeaves,
      byType: leavesByType,
      history: leaves.slice(0, 10),
    },
    expenses: {
      totalSubmitted,
      totalApproved,
      totalRejected,
      recentExpenses: expenses.slice(0, 10),
    },
    taskPerformance: {
      totalAssigned: tasks.length,
      completed: totalCompleted,
      completedOnTime,
      completedLate,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      todo: tasks.filter((t) => t.status === "TODO").length,
    },
    timeTracking: {
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
      entriesThisMonth: timeEntries.length,
    },
  });
}

// ── Team Overview ─────────────────────────────────────────────────────────

async function getTeamOverview(workspaceId: string) {
  const employees = await prisma.user.findMany({
    where: { workspaceId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      designation: true,
      department: true,
      salary: true,
      personalityType: true,
      personalityTestTaken: true,
      behaviorScore: true,
      attendanceRate: true,
      taskCompletionRate: true,
      status: true,
      joinDate: true,
      avatar: true,
      _count: {
        select: {
          complaintsFiled: true,
          complaintsAgainst: true,
          leaveRequests: true,
          tasks: true,
        },
      },
    },
    orderBy: { firstName: "asc" },
  });

  // Personality type distribution
  const personalityDistribution: Record<string, number> = {};
  let testsTaken = 0;
  for (const emp of employees) {
    if (emp.personalityTestTaken && emp.personalityType) {
      testsTaken++;
      personalityDistribution[emp.personalityType] = (personalityDistribution[emp.personalityType] || 0) + 1;
    }
  }

  // Department breakdown
  const departmentBreakdown: Record<string, number> = {};
  for (const emp of employees) {
    const dept = emp.department || "Unassigned";
    departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
  }

  // Total salary
  const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);

  // Top and underperformers (by behaviorScore)
  const scored = employees
    .filter((e) => e.behaviorScore !== null && e.behaviorScore !== undefined)
    .sort((a, b) => (b.behaviorScore || 0) - (a.behaviorScore || 0));
  const topPerformers = scored.slice(0, 5).map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    role: e.role,
    department: e.department,
    behaviorScore: e.behaviorScore,
    personalityType: e.personalityType,
  }));
  const underperformers = scored
    .slice(-5)
    .reverse()
    .map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      role: e.role,
      department: e.department,
      behaviorScore: e.behaviorScore,
      personalityType: e.personalityType,
    }));

  // Leave utilization — count approved leaves per employee
  const leaveRequests = await prisma.leaveRequest.groupBy({
    by: ["employeeId"],
    where: { status: "APPROVED" },
    _count: { id: true },
  });
  const leaveMap: Record<string, number> = {};
  for (const lr of leaveRequests) {
    leaveMap[lr.employeeId] = lr._count.id;
  }

  // Build employee list
  const employeeList = employees.map((emp) => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    email: emp.email,
    role: emp.role,
    designation: emp.designation,
    department: emp.department,
    salary: emp.salary,
    personalityType: emp.personalityType,
    personalityTitle: emp.personalityType ? TYPE_TITLES[emp.personalityType] || emp.personalityType : null,
    personalityTestTaken: emp.personalityTestTaken,
    behaviorScore: emp.behaviorScore,
    attendanceRate: emp.attendanceRate,
    taskCompletionRate: emp.taskCompletionRate,
    status: emp.status,
    avatar: emp.avatar,
    complaintsFiled: emp._count.complaintsFiled,
    complaintsAgainst: emp._count.complaintsAgainst,
    leavesTaken: leaveMap[emp.id] || 0,
    totalTasks: emp._count.tasks,
  }));

  return jsonOk({
    totalEmployees: employees.length,
    testsTaken,
    testsRemaining: employees.length - testsTaken,
    totalSalary,
    personalityDistribution,
    departmentBreakdown,
    topPerformers,
    underperformers,
    employees: employeeList,
  });
}
