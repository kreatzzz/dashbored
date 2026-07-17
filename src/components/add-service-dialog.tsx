"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { createService } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddServiceDialog({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm"><Plus size={14} />Add service</Button></DialogTrigger><DialogContent className="max-w-2xl">
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Connect a service</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Credentials are encrypted before they reach PostgreSQL.</DialogDescription>
    <form action={async (formData) => { await createService(formData); setOpen(false); }} className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="Name"><Input name="name" required placeholder="Home Assistant" /></Field><Field label="Description"><Input name="description" placeholder="Home automation" /></Field>
      <Field label="Category"><select name="categoryId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="Adapter"><select name="adapterType" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="generic">Generic launcher</option><option value="beszel">Beszel</option><option value="portainer">Portainer</option><option value="adguard">AdGuard Home</option><option value="uptime-kuma">Uptime Kuma</option><option value="radarr">Radarr</option><option value="sonarr">Sonarr</option><option value="prowlarr">Prowlarr</option></select></Field>
      <Field label="Icon"><select name="icon" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="server">Server</option><option value="shield">Shield</option><option value="container">Container</option><option value="activity">Activity</option><option value="film">Film</option><option value="image">Image</option><option value="download">Download</option></select></Field>
      <Field label="Launch URL"><Input name="launchUrl" type="url" required placeholder="http://server.home.arpa:8080" /></Field>
      <div className="sm:col-span-2"><Field label="API base URL (optional)"><Input name="baseUrl" type="url" placeholder="http://server.home.arpa:8080" /></Field></div>
      <Field label="Username"><Input name="username" autoComplete="off" /></Field><Field label="Password"><Input name="password" type="password" autoComplete="new-password" /></Field>
      <Field label="API key"><Input name="apiKey" type="password" autoComplete="off" /></Field><Field label="Token"><Input name="token" type="password" autoComplete="off" /></Field>
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save service</Button></div>
    </form>
  </DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span>{children}</label>; }
