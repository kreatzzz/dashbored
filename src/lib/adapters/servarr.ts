import { safeFetch } from "@/lib/network";
import { joinUrl, responseMessage } from "./helpers";
import type { AdapterContext, ServiceAdapter, SummaryResult } from "./types";

type ServarrKind = "radarr" | "sonarr";

function apiHeaders(context: AdapterContext): Record<string, string> {
  return context.credentials.apiKey ? { "X-Api-Key": context.credentials.apiKey } : {};
}

async function json(context: AdapterContext, path: string) {
  const response = await safeFetch(joinUrl(context, path), { headers: apiHeaders(context) });
  if (!response.ok) throw new Error(await responseMessage(response));
  return response.json() as Promise<unknown>;
}

function servarr(kind: ServarrKind): ServiceAdapter {
  const label = kind === "radarr" ? "Radarr" : "Sonarr";
  return {
    type: kind,
    async testConnection(context) { return this.getHealth(context); },
    async getHealth(context) {
      const started = performance.now();
      if (!context.credentials.apiKey) return { status: "degraded", latencyMs: 0, message: `${label} API key required` };
      try {
        const response = await safeFetch(joinUrl(context, "/api/v3/system/status"), { headers: apiHeaders(context) });
        const data = response.ok ? await response.json() as Record<string, unknown> : {};
        return { status: response.ok ? "healthy" : "degraded", latencyMs: Math.round(performance.now() - started), message: await responseMessage(response), version: String(data.version ?? "") || undefined };
      } catch (error) {
        return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
      }
    },
    async getSummary(context) {
      return kind === "radarr" ? radarrSummary(context) : sonarrSummary(context);
    },
    async getAvailableActions() { return []; },
    async executeAction() { throw new Error(`${label} actions are not enabled`); },
  };
}

async function radarrSummary(context: AdapterContext): Promise<SummaryResult> {
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() + 30);
  const [moviesRaw, queueRaw, calendarRaw, disksRaw] = await Promise.all([
    json(context, "/api/v3/movie"),
    json(context, "/api/v3/queue?page=1&pageSize=20&sortKey=timeleft&sortDirection=ascending&includeUnknownMovieItems=true"),
    json(context, `/api/v3/calendar?start=${dateOnly(today)}&end=${dateOnly(end)}&includeUnmonitored=false`),
    json(context, "/api/v3/diskspace"),
  ]);
  const movies = arrayOfRecords(moviesRaw);
  const queuePayload = record(queueRaw);
  const queue = arrayOfRecords(queuePayload.records);
  const calendar = arrayOfRecords(calendarRaw);
  const disks = arrayOfRecords(disksRaw);
  const monitored = movies.filter((movie) => movie.monitored === true).length;
  const downloaded = movies.filter((movie) => record(movie.movieFile).id || Number(movie.sizeOnDisk ?? 0) > 0).length;
  const totalBytes = movies.reduce((sum, movie) => sum + Number(movie.sizeOnDisk ?? 0), 0);
  const freeBytes = disks.reduce((sum, disk) => sum + Number(disk.freeSpace ?? 0), 0);
  return { title: "Movie operations", metrics: [
    { label: "Movies", value: movies.length.toLocaleString(), detail: `${monitored} monitored` },
    { label: "Downloaded", value: downloaded.toLocaleString(), detail: `${percent(downloaded, movies.length)}% available` },
    { label: "Queue", value: String(Number(queuePayload.totalRecords ?? queue.length)), detail: queue.length ? "Active downloads and imports" : "Queue clear" },
    { label: "Next 30 days", value: calendar.length.toLocaleString(), detail: "Upcoming releases" },
    { label: "Library size", value: formatBytes(totalBytes), detail: "Movie files" },
    { label: "Free space", value: formatBytes(freeBytes), detail: `${disks.length} mounted paths` },
  ], details: disks.map((disk) => ({ label: String(disk.label ?? disk.path ?? "Storage"), value: formatBytes(Number(disk.freeSpace ?? 0)), detail: `${formatBytes(Number(disk.totalSpace ?? 0))} total`, percent: 100 - percentNumber(Number(disk.freeSpace ?? 0), Number(disk.totalSpace ?? 0)) })), tables: [
    { title: "Download queue", description: "Current Radarr downloads and imports", columns: [{ key: "title", label: "Movie" }, { key: "status", label: "Status" }, { key: "quality", label: "Quality" }, { key: "remaining", label: "Remaining", align: "right", mono: true }], rows: queue.map((item) => ({ title: String(item.title ?? record(item.movie).title ?? "Unknown"), status: String(item.trackedDownloadStatus ?? item.status ?? "Unknown"), quality: String(record(record(item.quality).quality).name ?? "—"), remaining: String(item.timeleft ?? "—") })) },
    { title: "Upcoming releases", description: "Monitored releases over the next 30 days", columns: [{ key: "title", label: "Movie" }, { key: "date", label: "Release" }, { key: "status", label: "Status" }, { key: "year", label: "Year", align: "right", mono: true }], rows: calendar.slice(0, 20).map((movie) => ({ title: String(movie.title ?? "Unknown"), date: formatDate(movie.digitalRelease ?? movie.physicalRelease ?? movie.inCinemas), status: String(movie.status ?? "Announced"), year: Number(movie.year ?? 0) || "—" })) },
  ] };
}

