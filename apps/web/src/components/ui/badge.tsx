import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary text-primary-foreground ring-1 ring-primary/30 shadow-2xs [a]:hover:bg-primary/90 [a]:hover:ring-primary/50",
        secondary:
          "border-border/80 bg-secondary text-secondary-foreground ring-1 ring-foreground/[0.04] [a]:hover:bg-secondary/90 [a]:hover:border-border [a]:hover:ring-foreground/10",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive ring-1 ring-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20 [a]:hover:border-destructive/60",
        outline:
          "border-border bg-card text-foreground ring-1 ring-foreground/5 [a]:hover:bg-muted [a]:hover:border-foreground/30",
        ghost:
          "border-transparent hover:border-border/60 hover:bg-muted/60 hover:ring-1 hover:ring-foreground/[0.04] hover:text-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
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
