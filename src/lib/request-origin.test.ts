import { describe, expect, it } from "vitest";
import { isTrustedRequestOrigin } from "./request-origin";

describe("action request origin validation", () => {
  it("accepts an explicitly trusted LAN dashboard origin behind Docker", () => {
    const headers = new Headers({ origin: "http://server.home.arpa:43821", host: "localhost:3000" });
    expect(isTrustedRequestOrigin("http://localhost:3000/api/actions", headers, ["http://server.home.arpa:43821"])).toBe(true);
  });

  it("accepts the forwarded public host", () => {
    const headers = new Headers({ origin: "https://server.home.arpa", "x-forwarded-host": "server.home.arpa", "x-forwarded-proto": "https" });
    expect(isTrustedRequestOrigin("http://dashboard:3000/api/actions", headers, [])).toBe(true);
  });

  it("rejects an unrelated origin", () => {
    const headers = new Headers({ origin: "https://attacker.example", host: "server.home.arpa:43821" });
    expect(isTrustedRequestOrigin("http://dashboard:3000/api/actions", headers, ["http://server.home.arpa:43821"])).toBe(false);
  });

  it("rejects a malformed origin", () => {
    const headers = new Headers({ origin: "not a URL", host: "server.home.arpa:43821" });
    expect(isTrustedRequestOrigin("http://dashboard:3000/api/actions", headers, ["http://server.home.arpa:43821"])).toBe(false);
  });
});
