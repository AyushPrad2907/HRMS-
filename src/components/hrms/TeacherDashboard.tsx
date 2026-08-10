"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ClipboardList,
  History as HistoryIcon,
  CalendarCheck,
  Plane,
  Plus,
  Trash2,
  Check,
  Clock,
  LogIn,
  LogOut,
  FileCheck2,
  Send,
  ShieldAlert,
  CalendarDays,
  FileText,
  Paperclip,
} from "lucide-react";

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

// ---------------------------------------------------------------------------
// Types — mirror the API response shapes (kept local to this file).
// ---------------------------------------------------------------------------

type Kpi = { label: string; value: number; delta: number; hint: string };

type AttendanceToday = {
  status: string;
  checkIn: string | null;
  checkOut: string | null;
};

type OverviewData = {
  role: string;
  kpis: Kpi[];
  attendanceToday: AttendanceToday | null;
  hasTodayReport: boolean;
};

type TeacherClass = {
  id: string;
  batch: string;
  subject: string;
  topicsCovered: string;
  studentsAttended: number;
  assignmentsChecked: boolean;
  notesUrl: string | null;
};

type TeacherReportItem = {
  id: string;
  employeeId: string;
  employee: string;
  code: string;
  department: string;
  reportDate: string;
  submittedAt: string;
  notes: string | null;
  classes: TeacherClass[];
};

type AttendanceItem = {
  id: string;
  employeeId: string;
  employee: string;
  code: string;
  department: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
};

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

type SettingItem = { key: string; value: unknown };

type LeaveBalances = {
  casual: number;
  sick: number;
  earned: number;
  unpaid: number;
};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TEACHER_NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
  { id: "report", label: "Daily Report", icon: <ClipboardList /> },
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "attendance", label: "Attendance", icon: <CalendarCheck /> },
  { id: "leave", label: "Leave", icon: <Plane /> },
];

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "unpaid", label: "Unpaid" },
];

