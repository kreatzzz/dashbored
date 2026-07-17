import { adguardAdapter } from "./adguard";
import { beszelAdapter } from "./beszel";
import { genericAdapter } from "./generic";
import { immichAdapter } from "./immich";
import { jellyfinAdapter } from "./jellyfin";
import { portainerAdapter } from "./portainer";
import { prowlarrAdapter, radarrAdapter, sonarrAdapter } from "./servarr";
import type { ServiceAdapter } from "./types";
import { uptimeKumaAdapter } from "./uptime-kuma";

const adapters: Record<string, ServiceAdapter> = {
  generic: genericAdapter,
  jellyfin: jellyfinAdapter,
  immich: immichAdapter,
  adguard: adguardAdapter,
  beszel: beszelAdapter,
  portainer: portainerAdapter,
  radarr: radarrAdapter,
  sonarr: sonarrAdapter,
  prowlarr: prowlarrAdapter,
  "uptime-kuma": uptimeKumaAdapter,
};

export function getAdapter(type: string) {
  return adapters[type] ?? genericAdapter;
}

export * from "./types";
