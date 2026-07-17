import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex h-9 select-none items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-[scale,background-color,border-color,color,opacity,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  { variants: {
    variant: {
      default: "bg-foreground text-background shadow-[0_0_0_1px_var(--foreground),0_1px_2px_oklch(0_0_0/.12)] hover:opacity-90",
      outline: "bg-background text-foreground shadow-[var(--surface-shadow)] hover:bg-hover hover:shadow-[var(--surface-shadow-hover)]",
      ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
      danger: "border border-[#e5484d] bg-[#e5484d] text-white hover:bg-[#d83b40]",
    },
    size: { default: "h-9", sm: "h-8 px-2.5 text-xs", icon: "h-9 w-9 px-0" },
  }, defaultVariants: { variant: "default", size: "default" } },
);

export function Button({ className, variant, size, asChild = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
