import { safeFetch } from "@/lib/network";
import { joinUrl, responseMessage } from "./helpers";
import type { LauncherCandidate, ServiceAdapter, ServiceStatus } from "./types";

function headers(credentials: Record<string, string>): Record<string, string> {
  return credentials.apiKey ? { "X-API-Key": credentials.apiKey } : {};
}

type PortainerContainer = {
  Id?: unknown;
  Names?: unknown;
  Image?: unknown;
  State?: unknown;
  Status?: unknown;
  Labels?: unknown;
  Ports?: unknown;
};

type PublishedPort = { privatePort?: number; publicPort?: number; protocol?: string; bindAddress?: string };

function numberPort(value: unknown): number | undefined {
  const port = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : undefined;
}

function publishedPorts(container: PortainerContainer): PublishedPort[] {
  if (!Array.isArray(container.Ports)) return [];
  return container.Ports.flatMap((port): PublishedPort[] => {
    if (!port || typeof port !== "object") return [];
    const record = port as Record<string, unknown>;
    const publicPort = numberPort(record.PublicPort);
    const privatePort = numberPort(record.PrivatePort);
    const protocol = typeof record.Type === "string" ? record.Type.toLowerCase() : undefined;
    const bindAddress = typeof record.IP === "string" ? record.IP : undefined;
    return [{ privatePort, publicPort, protocol, bindAddress }];
  });
}

function isUsableBinding(bindAddress: string | undefined) {
  return !bindAddress || !["127.0.0.1", "::1", "localhost"].includes(bindAddress.toLowerCase());
}

function launcherStatus(state: string): ServiceStatus {
  if (state === "running") return "healthy";
  if (["created", "restarting", "paused"].includes(state)) return "degraded";
  if (["exited", "dead", "removing"].includes(state)) return "offline";
  return "unknown";
}

function containerLabels(container: PortainerContainer) {
  return container.Labels && typeof container.Labels === "object" && !Array.isArray(container.Labels)
    ? container.Labels as Record<string, unknown>
    : {};
}

function label(labels: Record<string, unknown>, key: string) {
  const value = labels[key];
  return typeof value === "string" ? value.trim() : undefined;
}

/**
 * Infer only an address reachable through the already-configured Portainer
 * host. We never trust a container label to introduce a different host, and
 * we never send a reachability request for an individual container.
 */
export function inferContainerLaunchUrl(container: PortainerContainer, portainerBaseUrl: string): string | undefined {
  let provider: URL;
  try {
    provider = new URL(portainerBaseUrl);
  } catch {
    return undefined;
  }
  if (!["http:", "https:"].includes(provider.protocol) || provider.username || provider.password) return undefined;

  const labels = containerLabels(container);
  const ports = publishedPorts(container).filter((port) => port.publicPort && isUsableBinding(port.bindAddress));
  if (!ports.length) return undefined;

  const explicit = label(labels, "com.dashboard.launch-url");
  if (explicit) {
    try {
      const url = new URL(explicit);
      const explicitPort = numberPort(url.port) ?? (url.protocol === "https:" ? 443 : url.protocol === "http:" ? 80 : undefined);
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username && !url.password &&
        url.hostname.toLowerCase() === provider.hostname.toLowerCase() &&
        ports.some((port) => port.publicPort === explicitPort)
      ) return url.toString();
    } catch {
      // Labels are untrusted inventory metadata; ignore invalid overrides.
    }
  }

  const requestedPort = numberPort(label(labels, "com.dashboard.launch-port"));
  const selected = requestedPort
    ? ports.find((port) => port.publicPort === requestedPort)
    : ports.find((port) => port.publicPort === 443) ?? ports.find((port) => port.publicPort === 80) ?? ports[0];
  if (!selected?.publicPort) return undefined;

  const requestedScheme = label(labels, "com.dashboard.launch-scheme")?.toLowerCase();
  const scheme = requestedScheme === "https" || requestedScheme === "http"
    ? requestedScheme
    : selected.publicPort === 443 ? "https" : "http";
  const path = label(labels, "com.dashboard.launch-path");
  if (path && (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))) return undefined;

  const url = new URL(`${scheme}://${provider.hostname}`);
  if (!((scheme === "http" && selected.publicPort === 80) || (scheme === "https" && selected.publicPort === 443))) url.port = String(selected.publicPort);
  if (path) url.pathname = path;
  return url.toString();
}

