"use client";

import { ActiveDot, Area, EvilAreaChart, Grid, Tooltip, XAxis, YAxis } from "@/components/evilcharts/charts/area-chart";
import type { SummaryResult } from "@/lib/adapters";

const colors = {
  blue: { light: ["#0070f3"], dark: ["#52a8ff"] },
  green: { light: ["#1a7f37"], dark: ["#46a758"] },
  amber: { light: ["#d97706"], dark: ["#f5a623"] },
  red: { light: ["#e5484d"], dark: ["#ff6369"] },
  gray: { light: ["#8f8f8f"], dark: ["#a1a1a1"] },
};

export function ServiceMetricChart({ chart }: { chart: NonNullable<SummaryResult["charts"]>[number] }) {
  const config = Object.fromEntries(chart.series.map((series) => [series.key, { label: series.label, colors: colors[series.color] }]));
  return <EvilAreaChart
    data={chart.data}
    config={config}
    className="h-[220px] aspect-auto text-muted-foreground"
    curveType="monotone"
    animationType="none"
    chartProps={{ margin: { top: 10, right: 8, left: -18, bottom: 0 } }}
  >
    <Grid stroke="var(--border)" strokeDasharray="2 3" />
    <XAxis dataKey="time" minTickGap={36} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
    <Tooltip roundness="md" />
    {chart.series.map((series) => <Area key={series.key} dataKey={series.key} variant="gradient" strokeVariant="solid"><ActiveDot variant="default" /></Area>)}
  </EvilAreaChart>;
}
