import { safeFetch } from "@/lib/network";
import { joinUrl, responseMessage } from "./helpers";
import type { AdapterContext, ServiceAdapter, SummaryResult } from "./types";

type JsonRecord = Record<string, unknown>;

function apiHeaders(context: AdapterContext): Record<string, string> {
  return context.credentials.apiKey ? { "x-api-key": context.credentials.apiKey } : {};
}

function apiUrl(context: AdapterContext, path: string) {
  // The UI normally stores the server origin, but imports may include /api.
  const basePath = new URL(context.baseUrl).pathname.replace(/\/$/, "");
  return joinUrl(context, `${basePath.endsWith("/api") ? "" : "/api"}${path}`);
}

async function getJson(context: AdapterContext, path: string): Promise<unknown> {
  const response = await safeFetch(apiUrl(context, path), { headers: apiHeaders(context) });
  if (!response.ok) throw new Error(await responseMessage(response));
  return parseJson(response);
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Malformed JSON response from Immich");
  }
}

export const immichAdapter: ServiceAdapter = {
  type: "immich",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    if (!context.credentials.apiKey) return { status: "degraded", latencyMs: 0, message: "Immich API key required" };

    try {
      const response = await safeFetch(apiUrl(context, "/server/about"), { headers: apiHeaders(context) });
      if (!response.ok) {
        return { status: response.status >= 500 ? "offline" : "degraded", latencyMs: Math.round(performance.now() - started), message: await responseMessage(response) };
      }
      const about = asRecord(await parseJson(response));
      const version = stringValue(about.version);
      if (!version) return { status: "degraded", latencyMs: Math.round(performance.now() - started), message: "Unexpected Immich server response" };
      return { status: "healthy", latencyMs: Math.round(performance.now() - started), message: "Connected", version };
    } catch (error) {
      return { status: messageStatus(error), latencyMs: Math.round(performance.now() - started), message: errorMessage(error) };
    }
  },
  async getSummary(context) {
    const [aboutRaw, statsRaw] = await Promise.all([getJson(context, "/server/about"), getJson(context, "/server/statistics")]);
    const about = asRecord(aboutRaw);
    const stats = asRecord(statsRaw);
    const photos = countValue(stats.photos);
    const videos = countValue(stats.videos);
    const usage = countValue(stats.usage);
    const photoUsage = countValue(stats.usagePhotos);
    const videoUsage = countValue(stats.usageVideos);
    return {
      title: "Photo library",
      metrics: [
        { label: "Assets", value: (photos + videos).toLocaleString(), detail: "Photos and videos", color: "blue" },
        { label: "Photos", value: photos.toLocaleString(), detail: formatBytes(photoUsage), color: "green" },
        { label: "Videos", value: videos.toLocaleString(), detail: formatBytes(videoUsage), color: "amber" },
        { label: "Storage", value: formatBytes(usage), detail: "Immich-managed files", color: "gray" },
      ],
      details: [
        { label: "Server", value: "Immich", detail: versionDetail(about) },
        { label: "Photo storage", value: formatBytes(photoUsage), detail: `${photos.toLocaleString()} photos` },
        { label: "Video storage", value: formatBytes(videoUsage), detail: `${videos.toLocaleString()} videos` },
      ],
    } satisfies SummaryResult;
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("Immich actions are not enabled"); },
};

function asRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function stringValue(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function countValue(value: unknown): number { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Connection failed"; }
function messageStatus(error: unknown) { return /malformed|unexpected immich/i.test(errorMessage(error)) ? "degraded" as const : "offline" as const; }

function versionDetail(about: JsonRecord) {
  const version = stringValue(about.version);
  const build = stringValue(about.build);
  return [version ? `v${version}` : undefined, build].filter(Boolean).join(" · ") || undefined;
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** exponent).toFixed(exponent >= 3 ? 1 : 0)} ${units[exponent]}`;
}
