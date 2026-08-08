"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI Card — dense stat card inspired by Linear/Stripe dashboards.
 * - Top row: small uppercase muted label + optional icon (right).
 * - Big value: text-2xl font-semibold.
 * - Bottom row: delta (green up / red down with arrow) + muted hint.
 */
export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  const showDelta = typeof delta === "number" && isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="gap-0 px-5 py-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {showDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {positive ? "+" : ""}
            {delta!.toFixed(1)}%
          </span>
        ) : null}
        {hint ? (
          <span className="text-muted-foreground truncate">{hint}</span>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Section header — title + description on the left, optional action on the right.
 */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Empty state — centered card with icon, title, description, optional action.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}

/**
 * Map of known status keys to Tailwind color classes (emerald-friendly palette).
 * Falls back to muted for unknown statuses.
 */
const STATUS_STYLES: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  absent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  half_day: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  on_leave: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  holiday: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cancelled: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  on_leave_emp: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  offboarded: "bg-muted text-muted-foreground",
  new: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  contacted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  qualified: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  lost: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  converted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  prospecting: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  proposal: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  negotiation: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  won: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function prettifyStatus(status: string): string {
  if (status === "on_leave_emp") return "On Leave";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Status badge — pill with semantic color from STATUS_STYLES.
 */
export function StatusBadge({ status }: { status: string }) {
  const label = prettifyStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

/**
 * Date formatters — locale-aware, lightweight (no extra deps).
 */
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatCurrency(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatRelativeTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  const past = diffMs < 0;
  const fmt = (v: number, unit: string) => `${v}${unit} ${past ? "ago" : "from now"}`;
  if (abs < minute) return past ? "just now" : "soon";
  if (abs < hour) return fmt(Math.round(abs / minute), "m");
  if (abs < day) return fmt(Math.round(abs / hour), "h");
  if (abs < week) return fmt(Math.round(abs / day), "d");
  if (abs < month) return fmt(Math.round(abs / week), "w");
  if (abs < year) return fmt(Math.round(abs / month), "mo");
  return fmt(Math.round(abs / year), "y");
}

export { Badge };
