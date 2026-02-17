"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  MapPin,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { category_id: number; category_name: string };
type Location = { location_id: number; location_name: string };

type FoundItem = {
  found_id: number;
  item_name: string;
  description: string;
  date_found: string;
  storage_location: string;
  image: string | null;
  status: string;
  date_created: string;
  category: { category_name: string };
  location: { location_name: string };
};

type SortKey = "created_desc" | "created_asc" | "found_desc" | "found_asc";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "NEWLY_FOUND", label: "Newly found" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RETURNED", label: "Returned" },
] as const;

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "created_desc", label: "Newest added" },
  { value: "created_asc", label: "Oldest added" },
  { value: "found_desc", label: "Newest found date" },
  { value: "found_asc", label: "Oldest found date" },
];

function tone(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "CLAIMED") return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20";
  if (s === "RETURNED") return "bg-slate-500/10 text-slate-700 ring-slate-500/20";
  return "bg-sky-500/10 text-sky-700 ring-sky-500/20";
}

export function StaffFoundInventory({ role }: { role: string }) {
  const canManage = String(role || "").toUpperCase() === "STAFF" || String(role || "").toUpperCase() === "ADMIN";

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FoundItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [locDraft, setLocDraft] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [acting, setActing] = useState<null | { id: number; mode: "RETURN" | "DELETE" }>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState<null | "RETURN" | "DELETE">(null);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  function applySortParams(sp: URLSearchParams, key: SortKey) {
    if (key === "created_desc") {
      sp.set("sortBy", "date_created");
      sp.set("sortDir", "desc");
      return;
    }
    if (key === "created_asc") {
      sp.set("sortBy", "date_created");
      sp.set("sortDir", "asc");
      return;
    }
    if (key === "found_desc") {
      sp.set("sortBy", "date_found");
      sp.set("sortDir", "desc");
      return;
    }
    sp.set("sortBy", "date_found");
    sp.set("sortDir", "asc");
  }

  async function loadOptions() {
    setOptionsLoading(true);
    try {
      const res = await fetch("/api/meta/options", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load filters.");
        return;
      }
      setCategories(data.categories || []);
      setLocations(data.locations || []);
    } catch {
      toast.error("Failed to load filters.");
    } finally {
      setOptionsLoading(false);
    }
  }

  async function loadItems(
    nextPage: number,
    overrides?: Partial<{
      q: string;
      categoryId: string;
      locationId: string;
      status: string;
      dateFrom: string;
      dateTo: string;
      sortKey: SortKey;
    }>
  ) {
    setLoading(true);
    try {
      const qValue = overrides?.q ?? q;
      const categoryValue = overrides?.categoryId ?? categoryId;
      const locationValue = overrides?.locationId ?? locationId;
      const statusValue = overrides?.status ?? status;
      const dateFromValue = overrides?.dateFrom ?? dateFrom;
      const dateToValue = overrides?.dateTo ?? dateTo;
      const sortValue = overrides?.sortKey ?? sortKey;

      const sp = new URLSearchParams();

      if (qValue.trim()) sp.set("q", qValue.trim());
      if (categoryValue !== "all") sp.set("categoryId", categoryValue);
      if (locationValue !== "all") sp.set("locationId", locationValue);
      if (statusValue !== "all") sp.set("status", statusValue);

      if (dateFromValue) sp.set("dateFrom", dateFromValue);
      if (dateToValue) sp.set("dateTo", dateToValue);

      applySortParams(sp, sortValue);

      sp.set("page", String(nextPage));
      sp.set("pageSize", "12");

      const res = await fetch(`/api/found/list?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load found items.");
        return;
      }

      const nextItems: FoundItem[] = data.items || [];
      setItems(nextItems);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      setLocDraft((prev) => {
        const copy = { ...prev };
        for (const it of nextItems) {
          if (copy[it.found_id] === undefined) copy[it.found_id] = it.storage_location || "";
        }
        return copy;
      });
    } catch {
      toast.error("Failed to load found items.");
    } finally {
      setLoading(false);
    }
  }

  async function saveStorage(foundId: number) {
    const next = String(locDraft[foundId] ?? "").trim();
    if (next.length < 2) {
      toast.error("Storage location is required.");
      return;
    }

    setSavingId(foundId);
    try {
      const res = await fetch("/api/found/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foundId, storageLocation: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to update storage location.");
        return;
      }
      toast.success("Storage location updated.");
      await loadItems(page);
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  async function submitAction(foundId: number, mode: "RETURN" | "DELETE") {
    const res = await fetch("/api/found/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foundId, mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || "Action failed." };
    }
    return { ok: true };
  }

  async function runAction(foundId: number, mode: "RETURN" | "DELETE") {
    const statusUpper = String(items.find((x) => x.found_id === foundId)?.status || "").toUpperCase();

    if (mode === "DELETE") {
      if (statusUpper === "CLAIMED") {
        toast.error("Claimed items cannot be deleted. Use RETURN instead.");
        return;
      }
      const ok = window.confirm("Delete this found item? This cannot be undone.");
      if (!ok) return;
    } else {
      const ok = window.confirm("Mark this item as RETURNED? This will close any pending claims.");
      if (!ok) return;
    }

    setActing({ id: foundId, mode });
    try {
      const result = await submitAction(foundId, mode);
      if (!result.ok) {
        toast.error(result.error || "Action failed.");
        return;
      }

      toast.success(mode === "RETURN" ? "Marked as returned." : "Deleted.");
      await loadItems(page);
    } catch {
      toast.error("Network error.");
    } finally {
      setActing(null);
    }
  }

  useEffect(() => {
    loadOptions();
    loadItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next: Record<number, boolean> = {};
      for (const it of items) {
        if (prev[it.found_id]) next[it.found_id] = true;
      }
      return next;
    });
  }, [items]);

  function toggleSelect(foundId: number) {
    setSelectedIds((prev) => ({ ...prev, [foundId]: !prev[foundId] }));
  }

  function clearSelection() {
    setSelectedIds({});
  }

  function selectAllOnPage() {
    const next: Record<number, boolean> = {};
    for (const it of items) next[it.found_id] = true;
    setSelectedIds(next);
  }

  async function runBulk(mode: "RETURN" | "DELETE") {
    const selected = items.filter((it) => selectedIds[it.found_id]);
    if (selected.length === 0) {
      toast.error("Select at least one item.");
      return;
    }

    const eligible =
      mode === "RETURN"
        ? selected.filter((it) => String(it.status || "").toUpperCase() !== "RETURNED")
        : selected.filter((it) => {
            const s = String(it.status || "").toUpperCase();
            return s !== "RETURNED" && s !== "CLAIMED";
          });

    if (eligible.length === 0) {
      toast.error(mode === "RETURN" ? "All selected items are already returned." : "No selected items can be deleted.");
      return;
    }

    if (mode === "DELETE") {
      const ok = window.confirm(`Delete ${eligible.length} item(s)? This cannot be undone.`);
      if (!ok) return;
    }

    setBulkBusy(mode);
    let success = 0;
    let failed = 0;

    for (const it of eligible) {
      const result = await submitAction(it.found_id, mode);
      if (result.ok) success += 1;
      else failed += 1;
    }

    if (success > 0) {
      toast.success(
        mode === "RETURN"
          ? `Marked ${success} item${success === 1 ? "" : "s"} as returned.`
          : `Deleted ${success} item${success === 1 ? "" : "s"}.`
      );
    }
    if (failed > 0) {
      toast.error(`${failed} item${failed === 1 ? "" : "s"} failed. Try again.`);
    }

    await loadItems(page);
    clearSelection();
    setBulkBusy(null);
  }

  function clearFilters() {
    setQ("");
    setCategoryId("all");
    setLocationId("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("created_desc");
    loadItems(1, {
      q: "",
      categoryId: "all",
      locationId: "all",
      status: "all",
      dateFrom: "",
      dateTo: "",
      sortKey: "created_desc",
    });
  }

  function quickReturned() {
    const nextStatus = "RETURNED";
    const nextSort = "found_desc";
    setStatus(nextStatus);
    setSortKey(nextSort);
    setPage(1);
    loadItems(1, { status: nextStatus, sortKey: nextSort });
  }

  function quickActive() {
    const nextStatus = "NEWLY_FOUND";
    const nextSort = "created_desc";
    setStatus(nextStatus);
    setSortKey(nextSort);
    setPage(1);
    loadItems(1, { status: nextStatus, sortKey: nextSort });
  }

  const resultsLabel = loading ? "Loading..." : `${items.length} results`;
  const selectedCount = items.filter((it) => selectedIds[it.found_id]).length;
  const quickActiveSelected = status === "NEWLY_FOUND" && sortKey === "created_desc";
  const quickReturnedSelected = status === "RETURNED" && sortKey === "found_desc";

  return (
    <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-6 text-[#111827]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur">
            <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#7F0101]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#7F0101]/8 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                  <ShieldCheck className="size-3.5" />
                  Staff Inventory
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[30px]">
                  Found Items
                </h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Search, filter, and manage storage locations in a single view.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-3 py-1 text-[11px] font-medium">{role}</Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                    Inventory view
                  </Badge>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[11px] text-[#6B7280] ring-1 ring-black/5">
                    <PackageSearch className="size-3.5" />
                    {resultsLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-2xl bg-white/70" asChild>
                  <Link href="/staff/dashboard">
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Link>
                </Button>
                <Button className="rounded-2xl shadow-[0_10px_26px_rgba(127,1,1,0.25)]" asChild>
                  <Link href="/staff/found/new">
                    Log new <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_12px_36px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                    <SlidersHorizontal className="size-4 text-[#6B7280]" />
                    Filters
                  </div>
                  <div className="mt-1 text-sm text-[#6B7280]">
                    Refine by category, location, status, and date.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => loadItems(1)}
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={clearFilters}>
                    Clear
                  </Button>
                  {canManage ? (
                    <Button
                      variant={bulkMode ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => {
                        setBulkMode((prev) => {
                          const next = !prev;
                          if (!next) clearSelection();
                          return next;
                        });
                      }}
                    >
                      {bulkMode ? "Exit bulk" : "Bulk edit"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-[#F8F7F6] p-1 ring-1 ring-black/5">
                  <Button
                    variant="ghost"
                    className={cn(
                      "rounded-full px-4 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition",
                      quickActiveSelected
                        ? "bg-white text-[#111827] shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
                        : "text-[#6B7280] hover:bg-white/80 hover:text-[#111827]"
                    )}
                    onClick={quickActive}
                    disabled={loading}
                  >
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "rounded-full px-4 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition",
                      quickReturnedSelected
                        ? "bg-white text-[#111827] shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
                        : "text-[#6B7280] hover:bg-white/80 hover:text-[#111827]"
                    )}
                    onClick={quickReturned}
                    disabled={loading}
                  >
                    Returned
                  </Button>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                  Quick filters
                </Badge>
              </div>

              {bulkMode ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#111827]">
                    <span className="font-semibold">{selectedCount}</span>
                    <span className="text-[#6B7280]">selected</span>
                    <Button
                      variant="ghost"
                      className="h-8 rounded-full px-3 text-xs text-[#6B7280] hover:bg-white/70 hover:text-[#111827]"
                      onClick={selectAllOnPage}
                      disabled={items.length === 0}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 rounded-full px-3 text-xs text-[#6B7280] hover:bg-white/70 hover:text-[#111827]"
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => runBulk("RETURN")}
                      disabled={selectedCount === 0 || bulkBusy !== null}
                    >
                      {bulkBusy === "RETURN" ? "Marking..." : "Mark returned"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-2xl"
                      onClick={() => runBulk("DELETE")}
                      disabled={selectedCount === 0 || bulkBusy !== null}
                    >
                      {bulkBusy === "DELETE" ? "Deleting..." : "Delete selected"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-lg">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    className="rounded-2xl bg-white/80 pl-9 ring-1 ring-black/5 transition focus-visible:ring-[#7F0101]/25"
                    placeholder="Search item name, description, storage..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadItems(1);
                    }}
                  />
                </div>

                <Button
                  className="rounded-2xl px-6 shadow-[0_10px_26px_rgba(127,1,1,0.25)]"
                  onClick={() => loadItems(1)}
                  disabled={loading}
                >
                  Apply filters
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
                <Select value={categoryId} onValueChange={setCategoryId} disabled={optionsLoading}>
                  <SelectTrigger className="w-full rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder={optionsLoading ? "Loading..." : "Category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.category_id} value={String(c.category_id)}>
                        {c.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationId} onValueChange={setLocationId} disabled={optionsLoading}>
                  <SelectTrigger className="w-full rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder={optionsLoading ? "Loading..." : "Location"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.location_id} value={String(l.location_id)}>
                        {l.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    type="date"
                    className="rounded-2xl bg-white/80 pl-9 ring-1 ring-black/5"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    type="date"
                    className="rounded-2xl bg-white/80 pl-9 ring-1 ring-black/5"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="w-full rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </motion.div>

        <Separator />

        {loading ? (
          <LoadingGrid count={6} variant="media" className="sm:grid-cols-2 lg:grid-cols-3" />
        ) : items.length === 0 ? (
          <EmptyState
            centered
            title="No items found"
            description="Try changing filters or keywords."
            icon={<PackageSearch className="size-5" />}
            actions={
              <Button variant="outline" className="rounded-xl" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const src = it.image || "/found-placeholder.svg";
              const statusLabel =
                STATUS_OPTIONS.find((s) => s.value === it.status)?.label ?? String(it.status || "");
              const selected = !!selectedIds[it.found_id];

              return (
                <Card
                  key={it.found_id}
                  className={cn(
                    "group rounded-3xl border-0 bg-white/92 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] focus-within:ring-2 focus-within:ring-[#7F0101]/20",
                    selected ? "ring-2 ring-[#7F0101]/30" : "ring-1 ring-[rgba(0,0,0,0.05)]"
                  )}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-[#F8F7F6]">
                    <div className="aspect-[4/3]">
                      <Image
                        src={src}
                        alt={it.item_name}
                        fill
                        className="object-contain transition duration-500 ease-out group-hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/90 to-transparent" />
                    <div className="absolute left-3 top-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 " +
                          tone(it.status)
                        }
                      >
                        {statusLabel}
                      </span>
                    </div>
                    {bulkMode ? (
                      <button
                        type="button"
                        onClick={() => toggleSelect(it.found_id)}
                        className={cn(
                          "absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border backdrop-blur transition",
                          selected
                            ? "border-[#7F0101]/40 bg-[#7F0101] text-white shadow-[0_10px_20px_rgba(127,1,1,0.3)]"
                            : "border-black/10 bg-white/70 text-[#6B7280] hover:bg-white"
                        )}
                        aria-pressed={selected}
                      >
                        <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold truncate">{it.item_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="size-3" />
                          {it.category.category_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {it.location.location_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      Found: {fmt.format(new Date(it.date_found))}
                    </span>
                    <span>•</span>
                    <span>Posted: {fmt.format(new Date(it.date_created))}</span>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                      Storage location
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={locDraft[it.found_id] ?? it.storage_location ?? ""}
                        onChange={(e) =>
                          setLocDraft((p) => ({ ...p, [it.found_id]: e.target.value }))
                        }
                        className="rounded-2xl bg-white/80 ring-1 ring-black/5"
                        placeholder="e.g., Security Office - Drawer A"
                      />
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => saveStorage(it.found_id)}
                        disabled={savingId === it.found_id}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button variant="outline" className="rounded-2xl" asChild>
                      <Link href={`/found/${it.found_id}`}>
                        <PackageSearch className="mr-2 size-4" />
                        Open item
                      </Link>
                    </Button>

                    {canManage && !bulkMode ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => runAction(it.found_id, "RETURN")}
                          disabled={
                            loading ||
                            acting?.id === it.found_id ||
                            String(it.status || "").toUpperCase() === "RETURNED"
                          }
                        >
                          <RotateCcw className="mr-2 size-4" />
                          Return
                        </Button>

                        <Button
                          variant="destructive"
                          className="rounded-2xl"
                          onClick={() => runAction(it.found_id, "DELETE")}
                          disabled={
                            loading ||
                            acting?.id === it.found_id ||
                            String(it.status || "").toUpperCase() === "RETURNED" ||
                            String(it.status || "").toUpperCase() === "CLAIMED"
                          }
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </Button>
                      </div>
                    ) : !canManage ? (
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                        Read-only
                      </Badge>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1 || loading}
            onClick={() => loadItems(page - 1)}
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
            onClick={() => loadItems(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
