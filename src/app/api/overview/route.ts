import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// GET /api/overview — role-aware dashboard KPIs
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (session.roles.includes("hr_admin")) {
    return NextResponse.json(await hrOverview(session, today));
  }
  if (session.roles.includes("teacher")) {
    return NextResponse.json(await teacherOverview(session, today));
  }
  if (session.roles.includes("marketing")) {
    return NextResponse.json(await marketingOverview(session, today));
  }
  return NextResponse.json({ error: "no role" }, { status: 403 });
}

async function hrOverview(_session: unknown, today: Date) {
  const [headcount, presentToday, pendingLeave, openTeacherReports, openMarketingReports, recentActivity] =
    await Promise.all([
      db.employee.count({ where: { deletedAt: null, employmentStatus: "active" } }),
      db.attendance.count({ where: { attendanceDate: today, status: "present" } }),
      db.leaveRequest.count({ where: { status: "pending" } }),
      db.teacherReport.count({ where: { deletedAt: null, reportDate: today } }),
      db.marketingReport.count({ where: { deletedAt: null, reportDate: today } }),
      db.activityLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { employee: { include: { user: { include: { profile: true } } } } } }),
    ]);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const presentYesterday = await db.attendance.count({ where: { attendanceDate: yesterday, status: "present" } });

  return {
    role: "hr_admin",
    kpis: [
      { label: "Headcount", value: headcount, delta: +2, hint: "vs last month" },
      { label: "Present Today", value: presentToday, delta: presentToday - presentYesterday, hint: "vs yesterday" },
      { label: "Pending Leave", value: pendingLeave, delta: 0, hint: "awaiting approval" },
      { label: "Reports Today", value: openTeacherReports + openMarketingReports, delta: 0, hint: "teacher + marketing" },
    ],
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      activity: a.activity,
      actor: a.employee?.user?.profile?.displayName ?? "System",
      meta: a.meta,
      at: a.createdAt,
    })),
  };
}

async function teacherOverview(session: { employeeId: string }, today: Date) {
  const todayReport = await db.teacherReport.findUnique({
    where: { employeeId_reportDate: { employeeId: session.employeeId, reportDate: today } },
    include: { classes: true },
  });
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const weekReports = await db.teacherReport.findMany({
    where: { employeeId: session.employeeId, reportDate: { gte: start, lte: today } },
    include: { classes: true },
  });
  const totalClasses = weekReports.reduce((s, r) => s + r.classes.length, 0);
  const totalStudents = weekReports.reduce(
    (s, r) => s + r.classes.reduce((c, cl) => c + cl.studentsAttended, 0),
    0,
  );
  const myLeave = await db.leaveRequest.count({
    where: { employeeId: session.employeeId, status: "pending" },
  });
  const attendanceToday = await db.attendance.findUnique({
    where: { employeeId_attendanceDate: { employeeId: session.employeeId, attendanceDate: today } },
  });
  return {
    role: "teacher",
    kpis: [
      { label: "Today's Classes", value: todayReport?.classes.length ?? 0, delta: 0, hint: todayReport ? "submitted" : "not yet" },
      { label: "Classes This Week", value: totalClasses, delta: 0, hint: "last 7 days" },
      { label: "Students Reached (wk)", value: totalStudents, delta: 0, hint: "last 7 days" },
      { label: "Pending Leave", value: myLeave, delta: 0, hint: "awaiting approval" },
    ],
    attendanceToday: attendanceToday
      ? { status: attendanceToday.status, checkIn: attendanceToday.checkInAt, checkOut: attendanceToday.checkOutAt }
      : null,
    hasTodayReport: !!todayReport,
  };
}

async function marketingOverview(session: { employeeId: string }, today: Date) {
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const [calls, meetings, leads, deals, pipelineValue, wonThisMonth] = await Promise.all([
    db.marketingCall.count({
      where: { marketingReport: { employeeId: session.employeeId, reportDate: { gte: start, lte: today } } },
    }),
    db.marketingMeeting.count({
      where: { marketingReport: { employeeId: session.employeeId, reportDate: { gte: start, lte: today } } },
    }),
    db.marketingLead.count({ where: { ownerEmployeeId: session.employeeId, deletedAt: null } }),
    db.marketingDeal.count({ where: { ownerEmployeeId: session.employeeId } }),
    db.marketingDeal.aggregate({
      where: { ownerEmployeeId: session.employeeId, stage: { in: ["prospecting", "proposal", "negotiation"] } },
      _sum: { revenueAmount: true },
    }),
    db.marketingDeal.aggregate({
      where: { ownerEmployeeId: session.employeeId, stage: "won", closedAt: { gte: start } },
      _sum: { revenueAmount: true },
    }),
  ]);
  return {
    role: "marketing",
    kpis: [
      { label: "Calls (7d)", value: calls, delta: 0, hint: "this week" },
      { label: "Meetings (7d)", value: meetings, delta: 0, hint: "this week" },
      { label: "Open Leads", value: leads, delta: 0, hint: "owned by you" },
      { label: "Pipeline Value", value: pipelineValue._sum.revenueAmount ?? 0, delta: 0, hint: "INR, open deals" },
    ],
    deals,
    wonThisMonth: wonThisMonth._sum.revenueAmount ?? 0,
  };
}
