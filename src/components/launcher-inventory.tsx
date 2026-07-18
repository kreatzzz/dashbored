"use client";

import { useMemo, useState } from "react";
import { ExternalLink, EyeOff, LoaderCircle, Pencil, RefreshCw, Search, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppIcon } from "@/components/app-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-dot";

export type InventoryEntry = {
  id: string;
  name: string;
  inferredName: string;
  image: string | null;
  launchUrl: string | null;
  inferredLaunchUrl: string | null;
  hidden: boolean;
  state: string;
  status: string | null;
  health: string;
  provider: string;
};

type Provider = { id: string; name: string };

export function LauncherInventory({ entries, providers }: { entries: InventoryEntry[]; providers: Provider[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? entries.filter((entry) => `${entry.name} ${entry.image ?? ""} ${entry.provider} ${entry.state}`.toLowerCase().includes(term)) : entries;
  }, [entries, query]);

  return <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--surface-shadow)]">
    <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground"><Settings2 size={14} /></div><div><h2 className="text-sm font-medium">Container inventory</h2><p className="mt-0.5 text-xs text-muted-foreground">Choose which Portainer containers belong in your Launcher.</p></div></div>
      {providers.length > 0 && <RefreshInventoryButton providers={providers} />}
    </div>
    {entries.length > 0 && <div className="border-b border-border px-5 py-3"><label className="relative block max-w-sm"><Search aria-hidden="true" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Filter container inventory</span><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 pl-9 text-xs" placeholder="Filter containers, images, or provider" /></label></div>}
    {visible.length ? <div className="max-h-[480px] overflow-y-auto divide-y divide-border">{visible.map((entry) => <InventoryRow key={entry.id} entry={entry} />)}</div> : <div className="grid min-h-44 place-items-center p-6 text-center"><div><p className="text-sm font-medium">{entries.length ? "No matching containers" : "No inventory yet"}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{entries.length ? "Try a container name, image, provider, or state." : "Connect Portainer, then refresh inventory or wait for the next worker sweep."}</p></div></div>}
  </section>;
}

function InventoryRow({ entry }: { entry: InventoryEntry }) {
  const launchState = entry.launchUrl ? "Launch ready" : "Needs URL";
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[minmax(180px,1fr)_minmax(160px,.9fr)_auto]">
    <div className="flex min-w-0 items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background"><AppIcon name="container" size={14} /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-medium">{entry.name}</p>{entry.hidden && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"><EyeOff size={10} />Hidden</span>}</div><p className="mono mt-0.5 truncate text-[10px] text-muted-foreground" title={entry.image ?? ""}>{entry.image ?? entry.inferredName}</p></div></div>
    <div className="hidden min-w-0 sm:block"><div className="flex items-center gap-2 text-xs text-muted-foreground"><StatusDot status={entry.health} /><span className="capitalize">{entry.state || "unknown"}</span><span className="text-border">·</span><span className={entry.launchUrl ? "text-[var(--good)]" : "text-[var(--warn)]"}>{launchState}</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground" title={entry.launchUrl ?? entry.status ?? ""}>{entry.launchUrl ?? entry.status ?? "Add a browser-facing URL"}</p></div>
    <div className="flex items-center gap-1.5"><a href={entry.launchUrl ?? undefined} target="_blank" rel="noreferrer" aria-label={`Open ${entry.name}`} className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${entry.launchUrl ? "border-border text-muted-foreground hover:bg-hover hover:text-foreground" : "pointer-events-none border-transparent text-muted-foreground/35"}`}><ExternalLink size={13} /></a><EditLauncherEntry entry={entry} /></div>
  </div>;
}

function RefreshInventoryButton({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      const results = await Promise.all(providers.map(async (provider) => {
        const response = await fetch("/api/launchers/discover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerId: provider.id }) });
        const result = await response.json() as { discovered?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? `Could not refresh ${provider.name}`);
        return result.discovered ?? 0;
      }));
      toast.success(`Refreshed ${results.reduce((total, value) => total + value, 0)} containers`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inventory refresh failed");
    } finally {
      setLoading(false);
    }
  }
  return <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>{loading ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}Refresh inventory</Button>;
}

function EditLauncherEntry({ entry }: { entry: InventoryEntry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(entry.name === entry.inferredName ? "" : entry.name);
  const [launchUrl, setLaunchUrl] = useState(entry.launchUrl === entry.inferredLaunchUrl ? "" : entry.launchUrl ?? "");
  const [hidden, setHidden] = useState(entry.hidden);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/launchers/${entry.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim() || null, launchUrl: launchUrl.trim() || null, hidden }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update this entry");
      toast.success(hidden ? "Entry hidden from Launcher" : "Launcher entry saved");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this entry");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${entry.name}`}><Pencil size={13} /></Button></DialogTrigger><DialogContent className="max-w-md">
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Edit Launcher entry</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">Overrides survive future Portainer inventory syncs. Leave a field blank to return to the discovered value.</DialogDescription>
    <div className="mt-6 space-y-4"><Field label="Display name" hint={`Discovered as ${entry.inferredName}`}><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={entry.inferredName} /></Field><Field label="Browser URL" hint={entry.inferredLaunchUrl ? `Discovered as ${entry.inferredLaunchUrl}` : "No safe URL could be inferred from this container."}><Input value={launchUrl} onChange={(event) => setLaunchUrl(event.target.value)} type="url" placeholder={entry.inferredLaunchUrl ?? "https://app.home.arpa"} /></Field><label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/20 p-3"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[var(--foreground)]" /><span><span className="block text-xs font-medium">Hide from Launcher</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">The container remains in this inventory and can be restored later.</span></span></label></div>
    <div className="mt-6 flex justify-end gap-2"><DialogClose asChild><Button variant="ghost" disabled={saving}>Cancel</Button></DialogClose><Button onClick={save} disabled={saving}>{saving && <LoaderCircle size={14} className="animate-spin" />}Save changes</Button></div>
  </DialogContent></Dialog>;
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium">{label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span><div className="mt-2">{children}</div></label>;
}
