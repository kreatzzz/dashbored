"use client";

import {
  ActiveDot,
  Area,
  EvilAreaChart,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/area-chart";

const config = {
  healthy: { label: "Operational", colors: { light: ["#0070f3"], dark: ["#52a8ff"] } },
  degraded: { label: "Attention", colors: { light: ["#e5484d"], dark: ["#ff6369"] } },
};

export function SignalChart({ data }: { data: Array<{ time: string; healthy: number; degraded: number }> }) {
  return <EvilAreaChart
    data={data}
    config={config}
    className="h-[220px] aspect-auto text-muted-foreground"
    curveType="monotone"
    animationType="none"
    chartProps={{ margin: { top: 8, right: 8, left: -20, bottom: 0 } }}
  >
    <Grid stroke="var(--border)" strokeDasharray="2 3" />
    <XAxis dataKey="time" minTickGap={32} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
    <Tooltip roundness="md" />
    <Area dataKey="healthy" variant="gradient" strokeVariant="solid"><ActiveDot variant="default" /></Area>
    <Area dataKey="degraded" variant="gradient" strokeVariant="solid"><ActiveDot variant="default" /></Area>
  </EvilAreaChart>;
}
