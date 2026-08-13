"use client";

import * as React from "react";
import { Loader2, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUpload } from "@/components/hrms/file-upload";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/components/hrms/shared";

/**
 * Profile shape returned by GET/PATCH /api/profile.
 * Kept local to this component (no other consumer needs it yet).
 */
type ProfileResponse = {
  displayName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  employeeCode: string;
  designation: string;
  departmentName: string;
  joinDate: string | null;
  roles: string[];
};

/**
 * ProfileSheet — right-side slide-over for the current user to view and edit
 * their own profile. Editable fields: displayName, phone, bio, avatarUrl.
 * Everything else (email, employeeCode, designation, department, joinDate,
 * roles) is HR-managed and shown read-only.
 */
export default function ProfileSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [avatarPatching, setAvatarPatching] = React.useState(false);

  // Editable form state (synced from the fetched profile).
  const [displayName, setDisplayName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [bio, setBio] = React.useState("");

  // Password change state.
  const [pwCurrent, setPwCurrent] = React.useState("");
  const [pwNew, setPwNew] = React.useState("");
  const [pwConfirm, setPwConfirm] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [changingPw, setChangingPw] = React.useState(false);

  // Optimistic avatar state — updated immediately on upload, then persisted
  // via PATCH. Falls back to the fetched value on (re)open.
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  // Read-only display state (for the muted metadata section).
  const [meta, setMeta] = React.useState<{
    email: string;
    employeeCode: string;
    designation: string;
    departmentName: string;
    joinDate: string | null;
    roles: string[];
  }>({
    email: "",
    employeeCode: "",
    designation: "",
    departmentName: "",
    joinDate: null,
    roles: [],
  });

  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  // Fetch on open (and on explicit retry). We only fetch when `open` is true
  // so the user's in-progress edits aren't clobbered by a polling refresh.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    apiFetch<ProfileResponse>("/api/profile")
      .then((data) => {
        if (cancelled) return;
        setDisplayName(data.displayName);
        setPhone(data.phone ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatarUrl);
        setMeta({
          email: data.email,
          employeeCode: data.employeeCode,
          designation: data.designation,
          departmentName: data.departmentName,
          joinDate: data.joinDate,
          roles: data.roles,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `Failed to load profile (${err.status})`
            : err instanceof Error
              ? err.message
              : "Failed to load profile";
        setFetchError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, retryKey]);

  const trimmedDisplayName = displayName.trim();
  const canSave =
    !saving && !loading && trimmedDisplayName.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const data = await apiFetch<ProfileResponse>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmedDisplayName,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setDisplayName(data.displayName);
      setPhone(data.phone ?? "");
      setBio(data.bio ?? "");
      toast.success("Profile saved");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? `Save failed (${err.status})`
          : err instanceof Error
            ? err.message
            : "Save failed";
      toast.error("Could not save profile", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (pwNew.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPw(true);
    try {
      await apiFetch<ProfileResponse>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
        }),
      });
      toast.success("Password changed");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? `Failed (${err.status})`
          : err instanceof Error
            ? err.message
            : "Failed";
      toast.error("Could not change password", { description: msg });
    } finally {
      setChangingPw(false);
    }
  }

  async function handleAvatarUploaded(path: string) {
    // Optimistic local update first (AvatarUpload already set its own preview).
    setAvatarUrl(path);
    setAvatarPatching(true);
    try {
      await apiFetch<ProfileResponse>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: path }),
      });
      toast.success("Photo updated");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? `Save failed (${err.status})`
          : err instanceof Error
            ? err.message
            : "Save failed";
      toast.error("Could not save photo", { description: msg });
    } finally {
      setAvatarPatching(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="gap-1 border-b p-6 pb-4">
          <SheetTitle className="text-base font-semibold">
            My Profile
          </SheetTitle>
          <SheetDescription className="text-xs">
            Update your photo and contact details. HR-managed fields are
            read-only.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-20 rounded-full" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load profile
            </p>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Avatar + hint */}
            <div className="flex flex-col items-center gap-2 p-6 pb-2">
              <div className="relative">
                <AvatarUpload
                  currentUrl={avatarUrl}
                  displayName={trimmedDisplayName || meta.email || "?"}
                  onUploaded={handleAvatarUploaded}
                />
                {avatarPatching ? (
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background shadow">
                    <Loader2 className="size-3 animate-spin text-primary" />
                  </span>
                ) : null}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Applies everywhere on next reload.
              </p>
            </div>

            <Separator />

            {/* Editable form */}
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-display-name">Display name</Label>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={120}
                  disabled={saving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  inputMode="tel"
                  maxLength={32}
                  disabled={saving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short note about you (optional)"
                  rows={3}
                  maxLength={500}
                  disabled={saving}
                />
              </div>

              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Change password */}
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Change password
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-pw-current">Current password</Label>
                <div className="relative">
                  <Input
                    id="profile-pw-current"
                    type={showCurrent ? "text" : "password"}
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    placeholder="Your current password"
                    disabled={changingPw}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-pw-new">New password</Label>
                <div className="relative">
                  <Input
                    id="profile-pw-new"
                    type={showNew ? "text" : "password"}
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    placeholder="Min. 8 characters"
                    disabled={changingPw}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-pw-confirm">Confirm new password</Label>
                <Input
                  id="profile-pw-confirm"
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={changingPw}
                  autoComplete="new-password"
                />
                {pwConfirm && pwNew !== pwConfirm ? (
                  <p className="text-xs text-destructive">Passwords don&apos;t match</p>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={changingPw || !pwCurrent || pwNew.length < 8 || pwNew !== pwConfirm}
                onClick={() => void handleChangePassword()}
                className="w-full"
              >
                {changingPw ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Update password
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Read-only HR-managed fields */}
            <div className="flex flex-col gap-3 p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account details
              </p>

              <ReadonlyRow label="Email" value={meta.email} />
              <ReadonlyRow
                label="Employee code"
                value={meta.employeeCode}
                mono
              />
              <ReadonlyRow label="Designation" value={meta.designation} />
              <ReadonlyRow label="Department" value={meta.departmentName} />
              {meta.joinDate ? (
                <ReadonlyRow
                  label="Join date"
                  value={formatDate(meta.joinDate)}
                />
              ) : null}

              {meta.roles.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Roles
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {meta.roles.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Read-only labelled value row. `mono` switches the value to a monospaced
 * font (used for the employee code, matching the RoleSwitcher dropdown).
 */
function ReadonlyRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={
          mono
            ? "text-right font-mono text-xs text-muted-foreground"
            : "text-right text-xs text-muted-foreground"
        }
      >
        {value || "—"}
      </span>
    </div>
  );
}
