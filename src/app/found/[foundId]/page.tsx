import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Hash,
  MapPin,
  Maximize2,
  Package,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PotentialOwners } from "@/components/matches/potential-owners";
import { FoundStaffActions } from "@/components/found/found-staff-actions";

export default async function FoundDetailPage({
  params,
}: {
  params: Promise<{ foundId: string }>;
}) {
  const { foundId: foundIdParam } = await params;
  const foundId = Number(foundIdParam);
  if (!Number.isFinite(foundId)) notFound();

  const item = await prisma.foundItem.findFirst({
    where: { found_id: foundId },
    select: {
      found_id: true,
      item_name: true,
      description: true,
      category_id: true,
      location_id: true,
      date_found: true,
      storage_location: true,
      image: true,
      status: true,
      date_created: true,
      category: { select: { category_name: true } },
      location: { select: { location_name: true } },
    },
  });

  if (!item) notFound();

  const session = await getSession();
  const role = String(session?.role || "").toUpperCase();
  const isPrivileged = role === "STAFF" || role === "ADMIN";

  const fmt = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const imgSrc = item.image || "/found-placeholder.svg";
  const statusUpper = String(item.status || "").toUpperCase();
  const isClaimed = statusUpper === "CLAIMED";
  const isReturned = statusUpper === "RETURNED";
  const foundDate = fmt.format(new Date(item.date_found));
  const postedDate = fmt.format(new Date(item.date_created));
  const statusLabel =
    statusUpper === "NEWLY_FOUND"
      ? "Newly found"
      : statusUpper === "CLAIMED"
        ? "Claimed"
        : statusUpper === "RETURNED"
          ? "Returned"
          : String(item.status || "")
              .toLowerCase()
              .replace(/_/g, " ")
              .replace(/\b\w/g, (m) => m.toUpperCase());
  const statusTone = isReturned
    ? "bg-blue-500/12 text-blue-700"
    : isClaimed
      ? "bg-zinc-500/12 text-zinc-700"
      : "bg-emerald-500/12 text-emerald-700";

  let claimSummary: { total: number; pending: number } | null = null;
  if (isPrivileged) {
    const [totalClaims, pendingClaims] = await Promise.all([
      prisma.claim.count({ where: { found_id: foundId } }),
      prisma.claim.count({ where: { found_id: foundId, claim_status: "PENDING" } }),
    ]);
    claimSummary = { total: totalClaims, pending: pendingClaims };
  }

  const backHref = isPrivileged ? "/staff/found" : "/found";
  const breadcrumbLabel = isPrivileged ? "Staff Inventory" : "Found Items";

  return (
    <AppShell>
      <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_15%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(60%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_45%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-6 text-[#111827]">
          <section className="rounded-3xl bg-white/88 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">
                  <Link href={backHref} className="transition-colors hover:text-[#111827]">
                    {breadcrumbLabel}
                  </Link>
                  <ChevronRight className="size-3.5" />
                  <span className="max-w-[240px] truncate text-[#111827] md:max-w-none">
                    {item.item_name}
                  </span>
                </div>

                <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight md:text-[32px]">
                  {item.item_name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
                  <span>{item.category.category_name}</span>
                  <span>•</span>
                  <span>{item.location.location_name}</span>
                  <span>•</span>
                  <span>Found {foundDate}</span>
                  {isPrivileged ? (
                    <>
                      <span>•</span>
                      <span>Stored at {item.storage_location}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPrivileged ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                    {role === "ADMIN" ? "Admin view" : "Staff view"}
                  </Badge>
                ) : null}
                <Badge
                  variant="secondary"
                  className={
                    "rounded-full border-0 px-3 py-1 text-[11px] font-medium shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] " +
                    statusTone
                  }
                >
                  {statusLabel}
                </Badge>
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] underline-offset-4 transition hover:text-[#111827] hover:underline"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
            <div className="flex flex-col gap-6">
              <Card className="group rounded-3xl border-0 overflow-hidden bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(0,0,0,0.10)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
                <div className="relative aspect-[16/10] bg-[#F8F7F6]">
                  <div className="absolute inset-6">
                    <Image
                      src={imgSrc}
                      alt={item.item_name}
                      fill
                      className="object-contain transition duration-500 ease-out group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                    />
                  </div>

                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    <a
                      href={imgSrc}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Expand image"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.65)] text-[#111827] shadow-[0_6px_18px_rgba(0,0,0,0.08)] backdrop-blur-md transition duration-300 ease-out hover:bg-white/90 hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)] hover:backdrop-blur-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/30"
                    >
                      <Maximize2 className="size-4" />
                    </a>
                    <a
                      href={imgSrc}
                      download
                      aria-label="Download image"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.65)] text-[#111827] shadow-[0_6px_18px_rgba(0,0,0,0.08)] backdrop-blur-md transition duration-300 ease-out hover:bg-white/90 hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)] hover:backdrop-blur-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F0101]/30"
                    >
                      <Download className="size-4" />
                    </a>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#F8F7F6]" />

                  {isClaimed ? (
                    <div className="absolute left-4 top-4 rounded-full border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.72)] px-3 py-1 text-xs font-medium text-[#6B7280] shadow-[0_6px_18px_rgba(0,0,0,0.08)] backdrop-blur-md">
                      Already claimed
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="rounded-3xl border-0 bg-white/90 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
                <div className="text-sm font-medium">Details</div>
                <div className="mt-3 rounded-2xl bg-[#F8F7F6] p-4 ring-1 ring-[rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <FileText className="size-3.5" />
                    <span>Description</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#6B7280]">
                    {item.description}
                  </p>
                </div>

                <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-[rgba(0,0,0,0.06)] sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      label: "Found date",
                      value: foundDate,
                      Icon: CalendarDays,
                    },
                    {
                      label: "Location found",
                      value: item.location.location_name,
                      Icon: MapPin,
                    },
                    {
                      label: "Stored at",
                      value: item.storage_location,
                      Icon: Package,
                    },
                    {
                      label: "Status",
                      value: statusLabel,
                      Icon: ShieldCheck,
                    },
                    {
                      label: "Posted",
                      value: postedDate,
                      Icon: Clock,
                    },
                    {
                      label: "Category",
                      value: item.category.category_name,
                      Icon: Tag,
                    },
                    {
                      label: "Item ID",
                      value: `#${item.found_id}`,
                      Icon: Hash,
                      muted: true,
                    },
                  ].map(({ label, value, Icon, muted }) => (
                    <div
                      key={label}
                      className="bg-white/90 p-3.5"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                        <Icon className="size-3.5" />
                        <span>{label}</span>
                      </div>
                      <div
                        className={
                          "mt-2 text-[13px] font-medium " +
                          (muted ? "text-[#6B7280]" : "text-[#111827]")
                        }
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>

            <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-24">
              {isPrivileged ? (
                <FoundStaffActions
                  foundId={item.found_id}
                  status={item.status}
                  storageLocation={item.storage_location}
                  image={item.image}
                  variant="compact"
                  claimSummary={claimSummary}
                />
              ) : (
                <Card className="rounded-3xl border-0 bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFC_100%)] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.08)] ring-1 ring-[rgba(0,0,0,0.05)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Claim this item</div>
                    <span className="rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                      3 steps
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">
                    If this belongs to you, start a claim and staff will review your proof.
                  </div>

                  <div className="relative mt-4 grid gap-2 text-[13px] text-[#6B7280]">
                    <div className="absolute left-[9px] top-2 hidden h-[58px] w-px bg-[#7F0101]/15 sm:block" />
                    {[
                      "Start claim",
                      "Upload proof",
                      "Staff review",
                    ].map((step, idx) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className="flex size-[18px] items-center justify-center rounded-full bg-[#7F0101]/12 text-[10px] font-semibold text-[#7F0101]">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-[11px] text-[#6B7280]">
                    Review time varies; most claims are reviewed within 24–48 hours.
                  </div>

                  <details className="group mt-4 rounded-2xl bg-white/70 p-3 ring-1 ring-[rgba(0,0,0,0.05)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-medium text-[#111827]">
                      What counts as proof?
                      <ChevronDown className="size-4 text-[#6B7280] transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 text-[11px] text-[#6B7280]">
                      Clear photos, unique markings, receipts, or serial numbers that match the item.
                    </div>
                  </details>

                  <Separator className="my-5" />

                  {isClaimed ? (
                    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-[rgba(0,0,0,0.05)]">
                      <div className="font-medium text-[#111827]">This item is already claimed</div>
                      <div className="mt-1 text-sm text-[#6B7280]">
                        If you believe this is a mistake, please contact the staff office.
                      </div>
                      <Button
                        className="mt-4 w-full rounded-xl transition hover:brightness-105 active:scale-[0.98]"
                        variant="outline"
                        asChild
                      >
                        <Link href="/found">Browse other items</Link>
                      </Button>
                    </div>
                  ) : isReturned ? (
                    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-[rgba(0,0,0,0.05)]">
                      <div className="font-medium text-[#111827]">This item has been returned</div>
                      <div className="mt-1 text-sm text-[#6B7280]">
                        This item is no longer available for claiming.
                      </div>
                      <Button
                        className="mt-4 w-full rounded-xl transition hover:brightness-105 active:scale-[0.98]"
                        variant="outline"
                        asChild
                      >
                        <Link href="/found">Browse other items</Link>
                      </Button>
                    </div>
                  ) : session ? (
                    <div className="flex flex-col gap-2">
                      <Button className="w-full rounded-xl transition hover:brightness-105 active:scale-[0.98]" asChild>
                        <Link href={`/claims/new?foundId=${item.found_id}`}>Start claim</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full rounded-xl text-[12px] text-[#6B7280] transition hover:bg-transparent hover:text-[#111827] hover:underline"
                        asChild
                      >
                        <Link href="/found">This isn’t mine</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full rounded-xl text-[12px] text-[#6B7280] transition hover:bg-transparent hover:text-[#111827] hover:underline"
                        asChild
                      >
                        <Link href="/notifications">Ask staff a question</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full rounded-xl transition hover:brightness-105 active:scale-[0.98]" asChild>
                      <Link href={`/login?next=/found/${item.found_id}`}>Sign in to claim</Link>
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </div>

          <PotentialOwners
            role={session?.role ?? null}
            found={{
              found_id: item.found_id,
              item_name: item.item_name,
              description: item.description,
              category_id: item.category_id,
              location_id: item.location_id,
              date_found: new Date(item.date_found),
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
