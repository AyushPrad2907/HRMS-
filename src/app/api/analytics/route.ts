import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/analytics — org-wide aggregated analytics (HR-style).
// Requires the `analytics:view_org` permission.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "analytics:view_org"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Date window: last 14 days (inclusive of today).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 13);
  const endExclusive = new Date(today);
  endExclusive.setDate(today.getDate() + 1);

  // Pre-build 14-day bucket keys (oldest -> newest) in local YYYY-MM-DD form
  // so we always return a continuous trend even for days with no data.
  const dayBuckets: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayBuckets.push(formatDate(d));
  }

  const [
    attendanceRecords,
    teacherReports,
    marketingReports,
    leads,
    deals,
    employees,
    leaveRequests,
    teacherClasses,
    marketingCalls,
  ] = await Promise.all([
    db.attendance.findMany({
      where: { attendanceDate: { gte: start, lt: endExclusive } },
      select: { attendanceDate: true, status: true },
    }),
    db.teacherReport.findMany({
      where: { reportDate: { gte: start, lt: endExclusive }, deletedAt: null },
      select: { reportDate: true },
    }),
    db.marketingReport.findMany({
      where: { reportDate: { gte: start, lt: endExclusive }, deletedAt: null },
      select: { reportDate: true },
    }),
    db.marketingLead.findMany({
      where: { deletedAt: null },
      select: { status: true },
    }),
    db.marketingDeal.findMany({
      select: { stage: true, revenueAmount: true },
    }),
    db.employee.findMany({
      where: { deletedAt: null, employmentStatus: "active" },
      select: { department: { select: { name: true } } },
    }),
    db.leaveRequest.findMany({
      select: { status: true, leaveType: true },
    }),
    db.teacherClass.findMany({
      where: {
        teacherReport: { reportDate: { gte: start, lt: endExclusive }, deletedAt: null },
      },
      include: {
        teacherReport: {
          include: {
            employee: {
              include: { user: { include: { profile: true } } },
            },
          },
        },
      },
    }),
    db.marketingCall.findMany({
      where: {
        marketingReport: { reportDate: { gte: start, lt: endExclusive }, deletedAt: null },
      },
      include: {
        marketingReport: {
          include: {
            employee: {
              include: { user: { include: { profile: true } } },
            },
          },
        },
      },
    }),
  ]);

  // --- Attendance trend (14 days) ---
  const attMap = new Map<string, { present: number; absent: number; onLeave: number; halfDay: number }>();
  for (const d of dayBuckets) {
    attMap.set(d, { present: 0, absent: 0, onLeave: 0, halfDay: 0 });
  }
  for (const a of attendanceRecords) {
    const e = attMap.get(formatDate(a.attendanceDate));
    if (!e) continue;
    switch (a.status) {
      case "present": e.present += 1; break;
      case "absent": e.absent += 1; break;
      case "on_leave": e.onLeave += 1; break;
      case "half_day": e.halfDay += 1; break;
      default: break;
    }
  }
  const attendanceTrend = dayBuckets.map((date) => ({ date, ...attMap.get(date)! }));

  // --- Report trend (14 days) ---
  const reportMap = new Map<string, { teacherReports: number; marketingReports: number }>();
  for (const d of dayBuckets) {
    reportMap.set(d, { teacherReports: 0, marketingReports: 0 });
  }
  for (const r of teacherReports) {
    const e = reportMap.get(formatDate(r.reportDate));
    if (e) e.teacherReports += 1;
  }
  for (const r of marketingReports) {
    const e = reportMap.get(formatDate(r.reportDate));
    if (e) e.marketingReports += 1;
  }
  const reportTrend = dayBuckets.map((date) => ({ date, ...reportMap.get(date)! }));

  // --- Marketing funnel ---
  const byStatus = { new: 0, contacted: 0, qualified: 0, lost: 0, converted: 0 };
  for (const l of leads) {
    switch (l.status) {
      case "new": byStatus.new += 1; break;
      case "contacted": byStatus.contacted += 1; break;
      case "qualified": byStatus.qualified += 1; break;
      case "lost": byStatus.lost += 1; break;
      case "converted": byStatus.converted += 1; break;
      default: break;
    }
  }
  const dealsByStage = { prospecting: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 };
  let revenueWon = 0;
  let pipelineValue = 0;
  for (const d of deals) {
    switch (d.stage) {
      case "prospecting": dealsByStage.prospecting += 1; break;
      case "proposal": dealsByStage.proposal += 1; break;
      case "negotiation": dealsByStage.negotiation += 1; break;
      case "won": dealsByStage.won += 1; break;
      case "lost": dealsByStage.lost += 1; break;
      default: break;
    }
    if (d.stage === "won") revenueWon += d.revenueAmount;
    if (d.stage === "prospecting" || d.stage === "proposal" || d.stage === "negotiation") {
      pipelineValue += d.revenueAmount;
    }
  }
  const marketingFunnel = {
    byStatus,
    dealsByStage,
    revenueWon: Number(revenueWon),
    pipelineValue: Number(pipelineValue),
  };

  // --- Department headcount ---
  const deptMap = new Map<string, number>();
  for (const e of employees) {
    const name = e.department.name;
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
  }
  const departmentHeadcount = Array.from(deptMap.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // --- Top performers (last 14 days) ---
  type Performer = { employeeId: string; name: string; role: string; metric: number; metricLabel: string };
  const teacherMap = new Map<string, { name: string; metric: number }>();
  for (const tc of teacherClasses) {
    const emp = tc.teacherReport.employee;
    const name = emp.user.profile?.displayName ?? emp.user.email;
    const cur = teacherMap.get(emp.id) ?? { name, metric: 0 };
    cur.name = name;
    cur.metric += tc.studentsAttended;
    teacherMap.set(emp.id, cur);
  }
  const marketerMap = new Map<string, { name: string; metric: number }>();
  for (const mc of marketingCalls) {
    const emp = mc.marketingReport.employee;
    const name = emp.user.profile?.displayName ?? emp.user.email;
    const cur = marketerMap.get(emp.id) ?? { name, metric: 0 };
    cur.name = name;
    cur.metric += 1;
    marketerMap.set(emp.id, cur);
  }
  const teacherPerformers: Performer[] = Array.from(teacherMap.entries()).map(([employeeId, v]) => ({
    employeeId,
    name: v.name,
    role: "teacher",
    metric: v.metric,
    metricLabel: "Students Reached",
  }));
  const marketerPerformers: Performer[] = Array.from(marketerMap.entries()).map(([employeeId, v]) => ({
    employeeId,
    name: v.name,
    role: "marketing",
    metric: v.metric,
    metricLabel: "Calls Made",
  }));
  const topPerformers = [...teacherPerformers, ...marketerPerformers]
    .sort((a, b) => b.metric - a.metric)
    .slice(0, 5)
    .map((p) => ({ ...p, metric: Number(p.metric) }));

  // --- Leave stats ---
  const leaveStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    byType: { casual: 0, sick: 0, earned: 0, unpaid: 0 },
  };
  for (const l of leaveRequests) {
    switch (l.status) {
      case "pending": leaveStats.pending += 1; break;
      case "approved": leaveStats.approved += 1; break;
      case "rejected": leaveStats.rejected += 1; break;
      default: break;
    }
    switch (l.leaveType) {
      case "casual": leaveStats.byType.casual += 1; break;
      case "sick": leaveStats.byType.sick += 1; break;
      case "earned": leaveStats.byType.earned += 1; break;
      case "unpaid": leaveStats.byType.unpaid += 1; break;
      default: break;
    }
  }

  return NextResponse.json({
    attendanceTrend,
    reportTrend,
    marketingFunnel,
    departmentHeadcount,
    topPerformers,
    leaveStats,
  });
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
