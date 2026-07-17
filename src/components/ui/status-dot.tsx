import { cn } from "@/lib/utils";

export function StatusDot({ status, pulse = false }: { status: string; pulse?: boolean }) {
  const color = status === "healthy" ? "bg-[var(--good)]" : status === "degraded" ? "bg-[var(--warn)]" : status === "offline" ? "bg-[var(--bad)]" : "bg-muted-foreground";
  return <span className="relative flex h-2 w-2 shrink-0" aria-label={status}><span className={cn("absolute inline-flex h-full w-full rounded-full opacity-25", pulse && "animate-ping", color)} /><span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} /></span>;
}
