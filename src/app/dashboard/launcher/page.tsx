import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLauncherEntry } from "@/lib/launchers";
import { LauncherGrid, type LauncherEntry } from "@/components/launcher-grid";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function LauncherPage() {
  const [services, discovered] = await Promise.all([
    prisma.serviceInstance.findMany({ where: { enabled: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { category: { select: { name: true } } } }),
    prisma.launcherEntry.findMany({ where: { hidden: false }, orderBy: { discoveredName: "asc" }, include: { providerService: { select: { name: true } } } }),
  ]);
  const entries: LauncherEntry[] = [
    ...services.filter((service) => Boolean(service.launchUrl)).map((service) => ({ id: `service-${service.id}`, name: service.name, slug: service.slug, description: service.description, icon: service.icon, launchUrl: service.launchUrl, category: service.category.name, status: service.lastStatus })),
    ...discovered.map((entry) => ({ ...resolveLauncherEntry(entry), id: `container-${entry.id}`, slug: entry.containerId, description: entry.image ?? entry.containerStatus, icon: "container", launchUrl: resolveLauncherEntry(entry).launchUrl ?? "", category: `${entry.providerService.name} containers`, status: entry.lastStatus })).filter((entry) => Boolean(entry.launchUrl)),
  ];
  return <main><PageHeader eyebrow="Home / Launcher" title="Launcher" description="Open the services connected to your private stack." actions={<Button asChild size="sm"><Link href="/dashboard/settings"><Plus size={14} />Add service</Link></Button>} /><div className="mx-auto max-w-[1400px] p-5 md:p-8">{entries.length ? <LauncherGrid entries={entries} /> : <section className="launcher-empty"><p className="text-sm font-medium">Your Launcher is ready</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Add a service with a launch URL and it will appear here automatically.</p><Button asChild variant="outline" size="sm" className="mt-5"><Link href="/dashboard/settings">Configure services <ExternalLink size={13} /></Link></Button></section>}</div></main>;
}
