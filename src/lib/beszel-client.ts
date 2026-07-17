import { safeFetch } from "@/lib/network";
import type { AdapterContext } from "@/lib/adapters/types";

export type BeszelSystemInfo = {
  t?: number;
  u?: number;
  cpu?: number;
  mp?: number;
  dp?: number;
  v?: string;
  dt?: number;
  bb?: number;
  la?: [number, number, number];
  ct?: number;
  efs?: Record<string, number>;
};

export type BeszelStats = {
  cpu?: number;
  m?: number;
  mu?: number;
  mp?: number;
  mb?: number;
  s?: number;
  su?: number;
  d?: number;
  du?: number;
  dp?: number;
  t?: Record<string, number>;
  la?: [number, number, number];
  b?: [number, number];
  dio?: [number, number];
  cpub?: number[];
  cpus?: number[];
  dios?: [number, number, number, number, number, number];
  efs?: Record<string, { d?: number; du?: number; r?: number; w?: number; rb?: number; wb?: number; dios?: number[] }>;
  g?: Record<string, { n?: string; u?: number; mu?: number; mt?: number; p?: number }>;
};

export type BeszelSystem = { id: string; name: string; status: string; host?: string; port?: string; info?: BeszelSystemInfo };
export type BeszelStatsRecord = { id: string; created: string; type: string; stats?: BeszelStats };
export type BeszelContainer = { id: string; name: string; image?: string; status?: string; health?: number; cpu?: number; memory?: number; net?: number; ports?: string };

function join(context: AdapterContext, path: string) {
  return new URL(path.replace(/^\//, ""), `${context.baseUrl.replace(/\/$/, "")}/`).toString();
}

export async function beszelToken(context: AdapterContext) {
  if (context.credentials.token) return context.credentials.token;
  if (!context.credentials.username || !context.credentials.password) throw new Error("Beszel credentials are required");
  const response = await safeFetch(join(context, "/api/collections/users/auth-with-password"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: context.credentials.username, password: context.credentials.password }),
  });
  if (!response.ok) throw new Error("Beszel authentication rejected");
  const data = await response.json() as { token?: string };
  if (!data.token) throw new Error("Beszel returned no token");
  return data.token;
}

async function list<T>(context: AdapterContext, collection: string, query: URLSearchParams) {
  const response = await safeFetch(join(context, `/api/collections/${collection}/records?${query}`), {
    headers: { authorization: await beszelToken(context) },
  });
  if (!response.ok) throw new Error(`Beszel ${collection} returned HTTP ${response.status}`);
  return response.json() as Promise<{ items?: T[]; totalItems?: number }>;
}

export async function listBeszelSystems(context: AdapterContext) {
  return (await list<BeszelSystem>(context, "systems", new URLSearchParams({ perPage: "100", sort: "name" }))).items ?? [];
}

export async function getBeszelStats(context: AdapterContext, systemId: string, count = 60) {
  const query = new URLSearchParams({
    perPage: String(count),
    sort: "created",
    filter: `system="${systemId}" && type="1m"`,
    fields: "id,created,type,stats",
  });
  return (await list<BeszelStatsRecord>(context, "system_stats", query)).items ?? [];
}

export async function listBeszelContainers(context: AdapterContext, systemId: string) {
  const query = new URLSearchParams({ perPage: "100", sort: "name", filter: `system="${systemId}"` });
  return (await list<BeszelContainer>(context, "containers", query)).items ?? [];
}
