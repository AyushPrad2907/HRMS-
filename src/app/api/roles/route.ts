import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const roles = await db.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
  const permissions = await db.permission.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description,
      permissions: r.rolePermissions.map((rp) => rp.permission.name),
    })),
    permissions: permissions.map((p) => ({ id: p.id, name: p.name, description: p.description })),
  });
}
