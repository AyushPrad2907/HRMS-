import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// PATCH /api/leads/[id] — change status (and optionally create a deal on convert)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { status, createDeal } = body;
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  const lead = await db.marketingLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await db.marketingLead.update({
    where: { id },
    data: { status },
  });

  let dealId: string | null = null;
  if (createDeal || status === "converted") {
    const deal = await db.marketingDeal.create({
      data: {
        leadId: id,
        ownerEmployeeId: lead.ownerEmployeeId,
        title: `${lead.name} — engagement`,
        stage: status === "converted" ? "won" : "prospecting",
        revenueAmount: lead.estimatedValue ?? 0,
        closedAt: status === "converted" ? new Date() : null,
      },
    });
    dealId = deal.id;
  }

  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "lead.status_change",
      targetTable: "marketing_leads",
      targetId: id,
      afterState: JSON.stringify({ status }),
      ipAddress: "10.0.0.?",
    },
  });
  return NextResponse.json({ lead: updated, dealId });
}
