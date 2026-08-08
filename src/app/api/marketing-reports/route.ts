import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/marketing-reports — HR: all; Marketing: own
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const viewAll = hasPermission(session, "report:view_all");
  const where: Record<string, unknown> = { deletedAt: null };
  if (!viewAll) where.employeeId = session.employeeId;
  if (from || to) {
    const range: Record<string, unknown> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.reportDate = range;
  }

  const items = await db.marketingReport.findMany({
    where,
    include: {
      employee: { include: { user: { include: { profile: true } }, department: true } },
      calls: true,
      meetings: true,
    },
    orderBy: { reportDate: "desc" },
    take: 200,
  });

  return NextResponse.json({
    canSubmit: hasPermission(session, "report:submit_marketing"),
    items: items.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employee: r.employee.user.profile?.displayName ?? r.employee.user.email,
      code: r.employee.employeeCode,
      department: r.employee.department.name,
      reportDate: r.reportDate,
      submittedAt: r.submittedAt,
      notes: r.notes,
      callsCount: r.calls.length,
      meetingsCount: r.meetings.length,
      calls: r.calls,
      meetings: r.meetings,
    })),
  });
}

// POST /api/marketing-reports — submit daily report (with calls + meetings arrays)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "report:submit_marketing"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { reportDate, notes, calls, meetings } = body;
  if (!reportDate) return NextResponse.json({ error: "missing reportDate" }, { status: 400 });
  const date = new Date(reportDate);
  date.setHours(0, 0, 0, 0);

  const existing = await db.marketingReport.findUnique({
    where: { employeeId_reportDate: { employeeId: session.employeeId, reportDate: date } },
  });
  if (existing) return NextResponse.json({ error: "report already submitted for this date" }, { status: 409 });

  const mr = await db.marketingReport.create({
    data: {
      employeeId: session.employeeId,
      reportDate: date,
      notes: notes ?? null,
      calls: {
        create: (calls ?? []).map((c: { contactName: string; contactPhone?: string; outcome: string; notes?: string }) => ({
          contactName: c.contactName,
          contactPhone: c.contactPhone ?? null,
          outcome: c.outcome,
          notes: c.notes ?? null,
        })),
      },
      meetings: {
        create: (meetings ?? []).map((m: { counterparty: string; purpose: string; outcome?: string; durationMinutes: number }) => ({
          counterparty: m.counterparty,
          purpose: m.purpose,
          outcome: m.outcome ?? null,
          durationMinutes: Number(m.durationMinutes) || 30,
        })),
      },
    },
    include: { calls: true, meetings: true },
  });
  return NextResponse.json(mr, { status: 201 });
}
