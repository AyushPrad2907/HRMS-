import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  resolveSessionForEmployee,
  sessionCookie,
} from "@/lib/auth/session";
import type { Candidate, SessionUser } from "@/lib/types";

// In production with Supabase, this maps to supabase.auth.signUp();
// the first HR signup bootstraps the org. Self-registration is HR-only;
// all other employees are created by HR via /api/employees.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const employeeCodeIn =
    typeof body.employeeCode === "string" && body.employeeCode.trim()
      ? body.employeeCode.trim()
      : undefined;
  const designation =
    typeof body.designation === "string" && body.designation.trim()
      ? body.designation.trim()
      : "HR Manager";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hrDept = await db.department.findUnique({ where: { code: "HR" } });
  if (!hrDept) {
    return NextResponse.json({ error: "HR department not seeded" }, { status: 500 });
  }
  const hrAdminRole = await db.role.findUnique({ where: { name: "hr_admin" } });
  if (!hrAdminRole) {
    return NextResponse.json({ error: "hr_admin role not seeded" }, { status: 500 });
  }

  // Auto-generate IMP-HR-<3-digit> if not provided.
  let employeeCode = employeeCodeIn;
  if (!employeeCode) {
    const hrCount = await db.employee.count({
      where: { employeeCode: { startsWith: "IMP-HR-" } },
    });
    employeeCode = `IMP-HR-${String(hrCount + 1).padStart(3, "0")}`;
  }

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        emailVerified: new Date(),
        profile: { create: { displayName: name } },
      },
    });
    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        employeeCode,
        departmentId: hrDept.id,
        designation,
        joinDate: new Date(),
        employmentStatus: "active",
      },
    });
    await tx.userRole.create({
      data: { userId: user.id, roleId: hrAdminRole.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: employee.id,
        action: "auth.signup",
        targetTable: "users",
        targetId: user.id,
        afterState: JSON.stringify({ email, employeeCode }),
      },
    });
    return { userId: user.id, employeeId: employee.id };
  });

  const sessionUser = await resolveSessionForEmployee(result.employeeId);
  if (!sessionUser) {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
  const candidates = await listCandidates();
  const res = NextResponse.json({
    user: sessionUser satisfies SessionUser,
    candidates: candidates satisfies Candidate[],
  });
  res.cookies.set(sessionCookie(result.employeeId));
  return res;
}

async function listCandidates(): Promise<Candidate[]> {
  const emps = await db.employee.findMany({
    where: { deletedAt: null, employmentStatus: "active" },
    include: {
      user: { include: { profile: true, userRoles: { include: { role: true } } } },
      department: true,
    },
    orderBy: { employeeCode: "asc" },
  });
  return emps.map((e) => ({
    employeeId: e.id,
    name: e.user.profile?.displayName ?? e.user.email,
    email: e.user.email,
    designation: e.designation,
    department: e.department.name,
    roles: e.user.userRoles.map((ur) => ur.role.name),
    avatarUrl: e.user.profile?.avatarUrl ?? null,
    employeeCode: e.employeeCode,
  }));
}
