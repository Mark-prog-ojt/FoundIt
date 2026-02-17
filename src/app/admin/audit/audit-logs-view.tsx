"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  ShieldCheck,
  RefreshCw,
  FileText,
  Copy,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type AuditRow = {
  audit_id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string | null;
  meta: unknown | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;

  actor: null | {
    user_id: number;
    full_name: string;
    email: string;
    role: { role_name: string };
  };
};

const SEGMENTS = [
  { value: "ALL", label: "All" },
  { value: "CLAIMS", label: "Claims" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "AUTH", label: "Auth" },
  { value: "SYSTEM", label: "System" },
] as const;

type Segment = (typeof SEGMENTS)[number]["value"];

const PAGE_SIZES = [10, 20, 50] as const;

type DiffRow = { key: string; before?: string; after?: string };


function toneDot(action: string) {
  const a = action.toUpperCase();
  if (a.includes("CLAIM")) return "bg-[#7F0101]";
  return "bg-zinc-400";
}

function iconTone(action: string) {
  const a = action.toUpperCase();
  if (a.includes("CLAIM")) return "bg-[#7F0101]/10 text-[#7F0101]";
  return "bg-zinc-500/10 text-zinc-600";
}

function matchesSegment(row: AuditRow, segment: Segment) {
  if (segment === "ALL") return true;
  const action = row.action.toUpperCase();
  const entity = row.entity_type.toUpperCase();

  if (segment === "CLAIMS") return action.includes("CLAIM") || entity.includes("CLAIM");
  if (segment === "INVENTORY")
    return (
      action.includes("FOUND") ||
      action.includes("ITEM") ||
      entity.includes("FOUND") ||
      entity.includes("ITEM") ||
      entity.includes("CATEGORY") ||
      entity.includes("LOCATION")
    );
  if (segment === "AUTH") return action.includes("LOGIN") || action.includes("AUTH");
  if (segment === "SYSTEM") return action.includes("SYSTEM") || entity.includes("ROLE");
  return true;
}

function getDayLabel(date: Date, fmtGroup: Intl.DateTimeFormat) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  return fmtGroup.format(date);
}

function extractDiff(meta: unknown): DiffRow[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const record = meta as Record<string, unknown>;
  const before = record.before as Record<string, unknown> | undefined;
  const after = record.after as Record<string, unknown> | undefined;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).slice(0, 8);
  return keys.map((key) => ({
    key,
    before: before[key] != null ? String(before[key]) : "—",
    after: after[key] != null ? String(after[key]) : "—",
  }));
}

function entityLink(row: AuditRow) {
  if (!row.entity_id) return null;
  const type = row.entity_type.toUpperCase();
  if (type.includes("FOUND")) return `/found/${row.entity_id}`;
  if (type.includes("CATEGORY")) return "/admin/categories";
  if (type.includes("LOCATION")) return "/admin/locations";
  if (type.includes("USER")) return "/admin/users";
  if (type.includes("ROLE")) return "/admin/roles";
  return null;
}

