import { describe, expect, it } from "vitest";
import { discoveredServiceConfiguration, getContainerServiceSource, getDiscoveredServiceSource, isConnectionSetupPending, recognizeSupportedContainer } from "./supported-containers";

describe("supported container recognition", () => {
  it("recognizes only products with a native Dashbored dashboard", () => {
    expect(recognizeSupportedContainer({ name: "adguard-home", image: "adguard/adguardhome:latest" })?.id).toBe("adguard-home");
    expect(recognizeSupportedContainer({ name: "jellyfin", image: "jellyfin/jellyfin:latest" })?.id).toBe("jellyfin");
    expect(recognizeSupportedContainer({ name: "radarr", image: "lscr.io/linuxserver/radarr:latest" })).toBeUndefined();
  });

  it("marks a recognized container as pending until the owner completes setup", () => {
    const candidate = { containerId: "container-1", name: "immich_server", image: "ghcr.io/immich-app/immich-server:release", inferredLaunchUrl: "http://server.home.arpa:2283", containerState: "running", status: "healthy" as const, exposedPorts: [] };
    const supported = recognizeSupportedContainer(candidate);
    expect(supported).toBeDefined();
    const configuration = discoveredServiceConfiguration("portainer-1", candidate, supported!);

    expect(isConnectionSetupPending(configuration)).toBe(true);
    expect(getDiscoveredServiceSource(configuration)).toMatchObject({ providerServiceId: "portainer-1", containerId: "container-1" });
    expect(isConnectionSetupPending({ setupState: "connected" })).toBe(false);
  });

  it("keeps a completed connection bound to its container without treating it as setup pending", () => {
    const configuration = {
      setupState: "connected",
      discoveredFrom: { providerServiceId: "portainer-1", containerId: "container-1", image: "jellyfin/jellyfin:latest", inferredLaunchUrl: "http://server.home.arpa:8096" },
    };

    expect(isConnectionSetupPending(configuration)).toBe(false);
    expect(getDiscoveredServiceSource(configuration)).toBeNull();
    expect(getContainerServiceSource(configuration)).toMatchObject({ providerServiceId: "portainer-1", containerId: "container-1" });
  });
});
