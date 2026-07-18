import { Check, Container, KeyRound, Sparkles } from "lucide-react";
import { EditServiceDialog } from "@/components/edit-service-dialog";
import { ServiceGuide } from "@/components/service-guide";
import { Button } from "@/components/ui/button";
import { getDiscoveredServiceSource, getSupportedContainerByAdapter } from "@/lib/supported-containers";

type DetectedService = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  adapterType: string;
  icon: string;
  baseUrl: string | null;
  launchUrl: string;
  configuration: unknown;
};

export function DetectedServiceSetup({ service, categories }: { service: DetectedService; categories: Array<{ id: string; name: string }> }) {
  const supported = getSupportedContainerByAdapter(service.adapterType);
  const source = getDiscoveredServiceSource(service.configuration);
  const guideKey = supported?.guideKey ?? service.adapterType;
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
        <div className="border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground"><Sparkles size={13} className="text-[var(--ds-blue-700)]" />Detected through Portainer</div>
          <div className="mt-5 flex items-start gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground shadow-[var(--surface-shadow)]"><Container size={17} /></div><div className="min-w-0"><h2 className="text-balance text-lg font-semibold tracking-[-.025em]">Finish the {service.name} connection</h2><p className="mt-2 max-w-[62ch] text-pretty text-[13px] leading-6 text-muted-foreground">Dashbored recognized this container and reserved its native dashboard. Review the private URL, add a dedicated credential, then the regular metrics and service view become active.</p></div></div>
          <div className="mt-6"><EditServiceDialog service={service} categories={categories} trigger={<Button size="sm"><KeyRound size={13} />Finish setup</Button>} /></div>
        </div>
        <div className="divide-y divide-border bg-muted/20">
          <SetupFact label="Detected container" value={source?.image ?? "Portainer inventory"} />
          <SetupFact label="Address" value={source?.inferredLaunchUrl ?? "Not inferred — enter it during setup"} mono />
          <div className="flex gap-3 px-5 py-4"><Check size={14} className="mt-0.5 shrink-0 text-[var(--good)]" /><p className="text-xs leading-5 text-muted-foreground">No application password or API key was imported. Dashbored only read container metadata from Portainer.</p></div>
        </div>
      </div>
    </section>
    <ServiceGuide slug={guideKey} name={service.name} />
  </div>;
}

function SetupFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="px-5 py-4"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className={`mt-1.5 truncate text-[13px] ${mono ? "mono text-xs" : "font-medium"}`} title={value}>{value}</p></div>;
}
