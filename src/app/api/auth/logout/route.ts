import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

// POST /api/auth/logout — clear the session cookie.
// No session required: logout is always allowed.
// In production with Supabase, this maps to supabase.auth.signOut().
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
