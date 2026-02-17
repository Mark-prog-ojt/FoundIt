"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";

type Notif = {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  href: string | null;
  is_read: boolean;
  created_at: string;
};

function typePill(type: string) {
  const t = type.toUpperCase();
  if (t.includes("CLAIM")) return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  if (t.includes("MATCH")) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (t.includes("ADMIN")) return "bg-violet-500/10 text-violet-700 border-violet-500/20";
  return "bg-muted/70 text-muted-foreground border-border/60";
}

export function NotificationsBell({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "2-digit",
      }),
    []
  );

  async function load() {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=25", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) return;

      setUnreadCount(Number(data.unreadCount || 0));
      setItems(data.notifications || []);
    } catch {
      // silent for polling
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to mark as read.");
        return;
      }
      setUnreadCount(Number(data.unreadCount || 0));
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All caught up.");
    } catch {
      toast.error("Failed to mark as read.");
    }
  }

  async function markOneRead(notificationId: number) {
    // Optimistic UI: update immediately
    setItems((prev) =>
      prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        // revert if server rejected
        await load();
      } else {
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {
      // revert on failure
      await load();
    }
  }

  // Poll for updates when logged in (and refresh on focus)
  useEffect(() => {
    if (!isLoggedIn) return;

    let id: number | null = null;

    const start = () => {
      if (id != null) return;
      id = window.setInterval(() => {
        // if popover is open, we already refresh on open; avoid flicker
        if (!open) load();
      }, 8000);
    };

    const stop = () => {
      if (id == null) return;
      window.clearInterval(id);
      id = null;
    };

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    start();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, open]);

// Refresh when opened
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!isLoggedIn) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex size-10 items-center justify-center rounded-2xl border bg-background/60 backdrop-blur transition hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          <AnimatePresence>
            {unreadCount > 0 ? (
              <motion.span
                key="badge"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border bg-foreground px-1 text-[10px] font-semibold text-background"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] rounded-3xl p-0">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="mr-2 size-4" />
              Mark all
            </Button>
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-[360px]">
          <div className="p-2">
            {loading && items.length === 0 ? (
              <LoadingGrid count={2} className="gap-2" cardClassName="bg-white/70 shadow-none" />
            ) : items.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="When something important happens (claims, approvals, matches), you’ll see it here."
                className="bg-white/70 shadow-none p-4"
              />
            ) : (
              <div className="grid gap-2">
                {items.map((n) => {
                  const when = fmt.format(new Date(n.created_at));
                  const pill = typePill(n.type);

                  const content = (
                    <div
                      className={
                        "rounded-2xl border-0 bg-white/92 p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(0,0,0,0.08)] " +
                        (n.is_read ? "opacity-80" : "")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={"rounded-xl border px-2 py-0.5 text-[10px] font-medium " + pill}>
                              {n.type}
                            </span>
                            {!n.is_read ? (
                              <Badge className="rounded-xl" variant="secondary">
                                New
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 font-semibold leading-tight">{n.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {n.message}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">{when}</div>
                      </div>
                    </div>
                  );

                  return n.href ? (
                    <Link key={n.notification_id} href={n.href} onClick={() => {
                        if (!n.is_read) markOneRead(n.notification_id);
                        setOpen(false);
                      }}>
                      {content}
                    </Link>
                  ) : (
                    <div key={n.notification_id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3">
          <Button className="w-full rounded-2xl" variant="outline" asChild>
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
