"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AuthShell } from "@/components/site/auth-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("user@foundit.local");
  const [password, setPassword] = useState("user123");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Login failed.");
        return;
      }

      toast.success(`Welcome back, ${data?.user?.full_name || "user"}!`);
      window.location.href = "/dashboard";
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm">
            <div className="grid size-9 place-items-center rounded-xl border bg-muted/30">
              <LogIn className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Sign in</div>
              <div className="text-xs text-muted-foreground">Access your FoundIt! account</div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Welcome back.</h1>
          <p className="text-muted-foreground">
            Use the demo account to test quickly.
          </p>

          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">Demo accounts</div>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">User:</span> user@foundit.local / user123</div>
              <div><span className="font-medium text-foreground">Staff:</span> staff@foundit.local / staff123</div>
              <div><span className="font-medium text-foreground">Admin:</span> admin@foundit.local / admin123</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            No account yet?{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/register">
              Create one
            </Link>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <Card className="rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl transition hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </AuthShell>
  );
}
