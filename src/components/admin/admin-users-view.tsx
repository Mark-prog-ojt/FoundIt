"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Search, ShieldCheck, RefreshCw, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRow = {
  user_id: number;
  full_name: string;
  id_number: string;
  email: string;
  department: string | null;
  status: string;
  date_registered: string;
  role: { role_name: string };
};

type ApiResp = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: UserRow[];
  error?: string;
};

const ROLE_FILTERS = ["ALL", "USER", "STAFF", "ADMIN"] as const;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE"] as const;

function pillTone(role: string) {
  const r = role.toUpperCase();
  if (r === "ADMIN") return "bg-violet-500/10 text-violet-700 border-violet-500/20";
  if (r === "STAFF") return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  return "bg-muted/70 text-muted-foreground border-border/60";
}

export function AdminUsersView() {
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]>("ALL");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("ALL");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", "20");
      if (debouncedQ) sp.set("q", debouncedQ);
      if (role !== "ALL") sp.set("role", role);
      if (status !== "ALL") sp.set("status", status);

      const res = await fetch(`/api/admin/users?${sp.toString()}`, { cache: "no-store" });
      const data: ApiResp = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load users.");
        return;
      }

      setItems(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: number, patch: { status?: string; role?: string }) {
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Update failed.");
        return;
      }

      toast.success("User updated.");
      await load(page);
    } catch {
      toast.error("Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, role, status]);

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden rounded-3xl border p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/40 to-slate-950/70" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-2xl border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Admin Console
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">Users</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Search and manage account status and roles.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-xl">ADMIN</Badge>
                <Badge variant="secondary" className="rounded-xl">
                  Read + update
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => load(page)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <a href="/admin/dashboard">Back</a>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card className="rounded-3xl p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl border bg-muted/20">
                <Users className="size-5" />
              </div>
              <div>
                <div className="font-semibold">Directory</div>
                <div className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${items.length} shown`}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email, ID…"
                  className="rounded-2xl pl-9"
                />
              </div>

              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="w-full md:w-[180px] rounded-2xl">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_FILTERS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-full md:w-[180px] rounded-2xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {loading ? (
            <div className="rounded-2xl border bg-muted/20 p-6 text-sm text-muted-foreground">
              Loading users…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 p-6">
              <div className="font-medium">No results</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Try a different search or filter.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden">
              {items.map((u, idx) => {
                const r = String(u.role?.role_name || "USER");
                const rolePill = pillTone(r);

                return (
                  <div key={u.user_id}>
                    <div className="p-4 transition hover:bg-accent/40">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-[260px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold">{u.full_name}</div>
                            <span className={"rounded-xl border px-2 py-0.5 text-[10px] font-medium " + rolePill}>
                              {r}
                            </span>
                            <Badge variant="secondary" className="rounded-xl">
                              {u.status}
                            </Badge>
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground">
                            {u.email} • ID: {u.id_number}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Registered: {fmt.format(new Date(u.date_registered))}
                            {u.department ? ` • ${u.department}` : ""}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={r}
                            onValueChange={(v) => updateUser(u.user_id, { role: v })}
                            disabled={savingId === u.user_id}
                          >
                            <SelectTrigger className="w-[160px] rounded-2xl">
                              <SelectValue placeholder="Set role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="STAFF">STAFF</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={String(u.status || "ACTIVE").toUpperCase()}
                            onValueChange={(v) => updateUser(u.user_id, { status: v })}
                            disabled={savingId === u.user_id}
                          >
                            <SelectTrigger className="w-[170px] rounded-2xl">
                              <SelectValue placeholder="Set status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            disabled
                            title="User detail page later"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                    {idx !== items.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
            >
              Prev
            </Button>

            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
            >
              Next
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
