import { safeFetch } from "@/lib/network";
import { basicAuth, joinUrl, responseMessage } from "./helpers";
import type { ServiceAdapter } from "./types";

export type AdGuardQueryRecord = { domain: string; client: string; result: string; time: string; type: string };

export const adguardAdapter: ServiceAdapter = {
  type: "adguard",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    if (!context.credentials.username || !context.credentials.password) {
      return { status: "degraded", latencyMs: 0, message: "Credentials required" };
    }
    try {
      const response = await safeFetch(joinUrl(context, "/control/status"), { headers: basicAuth(context.credentials) });
      const data = response.ok ? await response.json() as Record<string, unknown> : {};
      return {
        status: response.ok ? "healthy" : response.status < 500 ? "degraded" : "offline",
        latencyMs: Math.round(performance.now() - started),
        message: await responseMessage(response),
        version: typeof data.version === "string" ? data.version : undefined,
        metrics: { protection: Boolean(data.protection_enabled), dnsPort: Number(data.dns_port ?? 53) },
      };
    } catch (error) {
      return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
    }
  },
  async getSummary(context) {
    const headers = basicAuth(context.credentials);
    const [stats, status, clients, filtering, dns, queryLog] = await Promise.all([
      requiredJson(context, "/control/stats", headers),
      optionalJson(context, "/control/status", headers),
      optionalJson(context, "/control/clients", headers),
      optionalJson(context, "/control/filtering/status", headers),
      optionalJson(context, "/control/dns_info", headers),
      optionalJson(context, "/control/querylog?limit=20", headers),
    ]);
    const queries = Number(stats.num_dns_queries ?? 0);
    const blocked = Number(stats.num_blocked_filtering ?? 0);
    const blockedPercent = queries ? blocked / queries * 100 : 0;
    const querySeries = numericArray(stats.dns_queries);
    const blockedSeries = numericArray(stats.blocked_filtering);
    const timeUnits = stats.time_units === "days" ? "days" : "hours";
    const chartData = querySeries.map((value, index) => ({
      time: timeLabel(index, querySeries.length, timeUnits),
      queries: value,
      blocked: blockedSeries[index] ?? 0,
    }));
    const persistentClients = Array.isArray(clients.clients) ? clients.clients.length : 0;
    const autoClients = Array.isArray(clients.auto_clients) ? clients.auto_clients.length : 0;
    const filters = Array.isArray(filtering.filters) ? filtering.filters as Array<Record<string, unknown>> : [];
    const enabledFilters = filters.filter((filter) => filter.enabled !== false).length;
    const rules = filters.reduce((total, filter) => total + Number(filter.rules_count ?? 0), 0) + (Array.isArray(filtering.user_rules) ? filtering.user_rules.length : 0);
    const recentQueries = Array.isArray(queryLog.data) ? queryLog.data as Array<Record<string, unknown>> : [];
    const upstreams = Array.isArray(dns.upstream_dns) ? dns.upstream_dns.map(String) : [];
    return { title: "DNS analytics", metrics: [
      { label: "DNS queries", value: queries.toLocaleString(), detail: `Retained by AdGuard Home`, trend: querySeries, color: "blue" },
      { label: "Blocked rate", value: `${blockedPercent.toFixed(1)}%`, detail: `${blocked.toLocaleString()} requests blocked`, trend: blockedSeries.map((value, index) => querySeries[index] ? value / querySeries[index] * 100 : 0), color: "red" },
      { label: "Average response", value: `${(Number(stats.avg_processing_time ?? 0) * 1000).toFixed(1)} ms`, detail: "Resolver processing time", trend: numericArray(stats.avg_processing_time), color: "amber" },
      { label: "Known clients", value: String(persistentClients + autoClients), detail: `${persistentClients} configured · ${autoClients} discovered`, trend: querySeries.map(() => persistentClients + autoClients), color: "green" },
    ],
    charts: chartData.length ? [{ title: "DNS traffic", description: `Queries and filtering activity by ${timeUnits === "days" ? "day" : "hour"}`, data: chartData, series: [
      { key: "queries", label: "Queries", color: "blue" },
      { key: "blocked", label: "Blocked", color: "red" },
    ] }] : [],
    details: [
      { label: "DNS listener", value: `Port ${Number(status.dns_port ?? 53)}`, detail: status.protection_enabled ? "Filtering active" : "Filtering paused" },
      { label: "Filter rules", value: rules.toLocaleString(), detail: `${enabledFilters}/${filters.length} lists enabled` },
      { label: "Upstreams", value: String(upstreams.length), detail: upstreams.slice(0, 2).join(" · ") || "System resolvers" },
      { label: "Cache", value: dns.cache_enabled === false ? "Disabled" : "Enabled", detail: dns.cache_size ? `${Number(dns.cache_size).toLocaleString()} entries · ${typeof status.version === "string" ? status.version : "AdGuard Home"}` : undefined },
    ],
    tables: [
      rankedTable("Top clients", "Clients generating the most DNS traffic", stats.top_clients, "Client"),
      rankedTable("Most queried domains", "Frequently requested domains", stats.top_queried_domains, "Domain"),
      rankedTable("Most blocked domains", "Domains blocked most often", stats.top_blocked_domains, "Domain"),
      { title: "Recent queries", description: "Latest activity from the AdGuard query log", href: "/services/adguard-home/query-log", actionLabel: "Open query log", columns: [
        { key: "domain", label: "Domain" }, { key: "client", label: "Client" }, { key: "result", label: "Result" }, { key: "time", label: "Time", align: "right", mono: true },
      ], rows: recentQueries.map((entry) => {
        const question = entry.question && typeof entry.question === "object" ? entry.question as Record<string, unknown> : {};
        return { domain: String(question.name ?? question.host ?? "Unknown"), client: String(entry.client ?? "Unknown"), result: String(entry.reason ?? entry.status ?? "Processed"), time: formatQueryTime(entry.time) };
      }) },
    ] };
  },
  async getAvailableActions() {
    return [
      { id: "toggle-protection", label: "Toggle protection", description: "Enable or disable DNS filtering.", tone: "warning", confirmation: "TOGGLE PROTECTION" },
      { id: "clear-cache", label: "Clear DNS cache", description: "Discard all cached DNS responses.", tone: "warning", confirmation: "CLEAR CACHE" },
    ];
  },
  async executeAction(context, action) {
    const headers = { ...basicAuth(context.credentials), "content-type": "application/json" };
    if (action === "clear-cache") {
      const response = await safeFetch(joinUrl(context, "/control/cache_clear"), { method: "POST", headers });
      if (!response.ok) throw new Error(await responseMessage(response));
      return { message: "DNS cache cleared" };
    }
    if (action === "toggle-protection") {
      const health = await this.getHealth(context);
      const enabled = !Boolean(health.metrics?.protection);
      const response = await safeFetch(joinUrl(context, "/control/protection"), { method: "POST", headers, body: JSON.stringify({ enabled, duration: 0 }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      return { message: `Protection ${enabled ? "enabled" : "disabled"}` };
    }
    throw new Error("Unsupported AdGuard action");
  },
};

async function requiredJson(context: Parameters<ServiceAdapter["getSummary"]>[0], path: string, headers: Record<string, string>) {
  const response = await safeFetch(joinUrl(context, path), { headers });
  if (!response.ok) throw new Error(await responseMessage(response));
  return response.json() as Promise<Record<string, unknown>>;
}

async function optionalJson(context: Parameters<ServiceAdapter["getSummary"]>[0], path: string, headers: Record<string, string>) {
  try {
    const response = await safeFetch(joinUrl(context, path), { headers });
    return response.ok ? await response.json() as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function numericArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => Number(item) || 0) : [];
}

function timeLabel(index: number, length: number, units: "hours" | "days") {
  const date = new Date();
  if (units === "days") date.setDate(date.getDate() - (length - index - 1));
  else date.setHours(date.getHours() - (length - index - 1));
  return units === "days"
    ? date.toLocaleDateString([], { month: "short", day: "numeric" })
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function rankedTable(title: string, description: string, input: unknown, firstLabel: string) {
  const rows = Array.isArray(input) ? input.slice(0, 8).map((entry) => {
    if (!entry || typeof entry !== "object") return { name: "Unknown", count: 0 };
    const [name, count] = Object.entries(entry as Record<string, unknown>)[0] ?? ["Unknown", 0];
    return { name, count: Number(count).toLocaleString() };
  }) : [];
  return { title, description, columns: [{ key: "name", label: firstLabel }, { key: "count", label: "Queries", align: "right" as const, mono: true }], rows };
}

function formatQueryTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export async function getAdGuardQueryLog(context: Parameters<ServiceAdapter["getSummary"]>[0], limit = 100): Promise<AdGuardQueryRecord[]> {
  const payload = await requiredJson(context, `/control/querylog?limit=${Math.min(500, Math.max(1, limit))}`, basicAuth(context.credentials));
  const entries = Array.isArray(payload.data) ? payload.data as Array<Record<string, unknown>> : [];
  return entries.map((entry) => {
    const question = entry.question && typeof entry.question === "object" ? entry.question as Record<string, unknown> : {};
    return {
      domain: String(question.name ?? question.host ?? "Unknown"),
      client: String(entry.client ?? "Unknown"),
      result: String(entry.reason ?? entry.status ?? "Processed"),
      type: String(question.type ?? "—"),
      time: formatQueryTime(entry.time),
    };
  });
}