const EMPTY_BALANCES: LeaveBalances = { casual: 0, sick: 0, earned: 0, unpaid: 0 };

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettifyLeaveType(t: string): string {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as T;
      setData(j);
    } catch (e) {
      setError(e as Error);
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

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="px-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full max-w-[10rem]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared attendance buttons (used in Overview + Attendance sections)
// ---------------------------------------------------------------------------

function AttendanceActionButtons({
  attendanceToday,
  onDone,
}: {
  attendanceToday: AttendanceToday | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const checkedIn = !!attendanceToday?.checkIn;
  const checkedOut = !!attendanceToday?.checkOut;

  async function act(action: "check_in" | "check_out") {
    setBusy(true);
    try {
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      toast.success(action === "check_in" ? "Checked in" : "Checked out");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!attendanceToday || !checkedIn) {
    return (
      <Button onClick={() => act("check_in")} disabled={busy}>
        <LogIn className="size-4" />
        {busy ? "Checking in…" : "Check In"}
      </Button>
    );
  }
  if (checkedIn && !checkedOut) {
    return (
      <Button onClick={() => act("check_out")} disabled={busy}>
        <LogOut className="size-4" />
        {busy ? "Checking out…" : "Check Out"}
      </Button>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5">
      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      Day complete
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// 1. Overview
// ---------------------------------------------------------------------------

function OverviewSection({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate: (id: string) => void;
}) {
  const { data, loading, error, refetch } = useFetch<OverviewData>("/api/overview");

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <KpiGridSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return <ErrorState message={error?.message ?? "No data"} />;
  }

  const firstName = user.displayName.split(" ")[0] || user.displayName;

  return (
    <div className="space-y-6">
      <SectionHeader title={`Welcome, ${firstName}`} description="Your teaching summary" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            hint={kpi.hint}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Attendance card */}
        <Card className="px-6 py-5">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarCheck className="size-4 text-primary" />
              Today&apos;s Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            {data.attendanceToday ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={data.attendanceToday.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium tabular-nums">
                    {data.attendanceToday.checkIn
                      ? formatDateTime(data.attendanceToday.checkIn)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium tabular-nums">
                    {data.attendanceToday.checkOut
                      ? formatDateTime(data.attendanceToday.checkOut)
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t checked in today.
              </p>
            )}
            <AttendanceActionButtons
              attendanceToday={data.attendanceToday}
              onDone={refetch}
            />
          </CardContent>
        </Card>

        {/* Daily report card */}
        <Card className="px-6 py-5">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-primary" />
              Today&apos;s Daily Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            {data.hasTodayReport ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-4" />
                </span>
                <span className="font-medium">Submitted today</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t submitted a report for today yet.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {data.hasTodayReport ? (
                <Button variant="outline" onClick={() => onNavigate("history")}>
                  <HistoryIcon className="size-4" />
                  View History
                </Button>
              ) : (
                <Button onClick={() => onNavigate("report")}>
                  <ClipboardList className="size-4" />
                  Submit today&apos;s report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Daily Report
// ---------------------------------------------------------------------------

type ClassFormRow = {
  batch: string;
  subject: string;
  topicsCovered: string;
  studentsAttended: string;
  assignmentsChecked: boolean;
  notesUrl: string | null;
};

const EMPTY_CLASS_ROW: ClassFormRow = {
  batch: "",
  subject: "",
  topicsCovered: "",
  studentsAttended: "",
  assignmentsChecked: false,
  notesUrl: null,
};

function DailyReportSection({
  onSubmitted,
}: {
  onSubmitted: () => void;
}) {
  const [reportDate, setReportDate] = React.useState<string>(todayISODate());
  const [notes, setNotes] = React.useState<string>("");
  const [classes, setClasses] = React.useState<ClassFormRow[]>([
    { ...EMPTY_CLASS_ROW },
  ]);
  const [submitting, setSubmitting] = React.useState(false);

  function updateRow(i: number, patch: Partial<ClassFormRow>) {
    setClasses((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  }
  function addRow() {
    setClasses((prev) => [...prev, { ...EMPTY_CLASS_ROW }]);
  }
  function removeRow(i: number) {
    setClasses((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  function validate(): string | null {
    if (!reportDate) return "Pick a report date.";
    for (let i = 0; i < classes.length; i++) {
      const r = classes[i];
      if (!r.batch.trim()) return `Class #${i + 1}: batch is required.`;
      if (!r.subject.trim()) return `Class #${i + 1}: subject is required.`;
      if (!r.topicsCovered.trim()) return `Class #${i + 1}: topics covered is required.`;
      const n = Number(r.studentsAttended);
      if (!r.studentsAttended || !isFinite(n) || n <= 0)
        return `Class #${i + 1}: students attended must be a positive number.`;
    }
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        reportDate,
        notes: notes.trim() || null,
        classes: classes.map((c) => ({
          batch: c.batch.trim(),
          subject: c.subject.trim(),
          topicsCovered: c.topicsCovered.trim(),
          studentsAttended: Number(c.studentsAttended),
          assignmentsChecked: c.assignmentsChecked,
          notesUrl: c.notesUrl ?? null,
        })),
      };
      const r = await fetch("/api/teacher-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.status === 409) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(j?.error ?? "Report already submitted for this date.");
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      toast.success("Report submitted");
      setNotes("");
      setClasses([{ ...EMPTY_CLASS_ROW }]);
      setReportDate(todayISODate());
      onSubmitted();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Daily Report" description="Log the classes you taught today" />

      <Card className="px-6 py-5">
        <CardContent className="px-0 space-y-6">
          {/* Date + Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-date">Report Date</Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                max={todayISODate()}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-notes">Notes (optional)</Label>
              <Input
                id="report-notes"
                placeholder="Any general notes for the day"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Classes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Classes</h3>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="size-4" />
                Add Class
              </Button>
            </div>

            <div className="space-y-4">
              {classes.map((row, i) => (
                <Card key={i} className="px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Class #{i + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(i)}
                      disabled={classes.length === 1}
                      className="text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`batch-${i}`}>Batch</Label>
                      <Input
                        id={`batch-${i}`}
                        placeholder="e.g. Batch A"
                        value={row.batch}
                        onChange={(e) => updateRow(i, { batch: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`subject-${i}`}>Subject</Label>
                      <Input
                        id={`subject-${i}`}
                        placeholder="e.g. Algebra"
                        value={row.subject}
                        onChange={(e) => updateRow(i, { subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label htmlFor={`topics-${i}`}>Topics Covered</Label>
                      <Input
                        id={`topics-${i}`}
                        placeholder="e.g. Quadratic equations"
                        value={row.topicsCovered}
                        onChange={(e) =>
                          updateRow(i, { topicsCovered: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`students-${i}`}>Students Attended</Label>
                      <Input
                        id={`students-${i}`}
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.studentsAttended}
                        onChange={(e) =>
                          updateRow(i, { studentsAttended: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <Checkbox
                        id={`assignments-${i}`}
                        checked={row.assignmentsChecked}
                        onCheckedChange={(v) =>
                          updateRow(i, { assignmentsChecked: v === true })
                        }
                      />
                      <Label
                        htmlFor={`assignments-${i}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        Assignments checked
                      </Label>
                    </div>
                    <div className="flex items-end justify-start pb-0.5 sm:col-span-2 lg:col-span-2">
                      <FileUpload
                        category="report"
                        accept=".pdf,.txt"
                        buttonText="Notes"
                        onUploaded={(path) => updateRow(i, { notesUrl: path })}
                      />
                    </div>
                  </div>
                  {row.notesUrl ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <FileText className="size-3.5" />
                      <span className="truncate font-medium">{row.notesUrl}</span>
                      <button
                        type="button"
                        onClick={() => updateRow(i, { notesUrl: null })}
                        className="ml-auto text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-300/70 dark:hover:text-emerald-300"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              <Send className="size-4" />
              {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. History
// ---------------------------------------------------------------------------

function HistorySection() {
  const { data, loading, error } = useFetch<{ items: TeacherReportItem[] }>(
    "/api/teacher-reports",
  );
  const [openId, setOpenId] = React.useState<string | null>(null);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (error || !data) {
    return <ErrorState message={error?.message ?? "No data"} />;
  }

  const items = [...data.items].sort(
    (a, b) =>
      new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
  );

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Report History" description="Your past submissions" />
        <EmptyState
          icon={<ClipboardList />}
          title="No reports yet"
          description="Your submitted daily reports will show up here."
        />
      </div>
    );
  }

  const openItem = items.find((it) => it.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Report History" description="Your past submissions" />

      <div className="space-y-3">
        {items.map((r) => {
          const students = r.classes.reduce(
            (s, c) => s + (c.studentsAttended || 0),
            0,
          );
          return (
            <Card
              key={r.id}
              className="cursor-pointer px-6 py-4 transition-colors hover:bg-muted/30"
              onClick={() => setOpenId(r.id)}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(r.reportDate)}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {r.classes.length} {r.classes.length === 1 ? "class" : "classes"}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {students} students
                    </Badge>
                  </div>
                  {r.notes ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {r.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {formatDateTime(r.submittedAt)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!openItem} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {openItem ? (
            <>
              <SheetHeader className="px-0">
                <SheetTitle className="text-base">
                  Report · {formatDate(openItem.reportDate)}
                </SheetTitle>
                <SheetDescription>
                  Submitted {formatDateTime(openItem.submittedAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-0">
                {openItem.notes ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{openItem.notes}</p>
                  </div>
                ) : null}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Classes</h4>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Topics</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                          <TableHead className="text-center">Asgn.</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openItem.classes.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.batch}</TableCell>
                            <TableCell>{c.subject}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {c.topicsCovered}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.studentsAttended}
                            </TableCell>
                            <TableCell className="text-center">
                              {c.assignmentsChecked ? (
                                <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <span className="text-muted-foreground">✗</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {c.notesUrl ? (
                                <a
                                  href={c.notesUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                  <FileText className="size-3.5" />
                                  View notes
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Attendance
// ---------------------------------------------------------------------------

function AttendanceSection() {
  const { data, loading, error, refetch } = useFetch<{ items: AttendanceItem[] }>(
    "/api/attendance?days=14",
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }
  if (error || !data) {
    return <ErrorState message={error?.message ?? "No data"} />;
  }

  // Today = first item whose date matches today (server returns sorted desc).
  const todayStr = todayISODate();
  const todayItem =
    data.items.find(
      (a) => new Date(a.date).toISOString().slice(0, 10) === todayStr,
    ) ?? null;
  const attendanceToday: AttendanceToday | null = todayItem
    ? {
        status: todayItem.status,
        checkIn: todayItem.checkIn,
        checkOut: todayItem.checkOut,
      }
    : null;

  return (
    <div className="space-y-6">
      <SectionHeader title="My Attendance" description="Check in and view history" />

      {/* Today card */}
      <Card className="px-6 py-5">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          {attendanceToday ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <StatusBadge status={attendanceToday.status} />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Check-in
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {attendanceToday.checkIn
                    ? formatDateTime(attendanceToday.checkIn)
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Check-out
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {attendanceToday.checkOut
                    ? formatDateTime(attendanceToday.checkOut)
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t checked in today.
            </p>
          )}
          <AttendanceActionButtons
            attendanceToday={attendanceToday}
            onDone={refetch}
          />
        </CardContent>
      </Card>

      {/* History table */}
      <Card className="px-0 py-0">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No attendance records in the last 14 days.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {formatDate(a.date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a.checkIn ? formatDateTime(a.checkIn) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a.checkOut ? formatDateTime(a.checkOut) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Leave
// ---------------------------------------------------------------------------

function LeaveSection() {
  const leaveFetch = useFetch<{ items: LeaveItem[] }>("/api/leave");
  const settingsFetch = useFetch<{ items: SettingItem[] }>("/api/settings");

  const [leaveType, setLeaveType] = React.useState<string>("casual");
  const [startDate, setStartDate] = React.useState<string>(todayISODate());
  const [endDate, setEndDate] = React.useState<string>(todayISODate());
  const [reason, setReason] = React.useState<string>("");
  const [attachmentPath, setAttachmentPath] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const balances = parseLeaveBalances(settingsFetch.data?.items);

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
      const r = await fetch("/api/leave", {
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
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      toast.success("Leave request submitted");
      setReason("");
      setLeaveType("casual");
      setStartDate(todayISODate());
      setEndDate(todayISODate());
      setAttachmentPath(null);
      void leaveFetch.refetch();
    } catch (e2) {
      toast.error((e2 as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const loading = leaveFetch.loading && !leaveFetch.data;

  return (
    <div className="space-y-6">
      <SectionHeader title="My Leave" description="Request and track leave" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Request form */}
        <Card className="px-6 py-5 lg:col-span-2">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-sm font-semibold">Request Leave</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="leave-type">Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger id="leave-type" className="w-full">
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
                  <Label htmlFor="leave-start">Start Date</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="leave-end">End Date</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-reason">Reason</Label>
                <Textarea
                  id="leave-reason"
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

        {/* Balance card */}
        <Card className="px-6 py-5">
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-sm font-semibold">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {settingsFetch.loading && !settingsFetch.data ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <BalanceBox label="Casual" value={balances.casual} />
                <BalanceBox label="Sick" value={balances.sick} />
                <BalanceBox label="Earned" value={balances.earned} />
                <BalanceBox label="Unpaid" value={balances.unpaid} />
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Default annual entitlement.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests table */}
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

function BalanceBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">days</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function TeacherDashboard({
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
        return <DailyReportSection onSubmitted={() => setSection("history")} />;
      case "history":
        return <HistorySection />;
      case "attendance":
        return <AttendanceSection />;
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
      navItems={TEACHER_NAV.map((n) => ({ id: n.id, label: n.label }))}
      onNavigate={setSection}
    >
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar/30 p-4 md:flex">
          <Sidebar items={TEACHER_NAV} active={section} onSelect={setSection} />
        </aside>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="px-0">
              <SheetTitle className="text-sm">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Pick a section to navigate.
              </SheetDescription>
            </SheetHeader>
            <Sidebar items={TEACHER_NAV} active={section} onSelect={handleNavigate} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl p-4 md:p-8">{renderSection()}</div>
        </div>
      </div>
    </AppShell>
  );
}
