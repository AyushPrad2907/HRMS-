import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// PATCH /api/employees/[id] — update (HR: any, others: own profile fields only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const isOwn = id === session.employeeId;
  const canEditAny = hasPermission(session, "employee:edit");

  if (!isOwn && !canEditAny) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const emp = await db.employee.findUnique({ where: { id }, include: { user: { include: { profile: true } } } });
  if (!emp || emp.deletedAt) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { displayName, phone, bio, designation, departmentId, employmentStatus, roleId, reportingManagerId } = body;

  if (emp.user.profile && (displayName || phone || bio)) {
    await db.profile.update({
      where: { userId: emp.userId },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
      },
    });
  }

  const empUpdate: Record<string, unknown> = {};
  if (canEditAny) {
    if (designation) empUpdate.designation = designation;
    if (departmentId) empUpdate.departmentId = departmentId;
    if (employmentStatus) empUpdate.employmentStatus = employmentStatus;
    if (reportingManagerId !== undefined) empUpdate.reportingManagerId = reportingManagerId || null;
  }
  if (Object.keys(empUpdate).length) {
    await db.employee.update({ where: { id }, data: empUpdate });
  }

  if (canEditAny && roleId) {
    const existing = await db.userRole.findFirst({ where: { userId: emp.userId } });
    if (existing) {
      await db.userRole.update({ where: { id: existing.id }, data: { roleId } });
    } else {
      await db.userRole.create({ data: { userId: emp.userId, roleId } });
    }
  }

  if (canEditAny) {
    await db.auditLog.create({
      data: {
        actorId: session.employeeId,
        action: "employee.edit",
        targetTable: "employees",
        targetId: id,
        afterState: JSON.stringify(body),
        ipAddress: "10.0.0.?",
      },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/employees/[id] — soft delete (HR only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "employee:delete")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.employee.update({ where: { id }, data: { deletedAt: new Date(), employmentStatus: "offboarded" } });
  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "employee.delete",
      targetTable: "employees",
      targetId: id,
      ipAddress: "10.0.0.?",
    },
  });
  return NextResponse.json({ ok: true });
}
