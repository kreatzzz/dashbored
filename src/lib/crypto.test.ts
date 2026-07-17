import { beforeEach, describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./crypto";

describe("credential encryption", () => {
  beforeEach(() => { process.env.CREDENTIAL_MASTER_KEY = Buffer.alloc(32, 7).toString("base64"); });
  it("round trips credentials without exposing plaintext", () => {
    const encrypted = encryptCredential({ apiKey: "secret-value", username: "admin" });
    expect(encrypted.ciphertext).not.toContain("secret-value");
    expect(decryptCredential(encrypted)).toEqual({ apiKey: "secret-value", username: "admin" });
  });
  it("rejects a malformed key", () => { process.env.CREDENTIAL_MASTER_KEY = "bad"; expect(() => encryptCredential({ token: "x" })).toThrow(/32 bytes/); });
});
