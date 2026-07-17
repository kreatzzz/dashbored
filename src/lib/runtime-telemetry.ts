import { listBeszelContainers, listBeszelSystems, type BeszelContainer } from "@/lib/beszel-client";
import { prisma } from "@/lib/prisma";
import { getServiceContext } from "@/lib/services";

export type RuntimeTelemetry = {
  name: string;
  status: string;
  image: string;
  cpu: number;
  memoryMb: number;
  networkMb: number;
  health: number;
};

export async function getRuntimeTelemetry(slug: string): Promise<RuntimeTelemetry | null> {
  try {
    const beszel = await prisma.serviceInstance.findUnique({ where: { slug: "beszel" } });
    if (!beszel?.credentialId || !beszel.baseUrl) return null;
    const context = await getServiceContext(beszel);
    const systems = await listBeszelSystems(context);
    const system = systems.find((item) => item.status === "up") ?? systems[0];
    if (!system) return null;
    const containers = await listBeszelContainers(context, system.id);
    const match = findContainer(containers, slug);
    return match ? {
      name: match.name,
      status: match.status ?? "Unknown",
      image: match.image ?? "Unknown image",
      cpu: match.cpu ?? 0,
      memoryMb: match.memory ?? 0,
      networkMb: match.net ?? 0,
      health: match.health ?? 0,
    } : null;
  } catch {
    return null;
  }
}

function findContainer(containers: BeszelContainer[], slug: string) {
  const aliases: Record<string, string[]> = {
    "adguard-home": ["adguard-home", "adguardhome"],
    "uptime-kuma": ["uptime-kuma", "uptimekuma"],
    "immich": ["immich-server", "immich_server"],
    "docker": ["portainer"],
  };
  const candidates = aliases[slug] ?? [slug];
  return containers.find((container) => candidates.some((candidate) => normalize(container.name) === normalize(candidate)))
    ?? containers.find((container) => candidates.some((candidate) => normalize(container.name).includes(normalize(candidate))));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
