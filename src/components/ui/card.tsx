import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg bg-card text-card-foreground shadow-[var(--surface-shadow)]", className)} {...props} />;
}
