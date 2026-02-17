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
import { ArrowRight, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, idNumber, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Registration failed.");
        return;
      }

      toast.success("Account created! You are now signed in.");
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
              <UserPlus className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Create an account</div>
              <div className="text-xs text-muted-foreground">FoundIt! Lost & Found Hub</div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Start reporting lost items in minutes.
          </h1>
          <p className="text-muted-foreground">
            Register with your ID number and email.
          </p>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-xl border px-3 py-1">Fast search</span>
            <span className="rounded-xl border px-3 py-1">Claim verification</span>
            <span className="rounded-xl border px-3 py-1">Smart matching</span>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/login">
              Sign in
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
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Juan Dela Cruz"
                  className="rounded-xl"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">ID number</Label>
                <Input
                  id="idNumber"
                  placeholder="U-1234"
                  className="rounded-xl"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
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
                  placeholder="At least 6 characters"
                  className="rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl transition hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create account"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </AuthShell>
  );
}
