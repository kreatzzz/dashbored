import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CircleAlert, Clock3, Settings2, WifiOff } from "lucide-react";
import { getAdapter, type SummaryResult } from "@/lib/adapters";
import { prisma } from "@/lib/prisma";
import { getRuntimeTelemetry } from "@/lib/runtime-telemetry";
import { getServiceContext } from "@/lib/services";
import { formatRelative } from "@/lib/utils";
import { AppIcon } from "@/components/app-icons";
import { PageHeader } from "@/components/page-header";
import { ServiceActions } from "@/components/service-actions";
import { ServiceDashboard } from "@/components/service-dashboard";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const service = await prisma.serviceInstance.findUnique({
    where: { slug: (await params).slug },
    include: { category: true, healthSnapshots: { take: 24, orderBy: { checkedAt: "desc" } } },
  });
  if (!service) notFound();

  const adapter = getAdapter(service.adapterType);
  const credentialConfigured = Boolean(service.credentialId);
  const shouldLoadNativeData = Boolean(service.baseUrl) && service.lastStatus !== "offline" && service.adapterType !== "generic" && (!requiresCredential(service.adapterType) || credentialConfigured);
  let summary: SummaryResult | null = null;
  let error = "";
  let version: string | undefined;
  let actions = [] as Awaited<ReturnType<typeof adapter.getAvailableActions>>;

  const runtimePromise = getRuntimeTelemetry(service.slug);
  if (shouldLoadNativeData) {
    try {
      const context = await getServiceContext(service);
      const health = await adapter.getHealth(context);
      version = health.version;
      [summary, actions] = await Promise.all([adapter.getSummary(context), adapter.getAvailableActions(context)]);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Could not load service data";
    }
  }
  const runtime = await runtimePromise;
  const offline = service.lastStatus === "offline";
  const lastMessage = service.healthSnapshots[0]?.message;

  return <main>
    <PageHeader eyebrow={`${service.category.name} / ${service.adapterType}`} title={service.name} description={service.description ?? "Private service endpoint"} actions={<div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link href="/dashboard/settings"><Settings2 size={13} />Configure</Link></Button><Button asChild size="sm"><a href={service.launchUrl} target="_blank" rel="noreferrer">Open app<ArrowUpRight size={13} /></a></Button></div>} />
    <div className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
      <StatusBand service={service} version={version} message={lastMessage} />

      {offline ? <OfflineState name={service.name} message={lastMessage} launchUrl={service.launchUrl} />
        : error ? <UnavailableState message={error} />
          : <ServiceDashboard slug={service.slug} summary={summary} runtime={runtime} serviceId={service.id} adapterType={service.adapterType} actions={actions} credentialConfigured={credentialConfigured} />}

      {actions.length > 0 && service.adapterType !== "portainer" && <section className="flex flex-col justify-between gap-4 rounded-lg bg-card p-5 shadow-[var(--surface-shadow)] sm:flex-row sm:items-center"><div><h2 className="text-sm font-medium">Operational actions</h2><p className="mt-1 max-w-[65ch] text-pretty text-[13px] leading-5 text-muted-foreground">Every mutation requires confirmation and is written to the audit log.</p></div><ServiceActions serviceId={service.id} actions={actions} /></section>}

      <RecentChecks snapshots={service.healthSnapshots} />
    </div>
  </main>;
}

function StatusBand({ service, version, message }: { service: { icon: string; lastStatus: string; lastCheckedAt: Date | null; lastLatencyMs: number | null; baseUrl: string | null }; version?: string; message?: string | null }) {
  const credentialIssue = /credential|auth|401|403/i.test(message ?? "");
  const label = credentialIssue ? "Needs credentials" : service.lastStatus;
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
    <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-md border border-border"><AppIcon name={service.icon} size={16} /></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-medium">Service status</h2><StatusDot status={service.lastStatus} pulse={service.lastStatus === "healthy"} /></div><p className="mt-0.5 text-xs text-muted-foreground">Checked {formatRelative(service.lastCheckedAt)}</p></div></div><span className="text-xs capitalize text-muted-foreground">{label}</span></div>
    <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0"><StatusFact label="State" value={label} /><StatusFact label="Latency" value={service.lastLatencyMs !== null ? `${service.lastLatencyMs} ms` : "—"} mono /><StatusFact label="Version" value={version ?? "—"} mono /><StatusFact label="Endpoint" value={service.baseUrl ?? "Launcher only"} mono compact /></div>
  </section>;
}

