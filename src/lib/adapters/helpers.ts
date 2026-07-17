import type { AdapterContext } from "./types";

export function joinUrl(context: AdapterContext, path: string) {
  return new URL(path.replace(/^\//, ""), `${context.baseUrl.replace(/\/$/, "")}/`).toString();
}

export function basicAuth(credentials: Record<string, string>): Record<string, string> {
  if (!credentials.username && !credentials.password) return {};
  return { Authorization: `Basic ${Buffer.from(`${credentials.username ?? ""}:${credentials.password ?? ""}`).toString("base64")}` };
}

export async function responseMessage(response: Response) {
  if (response.ok) return "Connected";
  if (response.status === 401 || response.status === 403) return "Authentication rejected";
  if (response.status === 404) return "API endpoint not found";
  return `Upstream returned HTTP ${response.status}`;
}
