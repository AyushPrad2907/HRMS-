"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Loader2, Send } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/hrms/shared";
import { apiFetch, ApiError } from "@/lib/api";

type TargetType = "all" | "role" | "department";

interface RoleOption {
  id: string;
  name: string;
  label: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

const AUDIENCE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "all", label: "Everyone (org-wide)" },
  { value: "role", label: "By role" },
  { value: "department", label: "By department" },
];

const NONE_SENTINEL = "__none__";

/**
 * BroadcastComposer — HR-only announcement composer (§15.2).
 *
 * Posts to /api/notifications/broadcast with { title, body, target }.
 * On success: shows a toast, resets the form, and calls onSent?().
 */
export default function BroadcastComposer({
  onSent,
}: {
  onSent?: () => void;
}): React.JSX.Element {
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [audience, setAudience] = React.useState<TargetType>("all");
  const [roleId, setRoleId] = React.useState<string>("");
  const [departmentId, setDepartmentId] = React.useState<string>("");

  const [roles, setRoles] = React.useState<RoleOption[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  // Lazily fetch roles when the "By role" audience is first selected.
  React.useEffect(() => {
    if (audience !== "role" || roles.length > 0) return;
    let cancelled = false;
    setLoadingOptions(true);
    apiFetch<{ roles?: RoleOption[] }>("/api/roles")
      .then((data) => {
        if (!cancelled && data.roles) setRoles(data.roles);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load roles");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience, roles.length]);

  // Lazily fetch departments when the "By department" audience is first selected.
  React.useEffect(() => {
    if (audience !== "department" || departments.length > 0) return;
    let cancelled = false;
    setLoadingOptions(true);
    apiFetch<{ items?: DepartmentOption[] }>("/api/departments")
      .then((data) => {
        if (!cancelled && data.items) setDepartments(data.items);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load departments");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience, departments.length]);

  function resetForm() {
    setTitle("");
    setMessage("");
    setAudience("all");
    setRoleId("");
    setDepartmentId("");
  }

  const audienceSelectionValid =
    audience === "all" ||
    (audience === "role" && roleId !== "") ||
    (audience === "department" && departmentId !== "");

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    audienceSelectionValid &&
    !sending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const target: { type: TargetType; roleId?: string; departmentId?: string } =
      { type: audience };
    if (audience === "role") target.roleId = roleId;
    if (audience === "department") target.departmentId = departmentId;

    setSending(true);
    try {
      const data = await apiFetch<{ created?: number }>(
        "/api/notifications/broadcast",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: message.trim(),
            target,
          }),
        },
      );
      toast.success(`Announcement sent to ${data.created ?? 0} recipients`);
      resetForm();
      onSent?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `Failed to send broadcast (${err.status})`
          : err instanceof Error
            ? err.message
            : "Failed to send broadcast";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  const audienceLabel =
    audience === "all"
      ? "Everyone in the organization"
      : audience === "role"
        ? roles.find((r) => r.id === roleId)?.label ?? "Select a role"
        : departments.find((d) => d.id === departmentId)?.name ??
          "Select a department";

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Broadcast Announcement"
          description="Recipients receive an in-app notification instantly."
          action={
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Megaphone className="size-5" />
            </span>
          }
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bc-title">Title</Label>
            <Input
              id="bc-title"
              placeholder="e.g. Diwali holiday schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bc-message">Message</Label>
            <Textarea
              id="bc-message"
              placeholder="Write the announcement…"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bc-audience">Audience</Label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as TargetType)}
                disabled={sending}
              >
                <SelectTrigger id="bc-audience" className="w-full">
                  <SelectValue placeholder="Choose audience" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {audience === "role" ? (
              <div className="space-y-2">
                <Label htmlFor="bc-role">Role</Label>
                <Select
                  value={roleId}
                  onValueChange={setRoleId}
                  disabled={sending || loadingOptions}
                >
                  <SelectTrigger id="bc-role" className="w-full">
                    <SelectValue
                      placeholder={loadingOptions ? "Loading…" : "Select role"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length === 0 && !loadingOptions ? (
                      <SelectItem value={NONE_SENTINEL} disabled>
                        No roles available
                      </SelectItem>
                    ) : (
                      roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {audience === "department" ? (
              <div className="space-y-2">
                <Label htmlFor="bc-dept">Department</Label>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  disabled={sending || loadingOptions}
                >
                  <SelectTrigger id="bc-dept" className="w-full">
                    <SelectValue
                      placeholder={
                        loadingOptions ? "Loading…" : "Select department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 && !loadingOptions ? (
                      <SelectItem value={NONE_SENTINEL} disabled>
                        No departments available
                      </SelectItem>
                    ) : (
                      departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Recipients:{" "}
              <span className="font-medium text-foreground">
                {audienceLabel}
              </span>
            </p>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
