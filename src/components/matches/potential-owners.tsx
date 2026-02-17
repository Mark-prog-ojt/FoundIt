import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { scoreLostVsFound } from "@/lib/matching";
import { Mail, Sparkles, UserRound, ArrowUpRight } from "lucide-react";

type Role = "USER" | "STAFF" | "ADMIN";

type FoundInput = {
  found_id: number;
  item_name: string;
  description: string;
  category_id: number;
  location_id: number;
  date_found: Date;
};

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (score >= 60) return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  return "bg-muted/70 text-muted-foreground border-border/60";
}

export async function PotentialOwners({
  found,
  role,
}: {
  found: FoundInput;
  role: Role | null;
}) {
  const isPrivileged = role === "STAFF" || role === "ADMIN";
  if (!isPrivileged) return null;

  const rows = await prisma.match.findMany({
    where: { found_id: found.found_id },
    orderBy: { match_score: "desc" },
    take: 10,
    select: {
      match_score: true,
      lost_item: {
        select: {
          lost_id: true,
          item_name: true,
          description: true,
          date_lost: true,
          status: true,
          category_id: true,
          location_id: true,
          category: { select: { category_name: true } },
          location: { select: { location_name: true } },
          user: { select: { full_name: true, email: true } },
        },
      },
    },
  });

  const fmt = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <Card className="rounded-3xl border-0 bg-white/90 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[11px] text-[#6B7280] ring-1 ring-black/5">
            <Sparkles className="size-3.5" />
            Reverse matching
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Potential owners</h2>
            <Badge variant="secondary" className="rounded-xl">
              Top {Math.min(10, rows.length)}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            These lost reports were previously matched against this found item.
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      {rows.length === 0 ? (
        <EmptyState
          title="No potential owners yet"
          description="Matches appear after users report lost items, or when staff logs new found items."
          icon={<UserRound className="size-5" />}
          className="bg-white/70 shadow-none"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const lost = r.lost_item;

            // Recompute reasons for display (matches are persisted; reasons are explainability only)
            const { reasons } = scoreLostVsFound(
              {
                item_name: lost.item_name,
                description: lost.description,
                category_id: lost.category_id,
                location_id: lost.location_id,
                date: new Date(lost.date_lost),
              },
              {
                item_name: found.item_name,
                description: found.description,
                category_id: found.category_id,
                location_id: found.location_id,
                date: new Date(found.date_found),
              }
            );

            const score = Math.round(Number(r.match_score));
            const mailto = `mailto:${lost.user.email}?subject=FoundIt%20Possible%20Match&body=Hi%20${encodeURIComponent(
              lost.user.full_name
            )},%0A%0AWe%20may%20have%20found%20an%20item%20that%20matches%20your%20lost%20report%20(ID%20${lost.lost_id}).%0A%0APlease%20check%20your%20report%20here:%20${encodeURIComponent(
              `/lost/${lost.lost_id}`
            )}%0A`;

            return (
              <Card
                key={lost.lost_id}
                className="rounded-3xl border-0 bg-white/80 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={
                          "rounded-xl border px-2.5 py-1 text-xs font-medium " + scoreTone(score)
                        }
                      >
                        {score}% match
                      </div>
                      <Badge variant="secondary" className="rounded-xl">
                        {lost.status}
                      </Badge>
                    </div>

                    <div className="mt-2 font-semibold truncate">
                      {lost.item_name}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {lost.category.category_name} • {lost.location.location_name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Lost: {fmt.format(new Date(lost.date_lost))}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound className="size-3.5" />
                      Owner
                    </div>
                    <div className="mt-1 text-sm font-medium">{lost.user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{lost.user.email}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {reasons.slice(0, 3).map((x) => (
                    <span
                      key={x}
                      className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-black/5"
                    >
                      {x}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button className="rounded-xl" variant="outline" asChild>
                    <Link href={`/lost/${lost.lost_id}`}>
                      View report <ArrowUpRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button className="rounded-xl" asChild>
                    <a href={mailto}>
                      Email <Mail className="ml-2 size-4" />
                    </a>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
