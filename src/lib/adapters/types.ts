export type ServiceStatus = "healthy" | "degraded" | "offline" | "unknown";

export type HealthResult = {
  status: ServiceStatus;
  latencyMs?: number;
  message: string;
  version?: string;
  metrics?: Record<string, number | string | boolean>;
};

export type SummaryResult = {
  title: string;
  metrics: Array<{ label: string; value: string; detail?: string; trend?: number[]; color?: "blue" | "green" | "amber" | "red" | "gray" }>;
  items?: Array<Record<string, string | number | boolean>>;
  charts?: Array<{
    title: string;
    description?: string;
    data: Array<Record<string, string | number>>;
    series: Array<{ key: string; label: string; color: "blue" | "green" | "amber" | "red" | "gray"; unit?: string }>;
  }>;
  tables?: Array<{
    title: string;
    description?: string;
    href?: string;
    actionLabel?: string;
    columns: Array<{ key: string; label: string; align?: "left" | "right"; mono?: boolean }>;
    rows: Array<Record<string, string | number | boolean>>;
  }>;
  details?: Array<{ label: string; value: string; detail?: string; percent?: number }>;
};

export type AdapterContext = {
  id: string;
  name: string;
  baseUrl: string;
  launchUrl: string;
  credentials: Record<string, string>;
  configuration: Record<string, unknown>;
};

/**
 * An application launcher discovered from a provider inventory. Discovery is
 * intentionally metadata-only; its status is the provider's container state,
 * not the result of a request to the application itself.
 */
export type LauncherCandidate = {
  containerId: string;
  name: string;
  image?: string;
  inferredLaunchUrl?: string;
  containerState: string;
  containerStatus?: string;
  status: ServiceStatus;
  exposedPorts: Array<{ privatePort?: number; publicPort?: number; protocol?: string }>;
};

export type SafeAction = {
  id: string;
  label: string;
  description: string;
  tone: "neutral" | "warning" | "danger";
  confirmation: string;
};

export interface ServiceAdapter {
  type: string;
  testConnection(context: AdapterContext): Promise<HealthResult>;
  getHealth(context: AdapterContext): Promise<HealthResult>;
  getSummary(context: AdapterContext): Promise<SummaryResult>;
  getAvailableActions(context: AdapterContext): Promise<SafeAction[]>;
  executeAction(context: AdapterContext, action: string, target?: string): Promise<{ message: string }>;
  discoverLaunchers?(context: AdapterContext): Promise<LauncherCandidate[]>;
}
