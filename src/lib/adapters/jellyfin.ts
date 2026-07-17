import { safeFetch } from "@/lib/network";
import { joinUrl, responseMessage } from "./helpers";
import type { AdapterContext, ServiceAdapter, SummaryResult } from "./types";

type JsonRecord = Record<string, unknown>;

function apiHeaders(context: AdapterContext): Record<string, string> {
  // Keep the key out of URLs: reverse proxies commonly log request paths.
  return context.credentials.apiKey ? { "X-Emby-Token": context.credentials.apiKey } : {};
}

async function getJson(context: AdapterContext, path: string): Promise<unknown> {
  const response = await safeFetch(joinUrl(context, path), { headers: apiHeaders(context) });
  if (!response.ok) throw new Error(await responseMessage(response));
  return parseJson(response);
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Malformed JSON response from Jellyfin");
  }
}

export const jellyfinAdapter: ServiceAdapter = {
  type: "jellyfin",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    if (!context.credentials.apiKey) return { status: "degraded", latencyMs: 0, message: "Jellyfin API key required" };

    try {
      const response = await safeFetch(joinUrl(context, "/System/Info"), { headers: apiHeaders(context) });
      if (!response.ok) {
        return { status: response.status >= 500 ? "offline" : "degraded", latencyMs: Math.round(performance.now() - started), message: await responseMessage(response) };
      }
      const info = asRecord(await parseJson(response));
      const version = stringValue(info.Version);
      if (!version) return { status: "degraded", latencyMs: Math.round(performance.now() - started), message: "Unexpected Jellyfin system response" };
      return { status: "healthy", latencyMs: Math.round(performance.now() - started), message: "Connected", version, metrics: { serverName: stringValue(info.ServerName) || "Jellyfin" } };
    } catch (error) {
      return { status: messageStatus(error), latencyMs: Math.round(performance.now() - started), message: errorMessage(error) };
    }
  },
  async getSummary(context) {
    const [infoRaw, countsRaw, sessionsRaw] = await Promise.all([getJson(context, "/System/Info"), getJson(context, "/Items/Counts"), getJson(context, "/Sessions")]);
    const info = asRecord(infoRaw);
    const counts = asRecord(countsRaw);
    const sessions = asRecords(sessionsRaw);
    const movies = countValue(counts.MovieCount);
    const series = countValue(counts.SeriesCount);
    const episodes = countValue(counts.EpisodeCount);
    const songs = countValue(counts.SongCount);

    return {
      title: "Media server",
      metrics: [
        { label: "Movies", value: movies.toLocaleString(), detail: "Library items", color: "blue" },
        { label: "Series", value: series.toLocaleString(), detail: `${episodes.toLocaleString()} episodes`, color: "green" },
        { label: "Music tracks", value: songs.toLocaleString(), detail: `${countValue(counts.AlbumCount).toLocaleString()} albums`, color: "amber" },
        { label: "Sessions", value: sessions.length.toLocaleString(), detail: `${activeSessions(sessions).toLocaleString()} playing`, color: "gray" },
      ],
      details: [
        { label: "Server", value: stringValue(info.ServerName) || "Jellyfin", detail: versionDetail(info) },
        { label: "Artists", value: countValue(counts.ArtistCount).toLocaleString(), detail: "Music library" },
        { label: "Books", value: countValue(counts.BookCount).toLocaleString(), detail: "Library items" },
      ],
      tables: [{
        title: "Current sessions",
        description: "Connected Jellyfin clients (metadata only)",
        columns: [{ key: "user", label: "User" }, { key: "playing", label: "Now playing" }, { key: "client", label: "Client" }, { key: "state", label: "State", align: "right" }],
        rows: sessions.slice(0, 20).map(sessionRow),
      }],
    } satisfies SummaryResult;
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("Jellyfin actions are not enabled"); },
};

function asRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function asRecords(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function stringValue(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function countValue(value: unknown): number { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Connection failed"; }
function messageStatus(error: unknown) { return /malformed|unexpected jellyfin/i.test(errorMessage(error)) ? "degraded" as const : "offline" as const; }

function activeSessions(sessions: JsonRecord[]) {
  return sessions.filter((session) => {
    const playState = asRecord(session.PlayState);
    return Boolean(asRecord(session.NowPlayingItem).Name) && playState.IsPaused !== true;
  }).length;
}

function versionDetail(info: JsonRecord) {
  const version = stringValue(info.Version);
  const operatingSystem = stringValue(info.OperatingSystem);
  return [version ? `v${version}` : undefined, operatingSystem].filter(Boolean).join(" · ") || undefined;
}

function sessionRow(session: JsonRecord): Record<string, string> {
  const playState = asRecord(session.PlayState);
  const item = asRecord(session.NowPlayingItem);
  const itemName = stringValue(item.Name);
  const itemType = stringValue(item.Type);
  const client = [stringValue(session.Client), stringValue(session.DeviceName)].filter(Boolean).join(" · ");
  return { user: stringValue(session.UserName) || "Unknown", playing: itemName ? [itemName, itemType].filter(Boolean).join(" · ") : "Idle", client: client || "Unknown", state: itemName ? (playState.IsPaused === true ? "Paused" : "Playing") : "Idle" };
}
