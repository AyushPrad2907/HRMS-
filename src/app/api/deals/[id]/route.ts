import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// PATCH /api/deals/[id] — change stage
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { stage } = body;
  if (!["prospecting", "proposal", "negotiation", "won", "lost"].includes(stage)) {
    return NextResponse.json({ error: "invalid stage" }, { status: 400 });
  }
  const deal = await db.marketingDeal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await db.marketingDeal.update({
    where: { id },
    data: { stage, closedAt: stage === "won" || stage === "lost" ? new Date() : null },
  });

  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "deal.stage_change",
      targetTable: "marketing_deals",
      targetId: id,
      beforeState: JSON.stringify({ stage: deal.stage }),
      afterState: JSON.stringify({ stage }),
      ipAddress: "10.0.0.?",
    },
  });
  return NextResponse.json(updated);
}
