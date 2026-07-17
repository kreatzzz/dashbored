import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedPayload = {
  ciphertext: string;
  nonce: string;
  authTag: string;
  keyVersion: number;
};

function key() {
  const encoded = process.env.CREDENTIAL_MASTER_KEY;
  if (!encoded) throw new Error("CREDENTIAL_MASTER_KEY is not configured");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("CREDENTIAL_MASTER_KEY must decode to 32 bytes");
  return value;
}

export function encryptCredential(value: Record<string, string>): EncryptedPayload {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    nonce: nonce.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: 1,
  };
}

export function decryptCredential(payload: EncryptedPayload): Record<string, string> {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.nonce, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8")) as Record<string, string>;
}