async function sonarrSummary(context: AdapterContext): Promise<SummaryResult> {
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() + 14);
  const [seriesRaw, queueRaw, calendarRaw, disksRaw] = await Promise.all([
    json(context, "/api/v3/series"),
    json(context, "/api/v3/queue?page=1&pageSize=20&sortKey=timeleft&sortDirection=ascending&includeUnknownSeriesItems=true"),
    json(context, `/api/v3/calendar?start=${dateOnly(today)}&end=${dateOnly(end)}&includeUnmonitored=false&includeSeries=true`),
    json(context, "/api/v3/diskspace"),
  ]);
  const series = arrayOfRecords(seriesRaw);
  const queuePayload = record(queueRaw);
  const queue = arrayOfRecords(queuePayload.records);
  const calendar = arrayOfRecords(calendarRaw);
  const disks = arrayOfRecords(disksRaw);
  const monitored = series.filter((item) => item.monitored === true).length;
  const episodes = series.reduce((sum, item) => sum + Number(record(item.statistics).episodeCount ?? 0), 0);
  const files = series.reduce((sum, item) => sum + Number(record(item.statistics).episodeFileCount ?? 0), 0);
  const totalBytes = series.reduce((sum, item) => sum + Number(record(item.statistics).sizeOnDisk ?? 0), 0);
  const freeBytes = disks.reduce((sum, disk) => sum + Number(disk.freeSpace ?? 0), 0);
  return { title: "Series operations", metrics: [
    { label: "Series", value: series.length.toLocaleString(), detail: `${monitored} monitored` },
    { label: "Episodes", value: files.toLocaleString(), detail: `${Math.max(0, episodes - files).toLocaleString()} missing` },
    { label: "Coverage", value: `${percent(files, episodes)}%`, detail: "Episode files available" },
    { label: "Queue", value: String(Number(queuePayload.totalRecords ?? queue.length)), detail: queue.length ? "Active downloads and imports" : "Queue clear" },
    { label: "Next 14 days", value: calendar.length.toLocaleString(), detail: "Upcoming episodes" },
    { label: "Library size", value: formatBytes(totalBytes), detail: `${formatBytes(freeBytes)} free` },
  ], details: disks.map((disk) => ({ label: String(disk.label ?? disk.path ?? "Storage"), value: formatBytes(Number(disk.freeSpace ?? 0)), detail: `${formatBytes(Number(disk.totalSpace ?? 0))} total`, percent: 100 - percentNumber(Number(disk.freeSpace ?? 0), Number(disk.totalSpace ?? 0)) })), tables: [
    { title: "Download queue", description: "Current Sonarr downloads and imports", columns: [{ key: "title", label: "Episode" }, { key: "series", label: "Series" }, { key: "status", label: "Status" }, { key: "remaining", label: "Remaining", align: "right", mono: true }], rows: queue.map((item) => ({ title: String(item.title ?? "Unknown"), series: String(record(item.series).title ?? "—"), status: String(item.trackedDownloadStatus ?? item.status ?? "Unknown"), remaining: String(item.timeleft ?? "—") })) },
    { title: "Upcoming episodes", description: "Monitored episodes airing over the next 14 days", columns: [{ key: "series", label: "Series" }, { key: "episode", label: "Episode" }, { key: "title", label: "Title" }, { key: "airDate", label: "Air date", align: "right", mono: true }], rows: calendar.slice(0, 24).map((episode) => ({ series: String(record(episode.series).title ?? "Unknown"), episode: `S${pad(episode.seasonNumber)}E${pad(episode.episodeNumber)}`, title: String(episode.title ?? "TBA"), airDate: formatDate(episode.airDateUtc ?? episode.airDate) })) },
  ] };
}

