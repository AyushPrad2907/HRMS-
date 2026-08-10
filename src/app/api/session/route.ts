import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, resolveSessionForEmployee, sessionCookie } from "@/lib/auth/session";

// GET /api/session — current session (or null when unauthenticated).
// No bootstrap: an unauthenticated request gets { user: null, candidates: [] }.
// Login is performed via /api/auth/login; logout via /api/auth/logout.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, candidates: [] });
  }
  const candidates = await listCandidates();
  return NextResponse.json({ user: session, candidates });
}

// POST /api/session — switch demo session by employeeId.
// Kept for demo convenience (role switcher). It just sets the cookie.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const employeeId = body.employeeId as string | undefined;
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }
  const user = await resolveSessionForEmployee(employeeId);
  if (!user) {
    return NextResponse.json({ error: "employee not found" }, { status: 404 });
  }
  const res = NextResponse.json({ user });
  res.cookies.set(sessionCookie(employeeId));
  return res;
}

async function listCandidates() {
  const emps = await db.employee.findMany({
    where: { deletedAt: null, employmentStatus: "active" },
    include: { user: { include: { profile: true, userRoles: { include: { role: true } } } }, department: true },
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
