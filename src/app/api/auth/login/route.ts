import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  resolveSessionForEmployee,
  sessionCookie,
} from "@/lib/auth/session";
import type { Candidate, SessionUser } from "@/lib/types";

// POST /api/auth/login — email + password login.
// In production with Supabase, this maps to supabase.auth.signInWithPassword();
// the local SQLite DB + scrypt hash mirrors that contract.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email },
    include: {
      profile: true,
      employee: { include: { department: true } },
      userRoles: {
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  if (!user || !user.employee) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Login success — set the session cookie and resolve the full SessionUser.
  const sessionUser = await resolveSessionForEmployee(user.employee.id);
  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const candidates = await listCandidates();
  const res = NextResponse.json({
    user: sessionUser satisfies SessionUser,
    candidates: candidates satisfies Candidate[],
  });
  res.cookies.set(sessionCookie(user.employee.id));
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
