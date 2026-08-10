import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.holiday.findMany({ orderBy: { holidayDate: "asc" }, take: 50 });
  return NextResponse.json({ items });
}
