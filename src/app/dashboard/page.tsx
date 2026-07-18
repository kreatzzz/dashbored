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
import { getAdapter, type SummaryResult } from "@/lib/adapters";
import { getServiceContext } from "@/lib/services";
import { PortainerOnboarding } from "@/components/portainer-onboarding";

export default async function OverviewPage() {
  // The server component needs a database-relative lookback window; it does not run in a client render loop.
  // eslint-disable-next-line react-hooks/purity
  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const [services, snapshots, actions] = await Promise.all([
    prisma.serviceInstance.findMany({ where: { enabled: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { category: true } }),
    prisma.healthSnapshot.findMany({ where: { checkedAt: { gte: windowStart } }, orderBy: { checkedAt: "desc" }, take: 12000, select: { checkedAt: true, status: true } }),
    prisma.actionAudit.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { service: { select: { name: true } } } }),
  ]);
  const hasPortainer = services.some((service) => service.adapterType === "portainer");
  if (!hasPortainer) {
    return <main>
      <PageHeader eyebrow="Home / Overview" title="Overview" description="Connect your container inventory, then keep the rest of your home server one click away." actions={<Button asChild variant="outline" size="sm"><Link href="/dashboard/settings">Service catalog</Link></Button>} />
      <div className="mx-auto max-w-[1160px] space-y-6 p-5 md:p-8">
        <PortainerOnboarding />
        <p className="text-center text-xs text-muted-foreground">Need only a launch link? You can add a Generic Launcher entry later from <Link href="/dashboard/settings" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Settings</Link>.</p>
      </div>
    </main>;
  }
  const healthy = services.filter((service) => service.lastStatus === "healthy").length;
  const degraded = services.filter((service) => service.lastStatus === "degraded").length;
  const offline = services.filter((service) => service.lastStatus === "offline").length;
  const attention = degraded + offline;
  const uptimeRate = snapshots.length ? snapshots.filter((snapshot) => snapshot.status === "healthy").length / snapshots.length * 100 : 0;
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
  const statusLabel = attention ? `${attention} service${attention === 1 ? "" : "s"} need attention` : "All systems operational";
  const slowest = services.filter((service) => service.lastLatencyMs !== null).sort((a, b) => (b.lastLatencyMs ?? 0) - (a.lastLatencyMs ?? 0)).slice(0, 6);
  const maxLatency = Math.max(1, ...slowest.map((service) => service.lastLatencyMs ?? 0));
  let infrastructureMetrics: SummaryResult["metrics"] = [];
  const beszel = services.find((service) => service.adapterType === "beszel");
  if (beszel?.baseUrl && beszel.credentialId && beszel.lastStatus !== "offline") {
    try {
      infrastructureMetrics = (await getAdapter("beszel").getSummary(await getServiceContext(beszel))).metrics.slice(0, 4);
    } catch {
      // The overview remains useful when live host telemetry is temporarily unavailable.
    }
  }

  return <main>
    <PageHeader eyebrow="Home / Overview" title="Overview" description="Live health, host utilization, and service response times." actions={<Button asChild size="sm"><Link href="/dashboard/settings"><Plus size={14} />Add service</Link></Button>} />
    <div className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
      <section className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3"><div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${attention ? "bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] text-[var(--warn)]" : "bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-[var(--good)]"}`}>{attention ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}</div><div className="min-w-0 sm:flex sm:items-baseline sm:gap-2"><p className="truncate text-[13px] font-medium">{statusLabel}</p><p className="truncate text-xs text-muted-foreground">Updated {formatRelative(services[0]?.lastCheckedAt ?? null)}</p></div></div>
        <Link href="/dashboard/settings" className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">Review connections<ArrowRight size={12} /></Link>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,.95fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-medium">Operations trend</h2><p className="mt-0.5 text-xs text-muted-foreground">Healthy and unavailable checks across the fleet</p></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ds-blue-700)]" />Live</span></div>
          <div className="px-4 pt-3">{chartData.length ? <SignalChart data={chartData} /> : <MinimalCross title="Waiting for health data" description="The worker will populate this view automatically." />}</div>
          <div className="grid border-t border-border grid-cols-2 md:grid-cols-4 md:divide-x md:divide-border"><InsightFact label="Availability" value={`${uptimeRate.toFixed(1)}%`} detail="Recorded checks" tone="green" /><InsightFact label="Operational" value={String(healthy)} detail={`${services.length} tracked`} tone="blue" /><InsightFact label="Attention" value={String(attention)} detail={`${degraded} degraded · ${offline} offline`} tone={attention ? "amber" : "green"} /><InsightFact label="Median latency" value={medianLatency === null ? "—" : `${medianLatency} ms`} detail="Reachable services" tone="violet" /></div>
        </Card>
        <Card className="grid overflow-hidden divide-y divide-border">
          {infrastructureMetrics.length ? infrastructureMetrics.map((metric) => <ResourceMeter key={metric.label} metric={metric} />) : <MinimalCross title="Host telemetry unavailable" description="Beszel metrics will appear after the next successful connection." compact />}
        </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.55fr)]">
          <Card className="flex flex-col overflow-hidden"><PanelHeading icon={Activity} title="Response times" description="Slowest responding services from the latest check" />{slowest.length ? <div className="grid flex-1 divide-y divide-border" style={{ gridTemplateRows: `repeat(${slowest.length}, minmax(0, 1fr))` }}>{slowest.map((service) => <div key={service.id} className="grid min-h-[54px] grid-cols-[minmax(110px,.55fr)_minmax(160px,1fr)_auto] items-center gap-4 px-5 py-2.5"><div className="flex min-w-0 items-center gap-2"><StatusDot status={service.lastStatus} /><span className="truncate text-[13px] font-medium">{service.name}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${latencyColor(service.lastLatencyMs ?? 0)}`} style={{ width: `${Math.max(3, (service.lastLatencyMs ?? 0) / maxLatency * 100)}%` }} /></div><span className="mono w-16 text-right text-xs text-muted-foreground">{service.lastLatencyMs} ms</span></div>)}</div> : <MinimalCross title="No latency samples" description="Reachable services will appear after the next check." compact />}</Card>
          <div className="grid gap-6">
            <Card className="overflow-hidden"><PanelHeading icon={ServerCog} title="Fleet status" description="Current service distribution" /><div className="p-5"><StackedStatus healthy={healthy} degraded={degraded} offline={offline} total={services.length} /><div className="mt-4 grid grid-cols-3 gap-3"><StatusCount label="Healthy" value={healthy} color="var(--good)" /><StatusCount label="Degraded" value={degraded} color="var(--warn)" /><StatusCount label="Offline" value={offline} color="var(--bad)" /></div></div></Card>
            <Card className="overflow-hidden"><PanelHeading icon={Activity} title="Recent activity" description="Latest confirmed actions" /><div>{actions.length ? actions.slice(0, 2).map((action) => <div key={action.id} className="flex items-start gap-3 border-b border-border px-5 py-3 last:border-0"><div className="mt-1"><StatusDot status={action.status === "success" ? "healthy" : "degraded"} /></div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium capitalize">{action.action.replaceAll("-", " ")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{action.service?.name ?? "System"} · {formatRelative(action.createdAt)}</p></div></div>) : <MinimalCross title="No actions yet" description="Confirmed changes will appear here." compact />}</div></Card>
          </div>
        </div>
      </section>

      <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-medium tracking-[-.01em]">Services</h2><p className="mt-1 text-[13px] text-muted-foreground">Applications connected to this dashboard</p></div><span className="text-xs text-muted-foreground">{services.length} total</span></div>
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 xl:grid-cols-3">{services.map((service) => <Link href={`/dashboard/services/${service.slug}`} key={service.id} className="group bg-background p-5 transition-colors duration-150 hover:bg-hover"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background"><AppIcon name={service.icon} size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium">{service.name}</h3><StatusDot status={service.lastStatus} /></div><p className="mt-1 truncate text-[13px] text-muted-foreground">{service.description ?? service.category.name}</p></div><ArrowRight size={14} className="mt-1 text-muted-foreground transition-colors group-hover:text-foreground" /></div><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="capitalize">{service.lastStatus}</span><span className="mono">{service.lastLatencyMs !== null ? `${service.lastLatencyMs} ms` : formatRelative(service.lastCheckedAt)}</span></div></Link>)}</div>
      </section>
    </div>
  </main>;
}

type Tone = "blue" | "green" | "amber" | "violet";
const toneColor: Record<Tone, string> = { blue: "var(--ds-blue-700)", green: "var(--ds-green-700)", amber: "var(--ds-amber-700)", violet: "var(--ds-violet-700)" };

function InsightFact({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) { return <div className="border-b border-border p-4 last:border-b-0 md:border-b-0"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[tone] }} /></div><p className="mt-2 text-lg font-semibold tracking-[-.03em] tabular-nums">{value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p></div>; }

function PanelHeading({ icon: Icon, title, description, href }: { icon: typeof Activity; title: string; description: string; href?: string }) { return <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground"><Icon size={13} /></div><div><h2 className="text-[13px] font-medium">{title}</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p></div></div>{href ? <Link href={href} aria-label={`Open ${title}`} className="text-muted-foreground hover:text-foreground"><ArrowRight size={13} /></Link> : null}</div>; }

function StackedStatus({ healthy, degraded, offline, total }: { healthy: number; degraded: number; offline: number; total: number }) { const denominator = Math.max(1, total); return <div><div className="flex h-2 overflow-hidden rounded-full bg-muted"><span style={{ width: `${healthy / denominator * 100}%`, background: "var(--good)" }} /><span style={{ width: `${degraded / denominator * 100}%`, background: "var(--warn)" }} /><span style={{ width: `${offline / denominator * 100}%`, background: "var(--bad)" }} /></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{healthy}/{total} operational</span><span>{Math.round(healthy / denominator * 100)}%</span></div></div>; }
function StatusCount({ label, value, color }: { label: string; value: number; color: string }) { return <div><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{label}</div><p className="mt-1.5 text-lg font-semibold tabular-nums">{value}</p></div>; }
function latencyColor(value: number) { return value >= 1000 ? "bg-[var(--bad)]" : value >= 350 ? "bg-[var(--warn)]" : "bg-[var(--ds-blue-700)]"; }

const meterColor = { blue: "var(--ds-blue-700)", green: "var(--good)", amber: "var(--warn)", red: "var(--bad)", gray: "var(--ds-violet-700)" } as const;
function ResourceMeter({ metric }: { metric: SummaryResult["metrics"][number] }) {
  const rawValue = Number.parseFloat(metric.value.replaceAll(",", ""));
  const percent = metric.label === "Containers" ? rawValue / 20 * 100 : rawValue;
  return <div className="flex min-h-[104px] flex-col justify-center px-5 py-4"><div className="flex items-baseline justify-between gap-4"><p className="text-[13px] text-muted-foreground">{metric.label}</p><p className="text-sm font-medium tabular-nums">{metric.value}</p></div><SegmentBar percent={Number.isFinite(percent) ? percent : 0} color={meterColor[metric.color ?? "gray"]} /><p className="mt-2 truncate text-[11px] text-muted-foreground">{metric.detail ?? "Live from Beszel"}</p></div>;
}
function SegmentBar({ percent, color }: { percent: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.ceil(percent / 5)));
  return <div className="mt-3 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1" aria-label={`${Math.round(percent)} percent`} role="img">{Array.from({ length: 20 }, (_, index) => <span key={index} className="h-2 rounded-[2px]" style={{ background: index < filled ? color : "var(--muted)" }} />)}</div>;
}

function MinimalCross({ title, description, compact }: { title: string; description: string; compact?: boolean }) { return <div className={`grid place-items-center px-6 text-center ${compact ? "min-h-40" : "min-h-[220px]"}`}><div><div className="relative mx-auto h-10 w-10 text-border before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 before:bg-current after:absolute after:left-0 after:top-1/2 after:h-px after:w-full after:-translate-y-1/2 after:bg-current"><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-strong-border bg-background" /></div><p className="mt-3 text-[13px] font-medium">{title}</p><p className="mt-1 max-w-[240px] text-[11px] leading-5 text-muted-foreground">{description}</p></div></div>; }
