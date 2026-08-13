"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ClipboardList,
  Target,
  TrendingUp,
  ListTodo,
  Plus,
  Trash2,
  Phone,
  Users,
  ShieldAlert,
  CalendarDays,
  Plane,
  Send,
  Paperclip,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { Candidate, SessionUser } from "@/lib/types";
import AppShell from "@/components/hrms/AppShell";
import Sidebar, { type NavItem } from "@/components/hrms/Sidebar";
import {
  KpiCard,
  SectionHeader,
  EmptyState,
  StatusBadge,
  formatDate,
  formatCurrency,
  formatDateTime,
  Badge,
} from "@/components/hrms/shared";
import { FileUpload } from "@/components/hrms/file-upload";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror the API response shapes (kept local to this file).
// ---------------------------------------------------------------------------

type Kpi = { label: string; value: number; delta: number; hint: string };

type OverviewResponse = {
  role: string;
  kpis: Kpi[];
  deals: number;
  wonThisMonth: number;
};

type AnalyticsFunnel = {
  byStatus: {
    new: number;
    contacted: number;
    qualified: number;
    lost: number;
    converted: number;
  };
  dealsByStage: {
    prospecting: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
  };
  revenueWon: number;
  pipelineValue: number;
};

type AnalyticsResponse = {
  marketingFunnel: AnalyticsFunnel;
};

type LeadItem = {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  source: string;
  status: string;
  estimatedValue: number | null;
  createdAt: string;
  owner: string;
  ownerId: string;
  openDeals: number;
  openFollowups: number;
};

type LeadsResponse = { items: LeadItem[] };

type DealItem = {
  id: string;
  title: string;
  leadName: string;
  revenueAmount: number;
  currency: string;
  closedAt: string | null;
  owner: string;
  ownerId: string;
  leadId: string;
};

type DealStage = {
  stage: string;
  items: DealItem[];
  total: number;
};

type DealsResponse = {
  stages: DealStage[];
  pipelineTotal: number;
  wonTotal: number;
};

type FollowupItem = {
  id: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
  owner: string;
  task: string;
  dueDate: string;
  done: boolean;
};

type FollowupsResponse = { items: FollowupItem[] };

type LeaveItem = {
  id: string;
  employeeId: string;
  employee: string;
  code: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approver: string | null;
  decidedAt: string | null;
  createdAt: string;
  attachmentPath: string | null;
};

type LeaveResponse = { items: LeaveItem[] };

type SettingItem = { key: string; value: unknown };

type SettingsResponse = { items: SettingItem[] };

type LeaveBalances = {
  casual: number;
  sick: number;
  earned: number;
  unpaid: number;
};

const EMPTY_BALANCES: LeaveBalances = { casual: 0, sick: 0, earned: 0, unpaid: 0 };

// Daily report — local form state shapes (what we POST).
type CallDraft = {
  id: string;
  contactName: string;
  contactPhone: string;
  outcome: string;
  notes: string;
};

type MeetingDraft = {
  id: string;
  counterparty: string;
  purpose: string;
  outcome: string;
  durationMinutes: number;
};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const MARKETING_NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
  { id: "report", label: "Daily Report", icon: <ClipboardList /> },
  { id: "leads", label: "Leads", icon: <Target /> },
  { id: "deals", label: "Deals", icon: <TrendingUp /> },
  { id: "followups", label: "Follow-ups", icon: <ListTodo /> },
  { id: "leave", label: "Leave", icon: <Plane /> },
];

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "unpaid", label: "Unpaid" },
];

// Emerald / sky / amber / rose / violet — fixed hex for recharts SVG fills.
const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

const LEAD_STATUSES = ["new", "contacted", "qualified", "lost", "converted"] as const;
const LEAD_SOURCES = ["referral", "ads", "website", "event", "outbound"] as const;
const DEAL_STAGES = ["prospecting", "proposal", "negotiation", "won", "lost"] as const;
const CALL_OUTCOMES = [
  "connected",
  "voicemail",
  "no_answer",
  "callback_scheduled",
] as const;

const MONTHLY_REVENUE_TARGET_KEY = "monthly_revenue_target";

