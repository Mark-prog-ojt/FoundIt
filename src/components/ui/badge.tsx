import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap shrink-0",
    "rounded-full",
    "px-2.5 py-1",
    "text-[11px] font-medium leading-none",
    "border border-border/60",
    "transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
    "[&>svg]:size-3 [&>svg]:pointer-events-none gap-1",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:border-ring/60",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary badge (status highlight)
        default: "bg-primary/12 text-primary border-primary/15",
        // Calm pill on neutral surface (most common)
        secondary: "bg-secondary/70 text-secondary-foreground border-border/60",
        // Transparent but still “designed”
        outline: "bg-transparent text-foreground border-border/60 shadow-none",
        // Soft chip
        ghost: "bg-secondary/45 text-foreground border-transparent shadow-none",
        // Danger
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // Link-like
        link: "text-primary border-transparent shadow-none underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
