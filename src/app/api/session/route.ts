import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, resolveSessionForEmployee, sessionCookie } from "@/lib/auth/session";

// GET /api/session — current demo session
export async function GET() {
  const session = await getSession();
  if (!session) {
    // Bootstrap: default to the HR admin employee so the app has a session.
    const fallback = await db.employee.findFirst({
      where: { employeeCode: "IMP-HR-001" },
    });
    if (!fallback) {
      return NextResponse.json({ user: null, candidates: [] });
    }
    const user = await resolveSessionForEmployee(fallback.id);
    const candidates = await listCandidates();
    const res = NextResponse.json({ user, candidates });
    res.cookies.set(sessionCookie(fallback.id));
    return res;
  }
  const candidates = await listCandidates();
  return NextResponse.json({ user: session, candidates });
}

// POST /api/session — switch demo session by employeeId
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
