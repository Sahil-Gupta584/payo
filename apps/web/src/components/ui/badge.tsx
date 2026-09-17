import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow,background-color,border-color] duration-[var(--duration-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_1px_2px_0_rgba(0,0,0,0.08)] [a&]:hover:bg-primary/90",
        secondary:
          "border-border/70 bg-secondary/90 text-secondary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] [a&]:hover:bg-secondary [a&]:hover:border-border",
        destructive:
          "border-destructive/30 bg-destructive text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border/80 bg-background/50 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_1px_0_rgba(0,0,0,0.03)] backdrop-blur-xs [a&]:hover:bg-accent [a&]:hover:border-foreground/20 [a&]:hover:text-accent-foreground",
        ghost:
          "border-transparent [a&]:hover:border-border/50 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",
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
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
