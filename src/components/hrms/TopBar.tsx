"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/hrms/ThemeToggle";
import { NotificationCenter } from "@/components/hrms/NotificationCenter";
import { RoleSwitcher } from "@/components/hrms/RoleSwitcher";
import CommandPalette from "@/components/hrms/CommandPalette";
import type { SessionUser, Candidate } from "@/lib/types";

type NavItem = { id: string; label: string };

/**
 * TopBar — sticky app header. Left: mobile menu trigger (dispatches a custom
 * `implex-open-sidebar` event the dashboard listens for) + brand. Center:
 * search trigger that opens the ⌘K CommandPalette for quick nav + actions.
 * Right: theme toggle, notifications, separator, role switcher.
 *
 * The palette is also opened globally via ⌘K (mac) / Ctrl+K (win/linux) — the
 * listener is registered in a useEffect to avoid hydration mismatch.
 */
export default function TopBar({
  user,
  candidates,
  navItems,
  onNavigate,
}: {
  user: SessionUser;
  candidates: Candidate[];
  navItems?: NavItem[];
  onNavigate?: (id: string) => void;
}) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  const handleMenu = React.useCallback(() => {
    window.dispatchEvent(new Event("implex-open-sidebar"));
  }, []);

  // Global ⌘K / Ctrl+K → open the command palette. Registered in an effect so
  // it only attaches on the client (no hydration mismatch).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleNavigate = React.useCallback(
    (id: string) => {
      onNavigate?.(id);
    },
    [onNavigate],
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Left — mobile menu + brand */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={handleMenu}
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <span
            aria-hidden
            className="size-6 rounded-md bg-primary"
          />
          <span className="text-sm font-semibold tracking-tight">
            Implex Edu
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            HRMS
          </span>
        </div>

        {/* Center — search trigger (opens ⌘K command palette). On mobile it
            flexes to fill remaining space (capped at max-w-md) so the right-
            hand actions never get pushed off-screen. */}
        <div className="mx-auto w-full max-w-md min-w-0 flex-1 sm:flex-none">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-9 w-full items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Open command palette"
          >
            <Search className="size-4" />
            <span className="truncate">
              Search{navItems && navItems.length > 0 ? " sections…" : "…"}
            </span>
            <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              /
            </kbd>
          </button>
        </div>

        {/* Right — actions */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <RoleSwitcher user={user} candidates={candidates} />
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        navItems={navItems ?? []}
        onNavigate={handleNavigate}
      />
    </header>
  );
}