export const radarrAdapter = servarr("radarr");
export const sonarrAdapter = servarr("sonarr");

export const prowlarrAdapter: ServiceAdapter = {
  type: "prowlarr",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    if (!context.credentials.apiKey) return { status: "degraded", latencyMs: 0, message: "Prowlarr API key required" };
    try {
      const response = await safeFetch(joinUrl(context, "/api/v1/system/status"), { headers: apiHeaders(context) });
      const data = response.ok ? await response.json() as Record<string, unknown> : {};
      return { status: response.ok ? "healthy" : "degraded", latencyMs: Math.round(performance.now() - started), message: await responseMessage(response), version: String(data.version ?? "") || undefined };
    } catch (error) { return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" }; }
  },
  async getSummary(context) {
    const [indexersRaw, healthRaw, applicationsRaw] = await Promise.all([json(context, "/api/v1/indexer"), json(context, "/api/v1/health"), json(context, "/api/v1/applications")]);
    const indexers = arrayOfRecords(indexersRaw); const health = arrayOfRecords(healthRaw); const applications = arrayOfRecords(applicationsRaw);
    return { title: "Indexer operations", metrics: [
      { label: "Indexers", value: String(indexers.length), detail: `${indexers.filter((item) => item.enable === true).length} enabled` },
      { label: "Applications", value: String(applications.length), detail: "Connected Servarr apps" },
      { label: "Health issues", value: String(health.length), detail: health.length ? "Review required" : "No active warnings" },
      { label: "Usenet", value: String(indexers.filter((item) => String(item.protocol).toLowerCase() === "usenet").length), detail: "Configured indexers" },
      { label: "Torrent", value: String(indexers.filter((item) => String(item.protocol).toLowerCase() === "torrent").length), detail: "Configured indexers" },
    ], tables: [
      { title: "Indexers", description: "Prowlarr indexer configuration", columns: [{ key: "name", label: "Indexer" }, { key: "protocol", label: "Protocol" }, { key: "privacy", label: "Privacy" }, { key: "state", label: "State", align: "right" }], rows: indexers.map((item) => ({ name: String(item.name ?? "Unknown"), protocol: String(item.protocol ?? "—"), privacy: String(item.privacy ?? "—"), state: item.enable === true ? "Enabled" : "Disabled" })) },
      { title: "Health", description: "Current Prowlarr warnings", columns: [{ key: "source", label: "Source" }, { key: "message", label: "Message" }, { key: "type", label: "Type", align: "right" }], rows: health.map((item) => ({ source: String(item.source ?? "Prowlarr"), message: String(item.message ?? "Unknown issue"), type: String(item.type ?? "warning") })) },
    ] };
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("Prowlarr actions are not enabled"); },
};

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function arrayOfRecords(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }
function formatDate(value: unknown) { const date = new Date(String(value ?? "")); return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }
function pad(value: unknown) { return String(Number(value ?? 0)).padStart(2, "0"); }
function percent(part: number, total: number) { return total ? Math.round(part / total * 100) : 0; }
function percentNumber(part: number, total: number) { return total ? part / total * 100 : 0; }
function formatBytes(value: number) { if (!Number.isFinite(value) || value <= 0) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1); return `${(value / 1024 ** exponent).toFixed(exponent > 2 ? 1 : 0)} ${units[exponent]}`; }
