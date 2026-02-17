"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

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
  if (t.includes("CLAIM")) return "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20";
  if (t.includes("MATCH")) return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  if (t.includes("ADMIN")) return "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/20";
  return "bg-muted/70 text-muted-foreground ring-1 ring-black/5";
}

export function NotificationsList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load notifications.");
        return;
      }
      setUnreadCount(Number(data.unreadCount || 0));
      setItems(data.notifications || []);
    } catch {
      toast.error("Failed to load notifications.");
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
      const data = await res.json().catch(() => ({}));
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

  async function openNotification(n: Notif) {
    if (!n.href) return;

    const wasUnread = !n.is_read;

    // Optimistic UI
    if (wasUnread) {
      setItems((prev) =>
        prev.map((x) =>
          x.notification_id === n.notification_id ? { ...x, is_read: true } : x
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Fire-and-forget mark-one (standardized)
    fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationId: n.notification_id }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
          return;
        }
        // revert if failed
        if (wasUnread) {
          setItems((prev) =>
            prev.map((x) =>
              x.notification_id === n.notification_id ? { ...x, is_read: false } : x
            )
          );
          setUnreadCount((c) => c + 1);
        }
      })
      .catch(() => {
        if (wasUnread) {
          setItems((prev) =>
            prev.map((x) =>
              x.notification_id === n.notification_id ? { ...x, is_read: false } : x
            )
          );
          setUnreadCount((c) => c + 1);
        }
      });

    router.push(n.href);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <LoadingGrid count={4} className="gap-3" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        centered
        title="No notifications yet"
        description="When you submit a claim or staff approves/denies it, you’ll see updates here."
        icon={<CheckCheck className="size-5" />}
        actions={
          <>
            <Button className="rounded-2xl" variant="outline" onClick={load}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button className="rounded-2xl" asChild>
              <Link href="/found">Browse found items</Link>
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/75 p-3 ring-1 ring-black/5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280] ring-1 ring-black/5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                unreadCount > 0 ? "bg-[#7F0101]" : "bg-emerald-500"
              )}
            />
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </span>
          <span className="text-xs text-[#6B7280]">Latest 50 updates</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="rounded-2xl" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            className="rounded-2xl"
            variant="outline"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 size-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((n, idx) => {
          const pill = typePill(n.type);
          const when = fmt.format(new Date(n.created_at));

          const rowClass = cn(
            "group relative overflow-hidden rounded-3xl border-0 bg-white/92 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.06)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
            !n.is_read && "ring-[#7F0101]/20",
            !n.is_read &&
              "before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:bg-gradient-to-b before:from-[#7F0101] before:to-[#7F0101]/20",
            n.is_read && "opacity-90"
          );

          const content = (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] " +
                      pill
                    }
                  >
                    {n.type}
                  </span>
                  {!n.is_read ? (
                    <span className="rounded-full bg-[#7F0101]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7F0101] ring-1 ring-[#7F0101]/20">
                      Unread
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 text-[15px] font-semibold leading-tight text-[#111827]">
                  {n.title}
                </div>
                <div className="mt-1 text-sm text-[#6B7280] line-clamp-2">
                  {n.message}
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-[#F8F7F6] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#6B7280] ring-1 ring-black/5">
                {when}
              </div>
            </div>
          );

          return n.href ? (
            <motion.button
              key={n.notification_id}
              type="button"
              onClick={() => openNotification(n)}
              className={cn(rowClass, "w-full text-left")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
            >
              {content}
            </motion.button>
          ) : (
            <motion.div
              key={n.notification_id}
              className={rowClass}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
            >
              {content}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