function StatusFact({ label, value, mono, compact }: { label: string; value: string; mono?: boolean; compact?: boolean }) { return <div className="min-w-0 p-4 md:px-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 truncate ${mono ? "mono" : "capitalize"} ${compact ? "text-xs" : "text-[13px] font-medium"}`} title={value}>{value}</p></div>; }

function OfflineState({ name, message, launchUrl }: { name: string; message?: string | null; launchUrl: string }) {
  return <section className="flex min-h-[260px] flex-col items-center justify-center rounded-lg bg-card px-6 py-10 text-center shadow-[var(--surface-shadow)]"><div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground shadow-[var(--surface-shadow)]"><WifiOff size={18} /></div><h2 className="mt-4 text-balance text-sm font-medium">Can&apos;t reach {name}</h2><p className="mt-2 max-w-[55ch] text-pretty text-[13px] leading-5 text-muted-foreground">{friendlyError(message)}</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button asChild size="sm"><Link href="/dashboard/settings"><Settings2 size={13} />Check configuration</Link></Button><Button asChild variant="outline" size="sm"><a href={launchUrl} target="_blank" rel="noreferrer">Try opening app<ArrowUpRight size={13} /></a></Button></div></section>;
}

function UnavailableState({ message }: { message: string }) {
  return <section className="flex min-h-[220px] items-center justify-center gap-4 rounded-lg bg-card p-6 shadow-[var(--surface-shadow)]"><div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-[var(--warn)] shadow-[var(--surface-shadow)]"><CircleAlert size={18} /></div><div><p className="text-sm font-medium">Live data unavailable</p><p className="mt-1 max-w-[65ch] text-pretty text-[13px] leading-5 text-muted-foreground">{friendlyError(message)}</p></div></section>;
}

function RecentChecks({ snapshots }: { snapshots: Array<{ id: bigint; status: string; message: string | null; checkedAt: Date }> }) {
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]"><div className="flex items-center gap-2 border-b border-border px-5 py-3.5"><Clock3 size={13} className="text-muted-foreground" /><h2 className="text-[13px] font-medium">Operational history</h2></div>{snapshots.length ? <div className="divide-y divide-border">{snapshots.slice(0, 8).map((snapshot) => <div key={snapshot.id.toString()} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-xs"><StatusDot status={snapshot.status} /><span className="truncate text-muted-foreground" title={snapshot.message ?? snapshot.status}>{snapshot.message ?? snapshot.status}</span><span className="mono text-muted-foreground">{formatRelative(snapshot.checkedAt)}</span></div>)}</div> : <p className="px-5 py-5 text-[13px] text-muted-foreground">No checks recorded yet.</p>}</section>;
}

function requiresCredential(adapterType: string) { return ["adguard", "uptime-kuma", "portainer", "beszel", "radarr", "sonarr", "prowlarr", "qbittorrent", "jellyfin", "immich", "seerr"].includes(adapterType); }

function friendlyError(message?: string | null) {
  if (!message) return "The service has not responded to the latest health check. Verify its address and network path.";
  if (/abort|timeout|timed out/i.test(message)) return "The connection timed out. The server may be offline, the port may be closed, or Dashbored may not be on the same private network.";
  if (/credential|unauthor|forbidden|401|403/i.test(message)) return "The service is reachable but private data requires a valid encrypted credential in Settings.";
  return message;
}
