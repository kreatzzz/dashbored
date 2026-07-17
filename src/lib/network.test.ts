import { describe, expect, it } from "vitest";
import { assertPrivateServiceUrl } from "./network";

describe("private service URL boundary", () => {
  it("allows RFC1918 and Tailscale addresses", async () => {
    await expect(assertPrivateServiceUrl("http://10.0.0.10:8090")).resolves.toBeInstanceOf(URL);
    await expect(assertPrivateServiceUrl("https://10.0.0.11")).resolves.toBeInstanceOf(URL);
  });
  it("rejects public, loopback, and embedded credentials", async () => {
    await expect(assertPrivateServiceUrl("http://127.0.0.1:3000")).rejects.toThrow(/Loopback/);
    await expect(assertPrivateServiceUrl("https://8.8.8.8")).rejects.toThrow(/private/);
    await expect(assertPrivateServiceUrl("http://user:pass@10.0.0.10")).rejects.toThrow(/embedded/);
  });
});
