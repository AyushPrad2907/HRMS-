import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/session";

/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data body with:
 *   - file     : File (required)
 *   - category : "avatar" | "leave" | "report" | "document" (optional, default "document")
 *
 * Returns: { path, filename, size, mimeType }
 *
 * NOTE: In production (Supabase Storage), replace the local-disk write with
 * supabase.storage.from(bucket).upload(path, buffer) and return a signed URL.
 * The API contract (path returned, stored in DB) remains identical.
 */

type Category = "avatar" | "leave" | "report" | "document";

const ALLOWED_MIME: Record<Category, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  leave: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  document: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  report: ["text/plain", "application/pdf"],
};

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid multipart form" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES} bytes)` },
      { status: 413 },
    );
  }

  const rawCategory = formData.get("category");
  const category: Category =
    rawCategory === "avatar" ||
    rawCategory === "leave" ||
    rawCategory === "report" ||
    rawCategory === "document"
      ? rawCategory
      : "document";

  const mimeType = file.type || "application/octet-stream";
  const allowed = ALLOWED_MIME[category];
  if (!allowed.includes(mimeType)) {
    return NextResponse.json(
      {
        error: `mimeType "${mimeType}" not allowed for category "${category}"`,
      },
      { status: 415 },
    );
  }

  // Derive extension: prefer known MIME map, then sanitize the original filename ext.
  const ext =
    EXT_MAP[mimeType] ??
    (file.name.includes(".")
      ? file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin"
      : "bin");

  const filename = `${randomUUID()}.${ext}`;
  const relativePath = `/uploads/${category}/${filename}`;
  const absolutePath = join(process.cwd(), "public", "uploads", category, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(join(process.cwd(), "public", "uploads", category), { recursive: true });
  await writeFile(absolutePath, buffer);

  return NextResponse.json(
    { path: relativePath, filename, size: file.size, mimeType },
    { status: 201 },
  );
}