function LoadingRows({ count = 6 }: { count?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "flex items-center gap-4 px-5 py-3",
            idx !== 0 && "border-t border-black/5"
          )}
        >
          <div className="size-10 rounded-2xl bg-black/5 animate-pulse motion-reduce:animate-none" />
          <div className="flex-1 space-y-2 animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-20 rounded-full bg-black/5" />
            <div className="h-4 w-2/3 rounded-full bg-black/5" />
            <div className="h-3 w-1/2 rounded-full bg-black/5" />
          </div>
          <div className="h-3 w-20 rounded-full bg-black/5 animate-pulse motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function AuditLogsView() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const [segment, setSegment] = useState<Segment>("ALL");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [actionFilters, setActionFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [totalPages, setTotalPages] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  const fmtGroup = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
      }),
    []
  );

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setShowRaw(false);
  }, [openId]);

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", String(pageSize));
      if (debouncedQ) sp.set("q", debouncedQ);

      const res = await fetch(`/api/admin/audit?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load audit logs.");
        setItems([]);
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
  }, [debouncedQ, pageSize]);

  const actorOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((row) => {
      if (row.actor?.full_name) set.add(row.actor.full_name);
      if (!row.actor) set.add("System");
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [items]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((row) => set.add(row.action));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return items.filter((row) => {
      if (!matchesSegment(row, segment)) return false;

      if (actorFilter !== "ALL") {
        const actorName = row.actor?.full_name || "System";
        if (actorName !== actorFilter) return false;
      }

      if (actionFilters.length > 0 && !actionFilters.includes(row.action)) return false;

      if (from || to) {
        const when = new Date(row.created_at);
        if (from && when < from) return false;
        if (to && when > to) return false;
      }

      return true;
    });
  }, [items, segment, actorFilter, actionFilters, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    filteredItems.forEach((row) => {
      const label = getDayLabel(new Date(row.created_at), fmtGroup);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(row);
    });
    return Array.from(map.entries());
  }, [filteredItems, fmtGroup]);

  const resultsLabel = loading
    ? "Loading…"
    : `Showing ${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}`;

  const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const segmentTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: easeOut };

  const panelTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: easeOut };

  const selected = useMemo(
    () => items.find((row) => row.audit_id === openId) || null,
    [items, openId]
  );

  const selectedDiff = useMemo(() => (selected ? extractDiff(selected.meta) : []), [selected]);
  const selectedJson = useMemo(
    () => JSON.stringify(selected?.meta ?? {}, null, 2),
    [selected]
  );
  const selectedRaw = useMemo(() => JSON.stringify(selected?.meta ?? {}), [selected]);
  const selectedLink = useMemo(() => (selected ? entityLink(selected) : null), [selected]);
  const selectedActor = useMemo(
    () =>
      selected
        ? selected.actor
          ? `${selected.actor.full_name} (${selected.actor.role?.role_name || "?"})`
          : "System"
        : "",
    [selected]
  );
  const selectedWhen = useMemo(
    () =>
      selected
        ? `${fmtDate.format(new Date(selected.created_at))} • ${fmtTime.format(
            new Date(selected.created_at)
          )}`
        : "",
    [selected, fmtDate, fmtTime]
  );

  useEffect(() => {
    if (openId && !selected) setOpenId(null);
  }, [openId, selected]);

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Copy failed.");
    }
  }

  function exportLogs() {
    if (!items.length) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      page,
      pageSize,
      totalPages,
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value: unknown) {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportCsv() {
    if (!items.length) return;
    const headers = [
      "created_at",
      "audit_id",
      "action",
      "summary",
      "entity_type",
      "entity_id",
      "actor_user_id",
      "actor_name",
      "actor_email",
      "actor_role",
      "ip",
      "user_agent",
      "meta",
    ];

    const rows = items.map((row) => [
      row.created_at,
      row.audit_id,
      row.action,
      row.summary ?? "",
      row.entity_type,
      row.entity_id ?? "",
      row.actor_user_id ?? "",
      row.actor?.full_name ?? "",
      row.actor?.email ?? "",
      row.actor?.role?.role_name ?? "",
      row.ip ?? "",
      row.user_agent ?? "",
      row.meta != null ? JSON.stringify(row.meta) : "",
    ]);

    const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const csv = `\ufeff${headers.join(",")}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSegment("ALL");
    setActorFilter("ALL");
    setActionFilters([]);
    setDateFrom("");
    setDateTo("");
    setQ("");
  }

  const hasFilters =
    segment !== "ALL" ||
    actorFilter !== "ALL" ||
    actionFilters.length > 0 ||
    !!dateFrom ||
    !!dateTo ||
    q.trim().length > 0;

  const inspectorBody = selected ? (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
            Event details
          </div>
          <div className="mt-1 text-lg font-semibold text-[#111827]">
            {selected.summary || selected.action || "(no summary)"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {selected.action} • {selectedActor} • {selectedWhen}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          onClick={() => setOpenId(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="rounded-full border border-black/5 bg-zinc-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
        >
          <span className={cn("size-1.5 rounded-full", toneDot(selected.action))} />
          {selected.action}
        </Badge>
        <Badge
          variant="secondary"
          className="rounded-full border border-black/5 bg-zinc-100/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
        >
          {selected.entity_type}
          {selected.entity_id != null ? ` #${selected.entity_id}` : ""}
        </Badge>
        {selectedDiff.length ? (
          <span className="rounded-full border border-black/5 bg-zinc-100/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Changed: {selectedDiff.length} field{selectedDiff.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {selectedLink ? (
        <Link
          href={selectedLink}
          className="mt-3 inline-flex items-center gap-2 text-sm text-[#7F0101] hover:underline"
        >
          View entity
        </Link>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">Actor</div>
            <div className="mt-1 text-[#111827]">{selectedActor}</div>
            {selected.actor?.email ? (
              <div className="mt-1 text-xs text-zinc-500">{selected.actor.email}</div>
            ) : null}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
              Timestamp
            </div>
            <div className="mt-1 text-[#111827]">{selectedWhen}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
              IP address
            </div>
            <div className="mt-1 text-[#111827]">{selected.ip || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
              User agent
            </div>
            <div className="mt-1 text-[#111827] line-clamp-2">
              {selected.user_agent || "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/70 text-[#111827] shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
          onClick={() => copyText(String(selected.audit_id), "Audit ID")}
        >
          <Copy className="mr-1 size-3" />
          Copy ID
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/70 text-[#111827] shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
          onClick={() => copyText(selectedJson, "JSON")}
        >
          <Copy className="mr-1 size-3" />
          Copy JSON
        </Button>
      </div>

      <Separator className="my-4 bg-black/5" />

      <div className="flex-1 overflow-auto rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
        {selectedDiff.length ? (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">
              Changed fields
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedDiff.map((row) => (
                <span
                  key={row.key}
                  className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-[#6B7280] ring-1 ring-black/5"
                >
                  {row.key}
                </span>
              ))}
            </div>

            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">
              Before / After
            </div>
            <div className="mt-3 grid gap-2">
              {selectedDiff.map((row) => (
                <div key={row.key} className="grid grid-cols-3 gap-2 text-xs text-[#6B7280]">
                  <div className="text-[#8E8E93]">{row.key}</div>
                  <div className="rounded-lg bg-white/70 px-2 py-1 text-[#111827] ring-1 ring-black/5">
                    {row.before}
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-1 text-[#111827] ring-1 ring-black/5">
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#6B7280]">No change details recorded.</div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8E8E93]">
              JSON
            </div>
            <div className="flex items-center rounded-full bg-white/80 p-1 ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setShowRaw(false)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
                  showRaw ? "text-zinc-500" : "bg-white text-[#111827] shadow-sm"
                )}
              >
                Pretty
              </button>
              <button
                type="button"
                onClick={() => setShowRaw(true)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
                  showRaw ? "bg-white text-[#111827] shadow-sm" : "text-zinc-500"
                )}
              >
                Raw
              </button>
            </div>
          </div>

          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-white/90 p-3 text-xs text-[#111827] ring-1 ring-black/5">
            {showRaw ? selectedRaw : selectedJson}
          </pre>
        </div>
      </div>
    </>
  ) : (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-black/5 text-zinc-400">
        <FileText className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium text-[#111827]">Select an event</div>
      <div className="mt-1 text-xs text-zinc-500">
        Choose a log entry to inspect its details.
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(127,1,1,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute right-[-120px] top-6 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(127,1,1,0.1),transparent_70%)] blur-3xl" />
      </div>

      <div
        data-testid="admin-audit-surface"
        className="relative rounded-[28px] bg-white/70 ring-1 ring-black/5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] backdrop-blur"
      >
        <div className="sticky top-16 z-30 rounded-t-[28px] border-b border-black/5 bg-white/70 backdrop-blur">
          <div className="px-6 pb-4 pt-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Link href="/admin/dashboard" className="transition hover:text-[#111827]">
                Dashboard
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-700">Audit logs</span>
            </nav>

            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    <ShieldCheck className="size-3.5" />
                    Admin Console
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#111827]">
                    Audit Logs
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    Read-only security trail for claims, inventory, auth, and system actions.
                  </p>
                  <div className="mt-1 text-xs text-zinc-400">Admin • Read-only • Protected</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-full bg-primary px-5 text-primary-foreground shadow-[0_14px_34px_rgba(127,1,1,0.28)] transition hover:-translate-y-0.5 hover:bg-primary/90 active:scale-[0.99] motion-reduce:transform-none"
                    onClick={() => load(page)}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={cn(
                        "mr-2 size-4",
                        loading && "animate-spin motion-reduce:animate-none"
                      )}
                    />
                    {loading ? "Refreshing…" : "Refresh"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full bg-white/70 text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[0.99] motion-reduce:transform-none"
                    onClick={exportLogs}
                    disabled={loading || items.length === 0}
                  >
                    <Download className="mr-2 size-4" />
                    Export JSON
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full bg-white/70 text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[0.99] motion-reduce:transform-none"
                    onClick={exportCsv}
                    disabled={loading || items.length === 0}
                  >
                    <Download className="mr-2 size-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="link"
                    asChild
                    className="h-10 px-0 text-sm text-zinc-500 hover:text-[#111827]"
                  >
                    <Link href="/admin/dashboard">Back</Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative inline-flex items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  {SEGMENTS.map((seg) => {
                    const active = segment === seg.value;
                    return (
                      <button
                        key={seg.value}
                        type="button"
                        onClick={() => setSegment(seg.value)}
                        className={cn(
                          "relative whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                          active ? "text-[#111827]" : "text-[#6B7280] hover:text-[#111827]"
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="segment-thumb"
                            className="absolute inset-0 rounded-full bg-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] ring-1 ring-black/5"
                            transition={segmentTransition}
                          />
                        ) : null}
                        <span className="relative z-10">{seg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 ring-1 ring-black/5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder='Search logs (e.g., "CLAIM", "Wallet")…'
                        className="h-10 rounded-2xl border-transparent bg-white/90 pl-9 shadow-[0_6px_16px_rgba(15,23,42,0.06)] focus-visible:border-[#7F0101]/30 focus-visible:ring-[#7F0101]/15"
                      />
                    </div>
                    <div className="ml-auto text-xs text-zinc-500 whitespace-nowrap">
                      {resultsLabel}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-2xl border-transparent bg-white/90 shadow-[0_6px_16px_rgba(15,23,42,0.06)] focus-visible:border-[#7F0101]/30 focus-visible:ring-[#7F0101]/15"
                      />
                      <span className="text-xs text-zinc-400">to</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-2xl border-transparent bg-white/90 shadow-[0_6px_16px_rgba(15,23,42,0.06)] focus-visible:border-[#7F0101]/30 focus-visible:ring-[#7F0101]/15"
                      />
                    </div>

                    <Select value={actorFilter} onValueChange={setActorFilter}>
                      <SelectTrigger className="rounded-2xl border-transparent bg-white/90 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
                        <SelectValue placeholder="Actor" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {actorOptions.map((actor) => (
                          <SelectItem key={actor} value={actor}>
                            {actor === "ALL" ? "All actors" : actor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="rounded-2xl bg-white/80 text-[#111827] shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
                        >
                          <SlidersHorizontal className="mr-2 size-4" />
                          Actions
                          {actionFilters.length ? (
                            <span className="ml-2 text-xs text-[#6B7280]">
                              {actionFilters.length}
                            </span>
                          ) : null}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-72 rounded-2xl border-black/10 bg-white/95 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)]"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E8E93]">
                          Action filters
                        </div>
                        <div className="mt-3 grid gap-2">
                          {actionOptions.length === 0 ? (
                            <div className="text-sm text-[#6B7280]">No actions found.</div>
                          ) : (
                            actionOptions.map((action) => {
                              const active = actionFilters.includes(action);
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() =>
                                    setActionFilters((prev) =>
                                      prev.includes(action)
                                        ? prev.filter((v) => v !== action)
                                        : [...prev, action]
                                    )
                                  }
                                  className={cn(
                                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                                    active
                                      ? "border-[#7F0101]/40 bg-[#7F0101]/10 text-[#7F0101]"
                                      : "border-black/5 bg-white text-[#111827] hover:bg-black/[0.03]"
                                  )}
                                >
                                  <span className="truncate">{action}</span>
                                  <span
                                    className={cn(
                                      "ml-3 size-2 rounded-full",
                                      active ? "bg-[#7F0101]" : "bg-black/10"
                                    )}
                                  />
                                </button>
                              );
                            })
                          )}
                        </div>
                        {actionFilters.length ? (
                          <button
                            type="button"
                            className="mt-3 text-xs text-[#6B7280] underline-offset-4 hover:underline"
                            onClick={() => setActionFilters([])}
                          >
                            Clear actions
                          </button>
                        ) : null}
                      </PopoverContent>
                    </Popover>

                    {hasFilters ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs text-zinc-500 hover:bg-black/5"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="min-w-0">
            <div className="mt-2">
              {loading ? (
                  <LoadingRows count={6} />
                ) : filteredItems.length === 0 ? (
                  <EmptyState
                    title="No audit logs found"
                    description="Try a different search keyword or filter combination."
                    icon={<Search className="size-5" />}
                    className="bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                  />
                ) : (
                  <div
                    data-testid="admin-audit-list"
                    className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5"
                  >
                    {grouped.map(([label, group], groupIndex) => (
                      <div key={label} className={cn(groupIndex !== 0 && "border-t border-black/5")}>
                        <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">
                          {label}
                        </div>
                        <div>
                          {group.map((row, idx) => {
                            const when = `${fmtDate.format(new Date(row.created_at))} • ${fmtTime.format(
                              new Date(row.created_at)
                            )}`;
                            const actor = row.actor
                              ? `${row.actor.full_name} (${row.actor.role?.role_name || "?"})`
                              : "System";
                            const entity = `${row.entity_type}${
                              row.entity_id != null ? ` #${row.entity_id}` : ""
                            }`;
                            const isOpen = openId === row.audit_id;

                            return (
                              <button
                                key={row.audit_id}
                                type="button"
                                onClick={() => setOpenId(isOpen ? null : row.audit_id)}
                                className={cn(
                                  "group w-full text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                                  idx !== 0 && "border-t border-black/5",
                                  "hover:bg-black/[0.02]",
                                  isOpen && "bg-black/[0.02]"
                                )}
                                aria-expanded={isOpen}
                              >
                                <div className="grid gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div
                                      className={cn(
                                        "grid size-10 place-items-center rounded-2xl ring-1 ring-black/5",
                                        iconTone(row.action)
                                      )}
                                    >
                                      <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant="secondary"
                                          className="rounded-full border border-black/5 bg-zinc-100/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
                                        >
                                          <span
                                            className={cn("size-1.5 rounded-full", toneDot(row.action))}
                                          />
                                          {row.action}
                                        </Badge>
                                        <div className="text-sm font-medium text-[#111827]">
                                          {row.summary || "(no summary)"}
                                        </div>
                                      </div>
                                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                        <span className="truncate">{actor}</span>
                                        <span className="text-zinc-300">•</span>
                                        <span className="truncate">{entity}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-zinc-400 md:justify-end">
                                    <span className="whitespace-nowrap">{when}</span>
                                    <ChevronRight className="size-4 opacity-0 transition group-hover:opacity-100" />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-6 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    setPageSize(Number(value) as (typeof PAGE_SIZES)[number])
                  }
                >
                  <SelectTrigger className="rounded-2xl border-transparent bg-white/90 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} per page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm text-zinc-500">
                  Page <span className="font-medium text-[#111827]">{page}</span> of{" "}
                  <span className="font-medium text-[#111827]">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-white/90 p-1 ring-1 ring-black/5 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-zinc-500 hover:bg-black/5 disabled:text-zinc-300 disabled:opacity-50"
                    disabled={page <= 1 || loading}
                    onClick={() => load(page - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-zinc-500 hover:bg-black/5 disabled:text-zinc-300 disabled:opacity-50"
                    disabled={page >= totalPages || loading}
                    onClick={() => load(page + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selected ? (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={panelTransition}
                onClick={() => setOpenId(null)}
              />
              <motion.aside
                className="fixed right-4 top-24 z-50 flex h-[calc(100%-7rem)] w-[min(100%-2rem,24rem)] flex-col rounded-[28px] bg-white/95 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.18)] ring-1 ring-black/10 backdrop-blur lg:right-6 lg:top-20 lg:h-[calc(100%-6rem)] lg:w-[360px]"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={panelTransition}
              >
                {inspectorBody}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
    </div>
  );
}
