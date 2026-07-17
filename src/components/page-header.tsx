import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="flex min-h-24 flex-col justify-end gap-4 border-b border-border bg-background px-5 pb-6 pt-6 md:flex-row md:items-end md:justify-between md:px-8">
    <div className="min-w-0"><h1 className="text-balance text-2xl font-semibold leading-[1.1] tracking-[-.03em]">{title}</h1>{description && <p className="mt-1.5 max-w-[65ch] text-pretty text-sm leading-5 text-muted-foreground">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}
  </header>;
}
