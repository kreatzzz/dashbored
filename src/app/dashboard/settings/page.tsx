import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AddServiceDialog } from "@/components/add-service-dialog";
import { AppIcon } from "@/components/app-icons";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { EditServiceDialog } from "@/components/edit-service-dialog";
import { DeleteServiceButton } from "@/components/delete-service-button";
import { SecuritySettings } from "@/components/security-settings";
import { PortainerConnectionDialog } from "@/components/portainer-onboarding";
import { isConnectionSetupPending } from "@/lib/supported-containers";

export default async function SettingsPage() {
  const categories = await prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { services: { orderBy: { sortOrder: "asc" } } } });
  const populatedCategories = categories.filter((category) => category.services.length > 0);
  return <main><PageHeader eyebrow="Dashbored / Configuration" title="Settings" description="Connections, security, and your private application catalog." actions={<div className="flex gap-2"><PortainerConnectionDialog /><AddServiceDialog categories={categories} /></div>} />
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8"><Card className="overflow-hidden"><SecuritySettings /></Card><Card className="overflow-hidden"><div className="flex items-center gap-3 border-b border-border p-5"><div className="grid h-9 w-9 place-items-center rounded-md bg-muted"><LockKeyhole size={16} /></div><div><h2 className="text-sm font-medium">Service connections</h2><p className="mt-0.5 text-[13px] text-muted-foreground">Credentials use AES-256-GCM encryption and are never returned to the browser.</p></div></div>
      {populatedCategories.length ? populatedCategories.map((category) => <section key={category.id}><div className="border-b border-border bg-muted px-5 py-2.5"><p className="text-xs font-medium text-muted-foreground">{category.name}</p></div>{category.services.map((service) => {
        const setupPending = isConnectionSetupPending(service.configuration);
        return <div key={service.id} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0"><div className="grid h-8 w-8 place-items-center rounded-md border border-border"><AppIcon name={service.icon} size={14} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-medium">{service.name}</p>{setupPending ? <span className="mono rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[.08em] text-muted-foreground">Setup</span> : <StatusDot status={service.lastStatus} />}</div><p className={`mt-1 truncate text-[11px] text-muted-foreground ${setupPending ? "" : "mono"}`}>{setupPending ? "Detected by Portainer · finish native connection" : service.baseUrl ?? service.launchUrl}</p></div><Button asChild variant="ghost" size="icon" className="h-8 w-8"><Link href={`/dashboard/services/${service.slug}`} aria-label={setupPending ? `Finish setup for ${service.name}` : `Open ${service.name}`}><ArrowUpRight size={14} /></Link></Button><EditServiceDialog service={service} categories={categories} /><DeleteServiceButton id={service.id} name={service.name} /></div>;
      })}</section>) : <div className="grid min-h-44 place-items-center px-6 py-8 text-center"><div><p className="text-sm font-medium">No connections yet</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Connect Portainer to discover your containers, or add a simple Launcher link for an application you use directly.</p></div></div>}</Card></div>
  </main>;
}
