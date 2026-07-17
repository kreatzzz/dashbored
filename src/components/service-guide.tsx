import { ArrowUpRight, Check, KeyRound, ListChecks } from "lucide-react";
import { getServiceGuide } from "@/lib/service-guides";

export function ServiceGuide({ slug, name }: { slug: string; name: string }) {
  const guide = getServiceGuide(slug);
  return <section id="setup-guide" className="overflow-hidden rounded-md border border-border bg-card">
    <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><ListChecks size={16} /><h2 className="text-sm font-medium">Configure {name}</h2></div><p className="mt-2 max-w-2xl text-[13px] leading-5 text-muted-foreground">{guide.intro}</p></div>
      <span className="w-fit rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{guide.mode === "integrated" ? "Native integration" : "Launcher mode"}</span>
    </div>
    <div className="grid lg:grid-cols-[.72fr_1.28fr]">
      <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2"><KeyRound size={14} className="text-muted-foreground" /><h3 className="text-[13px] font-medium">Connection fields</h3></div>
        <dl className="mt-4 space-y-3">{guide.fields.map((field) => <div key={field.label} className="grid gap-1 text-[13px]"><dt className="text-muted-foreground">{field.label}</dt><dd className="mono break-words text-xs">{field.value}</dd></div>)}</dl>
        <a href={guide.docs.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-blue-700)] hover:underline">{guide.docs.label}<ArrowUpRight size={13} /></a>
      </div>
      <div className="p-5">
        <h3 className="text-[13px] font-medium">Setup steps</h3>
        <ol className="mt-4 space-y-3">{guide.steps.map((step, index) => <li key={step} className="flex gap-3 text-[13px] leading-5"><span className="mono grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border text-[10px] text-muted-foreground">{index + 1}</span><span>{step}</span></li>)}</ol>
        <div className="mt-6 border-t border-border pt-5"><h3 className="text-[13px] font-medium">What appears in the dashboard</h3><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{guide.data.map((item) => <span key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check size={12} className="text-[var(--good)]" />{item}</span>)}</div>{guide.note && <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">{guide.note}</p>}</div>
      </div>
    </div>
  </section>;
}
