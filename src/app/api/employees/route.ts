import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/employees — list (HR: all, others: own only)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const dept = url.searchParams.get("dept") ?? "";
  const status = url.searchParams.get("status") ?? "";

  const viewAll = hasPermission(session, "employee:view_all");
  const where: Record<string, unknown> = { deletedAt: null };
  if (!viewAll) where.id = session.employeeId;
  if (q) {
    where.OR = [
      { employeeCode: { contains: q } },
      { designation: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { profile: { displayName: { contains: q } } } },
    ];
  }
  if (dept) where.departmentId = dept;
  if (status) where.employmentStatus = status;

  const employees = await db.employee.findMany({
    where,
    include: {
      user: { include: { profile: true, userRoles: { include: { role: true } } } },
      department: true,
      reportingManager: { include: { user: { include: { profile: true } } } },
    },
    orderBy: { employeeCode: "asc" },
    take: 200,
  });

  return NextResponse.json({
    items: employees.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: e.user.profile?.displayName ?? e.user.email,
      email: e.user.email,
      phone: e.user.profile?.phone ?? null,
      bio: e.user.profile?.bio ?? null,
      avatarUrl: e.user.profile?.avatarUrl ?? null,
      designation: e.designation,
      department: e.department.name,
      departmentId: e.departmentId,
      employmentStatus: e.employmentStatus,
      joinDate: e.joinDate,
      manager: e.reportingManager?.user?.profile?.displayName ?? null,
      managerId: e.reportingManagerId,
      roles: e.user.userRoles.map((ur) => ({ name: ur.role.name, label: ur.role.label })),
      userId: e.userId,
    })),
    canCreate: hasPermission(session, "employee:create"),
    canEdit: hasPermission(session, "employee:edit"),
  });
}

// POST /api/employees — create (HR only)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "employee:create")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { displayName, email, employeeCode, departmentId, designation, roleId, joinDate, phone, bio } = body;
  if (!displayName || !email || !employeeCode || !departmentId || !designation || !roleId || !joinDate) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const existing = await db.employee.findUnique({ where: { employeeCode } });
  if (existing) return NextResponse.json({ error: "employee code already exists" }, { status: 409 });

  const user = await db.user.create({
    data: {
      email,
      passwordHash: "demo-hash-invite",
      emailVerified: new Date(),
      profile: { create: { displayName, phone, bio } },
    },
  });
  const emp = await db.employee.create({
    data: {
      userId: user.id,
      employeeCode,
      departmentId,
      designation,
      joinDate: new Date(joinDate),
      employmentStatus: "active",
    },
  });
  await db.userRole.create({ data: { userId: user.id, roleId } });

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "employee.create",
      targetTable: "employees",
      targetId: emp.id,
      afterState: JSON.stringify({ name: displayName, employeeCode, departmentId, designation }),
      ipAddress: "10.0.0.?",
    },
  });
  // Notify HR team / manager (simplified — notify the actor themselves for demo)
  await db.notification.create({
    data: {
      userId: session.userId,
      type: "employee.created",
      title: "Employee onboarded",
      body: `${displayName} (${employeeCode}) was added to ${designation}.`,
      payload: JSON.stringify({ employeeId: emp.id }),
    },
  });

  return NextResponse.json({ id: emp.id }, { status: 201 });
}
