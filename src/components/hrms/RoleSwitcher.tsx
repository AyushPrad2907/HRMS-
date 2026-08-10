"use client";

import * as React from "react";
import { ChevronsUpDown, Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionUser, Candidate } from "@/lib/types";
import ProfileSheet from "@/components/hrms/ProfileSheet";

/**
 * RoleSwitcher — dropdown from the TopBar avatar that lets the demo user
 * switch the active employee (and therefore roles/permissions). Posts to
 * /api/session with `{ employeeId }` then reloads the page to refresh
 * server-fetched session data.
 */
export function RoleSwitcher({
  user,
  candidates,
}: {
  user: SessionUser;
  candidates: Candidate[];
}) {
  const [switching, setSwitching] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const key = c.roles[0] ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [candidates]);

  const initials = React.useMemo(() => {
    const parts = (user.displayName || user.email || "?").trim().split(/\s+/);
    return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }, [user.displayName, user.email]);

  async function handleSwitch(employeeId: string) {
    if (switching) return;
    setSwitching(true);
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
    } catch {
      // ignore — reload will still surface server state
    } finally {
      window.location.reload();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-1.5 sm:px-2"
          aria-label="Switch role"
        >
          <Avatar className="size-7">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">
              {user.displayName}
            </span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {user.designation}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-medium">{user.displayName}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {user.designation} · {user.departmentName}
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {user.employeeCode}
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <Badge
                key={r}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {r}
              </Badge>
            ))}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setProfileOpen(true)}
          className="gap-2 py-2"
        >
          <User className="size-4 text-primary" />
          <span className="flex-1 text-sm">View profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          <div className="pr-1">
            {grouped.map(([role, list]) => (
              <React.Fragment key={role}>
                <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {role}
                </DropdownMenuLabel>
                {list.map((c) => {
                  const active = c.employeeId === user.employeeId;
                  return (
                    <DropdownMenuItem
                      key={c.employeeId}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (!active) void handleSwitch(c.employeeId);
                      }}
                      className="gap-2 py-2"
                    >
                      <Avatar className="size-6">
                        {c.avatarUrl ? (
                          <AvatarImage src={c.avatarUrl} alt={c.name} />
                        ) : null}
                        <AvatarFallback className="bg-muted text-[10px]">
                          {(c.name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">
                        <span className="block text-sm leading-tight">
                          {c.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.designation} · {c.department}
                        </span>
                      </span>
                      {active ? (
                        <Check className="size-4 text-primary" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </React.Fragment>
            ))}
            {grouped.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No switchable candidates.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </DropdownMenu>
  );
}

export default RoleSwitcher;
