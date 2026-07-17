"use client";

import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppIcon } from "@/components/app-icons";
import { StatusDot } from "@/components/ui/status-dot";

export type LauncherEntry = { id: string; name: string; slug: string; description: string | null; icon: string; launchUrl: string; category: string; status: string };

export function LauncherGrid({ entries }: { entries: LauncherEntry[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return term ? entries.filter((entry) => `${entry.name} ${entry.category} ${entry.description ?? ""} ${entry.launchUrl}`.toLowerCase().includes(term)) : entries; }, [entries, query]);
  const groups = filtered.reduce<Record<string, LauncherEntry[]>>((result, entry) => { (result[entry.category] ??= []).push(entry); return result; }, {});
  return <section><label className="launcher-search"><Search size={15} /><span className="sr-only">Filter launcher entries</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter services" /><kbd>⌘K</kbd></label>{Object.keys(groups).length ? <div className="mt-7 space-y-8">{Object.entries(groups).map(([category, items]) => <section key={category}><div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-medium">{category}</h2><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">{items.map((entry) => <a href={entry.launchUrl} target="_blank" rel="noreferrer" className="launcher-entry" key={entry.id}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background"><AppIcon name={entry.icon} size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-medium">{entry.name}</p><StatusDot status={entry.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{entry.description ?? entry.launchUrl}</p></div><ExternalLink size={14} className="shrink-0 text-muted-foreground" /></a>)}</div></section>)}</div> : <div className="launcher-empty"><p className="text-sm font-medium">No matching services</p><p className="mt-1 text-xs text-muted-foreground">Try a different name, category, or address.</p></div>}</section>;
}
