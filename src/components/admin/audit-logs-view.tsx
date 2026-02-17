"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type Actor = {
  user_id: number;
  full_name: string;
  email: string;
  role?: { role_name: string } | null;
};

type AuditRow = {
  audit_id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string | null;
  meta: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string; // ISO
  actor: Actor | null;
};

function pillTone(action: string) {
  const a = action.toUpperCase();
  if (a.includes("APPROV") || a.includes("CREATE")) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (a.includes("DENY") || a.includes("DELETE")) return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  if (a.includes("UPDATE") || a.includes("EDIT")) return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  return "bg-muted/70 text-muted-foreground border-border/60";
}

function safeJson(meta: any) {
  try {
    if (meta == null) return "";
    const s = JSON.stringify(meta, null, 2);
    return s.length > 1200 ? s.slice(0, 1200) + "\n…(truncated)" : s;
  } catch {
    return "";
  }
}

export function AuditLogsView() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/audit/list?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load audit logs.");
        return;
      }

      setItems(data.items || []);
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((r) => {
      const actor = r.actor ? `${r.actor.full_name} ${r.actor.email} ${r.actor.role?.role_name ?? ""}` : "";
      const meta = safeJson(r.meta);
      const hay = `${r.action} ${r.entity_type} ${r.entity_id ?? ""} ${r.summary ?? ""} ${actor} ${meta} ${r.ip ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="rounded-3xl p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-2xl border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Admin • Audit Logs
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Audit trail</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Read-only events for approvals/denials and other system actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search action, entity, actor, meta…"
                  className="rounded-2xl pl-9"
                />
              </div>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => load(page)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <Card className="rounded-3xl p-0 overflow-hidden">
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Showing <span className="font-medium text-foreground">{filtered.length}</span> item(s)
              {q.trim() ? " (filtered)" : ""}
            </span>
            <span>
              Page <span className="font-medium text-foreground">{page}</span> /{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading audit logs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <div className="font-medium">No logs found</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Try a different search keyword, or generate actions (approve/deny claims).
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[560px]">
            <div className="divide-y">
              {filtered.map((r, idx) => {
                const pill = pillTone(r.action);
                const when = fmt.format(new Date(r.created_at));
                const actor = r.actor
                  ? `${r.actor.full_name} (${r.actor.role?.role_name ?? "?"})`
                  : "System / Unknown";

                const expanded = openId === r.audit_id;
                const metaText = safeJson(r.meta);

                return (
                  <motion.div
                    key={r.audit_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.01 }}
                    className="p-4 hover:bg-accent/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[260px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={"rounded-xl border px-2 py-0.5 text-[10px] font-medium " + pill}>
                            {r.action}
                          </span>
                          <Badge variant="secondary" className="rounded-xl">
                            {r.entity_type}{r.entity_id != null ? ` #${r.entity_id}` : ""}
                          </Badge>
                        </div>

                        <div className="mt-2 text-sm">
                          <span className="font-semibold text-foreground">{actor}</span>
                          <span className="text-muted-foreground"> • {when}</span>
                        </div>

                        {r.summary ? (
                          <div className="mt-1 text-sm text-muted-foreground">{r.summary}</div>
                        ) : null}

                        {expanded ? (
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                            {r.ip ? <div><span className="font-medium text-foreground">IP:</span> {r.ip}</div> : null}
                            {r.user_agent ? (
                              <div className="break-words">
                                <span className="font-medium text-foreground">UA:</span> {r.user_agent}
                              </div>
                            ) : null}
                            {metaText ? (
                              <pre className="whitespace-pre-wrap rounded-2xl border bg-muted/20 p-3 text-xs text-foreground/80">
{metaText}
                              </pre>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setOpenId(expanded ? null : r.audit_id)}
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="mr-2 size-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 size-4" />
                            Details
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-2 p-4">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
          >
            Prev
          </Button>

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
    </div>
  );
}
