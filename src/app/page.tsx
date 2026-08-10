"use client";

import { useEffect, useState } from "react";
import AuthScreen from "@/components/hrms/AuthScreen";
import HrDashboard from "@/components/hrms/HrDashboard";
import MarketingDashboard from "@/components/hrms/MarketingDashboard";
import TeacherDashboard from "@/components/hrms/TeacherDashboard";
import { Card } from "@/components/ui/card";
import type { Candidate, SessionUser } from "@/lib/types";

type SessionResponse = {
  user: SessionUser | null;
  candidates: Candidate[];
};

export default function Page() {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((r) => {
        if (!r.ok) throw new Error(`session ${r.status}`);
        return r.json() as Promise<SessionResponse>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-1">
          <p className="text-base font-medium">Failed to load.</p>
          <p className="text-sm text-muted-foreground">Please refresh the page.</p>
        </div>
      </div>
    );
  }

  if (!data) return <LoadingScreen />;

  const { user, candidates } = data;

  if (!user) {
    return (
      <AuthScreen onAuthenticated={(u, c) => setData({ user: u, candidates: c })} />
    );
  }

  if (user.roles.includes("hr_admin")) {
    return <HrDashboard user={user} candidates={candidates} />;
  }
  if (user.roles.includes("teacher")) {
    return <TeacherDashboard user={user} candidates={candidates} />;
  }
  if (user.roles.includes("marketing")) {
    return <MarketingDashboard user={user} candidates={candidates} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="space-y-1">
        <p className="text-base font-medium">No dashboard for your role.</p>
        <p className="text-sm text-muted-foreground">
          Your roles ({user.roles.join(", ") || "none"}) are not configured.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="flex flex-col items-center gap-4 px-10 py-12 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md animate-pulse">
            <span className="text-lg font-bold">I</span>
          </div>
          <div className="text-xl font-semibold tracking-tight">
            Implex <span className="text-emerald-600">Edu</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading HRMS…</span>
        </div>
      </Card>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-emerald-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
