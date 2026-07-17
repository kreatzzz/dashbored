import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

function isPrivateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateV6(ip: string) {
  const normalized = ip.toLowerCase();
  return normalized.startsWith("fc") || normalized.startsWith("fd");
}

export async function assertPrivateServiceUrl(input: string) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP(S) service URLs are allowed");
  if (url.username || url.password) throw new Error("Credentials must not be embedded in the URL");
  if (["localhost", "0.0.0.0", "::1"].includes(url.hostname) || url.hostname.startsWith("127.")) throw new Error("Loopback service URLs are not allowed");

  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address }) => {
    if (address.startsWith("169.254.") || address.toLowerCase().startsWith("fe80:")) return true;
    return address.includes(":") ? !isPrivateV6(address) : !isPrivateV4(address);
  })) {
    throw new Error("Service URLs must resolve only to private LAN or Tailscale addresses");
  }
  return url;
}

export async function safeFetch(input: string, init: RequestInit = {}, timeoutMs = 5000) {
  await assertPrivateServiceUrl(input);
  return fetch(input, {
    ...init,
    // Never follow upstream redirects. Returning the 3xx response lets launcher
    // adapters treat a login redirect as reachability without enabling SSRF pivots.
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "Dashbored/0.1", ...init.headers },
  });
}
