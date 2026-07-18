"use client";

import { Trash2 } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteService, type ServiceMutationState } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ServiceMutationState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await deleteService(formData);
      setState(result);
      if (result.status === "success") {
        toast.success("Connection removed");
        setOpen(false);
        router.refresh();
      }
    });
  }
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) { setOpen(nextOpen); if (nextOpen) setState({ status: "idle" }); } }}><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-[#a53127]" aria-label={`Delete ${name}`}><Trash2 size={14} /></Button></DialogTrigger><DialogContent>
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Remove {name}?</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">This removes the dashboard connection, encrypted credential, and retained health snapshots. It does not change the upstream service.</DialogDescription>
    <form action={submit} className="mt-6"><input type="hidden" name="id" value={id} />{state.status === "error" && <p role="alert" className="mb-4 rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,var(--border))] bg-[color-mix(in_srgb,var(--bad)_7%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--bad)]">{state.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" variant="danger" disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}Remove service</Button></div></form>
  </DialogContent></Dialog>;
}
