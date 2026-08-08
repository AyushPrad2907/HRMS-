"use client";

import * as React from "react";
import { Menu, Search, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ThemeToggle } from "@/components/hrms/ThemeToggle";
import { NotificationCenter } from "@/components/hrms/NotificationCenter";
import { RoleSwitcher } from "@/components/hrms/RoleSwitcher";
import type { SessionUser, Candidate } from "@/lib/types";

/**
 * TopBar — sticky app header. Left: mobile menu trigger (dispatches a custom
 * `implex-open-sidebar` event the dashboard listens for) + brand. Center:
 * search trigger that opens a Command palette for quick nav. Right: theme
 * toggle, notifications, separator, role switcher.
 */
export default function TopBar({
  user,
  candidates,
  navItems,
  onNavigate,
}: {
  user: SessionUser;
  candidates: Candidate[];
  navItems?: { id: string; label: string }[];
  onNavigate?: (id: string) => void;
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  const handleMenu = React.useCallback(() => {
    window.dispatchEvent(new Event("implex-open-sidebar"));
  }, []);

  const handlePick = React.useCallback(
    (id: string) => {
      setSearchOpen(false);
      onNavigate?.(id);
    },
    [onNavigate]
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

        {/* Center — search */}
        <div className="mx-auto w-full max-w-md">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group flex h-9 w-full items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Search"
              >
                <Search className="size-4" />
                <span className="truncate">
                  Search{navItems && navItems.length > 0 ? " sections…" : "…"}
                </span>
                <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                  /
                </kbd>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(90vw,32rem)] p-0"
              align="center"
            >
              <Command>
                <CommandInput placeholder="Jump to…" />
                <CommandList>
                  <CommandEmpty>No matching sections.</CommandEmpty>
                  {navItems && navItems.length > 0 ? (
                    <CommandGroup heading="Navigate">
                      {navItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.label} ${item.id}`}
                          onSelect={() => handlePick(item.id)}
                          className="gap-2"
                        >
                          <Search className="size-3.5 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                          <CornerDownLeft className="size-3 text-muted-foreground opacity-60" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right — actions */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <RoleSwitcher user={user} candidates={candidates} />
        </div>
      </div>
    </header>
  );
}
