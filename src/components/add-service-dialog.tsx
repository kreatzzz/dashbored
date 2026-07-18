"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { createService } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddServiceDialog({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} />Add launcher</Button></DialogTrigger><DialogContent className="max-w-lg">
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Add a Launcher link</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">Use this for an app you want one-click access to without a native Dashbored integration. To discover containers, connect Portainer instead.</DialogDescription>
    <form action={async (formData) => { await createService(formData); setOpen(false); }} className="mt-6 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="adapterType" value="generic" />
      <Field label="Name"><Input name="name" required placeholder="Home Assistant" /></Field><Field label="Description"><Input name="description" placeholder="Home automation" /></Field>
      <Field label="Category"><select name="categoryId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="Icon"><select name="icon" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="server">Server</option><option value="shield">Shield</option><option value="container">Container</option><option value="activity">Activity</option><option value="film">Film</option><option value="image">Image</option><option value="download">Download</option></select></Field>
      <div className="sm:col-span-2"><Field label="Browser URL"><Input name="launchUrl" type="url" required placeholder="https://app.home.arpa" /></Field><p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Dashbored validates that this URL points to a private destination. It will open in a new tab.</p></div>
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Add to Launcher</Button></div>
    </form>
  </DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span>{children}</label>; }
