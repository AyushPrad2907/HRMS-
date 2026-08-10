"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

/**
 * Sidebar — pure nav list (no chrome). The parent (dashboard layout) decides
 * whether to wrap it in a fixed desktop aside or a mobile Sheet. Each item
 * is a ghost button; the active item gets `bg-primary/10 text-primary` plus
 * a left accent bar.
 */
export default function Sidebar({
  items,
  active,
  onSelect,
  className,
}: {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Primary">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative h-9 justify-start gap-3 px-3 text-sm font-normal text-muted-foreground",
              isActive &&
                "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            {isActive ? (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              />
            ) : null}
            {item.icon ? (
              <span className="[&_svg]:size-4">{item.icon}</span>
            ) : null}
            <span className="truncate">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
