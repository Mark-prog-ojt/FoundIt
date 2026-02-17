"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Tag, Plus, Pencil, Save, X, RefreshCw, Trash2, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";

type CategoryRow = {
  category_id: number;
  category_name: string;
  lostCount: number;
  foundCount: number;
  totalCount: number;
};

type ListPayload = {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: CategoryRow[];
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function CategoriesAdmin() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Create
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Rename/Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const stats = useMemo(() => {
    const totalCats = items.length;
    const totalRefs = items.reduce((acc, r) => acc + (r.totalCount || 0), 0);
    return { totalCats, totalRefs };
  }, [items]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (debouncedQ) sp.set("q", debouncedQ);
      sp.set("page", String(nextPage));
      sp.set("pageSize", "20");

      const res = await fetch(`/api/admin/categories/list?${sp.toString()}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<ListPayload> & { ok?: boolean; error?: string };

      if (!res.ok || !data?.ok) {
        toast.error((data as any)?.error || "Failed to load categories.");
        setItems([]);
        return;
      }

      setItems((data.items as CategoryRow[]) || []);
      setPage(Number(data.page || 1));
      setTotalPages(Number(data.totalPages || 1));
    } catch {
      toast.error("Failed to load categories.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  async function createCategory() {
    const name = newName.trim();
    if (name.length < 2) return toast.error("Category name is required.");
    if (name.length > 50) return toast.error("Category name is too long.");

    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryName: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Create failed.");
        return;
      }

      toast.success("Category created.");
      setNewName("");
      await load(1);
    } catch {
      toast.error("Network error.");
    } finally {
      setCreating(false);
    }
  }

  function beginRename(r: CategoryRow) {
    setEditingId(r.category_id);
    setEditDraft(r.category_name);
  }

  function cancelRename() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveRename(categoryId: number) {
    const name = editDraft.trim();
    if (name.length < 2) return toast.error("Category name is required.");
    if (name.length > 50) return toast.error("Category name is too long.");

    setSavingId(categoryId);
    try {
      const res = await fetch("/api/admin/categories/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId, categoryName: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Rename failed.");
        return;
      }

      toast.success("Category renamed.");
      cancelRename();
      await load(page);
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteCategory(categoryId: number) {
    setDeletingId(categoryId);
    try {
      const res = await fetch("/api/admin/categories/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Delete failed.");
        return;
      }

      toast.success("Category deleted.");
      const nextPage = clamp(page, 1, totalPages);
      await load(nextPage);
    } catch {
      toast.error("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{items.length}</span> categories
          <span className="mx-2">•</span>
          <span className="text-muted-foreground">
            refs: <span className="font-medium text-foreground">{stats.totalRefs}</span>
          </span>
        </div>

        <div className="flex gap-2">
          <Button className="rounded-xl" variant="outline" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create + Search */}
      <Card className="rounded-3xl p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-sm font-medium">Create category</div>
            <div className="mt-2 flex gap-2">
              <Input
                className="rounded-2xl"
                placeholder='e.g. "Electronics"'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button className="rounded-2xl" onClick={createCategory} disabled={creating}>
                <Plus className="mr-2 size-4" />
                {creating ? "Creating…" : "Add"}
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Creates via <Badge variant="secondary" className="rounded-xl">/api/admin/categories/create</Badge>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Search</div>
            <div className="mt-2 flex gap-2">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="rounded-2xl pl-9"
                  placeholder="Search categories…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Lists via <Badge variant="secondary" className="rounded-xl">/api/admin/categories/list</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      {loading ? (
        <LoadingGrid count={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Try clearing the search, or create a new category above."
          icon={<Tag className="size-5" />}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((r, idx) => {
            const isEditing = editingId === r.category_id;
            const busy = savingId === r.category_id || deletingId === r.category_id;

            return (
              <motion.div
                key={r.category_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
              >
                <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="grid size-12 place-items-center rounded-2xl bg-[#F8F7F6] text-[#6B7280] ring-1 ring-black/5">
                        <Tag className="size-5" />
                      </div>

                      <div className="min-w-0">
                        {!isEditing ? (
                          <div className="font-semibold truncate">{r.category_name}</div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              className="h-9 rounded-2xl"
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              placeholder="Category name"
                            />
                            <Button
                              className="h-9 rounded-2xl"
                              onClick={() => saveRename(r.category_id)}
                              disabled={busy}
                            >
                              <Save className="mr-2 size-4" />
                              Save
                            </Button>
                            <Button
                              className="h-9 rounded-2xl"
                              variant="outline"
                              onClick={cancelRename}
                              disabled={busy}
                            >
                              <X className="mr-2 size-4" />
                              Cancel
                            </Button>
                          </div>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="rounded-xl">
                            #{r.category_id}
                          </Badge>
                          <span className="inline-flex items-center gap-1">
                            Lost: <span className="text-foreground/80">{r.lostCount}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            Found: <span className="text-foreground/80">{r.foundCount}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            Total: <span className="text-foreground/80">{r.totalCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          className="rounded-2xl"
                          variant="outline"
                          onClick={() => beginRename(r)}
                          disabled={busy}
                        >
                          <Pencil className="mr-2 size-4" />
                          Rename
                        </Button>

                        <Button
                          className="rounded-2xl"
                          variant="outline"
                          onClick={() => deleteCategory(r.category_id)}
                          disabled={busy}
                          title={r.totalCount > 0 ? "May fail if in use (referenced by items)" : "Delete category"}
                        >
                          <Trash2 className="mr-2 size-4" />
                          {deletingId === r.category_id ? "Deleting…" : "Delete"}
                        </Button>

                        <Badge variant="secondary" className="rounded-xl">
                          Admin
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-xl">Editing</Badge>
                        <Badge variant="secondary" className="rounded-xl">
                          /api/admin/categories/update
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>

        <div className="flex gap-2">
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => load(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
          >
            Prev
          </Button>
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => load(Math.min(totalPages, page + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
