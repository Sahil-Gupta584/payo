import * as React from "react"
import { cn } from "#/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-border/80 bg-background/60 px-3 py-1 text-base shadow-[0_1px_2px_0_rgba(0,0,0,0.03),inset_0_1px_1px_0_rgba(0,0,0,0.02)] transition-[color,box-shadow,border-color] duration-[var(--duration-quick)] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-foreground/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-border/70 dark:bg-input/20 dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_1px_1px_0_rgba(255,255,255,0.03)] dark:hover:border-foreground/30",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:shadow-[0_0_0_1px_var(--primary)]",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
