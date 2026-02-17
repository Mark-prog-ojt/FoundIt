import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { WithdrawButton } from "@/components/lost/withdraw-button";
import { SuggestedMatches } from "@/components/matches/suggested-matches";

export default async function LostDetailPage({
  params,
}: {
  params: Promise<{ lostId: string }>;
}) {
  const session = await requireSession();
  const { lostId: lostIdParam } = await params;

  const lostId = Number(lostIdParam);
  if (!Number.isFinite(lostId)) notFound();

  const report = await prisma.lostItem.findFirst({
    where: { lost_id: lostId },
    select: {
      lost_id: true,
      item_name: true,
      description: true,
      status: true,
      date_lost: true,
      last_seen_location: true,
      image: true,
      date_created: true,
      user_id: true,
      category: { select: { category_name: true } },
      location: { select: { location_name: true } },
      user: { select: { full_name: true, email: true } },
    },
  });

  if (!report) notFound();

  // USER can only view their own report; STAFF/ADMIN can view any.
  if (session.role === "USER" && report.user_id !== session.userId) {
    redirect("/");
  }

  const isOwner = report.user_id === session.userId;
  const canWithdraw = isOwner || session.role === "ADMIN";
  const isCancelled = report.status === "CANCELLED";

  const fmt = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Lost Report</div>
            <h1 className="text-2xl font-semibold tracking-tight">{report.item_name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-xl">
              {report.status}
            </Badge>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl p-6 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[240px]">
                <div className="text-sm font-medium">Description</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {report.description}
                </p>
              </div>

              {canWithdraw && !isCancelled ? (
                <div className="shrink-0">
                  <WithdrawButton lostId={report.lost_id} />
                </div>
              ) : null}
            </div>

            {isCancelled ? (
              <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-sm">
                This report has been <span className="font-semibold">CANCELLED</span>.
              </div>
            ) : null}

            <Separator className="my-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="mt-1 font-medium">{report.category.category_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="mt-1 font-medium">{report.location.location_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date lost</div>
                <div className="mt-1 font-medium">{fmt.format(new Date(report.date_lost))}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="mt-1 font-medium">{fmt.format(new Date(report.date_created))}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Last seen details</div>
                <div className="mt-1 font-medium">{report.last_seen_location}</div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <div className="text-sm font-medium">Owner</div>
            <div className="mt-2">
              <div className="font-semibold">{report.user.full_name}</div>
              <div className="text-sm text-muted-foreground">{report.user.email}</div>
            </div>

            <Separator className="my-5" />

            <div className="text-sm font-medium">Photo</div>
            {report.image ? (
              <div className="mt-3 overflow-hidden rounded-2xl border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={report.image} alt="Lost item" className="h-48 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                No image provided.
              </div>
            )}
          </Card>
        </div>

        <SuggestedMatches lostId={report.lost_id} />
      </div>
    </AppShell>
  );
}
