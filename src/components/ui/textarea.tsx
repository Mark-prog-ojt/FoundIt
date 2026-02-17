import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        [
          "flex field-sizing-content min-h-24 w-full",
          "rounded-xl",
          "border border-border/70",
          "bg-card px-3 py-2",
          "text-base text-foreground",
          "placeholder:text-muted-foreground",
          "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
          "transition-[box-shadow,border-color,background-color] duration-200 ease-out",
          "outline-none",
          "focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/20 focus-visible:shadow-[0_10px_20px_rgba(127,1,1,0.12)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:ring-[4px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          "md:text-sm",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
