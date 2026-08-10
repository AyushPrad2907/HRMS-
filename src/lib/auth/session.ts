import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type SessionUser = {
  employeeId: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  designation: string;
  departmentId: string;
  departmentName: string;
  employeeCode: string;
  roles: string[]; // role names
  permissions: string[];
};

const COOKIE_NAME = "implex_session_emp";

/**
 * Demo-only session: the active employee id is stored in a cookie.
 * In production this would be a Supabase JWT verified in middleware (Section 8).
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const empId = store.get(COOKIE_NAME)?.value;
  if (!empId) return null;
  return resolveSessionForEmployee(empId);
}

export async function resolveSessionForEmployee(employeeId: string): Promise<SessionUser | null> {
  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        include: {
          profile: true,
          userRoles: {
            include: {
              role: { include: { rolePermissions: { include: { permission: true } } } },
            },
          },
        },
      },
      department: true,
    },
  });
  if (!emp || !emp.user) return null;

  const roleNames = emp.user.userRoles.map((ur) => ur.role.name);
  const perms = Array.from(
    new Set(
      emp.user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name),
      ),
    ),
  );

  return {
    employeeId: emp.id,
    userId: emp.user.id,
    displayName: emp.user.profile?.displayName ?? emp.user.email,
    email: emp.user.email,
    avatarUrl: emp.user.profile?.avatarUrl ?? null,
    designation: emp.designation,
    departmentId: emp.departmentId,
    departmentName: emp.department.name,
    employeeCode: emp.employeeCode,
    roles: roleNames,
    permissions: perms,
  };
}

export function sessionCookie(employeeId: string) {
  return {
    name: COOKIE_NAME,
    value: employeeId,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: "", path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 0 };
}

export function hasPermission(user: SessionUser | null, perm: string): boolean {
  if (!user) return false;
  return user.permissions.includes(perm);
}

export function requirePermission(user: SessionUser | null, perm: string) {
  if (!hasPermission(user, perm)) throw new ForbiddenError(perm);
}

export class ForbiddenError extends Error {
  constructor(public readonly permission: string) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}
