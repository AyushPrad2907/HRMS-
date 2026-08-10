import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// PATCH /api/leave/[id] — approve/reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "leave:approve"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { decision } = body as { decision: "approved" | "rejected" };
  if (!["approved", "rejected"].includes(decision))
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });

  const lr = await db.leaveRequest.findUnique({ where: { id }, include: { employee: { include: { user: true } } } });
  if (!lr) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await db.leaveRequest.update({
    where: { id },
    data: { status: decision, approvedById: session.employeeId, decidedAt: new Date() },
  });

  await db.notification.create({
    data: {
      userId: lr.employee.userId,
      type: `leave.${decision}`,
      title: `Leave ${decision}`,
      body: `Your ${lr.leaveType} leave request was ${decision} by ${session.displayName}.`,
      payload: JSON.stringify({ leaveRequestId: id }),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: `leave.${decision}`,
      targetTable: "leave_requests",
      targetId: id,
      afterState: JSON.stringify({ status: decision }),
      ipAddress: "10.0.0.?",
    },
  });
  return NextResponse.json(updated);
}
