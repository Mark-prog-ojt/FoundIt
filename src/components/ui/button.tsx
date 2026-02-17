import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl text-sm font-medium",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "outline-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/20",
    "aria-invalid:ring-[4px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(127,1,1,0.25)] hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_14px_32px_rgba(127,1,1,0.3)] active:translate-y-0 active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-[0_10px_24px_rgba(255,59,48,0.22)] hover:-translate-y-0.5 hover:bg-destructive/92 hover:shadow-[0_14px_32px_rgba(255,59,48,0.28)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border/70 bg-card/90 shadow-[0_1px_0_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-[0.98]",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:bg-secondary hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:translate-y-0 active:scale-[0.98]",
        ghost:
          "hover:bg-secondary hover:text-foreground active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
