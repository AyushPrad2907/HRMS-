import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/leads — HR: all; Marketing: own
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const viewAll = hasPermission(session, "report:view_all");
  const where: Record<string, unknown> = { deletedAt: null };
  if (!viewAll) where.ownerEmployeeId = session.employeeId;

  const items = await db.marketingLead.findMany({
    where,
    include: {
      owner: { include: { user: { include: { profile: true } } } },
      deals: true,
      followups: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      name: l.name,
      contactPhone: l.contactPhone,
      contactEmail: l.contactEmail,
      source: l.source,
      status: l.status,
      estimatedValue: l.estimatedValue,
      createdAt: l.createdAt,
      owner: l.owner.user.profile?.displayName ?? l.owner.user.email,
      ownerId: l.ownerEmployeeId,
      openDeals: l.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length,
      openFollowups: l.followups.filter((f) => !f.done).length,
    })),
  });
}

// POST /api/leads — create
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const body = await req.json();
  const { name, contactPhone, contactEmail, source, status, estimatedValue } = body;
  if (!name || !source) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const lead = await db.marketingLead.create({
    data: {
      ownerEmployeeId: session.employeeId,
      name,
      contactPhone: contactPhone ?? null,
      contactEmail: contactEmail ?? null,
      source,
      status: status ?? "new",
      estimatedValue: estimatedValue ? Number(estimatedValue) : null,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "lead.create",
      targetTable: "marketing_leads",
      targetId: lead.id,
      afterState: JSON.stringify({ name, source, status: status ?? "new" }),
      ipAddress: "10.0.0.?",
    },
  });
  return NextResponse.json(lead, { status: 201 });
}
