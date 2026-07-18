"use client";

import { Pencil } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateService, type ServiceMutationState } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isConnectionSetupPending } from "@/lib/supported-containers";

type Service = { id: string; name: string; description: string | null; categoryId: string; adapterType: string; icon: string; baseUrl: string | null; launchUrl: string; configuration: unknown };

export function EditServiceDialog({ service, categories, trigger }: { service: Service; categories: Array<{ id: string; name: string }>; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ServiceMutationState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isPortainer = service.adapterType === "portainer";
  const isLauncher = service.adapterType === "generic";
  const setupPending = isConnectionSetupPending(service.configuration);
  const endpointId = service.configuration && typeof service.configuration === "object" && !Array.isArray(service.configuration) && typeof (service.configuration as Record<string, unknown>).endpointId === "number"
    ? (service.configuration as Record<string, number>).endpointId
    : 1;
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateService(formData);
      setState(result);
      if (result.status === "success") {
        toast.success("Connection saved");
        setOpen(false);
        router.refresh();
      }
    });
  }
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) { setOpen(nextOpen); if (nextOpen) setState({ status: "idle" }); } }}><DialogTrigger asChild>{trigger ?? <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${service.name}`}><Pencil size={13} /></Button>}</DialogTrigger><DialogContent className="max-w-2xl">
    <DialogTitle className="text-xl font-semibold tracking-[-.025em]">{setupPending ? `Connect ${service.name}` : `Edit ${service.name}`}</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">{setupPending ? "Review the detected private address and save a dedicated credential. Dashbored will then activate the native dashboard." : isLauncher ? "This is a launch link. Dashbored will not invent health data for it." : "Leave credential fields blank to keep their current encrypted values."}</DialogDescription>
    {service.adapterType === "adguard" && <div className="mt-5 rounded-md border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">AdGuard uses the same administrator username and password as its web interface. The API base URL is the AdGuard web address; no <span className="mono">/control</span> suffix is needed.</div>}
    <form action={submit} className="mt-6 grid gap-4 sm:grid-cols-2"><input type="hidden" name="id" value={service.id} />
      <Field label="Name"><Input name="name" required defaultValue={service.name} /></Field><Field label="Description"><Input name="description" defaultValue={service.description ?? ""} /></Field>
      <Field label="Category"><select name="categoryId" defaultValue={service.categoryId} required className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      {isPortainer || isLauncher ? <input type="hidden" name="adapterType" value={service.adapterType} /> : <Field label="Adapter"><select name="adapterType" defaultValue={service.adapterType} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="generic">Generic launcher</option><option value="beszel">Beszel</option><option value="portainer">Portainer</option><option value="adguard">AdGuard Home</option><option value="uptime-kuma">Uptime Kuma</option><option value="jellyfin">Jellyfin</option><option value="immich">Immich</option><option value="radarr">Radarr</option><option value="sonarr">Sonarr</option><option value="prowlarr">Prowlarr</option></select></Field>}
      <Field label="Icon"><select name="icon" defaultValue={service.icon} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-ring/15"><option value="server">Server</option><option value="shield">Shield</option><option value="container">Container</option><option value="activity">Activity</option><option value="film">Film</option><option value="image">Image</option><option value="download">Download</option><option value="tv">TV</option><option value="radar">Radar</option><option value="gauge">Gauge</option><option value="boxes">Docker</option><option value="network">Network</option></select></Field>
      <Field label={isPortainer ? "Browser URL" : "Launch URL"}><Input name="launchUrl" type="url" required defaultValue={service.launchUrl} /></Field>
      {!isLauncher && <div className="sm:col-span-2"><Field label={isPortainer ? "Portainer URL" : "API base URL"}><Input name="baseUrl" type="url" required={isPortainer} defaultValue={service.baseUrl ?? ""} /></Field></div>}
      {isPortainer ? <><Field label="Environment ID"><Input name="endpointId" type="number" min="1" step="1" required defaultValue={endpointId} /></Field><Field label="New access token"><Input name="apiKey" type="password" autoComplete="off" placeholder="Leave blank to retain the saved token" /></Field></> : !isLauncher && <><Field label={service.adapterType === "adguard" ? "AdGuard username" : "New username"}><Input name="username" autoComplete="off" /></Field><Field label={service.adapterType === "adguard" ? "AdGuard password" : "New password"}><Input name="password" type="password" autoComplete="new-password" /></Field><Field label="New API key"><Input name="apiKey" type="password" autoComplete="off" /></Field><Field label="New token"><Input name="token" type="password" autoComplete="off" /></Field></>}
      {state.status === "error" && <p role="alert" className="rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,var(--border))] bg-[color-mix(in_srgb,var(--bad)_7%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--bad)] sm:col-span-2">{state.error}</p>}
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}Save changes</Button></div>
    </form>
  </DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span>{children}</label>; }
