"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteService } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-[#a53127]" aria-label={`Delete ${name}`}><Trash2 size={14} /></Button></DialogTrigger><DialogContent>
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Remove {name}?</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">This removes the dashboard connection, encrypted credential, and retained health snapshots. It does not change the upstream service.</DialogDescription>
    <form action={deleteService} className="mt-6 flex justify-end gap-2"><input type="hidden" name="id" value={id} /><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="danger">Remove service</Button></form>
  </DialogContent></Dialog>;
}
