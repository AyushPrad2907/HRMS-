import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.department.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ items });
}
