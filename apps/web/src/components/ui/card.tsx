import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"

const cardVariants = cva(
  "flex flex-col gap-6 rounded-xl border py-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-black/[0.03] transition-[border-color,box-shadow]",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-card text-card-foreground",
        muted: "border-border/60 bg-muted/40 text-card-foreground",
        secondary: "border-border/60 bg-secondary/50 text-secondary-foreground",
        outline: "border-border/80 bg-transparent text-card-foreground shadow-none ring-0",
        warning: "border-amber-200 bg-amber-50/70 text-amber-950 ring-amber-500/10",
        success: "border-emerald-200 bg-emerald-50/70 text-emerald-950 ring-emerald-500/10",
        destructive: "border-destructive/20 bg-destructive/5 text-destructive ring-destructive/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-border/60 [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:border-border/60 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
