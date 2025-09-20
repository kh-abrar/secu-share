// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/libs/utils"

export type ButtonVariant = "default" | "outline" | "ghost" | "link" | "destructive"
export type ButtonSize = "default" | "sm" | "lg" | "icon"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const base =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"

const variantClass: Record<ButtonVariant, string> = {
  default: "bg-accent text-white hover:opacity-90",
  outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
  ghost: "bg-transparent hover:bg-neutral-100",
  link: "bg-transparent p-0 text-accent underline underline-offset-4 hover:opacity-90",
  destructive: "bg-red-600 text-white hover:bg-red-700",
}

const sizeClass: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-6",
  icon: "h-9 w-9 p-0",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = "default", size = "default", ...props }, ref) => {
    const Comp: any = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(base, variantClass[variant], sizeClass[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export default Button
