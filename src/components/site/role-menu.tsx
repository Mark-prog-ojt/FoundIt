"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, LayoutDashboard, FileText, Users, Tag, MapPin, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function RoleMenu({ role }: { role: "USER" | "STAFF" | "ADMIN" }) {
  if (role === "USER") return null;

  const isAdmin = role === "ADMIN";
  const isStaff = role === "STAFF";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
          <Button variant="outline" className="rounded-xl">
            {isAdmin ? <ShieldCheck className="mr-2 size-4" /> : <LayoutDashboard className="mr-2 size-4" />}
            {isAdmin ? "Admin tools" : "Staff tools"}
          </Button>
        </motion.div>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[280px] rounded-3xl p-0">
        <div className="p-4">
          <div className="text-sm font-semibold">{isAdmin ? "Admin" : "Staff"} shortcuts</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Quick access for {role.toLowerCase()} actions.
          </div>
        </div>

        <Separator />

        <div className="p-2 grid gap-2">
          {isStaff ? (
            <>
              <Link href="/staff/dashboard" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="size-4 text-muted-foreground" />
                  <div className="font-medium">Staff dashboard</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Review claims and manage queue</div>
              </Link>

              <Link href="/staff/found/new" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" />
                  <div className="font-medium">Create found item</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Add found item and auto-match</div>
              </Link>

              <Link href="/staff/found" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <PackageSearch className="size-4 text-muted-foreground" />
                  <div className="font-medium">Found inventory</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Search, filter, and manage found items
                </div>
              </Link>
            </>
          ) : null}

          {isAdmin ? (
            <>
              <Link href="/admin/dashboard" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <div className="font-medium">Admin dashboard</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Central admin console</div>
              </Link>

              <Link href="/admin/audit" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="font-medium">Audit logs</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Security & action history</div>
              </Link>

              <Link href="/admin/users" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <div className="font-medium">Users</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Roles and status updates</div>
              </Link>

              <Link href="/admin/categories" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" />
                  <div className="font-medium">Categories</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Browse category usage</div>
              </Link>

              <Link href="/admin/locations" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div className="font-medium">Locations</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Browse location usage</div>
              </Link>

              <Link href="/admin/roles" className="rounded-2xl border p-3 hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <div className="font-medium">Roles</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">View role distribution</div>
              </Link>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
