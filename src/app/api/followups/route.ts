import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/followups — list open follow-ups (HR: all; Marketing: own)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const viewAll = hasPermission(session, "report:view_all");
  const where: Record<string, unknown> = {};
  if (!viewAll) where.lead = { ownerEmployeeId: session.employeeId };

  const items = await db.marketingFollowup.findMany({
    where,
    include: { lead: { include: { owner: { include: { user: { include: { profile: true } } } } } } },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    take: 100,
  });
  return NextResponse.json({
    items: items.map((f) => ({
      id: f.id,
      leadId: f.leadId,
      leadName: f.lead.name,
      leadStatus: f.lead.status,
      owner: f.lead.owner.user.profile?.displayName ?? f.lead.owner.user.email,
      task: f.task,
      dueDate: f.dueDate,
      done: f.done,
    })),
  });
}
