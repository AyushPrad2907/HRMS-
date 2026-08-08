import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/attendance — HR: org grid (last 14 days), others: own history
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "14");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));

  const viewAll = hasPermission(session, "attendance:view_all");
  const where = { attendanceDate: { gte: start, lte: today } };
  if (!viewAll) (where as Record<string, unknown>).employeeId = session.employeeId;

  const records = await db.attendance.findMany({
    where,
    include: { employee: { include: { user: { include: { profile: true } }, department: true } } },
    orderBy: { attendanceDate: "desc" },
    take: 500,
  });

  return NextResponse.json({
    canOverride: hasPermission(session, "attendance:override"),
    items: records.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      employee: a.employee.user.profile?.displayName ?? a.employee.user.email,
      code: a.employee.employeeCode,
      department: a.employee.department.name,
      date: a.attendanceDate,
      status: a.status,
      checkIn: a.checkInAt,
      checkOut: a.checkOutAt,
      note: a.note,
    })),
  });
}

// POST /api/attendance — check-in / check-out / override
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const body = await req.json();
  const { action, employeeId, status, note } = body;
  const targetId = employeeId ?? session.employeeId;
  const isOwn = targetId === session.employeeId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (action === "check_in") {
    if (!isOwn && !hasPermission(session, "attendance:override"))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const existing = await db.attendance.findUnique({
      where: { employeeId_attendanceDate: { employeeId: targetId, attendanceDate: today } },
    });
    if (existing?.checkInAt) return NextResponse.json({ error: "already checked in" }, { status: 409 });
    const rec = await db.attendance.upsert({
      where: { employeeId_attendanceDate: { employeeId: targetId, attendanceDate: today } },
      update: { checkInAt: new Date(), status: status ?? "present", markedById: session.employeeId },
      create: { employeeId: targetId, attendanceDate: today, checkInAt: new Date(), status: status ?? "present", markedById: session.employeeId },
    });
    return NextResponse.json(rec);
  }
  if (action === "check_out") {
    if (!isOwn && !hasPermission(session, "attendance:override"))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const rec = await db.attendance.update({
      where: { employeeId_attendanceDate: { employeeId: targetId, attendanceDate: today } },
      data: { checkOutAt: new Date(), markedById: session.employeeId },
    });
    return NextResponse.json(rec);
  }
  if (action === "override") {
    if (!hasPermission(session, "attendance:override"))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const rec = await db.attendance.upsert({
      where: { employeeId_attendanceDate: { employeeId: targetId, attendanceDate: today } },
      update: { status, note: note ?? "HR override", markedById: session.employeeId },
      create: { employeeId: targetId, attendanceDate: today, status, note: note ?? "HR override", markedById: session.employeeId },
    });
    await db.auditLog.create({
      data: {
        actorId: session.employeeId,
        action: "attendance.override",
        targetTable: "attendance",
        targetId: rec.id,
        afterState: JSON.stringify({ status, note }),
        ipAddress: "10.0.0.?",
      },
    });
    return NextResponse.json(rec);
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
