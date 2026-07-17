import type { LauncherEntry, ServiceInstance } from "@/generated/prisma/client";
import { getAdapter, type LauncherCandidate } from "@/lib/adapters";
import { assertPrivateServiceUrl } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { getServiceContext } from "@/lib/services";

export type ResolvedLauncher = Pick<LauncherEntry, "id" | "providerServiceId" | "containerId" | "image" | "containerState" | "containerStatus" | "lastStatus" | "hidden" | "lastSeenAt"> & {
  name: string;
  launchUrl: string | null;
};

export function resolveLauncherEntry(entry: LauncherEntry): ResolvedLauncher {
  return {
    id: entry.id,
    providerServiceId: entry.providerServiceId,
    containerId: entry.containerId,
    image: entry.image,
    containerState: entry.containerState,
    containerStatus: entry.containerStatus,
    lastStatus: entry.lastStatus,
    hidden: entry.hidden,
    lastSeenAt: entry.lastSeenAt,
    name: entry.nameOverride ?? entry.discoveredName,
    launchUrl: entry.launchUrlOverride ?? entry.inferredLaunchUrl,
  };
}

export type LauncherSyncResult = { discovered: number; created: number; updated: number; missing: number };

function syncData(candidate: LauncherCandidate, now: Date) {
  return {
    discoveredName: candidate.name,
    image: candidate.image ?? null,
    inferredLaunchUrl: candidate.inferredLaunchUrl ?? null,
    containerState: candidate.containerState,
    containerStatus: candidate.containerStatus ?? null,
    lastStatus: candidate.status,
    exposedPorts: candidate.exposedPorts,
    lastSeenAt: now,
  };
}

/**
 * Synchronise a Portainer inventory in one provider request. The values users
 * can edit live in override columns and are deliberately never touched here.
 */
export async function syncPortainerLaunchers(service: ServiceInstance): Promise<LauncherSyncResult> {
  if (service.adapterType !== "portainer") throw new Error("Launcher discovery is only available for Portainer services");
  if (!service.baseUrl) throw new Error("Portainer requires an API base URL for launcher discovery");
  const discover = getAdapter("portainer").discoverLaunchers;
  if (!discover) throw new Error("Portainer launcher discovery is unavailable");

  const candidates = await discover(await getServiceContext(service));
  const now = new Date();
  const existing = await prisma.launcherEntry.findMany({
    where: { providerServiceId: service.id },
    select: { containerId: true },
  });
  const existingIds = new Set(existing.map((entry) => entry.containerId));
  const candidateIds = candidates.map((candidate) => candidate.containerId);
  let created = 0;
  let updated = 0;
  let missing = 0;

  await prisma.$transaction(async (tx) => {
    const newCandidates = candidates.filter((candidate) => !existingIds.has(candidate.containerId));
    if (newCandidates.length) {
      await tx.launcherEntry.createMany({
        data: newCandidates.map((candidate) => ({ providerServiceId: service.id, containerId: candidate.containerId, ...syncData(candidate, now) })),
      });
      created = newCandidates.length;
    }
    for (const candidate of candidates) {
      if (!existingIds.has(candidate.containerId)) continue;
      await tx.launcherEntry.update({
        where: { providerServiceId_containerId: { providerServiceId: service.id, containerId: candidate.containerId } },
        data: syncData(candidate, now),
      });
      updated += 1;
    }
    const absent = await tx.launcherEntry.updateMany({
      where: { providerServiceId: service.id, containerId: { notIn: candidateIds } },
      data: { containerState: "missing", containerStatus: "Container is no longer returned by Portainer", lastStatus: "unknown" },
    });
    missing = absent.count;
    await tx.serviceInstance.update({ where: { id: service.id }, data: { lastLauncherDiscoveryAt: now } });
  });

  return { discovered: candidates.length, created, updated, missing };
}

export type LauncherOverrides = { name?: string | null; launchUrl?: string | null; hidden?: boolean };

export async function updateLauncherOverrides(id: string, overrides: LauncherOverrides) {
  const data: { nameOverride?: string | null; launchUrlOverride?: string | null; hidden?: boolean } = {};
  if (overrides.name !== undefined) data.nameOverride = overrides.name?.trim() || null;
  if (overrides.launchUrl !== undefined) {
    const launchUrl = overrides.launchUrl?.trim();
    if (launchUrl) await assertPrivateServiceUrl(launchUrl);
    data.launchUrlOverride = launchUrl || null;
  }
  if (overrides.hidden !== undefined) data.hidden = overrides.hidden;
  return prisma.launcherEntry.update({ where: { id }, data });
}
