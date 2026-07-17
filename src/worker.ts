import type { ServiceInstance } from "@/generated/prisma/client";
import { getAdapter } from "./lib/adapters";
import { syncPortainerLaunchers } from "./lib/launchers";
import { backoffDelayMs, boundedNumber, mapWithConcurrency } from "./lib/polling";
import { prisma } from "./lib/prisma";
import { getServiceContext } from "./lib/services";

const interval = Math.max(15_000, Number(process.env.POLL_INTERVAL_MS ?? 60_000));
const maxConcurrent = boundedNumber(Number(process.env.POLL_CONCURRENCY ?? 3), 1, 8);
const discoveryInterval = Math.max(60_000, Number(process.env.LAUNCHER_DISCOVERY_INTERVAL_MS ?? 5 * 60_000));
const snapshotHeartbeat = Math.max(interval, Number(process.env.SNAPSHOT_HEARTBEAT_MS ?? 15 * 60_000));
const maxBackoff = Math.max(interval, Number(process.env.POLL_MAX_BACKOFF_MS ?? 15 * 60_000));

type PollReport = { locked: boolean; checked: number; skipped: number; discovered: number; failures: number };

export function nextBackoffMs(failures: number, baseMs = interval, random = Math.random) {
  // Keep workers from retrying a shared upstream in lock-step after an outage.
  return backoffDelayMs(failures, baseMs, maxBackoff, random);
}

function shouldWriteSnapshot(service: ServiceInstance, status: string, now: Date) {
  return service.lastStatus !== status || !service.lastCheckedAt || now.getTime() - service.lastCheckedAt.getTime() >= snapshotHeartbeat;
}

async function pollService(service: ServiceInstance, now: Date): Promise<{ failure: boolean; discovered: boolean }> {
  let result;
  try {
    result = await getAdapter(service.adapterType).getHealth(await getServiceContext(service));
  } catch (error) {
    result = { status: "offline" as const, message: error instanceof Error ? error.message : "Health check failed" };
  }

  const failure = result.status !== "healthy";
  const pollFailureCount = failure ? service.pollFailureCount + 1 : 0;
  const nextPollAt = failure ? new Date(now.getTime() + nextBackoffMs(pollFailureCount)) : null;
  await prisma.$transaction(async (tx) => {
    await tx.serviceInstance.update({
      where: { id: service.id },
      data: { lastStatus: result.status, lastCheckedAt: now, lastLatencyMs: result.latencyMs ?? null, pollFailureCount, nextPollAt },
    });
    if (shouldWriteSnapshot(service, result.status, now)) {
      await tx.healthSnapshot.create({ data: { serviceId: service.id, status: result.status, latencyMs: result.latencyMs, message: result.message, metrics: result.metrics ?? {} } });
    }
  });

  const dueForDiscovery = service.adapterType === "portainer" && result.status === "healthy" && (!service.lastLauncherDiscoveryAt || now.getTime() - service.lastLauncherDiscoveryAt.getTime() >= discoveryInterval);
  if (!dueForDiscovery) return { failure, discovered: false };
  try {
    await syncPortainerLaunchers(service);
    return { failure, discovered: true };
  } catch (error) {
    console.warn(JSON.stringify({ level: "warn", event: "worker.launcher_discovery_failed", serviceId: service.id, message: error instanceof Error ? error.message : "Unknown error" }));
    return { failure, discovered: false };
  }
}

let lastPruneAt = 0;

export async function pruneOldRecords(now = new Date()) {
  if (now.getTime() - lastPruneAt < 24 * 60 * 60 * 1000) return;
  await prisma.$transaction([
    prisma.healthSnapshot.deleteMany({ where: { checkedAt: { lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) } } }),
    // Do not delete a stale entry with an explicit user customization.
    prisma.launcherEntry.deleteMany({ where: { lastSeenAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, nameOverride: null, launchUrlOverride: null } }),
  ]);
  lastPruneAt = now.getTime();
}

export async function pollOnce(now = new Date()): Promise<PollReport> {
  const lock = await prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(728041) AS locked`;
  if (!lock[0]?.locked) return { locked: false, checked: 0, skipped: 0, discovered: 0, failures: 0 };
  try {
    const allEnabled = await prisma.serviceInstance.count({ where: { enabled: true, baseUrl: { not: null } } });
    const services = await prisma.serviceInstance.findMany({
      where: { enabled: true, baseUrl: { not: null }, OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] },
    });
    const results = await mapWithConcurrency(services, maxConcurrent, (service) => pollService(service, now));
    await pruneOldRecords(now);
    return {
      locked: true,
      checked: services.length,
      skipped: Math.max(0, allEnabled - services.length),
      discovered: results.filter((result) => result.discovered).length,
      failures: results.filter((result) => result.failure).length,
    };
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(728041)`;
  }
}

async function main() {
  console.info(JSON.stringify({ level: "info", event: "worker.started", interval, maxConcurrent, discoveryInterval, snapshotHeartbeat }));
  let lastHeartbeat = 0;
  for (;;) {
    const started = Date.now();
    try {
      const report = await pollOnce(new Date(started));
      if (started - lastHeartbeat >= 60_000) {
        console.info(JSON.stringify({ level: "info", event: "worker.heartbeat", ...report }));
        lastHeartbeat = started;
      }
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "worker.poll_failed", message: error instanceof Error ? error.message : "Unknown error" }));
    }
    const remaining = Math.max(1_000, interval - (Date.now() - started));
    const jitter = Math.round(remaining * (Math.random() * 0.1));
    await Bun.sleep(remaining + jitter);
  }
}

if (import.meta.main) main().catch((error) => { console.error(error); process.exit(1); });
