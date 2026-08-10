import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/leave — HR: all (filterable), others: own
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const viewAll = hasPermission(session, "leave:approve");

  const where: Record<string, unknown> = {};
  if (!viewAll) where.employeeId = session.employeeId;
  if (status) where.status = status;

  const items = await db.leaveRequest.findMany({
    where,
    include: {
      employee: { include: { user: { include: { profile: true } }, department: true } },
      approver: { include: { user: { include: { profile: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    canApprove: viewAll,
    items: items.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employee: l.employee.user.profile?.displayName ?? l.employee.user.email,
      code: l.employee.employeeCode,
      department: l.employee.department.name,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days:
        Math.round(
          (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000,
        ) + 1,
      reason: l.reason,
      status: l.status,
      approver: l.approver?.user?.profile?.displayName ?? null,
      decidedAt: l.decidedAt,
      createdAt: l.createdAt,
      attachmentPath: l.attachmentPath,
    })),
  });
}

// POST /api/leave — request leave
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "leave:request"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { leaveType, startDate, endDate, reason, attachmentPath } = body;
  if (!leaveType || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (e < s) return NextResponse.json({ error: "end before start" }, { status: 400 });

  const lr = await db.leaveRequest.create({
    data: {
      employeeId: session.employeeId,
      leaveType,
      startDate: s,
      endDate: e,
      reason,
      status: "pending",
      attachmentPath:
        typeof attachmentPath === "string" && attachmentPath.trim().length > 0
          ? attachmentPath.trim()
          : null,
    },
  });

  // Notify all HR (permission leave:approve). For demo, find HR employee.
  const hrEmps = await db.employee.findMany({
    where: {
      user: {
        userRoles: {
          some: {
            role: { rolePermissions: { some: { permission: { name: "leave:approve" } } } },
          },
        },
      },
    },
    include: { user: true },
  });
  for (const hr of hrEmps) {
    await db.notification.create({
      data: {
        userId: hr.userId,
        type: "leave.requested",
        title: "New leave request",
        body: `${session.displayName} requested ${leaveType} leave (${Math.round((e.getTime() - s.getTime()) / 86400000) + 1} day(s)).`,
        payload: JSON.stringify({ leaveRequestId: lr.id }),
      },
    });
  }
  return NextResponse.json({ id: lr.id }, { status: 201 });
}
