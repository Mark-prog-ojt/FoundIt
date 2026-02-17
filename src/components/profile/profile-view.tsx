"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  BadgeCheck,
  Hash,
  Building2,
  Save,
  Shield,
  CalendarDays,
  Camera,
  Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type ProfileUser = {
  user_id: number;
  full_name: string;
  email: string;
  id_number: string;
  department: string | null;
  avatar_url: string | null;
  status: string;
  date_registered: string;
  role: "USER" | "STAFF" | "ADMIN" | string;
};

function formatLabel(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getInitials(value: string) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function ProfileView({ initialUser }: { initialUser: ProfileUser }) {
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUser.avatar_url ?? null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(initialUser.full_name);
  const [department, setDepartment] = useState(initialUser.department ?? "");

  const dirty = useMemo(() => {
    const a = (initialUser.full_name || "").trim();
    const b = (fullName || "").trim();
    const d0 = (initialUser.department || "").trim();
    const d1 = (department || "").trim();
    return a !== b || d0 !== d1;
  }, [fullName, department, initialUser.full_name, initialUser.department]);

  const fmtDate = useMemo(() => {
    try {
      const d = new Date(initialUser.date_registered);
      return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "2-digit" }).format(d);
    } catch {
      return String(initialUser.date_registered || "");
    }
  }, [initialUser.date_registered]);

  const initials = useMemo(
    () => getInitials((fullName || "").trim() || (initialUser.full_name || "").trim()),
    [fullName, initialUser.full_name]
  );

  const statusLabel = useMemo(() => formatLabel(initialUser.status), [initialUser.status]);
  const roleLabel = useMemo(() => formatLabel(initialUser.role), [initialUser.role]);

  const saveStateLabel = saving ? "Saving..." : dirty ? "Unsaved changes" : "All changes saved";
  const avatarSrc = avatarPreview ?? avatarUrl;

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      e.target.value = "";
      return;
    }
    const previous = avatarUrl;
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarBusy(true);

    const form = new FormData();
    form.append("file", file);

    void (async () => {
      try {
        const uploadRes = await fetch("/api/uploads/avatar", {
          method: "POST",
          body: form,
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadJson?.ok || !uploadJson?.url) {
          throw new Error(uploadJson?.error || "Upload failed.");
        }

        const saveRes = await fetch("/api/profile/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: uploadJson.url }),
        });
        const saveJson = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok || !saveJson?.ok) {
          throw new Error(saveJson?.error || "Failed to save avatar.");
        }

        setAvatarUrl(uploadJson.url);
        toast.success("Profile photo updated.");
      } catch (err) {
        console.error(err);
        setAvatarUrl(previous);
        toast.error("Avatar update failed.");
      } finally {
        setAvatarBusy(false);
        setAvatarPreview(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    })();
  }

  async function save() {
    const nextFull = fullName.trim();
    const nextDept = department.trim();

    if (!nextFull) {
      toast.error("Full name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: nextFull,
          department: nextDept ? nextDept : null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        toast.error(json?.error || "Failed to update profile.");
        return;
      }

      toast.success("Profile updated.");
      // Keep UI aligned with saved state by mutating the initial baseline via a reload-less approach:
      // since this component is driven by local state, we just ensure trims are applied.
      setFullName(nextFull);
      setDepartment(nextDept);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-6 text-[#111827]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-white/86 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur">
            <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#7F0101]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#7F0101]/8 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative">
                  <div className="group relative flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#7F0101,#922727)] text-lg font-semibold text-white shadow-[0_14px_30px_rgba(127,1,1,0.35)]">
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt="Profile"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      initials
                    )}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                      <div className="absolute inset-0 bg-black/15" />
                    </div>
                    {avatarBusy ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/20">
                        <Loader2 className="size-4 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    disabled={avatarBusy}
                    className="absolute -bottom-2 -right-2 inline-flex size-8 items-center justify-center rounded-full border border-[rgba(0,0,0,0.06)] bg-white/80 text-[#111827] shadow-[0_8px_18px_rgba(0,0,0,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/30 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Upload profile photo"
                  >
                    {avatarBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                    <UserIcon className="size-3.5" />
                    Profile
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-[30px]">
                      {fullName || "Your account"}
                    </h1>
                    <p className="text-sm text-[#6B7280]">{initialUser.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full px-3 py-1 text-[11px] font-medium">
                      {roleLabel}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                      {statusLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button
                  className="rounded-2xl px-5 shadow-[0_10px_26px_rgba(127,1,1,0.25)] transition hover:-translate-y-0.5"
                  onClick={save}
                  disabled={!dirty || saving}
                >
                  <Save className="mr-2 size-4" />
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <div className="inline-flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <span
                    className={`size-1.5 rounded-full ${
                      saving ? "bg-[#7F0101]" : dirty ? "bg-[#EBC113]/80" : "bg-emerald-400"
                    }`}
                  />
                  {saveStateLabel}
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Personal information</div>
                  <div className="mt-1 text-sm text-[#6B7280]">
                    These details help staff verify claims and contact you.
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F8F7F6] p-2.5 ring-1 ring-black/5">
                  <BadgeCheck className="size-5 text-[#6B7280]" />
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                    Full name
                  </div>
                  <div className="group rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-black/5 transition focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#7F0101]/25 focus-within:shadow-[0_10px_20px_rgba(127,1,1,0.12)]">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                    Department / Course
                  </div>
                  <div className="group rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-black/5 transition focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#7F0101]/25 focus-within:shadow-[0_10px_20px_rgba(127,1,1,0.12)]">
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-10 border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
                      placeholder="e.g., Engineering"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#F8F7F6] p-4 text-[12px] text-[#6B7280] ring-1 ring-[rgba(0,0,0,0.05)]">
                Tip: Keep your department updated to speed up verification when claiming an item.
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Account</div>
                  <div className="mt-1 text-sm text-[#6B7280]">Read-only identifiers</div>
                </div>
                <div className="rounded-2xl bg-[#F8F7F6] p-2.5 ring-1 ring-black/5">
                  <Shield className="size-5 text-[#6B7280]" />
                </div>
              </div>

              <Separator className="my-5" />

              <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
                {[
                  { label: "Email", value: initialUser.email, Icon: Mail },
                  { label: "ID number", value: initialUser.id_number, Icon: Hash },
                  {
                    label: "Department",
                    value: (department || "").trim() || "No department set",
                    Icon: Building2,
                  },
                  { label: "Registered", value: fmtDate, Icon: CalendarDays },
                ].map(({ label, value, Icon }, idx, arr) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between gap-4 bg-white/80 px-4 py-3 ${
                      idx !== arr.length - 1 ? "border-b border-black/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                      <Icon className="size-3.5" />
                      {label}
                    </div>
                    <div className="max-w-[60%] truncate text-[13px] font-medium text-[#111827]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
