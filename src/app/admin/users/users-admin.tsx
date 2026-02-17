"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserRow = {
  user_id: number;
  full_name: string;
  id_number: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
  status: string;
  date_registered: string;
  role: { role_name: string };
};

type Session = {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
};

const ROLE_OPTIONS = ["USER", "STAFF", "ADMIN"] as const;
// ✅ match DB values
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"] as const;

function initials(value: string) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function UsersAdmin() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<UserRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Local edits (by user_id)
  const [draftRole, setDraftRole] = useState<Record<number, string>>({});
  const [draftStatus, setDraftStatus] = useState<Record<number, string>>({});

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // ✅ know “self” so we can disable editing your own account
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const s = (data?.session ?? null) as Session | null;
        if (s?.userId) setMyUserId(Number(s.userId));
      } catch {
        // ignore
      }
    })();
  }, []);

  async function load(nextPage: number, nextQ: string) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", "20");
      if (nextQ) sp.set("q", nextQ);

      const res = await fetch(`/api/admin/users/list?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load users.");
        return;
      }

      setItems(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      // Seed drafts from fetched rows (don’t overwrite if user already edited)
      setDraftRole((prev) => {
        const next = { ...prev };
        for (const u of data.items || []) {
          if (next[u.user_id] == null) next[u.user_id] = u.role?.role_name || "USER";
        }
        return next;
      });

      setDraftStatus((prev) => {
        const next = { ...prev };
        for (const u of data.items || []) {
          if (next[u.user_id] == null) next[u.user_id] = u.status || "ACTIVE";
        }
        return next;
      });
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  function isLocked(u: UserRow) {
    const currentRole = String(u.role?.role_name || "").toUpperCase();
    const isAdminAccount = currentRole === "ADMIN";
    const isSelf = myUserId != null && Number(u.user_id) === Number(myUserId);
    return isAdminAccount || isSelf;
  }

  async function saveUser(userId: number) {
    const row = items.find((x) => x.user_id === userId);
    if (row && isLocked(row)) {
      toast.error("This account is protected and cannot be edited here.");
      return;
    }

    const roleName = String(draftRole[userId] || "").toUpperCase();
    const status = String(draftStatus[userId] || "").toUpperCase();

    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, roleName, status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Save failed.");
        return;
      }

      toast.success("Saved.");

      // Update visible row so it matches DB without full refresh
      setItems((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                status: data.updated?.status ?? status,
                role: { role_name: data.updated?.role?.role_name ?? roleName },
              }
            : u
        )
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  function isDirty(u: UserRow) {
    const r = String(draftRole[u.user_id] ?? u.role.role_name).toUpperCase();
    const s = String(draftStatus[u.user_id] ?? u.status).toUpperCase();
    return r !== String(u.role.role_name).toUpperCase() || s !== String(u.status).toUpperCase();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-[360px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, ID…"
            className="rounded-2xl pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>
      </div>

      {loading ? (
        <LoadingGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try changing your search keywords."
          icon={<Search className="size-5" />}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((u, idx) => {
            const dirty = isDirty(u);
            const locked = isLocked(u);

            const roleVal = String(draftRole[u.user_id] ?? u.role.role_name).toUpperCase();
            const statusVal = String(draftStatus[u.user_id] ?? u.status).toUpperCase();

            return (
              <motion.div
                key={u.user_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
              >
                <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <Avatar className="size-12 ring-1 ring-black/5 bg-white/80">
                        {u.avatar_url ? (
                          <AvatarImage src={u.avatar_url} alt={u.full_name} />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold text-[#6B7280]">
                          {initials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold truncate">{u.full_name}</div>
                          <Badge variant="secondary" className="rounded-xl">
                            #{u.user_id}
                          </Badge>
                          {myUserId != null && u.user_id === myUserId ? (
                            <Badge className="rounded-xl" variant="secondary">
                              You
                            </Badge>
                          ) : null}
                          {String(u.role.role_name).toUpperCase() === "ADMIN" ? (
                            <Badge className="rounded-xl" variant="secondary">
                              Protected
                            </Badge>
                          ) : null}
                          {dirty ? <Badge className="rounded-xl">Unsaved</Badge> : null}
                        </div>

                        <div className="mt-1 text-sm text-muted-foreground">
                          {u.email} • ID: {u.id_number}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Registered: {fmt.format(new Date(u.date_registered))}
                          {u.department ? ` • Dept: ${u.department}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="h-10 rounded-xl border border-border/70 bg-white/90 px-3 text-sm shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-[box-shadow,border-color] duration-200 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-ring/20 disabled:opacity-60"
                        value={roleVal}
                        disabled={locked}
                        onChange={(e) =>
                          setDraftRole((p) => ({ ...p, [u.user_id]: e.target.value }))
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-10 rounded-xl border border-border/70 bg-white/90 px-3 text-sm shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-[box-shadow,border-color] duration-200 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-ring/20 disabled:opacity-60"
                        value={statusVal}
                        disabled={locked}
                        onChange={(e) =>
                          setDraftStatus((p) => ({ ...p, [u.user_id]: e.target.value }))
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <Button
                        className="rounded-xl"
                        variant={dirty ? "default" : "outline"}
                        disabled={locked || !dirty || savingId === u.user_id}
                        onClick={() => saveUser(u.user_id)}
                      >
                        <Save className="mr-2 size-4" />
                        {savingId === u.user_id ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1, debouncedQ)}
        >
          Prev
        </Button>

        <Button
          variant="outline"
          className="rounded-xl"
          disabled={page >= totalPages || loading}
          onClick={() => load(page + 1, debouncedQ)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
