"use client";

import { ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icons";
import { StatusDot } from "@/components/ui/status-dot";

export type LauncherEntry = { id: string; name: string; slug: string; description: string | null; icon: string; launchUrl: string; category: string; status: string };

export function LauncherGrid({ entries }: { entries: LauncherEntry[] }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return term ? entries.filter((entry) => `${entry.name} ${entry.category} ${entry.description ?? ""} ${entry.launchUrl}`.toLowerCase().includes(term)) : entries; }, [entries, query]);
  const groups = filtered.reduce<Record<string, LauncherEntry[]>>((result, entry) => { (result[entry.category] ??= []).push(entry); return result; }, {});
  return <section><label className="launcher-search"><Search size={15} /><span className="sr-only">Filter launcher entries</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter services" /><kbd>/</kbd></label>{Object.keys(groups).length ? <div className="mt-7 space-y-8">{Object.entries(groups).map(([category, items]) => {
    const remainingColumns = (3 - (items.length % 3)) % 3;
    return <section key={category}><div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-medium">{category}</h2><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="grid gap-px overflow-hidden rounded-md border border-border bg-background sm:grid-cols-2 xl:grid-cols-3">{items.map((entry) => <a href={entry.launchUrl} target="_blank" rel="noreferrer" className="launcher-entry" key={entry.id}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background"><AppIcon name={entry.icon} size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-medium">{entry.name}</p><StatusDot status={entry.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{entry.description ?? entry.launchUrl}</p></div><ExternalLink size={14} className="shrink-0 text-muted-foreground" /></a>)}{remainingColumns > 0 && <LauncherGridTerminus span={remainingColumns} />}</div></section>;
  })}</div> : <div className="launcher-empty"><p className="text-sm font-medium">No matching services</p><p className="mt-1 text-xs text-muted-foreground">Try a different name, category, or address.</p></div>}</section>;
}

function LauncherGridTerminus({ span }: { span: number }) {
  return <div aria-hidden="true" className={`relative hidden min-h-[142px] overflow-hidden bg-black xl:block ${span === 2 ? "xl:col-start-3" : ""}`}>
    <span className="absolute left-[7%] top-1/2 h-px w-[72%] -translate-y-3 rotate-[-42deg] bg-white/25" />
    <span className="absolute left-[25%] top-1/2 h-px w-[72%] translate-y-3 rotate-[-42deg] bg-white/25" />
  </div>;
}
