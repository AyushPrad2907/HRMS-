import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/teacher-reports — HR: all; Teacher: own
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const viewAll = hasPermission(session, "report:view_all");
  const where: Record<string, unknown> = { deletedAt: null };
  if (!viewAll) where.employeeId = session.employeeId;
  if (from || to) {
    const range: Record<string, unknown> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.reportDate = range;
  }

  const items = await db.teacherReport.findMany({
    where,
    include: {
      employee: { include: { user: { include: { profile: true } }, department: true } },
      classes: true,
    },
    orderBy: { reportDate: "desc" },
    take: 200,
  });

  return NextResponse.json({
    canSubmit: hasPermission(session, "report:submit_teacher"),
    items: items.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employee: r.employee.user.profile?.displayName ?? r.employee.user.email,
      code: r.employee.employeeCode,
      department: r.employee.department.name,
      reportDate: r.reportDate,
      submittedAt: r.submittedAt,
      notes: r.notes,
      classes: r.classes.map((c) => ({
        id: c.id,
        batch: c.batch,
        subject: c.subject,
        topicsCovered: c.topicsCovered,
        studentsAttended: c.studentsAttended,
        assignmentsChecked: c.assignmentsChecked,
      })),
    })),
  });
}

// POST /api/teacher-reports — submit daily report (with classes array)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "report:submit_teacher"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { reportDate, notes, classes } = body;
  if (!reportDate || !Array.isArray(classes) || classes.length === 0) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const date = new Date(reportDate);
  date.setHours(0, 0, 0, 0);

  const existing = await db.teacherReport.findUnique({
    where: { employeeId_reportDate: { employeeId: session.employeeId, reportDate: date } },
  });
  if (existing) return NextResponse.json({ error: "report already submitted for this date" }, { status: 409 });

  const tr = await db.teacherReport.create({
    data: {
      employeeId: session.employeeId,
      reportDate: date,
      notes: notes ?? null,
      classes: {
        create: classes.map((c: { batch: string; subject: string; topicsCovered: string; studentsAttended: number; assignmentsChecked: boolean }) => ({
          batch: c.batch,
          subject: c.subject,
          topicsCovered: c.topicsCovered,
          studentsAttended: Number(c.studentsAttended) || 0,
          assignmentsChecked: !!c.assignmentsChecked,
        })),
      },
    },
    include: { classes: true },
  });
  return NextResponse.json(tr, { status: 201 });
}
