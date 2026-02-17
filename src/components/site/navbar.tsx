"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  LogIn,
  LogOut,
  UserRound,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  FileText,
  Users,
  PackageSearch,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { cn } from "@/lib/utils";

type Session = {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
  avatarUrl?: string | null;
};

const CHANNEL_NAME = "foundit-auth";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard };

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/audit", label: "Audit logs", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
];

const STAFF_LINKS: NavLink[] = [
  { href: "/staff/dashboard", label: "Claims", icon: ClipboardList },
  { href: "/staff/found/new", label: "New found", icon: PlusCircle },
  { href: "/staff/found", label: "Inventory", icon: PackageSearch },
  { href: "/found", label: "Browse found", icon: LayoutDashboard },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RoleQuickLinks({ role, pathname }: { role: Session["role"]; pathname: string | null }) {
  if (role === "ADMIN") {
    return (
      <div className="hidden flex-1 items-center gap-3 md:flex">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] ring-1 ring-black/5">
          <span className="size-1.5 rounded-full bg-[#7F0101]" />
          Admin
        </span>

        <div className="flex items-center gap-1 rounded-full bg-white/75 p-1 ring-1 ring-black/5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                  active
                    ? "bg-white text-[#111827] shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-white/70"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (role === "STAFF") {
    return (
      <div className="hidden flex-1 items-center gap-3 md:flex">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] ring-1 ring-black/5">
          <span className="size-1.5 rounded-full bg-[#EBC113]" />
          Staff
        </span>

        <div className="flex items-center gap-1 rounded-full bg-white/75 p-1 ring-1 ring-black/5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          {STAFF_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                  active
                    ? "bg-white text-[#111827] shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-white/70"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function RoleQuickLinksMobile({ role, pathname }: { role: Session["role"]; pathname: string | null }) {
  if (role === "ADMIN") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 p-2 ring-1 ring-black/5">
        {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                active
                  ? "bg-white text-[#111827] shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-white/70"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  if (role === "STAFF") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 p-2 ring-1 ring-black/5">
        {STAFF_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/25",
                active
                  ? "bg-white text-[#111827] shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-white/70"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return null;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // undefined = loading, null = logged out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const [navQ, setNavQ] = useState("");

  const initials = useMemo(() => {
    if (!session || !session.name) return "FI";
    const parts = session.name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "F";
    const b = parts[parts.length - 1]?.[0] ?? "I";
    return (a + b).toUpperCase();
  }, [session]);

  const avatarUrl = session?.avatarUrl ?? null;

  const role = session && session !== undefined ? session.role : null;
  const isLoggedIn = !!session && session !== undefined;
  const showSearch = session === null || role === "USER"; // STAFF/ADMIN = no search

  async function refreshSession() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSession(null);
        return;
      }
      setSession(d?.session ?? null);
    } catch {
      setSession(null);
    }
  }

  function goSearch(raw: string) {
    const term = (raw || "").trim();
    if (!term) {
      router.push("/found");
      return;
    }
    const sp = new URLSearchParams();
    sp.set("q", term);
    router.push(`/found?${sp.toString()}`);
  }

  useEffect(() => {
    refreshSession();

    // Prefill navbar search if already on /found?q=...
    try {
      const path = window.location.pathname || "";
      if (path.startsWith("/found")) {
        const sp = new URLSearchParams(window.location.search);
        const q = (sp.get("q") || "").trim();
        if (q) setNavQ(q);
      }
    } catch {}

    try {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bcRef.current = bc;
      bc.onmessage = () => refreshSession();
    } catch {}

    const onFocus = () => refreshSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshSession();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      bcRef.current?.close();
      bcRef.current = null;
    };
  }, []);

  function broadcastAuthChange() {
    try {
      bcRef.current?.postMessage({ type: "auth-changed" });
    } catch {}
  }

  async function signOut() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error();

      toast.success("Signed out.");
      broadcastAuthChange();
      setSession(null);
      window.location.href = "/login";
    } catch {
      toast.error("Sign out failed.");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 md:px-6 lg:px-10"
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-accent"
          >
            <div className="relative grid size-8 place-items-center overflow-hidden rounded-full border border-border bg-white shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
              <Image
                src="/brand/pup-seal.png"
                alt="PUP seal"
                fill
                sizes="32px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">FoundIt!</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Lost & Found Hub</div>
            </div>
          </Link>
        </motion.div>

        {showSearch ? (
          <div className="ml-2 hidden flex-1 items-center md:flex">
            <motion.form
              onSubmit={(e) => {
                e.preventDefault();
                goSearch(navQ);
              }}
              className="relative w-full max-w-xl"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Search found items..."
                className="pl-9 rounded-xl transition focus-visible:ring-2"
              />
            </motion.form>
          </div>
        ) : role ? (
          <RoleQuickLinks role={role} pathname={pathname} />
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          {role === "USER" ? (
            <motion.div className="hidden sm:block" whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </Button>
            </motion.div>
          ) : null}

          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
            <NotificationsBell isLoggedIn={isLoggedIn} />
          </motion.div>

          {session && session !== undefined ? (
            <>
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }} className="hidden sm:block">
                <Badge variant="secondary" className="rounded-xl">
                  {session.role}
                </Badge>
              </motion.div>

              {/* Profile link (desktop): name pill */}
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }} className="hidden md:block">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border px-3 py-1.5 transition hover:bg-accent"
                  aria-label="Open profile"
                  title="Profile"
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  <div className="text-sm font-medium leading-none">{session.name}</div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Button variant="outline" className="rounded-xl" onClick={signOut}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </Button>
              </motion.div>

              {/* Profile link (all sizes): avatar */}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link href="/profile" aria-label="Open profile" title="Profile">
                  <Avatar className="group size-9 shadow-[0_10px_24px_rgba(127,1,1,0.18)] transition hover:shadow-[0_14px_32px_rgba(127,1,1,0.28)]">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={session.name} /> : null}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 blur-md transition group-hover:opacity-100 group-hover:blur-xl bg-[#7F0101]/20" />
                  </Avatar>
                </Link>
              </motion.div>
            </>
          ) : session === null ? (
            <>
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 size-4" />
                    Sign in
                  </Link>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">FI</AvatarFallback>
                </Avatar>
              </motion.div>
            </>
          ) : null}
        </div>
      </motion.div>

      {showSearch ? (
        <div className="mx-auto max-w-[1440px] px-4 pb-3 md:px-6 lg:px-10 md:hidden">
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goSearch(navQ);
              }}
              className="relative flex-1"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Search found items..."
                className="pl-9 rounded-xl"
              />
            </form>

            {role === "USER" ? (
              <Button variant="outline" className="h-10 rounded-xl px-3" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : role ? (
        <div className="mx-auto max-w-[1440px] px-4 pb-3 md:px-6 lg:px-10 md:hidden">
          <RoleQuickLinksMobile role={role} pathname={pathname} />
        </div>
      ) : null}
    </header>
  );
}
