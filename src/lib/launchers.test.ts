import { describe, expect, it } from "vitest";
import { uniqueLauncherUrls } from "./launcher-urls";

describe("uniqueLauncherUrls", () => {
  it("keeps the first intentional card when a container points to the same app", () => {
    const cards = uniqueLauncherUrls([
      { id: "service-portainer", launchUrl: "https://portainer.home.arpa" },
      { id: "container-portainer", launchUrl: "https://portainer.home.arpa/" },
      { id: "container-jellyfin", launchUrl: "https://server.home.arpa:8096/" },
    ]);

    expect(cards.map((card) => card.id)).toEqual(["service-portainer", "container-jellyfin"]);
  });

  it("does not collapse distinct paths on the same private host", () => {
    const cards = uniqueLauncherUrls([
      { id: "home", launchUrl: "https://apps.home.arpa/" },
      { id: "photos", launchUrl: "https://apps.home.arpa/photos" },
    ]);

    expect(cards).toHaveLength(2);
  });
});
