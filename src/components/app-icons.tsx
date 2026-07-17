import { Activity, Boxes, CircleGauge, Container, Download, Film, Gauge, HardDrive, Image, Network, Radar, Server, ShieldCheck, Tv, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { activity: Activity, boxes: Boxes, container: Container, download: Download, film: Film, gauge: Gauge, hardDrive: HardDrive, image: Image, network: Network, radar: Radar, server: Server, shield: ShieldCheck, tv: Tv, dashboard: CircleGauge };

export function AppIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = icons[name] ?? Server;
  return <Icon size={size} className={className} />;
}
