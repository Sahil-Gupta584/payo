import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-all duration-[var(--duration-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border border-blue-600/70 bg-primary text-primary-foreground ring-1 ring-blue-700/30 shadow-[0_1px_2px_0_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.45),inset_0_-1px_0_0_rgba(0,0,0,0.18)] hover:bg-primary/90 hover:ring-blue-700/50 hover:shadow-[0_2px_8px_0_rgba(0,122,255,0.35),inset_0_1px_0_0_rgba(255,255,255,0.5)] active:scale-[0.98] dark:border-blue-400/60 dark:ring-blue-400/40 dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.35)]",
        destructive:
          "border border-red-700/60 bg-destructive text-white ring-1 ring-red-800/30 shadow-[0_1px_2px_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:bg-destructive/90 hover:ring-red-800/45 hover:shadow-[0_2px_8px_0_rgba(255,59,48,0.3)] focus-visible:ring-destructive/30 active:scale-[0.98] dark:border-red-400/50 dark:ring-red-400/30",
        outline:
          "border border-border/90 bg-background/80 text-foreground ring-1 ring-black/5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-accent hover:border-foreground/30 hover:ring-foreground/15 hover:text-accent-foreground active:scale-[0.98] dark:border-border/80 dark:bg-card/40 dark:ring-white/10 dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        secondary:
          "border border-border/80 bg-secondary text-secondary-foreground ring-1 ring-black/[0.04] shadow-[0_1px_2px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:bg-secondary/80 hover:border-border hover:ring-black/10 active:scale-[0.98] dark:ring-white/[0.06]",
        ghost:
          "border border-transparent hover:border-border/60 hover:bg-accent hover:ring-1 hover:ring-black/[0.03] hover:text-accent-foreground active:scale-[0.98] dark:hover:ring-white/[0.05]",
        link: "border border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
  const Comp = asChild ? Slot.Root : "button"

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
