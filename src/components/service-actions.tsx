"use client";

import { useState } from "react";
import { LoaderCircle, Play, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SafeAction } from "@/lib/adapters";

const icons = { start: Play, stop: Square, restart: RotateCw } as const;

export function ServiceActions({ serviceId, actions, target }: { serviceId: string; actions: SafeAction[]; target?: string }) {
  return <div className="flex flex-wrap gap-2">{actions.map((action) => <ActionButton key={action.id} serviceId={serviceId} action={action} target={target} />)}</div>;
}

function ActionButton({ serviceId, action, target }: { serviceId: string; action: SafeAction; target?: string }) {
  const [confirmation, setConfirmation] = useState(""); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false);
  const Icon = icons[action.id as keyof typeof icons];
  async function run() {
    setLoading(true);
    const response = await fetch(`/api/services/${serviceId}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: action.id, target, confirmation }) });
    const result = await response.json() as { message?: string; error?: string };
    setLoading(false);
    if (!response.ok) return toast.error(result.error ?? "Action failed");
    toast.success(result.message ?? "Action completed"); setOpen(false); setConfirmation(""); window.location.reload();
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant={action.tone === "danger" ? "danger" : "outline"} size="sm">{Icon && <Icon size={13} />}{action.label}</Button></DialogTrigger><DialogContent>
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">{action.label}</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">{action.description} This operation will be written to the audit log.</DialogDescription>
    <label className="mt-6 block"><span className="mb-2 block text-xs">Type <strong className="mono">{action.confirmation}</strong> to confirm.</span><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus /></label>
    <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant={action.tone === "danger" ? "danger" : "default"} disabled={confirmation !== action.confirmation || loading} onClick={run}>{loading && <LoaderCircle size={14} className="animate-spin" />}Confirm action</Button></div>
  </DialogContent></Dialog>;
}
