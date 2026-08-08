import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// PATCH /api/followups/[id] — toggle done
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { done } = body;
  const updated = await db.marketingFollowup.update({ where: { id }, data: { done: !!done } });
  return NextResponse.json(updated);
}
