import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "@/lib/network";
import { inferContainerLaunchUrl, listPortainerEnvironments, portainerAdapter, toLauncherCandidate } from "./portainer";
import type { AdapterContext } from "./types";

vi.mock("@/lib/network", () => ({ safeFetch: vi.fn() }));

const mockedFetch = vi.mocked(safeFetch);
const context: AdapterContext = {
  id: "portainer-1",
  name: "Portainer",
  baseUrl: "https://192.168.1.20:9443",
  launchUrl: "https://portainer.home.arpa",
  credentials: { apiKey: "test-token" },
  configuration: { endpointId: 2 },
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => mockedFetch.mockReset());

describe("Portainer launcher discovery", () => {
  const baseUrl = "https://server.home.arpa:9443";

  it("infers a launcher only from a published, non-loopback port on the provider host", () => {
    const url = inferContainerLaunchUrl({
      Ports: [{ PrivatePort: 8096, PublicPort: 8096, Type: "tcp", IP: "0.0.0.0" }],
    }, baseUrl);
    expect(url).toBe("http://server.home.arpa:8096/");
  });

  it("does not infer a launcher for loopback-only or unexposed containers", () => {
    expect(inferContainerLaunchUrl({ Ports: [{ PrivatePort: 3000, PublicPort: 3000, IP: "127.0.0.1" }] }, baseUrl)).toBeUndefined();
    expect(inferContainerLaunchUrl({ Ports: [{ PrivatePort: 3000, Type: "tcp" }] }, baseUrl)).toBeUndefined();
  });

  it("rejects labels that try to send a launcher to another host", () => {
    const url = inferContainerLaunchUrl({
      Labels: { "com.dashboard.launch-url": "http://example.com:8096" },
      Ports: [{ PrivatePort: 8096, PublicPort: 8096, IP: "0.0.0.0" }],
    }, baseUrl);
    expect(url).toBe("http://server.home.arpa:8096/");
  });

  it("maps container state without probing the container", () => {
    const candidate = toLauncherCandidate({
      Id: "abcdef0123456789",
      Names: ["/jellyfin"],
      Image: "jellyfin/jellyfin:latest",
      State: "exited",
      Status: "Exited (0) 2 minutes ago",
      Ports: [{ PrivatePort: 8096, PublicPort: 8096, Type: "tcp", IP: "0.0.0.0" }],
    }, baseUrl);
    expect(candidate).toMatchObject({ containerId: "abcdef0123456789", name: "jellyfin", status: "offline", inferredLaunchUrl: "http://server.home.arpa:8096/" });
  });
});

describe("Portainer environment discovery", () => {
  it("returns only valid environments visible to the scoped token", async () => {
    mockedFetch.mockResolvedValueOnce(json([
      { Id: 1, Name: "primary", Type: "docker" },
      { Id: "2", Name: "lab", Type: "edge" },
      { Id: 0, Name: "invalid" },
      { Id: "not-a-number", Name: "invalid" },
      { Name: "missing-id" },
    ]));

    await expect(listPortainerEnvironments(context)).resolves.toEqual([
      { id: 1, name: "primary", type: "docker" },
      { id: 2, name: "lab", type: "edge" },
    ]);
    expect(mockedFetch).toHaveBeenCalledWith("https://192.168.1.20:9443/api/endpoints", { headers: { "X-API-Key": "test-token" } });
  });

  it("rejects a non-list response rather than guessing an environment", async () => {
    mockedFetch.mockResolvedValueOnce(json({ Id: 1, Name: "primary" }));
    await expect(listPortainerEnvironments(context)).rejects.toThrow("incompatible environment list");
  });
});

describe("Portainer runtime summary", () => {
  it("combines container inventory with optional Docker engine capacity", async () => {
    mockedFetch
      .mockResolvedValueOnce(json([
        { Id: "stopped", Names: ["/archive"], Image: "busybox:latest", State: "exited", Status: "Exited (0)" },
        { Id: "running", Names: ["/dashboard"], Image: "dashbored:latest", State: "running", Status: "Up 10 minutes" },
        { Id: "worker", Names: ["/worker"], Image: "dashbored:latest", State: "running", Status: "Up 10 minutes" },
      ]))
      .mockResolvedValueOnce(json({ Containers: 3, ContainersRunning: 2, ContainersStopped: 1, Images: 5, NCPU: 4, MemTotal: 8 * 1024 ** 3, ServerVersion: "27.5.1", OperatingSystem: "Ubuntu", Driver: "overlay2" }));

    const summary = await portainerAdapter.getSummary(context);

    expect(summary.metrics.map((metric) => metric.value)).toEqual(["2", "1", "5", "4 cores"]);
    expect(summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Environment", value: "2" }),
      expect.objectContaining({ label: "Docker engine", value: "v27.5.1", detail: "Ubuntu" }),
    ]));
    expect(summary.items?.map((item) => item.name)).toEqual(["dashboard", "worker", "archive"]);
    expect(mockedFetch).toHaveBeenCalledWith("https://192.168.1.20:9443/api/endpoints/2/docker/containers/json?all=true", { headers: { "X-API-Key": "test-token" } });
  });

  it("keeps the container summary useful when host details are not permitted", async () => {
    mockedFetch
      .mockResolvedValueOnce(json([{ Id: "running", Names: ["/dashboard"], Image: "dashbored:latest", State: "running", Status: "Up" }]))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));

    const summary = await portainerAdapter.getSummary(context);

    expect(summary.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Running", value: "1" }),
      expect.objectContaining({ label: "Host capacity", value: "—", detail: "Host details unavailable" }),
    ]));
  });
});
