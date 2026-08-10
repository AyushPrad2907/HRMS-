"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Plane,
  FileText,
  BarChart3,
  ScrollText,
  Settings as SettingsIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  UserPlus,
  FileCheck2,
  ClipboardList,
  Activity,
  ShieldAlert,
  Megaphone,
  Paperclip,
  Lock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
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
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  Badge,
} from "@/components/hrms/shared";
import BroadcastComposer from "@/components/hrms/BroadcastComposer";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SheetFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror the API response shapes (kept local to this file).
// ---------------------------------------------------------------------------

type Kpi = { label: string; value: number; delta: number; hint: string };
type ActivityItem = {
  id: string;
  activity: string;
  actor: string;
  at: string;
  meta?: string | null;
};

type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  designation: string;
  department: string;
  departmentId: string;
  employmentStatus: string;
  joinDate: string;
  manager: string | null;
  managerId: string | null;
  roles: { name: string; label: string }[];
  userId: string;
};

type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type Role = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  permissions: string[];
};

type Permission = { id: string; name: string; description: string | null };

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

type TeacherClass = {
  id: string;
  batch: string;
  subject: string;
  topicsCovered: string;
  studentsAttended: number;
  assignmentsChecked: boolean;
  notesUrl: string | null;
};

type MarketingCall = {
  id: string;
  contactName: string;
  contactPhone: string | null;
  outcome: string;
  notes: string | null;
};

