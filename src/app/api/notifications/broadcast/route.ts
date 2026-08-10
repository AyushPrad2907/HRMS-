import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// POST /api/notifications/broadcast — HR-only announcement broadcast (§15.2).
// Resolves recipients by role / department / org-wide and inserts one
// Notification row per recipient (type "announcement") via createMany.

type BroadcastTargetType = "all" | "role" | "department";

interface BroadcastTarget {
  type: BroadcastTargetType;
  roleId?: string;
  departmentId?: string;
}

interface BroadcastBody {
  title?: unknown;
  body?: unknown;
  target?: BroadcastTarget;
}

const VALID_TARGET_TYPES: ReadonlySet<BroadcastTargetType> = new Set([
  "all",
  "role",
  "department",
]);

const NOTIFICATION_TYPE = "announcement";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  if (!hasPermission(session, "notification:broadcast")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as BroadcastBody;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const target = body.target;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (!target || !VALID_TARGET_TYPES.has(target.type)) {
    return NextResponse.json({ error: "invalid target.type" }, { status: 400 });
  }

  // Active, non-deleted employees only — applied to every target type so we
  // never broadcast to offboarded staff.
  const baseWhere = {
    employmentStatus: "active",
    deletedAt: null,
  } as const;

  let recipients: { userId: string }[];

  if (target.type === "all") {
    recipients = await db.employee.findMany({
      where: baseWhere,
      select: { userId: true },
    });
  } else if (target.type === "role") {
    const roleId = target.roleId;
    if (!roleId) {
      return NextResponse.json(
        { error: "roleId required for role target" },
        { status: 400 },
      );
    }
    recipients = await db.employee.findMany({
      where: {
        ...baseWhere,
        user: { userRoles: { some: { roleId } } },
      },
      select: { userId: true },
    });
  } else {
    const departmentId = target.departmentId;
    if (!departmentId) {
      return NextResponse.json(
        { error: "departmentId required for department target" },
        { status: 400 },
      );
    }
    recipients = await db.employee.findMany({
      where: {
        ...baseWhere,
        departmentId,
      },
      select: { userId: true },
    });
  }

  // Defensive de-dup (Employee.userId is @unique, so this is a no-op in practice).
  const userIds = Array.from(new Set(recipients.map((r) => r.userId)));

  const payloadJson = JSON.stringify({ target });

  let created = 0;
  if (userIds.length > 0) {
    const result = await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: NOTIFICATION_TYPE,
        title,
        body: message,
        payload: payloadJson,
      })),
    });
    created = result.count;
  }

  // Audit log — always written, even for zero recipients.
  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "notification.broadcast",
      targetTable: "notifications",
      targetId: `broadcast-${Date.now()}`,
      afterState: JSON.stringify({
        title,
        target,
        recipientCount: created,
      }),
      ipAddress: "10.0.0.?",
    },
  });

  return NextResponse.json({ created });
}
