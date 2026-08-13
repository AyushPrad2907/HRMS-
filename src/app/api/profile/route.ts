import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Shape returned by GET and PATCH /api/profile.
 * `displayName` is always non-null here (falls back to email if Profile was
 * missing), matching the SessionUser contract.
 */
type ProfileResponse = {
  displayName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  employeeCode: string;
  designation: string;
  departmentName: string;
  joinDate: string | null;
  roles: string[];
};

/**
 * The fully-joined employee graph we read for the profile endpoint. Reusing
 * this Prisma utility type keeps serializeProfile in sync with the actual
 * query result (no hand-rolled shape that drifts).
 */
type ProfileEmployee = Prisma.EmployeeGetPayload<{
  include: {
    user: {
      include: {
        profile: true;
        userRoles: { include: { role: true } };
      };
    };
    department: true;
  };
}>;

/**
 * Serializes the employee+user+profile+department graph into the API shape.
 * Returns null if the user is missing.
 */
function serializeProfile(emp: ProfileEmployee): ProfileResponse | null {
  const user = emp.user;
  if (!user) return null;
  return {
    displayName: user.profile?.displayName ?? user.email,
    email: user.email,
    phone: user.profile?.phone ?? null,
    bio: user.profile?.bio ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    employeeCode: emp.employeeCode,
    designation: emp.designation,
    departmentName: emp.department?.name ?? "",
    joinDate: emp.joinDate ? emp.joinDate.toISOString() : null,
    roles: user.userRoles.map((ur) => ur.role.name),
  };
}

const FULL_INCLUDE = {
  user: {
    include: {
      profile: true,
      userRoles: { include: { role: true } },
    },
  },
  department: true,
} as const satisfies Prisma.EmployeeInclude;

// GET /api/profile — current user's profile (employee + user + profile + dept)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  const emp = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: FULL_INCLUDE,
  });
  if (!emp) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = serializeProfile(emp);
  if (!body) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(body);
}

// PATCH /api/profile — update own profile (displayName / phone / bio / avatarUrl only).
// Optionally also change password by providing { currentPassword, newPassword }.
// Email, employeeCode, designation, department etc. are HR-managed and not
// editable here. Writes an audit log of the changed fields.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as {
    displayName?: unknown;
    phone?: unknown;
    bio?: unknown;
    avatarUrl?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  // Whitelist + validate only the editable profile fields.
  const update: {
    displayName?: string;
    phone?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (payload.displayName !== undefined) {
    if (typeof payload.displayName !== "string") {
      return NextResponse.json(
        { error: "displayName must be a string" },
        { status: 400 },
      );
    }
    const v = payload.displayName.trim();
    if (v.length === 0) {
      return NextResponse.json(
        { error: "displayName cannot be empty" },
        { status: 400 },
      );
    }
    update.displayName = v;
  }
  if (payload.phone !== undefined) {
    if (payload.phone === null) {
      update.phone = null;
    } else if (typeof payload.phone === "string") {
      update.phone = payload.phone.trim() || null;
    } else {
      return NextResponse.json(
        { error: "phone must be a string" },
        { status: 400 },
      );
    }
  }
  if (payload.bio !== undefined) {
    if (payload.bio === null) {
      update.bio = null;
    } else if (typeof payload.bio === "string") {
      update.bio = payload.bio;
    } else {
      return NextResponse.json(
        { error: "bio must be a string" },
        { status: 400 },
      );
    }
  }
  if (payload.avatarUrl !== undefined) {
    if (payload.avatarUrl === null || payload.avatarUrl === "") {
      update.avatarUrl = null;
    } else if (typeof payload.avatarUrl === "string") {
      update.avatarUrl = payload.avatarUrl;
    } else {
      return NextResponse.json(
        { error: "avatarUrl must be a string" },
        { status: 400 },
      );
    }
  }

  // Determine if a password change was requested.
  const wantsPasswordChange =
    payload.currentPassword !== undefined || payload.newPassword !== undefined;

  if (Object.keys(update).length === 0 && !wantsPasswordChange) {
    return NextResponse.json(
      { error: "no editable fields provided" },
      { status: 400 },
    );
  }

  // Validate password change fields before touching the DB.
  if (wantsPasswordChange) {
    if (
      typeof payload.currentPassword !== "string" ||
      !payload.currentPassword
    ) {
      return NextResponse.json(
        { error: "currentPassword is required to change password" },
        { status: 400 },
      );
    }
    if (typeof payload.newPassword !== "string") {
      return NextResponse.json(
        { error: "newPassword must be a string" },
        { status: 400 },
      );
    }
    if (payload.newPassword.length < 8) {
      return NextResponse.json(
        { error: "newPassword must be at least 8 characters" },
        { status: 400 },
      );
    }
  }

  const emp = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: FULL_INCLUDE,
  });
  if (!emp || !emp.user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Password change — verify current password against the stored hash.
  if (wantsPasswordChange) {
    const storedHash = emp.user.passwordHash;
    if (
      !storedHash ||
      !verifyPassword(payload.currentPassword as string, storedHash)
    ) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }
    // Hash and persist the new password.
    const newHash = hashPassword(payload.newPassword as string);
    await db.user.update({
      where: { id: emp.user.id },
      data: { passwordHash: newHash },
    });
    await db.auditLog.create({
      data: {
        actorId: session.employeeId,
        action: "profile.password_change",
        targetTable: "users",
        targetId: emp.user.id,
        afterState: JSON.stringify({ passwordChanged: true }),
        ipAddress: "10.0.0.?",
      },
    });
  }

  // Profile-field updates (displayName / phone / bio / avatarUrl).
  if (Object.keys(update).length > 0) {
    const existingProfileId = emp.user.profile?.id ?? "";
    const updated = await db.profile.upsert({
      where: { userId: emp.user.id },
      create: {
        userId: emp.user.id,
        displayName: update.displayName ?? emp.user.email,
        phone: update.phone ?? null,
        bio: update.bio ?? null,
        avatarUrl: update.avatarUrl ?? null,
      },
      update,
    });

    await db.auditLog.create({
      data: {
        actorId: session.employeeId,
        action: "profile.update",
        targetTable: "profiles",
        targetId: updated.id || existingProfileId,
        afterState: JSON.stringify(update),
        ipAddress: "10.0.0.?",
      },
    });
  }

  // Re-fetch the fully joined employee so the response mirrors GET exactly.
  const refreshed = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: FULL_INCLUDE,
  });
  if (!refreshed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = serializeProfile(refreshed);
  if (!body) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(body);
}
