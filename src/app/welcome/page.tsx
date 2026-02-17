"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/site/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, FilePlus2, ScanSearch, ShieldCheck, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <AppShell>
      <motion.section
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-background to-muted/30 p-8 md:p-12"
      >
        {/* subtle background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-80 rounded-full bg-muted/50 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-muted/50 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute right-6 top-6 hidden md:block">
          <div className="relative size-16 rounded-full border border-border bg-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
            <Image src="/brand/pup-seal.png" alt="PUP seal" fill className="object-contain p-2" priority />
          </div>
        </div>

        <div className="relative flex flex-col gap-6">
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-xl px-3 py-1">Campus-ready</Badge>
              <Badge variant="secondary" className="rounded-xl px-3 py-1">
                Role-based access
              </Badge>
              <Badge variant="outline" className="rounded-xl px-3 py-1">
                Smart matching
              </Badge>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl"
          >
            FoundIt! — a modern Lost &amp; Found hub for faster item recovery.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            Report lost items, log found items, search the database, and manage claims with verification — all in one clean,
            user-friendly system.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Button
              className="rounded-xl transition hover:-translate-y-0.5"
              onClick={() => toast.success("Next: we’ll build real pages + auth!")}
            >
              Get started <ArrowRight className="ml-2 size-4" />
            </Button>

            <Button
              variant="outline"
              className="rounded-xl transition hover:-translate-y-0.5"
              asChild
            >
              <Link href="#features">
                Explore features <Search className="ml-2 size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      <section id="features" className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: FilePlus2,
            title: "Report Lost",
            desc: "Submit a lost item report with category, location, time, and details.",
            tag: "User",
          },
          {
            icon: ScanSearch,
            title: "Search & Match",
            desc: "Browse listings with filters and get suggested matches automatically.",
            tag: "User + Staff",
          },
          {
            icon: ShieldCheck,
            title: "Claim Verification",
            desc: "Track claim requests and approve/reject with staff verification flow.",
            tag: "Staff",
          },
        ].map((f, idx) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
          >
            <Card className="group h-full rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-11 place-items-center rounded-2xl border bg-background shadow-sm transition group-hover:shadow">
                  <f.icon className="size-5" />
                </div>
                <Badge variant="secondary" className="rounded-xl">
                  {f.tag}
                </Badge>
              </div>

              <div className="mt-4">
                <div className="text-lg font-semibold tracking-tight">{f.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>

              <div className="mt-4 text-sm text-muted-foreground transition group-hover:text-foreground">
                Learn more <span className="inline-block transition group-hover:translate-x-1">→</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </section>
    </AppShell>
  );
}
