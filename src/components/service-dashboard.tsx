import Link from "next/link";
import { ArrowRight, CheckCircle2, Film, Images, KeyRound, ServerCog, Waves } from "lucide-react";
import { ServiceMetricChart } from "@/components/service-metric-chart";
import { MetricStrip } from "@/components/metric-strip";
import { ServiceActions } from "@/components/service-actions";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { AppIcon } from "@/components/app-icons";
import type { getAdapter, SummaryResult } from "@/lib/adapters";
import type { RuntimeTelemetry } from "@/lib/runtime-telemetry";

type Actions = Awaited<ReturnType<ReturnType<typeof getAdapter>["getAvailableActions"]>>;

export function ServiceDashboard({ slug, summary, runtime, serviceId, adapterType, actions, credentialConfigured }: {
  slug: string;
  summary: SummaryResult | null;
  runtime: RuntimeTelemetry | null;
  serviceId: string;
  adapterType: string;
  actions: Actions;
  credentialConfigured: boolean;
}) {
  const product = products[slug];
  if (needsCredential(adapterType) && !credentialConfigured) return <IntegrationNeeded product={product} runtime={runtime} />;
  if (adapterType === "generic") return <LauncherDashboard slug={slug} product={product} runtime={runtime} />;
  if (!summary) return null;
  const visibleDetails = (summary.details ?? []).slice(0, 4);
  const visibleCharts = (summary.charts ?? []).slice(0, 1);

  return <div className="space-y-6">
    <MetricStrip metrics={summary.metrics} />

    {(visibleCharts.length || visibleDetails.length) ? <section className={`grid overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)] ${visibleDetails.length && visibleCharts.length ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.45fr)]" : ""}`}>
      {visibleCharts.length > 0 && <div className={`min-w-0 border-b border-border p-5 md:p-6 ${visibleDetails.length ? "lg:border-b-0 lg:border-r" : "border-b-0"}`}>
        {visibleCharts.map((chart) => <div key={chart.title}><SectionHeading title={chart.title} description={chart.description} /><div className="mt-5"><ServiceMetricChart chart={chart} /></div></div>)}
      </div>}
      {visibleDetails.length > 0 && <div className="grid divide-y divide-border" style={{ gridTemplateRows: `repeat(${visibleDetails.length}, minmax(0, 1fr))` }}>
        {visibleDetails.map((detail) => <div key={detail.label} className="flex min-h-0 flex-col justify-center px-5 py-3.5">
          <div className="flex items-baseline justify-between gap-3"><p className="text-[13px] text-muted-foreground">{detail.label}</p><p className="mono text-[13px] font-medium">{detail.value}</p></div>
          {detail.percent !== undefined && <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, detail.percent))}%` }} /></div>}
          {detail.detail && <p className="mt-2 truncate text-xs text-muted-foreground" title={detail.detail}>{detail.detail}</p>}
        </div>)}
      </div>}
    </section> : null}

    <ServiceTables tables={summary.tables ?? []} />
    {!summary.tables?.length && summary.items?.length ? <ItemTable items={summary.items} serviceId={serviceId} adapterType={adapterType} actions={actions} /> : null}
  </div>;
}

function ServiceTables({ tables }: { tables: NonNullable<SummaryResult["tables"]> }) {
  const visible = tables.filter((table) => table.rows.length);
  const compact = visible.filter((table) => table.columns.length <= 2);
  const wide = visible.filter((table) => table.columns.length > 2);
  if (!visible.length) return null;
  return <>
    {compact.length > 0 && <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">{compact.map((table) => <DataTable key={table.title} table={table} compact />)}</div>}
    {wide.map((table) => <DataTable key={table.title} table={table} />)}
  </>;
}

function DataTable({ table, compact }: { table: NonNullable<SummaryResult["tables"]>[number]; compact?: boolean }) {
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><SectionHeading title={table.title} description={table.description} />{table.href ? <Link href={table.href} className="shrink-0 text-xs font-medium text-[var(--ds-blue-700)] hover:underline">{table.actionLabel ?? "View all"}<ArrowRight size={12} className="ml-1 inline" /></Link> : null}</div>
    <div className="max-h-[390px] overflow-auto"><table className={`w-full border-collapse text-[13px] ${compact ? "min-w-[360px]" : "min-w-[620px]"}`}><thead className="sticky top-0 z-10"><tr className="bg-muted text-left text-xs text-muted-foreground">{table.columns.map((column) => <th key={column.key} className={`px-5 py-2.5 font-medium ${column.align === "right" ? "text-right" : ""}`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{table.rows.slice(0, compact ? 8 : 12).map((row, index) => <tr key={`${String(row.id ?? row.name ?? index)}`} className="transition-colors hover:bg-muted/35">{table.columns.map((column) => <td key={column.key} className={`max-w-[360px] truncate px-5 py-3 ${column.align === "right" ? "text-right" : ""} ${column.mono ? "mono text-xs" : ""}`} title={String(row[column.key] ?? "")}>{String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div>
  </section>;
}

function ItemTable({ items, serviceId, adapterType, actions }: { items: NonNullable<SummaryResult["items"]>; serviceId: string; adapterType: string; actions: Actions }) {
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]"><div className="border-b border-border px-5 py-4"><SectionHeading title="Resources" description={`${items.length} items returned by the service`} /></div><div className="divide-y divide-border">{items.map((item, index) => <div key={String(item.id ?? index)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-[13px] font-medium">{String(item.name ?? `Item ${index + 1}`)}</p><p className="mono mt-1 truncate text-[11px] text-muted-foreground">{String(item.image ?? item.status ?? "")}</p></div><div className="flex items-center gap-3"><span className="flex items-center gap-2 text-xs text-muted-foreground"><StatusDot status={String(item.state ?? item.status) === "running" || String(item.status) === "up" ? "healthy" : "unknown"} />{String(item.state ?? item.status ?? "")}</span>{adapterType === "portainer" && <ServiceActions serviceId={serviceId} actions={actions} target={String(item.id)} />}</div></div>)}</div></section>;
}

function IntegrationNeeded({ product, runtime }: { product?: Product; runtime: RuntimeTelemetry | null }) {
  return <div className="space-y-6">
    {runtime && <RuntimeStrip runtime={runtime} />}
    <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]">
        <div className="border-b border-border p-6 lg:border-b-0 lg:border-r md:p-8"><div className="grid h-9 w-9 place-items-center rounded-md bg-muted shadow-[var(--surface-shadow)]"><KeyRound size={16} /></div><h2 className="mt-5 text-balance text-lg font-semibold leading-tight tracking-[-.02em]">Connect {product?.name ?? "this service"} data</h2><p className="mt-2 max-w-[65ch] text-pretty text-[13px] leading-6 text-muted-foreground">The service is reachable, but Dashbored needs {product?.credential ?? "an API credential"} before it can load private operational data. Health monitoring continues without it.</p><Button asChild size="sm" className="mt-5"><Link href="/dashboard/settings">Add encrypted credential<ArrowRight size={13} /></Link></Button></div>
        <div className="divide-y divide-border bg-muted/25">{product?.setup ? product.setup.map((step, index) => <div key={step.title} className="flex gap-3 px-5 py-4"><div className="mono mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] text-muted-foreground">{index + 1}</div><div><p className="text-[13px] font-medium">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p></div></div>) : (product?.features ?? defaultFeatures).map((feature) => <div key={feature.title} className="flex gap-3 px-5 py-4"><div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><ServerCog size={12} /></div><div><p className="text-[13px] font-medium">{feature.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.description}</p></div></div>)}</div>
      </div>
    </section>
  </div>;
}

function LauncherDashboard({ slug, product, runtime }: { slug: string; product?: Product; runtime: RuntimeTelemetry | null }) {
  return <div className="space-y-6">
    {runtime ? <RuntimeStrip runtime={runtime} /> : <section className="rounded-lg bg-card p-6 shadow-[var(--surface-shadow)]"><p className="text-sm font-medium">Application reachable</p><p className="mt-1 max-w-[65ch] text-pretty text-[13px] leading-5 text-muted-foreground">Runtime telemetry is not available from Beszel for this service.</p></section>}
    <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]"><div className="grid lg:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]"><ProductPreview slug={slug} kind={product?.preview} /><div className="p-6 md:p-8"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-muted shadow-[var(--surface-shadow)]"><AppIcon name={previewIcon(product?.preview)} size={16} /></div><div><h2 className="text-balance text-base font-semibold leading-tight tracking-[-.02em]">{product?.insightTitle ?? "Native application data"}</h2><p className="text-xs text-muted-foreground">Launcher mode</p></div></div><p className="mt-5 max-w-[65ch] text-pretty text-[13px] leading-6 text-muted-foreground">{product?.insightDescription ?? "This connection currently monitors reachability and runtime resources. Add a native API adapter to bring application data into the dashboard."}</p><div className="mt-6 divide-y divide-border border-y border-border">{(product?.features ?? defaultFeatures).slice(0, 3).map((feature) => <div key={feature.title} className="grid grid-cols-[minmax(0,1fr)_auto] gap-5 py-3.5"><div><p className="text-[13px] font-medium">{feature.title}</p><p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">{feature.description}</p></div><span className="self-center whitespace-nowrap text-xs text-muted-foreground">Needs API</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 size={14} className="text-[var(--good)]" />Launch and container monitoring are active</div></div></div></section>
  </div>;
}

function ProductPreview({ slug, kind = "service" }: { slug: string; kind?: Product["preview"] }) {
  if (kind === "photos") return <div className="relative min-h-[320px] overflow-hidden border-b border-border bg-muted/25 p-6 lg:border-b-0 lg:border-r"><div className="grid h-full min-h-[270px] grid-cols-3 grid-rows-3 gap-2">{["col-span-2 row-span-2", "", "", "col-span-2"].map((classes, index) => <div key={index} className={`${classes} relative overflow-hidden rounded-md border border-border bg-background`}><div className="absolute inset-0 grid place-items-center text-muted-foreground/60"><Images size={index === 0 ? 30 : 16} strokeWidth={1.25} /></div>{index === 0 && <div className="absolute bottom-3 left-3 mono text-[10px] text-muted-foreground">Library preview</div>}</div>)}</div></div>;
  if (kind === "media") return <div className="relative min-h-[320px] overflow-hidden border-b border-border bg-[#050505] p-6 text-white lg:border-b-0 lg:border-r"><div className="flex h-full min-h-[270px] flex-col justify-between rounded-md border border-white/15 p-5"><div className="flex items-center justify-between"><Film size={18} /><span className="mono text-[10px] text-white/50">JELLYFIN · READY</span></div><div className="grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full border border-white/20"><Film size={22} strokeWidth={1.4} /></div></div><div><div className="h-px bg-white/20"><div className="h-px w-1/3 bg-white" /></div><div className="mt-3 flex justify-between text-[10px] text-white/50"><span>Library online</span><span>00:00</span></div></div></div></div>;
  return <div className="relative grid min-h-[300px] place-items-center overflow-hidden border-b border-border bg-muted/20 lg:border-b-0 lg:border-r"><div className="relative grid h-36 w-36 place-items-center rounded-full border border-border"><div className="absolute h-24 w-24 rounded-full border border-border" /><div className="absolute h-12 w-12 rounded-full border border-strong-border" /><Waves size={18} className="text-muted-foreground" /></div><span className="absolute bottom-5 left-6 mono text-[10px] text-muted-foreground">{slug.toUpperCase()} · REACHABLE</span></div>;
}

function previewIcon(kind?: Product["preview"]) { return kind === "photos" ? "image" : kind === "media" ? "film" : "activity"; }

function RuntimeStrip({ runtime }: { runtime: RuntimeTelemetry }) {
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]"><div className="border-b border-border px-5 py-3.5"><div className="flex items-center justify-between"><p className="text-[13px] font-medium">Live container</p><span className="flex items-center gap-2 text-xs text-muted-foreground"><StatusDot status={/^up/i.test(runtime.status) ? "healthy" : "unknown"} />{runtime.status}</span></div></div><div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0"><RuntimeMetric label="CPU" value={`${runtime.cpu.toFixed(2)}%`} /><RuntimeMetric label="Memory" value={formatMb(runtime.memoryMb)} /><RuntimeMetric label="Network" value={formatMb(runtime.networkMb)} /><RuntimeMetric label="Image" value={runtime.image.split("@")[0]} compact /></div></section>;
}

function RuntimeMetric({ label, value, compact }: { label: string; value: string; compact?: boolean }) { return <div className="min-w-0 p-5"><p className="text-xs text-muted-foreground">{label}</p><p className={`${compact ? "mono truncate text-xs" : "mt-2 text-xl font-semibold tabular-nums"}`} title={value}>{value}</p></div>; }
function SectionHeading({ title, description }: { title: string; description?: string }) { return <div><h2 className="text-balance text-sm font-medium leading-tight">{title}</h2>{description && <p className="mt-1 max-w-[65ch] text-pretty text-[13px] leading-5 text-muted-foreground">{description}</p>}</div>; }
function formatMb(value: number) { return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${value.toFixed(value >= 100 ? 0 : 1)} MB`; }
function needsCredential(adapterType: string) { return ["adguard", "uptime-kuma", "portainer", "beszel", "radarr", "sonarr", "prowlarr", "qbittorrent", "jellyfin", "immich", "seerr"].includes(adapterType); }

type Product = { name: string; credential: string; insightTitle: string; insightDescription: string; preview?: "photos" | "media" | "service"; setup?: Array<{ title: string; description: string }>; features: Array<{ title: string; description: string }> };
const defaultFeatures = [{ title: "Service data", description: "Summary statistics and version information." }, { title: "Recent activity", description: "Operational events and current workload." }, { title: "History", description: "Trends collected over time." }];
const products: Record<string, Product> = {
  "adguard-home": { name: "AdGuard Home", credential: "the AdGuard administrator username and password", insightTitle: "DNS analytics", insightDescription: "Queries, filtering, clients, upstreams, and recent DNS activity.", setup: [{ title: "Confirm the AdGuard login", description: "Use the same administrator username and password that signs in to the AdGuard Home web interface." }, { title: "Set the API address", description: "In Settings, edit AdGuard Home and use its web address as the API base URL, for example http://server.home.arpa:3000." }, { title: "Save the encrypted credential", description: "Choose the AdGuard Home adapter, enter the username and password, save, then allow one health-check cycle." }], features: [{ title: "Traffic and blocking", description: "Query volume, blocked percentage, and response-time history." }, { title: "Domains and clients", description: "Top requested domains, blocked domains, and active clients." }, { title: "Resolver operations", description: "Protection state, filters, upstreams, cache, and query activity." }] },
  "uptime-kuma": { name: "Uptime Kuma", credential: "a Prometheus API key", insightTitle: "Monitor availability", insightDescription: "Monitor state, latency, incidents, and certificate health.", features: [{ title: "Monitor status", description: "Up, down, pending, and maintenance monitors." }, { title: "Latency", description: "Response-time history and slow monitors." }, { title: "Incidents", description: "Recent outages and recovery events." }] },
  radarr: { name: "Radarr", credential: "a Radarr API key", insightTitle: "Movie library intelligence", insightDescription: "Connect the Radarr API for library coverage, queue health, disk use, and upcoming releases.", features: [{ title: "Library", description: "Monitored movies, downloaded files, quality profiles, and disk use." }, { title: "Queue", description: "Active downloads, warnings, failures, and remaining time." }, { title: "Calendar", description: "Upcoming cinema, digital, and physical releases." }] },
  sonarr: { name: "Sonarr", credential: "a Sonarr API key", insightTitle: "Series library intelligence", insightDescription: "Connect the Sonarr API for episodes, queue health, missing files, and air dates.", features: [{ title: "Series and episodes", description: "Monitored series, seasons, episode files, and missing episodes." }, { title: "Queue", description: "Current downloads, import state, warnings, and failures." }, { title: "Calendar", description: "Upcoming episodes and release activity." }] },
  prowlarr: { name: "Prowlarr", credential: "a Prowlarr API key", insightTitle: "Indexer operations", insightDescription: "Connect Prowlarr for indexer health, application sync, and query history.", features: [{ title: "Indexers", description: "Enabled indexers, protocol, privacy, and status." }, { title: "Health", description: "Indexer failures and application sync warnings." }, { title: "History", description: "Queries, grabs, response times, and failures." }] },
  bazarr: { name: "Bazarr", credential: "a Bazarr API key", insightTitle: "Subtitle coverage", insightDescription: "Connect Bazarr for missing subtitles, provider health, and download history.", features: [{ title: "Coverage", description: "Missing movie and series subtitles by language." }, { title: "Providers", description: "Provider state, throttling, and authentication errors." }, { title: "History", description: "Recently downloaded subtitles and matches." }] },
  qbittorrent: { name: "qBittorrent", credential: "the Web UI username and password", insightTitle: "Transfer control", insightDescription: "Connect the Web API for transfer speed, queue state, trackers, and storage.", features: [{ title: "Throughput", description: "Upload and download speed, totals, and limits." }, { title: "Queue", description: "Active, stalled, paused, and completed torrents." }, { title: "Storage", description: "Remaining disk space, ratio, and share activity." }] },
  jellyfin: { name: "Jellyfin", credential: "a Jellyfin API key", insightTitle: "Media server activity", insightDescription: "Connect Jellyfin for libraries, sessions, transcoding, and users.", preview: "media", features: [{ title: "Libraries", description: "Movie, series, episode, music, and book counts." }, { title: "Active sessions", description: "Current viewers, devices, playback, and transcodes." }, { title: "Server", description: "Version, startup state, and scheduled task health." }] },
  immich: { name: "Immich", credential: "an Immich API key", insightTitle: "Photo library activity", insightDescription: "Connect Immich for assets, users, storage, jobs, and recent uploads.", preview: "photos", features: [{ title: "Library", description: "Photos, videos, storage usage, and people." }, { title: "Jobs", description: "Thumbnail, metadata, facial recognition, and ML queues." }, { title: "Activity", description: "Recent uploads, albums, and sharing events." }] },
  seerr: { name: "Seerr", credential: "a Seerr API key", insightTitle: "Request operations", insightDescription: "Connect Seerr for request queues, approvals, users, and media availability.", features: [{ title: "Requests", description: "Pending, approved, processing, and completed requests." }, { title: "Media", description: "Available, partially available, and requested titles." }, { title: "Users", description: "Request volume and approval activity." }] },
};
