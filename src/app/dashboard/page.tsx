import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Plus, ServerCog } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SignalChart } from "@/components/signal-chart";
import { AppIcon } from "@/components/app-icons";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PortainerOnboarding } from "@/components/portainer-onboarding";
import { isConnectionSetupPending } from "@/lib/supported-containers";

export default async function OverviewPage() {
  // The server component needs a database-relative lookback window; it does not run in a client render loop.
  // eslint-disable-next-line react-hooks/purity
  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const [services, snapshots, actions] = await Promise.all([
    prisma.serviceInstance.findMany({ where: { enabled: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { category: true } }),
    prisma.healthSnapshot.findMany({ where: { checkedAt: { gte: windowStart } }, orderBy: { checkedAt: "desc" }, take: 12000, select: { checkedAt: true, status: true } }),
    prisma.actionAudit.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { service: { select: { name: true } } } }),
  ]);
  const hasConnectedPortainer = services.some((service) => service.adapterType === "portainer" && Boolean(service.credentialId) && Boolean(service.baseUrl));
  if (!hasConnectedPortainer) {
    return <main>
      <PageHeader eyebrow="Home / Overview" title="Overview" description="Connect your container inventory, then keep the rest of your home server one click away." actions={<Button asChild variant="outline" size="sm"><Link href="/dashboard/settings">Service catalog</Link></Button>} />
      <div className="mx-auto max-w-[1160px] space-y-6 p-5 md:p-8">
        <PortainerOnboarding />
        <p className="text-center text-xs text-muted-foreground">Need only a launch link? You can add a Generic Launcher entry later from <Link href="/dashboard/settings" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Settings</Link>.</p>
      </div>
    </main>;
  }
  const setupServices = services.filter((service) => isConnectionSetupPending(service.configuration));
  const monitoredServices = services.filter((service) => !isConnectionSetupPending(service.configuration));
  const healthy = monitoredServices.filter((service) => service.lastStatus === "healthy").length;
  const degraded = monitoredServices.filter((service) => service.lastStatus === "degraded").length;
  const offline = monitoredServices.filter((service) => service.lastStatus === "offline").length;
  const pending = monitoredServices.filter((service) => !service.lastCheckedAt || service.lastStatus === "unknown").length;
  const attention = degraded + offline;
  const uptimeRate = snapshots.length ? snapshots.filter((snapshot) => snapshot.status === "healthy").length / snapshots.length * 100 : null;
  const latencies = services.map((service) => service.lastLatencyMs).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const medianLatency = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null;
  const buckets = new Map<string, { time: string; healthy: number; degraded: number }>();
  for (const snapshot of snapshots.toReversed()) {
    const bucket = new Date(snapshot.checkedAt);
    bucket.setMinutes(Math.floor(bucket.getMinutes() / 15) * 15, 0, 0);
    const key = bucket.toISOString();
    const time = bucket.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const item = buckets.get(key) ?? { time, healthy: 0, degraded: 0 };
    if (snapshot.status === "healthy") item.healthy++; else item.degraded++;
    buckets.set(key, item);
  }
  const chartData = [...buckets.values()].slice(-48);
  const statusLabel = setupServices.length
    ? `${setupServices.length} native connection${setupServices.length === 1 ? " is" : "s are"} ready to finish`
    : attention
    ? `${attention} service${attention === 1 ? "" : "s"} need attention`
    : pending === monitoredServices.length ? "Waiting for first health check"
      : pending ? `${pending} service${pending === 1 ? " is" : "s are"} still being checked`
        : "All systems operational";
  const slowest = monitoredServices.filter((service) => service.lastLatencyMs !== null).sort((a, b) => (b.lastLatencyMs ?? 0) - (a.lastLatencyMs ?? 0)).slice(0, 6);
  const maxLatency = Math.max(1, ...slowest.map((service) => service.lastLatencyMs ?? 0));
  return <main>
    <PageHeader eyebrow="Home / Overview" title="Overview" description="Service health, container state, and response times." actions={<Button asChild size="sm"><Link href="/dashboard/settings"><Plus size={14} />Add service</Link></Button>} />
    <div className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
      <section className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3"><div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${attention ? "bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] text-[var(--warn)]" : "bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-[var(--good)]"}`}>{attention ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}</div><div className="min-w-0 sm:flex sm:items-baseline sm:gap-2"><p className="truncate text-[13px] font-medium">{statusLabel}</p><p className="truncate text-xs text-muted-foreground">Updated {formatRelative(services[0]?.lastCheckedAt ?? null)}</p></div></div>
        <Link href="/dashboard/settings" className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">Review connections<ArrowRight size={12} /></Link>
      </section>

      <section className="space-y-6">
        <div>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-medium">Operations trend</h2><p className="mt-0.5 text-xs text-muted-foreground">Healthy and unavailable checks across the fleet</p></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ds-blue-700)]" />Live</span></div>
          <div className="px-4 pt-3">{chartData.length ? <SignalChart data={chartData} /> : <MinimalCross title="Waiting for health data" description="The worker will populate this view automatically." />}</div>
          <div className="grid border-t border-border grid-cols-2 md:grid-cols-4 md:divide-x md:divide-border"><InsightFact label="Availability" value={uptimeRate === null ? "—" : `${uptimeRate.toFixed(1)}%`} detail={uptimeRate === null ? "Waiting for checks" : "Recorded checks"} tone="green" /><InsightFact label="Operational" value={pending === monitoredServices.length ? "—" : String(healthy)} detail={pending === monitoredServices.length ? `${monitoredServices.length} queued` : `${monitoredServices.length} monitored`} tone="blue" /><InsightFact label="Setup ready" value={String(setupServices.length)} detail={setupServices.length ? "Finish native connections" : "No setup pending"} tone={setupServices.length ? "amber" : "green"} /><InsightFact label="Median latency" value={medianLatency === null ? "—" : `${medianLatency} ms`} detail={medianLatency === null ? "Waiting for response" : "Reachable services"} tone="violet" /></div>
        </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.55fr)]">
          <Card className="flex flex-col overflow-hidden"><PanelHeading icon={Activity} title="Response times" description="Slowest responding services from the latest check" />{slowest.length ? <div className="grid flex-1 divide-y divide-border" style={{ gridTemplateRows: `repeat(${slowest.length}, minmax(0, 1fr))` }}>{slowest.map((service) => <div key={service.id} className="grid min-h-[54px] grid-cols-[minmax(110px,.55fr)_minmax(160px,1fr)_auto] items-center gap-4 px-5 py-2.5"><div className="flex min-w-0 items-center gap-2"><StatusDot status={service.lastStatus} /><span className="truncate text-[13px] font-medium">{service.name}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${latencyColor(service.lastLatencyMs ?? 0)}`} style={{ width: `${Math.max(3, (service.lastLatencyMs ?? 0) / maxLatency * 100)}%` }} /></div><span className="mono w-16 text-right text-xs text-muted-foreground">{service.lastLatencyMs} ms</span></div>)}</div> : <MinimalCross title="No latency samples" description="Reachable services will appear after the next check." compact />}</Card>
          <div className="grid gap-6">
            <Card className="overflow-hidden"><PanelHeading icon={ServerCog} title="Fleet status" description="Current service distribution" /><div className="p-5"><StackedStatus healthy={healthy} degraded={degraded} offline={offline} pending={pending} total={monitoredServices.length} /><div className="mt-4 grid grid-cols-4 gap-3"><StatusCount label="Healthy" value={healthy} color="var(--good)" /><StatusCount label="Pending" value={pending} color="var(--ds-gray-500)" /><StatusCount label="Degraded" value={degraded} color="var(--warn)" /><StatusCount label="Offline" value={offline} color="var(--bad)" /></div></div></Card>
            <Card className="overflow-hidden"><PanelHeading icon={Activity} title="Recent activity" description="Latest confirmed actions" /><div>{actions.length ? actions.slice(0, 2).map((action) => <div key={action.id} className="flex items-start gap-3 border-b border-border px-5 py-3 last:border-0"><div className="mt-1"><StatusDot status={action.status === "success" ? "healthy" : "degraded"} /></div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium capitalize">{action.action.replaceAll("-", " ")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{action.service?.name ?? "System"} · {formatRelative(action.createdAt)}</p></div></div>) : <MinimalCross title="No actions yet" description="Confirmed changes will appear here." compact />}</div></Card>
          </div>
        </div>
      </section>

      <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-medium tracking-[-.01em]">Services</h2><p className="mt-1 text-[13px] text-muted-foreground">Applications connected to this dashboard</p></div><span className="text-xs text-muted-foreground">{services.length} total</span></div>
        <div className={`grid gap-px overflow-hidden rounded-md border border-border bg-background ${services.length === 1 ? "grid-cols-1" : services.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>{services.map((service) => {
          const setupPending = isConnectionSetupPending(service.configuration);
          return <Link href={`/dashboard/services/${service.slug}`} key={service.id} className="group bg-card p-5 transition-[background-color,box-shadow] duration-150 hover:bg-hover hover:shadow-[var(--surface-shadow)]"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background"><AppIcon name={service.icon} size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium">{service.name}</h3>{setupPending ? <span className="mono rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[.08em] text-muted-foreground">Setup</span> : <StatusDot status={service.lastStatus} />}</div><p className="mt-1 truncate text-[13px] text-muted-foreground">{setupPending ? "Finish connection to activate the native dashboard" : service.description ?? service.category.name}</p></div><ArrowRight size={14} className="mt-1 text-muted-foreground transition-colors group-hover:text-foreground" /></div><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="capitalize">{setupPending ? "Setup required" : service.lastStatus}</span><span className="mono">{setupPending ? "Portainer" : service.lastLatencyMs !== null ? `${service.lastLatencyMs} ms` : formatRelative(service.lastCheckedAt)}</span></div></Link>;
        })}</div>
      </section>
    </div>
  </main>;
}

type Tone = "blue" | "green" | "amber" | "violet";
const toneColor: Record<Tone, string> = { blue: "var(--ds-blue-700)", green: "var(--ds-green-700)", amber: "var(--ds-amber-700)", violet: "var(--ds-violet-700)" };

function InsightFact({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) { return <div className="border-b border-border p-4 last:border-b-0 md:border-b-0"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[tone] }} /></div><p className="mt-2 text-lg font-semibold tracking-[-.03em] tabular-nums">{value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p></div>; }

function PanelHeading({ icon: Icon, title, description, href }: { icon: typeof Activity; title: string; description: string; href?: string }) { return <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground"><Icon size={13} /></div><div><h2 className="text-[13px] font-medium">{title}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p></div></div>{href ? <Link href={href} aria-label={`Open ${title}`} className="text-muted-foreground hover:text-foreground"><ArrowRight size={13} /></Link> : null}</div>; }

function StackedStatus({ healthy, degraded, offline, pending, total }: { healthy: number; degraded: number; offline: number; pending: number; total: number }) { const denominator = Math.max(1, total); return <div><div className="flex h-2 overflow-hidden rounded-full bg-muted"><span style={{ width: `${healthy / denominator * 100}%`, background: "var(--good)" }} /><span style={{ width: `${pending / denominator * 100}%`, background: "var(--ds-gray-500)" }} /><span style={{ width: `${degraded / denominator * 100}%`, background: "var(--warn)" }} /><span style={{ width: `${offline / denominator * 100}%`, background: "var(--bad)" }} /></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{pending === total ? "Waiting for the first sweep" : `${healthy}/${total} operational`}</span><span>{pending === total ? "Pending" : `${Math.round(healthy / denominator * 100)}%`}</span></div></div>; }
function StatusCount({ label, value, color }: { label: string; value: number; color: string }) { return <div><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{label}</div><p className="mt-1.5 text-lg font-semibold tabular-nums">{value}</p></div>; }
function latencyColor(value: number) { return value >= 1000 ? "bg-[var(--bad)]" : value >= 350 ? "bg-[var(--warn)]" : "bg-[var(--ds-blue-700)]"; }

function MinimalCross({ title, description, compact }: { title: string; description: string; compact?: boolean }) { return <div className={`grid place-items-center px-6 text-center ${compact ? "min-h-40" : "min-h-[220px]"}`}><div><div className="relative mx-auto h-10 w-10 text-border before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 before:bg-current after:absolute after:left-0 after:top-1/2 after:h-px after:w-full after:-translate-y-1/2 after:bg-current"><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-strong-border bg-background" /></div><p className="mt-3 text-[13px] font-medium">{title}</p><p className="mt-1 max-w-[240px] text-[11px] leading-5 text-muted-foreground">{description}</p></div></div>; }
