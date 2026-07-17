import { safeFetch } from "@/lib/network";
import { joinUrl } from "./helpers";
import type { ServiceAdapter } from "./types";

export const uptimeKumaAdapter: ServiceAdapter = {
  type: "uptime-kuma",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    try {
      const authorization = context.credentials.apiKey ? `Basic ${Buffer.from(`:${context.credentials.apiKey}`).toString("base64")}` : undefined;
      const response = await safeFetch(joinUrl(context, "/metrics"), { headers: authorization ? { authorization } : {} });
      const body = response.ok ? await response.text() : "";
      const monitors = [...body.matchAll(/^monitor_status\{[^}]*\}\s+(\d+)/gm)].map((match) => Number(match[1]));
      const down = monitors.filter((value) => value === 0).length;
      return { status: response.ok ? down ? "degraded" : "healthy" : "degraded", latencyMs: Math.round(performance.now() - started), message: response.ok ? `${monitors.length - down}/${monitors.length} monitors up` : `Metrics returned HTTP ${response.status}`, metrics: { monitors: monitors.length, down } };
    } catch (error) {
      return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
    }
  },
  async getSummary(context) {
    const health = await this.getHealth(context);
    return { title: "Monitor availability", metrics: [
      { label: "Monitors", value: String(health.metrics?.monitors ?? 0) },
      { label: "Down", value: String(health.metrics?.down ?? 0) },
      { label: "Collector", value: health.status },
    ] };
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("Uptime Kuma actions are not enabled"); },
};
