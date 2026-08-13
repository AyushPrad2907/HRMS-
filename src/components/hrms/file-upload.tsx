"use client";

import * as React from "react";
import { Upload, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// File upload infrastructure (Task W1-B)
// ---------------------------------------------------------------------------

type LeaveReportDocumentCategory = "leave" | "report" | "document";

/** Module-level flag — mirrors the sessionEnsured guard in lib/api.ts. */
let uploadSessionEnsured = false;

/**
 * Internal helper: POST a single file to /api/upload.
 * On a 401, bootstraps the session via GET /api/session then retries once,
 * matching the same cold-start recovery behaviour as apiFetch.
 * Returns the server response JSON or throws on non-2xx / network error.
 */
async function uploadFile(
  file: File,
  category: LeaveReportDocumentCategory | "avatar",
): Promise<{ path: string; filename: string; size: number; mimeType: string }> {
  const doUpload = async (): Promise<Response> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    return fetch("/api/upload", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
  };

  let res = await doUpload();

  // Cold-start 401: bootstrap the session cookie then retry once.
  if (res.status === 401 && !uploadSessionEnsured) {
    uploadSessionEnsured = true;
    await fetch("/api/session", { credentials: "same-origin" });
    res = await doUpload();
  }

  const data = (await res.json().catch(() => ({}))) as {
    path?: string;
    filename?: string;
    size?: number;
    mimeType?: string;
    error?: string;
  };
  if (!res.ok || !data.path) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  return {
    path: data.path,
    filename: data.filename ?? file.name,
    size: data.size ?? file.size,
    mimeType: data.mimeType ?? file.type,
  };
}

// ---------------------------------------------------------------------------
// FileUpload — generic file picker + uploader
// ---------------------------------------------------------------------------

export function FileUpload({
  category,
  accept,
  label,
  onUploaded,
  onError,
  buttonText,
}: {
  category: LeaveReportDocumentCategory;
  accept?: string;
  label?: string;
  onUploaded: (path: string) => void;
  onError?: (msg: string) => void;
  buttonText?: string;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, category);
      toast.success("File uploaded", { description: result.filename });
      onUploaded(result.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Upload failed", { description: msg });
      onError?.(msg);
    } finally {
      setUploading(false);
      // Allow re-selecting the same file later.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : (
          <Upload className="size-4 text-primary" />
        )}
        {uploading ? "Uploading…" : (buttonText ?? "Upload file")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AvatarUpload — specialized for profile photos
// ---------------------------------------------------------------------------

export function AvatarUpload({
  currentUrl,
  displayName,
  onUploaded,
}: {
  currentUrl: string | null;
  displayName: string;
  onUploaded: (path: string) => void;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentUrl);

  // Keep preview in sync if the parent prop changes after a successful upload.
  React.useEffect(() => {
    setPreviewUrl(currentUrl);
  }, [currentUrl]);

  const initials = React.useMemo(() => {
    const parts = (displayName || "?").trim().split(/\s+/);
    return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }, [displayName]);

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, "avatar");
      // Optimistic local preview so the new image shows immediately, even
      // before the parent re-fetches and passes the new currentUrl.
      setPreviewUrl(result.path);
      toast.success("Avatar updated", { description: result.filename });
      onUploaded(result.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Avatar upload failed", { description: msg });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <div className="group relative size-20">
        <Avatar className="size-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          {previewUrl ? <AvatarImage src={previewUrl} alt={displayName} /> : null}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : (
          <Camera className="size-4 text-primary" />
        )}
        {uploading ? "Uploading…" : "Change photo"}
      </Button>
    </div>
  );
}

export default FileUpload;
