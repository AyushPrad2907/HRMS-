import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// File upload infrastructure (Task W1-B)
// ---------------------------------------------------------------------------
// STORAGE MODEL NOTE (spec §14):
//   In production, uploads would live in Supabase Storage and be served via
//   signed URLs (with row-level security policies per category). For this demo
//   we store files locally under /public/uploads/<category>/ and serve them
//   directly through Next.js' static file serving. Do NOT implement signed
//   URLs here — keep the local-disk model so dashboards can use plain <img>
//   and <a href> against the returned `path`.
// ---------------------------------------------------------------------------

export type UploadCategory = "avatar" | "leave" | "report" | "document";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME: Record<UploadCategory, readonly string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  leave: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  document: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  // TeacherClass.notesUrl — text notes or PDF handouts.
  report: ["text/plain", "application/pdf"],
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

function isUploadCategory(value: string | null): value is UploadCategory {
  return value === "avatar" || value === "leave" || value === "report" || value === "document";
}

// POST /api/upload — multipart form-data
//   fields: file (File) — required
//           category ("avatar" | "leave" | "report" | "document") — optional, default "document"
//   response: { path: "/uploads/<category>/<filename>", filename, size, mimeType }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const rawCategory = form.get("category");
  const category: UploadCategory =
    rawCategory === null
      ? "document"
      : isUploadCategory(typeof rawCategory === "string" ? rawCategory : null)
        ? (rawCategory as UploadCategory)
        : "document";

  const fileEntry = form.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const mimeType = fileEntry.type || "";
  const allowed = ALLOWED_MIME[category];
  if (!allowed.includes(mimeType)) {
    return NextResponse.json(
      { error: `mimeType "${mimeType}" not allowed for category "${category}"` },
      { status: 415 },
    );
  }

  if (fileEntry.size === 0) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  if (fileEntry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES} bytes)` },
      { status: 413 },
    );
  }

  // Derive extension — prefer MIME mapping (clean & safe), fall back to original.
  const extFromMime = MIME_TO_EXT[mimeType];
  const extFromName = fileEntry.name.includes(".")
    ? fileEntry.name
        .split(".")
        .pop()!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";
  const ext = extFromMime || extFromName || "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", category);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);

  const publicPath = `/uploads/${category}/${filename}`;
  return NextResponse.json(
    { path: publicPath, filename, size: fileEntry.size, mimeType: mimeType || extFromMime },
    { status: 201 },
  );
}
