import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/deals — pipeline grouped by stage
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const viewAll = hasPermission(session, "report:view_all");
  const where: Record<string, unknown> = {};
  if (!viewAll) where.ownerEmployeeId = session.employeeId;

  const deals = await db.marketingDeal.findMany({
    where,
    include: { lead: true, owner: { include: { user: { include: { profile: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const stages = ["prospecting", "proposal", "negotiation", "won", "lost"] as const;
  const grouped = stages.map((s) => ({
    stage: s,
    items: deals
      .filter((d) => d.stage === s)
      .map((d) => ({
        id: d.id,
        title: d.title,
        leadName: d.lead.name,
        revenueAmount: d.revenueAmount,
        currency: d.currency,
        closedAt: d.closedAt,
        owner: d.owner.user.profile?.displayName ?? d.owner.user.email,
        ownerId: d.ownerEmployeeId,
        leadId: d.leadId,
      })),
    total: deals.filter((d) => d.stage === s).reduce((sum, d) => sum + d.revenueAmount, 0),
  }));

  return NextResponse.json({
    stages: grouped,
    pipelineTotal: deals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((s, d) => s + d.revenueAmount, 0),
    wonTotal: deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.revenueAmount, 0),
  });
}
