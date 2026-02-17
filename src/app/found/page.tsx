"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Tag,
  Plus,
  CalendarDays,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
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

type SessionPayload = {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
};

type SortKey = "created_desc" | "created_asc" | "found_desc" | "found_asc";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NEWLY_FOUND", label: "Newly found" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RETURNED", label: "Returned" },
];

const STATUS_OPTIONS_PUBLIC = STATUS_OPTIONS.filter((o) => o.value !== "RETURNED");

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "created_desc", label: "Newest added" },
  { value: "created_asc", label: "Oldest added" },
  { value: "found_desc", label: "Newest found date" },
  { value: "found_asc", label: "Oldest found date" },
];

function FoundBrowseContent() {
  const searchParams = useSearchParams();

  const [session, setSession] = useState<SessionPayload | null>(null);
  const isStaff = session?.role === "STAFF" || session?.role === "ADMIN";
  const statusOptions = useMemo(
    () => (isStaff ? STATUS_OPTIONS : STATUS_OPTIONS_PUBLIC),
    [isStaff]
  );

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Filters
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [includeClaimed, setIncludeClaimed] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FoundItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  async function loadSession() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setSession((data?.session as SessionPayload) || null);
    } catch {
      setSession(null);
    }
  }

  async function loadOptions() {
    setOptionsLoading(true);
    try {
      const res = await fetch("/api/meta/options", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load filters.");
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

  async function loadItems(
    nextPage: number,
    override?: Partial<{
      q: string;
      categoryId: string;
      locationId: string;
      status: string;
      includeClaimed: boolean;
      dateFrom: string;
      dateTo: string;
      sortKey: SortKey;
    }>
  ) {
    setLoading(true);
    try {
      const qEff = override?.q ?? q;
      const categoryEff = override?.categoryId ?? categoryId;
      const locationEff = override?.locationId ?? locationId;
      const statusEff = override?.status ?? status;
      const includeClaimedEff = override?.includeClaimed ?? includeClaimed;
      const dateFromEff = override?.dateFrom ?? dateFrom;
      const dateToEff = override?.dateTo ?? dateTo;
      const sortEff = override?.sortKey ?? sortKey;

      const sp = new URLSearchParams();

      if (qEff.trim()) sp.set("q", qEff.trim());
      if (categoryEff !== "all") sp.set("categoryId", categoryEff);
      if (locationEff !== "all") sp.set("locationId", locationEff);
      if (statusEff !== "all") sp.set("status", statusEff);
      if (!isStaff && includeClaimedEff) sp.set("includeClaimed", "1");

      if (dateFromEff) sp.set("dateFrom", dateFromEff);
      if (dateToEff) sp.set("dateTo", dateToEff);

      applySortParams(sp, sortEff);

      sp.set("page", String(nextPage));
      sp.set("pageSize", "12");

      const res = await fetch(`/api/found/list?${sp.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load found items.");
        return;
      }

      setItems(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("Failed to load found items.");
    } finally {
      setLoading(false);
    }
  }

  // Load session + filter options once
  useEffect(() => {
    loadSession();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync initial search state from URL params (supports navbar search -> /found?q=...)
  useEffect(() => {
    const qp = (searchParams.get("q") || "").trim();

    if (qp !== q) setQ(qp);

    // Keep it simple: we only deep-link keyword today.
    loadItems(1, { q: qp });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadItems(1);
  }

  function clearFilters() {
    setQ("");
    setCategoryId("all");
    setLocationId("all");
    setStatus("all");
    setIncludeClaimed(false);
    setDateFrom("");
    setDateTo("");
    setSortKey("created_desc");
    loadItems(1, { q: "", includeClaimed: false });
  }

  const activeBadges = useMemo(() => {
    const b: string[] = [];
    if (q.trim()) b.push(`Keyword: ${q.trim()}`);
    if (categoryId !== "all") {
      const c = categories.find((x) => String(x.category_id) === categoryId);
      b.push(`Category: ${c?.category_name || categoryId}`);
    }
    if (locationId !== "all") {
      const l = locations.find((x) => String(x.location_id) === locationId);
      b.push(`Location: ${l?.location_name || locationId}`);
    }
    if (status !== "all") {
      const s = STATUS_OPTIONS.find((x) => x.value === status);
      b.push(`Status: ${s?.label || status}`);
    }
    if (!isStaff && includeClaimed) b.push("Including claimed");
    if (dateFrom) b.push(`From: ${dateFrom}`);
    if (dateTo) b.push(`To: ${dateTo}`);
    if (sortKey) {
      const s = SORT_OPTIONS.find((x) => x.value === sortKey);
      if (s) b.push(`Sort: ${s.label}`);
    }
    return b;
  }, [q, categoryId, locationId, status, includeClaimed, dateFrom, dateTo, sortKey, categories, locations, isStaff]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Found Items</h1>
            <p className="text-sm text-muted-foreground">
              Browse items turned in to Lost & Found. If it’s yours, start a claim.
            </p>

            {activeBadges.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeBadges.slice(0, 6).map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-xl">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full bg-secondary/70 p-1 ring-1 ring-[rgba(0,0,0,0.06)]">
              <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                Public Feed
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                Clear
              </button>
            </div>

            {isStaff ? (
              <Link href="/found/new">
                <Button className="rounded-xl">
                  <Plus className="mr-2 size-4" />
                  Log Found Item
                </Button>
              </Link>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <Card className="rounded-3xl border border-[rgba(0,0,0,0.06)] bg-secondary/60 p-0 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
            <div className="p-2.5 md:p-3">
              <form onSubmit={onSearchSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-10 rounded-2xl border-0 bg-background/60 pl-9 shadow-none ring-0 transition-colors placeholder:text-muted-foreground/80 hover:bg-background/75 focus-visible:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring/25"
                      placeholder="Search keywords (e.g., wallet, ID, earbuds)..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-10 rounded-2xl px-4 shadow-sm transition active:scale-[0.98]"
                    disabled={loading}
                  >
                    Apply
                  </Button>
                </div>

                <div className="rounded-2xl bg-background/45 p-2 ring-1 ring-[rgba(0,0,0,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground/70">
                    <div className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1">
                      <SlidersHorizontal className="size-3.5" />
                      <span className="tracking-wide">Filters</span>
                    </div>
                    {!isStaff ? (
                      <label className="inline-flex items-center gap-2 rounded-full bg-background/70 px-2 py-1 text-[11px]">
                        <span>Include claimed</span>
                        <Switch size="sm" checked={includeClaimed} onCheckedChange={setIncludeClaimed} />
                      </label>
                    ) : null}
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    <Select value={categoryId} onValueChange={(v) => setCategoryId(v)} disabled={optionsLoading}>
                      <SelectTrigger className="h-10 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
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

                    <Select value={locationId} onValueChange={(v) => setLocationId(v)} disabled={optionsLoading}>
                      <SelectTrigger className="h-10 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
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

                    <Select value={status} onValueChange={(v) => setStatus(v)}>
                      <SelectTrigger className="h-10 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-10 rounded-2xl border-0 bg-background/60 pl-9 shadow-none ring-0 transition-colors hover:bg-background/75 focus-visible:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring/25"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        aria-label="Date from"
                      />
                    </div>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-10 rounded-2xl border-0 bg-background/60 pl-9 shadow-none ring-0 transition-colors hover:bg-background/75 focus-visible:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring/25"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        aria-label="Date to"
                      />
                    </div>

                    <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                      <SelectTrigger className="h-10 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="size-4 text-muted-foreground" />
                          <SelectValue placeholder="Sort" />
                        </div>
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
              </form>
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
            description="Try changing your filters or search keywords."
            icon={<Search className="size-5" />}
            actions={
              <Button variant="outline" className="rounded-xl" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const src = it.image || "/found-placeholder.svg";
              const statusLabel = statusOptions.find((o) => o.value === it.status)?.label ?? it.status;

              const statusKey = String(it.status || "").toUpperCase();
              const tone =
                statusKey === "NEWLY_FOUND"
                  ? "bg-emerald-500/12 text-emerald-700"
                  : statusKey === "CLAIMED"
                  ? "bg-zinc-500/12 text-zinc-700"
                  : "bg-blue-500/12 text-blue-700";

              return (
                <Link
                  key={it.found_id}
                  href={`/found/${it.found_id}`}
                  className="group block cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                >
                  <Card className="rounded-3xl overflow-hidden p-0 bg-[#FCFCFD] ring-1 ring-[rgba(0,0,0,0.06)] shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] will-change-transform group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_45px_rgba(0,0,0,0.10)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary/70">
                      <div className="absolute inset-4">
                        <Image
                          src={src}
                          alt={it.item_name}
                          fill
                          className="object-contain transition duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          priority={false}
                        />
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#FCFCFD]" />

                      <div className="absolute left-3 top-3">
                        <Badge
                          variant="secondary"
                          className={
                            "rounded-full border-0 px-3 py-1 text-xs font-medium shadow-none backdrop-blur-sm " +
                            tone
                          }
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-[#FCFCFD] p-5">
                      <div className="min-w-0">
                        <div className="text-[16px] font-semibold tracking-tight truncate underline-offset-4 group-hover:underline">
                          {it.item_name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70">
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

                      <p className="mt-3 text-[13px] text-muted-foreground/75 line-clamp-2">
                        {it.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground/60">
                        <span>Found: {fmt.format(new Date(it.date_found))}</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}</div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
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
    </AppShell>
  );
}

export default function FoundBrowsePage() {
  return (
    <Suspense fallback={null}>
      <FoundBrowseContent />
    </Suspense>
  );
}
