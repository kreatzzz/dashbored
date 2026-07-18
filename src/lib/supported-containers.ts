import type { LauncherCandidate } from "@/lib/adapters";

export type SupportedContainer = {
  id: string;
  adapterType: string;
  guideKey: string;
  name: string;
  description: string;
  categorySlug: string;
  icon: string;
  matchers: string[];
};

/**
 * This list is deliberately narrower than Launcher support. Matching a
 * container only offers a native setup journey when Dashbored has a dedicated,
 * useful dashboard for that product; everything else remains a Launcher card.
 */
export const supportedContainers: SupportedContainer[] = [
  {
    id: "adguard-home",
    adapterType: "adguard",
    guideKey: "adguard-home",
    name: "AdGuard Home",
    description: "DNS protection, query activity, and upstream visibility",
    categorySlug: "network",
    icon: "shield",
    matchers: ["adguard/adguardhome", "adguardhome", "adguard-home"],
  },
  {
    id: "beszel",
    adapterType: "beszel",
    guideKey: "beszel",
    name: "Beszel",
    description: "Host, container, and resource telemetry",
    categorySlug: "infrastructure",
    icon: "gauge",
    matchers: ["henrygd/beszel", "beszel"],
  },
  {
    id: "uptime-kuma",
    adapterType: "uptime-kuma",
    guideKey: "uptime-kuma",
    name: "Uptime Kuma",
    description: "Monitor availability and response-time summaries",
    categorySlug: "monitoring",
    icon: "activity",
    matchers: ["louislam/uptime-kuma", "uptime-kuma"],
  },
  {
    id: "jellyfin",
    adapterType: "jellyfin",
    guideKey: "jellyfin",
    name: "Jellyfin",
    description: "Library, session, and media-server insight",
    categorySlug: "media",
    icon: "film",
    matchers: ["jellyfin/jellyfin", "jellyfin"],
  },
  {
    id: "immich",
    adapterType: "immich",
    guideKey: "immich",
    name: "Immich",
    description: "Photo library, storage, and server insight",
    categorySlug: "media",
    icon: "image",
    matchers: ["immich-app/immich-server", "immich-server", "immich"],
  },
];

export type DiscoveredServiceSource = {
  providerServiceId: string;
  containerId: string;
  image: string | null;
  inferredLaunchUrl: string | null;
};

export function recognizeSupportedContainer(candidate: Pick<LauncherCandidate, "name" | "image">) {
  const fingerprint = `${candidate.name} ${candidate.image ?? ""}`.toLowerCase();
  return supportedContainers.find((service) => service.matchers.some((matcher) => fingerprint.includes(matcher)));
}

export function getSupportedContainerByAdapter(adapterType: string) {
  return supportedContainers.find((service) => service.adapterType === adapterType);
}

export function discoveredServiceConfiguration(providerServiceId: string, candidate: LauncherCandidate, supported: SupportedContainer) {
  return {
    setupState: "discovered",
    supportedContainer: supported.id,
    discoveredFrom: {
      providerServiceId,
      containerId: candidate.containerId,
      image: candidate.image ?? null,
      inferredLaunchUrl: candidate.inferredLaunchUrl ?? null,
    },
  };
}

export function getDiscoveredServiceSource(configuration: unknown): DiscoveredServiceSource | null {
  if (!isRecord(configuration) || configuration.setupState !== "discovered") return null;
  return getContainerServiceSource(configuration);
}

/**
 * Retains the Portainer identity after setup completes, solely to prevent a
 * subsequent inventory refresh from offering the same native integration
 * twice. Unlike getDiscoveredServiceSource, this is not a setup-state check.
 */
export function getContainerServiceSource(configuration: unknown): DiscoveredServiceSource | null {
  if (!isRecord(configuration) || !isRecord(configuration.discoveredFrom)) return null;
  const source = configuration.discoveredFrom;
  if (typeof source.providerServiceId !== "string" || typeof source.containerId !== "string") return null;
  return {
    providerServiceId: source.providerServiceId,
    containerId: source.containerId,
    image: typeof source.image === "string" ? source.image : null,
    inferredLaunchUrl: typeof source.inferredLaunchUrl === "string" ? source.inferredLaunchUrl : null,
  };
}

export function isConnectionSetupPending(configuration: unknown) {
  return getDiscoveredServiceSource(configuration) !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