function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayInputValue(): string {
  return toDateInputValue(new Date());
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseLeaveBalances(items: SettingItem[] | undefined): LeaveBalances {
  if (!items) return EMPTY_BALANCES;
  const row = items.find((s) => s.key === "leave_balances");
  if (!row) return EMPTY_BALANCES;
  const v = row.value;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Partial<Record<keyof LeaveBalances, unknown>>;
    const num = (x: unknown): number =>
      typeof x === "number" && isFinite(x) ? x : typeof x === "string" ? Number(x) || 0 : 0;
    return {
      casual: num(obj.casual),
      sick: num(obj.sick),
      earned: num(obj.earned),
      unpaid: num(obj.unpaid),
    };
  }
  return EMPTY_BALANCES;
}

/**
 * Tiny data-fetching hook — `null` URL skips fetching. Stale data stays
 * visible while `loading` is true on subsequent refetches (the skeleton only
 * shows when we have no data yet).
 */
function useFetch<T>(url: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState<boolean>(url !== null);
  const [error, setError] = React.useState<Error | null>(null);

  const refetch = React.useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const j = await apiFetch<T>(url, { headers: { Accept: "application/json" } });
      setData(j);
    } catch (e) {
      setError(e instanceof ApiError ? new Error(`HTTP ${e.status}`) : (e as Error));
    } finally {
      setLoading(false);
    }
  }, [url]);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

