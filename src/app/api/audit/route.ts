import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/audit — HR only, searchable
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "audit:view"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const items = await db.auditLog.findMany({
    include: { actor: { include: { user: { include: { profile: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      actor: a.actor?.user?.profile?.displayName ?? "System",
      action: a.action,
      targetTable: a.targetTable,
      targetId: a.targetId,
      beforeState: a.beforeState,
      afterState: a.afterState,
      ipAddress: a.ipAddress,
      createdAt: a.createdAt,
    })),
  });
}
