"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RefreshCw, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";

type RoleRow = {
  role_id: number;
  role_name: string;
  usersCount: number;
};

export function RolesAdmin() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RoleRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles/list", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load roles.");
        setItems([]);
        return;
      }

      setItems(data.items || []);
    } catch {
      toast.error("Failed to load roles.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <LoadingGrid count={4} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No roles found"
        description="If this looks wrong, check your seed or roles table."
        icon={<Users2 className="size-5" />}
        actions={
          <Button className="rounded-xl" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{items.length}</span> roles
        </div>
        <Button className="rounded-xl" variant="outline" onClick={load}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3">
        {items.map((r, idx) => (
          <motion.div
            key={r.role_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.01 }}
          >
            <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#F8F7F6] text-[#6B7280] ring-1 ring-black/5">
                    <Users2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{r.role_name}</div>
                      <Badge variant="secondary" className="rounded-xl">
                        #{r.role_id}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-2">
                      <Users2 className="size-4" />
                      {r.usersCount} user{r.usersCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <Badge className="rounded-xl" variant="secondary">
                  Read-only
                </Badge>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
