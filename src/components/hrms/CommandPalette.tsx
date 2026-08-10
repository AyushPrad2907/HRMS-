"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  CornerDownLeft,
  RefreshCw,
  Search,
  SunMoon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type NavItem = { id: string; label: string };

/**
 * CommandPalette — ⌘K / Ctrl+K command palette.
 *
 * Controlled component: visibility is driven entirely by `open` / `onOpenChange`.
 * The global ⌘K listener lives in the parent (TopBar) so it can be wired to the
 * same state without prop-drilling through the dialog portal.
 *
 * Groups:
 *   - Navigate: one item per navItem (Enter / click → onNavigate(id) + close)
 *   - Actions:  Toggle theme (next-themes), Reload page (window.location.reload)
 *   - Help:     a disabled hint reminding the user that Esc closes the dialog
 *
 * cmdk handles arrow/enter/escape natively; fuzzy filtering is built in via
 * CommandInput + CommandList + CommandEmpty.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  navItems,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  navItems: NavItem[];
  onNavigate: (id: string) => void;
}): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleNavigate = React.useCallback(
    (id: string) => {
      onNavigate(id);
      close();
    },
    [onNavigate, close],
  );

  const toggleTheme = React.useCallback(() => {
    // resolvedTheme is undefined during SSR but the dialog is only ever opened
    // client-side via a user gesture, so it is safe to read here.
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    close();
  }, [resolvedTheme, setTheme, close]);

  const reloadPage = React.useCallback(() => {
    close();
    // Defer so the dialog can finish closing before the navigation fires.
    window.setTimeout(() => window.location.reload(), 0);
  }, [close]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[15vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Search sections, run actions, and discover shortcuts.
          </DialogDescription>
        </DialogHeader>

        <Command
          className="[&_[cmdk-group]]:px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <CommandInput placeholder="Type a command or search…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No results found.</CommandEmpty>

            {navItems.length > 0 ? (
              <CommandGroup heading="Navigate">
                {navItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.id}`}
                    onSelect={() => handleNavigate(item.id)}
                    className="gap-2"
                  >
                    <Search className="size-4 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    <CornerDownLeft className="size-3 text-muted-foreground opacity-60" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                value="toggle theme light dark mode appearance"
                onSelect={toggleTheme}
                className="gap-2"
              >
                <SunMoon className="size-4 text-emerald-600 dark:text-emerald-500" />
                <span className="flex-1">Toggle theme</span>
              </CommandItem>
              <CommandItem
                value="reload page refresh browser"
                onSelect={reloadPage}
                className="gap-2"
              >
                <RefreshCw className="size-4 text-muted-foreground" />
                <span className="flex-1">Reload page</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Help">
              <CommandItem disabled className="gap-2">
                <span className="flex-1 text-muted-foreground">
                  Press{" "}
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Esc
                  </kbd>{" "}
                  to close
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