function ErrorState({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<ShieldAlert />}
      title="Failed to load"
      description={message}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Overview
// ---------------------------------------------------------------------------

function FunnelCard({ funnel }: { funnel: AnalyticsFunnel }) {
  const data = LEAD_STATUSES.map((s) => ({
    status: s,
    count: funnel.byStatus[s] ?? 0,
  }));
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card className="gap-0 px-6 py-5">
      <CardHeader className="px-0 pb-3">
        <CardTitle className="text-sm font-semibold">Lead Funnel</CardTitle>
        <p className="text-xs text-muted-foreground">
          Leads by status (org-wide)
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="status"
              width={84}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(v: unknown) =>
                String(v)
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} leads`, "Count"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {data.map((d, i) => (
            <span key={d.status} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="capitalize">{d.status.replace(/_/g, " ")}</span>
              <span className="font-mono">{d.count}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Max in a single stage:{" "}
          <span className="font-mono">{max}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function RevenueCard({
  wonThisMonth,
  pipeline,
  target,
}: {
  wonThisMonth: number;
  pipeline: number;
  target: number;
}) {
  const hasTarget = typeof target === "number" && isFinite(target) && target > 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((wonThisMonth / target) * 100))
    : wonThisMonth > 0
      ? 100
      : 0;
  return (
    <Card className="gap-0 px-6 py-5">
      <CardHeader className="px-0 pb-3">
        <CardTitle className="text-sm font-semibold">Revenue</CardTitle>
        <p className="text-xs text-muted-foreground">Month-to-date</p>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Won this month
          </p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(wonThisMonth)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pipeline
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrency(pipeline)}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly target</span>
            <span className="font-mono">
              {hasTarget ? formatCurrency(target) : "—"}
            </span>
          </div>
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground">
            {pct}% of target reached
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewSection({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate: (id: string) => void;
}) {
  const overview = useFetch<OverviewResponse>("/api/overview");
  const [analyticsData, setAnalyticsData] =
    React.useState<AnalyticsResponse | null>(null);
  const [settingsData, setSettingsData] =
    React.useState<SettingsResponse | null>(null);

  // Load analytics (funnel) + settings (monthly target) alongside overview.
  // Both are best-effort: the Overview KPIs still render without them.
  React.useEffect(() => {
    let cancelled = false;
    async function loadExtra() {
      try {
        const results = await Promise.allSettled([
          apiFetch<AnalyticsResponse>("/api/analytics", { headers: { Accept: "application/json" } }),
          apiFetch<SettingsResponse>("/api/settings", { headers: { Accept: "application/json" } }),
        ]);
        if (!cancelled) {
          if (results[0].status === "fulfilled") setAnalyticsData(results[0].value);
          if (results[1].status === "fulfilled") setSettingsData(results[1].value);
        }
      } catch {
        // ignore — Overview KPIs still render without these extras
      }
    }
    void loadExtra();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = overview.loading && !overview.data;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <KpiSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (overview.error || !overview.data) {
    return <ErrorState message={overview.error?.message ?? "No data"} />;
  }

  const kpis = overview.data.kpis ?? [];
  const wonThisMonth = overview.data.wonThisMonth ?? 0;
  const funnel = analyticsData?.marketingFunnel;
  const pipeline = funnel?.pipelineValue ?? 0;

  const targetSetting = settingsData?.items?.find(
    (s) => s.key === MONTHLY_REVENUE_TARGET_KEY,
  );
  let target = 0;
  if (targetSetting) {
    const v = targetSetting.value;
    if (typeof v === "number") target = v;
    else if (typeof v === "string") {
      const parsed = Number(v);
      if (isFinite(parsed)) target = parsed;
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome, ${user.displayName.split(" ")[0]}`}
        description="Your sales pipeline at a glance"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={
              k.label.toLowerCase().includes("pipeline")
                ? formatCurrency(k.value)
                : k.value
            }
            delta={k.delta}
            hint={k.hint}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {funnel ? (
          <FunnelCard funnel={funnel} />
        ) : (
          <Card className="px-6 py-5">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-semibold">Lead Funnel</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        )}
        <RevenueCard
          wonThisMonth={wonThisMonth}
          pipeline={pipeline}
          target={target}
        />
      </div>

      <Card className="px-6 py-5">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 px-0">
          <Button onClick={() => onNavigate("report")}>
            <ClipboardList className="size-4" />
            Log Today&apos;s Activity
          </Button>
          <Button variant="outline" onClick={() => onNavigate("leads")}>
            <Plus className="size-4" />
            Add Lead
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Daily Report
// ---------------------------------------------------------------------------

function DailyReportSection({
  onSubmitted,
}: {
  onSubmitted: () => void;
}) {
  const today = todayInputValue();
  const [reportDate, setReportDate] = React.useState<string>(today);
  const [notes, setNotes] = React.useState<string>("");
  const [calls, setCalls] = React.useState<CallDraft[]>([
    { id: uid(), contactName: "", contactPhone: "", outcome: "connected", notes: "" },
  ]);
  const [meetings, setMeetings] = React.useState<MeetingDraft[]>([
    { id: uid(), counterparty: "", purpose: "", outcome: "", durationMinutes: 30 },
  ]);
  const [submitting, setSubmitting] = React.useState(false);

  function addCall() {
    setCalls((cs) => [
      ...cs,
      { id: uid(), contactName: "", contactPhone: "", outcome: "connected", notes: "" },
    ]);
  }
  function removeCall(id: string) {
    setCalls((cs) => cs.filter((c) => c.id !== id));
  }
  function patchCall(id: string, patch: Partial<CallDraft>) {
    setCalls((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addMeeting() {
    setMeetings((ms) => [
      ...ms,
      { id: uid(), counterparty: "", purpose: "", outcome: "", durationMinutes: 30 },
    ]);
  }
  function removeMeeting(id: string) {
    setMeetings((ms) => ms.filter((m) => m.id !== id));
  }
  function patchMeeting(id: string, patch: Partial<MeetingDraft>) {
    setMeetings((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function submit() {
    if (!reportDate) {
      toast.error("Please pick a report date");
      return;
    }
    const cleanCalls = calls
      .filter((c) => c.contactName.trim() !== "")
      .map((c) => ({
        contactName: c.contactName.trim(),
        contactPhone: c.contactPhone.trim() || undefined,
        outcome: c.outcome,
        notes: c.notes.trim() || undefined,
      }));
    const cleanMeetings = meetings
      .filter((m) => m.counterparty.trim() !== "")
      .map((m) => ({
        counterparty: m.counterparty.trim(),
        purpose: m.purpose.trim(),
        outcome: m.outcome.trim() || undefined,
        durationMinutes: Number(m.durationMinutes) || 30,
      }));

    if (cleanCalls.length === 0 && cleanMeetings.length === 0) {
      toast.error("Add at least one call or one meeting before submitting");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/marketing-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          notes: notes.trim() || undefined,
          calls: cleanCalls,
          meetings: cleanMeetings,
        }),
      });
      toast.success("Daily report submitted");
      // Reset
      setReportDate(today);
      setNotes("");
      setCalls([
        { id: uid(), contactName: "", contactPhone: "", outcome: "connected", notes: "" },
      ]);
      setMeetings([
        { id: uid(), counterparty: "", purpose: "", outcome: "", durationMinutes: 30 },
      ]);
      onSubmitted();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error("A report already exists for this date");
        return;
      } else if (e instanceof ApiError) {
        toast.error("Failed to submit report", { description: `HTTP ${e.status}` });
      } else {
        toast.error("Failed to submit report", { description: "Network error" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daily Report"
        description="Log your calls and meetings"
      />

      <Card className="px-6 py-5">
        <CardContent className="space-y-6 px-0">
          {/* Date + Notes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-date">Report Date</Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                max={today}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-notes">Notes</Label>
              <Textarea
                id="report-notes"
                rows={2}
                placeholder="Highlights, blockers, follow-up needs…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Calls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Calls</h3>
                <Badge variant="secondary" className="font-mono">
                  {calls.filter((c) => c.contactName.trim()).length}
                </Badge>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCall}>
                <Plus className="size-4" />
                Add Call
              </Button>
            </div>

            <div className="space-y-3">
              {calls.length === 0 ? (
                <p className="text-xs text-muted-foreground">No calls added yet.</p>
              ) : (
                calls.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_1.4fr_auto]"
                  >
                    <Input
                      placeholder="Contact name"
                      value={c.contactName}
                      onChange={(e) =>
                        patchCall(c.id, { contactName: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Phone"
                      value={c.contactPhone}
                      onChange={(e) =>
                        patchCall(c.id, { contactPhone: e.target.value })
                      }
                    />
                    <Select
                      value={c.outcome}
                      onValueChange={(v) => patchCall(c.id, { outcome: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALL_OUTCOMES.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ").replace(/\b\w/g, (ch) =>
                              ch.toUpperCase(),
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Notes"
                      value={c.notes}
                      onChange={(e) => patchCall(c.id, { notes: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCall(c.id)}
                      aria-label="Remove call"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Meetings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Meetings</h3>
                <Badge variant="secondary" className="font-mono">
                  {meetings.filter((m) => m.counterparty.trim()).length}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMeeting}
              >
                <Plus className="size-4" />
                Add Meeting
              </Button>
            </div>

            <div className="space-y-3">
              {meetings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No meetings added yet.
                </p>
              ) : (
                meetings.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_auto]"
                  >
                    <Input
                      placeholder="Counterparty"
                      value={m.counterparty}
                      onChange={(e) =>
                        patchMeeting(m.id, { counterparty: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Purpose"
                      value={m.purpose}
                      onChange={(e) =>
                        patchMeeting(m.id, { purpose: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Outcome"
                      value={m.outcome}
                      onChange={(e) =>
                        patchMeeting(m.id, { outcome: e.target.value })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="30"
                        value={m.durationMinutes}
                        onChange={(e) =>
                          patchMeeting(m.id, {
                            durationMinutes: Number(e.target.value),
                          })
                        }
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        min
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMeeting(m.id)}
                      aria-label="Remove meeting"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={submit}
              disabled={submitting}
              className="min-w-28"
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Leads
// ---------------------------------------------------------------------------

function LeadCard({
  lead,
  onStatusChange,
}: {
  lead: LeadItem;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">{lead.name}</p>
          {lead.contactPhone ? (
            <p className="font-mono text-xs text-muted-foreground">
              {lead.contactPhone}
            </p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0 capitalize">
          {lead.source}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{formatCurrency(lead.estimatedValue ?? 0)}</span>
        <span aria-hidden>·</span>
        <span>{lead.owner}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <Badge variant="secondary" className="font-mono">
          {lead.openDeals} deal{lead.openDeals === 1 ? "" : "s"}
        </Badge>
        <Badge variant="secondary" className="font-mono">
          {lead.openFollowups} follow-up{lead.openFollowups === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="mt-3">
        <Select
          value={lead.status}
          onValueChange={(v) => onStatusChange(lead.id, v)}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LeadsSection() {
  const { data, loading, error, refetch } = useFetch<LeadsResponse>("/api/leads");
  const [addOpen, setAddOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function changeStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          createDeal: status === "converted",
        }),
      });
      toast.success(`Lead moved to ${status}`);
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Failed to update lead", { description: `HTTP ${e.status}` });
      } else {
        toast.error("Failed to update lead", { description: "Network error" });
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} />;

  const items = data?.items ?? [];
  const byStatus: Record<string, LeadItem[]> = {};
  for (const s of LEAD_STATUSES) byStatus[s] = [];
  for (const l of items) {
    if (byStatus[l.status]) byStatus[l.status].push(l);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Leads"
        description="Your pipeline by status"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Lead
          </Button>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((s) => {
          const col = byStatus[s];
          return (
            <div key={s} className="flex w-72 shrink-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={s} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {col.length}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {col.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                ) : (
                  col.map((l) => (
                    <LeadCard key={l.id} lead={l} onStatusChange={changeStatus} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        saving={saving}
        onSaving={setSaving}
        onCreated={() => {
          void refetch();
        }}
      />
    </div>
  );
}

function AddLeadDialog({
  open,
  onOpenChange,
  saving,
  onSaving,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saving: boolean;
  onSaving: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [source, setSource] = React.useState<string>(LEAD_SOURCES[0]);
  const [status, setStatus] = React.useState<string>("new");
  const [estimatedValue, setEstimatedValue] = React.useState<string>("");

  function reset() {
    setName("");
    setContactPhone("");
    setContactEmail("");
    setSource(LEAD_SOURCES[0]);
    setStatus("new");
    setEstimatedValue("");
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    onSaving(true);
    try {
      await apiFetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          source,
          status,
          estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        }),
      });
      toast.success("Lead created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Failed to create lead", { description: `HTTP ${e.status}` });
      } else {
        toast.error("Failed to create lead", { description: "Network error" });
      }
    } finally {
      onSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>
            Capture a new marketing lead into your pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name</Label>
            <Input
              id="lead-name"
              placeholder="Acme School"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                placeholder="+91…"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="hello@acme.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-value">Estimated Value (INR)</Label>
            <Input
              id="lead-value"
              type="number"
              min={0}
              placeholder="50000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="min-w-24">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 4. Deals
// ---------------------------------------------------------------------------

function DealCard({
  deal,
  stage,
  onStageChange,
}: {
  deal: DealItem;
  stage: string;
  onStageChange: (id: string, stage: string) => void;
}) {
  const currentStage = DEAL_STAGES.includes(
    stage as (typeof DEAL_STAGES)[number],
  )
    ? stage
    : "prospecting";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium">{deal.title}</p>
        <p className="truncate text-xs text-muted-foreground">{deal.leadName}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatCurrency(deal.revenueAmount)}
        </span>
        <span className="text-muted-foreground">{deal.owner}</span>
      </div>
      {deal.closedAt ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Closed {formatDate(deal.closedAt)}
        </p>
      ) : null}
      <div className="mt-3">
        <Select
          value={currentStage}
          onValueChange={(v) => onStageChange(deal.id, v)}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            {DEAL_STAGES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DealsSection() {
  const { data, loading, error, refetch } = useFetch<DealsResponse>("/api/deals");

  async function changeStage(id: string, stage: string) {
    try {
      await apiFetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      toast.success(`Deal moved to ${stage}`);
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Failed to update deal", { description: `HTTP ${e.status}` });
      } else {
        toast.error("Failed to update deal", { description: "Network error" });
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const stages = data.stages ?? [];
  const lostTotal =
    stages.find((s) => s.stage === "lost")?.total ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Deals" description="Pipeline board" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pipeline Total
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(data.pipelineTotal ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Open deals</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Won Total
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.wonTotal ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Closed-won</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Lost
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            {formatCurrency(lostTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Closed-lost</p>
        </Card>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.map((s) => {
          const col = stages.find((x) => x.stage === s);
          const items = col?.items ?? [];
          const total = col?.total ?? 0;
          return (
            <div key={s} className="flex w-72 shrink-0 flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={s} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                    No deals
                  </div>
                ) : (
                  items.map((d) => (
                    <DealCard
                      key={d.id}
                      deal={d}
                      stage={s}
                      onStageChange={changeStage}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Follow-ups
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function FollowupsSection() {
  const { data, loading, error, refetch } = useFetch<FollowupsResponse>(
    "/api/followups",
  );

  async function toggle(id: string, done: boolean) {
    try {
      await apiFetch(`/api/followups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      toast.success(done ? "Marked done" : "Reopened");
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Failed to update follow-up", { description: `HTTP ${e.status}` });
      } else {
        toast.error("Failed to update follow-up", { description: "Network error" });
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} />;

  const items = data?.items ?? [];

  // Sort: not-done first by dueDate asc, then done by dueDate asc.
  const sorted = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  if (sorted.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Follow-ups"
          description="Tasks tied to your leads"
        />
        <EmptyState
          icon={<ListTodo />}
          title="No follow-ups"
          description="When you schedule tasks on your leads, they will appear here."
        />
      </div>
    );
  }

  const today = startOfToday();
  function bucket(it: FollowupItem): "Overdue" | "Today" | "Upcoming" | "Completed" {
    if (it.done) return "Completed";
    const d = new Date(it.dueDate);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return "Overdue";
    if (d.getTime() === today.getTime()) return "Today";
    return "Upcoming";
  }

  const groups: { label: string; items: FollowupItem[] }[] = [
    { label: "Overdue", items: [] },
    { label: "Today", items: [] },
    { label: "Upcoming", items: [] },
    { label: "Completed", items: [] },
  ];
  for (const it of sorted) {
    const b = bucket(it);
    const g = groups.find((x) => x.label === b);
    if (g) g.items.push(it);
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Follow-ups"
        description="Tasks tied to your leads"
      />

      <div className="space-y-6">
        {visibleGroups.map((g) => (
          <div key={g.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{g.label}</h3>
              <Badge variant="secondary" className="font-mono">
                {g.items.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {g.items.map((it) => {
                const due = new Date(it.dueDate);
                const overdue =
                  !it.done &&
                  due.getTime() < today.getTime();
                return (
                  <Card key={it.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={it.done}
                        onCheckedChange={(v) =>
                          toggle(it.id, v === true)
                        }
                        className="mt-0.5"
                        aria-label="Toggle done"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            "text-sm",
                            it.done && "text-muted-foreground line-through",
                          )}
                        >
                          {it.task}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="font-normal">
                            {it.leadName}
                          </Badge>
                          <StatusBadge status={it.leadStatus} />
                          <span>{it.owner}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              overdue && "font-medium text-rose-600 dark:text-rose-400",
                            )}
                          >
                            <CalendarDays className="size-3" />
                            {formatDate(it.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Leave (request form with attachment + own requests table)
// ---------------------------------------------------------------------------

function prettifyLeaveType(t: string): string {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function LeaveSection() {
  const leaveFetch = useFetch<LeaveResponse>("/api/leave");
  const settingsFetch = useFetch<SettingsResponse>("/api/settings");
  const balances = parseLeaveBalances(settingsFetch.data?.items);

  const [leaveType, setLeaveType] = React.useState<string>("casual");
  const [startDate, setStartDate] = React.useState<string>(todayInputValue());
  const [endDate, setEndDate] = React.useState<string>(todayInputValue());
  const [reason, setReason] = React.useState<string>("");
  const [attachmentPath, setAttachmentPath] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveType) {
      toast.error("Pick a leave type.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Pick start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
          attachmentPath,
        }),
      });
      toast.success("Leave request submitted");
      setReason("");
      setLeaveType("casual");
      setStartDate(todayInputValue());
      setEndDate(todayInputValue());
      setAttachmentPath(null);
      void leaveFetch.refetch();
    } catch (e2) {
      if (e2 instanceof ApiError) {
        toast.error(`Failed (${e2.status})`);
      } else {
        toast.error("Network error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const loading = leaveFetch.loading && !leaveFetch.data;

  return (
    <div className="space-y-6">
      <SectionHeader title="My Leave" description="Request and track leave" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="px-6 py-5">
            <CardHeader className="px-0 pb-3">
              <CardTitle className="text-sm font-semibold">Request Leave</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger id="mkt-leave-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-leave-start">Start Date</Label>
                <Input
                  id="mkt-leave-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-leave-end">End Date</Label>
                <Input
                  id="mkt-leave-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-leave-reason">Reason</Label>
              <Textarea
                id="mkt-leave-reason"
                rows={3}
                placeholder="Briefly describe the reason for leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <FileUpload
                category="leave"
                accept=".pdf,image/*"
                label="Attachment (optional)"
                onUploaded={setAttachmentPath}
              />
              {attachmentPath ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <Paperclip className="size-3.5 shrink-0" />
                  <span className="truncate font-medium">{attachmentPath}</span>
                  <button
                    type="button"
                    onClick={() => setAttachmentPath(null)}
                    className="ml-auto text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-300/70 dark:hover:text-emerald-300"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                <Send className="size-4" />
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
        </div>

        {/* Leave balance card */}
        <Card className="h-fit px-6 py-5">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-sm font-semibold">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {settingsFetch.loading && !settingsFetch.data ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Casual", key: "casual" as const, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Sick", key: "sick" as const, color: "text-sky-600 dark:text-sky-400" },
                  { label: "Earned", key: "earned" as const, color: "text-amber-600 dark:text-amber-400" },
                  { label: "Unpaid", key: "unpaid" as const, color: "text-rose-600 dark:text-rose-400" },
                ] as const).map(({ label, key, color }) => (
                  <div
                    key={key}
                    className="flex flex-col rounded-lg border bg-muted/40 p-3"
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span className={`text-2xl font-bold tabular-nums ${color}`}>
                      {balances[key]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">days</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="px-0 py-0">
        <CardHeader className="flex-row items-center justify-between px-6 py-4">
          <CardTitle className="text-sm font-semibold">My Requests</CardTitle>
        </CardHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : leaveFetch.error ? (
            <div className="p-6">
              <ErrorState message={leaveFetch.error.message} />
            </div>
          ) : !leaveFetch.data || leaveFetch.data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Plane />}
                title="No leave requests"
                description="Submit your first leave request above."
              />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Decided At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveFetch.data.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {prettifyLeaveType(l.leaveType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(l.startDate)}</TableCell>
                    <TableCell>{formatDate(l.endDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.days}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>{l.approver ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.decidedAt ? formatDateTime(l.decidedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function MarketingDashboard({
  user,
  candidates,
}: {
  user: SessionUser;
  candidates: Candidate[];
}) {
  const [section, setSection] = React.useState<string>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setMobileSidebarOpen(true);
    window.addEventListener("implex-open-sidebar", handler);
    return () => window.removeEventListener("implex-open-sidebar", handler);
  }, []);

  const handleNavigate = React.useCallback((id: string) => {
    setSection(id);
    setMobileSidebarOpen(false);
  }, []);

  function renderSection() {
    switch (section) {
      case "overview":
        return <OverviewSection user={user} onNavigate={setSection} />;
      case "report":
        return <DailyReportSection onSubmitted={() => setSection("overview")} />;
      case "leads":
        return <LeadsSection />;
      case "deals":
        return <DealsSection />;
      case "followups":
        return <FollowupsSection />;
      case "leave":
        return <LeaveSection />;
      default:
        return <OverviewSection user={user} onNavigate={setSection} />;
    }
  }

  return (
    <AppShell
      user={user}
      candidates={candidates}
      navItems={MARKETING_NAV.map((n) => ({ id: n.id, label: n.label }))}
      onNavigate={setSection}
    >
      <div className="flex flex-1">
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar/30 p-4">
          <Sidebar
            items={MARKETING_NAV}
            active={section}
            onSelect={setSection}
          />
        </aside>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="px-0">
              <SheetTitle className="text-sm">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Pick a section to navigate.
              </SheetDescription>
            </SheetHeader>
            <Sidebar
              items={MARKETING_NAV}
              active={section}
              onSelect={handleNavigate}
            />
          </SheetContent>
        </Sheet>

        <div className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl p-4 md:p-8">{renderSection()}</div>
        </div>
      </div>
    </AppShell>
  );
}
