"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdGuardQueryRecord } from "@/lib/adapters/adguard";

export function AdGuardQueryLog({ records, error }: { records: AdGuardQueryRecord[]; error?: string }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => (result === "all" || classify(record.result) === result) && (!needle || `${record.domain} ${record.client} ${record.result}`.toLowerCase().includes(needle)));
  }, [query, records, result]);
  const blocked = records.filter((record) => classify(record.result) === "blocked").length;

  return <div className="space-y-5">
    {error ? <section className="flex items-center justify-between gap-5 rounded-lg bg-card px-5 py-4 shadow-[var(--surface-shadow)]"><div><p className="text-[13px] font-medium">Live query data is temporarily unavailable</p><p className="mt-1 max-w-[65ch] text-pretty text-xs leading-5 text-muted-foreground">{error}</p></div><span className="h-2 w-2 shrink-0 rounded-full bg-[var(--bad)]" /></section> : null}
    <section className="grid overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)] sm:grid-cols-3 sm:divide-x sm:divide-border">
      <LogFact label="Loaded" value={records.length.toLocaleString()} detail="Most recent DNS requests" />
      <LogFact label="Blocked" value={blocked.toLocaleString()} detail={`${records.length ? (blocked / records.length * 100).toFixed(1) : "0.0"}% of loaded requests`} />
      <LogFact label="Clients" value={new Set(records.map((record) => record.client)).size.toLocaleString()} detail="Unique sources in this window" />
    </section>
    <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm"><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search domains or clients" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-base outline-none transition-[border-color,box-shadow] duration-150 hover:border-strong-border focus:border-foreground focus:ring-2 focus:ring-ring/15 sm:h-9 sm:text-[13px]" /></div>
        <div className="flex items-center gap-3"><select aria-label="Filter query results" value={result} onChange={(event) => setResult(event.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-base outline-none transition-[border-color,box-shadow] duration-150 hover:border-strong-border focus:border-foreground focus:ring-2 focus:ring-ring/15 sm:h-9 sm:text-[13px]"><option value="all">All results</option><option value="blocked">Blocked</option><option value="allowed">Allowed</option></select><span className="mono whitespace-nowrap text-xs text-muted-foreground">{results.length} shown</span></div>
      </div>
      <div className="max-h-[calc(100vh-330px)] min-h-[420px] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-[13px]"><thead className="sticky top-0 z-10 bg-muted"><tr className="text-left text-xs text-muted-foreground"><th className="px-5 py-2.5 font-medium">Domain</th><th className="px-5 py-2.5 font-medium">Client</th><th className="px-5 py-2.5 font-medium">Type</th><th className="px-5 py-2.5 font-medium">Result</th><th className="px-5 py-2.5 text-right font-medium">Time</th></tr></thead><tbody className="divide-y divide-border">{results.map((record, index) => <tr key={`${record.time}-${record.domain}-${index}`} className="hover:bg-muted/35"><td className="max-w-[380px] truncate px-5 py-3 font-medium" title={record.domain}>{record.domain}</td><td className="mono px-5 py-3 text-xs text-muted-foreground">{record.client}</td><td className="mono px-5 py-3 text-xs text-muted-foreground">{record.type}</td><td className="px-5 py-3"><span className={`inline-flex items-center gap-2 ${classify(record.result) === "blocked" ? "text-[var(--bad)]" : "text-muted-foreground"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{friendlyResult(record.result)}</span></td><td className="mono px-5 py-3 text-right text-xs text-muted-foreground">{record.time}</td></tr>)}</tbody></table>
        {!results.length && <div className="grid h-56 place-items-center text-center"><div><p className="text-sm font-medium">No matching queries</p><p className="mt-1 text-xs text-muted-foreground">Change the search or result filter.</p></div></div>}
      </div>
    </section>
  </div>;
}

function LogFact({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="p-4 md:px-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tracking-[-.03em] tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>; }
function classify(value: string) { return /filter|block|safe.?search/i.test(value) && !/notfiltered/i.test(value) ? "blocked" : "allowed"; }
function friendlyResult(value: string) { if (/notfilterednotfound/i.test(value)) return "Allowed"; if (/filtered/i.test(value)) return "Blocked"; return value.replace(/([a-z])([A-Z])/g, "$1 $2"); }
