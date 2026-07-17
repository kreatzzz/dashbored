import { describe, expect, it } from "vitest";
import { inferContainerLaunchUrl, toLauncherCandidate } from "./portainer";

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
