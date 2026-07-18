"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Container, KeyRound, LoaderCircle, ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPortainerConnection, type PortainerConnectionState } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialState: PortainerConnectionState = { status: "idle" };

export function PortainerOnboarding() {
  return <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--surface-shadow)]">
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
      <div className="relative overflow-hidden p-6 md:p-8 lg:border-r lg:border-border">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ds-blue-700)]" />FIRST CONNECTION</div>
          <div className="mt-7 grid h-11 w-11 place-items-center rounded-lg border border-border bg-background shadow-[var(--surface-shadow)]"><Container size={19} /></div>
          <h2 className="mt-5 max-w-lg text-balance text-2xl font-semibold leading-tight tracking-[-.035em]">Start with your container inventory.</h2>
          <p className="mt-3 max-w-[54ch] text-pretty text-[13px] leading-6 text-muted-foreground">Connect one scoped Portainer token. Dashbored will discover containers on a quiet schedule, surface their state, and build your private Launcher without touching the Docker socket.</p>
          <div className="mt-6"><PortainerConnectionDialog /></div>
          <p className="mt-3 text-[11px] text-muted-foreground">Private URLs only · Token encrypted at rest · Actions always require confirmation</p>
        </div>
      </div>
      <div className="divide-y divide-border bg-muted/20">
        <OnboardingStep icon={KeyRound} number="01" title="Connect Portainer" description="Use a private URL, scoped access token, and the Docker environment ID you want to manage." active />
        <OnboardingStep icon={ScanSearch} number="02" title="Review inventory" description="The worker reads container metadata once per interval. It does not probe every container endpoint." />
        <OnboardingStep icon={Check} number="03" title="Use the Launcher" description="Running containers with safe published ports appear as compact launch cards, ready to open." />
      </div>
    </div>
  </section>;
}

function OnboardingStep({ icon: Icon, number, title, description, active = false }: { icon: typeof KeyRound; number: string; title: string; description: string; active?: boolean }) {
  return <div className="flex gap-4 px-6 py-5"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${active ? "border-[color-mix(in_srgb,var(--ds-blue-700)_28%,var(--border))] bg-[color-mix(in_srgb,var(--ds-blue-700)_8%,transparent)] text-[var(--ds-blue-700)]" : "border-border bg-background text-muted-foreground"}`}><Icon size={14} /></div><div className="min-w-0"><p className="mono text-[10px] text-muted-foreground">{number}</p><p className="mt-1 text-[13px] font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>;
}

export function PortainerConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PortainerConnectionState>(initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    startTransition(async () => {
      const nextState = await createPortainerConnection(state, formData);
      setState(nextState);
      if (nextState.status === "success") {
        toast.success(nextState.message ?? "Portainer connected");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm">Connect Portainer <ArrowRight size={13} /></Button></DialogTrigger><DialogContent className="max-w-md">
      <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted"><Container size={16} /></div>
      <DialogTitle className="mt-4 text-xl font-semibold tracking-[-.025em]">Connect Portainer</DialogTitle>
      <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">This token is encrypted before it is stored. Dashbored uses it only from the server to read inventory and run confirmed actions.</DialogDescription>
      <form action={submit} className="mt-6 space-y-4">
        <Field label="Portainer URL" hint="Must be private and reachable from the Dashbored container."><Input name="baseUrl" type="url" required autoComplete="url" placeholder="https://portainer.home.arpa" /></Field>
        <Field label="Access token" hint="Create this under Portainer → My account → Access tokens."><Input name="apiKey" type="password" required autoComplete="off" placeholder="Paste a scoped token" /></Field>
        <details className="group rounded-md border border-border bg-muted/20"><summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted-foreground marker:hidden">Advanced connection settings</summary><div className="grid gap-4 border-t border-border px-3 py-4"><Field label="Environment ID" hint="Usually 1. Choose the Portainer environment to manage."><Input name="endpointId" type="number" min="1" step="1" defaultValue="1" required /></Field><Field label="Browser URL (optional)" hint="Leave blank to use the Portainer URL above."><Input name="launchUrl" type="url" autoComplete="url" placeholder="https://portainer.home.arpa" /></Field></div></details>
        {state.status === "error" && <p role="alert" className="rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,var(--border))] bg-[color-mix(in_srgb,var(--bad)_7%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--bad)]">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2"><DialogClose asChild><Button type="button" variant="ghost" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}Save connection</Button></div>
      </form>
    </DialogContent></Dialog>;
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium">{label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span><div className="mt-2">{children}</div></label>;
}
