// Shared types for client + server.
// Importing from "@/lib/auth/session" pulls in next/headers (server-only),
// so client components should import these types from here instead.

export type SessionUser = {
  employeeId: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  designation: string;
  departmentId: string;
  departmentName: string;
  employeeCode: string;
  roles: string[];
  permissions: string[];
};

export type Candidate = {
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  roles: string[];
  avatarUrl: string | null;
  employeeCode: string;
};

export type Kpi = {
  label: string;
  value: number;
  delta: number;
  hint: string;
};
