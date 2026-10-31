import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/libs/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-white",
        secondary: "border-transparent bg-neutral-100 text-neutral-700",
        destructive: "border-transparent bg-red-100 text-red-700",
        outline: "border-neutral-300 text-neutral-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
