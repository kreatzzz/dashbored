import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "@/lib/network";
import { immichAdapter } from "./immich";
import { jellyfinAdapter } from "./jellyfin";
import { immichAbout, immichStatistics, jellyfinItemCounts, jellyfinSessions, jellyfinSystemInfo } from "./fixtures/media";
import type { AdapterContext } from "./types";

vi.mock("@/lib/network", () => ({ safeFetch: vi.fn() }));

const context: AdapterContext = {
  id: "service-1",
  name: "Media",
  baseUrl: "http://192.168.1.20:8096",
  launchUrl: "http://192.168.1.20:8096",
  credentials: { apiKey: "test-key" },
  configuration: {},
};
const mockedFetch = vi.mocked(safeFetch);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Jellyfin adapter", () => {
  beforeEach(() => mockedFetch.mockReset());

  it("uses a header API key and creates an aggregate read-only summary from healthy payloads", async () => {
    mockedFetch.mockResolvedValueOnce(json(jellyfinSystemInfo));
    const health = await jellyfinAdapter.getHealth(context);
    expect(health).toMatchObject({ status: "healthy", version: "10.10.7" });
    expect(mockedFetch).toHaveBeenCalledWith("http://192.168.1.20:8096/System/Info", { headers: { "X-Emby-Token": "test-key" } });

    mockedFetch.mockResolvedValueOnce(json(jellyfinSystemInfo)).mockResolvedValueOnce(json(jellyfinItemCounts)).mockResolvedValueOnce(json(jellyfinSessions));
    const summary = await jellyfinAdapter.getSummary(context);
    expect(summary.metrics.map((metric) => metric.value)).toEqual(["24", "6", "40", "1"]);
    expect(summary.tables?.[0].rows[0]).toMatchObject({ user: "Viewer", playing: "Example film · Movie", state: "Playing" });
    expect(await jellyfinAdapter.getAvailableActions(context)).toEqual([]);
  });

  it("classifies an unauthorized API key as degraded", async () => {
    mockedFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(jellyfinAdapter.getHealth(context)).resolves.toMatchObject({ status: "degraded", message: "Authentication rejected" });
  });

  it("classifies a network failure as offline", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(jellyfinAdapter.getHealth(context)).resolves.toMatchObject({ status: "offline", message: "connect ECONNREFUSED" });
  });

  it("rejects malformed system payloads without treating the service as healthy", async () => {
    mockedFetch.mockResolvedValueOnce(json({ ServerName: "Media Server" }));
    await expect(jellyfinAdapter.getHealth(context)).resolves.toMatchObject({ status: "degraded", message: "Unexpected Jellyfin system response" });
  });
});

describe("Immich adapter", () => {
  beforeEach(() => mockedFetch.mockReset());

  it("uses the stable API prefix and returns aggregate statistics from healthy payloads", async () => {
    mockedFetch.mockResolvedValueOnce(json(immichAbout));
    const health = await immichAdapter.getHealth(context);
    expect(health).toMatchObject({ status: "healthy", version: "v1.132.3" });
    expect(mockedFetch).toHaveBeenCalledWith("http://192.168.1.20:8096/api/server/about", { headers: { "x-api-key": "test-key" } });

    mockedFetch.mockResolvedValueOnce(json(immichAbout)).mockResolvedValueOnce(json(immichStatistics));
    const summary = await immichAdapter.getSummary(context);
    expect(summary.metrics.map((metric) => metric.value)).toEqual(["135", "120", "15", "5.0 GB"]);
    expect(await immichAdapter.getAvailableActions(context)).toEqual([]);
  });

  it("classifies an unauthorized API key as degraded", async () => {
    mockedFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(immichAdapter.getHealth(context)).resolves.toMatchObject({ status: "degraded", message: "Authentication rejected" });
  });

  it("classifies a network failure as offline", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("connect ETIMEDOUT"));
    await expect(immichAdapter.getHealth(context)).resolves.toMatchObject({ status: "offline", message: "connect ETIMEDOUT" });
  });

  it("rejects malformed server payloads without treating the service as healthy", async () => {
    mockedFetch.mockResolvedValueOnce(json({ build: "release" }));
    await expect(immichAdapter.getHealth(context)).resolves.toMatchObject({ status: "degraded", message: "Unexpected Immich server response" });
  });
});
