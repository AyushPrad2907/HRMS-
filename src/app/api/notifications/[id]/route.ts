import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// PATCH /api/notifications/[id] — mark single read
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
