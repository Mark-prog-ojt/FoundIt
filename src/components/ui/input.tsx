import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        [
          "w-full min-w-0",
          "h-10 px-3",
          "rounded-xl",
          "border border-border/70",
          "bg-card text-foreground",
          "placeholder:text-muted-foreground",
          "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
          "transition-[box-shadow,border-color,background-color] duration-200 ease-out",
          "outline-none",
          "focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/20 focus-visible:shadow-[0_10px_20px_rgba(127,1,1,0.12)]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:ring-[4px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          "md:text-sm",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export { Input }