type MarketingMeeting = {
  id: string;
  counterparty: string;
  purpose: string;
  outcome: string | null;
  durationMinutes: number;
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

type MarketingReportItem = {
  id: string;
  employeeId: string;
  employee: string;
  code: string;
  department: string;
  reportDate: string;
  submittedAt: string;
  notes: string | null;
  callsCount: number;
  meetingsCount: number;
  calls: MarketingCall[];
  meetings: MarketingMeeting[];
};

type UnifiedReport = {
  id: string;
  type: "teacher" | "marketing";
  employee: string;
  code: string;
  department: string;
  reportDate: string;
  submittedAt: string;
  notes: string | null;
  classes: TeacherClass[];
  calls: MarketingCall[];
  meetings: MarketingMeeting[];
};

type AuditItem = {
  id: string;
  actor: string;
  action: string;
  targetTable: string;
  targetId: string;
  beforeState: string | null;
  afterState: string | null;
  ipAddress: string | null;
  createdAt: string;
};

type Holiday = {
  id: string;
  name: string;
  holidayDate: string;
  description: string | null;
};

type SettingItem = { key: string; value: unknown };

type AnalyticsAttendanceTrendPoint = {
  date: string;
  present: number;
  absent: number;
  onLeave: number;
  halfDay: number;
};

type AnalyticsReportTrendPoint = {
  date: string;
  teacherReports: number;
  marketingReports: number;
};

type AnalyticsFunnel = {
  byStatus: { new: number; contacted: number; qualified: number; lost: number; converted: number };
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

type AnalyticsPerformer = {
  employeeId: string;
  name: string;
  role: string;
  metric: number;
  metricLabel: string;
};

type AnalyticsData = {
  attendanceTrend: AnalyticsAttendanceTrendPoint[];
  reportTrend: AnalyticsReportTrendPoint[];
  marketingFunnel: AnalyticsFunnel;
  departmentHeadcount: { department: string; count: number }[];
  topPerformers: AnalyticsPerformer[];
  leaveStats: {
    pending: number;
    approved: number;
    rejected: number;
    byType: { casual: number; sick: number; earned: number; unpaid: number };
  };
};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const HR_NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
  { id: "employees", label: "Employees", icon: <Users /> },
  { id: "attendance", label: "Attendance", icon: <CalendarCheck /> },
  { id: "leave", label: "Leave", icon: <Plane /> },
  { id: "reports", label: "Reports", icon: <FileText /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 /> },
  { id: "audit", label: "Audit Log", icon: <ScrollText /> },
  { id: "announce", label: "Announce", icon: <Megaphone /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

// Emerald / sky / amber / rose / violet — fixed hex for recharts SVG fills.
const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

const ATTENDANCE_STATUSES = ["present", "absent", "half_day", "on_leave", "holiday"] as const;
const EMPLOYEE_STATUSES = ["active", "on_leave_emp", "suspended", "offboarded"] as const;
const ALL_SENTINEL = "__all";

function shortDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d);
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

/** Card with a title and a fixed-height chart container. */
function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 px-6 py-5", className)}>
      <CardHeader className="px-0 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="px-0 text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
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
    </div>
  );
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

// ---------------------------------------------------------------------------
// 1. Overview
// ---------------------------------------------------------------------------

function OverviewSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { data, loading, error } = useFetch<{
    role: string;
    kpis: Kpi[];
    recentActivity: ActivityItem[];
  }>("/api/overview");

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error?.message ?? "No data"} />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Overview" description="Organization pulse at a glance" />

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

      <Card className="px-6 py-5">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onNavigate("employees")}>
              <UserPlus className="size-4" />
              Add Employee
            </Button>
            <Button variant="outline" onClick={() => onNavigate("leave")}>
              <FileCheck2 className="size-4" />
              Review Leave
            </Button>
            <Button variant="outline" onClick={() => onNavigate("reports")}>
              <ClipboardList className="size-4" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="px-6 py-5">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {data.recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="divide-y">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Activity className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.actor}</span>
                      <span className="text-muted-foreground"> · {a.activity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Employees
// ---------------------------------------------------------------------------

type EmployeeFormState = {
  displayName: string;
  email: string;
  password: string;
  employeeCode: string;
  departmentId: string;
  designation: string;
  roleId: string;
  joinDate: string;
  phone: string;
  bio: string;
};

const EMPTY_FORM: EmployeeFormState = {
  displayName: "",
  email: "",
  password: "",
  employeeCode: "",
  departmentId: "",
  designation: "",
  roleId: "",
  joinDate: "",
  phone: "",
  bio: "",
};

function EmployeesSection() {
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const url = `/api/employees?q=${encodeURIComponent(debouncedQ)}&dept=${encodeURIComponent(dept)}&status=${encodeURIComponent(status)}`;
  const { data, loading, error, refetch } = useFetch<{
    items: Employee[];
    canCreate: boolean;
    canEdit: boolean;
  }>(url);
  const { data: deptData } = useFetch<{ items: Department[] }>("/api/departments");
  const { data: roleData } = useFetch<{ roles: Role[]; permissions: Permission[] }>(
    "/api/roles"
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);
  const [form, setForm] = React.useState<EmployeeFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Employee | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!sheetOpen) return;
    if (editing) {
      const initialRoleId =
        roleData?.roles.find((r) => r.name === editing.roles[0]?.name)?.id ?? "";
      setForm({
        displayName: editing.name,
        email: editing.email,
        password: "",
        employeeCode: editing.employeeCode,
        departmentId: editing.departmentId,
        designation: editing.designation,
        roleId: initialRoleId,
        joinDate: toDateInputValue(editing.joinDate),
        phone: editing.phone ?? "",
        bio: editing.bio ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [sheetOpen, editing, roleData]);

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setSheetOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.displayName ||
      !form.email ||
      !form.employeeCode ||
      !form.departmentId ||
      !form.designation ||
      !form.roleId ||
      !form.joinDate
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!editing && form.password.trim().length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        displayName: form.displayName,
        email: form.email,
        employeeCode: form.employeeCode,
        departmentId: form.departmentId,
        designation: form.designation,
        roleId: form.roleId,
        joinDate: form.joinDate,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        ...(editing ? {} : { password: form.password }),
      };
      await apiFetch(
        editing ? `/api/employees/${editing.id}` : "/api/employees",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      toast.success(editing ? "Employee updated" : "Employee added");
      setSheetOpen(false);
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        const raw = e.message.replace(/^API \d+: /, "");
        let readable = `Failed (${e.status})`;
        try {
          const parsed = JSON.parse(raw) as { error?: string; message?: string };
          readable = parsed.error ?? parsed.message ?? readable;
        } catch {
          if (raw) readable = raw;
        }
        toast.error(readable);
      } else {
        toast.error("Network error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/employees/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`${deleteTarget.name} offboarded`);
      setDeleteTarget(null);
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Failed (${e.status})`);
      } else {
        toast.error("Network error");
      }
    } finally {
      setDeleting(false);
    }
  }

  const items = data?.items ?? [];
  const canCreate = data?.canCreate ?? false;
  const canEdit = data?.canEdit ?? false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Employees"
        description="Manage your workforce"
        action={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          ) : null
        }
      />

      <Card className="px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or email…"
              className="pl-9"
            />
          </div>
          <Select
            value={dept || ALL_SENTINEL}
            onValueChange={(v) => setDept(v === ALL_SENTINEL ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>All departments</SelectItem>
              {(deptData?.items ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status || ALL_SENTINEL}
            onValueChange={(v) => setStatus(v === ALL_SENTINEL ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>All statuses</SelectItem>
              {EMPLOYEE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "on_leave_emp" ? "On Leave" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading && !data ? (
        <SectionSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No employees"
          description="Try adjusting filters, or add a new employee."
          action={
            canCreate ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add Employee
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="gap-0 px-0 py-0">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          {emp.avatarUrl ? (
                            <AvatarImage src={emp.avatarUrl} alt={emp.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {initials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{emp.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.manager ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={emp.employmentStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {emp.roles.map((r) => (
                          <Badge key={r.name} variant="secondary" className="text-[10px]">
                            {r.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Pencil className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(emp)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(emp)}
                            >
                              <Trash2 className="size-4" />
                              Offboard
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit employee" : "Add employee"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Update profile and role assignment."
                : "Create a new employee record."}
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={submitForm}
            className="flex flex-1 flex-col gap-4 px-4 pb-4"
          >
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-display-name">Display name</Label>
                <Input
                  id="emp-display-name"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={!!editing}
                />
              </div>
              {editing ? (
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <Lock className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    Password can be reset via profile.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="emp-password" className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    Password
                  </Label>
                  <Input
                    id="emp-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Employee will log in with their email + this password.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-code">Employee code</Label>
                  <Input
                    id="emp-code"
                    value={form.employeeCode}
                    onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                    required
                    disabled={!!editing}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-join">Join date</Label>
                  <Input
                    id="emp-join"
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-dept">Department</Label>
                  <Select
                    value={form.departmentId || undefined}
                    onValueChange={(v) => setForm({ ...form, departmentId: v })}
                  >
                    <SelectTrigger id="emp-dept" className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(deptData?.items ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-role">Role</Label>
                  <Select
                    value={form.roleId || undefined}
                    onValueChange={(v) => setForm({ ...form, roleId: v })}
                  >
                    <SelectTrigger id="emp-role" className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(roleData?.roles ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-designation">Designation</Label>
                <Input
                  id="emp-designation"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-bio">Bio</Label>
                <Textarea
                  id="emp-bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <SheetFooter className="mt-auto flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Add employee"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <span className="font-medium">{deleteTarget?.name}</span> ({deleteTarget?.employeeCode})
              as offboarded. The record is retained for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Offboarding…" : "Offboard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Attendance
// ---------------------------------------------------------------------------

function AttendanceSection() {
  const { data, loading, error, refetch } = useFetch<{
    canOverride: boolean;
    items: AttendanceItem[];
  }>("/api/attendance?days=14");

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [overrideTarget, setOverrideTarget] = React.useState<AttendanceItem | null>(null);
  const [overrideStatus, setOverrideStatus] = React.useState<string>("present");
  const [overrideNote, setOverrideNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const items = (data?.items ?? []).filter((a) =>
    statusFilter ? a.status === statusFilter : true
  );

  async function submitOverride() {
    if (!overrideTarget) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          employeeId: overrideTarget.employeeId,
          status: overrideStatus,
          note: overrideNote || undefined,
        }),
      });
      toast.success("Attendance overridden");
      setOverrideTarget(null);
      setOverrideNote("");
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Failed (${e.status})`);
      } else {
        toast.error("Network error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Attendance" description="Last 14 days across the org" />

      <div className="flex items-center gap-2">
        <Select
          value={statusFilter || ALL_SENTINEL}
          onValueChange={(v) => setStatusFilter(v === ALL_SENTINEL ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SENTINEL}>All statuses</SelectItem>
            {ATTENDANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "on_leave" ? "On Leave" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !data ? (
        <SectionSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarCheck />} title="No attendance records" />
      ) : (
        <Card className="gap-0 px-0 py-0">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Note</TableHead>
                  {data?.canOverride ? <TableHead className="text-right">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.employee}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.code}</div>
                    </TableCell>
                    <TableCell>{a.department}</TableCell>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.checkIn ? formatDateTime(a.checkIn) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.checkOut ? formatDateTime(a.checkOut) : "—"}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                      {a.note ?? "—"}
                    </TableCell>
                    {data?.canOverride ? (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOverrideTarget(a);
                            setOverrideStatus(a.status);
                            setOverrideNote(a.note ?? "");
                          }}
                        >
                          Override
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog
        open={!!overrideTarget}
        onOpenChange={(o) => !o && setOverrideTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override attendance</DialogTitle>
            <DialogDescription>
              {overrideTarget?.employee} · {overrideTarget ? formatDate(overrideTarget.date) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="att-status">Status</Label>
              <Select
                value={overrideStatus}
                onValueChange={(v) => setOverrideStatus(v)}
              >
                <SelectTrigger id="att-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["present", "absent", "half_day", "on_leave"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "on_leave" ? "On Leave" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-note">Note</Label>
              <Input
                id="att-note"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Reason for override…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOverrideTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitOverride} disabled={submitting}>
              {submitting ? "Saving…" : "Save override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Leave
// ---------------------------------------------------------------------------

function LeaveSection() {
  const { data, loading, error, refetch } = useFetch<{
    canApprove: boolean;
    items: LeaveItem[];
  }>("/api/leave");

  const [deciding, setDeciding] = React.useState<string | null>(null);

  async function decide(id: string, decision: "approved" | "rejected") {
    setDeciding(id);
    try {
      await apiFetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      toast.success(`Leave ${decision}`);
      void refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Failed (${e.status})`);
      } else {
        toast.error("Network error");
      }
    } finally {
      setDeciding(null);
    }
  }

  if (loading && !data) return <SectionSkeleton rows={5} cols={5} />;
  if (error || !data) return <ErrorState message={error?.message ?? "No data"} />;

  const pending = data.items.filter((l) => l.status === "pending");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Leave Requests"
        description="Approve or reject pending requests"
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            <Badge variant="secondary" className="ml-1">
              {pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 ? (
            <EmptyState icon={<Plane />} title="No pending requests" />
          ) : (
            <div className="grid gap-4">
              {pending.map((l) => (
                <Card key={l.id} className="px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{l.employee}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {l.code}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {l.department}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {l.leaveType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.days} day{l.days > 1 ? "s" : ""}
                      </p>
                      {l.reason ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Reason:</span> {l.reason}
                        </p>
                      ) : null}
                      {l.attachmentPath ? (
                        <a
                          href={l.attachmentPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          <Paperclip className="size-3.5" />
                          View attachment
                        </a>
                      ) : null}
                    </div>
                    {data.canApprove ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(l.id, "approved")}
                          disabled={deciding === l.id}
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(l.id, "rejected")}
                          disabled={deciding === l.id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {data.items.length === 0 ? (
            <EmptyState icon={<Plane />} title="No leave requests" />
          ) : (
            <Card className="gap-0 px-0 py-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Decided</TableHead>
                      <TableHead>Attachment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium">{l.employee}</div>
                          <div className="font-mono text-xs text-muted-foreground">{l.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {l.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(l.startDate)} → {formatDate(l.endDate)}
                        </TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell>
                          <StatusBadge status={l.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.approver ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.decidedAt ? formatDateTime(l.decidedAt) : "—"}
                        </TableCell>
                        <TableCell>
                          {l.attachmentPath ? (
                            <a
                              href={l.attachmentPath}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                              <Paperclip className="size-3.5" />
                              View
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
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Reports
// ---------------------------------------------------------------------------

function ReportsSection() {
  const { data: teacherData, loading: teacherLoading } = useFetch<{
    items: TeacherReportItem[];
  }>("/api/teacher-reports");
  const { data: marketingData, loading: marketingLoading } = useFetch<{
    items: MarketingReportItem[];
  }>("/api/marketing-reports");

  const [tab, setTab] = React.useState<"all" | "teacher" | "marketing">("all");
  const [selected, setSelected] = React.useState<UnifiedReport | null>(null);

  const loading = (teacherLoading && !teacherData) || (marketingLoading && !marketingData);

  const unified: UnifiedReport[] = React.useMemo(() => {
    const teacher: UnifiedReport[] = (teacherData?.items ?? []).map((t) => ({
      id: `t-${t.id}`,
      type: "teacher" as const,
      employee: t.employee,
      code: t.code,
      department: t.department,
      reportDate: t.reportDate,
      submittedAt: t.submittedAt,
      notes: t.notes,
      classes: t.classes,
      calls: [],
      meetings: [],
    }));
    const marketing: UnifiedReport[] = (marketingData?.items ?? []).map((m) => ({
      id: `m-${m.id}`,
      type: "marketing" as const,
      employee: m.employee,
      code: m.code,
      department: m.department,
      reportDate: m.reportDate,
      submittedAt: m.submittedAt,
      notes: m.notes,
      classes: [],
      calls: m.calls,
      meetings: m.meetings,
    }));
    return [...teacher, ...marketing].sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );
  }, [teacherData, marketingData]);

  const filtered = unified.filter((r) => (tab === "all" ? true : r.type === tab));

  function summary(r: UnifiedReport): string {
    if (r.type === "teacher") {
      const students = r.classes.reduce((s, c) => s + c.studentsAttended, 0);
      return `${r.classes.length} classes · ${students} students`;
    }
    return `${r.calls.length} calls · ${r.meetings.length} meetings`;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Daily Reports" description="Cross-department submissions" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="teacher">Teacher</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <SectionSkeleton rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<FileText />} title="No reports" />
          ) : (
            <Card className="gap-0 px-0 py-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDate(r.reportDate)}
                        </TableCell>
                        <TableCell>
                          {r.type === "teacher" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Teacher
                            </Badge>
                          ) : (
                            <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              Marketing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.employee}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{summary(r)}</TableCell>
                        <TableCell className="max-w-[20rem] truncate text-muted-foreground">
                          {r.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selected?.type === "teacher" ? "Teacher report" : "Marketing report"}
            </SheetTitle>
            <SheetDescription>
              {selected ? `${selected.employee} · ${formatDate(selected.reportDate)}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
              {selected.notes ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <span className="font-medium">Notes:</span> {selected.notes}
                </div>
              ) : null}

              {selected.type === "teacher" ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Classes ({selected.classes.length})</h4>
                  {selected.classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No classes recorded.</p>
                  ) : (
                    selected.classes.map((c) => (
                      <Card key={c.id} className="gap-1 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {c.batch} · {c.subject}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {c.studentsAttended} students
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.topicsCovered}</p>
                        <p className="text-xs text-muted-foreground">
                          Assignments: {c.assignmentsChecked ? "Checked" : "Not checked"}
                        </p>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Calls ({selected.calls.length})</h4>
                    {selected.calls.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No calls recorded.</p>
                    ) : (
                      selected.calls.map((c) => (
                        <Card key={c.id} className="gap-1 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{c.contactName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {c.outcome}
                            </Badge>
                          </div>
                          {c.contactPhone ? (
                            <p className="font-mono text-xs text-muted-foreground">{c.contactPhone}</p>
                          ) : null}
                          {c.notes ? (
                            <p className="text-sm text-muted-foreground">{c.notes}</p>
                          ) : null}
                        </Card>
                      ))
                    )}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Meetings ({selected.meetings.length})</h4>
                    {selected.meetings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meetings recorded.</p>
                    ) : (
                      selected.meetings.map((m) => (
                        <Card key={m.id} className="gap-1 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{m.counterparty}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {m.durationMinutes} min
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{m.purpose}</p>
                          {m.outcome ? (
                            <p className="text-xs text-muted-foreground">Outcome: {m.outcome}</p>
                          ) : null}
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Analytics
// ---------------------------------------------------------------------------

function AnalyticsSection() {
  const { data, loading, error } = useFetch<AnalyticsData>("/api/analytics");

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error?.message ?? "No data"} />;
  }

  const funnelData = [
    { name: "New", count: data.marketingFunnel.byStatus.new },
    { name: "Contacted", count: data.marketingFunnel.byStatus.contacted },
    { name: "Qualified", count: data.marketingFunnel.byStatus.qualified },
    { name: "Lost", count: data.marketingFunnel.byStatus.lost },
    { name: "Converted", count: data.marketingFunnel.byStatus.converted },
  ];

  const leavePieData = [
    { name: "Casual", value: data.leaveStats.byType.casual, fill: COLORS[0] },
    { name: "Sick", value: data.leaveStats.byType.sick, fill: COLORS[3] },
    { name: "Earned", value: data.leaveStats.byType.earned, fill: COLORS[1] },
    { name: "Unpaid", value: data.leaveStats.byType.unpaid, fill: COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics" description="Trends and performance across the org" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Attendance Trend"
          description="Last 14 days, by status"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.attendanceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" stackId="a" name="Present" fill={COLORS[0]} />
              <Bar dataKey="absent" stackId="a" name="Absent" fill={COLORS[3]} />
              <Bar dataKey="onLeave" stackId="a" name="On Leave" fill={COLORS[1]} />
              <Bar dataKey="halfDay" stackId="a" name="Half Day" fill={COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reports Trend" description="Last 14 days, by type">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.reportTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="teacherReports"
                name="Teacher"
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="marketingReports"
                name="Marketing"
                stroke={COLORS[4]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Marketing Funnel" description="Leads by status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Headcount" description="Active employees per dept">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.departmentHeadcount}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="department"
                width={110}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top Performers" description="Last 14 days, combined">
          {data.topPerformers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity in window.</p>
          ) : (
            <ol className="space-y-2">
              {data.topPerformers.map((p, i) => (
                <li
                  key={p.employeeId}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.role} · {p.metricLabel}
                    </div>
                  </div>
                  <span className="font-mono text-sm tabular-nums">{p.metric}</span>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>

        <ChartCard title="Leave Stats" description="By type & status">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              {leavePieData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No leave recorded.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={leavePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {leavePieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3">
              <StatBox label="Pending" value={data.leaveStats.pending} tone="amber" />
              <StatBox label="Approved" value={data.leaveStats.approved} tone="emerald" />
              <StatBox label="Rejected" value={data.leaveStats.rejected} tone="rose" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-xs sm:grid-cols-4">
            <Stat label="Revenue Won" value={formatCurrency(data.marketingFunnel.revenueWon)} />
            <Stat label="Pipeline" value={formatCurrency(data.marketingFunnel.pipelineValue)} />
            <Stat
              label="Deals Won"
              value={String(data.marketingFunnel.dealsByStage.won)}
            />
            <Stat
              label="Deals Lost"
              value={String(data.marketingFunnel.dealsByStage.lost)}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-md p-3 text-center", toneClass)}>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Audit Log
// ---------------------------------------------------------------------------

function AuditSection() {
  const { data, loading, error } = useFetch<{ items: AuditItem[] }>("/api/audit");
  const [search, setSearch] = React.useState("");

  const items = (data?.items ?? []).filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.actor.toLowerCase().includes(q) ||
      a.targetTable.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit Log" description="Immutable record of sensitive actions" />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action, actor or target…"
          className="pl-9"
        />
      </div>

      {loading && !data ? (
        <SectionSkeleton rows={8} cols={5} />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No audit entries" />
      ) : (
        <Card className="gap-0 px-0 py-0">
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>After State</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(a.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{a.actor}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {a.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.targetTable}:{a.targetId.slice(-6)}
                    </TableCell>
                    <TableCell className="max-w-[20rem]">
                      {a.afterState ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View JSON
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[10px]">
                            {prettyJson(a.afterState)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// 8. Settings
// ---------------------------------------------------------------------------

function SettingsSection() {
  const { data: deptData } = useFetch<{ items: Department[] }>("/api/departments");
  const { data: roleData } = useFetch<{ roles: Role[]; permissions: Permission[] }>(
    "/api/roles"
  );
  const { data: holidayData } = useFetch<{ items: Holiday[] }>("/api/holidays");
  const { data: settingsData, refetch: refetchSettings } = useFetch<{
    items: SettingItem[];
  }>("/api/settings");

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Organization configuration" />

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="org">Org Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          {!deptData ? (
            <SectionSkeleton rows={4} cols={3} />
          ) : deptData.items.length === 0 ? (
            <EmptyState title="No departments" />
          ) : (
            <Card className="gap-0 px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptData.items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.description ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles">
          {!roleData ? (
            <SectionSkeleton rows={4} cols={6} />
          ) : (
            <Card className="gap-0 px-0 py-0">
              <div className="max-h-[70vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-card">Role</TableHead>
                      {roleData.permissions.map((p) => (
                        <TableHead key={p.id} className="text-center">
                          <span className="font-mono text-[10px]">{p.name}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleData.roles.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="sticky left-0 z-10 bg-card">
                          <div className="font-medium">{r.label}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {r.name}
                          </div>
                        </TableCell>
                        {roleData.permissions.map((p) => {
                          const granted = r.permissions.includes(p.name);
                          return (
                            <TableCell key={p.id} className="text-center">
                              {granted ? (
                                <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="holidays">
          {!holidayData ? (
            <SectionSkeleton rows={4} cols={2} />
          ) : holidayData.items.length === 0 ? (
            <EmptyState title="No holidays" />
          ) : (
            <Card className="px-6 py-5">
              <ul className="divide-y">
                {holidayData.items.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{h.name}</p>
                      {h.description ? (
                        <p className="text-xs text-muted-foreground">{h.description}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {formatDate(h.holidayDate)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="org">
          {!settingsData ? (
            <SectionSkeleton rows={4} cols={2} />
          ) : (
            <OrgSettingsTab
              items={settingsData.items}
              onSaved={() => void refetchSettings()}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrgSettingsTab({
  items,
  onSaved,
}: {
  items: SettingItem[];
  onSaved: () => void;
}) {
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Initialize edit buffer from items.
    const next: Record<string, string> = {};
    for (const it of items) next[it.key] = String(it.value ?? "");
    setEdits(next);
  }, [items]);

  async function save(key: string) {
    setSaving(key);
    const raw = edits[key] ?? "";
    let value: unknown = raw;
    if (raw !== "" && !isNaN(Number(raw))) value = Number(raw);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      toast.success(`Saved ${key}`);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Failed (${e.status})`);
      } else {
        toast.error("Network error");
      }
    } finally {
      setSaving(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState title="No settings" description="No organization settings configured." />;
  }

  return (
    <Card className="px-6 py-5">
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="sm:w-64">
              <p className="font-mono text-sm font-medium">{it.key}</p>
            </div>
            <Input
              value={edits[it.key] ?? ""}
              onChange={(e) => setEdits({ ...edits, [it.key]: e.target.value })}
              className="sm:flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => save(it.key)}
              disabled={saving === it.key}
              className="sm:w-24"
            >
              {saving === it.key ? "Saving…" : "Save"}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function HrDashboard({
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
        return <OverviewSection onNavigate={setSection} />;
      case "employees":
        return <EmployeesSection />;
      case "attendance":
        return <AttendanceSection />;
      case "leave":
        return <LeaveSection />;
      case "reports":
        return <ReportsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "audit":
        return <AuditSection />;
      case "announce":
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Broadcast"
              description="Send announcements to roles or departments"
            />
            <BroadcastComposer onSent={() => { /* optionally refetch notifications */ }} />
          </div>
        );
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection onNavigate={setSection} />;
    }
  }

  return (
    <AppShell
      user={user}
      candidates={candidates}
      navItems={HR_NAV.map((n) => ({ id: n.id, label: n.label }))}
      onNavigate={setSection}
    >
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar/30 p-4 md:flex">
          <Sidebar items={HR_NAV} active={section} onSelect={setSection} />
        </aside>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="px-0">
              <SheetTitle className="text-sm">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Pick a section to navigate.
              </SheetDescription>
            </SheetHeader>
            <Sidebar items={HR_NAV} active={section} onSelect={handleNavigate} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl p-4 md:p-8">{renderSection()}</div>
        </div>
      </div>
    </AppShell>
  );
}
