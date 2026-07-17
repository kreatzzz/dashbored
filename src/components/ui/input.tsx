import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-md border border-border bg-background px-3 text-base text-foreground caret-[var(--ds-blue-700)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-strong-border focus:border-foreground focus:ring-2 focus:ring-ring/15 sm:h-9 sm:text-sm", className)} {...props} />;
}
