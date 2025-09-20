// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "link";
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const base =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring transition";
const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-black text-white hover:opacity-90",
  outline: "border border-gray-300 hover:bg-gray-50",
  link: "bg-transparent p-0 underline underline-offset-4",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = "default", ...props }, ref) => {
    const Comp: any = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;
