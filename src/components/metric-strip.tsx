import type { SummaryResult } from "@/lib/adapters";

type Metric = SummaryResult["metrics"][number];

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  const visible = metrics.slice(0, 4);
  return <section className="overflow-hidden rounded-lg bg-card shadow-[var(--surface-shadow)]">
    <div className="grid grid-cols-2 -mb-px -mr-px xl:grid-cols-4">
      {visible.map((metric) => <div key={metric.label} className="relative min-w-0 overflow-hidden border-b border-r border-border p-4 md:px-5">
        <div className="relative z-10 max-w-[68%]">
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-xl font-semibold leading-none tracking-[-.03em] tabular-nums">{metric.value}</p>
          <p className="mt-1 min-h-4 truncate text-[11px] text-muted-foreground" title={metric.detail}>{metric.detail ?? ""}</p>
        </div>
        {metric.trend && metric.trend.length > 1 ? <MiniSparkline values={metric.trend} color={metric.color} /> : null}
      </div>)}
    </div>
  </section>;
}

function MiniSparkline({ values, color = "blue" }: { values: number[]; color?: Metric["color"] }) {
  const width = 112;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${index / (values.length - 1) * width},${height - ((value - min) / range * (height - 4) + 2)}`).join(" ");
  const stroke = { blue: "var(--ds-blue-700)", green: "var(--ds-green-700)", amber: "var(--ds-amber-700)", red: "var(--ds-red-700)", gray: "var(--ds-gray-700)" }[color];
  return <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute bottom-4 right-4 h-9 w-[34%] min-w-20 opacity-80">
    <polygon points={`0,${height} ${points} ${width},${height}`} fill={stroke} opacity="0.1" />
    <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
  </svg>;
}
