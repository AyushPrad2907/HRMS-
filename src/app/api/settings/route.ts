import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth/session";

// GET /api/settings — list all settings (any authenticated user).
// Values are stored as JSON strings in the DB and parsed before returning.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });

  const items = await db.settings.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({
    items: items.map((s) => ({ key: s.key, value: parseValue(s.value) })),
  });
}

// PUT /api/settings — upsert a single setting (HR only, requires settings:manage).
// Body: { key: string, value: unknown }. Writes an audit log entry on success.
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no session" }, { status: 401 });
  if (!hasPermission(session, "settings:manage"))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const obj = body as { key?: unknown; value?: unknown };
  if (typeof obj.key !== "string" || obj.key.trim() === "") {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  const key = obj.key;
  const value = obj.value === undefined ? null : obj.value;
  const valueStr = JSON.stringify(value);

  const existing = await db.settings.findUnique({ where: { key } });
  const beforeState = existing
    ? JSON.stringify({ key: existing.key, value: parseValue(existing.value) })
    : null;

  const upserted = await db.settings.upsert({
    where: { key },
    create: { key, value: valueStr },
    update: { value: valueStr },
  });

  const afterState = JSON.stringify({ key: upserted.key, value: parseValue(upserted.value) });

  await db.auditLog.create({
    data: {
      actorId: session.employeeId,
      action: "settings.update",
      targetTable: "settings",
      targetId: upserted.id,
      beforeState,
      afterState,
    },
  });

  return NextResponse.json({ key: upserted.key, value: parseValue(upserted.value) });
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
