import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLauncherEntry } from "@/lib/launchers";
import { uniqueLauncherUrls } from "@/lib/launcher-urls";
import { LauncherGrid, type LauncherEntry } from "@/components/launcher-grid";
import { LauncherInventory, type InventoryEntry } from "@/components/launcher-inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function LauncherPage() {
  const [services, discovered] = await Promise.all([
    prisma.serviceInstance.findMany({ where: { enabled: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { category: { select: { name: true } } } }),
    prisma.launcherEntry.findMany({ orderBy: { discoveredName: "asc" }, include: { providerService: { select: { id: true, name: true } } } }),
  ]);
  const entries: LauncherEntry[] = uniqueLauncherUrls([
    ...services.filter((service) => Boolean(service.launchUrl)).map((service) => ({ id: `service-${service.id}`, name: service.name, slug: service.slug, description: service.description, icon: service.icon, launchUrl: service.launchUrl, category: service.category.name, status: service.lastStatus })),
    ...discovered.filter((entry) => !entry.hidden).map((entry) => ({ ...resolveLauncherEntry(entry), id: `container-${entry.id}`, slug: entry.containerId, description: entry.image ?? entry.containerStatus, icon: "container", launchUrl: resolveLauncherEntry(entry).launchUrl ?? "", category: `${entry.providerService.name} containers`, status: entry.lastStatus })).filter((entry) => Boolean(entry.launchUrl)),
  ]);
  const inventory: InventoryEntry[] = discovered.map((entry) => {
    const resolved = resolveLauncherEntry(entry);
    return { id: entry.id, name: resolved.name, inferredName: entry.discoveredName, image: entry.image, launchUrl: resolved.launchUrl, inferredLaunchUrl: entry.inferredLaunchUrl, hidden: entry.hidden, state: entry.containerState, status: entry.containerStatus, health: entry.lastStatus, provider: entry.providerService.name };
  });
  const providers = services.filter((service) => service.adapterType === "portainer" && service.credentialId && service.baseUrl).map((service) => ({ id: service.id, name: service.name }));
  return <main><PageHeader eyebrow="Home / Launcher" title="Launcher" description="Open the applications in your private stack, then shape the discovered inventory around what you actually use." actions={<Button asChild size="sm"><Link href="/dashboard/settings"><Plus size={14} />Add service</Link></Button>} /><div className="mx-auto max-w-[1400px] space-y-8 p-5 md:p-8">{entries.length ? <LauncherGrid entries={entries} /> : <section className="launcher-empty"><p className="text-sm font-medium">Your Launcher is ready</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Connect Portainer or add a service with a launch URL to start building your catalog.</p><Button asChild variant="outline" size="sm" className="mt-5"><Link href="/dashboard/settings">Configure services <ExternalLink size={13} /></Link></Button></section>}<LauncherInventory entries={inventory} providers={providers} /></div></main>;
}
