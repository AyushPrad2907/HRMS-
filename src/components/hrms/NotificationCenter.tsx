"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/components/hrms/shared";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type FeedResponse = {
  items: NotificationItem[];
  unread: number;
};

/**
 * NotificationCenter — bell icon with unread count badge. Opens a dropdown
 * with the user's recent notification feed (polled every 30s). Includes a
 * "Mark all read" action that PATCHes /api/notifications.
 */
export function NotificationCenter() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [marking, setMarking] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const fetchFeed = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as FeedResponse;
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // silent — UI will just show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchFeed();
    const t = window.setInterval(() => {
      void fetchFeed();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [fetchFeed]);

  async function handleMarkAll() {
    setMarking(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
        );
        setUnread(0);
      }
    } finally {
      setMarking(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 ? (
              <Badge variant="secondary" className="text-[10px]">
                {unread} new
              </Badge>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={marking || unread === 0}
            onClick={handleMarkAll}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          <div className="flex flex-col">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              items.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-2.5 border-b px-3 py-2.5 last:border-b-0",
                      isUnread && "bg-primary/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        isUnread ? "bg-primary" : "bg-transparent"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;
