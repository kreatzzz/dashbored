import { getBeszelStats, listBeszelContainers, listBeszelSystems } from "@/lib/beszel-client";
import type { ServiceAdapter } from "./types";

export const beszelAdapter: ServiceAdapter = {
  type: "beszel",
  async testConnection(context) { return this.getHealth(context); },
  async getHealth(context) {
    const started = performance.now();
    try {
      const items = await listBeszelSystems(context);
      const down = items.filter((item) => item.status !== "up").length;
      const version = items.find((item) => item.info?.v)?.info?.v;
      return { status: down ? "degraded" : "healthy", latencyMs: Math.round(performance.now() - started), message: `${items.length - down}/${items.length} systems up`, version: version ? String(version) : undefined, metrics: { systems: items.length, down } };
    } catch (error) {
      return { status: "offline", latencyMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : "Connection failed" };
    }
  },
  async getSummary(context) {
    const systems = await listBeszelSystems(context);
    const primary = systems.find((system) => system.status === "up") ?? systems[0];
    const [history, containers] = primary
      ? await Promise.all([getBeszelStats(context, primary.id, 60), listBeszelContainers(context, primary.id)])
      : [[], []];
    const latest = history.at(-1)?.stats;
    const info = primary?.info;
    const temperature = latest?.t ? Math.max(...Object.values(latest.t)) : info?.dt;
    const network = latest?.b ?? [0, 0];
    const diskIo = latest?.dio ?? [0, 0];
    const up = systems.filter((system) => system.status === "up").length;
    const historyData = history.map((record) => ({
      time: new Date(record.created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      cpu: Number(record.stats?.cpu ?? 0),
      memory: Number(record.stats?.mp ?? 0),
      disk: Number(record.stats?.dp ?? 0),
    }));
    const storage = [
      ...(latest?.d ? [{ label: "Root filesystem", value: `${(latest.du ?? 0).toFixed(1)} / ${latest.d.toFixed(1)} GB`, detail: `${(latest.dp ?? 0).toFixed(1)}% used`, percent: latest.dp ?? 0 }] : []),
      ...Object.entries(latest?.efs ?? {}).map(([name, fs]) => ({ label: name, value: `${(fs.du ?? 0).toFixed(1)} / ${(fs.d ?? 0).toFixed(1)} GB`, detail: `${fs.d ? ((fs.du ?? 0) / fs.d * 100).toFixed(1) : "0"}% used`, percent: fs.d ? (fs.du ?? 0) / fs.d * 100 : 0 })),
    ];
    return { title: "System telemetry", metrics: [
      { label: "CPU", value: `${(latest?.cpu ?? info?.cpu ?? 0).toFixed(1)}%`, detail: `${info?.t ?? latest?.cpus?.length ?? 0} threads`, trend: history.map((item) => Number(item.stats?.cpu ?? 0)), color: "blue" },
      { label: "Memory", value: `${(latest?.mp ?? info?.mp ?? 0).toFixed(1)}%`, detail: latest?.m ? `${(latest.mu ?? 0).toFixed(1)} of ${latest.m.toFixed(1)} GB` : undefined, trend: history.map((item) => Number(item.stats?.mp ?? 0)), color: "green" },
      { label: "Disk", value: `${(latest?.dp ?? info?.dp ?? 0).toFixed(1)}%`, detail: latest?.d ? `${(latest.du ?? 0).toFixed(1)} of ${latest.d.toFixed(1)} GB` : undefined, trend: history.map((item) => Number(item.stats?.dp ?? 0)), color: "gray" },
      { label: "Containers", value: String(containers.length), detail: `${containers.filter((container) => /^up/i.test(container.status ?? "")).length} running`, trend: history.map(() => containers.length), color: "amber" },
    ],
    charts: historyData.length ? [{ title: "Performance", description: "CPU, memory, and root disk utilization over the last hour", data: historyData, series: [
      { key: "cpu", label: "CPU", color: "blue", unit: "%" },
      { key: "memory", label: "Memory", color: "green", unit: "%" },
      { key: "disk", label: "Disk", color: "gray", unit: "%" },
    ] }] : [],
    details: [
      ...storage.slice(0, 2),
      { label: "Network throughput", value: `${formatBytes(network[1])}/s down`, detail: `${formatBytes(network[0])}/s up` },
      { label: "Agent", value: info?.v ? `v${info.v}` : "Unknown", detail: `${primary?.name ?? "System"} · ${formatBytes(diskIo[0])}/s disk read` },
    ],
    tables: [{ title: "Containers", description: `${up}/${systems.length} monitored systems online`, columns: [
      { key: "name", label: "Container" }, { key: "status", label: "Status" }, { key: "cpu", label: "CPU", align: "right", mono: true }, { key: "memory", label: "Memory", align: "right", mono: true }, { key: "network", label: "Network", align: "right", mono: true },
    ], rows: containers.map((container) => ({ name: container.name, status: container.status ?? "Unknown", cpu: `${(container.cpu ?? 0).toFixed(2)}%`, memory: formatMegabytes(container.memory ?? 0), network: formatMegabytes(container.net ?? 0), image: container.image ?? "" })) }],
    items: systems.map((item) => ({ id: item.id, name: item.name, status: item.status })) };
  },
  async getAvailableActions() { return []; },
  async executeAction() { throw new Error("Beszel actions are not enabled"); },
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${Math.round(value)} B`;
}

function formatMegabytes(value: number) {
  return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value.toFixed(value >= 100 ? 0 : 1)} MB`;
}
