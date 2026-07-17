import { safeFetch } from "@/lib/network";
import type { ServiceAdapter } from "./types";

export const genericAdapter: ServiceAdapter = {
  type: "generic",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    try {
      const response = await safeFetch(context.baseUrl, { method: "GET" });
      return {
        status: response.ok || response.status < 500 ? "healthy" : "degraded",
        latencyMs: Math.round(performance.now() - started),
        message: response.ok ? "Service responded" : `HTTP ${response.status}`,
      };
    } catch (error) {
      return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
    }
  },
  async getSummary(context) {
    const health = await this.getHealth(context);
    return { title: context.name, metrics: [
      { label: "Status", value: health.status },
      { label: "Latency", value: health.latencyMs ? `${health.latencyMs} ms` : "—" },
    ] };
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("This service does not expose dashboard actions"); },
};