export function toLauncherCandidate(container: PortainerContainer, baseUrl: string): LauncherCandidate | undefined {
  const containerId = typeof container.Id === "string" ? container.Id : "";
  if (!containerId) return undefined;
  const names = Array.isArray(container.Names) ? container.Names : [];
  const firstName = names.find((name): name is string => typeof name === "string");
  const name = (firstName ?? containerId.slice(0, 12)).replace(/^\//, "") || containerId.slice(0, 12);
  const containerState = typeof container.State === "string" ? container.State.toLowerCase() : "unknown";
  const exposedPorts = publishedPorts(container).map((port) => ({ privatePort: port.privatePort, publicPort: port.publicPort, protocol: port.protocol }));
  return {
    containerId,
    name,
    image: typeof container.Image === "string" ? container.Image : undefined,
    inferredLaunchUrl: inferContainerLaunchUrl(container, baseUrl),
    containerState,
    containerStatus: typeof container.Status === "string" ? container.Status : undefined,
    status: launcherStatus(containerState),
    exposedPorts,
  };
}

export const portainerAdapter: ServiceAdapter = {
  type: "portainer",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    try {
      const response = await safeFetch(joinUrl(context, "/api/endpoints"), { headers: headers(context.credentials) });
      const endpoints = response.ok ? await response.json() as Array<Record<string, unknown>> : [];
      return { status: response.ok ? "healthy" : "degraded", latencyMs: Math.round(performance.now() - started), message: await responseMessage(response), metrics: { environments: endpoints.length } };
    } catch (error) {
      return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
    }
  },
  async getSummary(context) {
    const endpointId = Number(context.configuration.endpointId ?? 1);
    const response = await safeFetch(joinUrl(context, `/api/endpoints/${endpointId}/docker/containers/json?all=true`), { headers: headers(context.credentials) });
    if (!response.ok) throw new Error(await responseMessage(response));
    const containers = await response.json() as Array<Record<string, unknown>>;
    const running = containers.filter((container) => container.State === "running").length;
    return { title: "Container runtime", metrics: [
      { label: "Running", value: String(running) },
      { label: "Stopped", value: String(containers.length - running) },
      { label: "Total", value: String(containers.length) },
    ], items: containers.slice(0, 20).map((container) => ({
      id: String(container.Id ?? ""),
      name: Array.isArray(container.Names) ? String(container.Names[0] ?? "").replace(/^\//, "") : "Container",
      image: String(container.Image ?? ""),
      state: String(container.State ?? "unknown"),
      status: String(container.Status ?? ""),
    })) };
  },
  async discoverLaunchers(context) {
    const endpointId = Number(context.configuration.endpointId ?? 1);
    const response = await safeFetch(joinUrl(context, `/api/endpoints/${endpointId}/docker/containers/json?all=true`), { headers: headers(context.credentials) });
    if (!response.ok) throw new Error(await responseMessage(response));
    const containers = await response.json() as PortainerContainer[];
    return containers.flatMap((container) => {
      const candidate = toLauncherCandidate(container, context.baseUrl);
      return candidate ? [candidate] : [];
    });
  },
  async getAvailableActions() {
    return [
      { id: "start", label: "Start", description: "Start the selected container.", tone: "neutral", confirmation: "START" },
      { id: "stop", label: "Stop", description: "Gracefully stop the selected container.", tone: "warning", confirmation: "STOP" },
      { id: "restart", label: "Restart", description: "Restart the selected container.", tone: "warning", confirmation: "RESTART" },
    ];
  },
  async executeAction(context, action, target) {
    if (!target || !["start", "stop", "restart"].includes(action)) throw new Error("Invalid container action");
    const endpointId = Number(context.configuration.endpointId ?? 1);
    const response = await safeFetch(joinUrl(context, `/api/endpoints/${endpointId}/docker/containers/${encodeURIComponent(target)}/${action}`), { method: "POST", headers: headers(context.credentials) });
    if (!response.ok && response.status !== 304) throw new Error(await responseMessage(response));
    return { message: `Container ${action} requested` };
  },
};
