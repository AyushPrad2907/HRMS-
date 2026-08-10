import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// DELETE /api/teacher-reports/[id] — soft delete own report
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  const { id } = await params;
  const report = await db.teacherReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.employeeId !== session.employeeId && !hasPermission(session, "report:view_all")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await db.teacherReport.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
