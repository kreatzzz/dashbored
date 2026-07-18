"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createService, type ServiceMutationState } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddServiceDialog({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ServiceMutationState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createService(formData);
      setState(result);
      if (result.status === "success") {
        toast.success("Added to Launcher");
        setOpen(false);
        router.refresh();
      }
    });
  }
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) { setOpen(nextOpen); if (nextOpen) setState({ status: "idle" }); } }}><DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} />Add launcher</Button></DialogTrigger><DialogContent className="max-w-lg">
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Add a Launcher link</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">Use this for an app you want one-click access to without a native Dashbored integration. To discover containers, connect Portainer instead.</DialogDescription>
    <form action={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="adapterType" value="generic" />
      <Field label="Name"><Input name="name" required placeholder="Home Assistant" /></Field><Field label="Description"><Input name="description" placeholder="Home automation" /></Field>
      <Field label="Category"><select name="categoryId" required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="Icon"><select name="icon" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="server">Server</option><option value="shield">Shield</option><option value="container">Container</option><option value="activity">Activity</option><option value="film">Film</option><option value="image">Image</option><option value="download">Download</option></select></Field>
      <div className="sm:col-span-2"><Field label="Browser URL"><Input name="launchUrl" type="url" required placeholder="https://app.home.arpa" /></Field><p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Dashbored validates that this URL points to a private destination. It will open in a new tab.</p></div>
      {state.status === "error" && <p role="alert" className="rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,var(--border))] bg-[color-mix(in_srgb,var(--bad)_7%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--bad)] sm:col-span-2">{state.error}</p>}
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}Add to Launcher</Button></div>
    </form>
  </DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span>{children}</label>; }
