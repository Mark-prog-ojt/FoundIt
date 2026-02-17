"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Save, Plus, Trash2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type LocationRow = {
  location_id: number;
  location_name: string;
  description: string | null;
  lostCount?: number;
  foundCount?: number;
  totalCount?: number;
};

export function LocationsAdmin() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<LocationRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // new location inputs
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // drafts for inline edits
  const [draftName, setDraftName] = useState<Record<number, string>>({});
  const [draftDesc, setDraftDesc] = useState<Record<number, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load(nextPage: number, nextQ: string) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", "20");
      if (nextQ) sp.set("q", nextQ);

      const res = await fetch(`/api/admin/locations/list?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load locations.");
        return;
      }

      setItems(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      // seed drafts (don’t overwrite user edits)
      setDraftName((prev) => {
        const next = { ...prev };
        for (const r of data.items || []) {
          if (next[r.location_id] == null) next[r.location_id] = r.location_name || "";
        }
        return next;
      });

      setDraftDesc((prev) => {
        const next = { ...prev };
        for (const r of data.items || []) {
          if (next[r.location_id] == null) next[r.location_id] = r.description ?? "";
        }
        return next;
      });
    } catch {
      toast.error("Failed to load locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, debouncedQ);
  }, [debouncedQ]);

  function isDirty(r: LocationRow) {
    const n = (draftName[r.location_id] ?? r.location_name).trim();
    const d = String(draftDesc[r.location_id] ?? (r.description ?? ""));

    return n !== (r.location_name ?? "").trim() || d !== String(r.description ?? "");
  }

  async function createLocation() {
    const name = newName.trim();
    const description = newDesc.trim();

    if (name.length < 2) {
      toast.error("Location name is required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/locations/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location_name: name,
          description: description.length ? description : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Create failed.");
        return;
      }

      toast.success("Location created.");
      setNewName("");
      setNewDesc("");

      // reload first page (so you immediately see it)
      await load(1, debouncedQ);
    } catch {
      toast.error("Network error.");
    } finally {
      setCreating(false);
    }
  }

  async function saveLocation(locationId: number) {
    const name = (draftName[locationId] ?? "").trim();
    const description = String(draftDesc[locationId] ?? "").trim();

    if (name.length < 2) {
      toast.error("Location name is required.");
      return;
    }

    setSavingId(locationId);
    try {
      const res = await fetch("/api/admin/locations/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locationId,
          location_name: name,
          description: description.length ? description : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Save failed.");
        return;
      }

      toast.success("Saved.");
      setItems((prev) =>
        prev.map((r) =>
          r.location_id === locationId
            ? {
                ...r,
                location_name: data.location?.location_name ?? name,
                description:
                  data.location?.description ?? (description.length ? description : null),
              }
            : r
        )
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteLocation(locationId: number) {
    setDeletingId(locationId);
    try {
      const res = await fetch("/api/admin/locations/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locationId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Delete failed.");
        return;
      }

      toast.success("Deleted.");
      await load(page, debouncedQ);
    } catch {
      toast.error("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Create */}
      <Card className="rounded-3xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="font-semibold">Create location</div>
            <div className="text-sm text-muted-foreground">Adds a new location (audited).</div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-[260px]">
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <Input
                className="rounded-2xl"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g., "Registrar Office"'
              />
            </div>

            <div className="w-full md:w-[320px]">
              <div className="text-xs text-muted-foreground mb-1">Description (optional)</div>
              <Input
                className="rounded-2xl"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder='e.g., "Front desk / records"'
              />
            </div>

            <Button className="rounded-2xl" onClick={createLocation} disabled={creating}>
              <Plus className="mr-2 size-4" />
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Search + pager */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-[380px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search location name…"
            className="rounded-2xl pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>
      </div>

      {loading ? (
        <LoadingGrid count={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No locations found"
          description="Try changing your search."
          icon={<Search className="size-5" />}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((r, idx) => {
            const dirty = isDirty(r);
            const nameVal = (draftName[r.location_id] ?? r.location_name).toString();
            const descVal = (draftDesc[r.location_id] ?? (r.description ?? "")).toString();

            const used = Number(r.totalCount ?? (r.lostCount ?? 0) + (r.foundCount ?? 0));
            const deleteDisabled = used > 0 || deletingId === r.location_id;

            return (
              <motion.div
                key={r.location_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
              >
                <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="grid size-12 place-items-center rounded-2xl bg-[#F8F7F6] text-[#6B7280] ring-1 ring-black/5">
                        <MapPin className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold truncate">{r.location_name}</div>
                          <Badge variant="secondary" className="rounded-xl">
                            #{r.location_id}
                          </Badge>
                          {dirty ? <Badge className="rounded-xl">Unsaved</Badge> : null}
                          {Number.isFinite(used) ? (
                            <Badge variant="secondary" className="rounded-xl">
                              Used: {used}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Name</div>
                            <Input
                              className="rounded-2xl"
                              value={nameVal}
                              onChange={(e) =>
                                setDraftName((p) => ({ ...p, [r.location_id]: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Description</div>
                            <Input
                              className="rounded-2xl"
                              value={descVal}
                              onChange={(e) =>
                                setDraftDesc((p) => ({ ...p, [r.location_id]: e.target.value }))
                              }
                              placeholder="(optional)"
                            />
                          </div>
                        </div>

                        {r.description ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Current: {r.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-xl"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || savingId === r.location_id}
                        onClick={() => saveLocation(r.location_id)}
                      >
                        <Save className="mr-2 size-4" />
                        {savingId === r.location_id ? "Saving..." : "Save"}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="rounded-xl"
                            disabled={deleteDisabled}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {deletingId === r.location_id ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this location?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action is permanent and will be recorded in audit logs.
                              {used > 0 ? (
                                <>
                                  <br />
                                  <br />
                                  <b>Blocked:</b> This location is used by items (Used: {used}).
                                </>
                              ) : null}
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-xl"
                              onClick={() => {
                                if (used > 0) {
                                  toast.error("Cannot delete: location is used by items.");
                                  return;
                                }
                                deleteLocation(r.location_id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

      <div className="text-xs text-muted-foreground">
        Tip: delete is blocked if a location is referenced by lost/found items (to keep DB consistent).
      </div>
    </div>
  );
}
