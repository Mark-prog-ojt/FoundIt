import * as React from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  centered?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actions,
  centered = false,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-0 bg-card/95 p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/5",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3", centered && "items-center text-center")}>
        {icon ? (
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-secondary/70 text-muted-foreground ring-1 ring-black/5">
            {icon}
          </div>
        ) : null}
        <div className="text-base font-semibold tracking-tight text-foreground">{title}</div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
        {actions ? (
          <div className={cn("mt-2 flex flex-wrap gap-2", centered && "justify-center")}>
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

type LoadingCardProps = {
  variant?: "list" | "media";
  className?: string;
};

function LoadingCard({ variant = "list", className }: LoadingCardProps) {
  const media = variant === "media";

  return (
    <Card
      className={cn(
        "rounded-3xl border-0 bg-card/95 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/5 animate-pulse",
        media ? "overflow-hidden p-0" : "p-5",
        className
      )}
    >
      {media ? <div className="aspect-[4/3] bg-muted/80" /> : null}
      <div className={cn(media ? "p-5" : "", "space-y-3")}>
        <div className="h-4 w-1/3 rounded-full bg-muted/80" />
        <div className="h-4 w-2/3 rounded-full bg-muted/80" />
        <div className="h-3 w-full rounded-full bg-muted/70" />
        <div className="h-3 w-5/6 rounded-full bg-muted/70" />
      </div>
    </Card>
  );
}

type LoadingGridProps = {
  count?: number;
  variant?: "list" | "media";
  className?: string;
  cardClassName?: string;
};

export function LoadingGrid({
  count = 6,
  variant = "list",
  className,
  cardClassName,
}: LoadingGridProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <LoadingCard key={idx} variant={variant} className={cardClassName} />
      ))}
    </div>
  );
}
