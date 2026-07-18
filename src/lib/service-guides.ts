export type ServiceGuide = {
  intro: string;
  mode: "integrated" | "launcher";
  fields: Array<{ label: string; value: string }>;
  steps: string[];
  data: string[];
  note?: string;
  docs: { label: string; href: string };
};

export const serviceGuides: Record<string, ServiceGuide> = {
  beszel: {
    intro: "Connect the Beszel Hub so the dashboard can read systems and their current availability through its PocketBase API.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "Beszel" }, { label: "Typical URL", value: "http://server.home.arpa:8090" }, { label: "Credentials", value: "Beszel user email and password" }],
    steps: ["Create a dedicated read-only Beszel user and share the systems you want it to see.", "In Settings, choose the Beszel adapter and enter the Hub URL.", "Enter that user's email in Username and its password in Password, then save.", "Start the dashboard worker and allow one polling interval for data to appear."],
    data: ["Systems online and offline", "System list and current status", "Health history recorded by the dashboard"],
    note: "Beszel documents its API as unstable across minor releases, so keep dashboard and Beszel contract tests in mind when upgrading.",
    docs: { label: "Beszel REST API", href: "https://www.beszel.dev/guide/rest-api" },
  },
  portainer: {
    intro: "Use a scoped Portainer access token to read environments and containers and to run confirmed container actions.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "Portainer" }, { label: "Typical URL", value: "Portainer HTTP origin or a trusted HTTPS origin" }, { label: "Credentials", value: "Portainer access token in API key" }],
    steps: ["Create a Portainer user with access only to the environment the dashboard should manage.", "Sign in as that user, open My account, and create an Access token.", "Choose the Portainer adapter in Settings, enter the Portainer base URL, and paste the token into API key.", "Use a certificate trusted by the dashboard host when connecting over HTTPS."],
    data: ["Environment reachability", "Running and stopped containers", "Container start, stop, and restart actions"],
    note: "The Portainer environment ID is stored per connection. The secure importer can set it without exposing the access token.",
    docs: { label: "Portainer API access", href: "https://docs.portainer.io/api/access" },
  },
  docker: {
    intro: "Docker is intentionally represented through Portainer and Beszel instead of mounting the privileged Docker socket into the dashboard.",
    mode: "launcher",
    fields: [{ label: "Adapter", value: "Generic launcher" }, { label: "Launch URL", value: "Your Portainer environment" }, { label: "Credentials", value: "Configure on Portainer and Beszel instead" }],
    steps: ["Configure the Portainer service in the dashboard for container inventory and actions.", "Configure Beszel for host and container telemetry.", "Point this Docker launcher at the relevant Portainer environment or stack page.", "Do not mount /var/run/docker.sock into the dashboard container."],
    data: ["Launch link from this page", "Container data through Portainer", "Runtime telemetry through Beszel"],
    note: "Direct Docker socket access grants host-level control. The dashboard deliberately avoids that trust boundary.",
    docs: { label: "Docker Engine security", href: "https://docs.docker.com/engine/security/" },
  },
  "adguard-home": {
    intro: "Connect AdGuard Home's control API for DNS status, traffic statistics, and explicitly confirmed protection actions.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "AdGuard Home" }, { label: "Typical URL", value: "Your AdGuard admin origin" }, { label: "Credentials", value: "AdGuard username and password" }],
    steps: ["Confirm the AdGuard admin interface is reachable from the dashboard container.", "Choose the AdGuard Home adapter and use the admin origin without adding /control.", "Enter the AdGuard web username and password, then save.", "The worker will call /control/status and /control/stats on the next sweep."],
    data: ["Protection and DNS state", "Query and blocked-query totals", "Protection toggle and DNS cache clear"],
    docs: { label: "AdGuard Home OpenAPI", href: "https://github.com/AdguardTeam/AdGuardHome/blob/master/openapi/openapi.yaml" },
  },
  unbound: {
    intro: "Unbound has no HTTP dashboard API in this release. Its health is inferred through AdGuard upstream checks or a dedicated private health endpoint.",
    mode: "launcher",
    fields: [{ label: "Adapter", value: "Generic launcher" }, { label: "URL", value: "A private HTTP health endpoint, if available" }, { label: "Credentials", value: "None used by the dashboard" }],
    steps: ["Keep Unbound bound to the LAN or its private container network.", "Use AdGuard Home's upstream configuration to point DNS traffic at Unbound.", "Use the AdGuard service page for upstream-level visibility.", "Only expose unbound-control after configuring its TLS certificates and a tightly restricted network path."],
    data: ["Generic HTTP reachability when configured", "Upstream behavior through AdGuard", "No direct control actions in v1"],
    note: "unbound-control uses a TLS-protected control channel, not a normal browser API. Direct control is intentionally deferred.",
    docs: { label: "Unbound remote control", href: "https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html#set-up-remote-control" },
  },
  "uptime-kuma": {
    intro: "The dashboard reads Uptime Kuma's Prometheus endpoint to summarize monitor availability without relying on its private management protocol.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "Uptime Kuma" }, { label: "Typical URL", value: "http://server.home.arpa:3001" }, { label: "Credentials", value: "Prometheus API key in API key" }],
    steps: ["In Uptime Kuma, open Settings → API Keys and generate a key for Prometheus metrics.", "Choose the Uptime Kuma adapter in Settings and enter the Kuma origin.", "Paste the generated key into API key; the dashboard authenticates it as the /metrics basic-auth password.", "Save and wait for the worker to read monitor_status and response-time metrics."],
    data: ["Monitor count", "Up and down availability", "Prometheus collector health"],
    note: "Adding the first Prometheus API key permanently disables username/password authentication for Kuma's metrics endpoint.",
    docs: { label: "Kuma Prometheus API keys", href: "https://github.com/louislam/uptime-kuma/wiki/Prometheus-API-Keys" },
  },
  qbittorrent: {
    intro: "qBittorrent is currently a launcher with reachability monitoring. Its WebUI API adapter is planned but not enabled yet.",
    mode: "launcher",
    fields: [{ label: "Adapter", value: "Generic launcher" }, { label: "Typical URL", value: "http://server.home.arpa:8080" }, { label: "Credentials", value: "Not used in launcher mode" }],
    steps: ["Enable qBittorrent Web UI under Tools → Options → Web UI.", "Bind it to a private LAN interface and set a strong WebUI username and password.", "Point the dashboard Launch URL and API base URL to that WebUI origin.", "Keep the Generic launcher adapter until the cookie-based WebUI API adapter is implemented."],
    data: ["HTTP reachability and latency", "Direct launch into qBittorrent", "No torrent queue data in v1"],
    docs: { label: "qBittorrent WebUI API", href: "https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-4.1%29" },
  },
  radarr: {
    intro: "Radarr is currently monitored as a launcher. Its API key can be prepared now for a future native library and queue adapter.",
    mode: "launcher",
    fields: [{ label: "Adapter", value: "Generic launcher" }, { label: "Typical URL", value: "http://server.home.arpa:7878" }, { label: "Credentials", value: "Not used in launcher mode" }],
    steps: ["Open Radarr Settings → General → Security and copy the API key.", "Set the dashboard Launch URL and API base URL to the Radarr origin.", "Keep Generic launcher selected for current reachability monitoring.", "Retain the key securely; a future Radarr adapter will send it in the X-Api-Key header."],
    data: ["HTTP reachability and latency", "Direct launch into Radarr", "No calendar or queue data in v1"],
    docs: { label: "Radarr API", href: "https://radarr.video/docs/api/" },
  },
  sonarr: {
    intro: "Sonarr is currently monitored as a launcher. Its API key can be prepared for a future series, calendar, and queue integration.",
    mode: "launcher",
    fields: [{ label: "Adapter", value: "Generic launcher" }, { label: "Typical URL", value: "http://server.home.arpa:8989" }, { label: "Credentials", value: "Not used in launcher mode" }],
    steps: ["Open Sonarr Settings → General → Security and copy the API key.", "Set the dashboard Launch URL and API base URL to the Sonarr origin.", "Keep Generic launcher selected for current reachability monitoring.", "Retain the key securely; the official API expects X-Api-Key authentication."],
    data: ["HTTP reachability and latency", "Direct launch into Sonarr", "No series or queue data in v1"],
    docs: { label: "Sonarr API", href: "https://sonarr.tv/docs/api/?api=v5" },
  },
  jellyfin: {
    intro: "Connect Jellyfin with a dashboard API key to read server health, library counts, and current-session metadata. Dashbored never controls playback or changes the library.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "Jellyfin" }, { label: "Typical URL", value: "http://server.home.arpa:8096" }, { label: "Credentials", value: "Jellyfin API key in API key" }],
    steps: ["In Jellyfin Dashboard → Advanced → API Keys, create a dedicated key for Dashbored.", "Choose the Jellyfin adapter and enter the Jellyfin server origin; do not append an API path.", "Paste the key into API key, save, and allow the next worker sweep to validate it.", "Keep Jellyfin private to the LAN or Tailscale unless its public exposure is separately hardened."],
    data: ["Server version and reachability", "Movie, series, episode, and music counts", "Current client sessions and now-playing metadata"],
    docs: { label: "Jellyfin server documentation", href: "https://jellyfin.org/docs/general/server/" },
  },
  immich: {
    intro: "Connect Immich with a scoped API key to read server health and aggregate photo, video, and storage statistics. Dashbored does not access individual assets.",
    mode: "integrated",
    fields: [{ label: "Adapter", value: "Immich" }, { label: "Typical URL", value: "http://server.home.arpa:2283" }, { label: "Credentials", value: "Immich API key in API key" }],
    steps: ["Create a dedicated Immich API key in User Settings → API Keys.", "Grant it the server.about and server.statistics read permissions; server statistics require an administrator key.", "Choose the Immich adapter and enter the server origin (the /api suffix is optional).", "Paste the key into API key, save, and allow the next worker sweep to validate it."],
    data: ["Server version and reachability", "Aggregate photo and video totals", "Aggregate Immich-managed storage usage"],
    docs: { label: "Immich API keys", href: "https://api.immich.app/getting-started" },
  },
};

export function getServiceGuide(slug: string): ServiceGuide {
  return serviceGuides[slug] ?? {
    intro: "Use the generic launcher to keep a trusted application link in Dashbored without inventing a native dashboard or health signal.",
    mode: "launcher",
    fields: [{ label: "Mode", value: "Generic launcher" }, { label: "Browser URL", value: "Private LAN or Tailscale origin" }, { label: "Credentials", value: "Not used in launcher mode" }],
    steps: ["Choose Add launcher in Settings.", "Enter the browser-facing private URL.", "Save the link and open it from Launcher or this service page.", "Use Portainer inventory or a dedicated monitoring tool when you need health information."],
    data: ["External application launch", "Optional Portainer container state", "No invented application metrics"],
    docs: { label: "Open application", href: "#" },
  };
}
