"use client";

import * as React from "react";
import type { SessionUser, Candidate } from "@/lib/types";
import TopBar from "@/components/hrms/TopBar";
import { Footer } from "@/components/hrms/Footer";

/**
 * AppShell — page-level layout wrapper. Renders the sticky TopBar, the main
 * content (the dashboard owns its own sidebar+content flex layout inside
 * `children`), and the sticky Footer (`mt-auto`).
 *
 * The root container uses `min-h-screen flex flex-col` so the Footer always
 * pins to the bottom regardless of content height.
 */
export default function AppShell({
  user,
  candidates,
  navItems,
  onNavigate,
  children,
}: {
  user: SessionUser;
  candidates: Candidate[];
  navItems?: { id: string; label: string }[];
  onNavigate?: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar
        user={user}
        candidates={candidates}
        navItems={navItems}
        onNavigate={onNavigate}
      />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
