"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getAdapter } from "@/lib/adapters";
import { listPortainerEnvironments, type PortainerEnvironment } from "@/lib/adapters/portainer";
import { encryptCredential } from "@/lib/crypto";
import { syncPortainerLaunchers } from "@/lib/launchers";
import { assertPrivateServiceUrl } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getServiceContext } from "@/lib/services";
import { isConnectionSetupPending } from "@/lib/supported-containers";

const schema = z.object({ name: z.string().min(2).max(60), categoryId: z.string().min(1), adapterType: z.string().min(1), icon: z.string().min(1), baseUrl: z.string().url().optional().or(z.literal("")), launchUrl: z.string().url(), description: z.string().max(160).optional(), username: z.string().max(120).optional(), password: z.string().max(300).optional(), apiKey: z.string().max(1000).optional(), token: z.string().max(2000).optional() });

const portainerConnectionSchema = z.object({
  baseUrl: z.string().url().max(2048),
  launchUrl: z.string().url().max(2048).optional().or(z.literal("")),
  apiKey: z.string().min(1).max(1000),
  endpointId: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(1).max(1_000_000).optional()),
  replaceUnconfigured: z.literal("true").optional(),
});

export type PortainerConnectionState = { status: "idle" | "success" | "error"; error?: string; message?: string };
export type ServiceMutationState = { status: "idle" | "success" | "error"; error?: string };

const initialPortainerConnectionState: PortainerConnectionState = { status: "idle" };

function revalidateDashboardPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/launcher");
}

/** Create the focused first provider used by a fresh Dashbored installation. */
export async function createPortainerConnection(
  _previousState: PortainerConnectionState = initialPortainerConnectionState,
  formData: FormData,
): Promise<PortainerConnectionState> {
  void _previousState;
  const session = await requireSession();
  const parsed = portainerConnectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", error: "Enter a valid private Portainer URL and access token." };

  try {
    const launchUrl = parsed.data.launchUrl || parsed.data.baseUrl;
    await Promise.all([assertPrivateServiceUrl(parsed.data.baseUrl), assertPrivateServiceUrl(launchUrl)]);
    const connectionContext = {
      id: "connection-check",
      name: "Portainer",
      baseUrl: parsed.data.baseUrl,
      launchUrl,
      credentials: { apiKey: parsed.data.apiKey },
      configuration: {},
    };
    let environments: PortainerEnvironment[];
    try {
      environments = await listPortainerEnvironments(connectionContext);
    } catch (error) {
      return { status: "error", error: portainerConnectionError(error) };
    }
    if (!environments.length) return { status: "error", error: "Portainer accepted the token but did not expose any environments. Grant the account access to one environment, then try again." };
    const environment = parsed.data.endpointId === undefined
      ? environments[0]
      : environments.find((candidate) => candidate.id === parsed.data.endpointId);
    if (!environment) return { status: "error", error: missingEnvironmentMessage(environments) };
    // Test the exact environment before saving credentials. Seeing an
    // environment alone is not enough: the token also needs container-read
    // permission for the environment Dashbored will manage.
    try {
      await getAdapter("portainer").getSummary({ ...connectionContext, configuration: { endpointId: environment.id } });
    } catch (error) {
      return { status: "error", error: portainerConnectionError(error) };
    }
    const category = await prisma.serviceCategory.findUnique({ where: { slug: "infrastructure" }, select: { id: true } });
    if (!category) return { status: "error", error: "The Infrastructure category is unavailable. Run database migrations, then try again." };
    const existingPlaceholder = parsed.data.replaceUnconfigured
      ? await prisma.serviceInstance.findFirst({ where: { adapterType: "portainer", credentialId: null }, orderBy: { createdAt: "asc" } })
      : null;

    const encrypted = encryptCredential({ apiKey: parsed.data.apiKey });
    const service = await prisma.$transaction(async (tx) => {
      const credential = await tx.encryptedCredential.create({ data: encrypted });
      if (existingPlaceholder) {
        return tx.serviceInstance.update({
          where: { id: existingPlaceholder.id },
          data: {
            name: "Portainer",
            categoryId: category.id,
            adapterType: "portainer",
            icon: "container",
            description: "Container inventory and confirmed actions",
            baseUrl: parsed.data.baseUrl,
            launchUrl,
            credentialId: credential.id,
            configuration: { endpointId: environment.id, endpointName: environment.name },
            lastStatus: "unknown",
            lastCheckedAt: null,
            lastLatencyMs: null,
            pollFailureCount: 0,
            nextPollAt: null,
          },
        });
      }
      return tx.serviceInstance.create({
        data: {
          name: "Portainer",
          slug: `portainer-${crypto.randomUUID().slice(0, 5)}`,
          categoryId: category.id,
          adapterType: "portainer",
          icon: "container",
          description: "Container inventory and confirmed actions",
          baseUrl: parsed.data.baseUrl,
          launchUrl,
          credentialId: credential.id,
          configuration: { endpointId: environment.id, endpointName: environment.name },
        },
      });
    });
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: existingPlaceholder ? "portainer-reconnected" : "portainer-connected", status: "success" } });
    let discoveryMessage = "Connected. Inventory will continue to refresh in the background.";
    try {
      const discovery = await syncPortainerLaunchers(service);
      discoveryMessage = discovery.discovered
        ? `Connected and imported ${discovery.discovered} container${discovery.discovered === 1 ? "" : "s"}${discovery.integrations ? `. ${discovery.integrations} native setup${discovery.integrations === 1 ? " is" : "s are"} ready in the sidebar.` : "."}`
        : "Connected. Portainer reported no containers for this environment.";
    } catch (error) {
      console.warn(JSON.stringify({ level: "warn", event: "portainer.initial_discovery_failed", message: error instanceof Error ? error.message : "Unknown error" }));
    }
    revalidateDashboardPaths();
    return { status: "success", message: discoveryMessage };
  } catch {
    return { status: "error", error: "Dashbored could not save that connection. Check that both URLs are private and reachable from the dashboard server." };
  }
}

function portainerConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/authentication|401|403|unauthor/i.test(message)) return "Portainer rejected that access token. Create a scoped token for an account that can see the selected environment.";
  if (/not found|404/i.test(message)) return "Dashbored could not find that Portainer environment. Confirm the Portainer URL and environment ID.";
  if (/abort|timeout|timed out/i.test(message)) return "Dashbored could not reach Portainer before the request timed out. Check the private network path and URL.";
  return "Dashbored could not validate that Portainer connection. Check the private URL, token, and environment ID.";
}

function missingEnvironmentMessage(environments: PortainerEnvironment[]) {
  const choices = environments.slice(0, 3).map((environment) => `${environment.name} (${environment.id})`).join(", ");
  const suffix = environments.length > 3 ? ", …" : "";
  return `That environment ID is not available to this token. Available: ${choices}${suffix}.`;
}

export async function createService(formData: FormData): Promise<ServiceMutationState> {
  const session = await requireSession();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", error: "Enter a name, category, and a valid private browser URL." };
  try {
    if (parsed.data.baseUrl) await assertPrivateServiceUrl(parsed.data.baseUrl);
    await assertPrivateServiceUrl(parsed.data.launchUrl);
    const credentials = Object.fromEntries(Object.entries({ username: parsed.data.username, password: parsed.data.password, apiKey: parsed.data.apiKey, token: parsed.data.token }).filter(([, value]) => value));
    const encrypted = Object.keys(credentials).length ? encryptCredential(credentials as Record<string, string>) : null;
    const slugBase = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 5)}`;
    const service = await prisma.$transaction(async (tx) => {
      const credential = encrypted ? await tx.encryptedCredential.create({ data: encrypted }) : null;
      return tx.serviceInstance.create({ data: { name: parsed.data.name, slug, categoryId: parsed.data.categoryId, adapterType: parsed.data.adapterType, icon: parsed.data.icon, baseUrl: parsed.data.baseUrl || null, launchUrl: parsed.data.launchUrl, description: parsed.data.description, credentialId: credential?.id } });
    });
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: "service-created", status: "success" } });
    revalidateDashboardPaths();
    return { status: "success" };
  } catch (error) {
    return { status: "error", error: serviceMutationError(error) };
  }
}

export async function deleteService(formData: FormData): Promise<ServiceMutationState> {
  const session = await requireSession();
  const parsed = z.string().min(1).safeParse(formData.get("id"));
  if (!parsed.success) return { status: "error", error: "This connection could not be identified. Refresh Settings and try again." };
  try {
    const service = await prisma.serviceInstance.findUnique({ where: { id: parsed.data } });
    if (!service) return { status: "error", error: "This connection no longer exists. Refresh Settings and try again." };
    await prisma.actionAudit.create({ data: { userId: session.user.id, action: "service-deleted", target: service.name, status: "success" } });
    await prisma.$transaction(async (tx) => { await tx.serviceInstance.delete({ where: { id: parsed.data } }); if (service.credentialId) await tx.encryptedCredential.delete({ where: { id: service.credentialId } }); });
    revalidateDashboardPaths();
    return { status: "success" };
  } catch {
    return { status: "error", error: "Dashbored could not remove that connection. Try again, or refresh Settings first." };
  }
}

const updateSchema = schema.extend({
  id: z.string().min(1),
  endpointId: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(1).max(1_000_000).optional()),
});

export async function updateService(formData: FormData): Promise<ServiceMutationState> {
  const session = await requireSession();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", error: "Check the required connection fields and try again." };
  try {
    const existing = await prisma.serviceInstance.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return { status: "error", error: "This connection no longer exists. Refresh Settings and try again." };
    const baseUrl = parsed.data.adapterType === "portainer" ? parsed.data.baseUrl || existing.baseUrl : parsed.data.baseUrl || null;
    if (baseUrl) await assertPrivateServiceUrl(baseUrl);
    await assertPrivateServiceUrl(parsed.data.launchUrl);
    const credentials = Object.fromEntries(Object.entries({ username: parsed.data.username, password: parsed.data.password, apiKey: parsed.data.apiKey, token: parsed.data.token }).filter(([, value]) => value));
    const existingConfiguration = existing.configuration && typeof existing.configuration === "object" && !Array.isArray(existing.configuration)
      ? existing.configuration as Record<string, unknown>
      : {};
    let configuration: Record<string, unknown> = { ...existingConfiguration };
    if (parsed.data.endpointId !== undefined) configuration.endpointId = parsed.data.endpointId;
    if (parsed.data.adapterType === "portainer") {
      const savedCredentials = existing.baseUrl ? (await getServiceContext(existing)).credentials : {};
      const apiKey = parsed.data.apiKey || savedCredentials.apiKey;
      if (!apiKey) return { status: "error", error: "Enter a Portainer access token before saving this connection." };
      const connectionContext = {
        id: existing.id,
        name: parsed.data.name,
        baseUrl: baseUrl || "",
        launchUrl: parsed.data.launchUrl,
        credentials: { ...savedCredentials, ...credentials, apiKey },
        configuration: { ...existingConfiguration, endpointId: parsed.data.endpointId ?? existingConfiguration.endpointId ?? 1 },
      };
      if (!connectionContext.baseUrl) return { status: "error", error: "Enter a private Portainer URL before saving this connection." };
      let environments: PortainerEnvironment[];
      try {
        environments = await listPortainerEnvironments(connectionContext);
      } catch (error) {
        return { status: "error", error: portainerConnectionError(error) };
      }
      if (!environments.length) return { status: "error", error: "Portainer accepted the token but did not expose any environments. Grant the account access to one environment, then try again." };
      const endpointId = Number(connectionContext.configuration.endpointId);
      const environment = environments.find((candidate) => candidate.id === endpointId);
      if (!environment) return { status: "error", error: missingEnvironmentMessage(environments) };
      try {
        await getAdapter("portainer").getSummary({ ...connectionContext, configuration: { endpointId: environment.id } });
      } catch (error) {
        return { status: "error", error: portainerConnectionError(error) };
      }
      configuration = { ...existingConfiguration, endpointId: environment.id, endpointName: environment.name };
    }
    const updatedService = await prisma.$transaction(async (tx) => {
      let credentialId = existing.credentialId;
      if (Object.keys(credentials).length) {
        const encrypted = encryptCredential(credentials as Record<string, string>);
        if (credentialId) await tx.encryptedCredential.update({ where: { id: credentialId }, data: encrypted });
        else credentialId = (await tx.encryptedCredential.create({ data: encrypted })).id;
      }
      if (isConnectionSetupPending(existing.configuration) && baseUrl && hasRequiredCredentials(parsed.data.adapterType, credentials, credentialId)) {
        configuration = { ...configuration, setupState: "connected" };
      }
      return tx.serviceInstance.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, categoryId: parsed.data.categoryId, adapterType: parsed.data.adapterType, icon: parsed.data.icon, description: parsed.data.description, baseUrl, launchUrl: parsed.data.launchUrl, credentialId, configuration: configuration as Prisma.InputJsonValue | undefined, ...(parsed.data.adapterType === "portainer" ? { lastStatus: "unknown", lastCheckedAt: null, lastLatencyMs: null, pollFailureCount: 0, nextPollAt: null } : {}) } });
    });
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: parsed.data.id, action: parsed.data.adapterType === "portainer" ? "portainer-updated" : "service-updated", status: "success" } });
    if (parsed.data.adapterType === "portainer") {
      try {
        await syncPortainerLaunchers(updatedService);
      } catch (error) {
        console.warn(JSON.stringify({ level: "warn", event: "portainer.updated_discovery_failed", serviceId: updatedService.id, message: error instanceof Error ? error.message : "Unknown error" }));
      }
    }
    revalidateDashboardPaths();
    revalidatePath(`/dashboard/services/${existing.slug}`);
    return { status: "success" };
  } catch (error) {
    return { status: "error", error: serviceMutationError(error) };
  }
}

function hasRequiredCredentials(adapterType: string, credentials: Record<string, string | undefined>, credentialId: string | null) {
  if (credentialId) return true;
  if (["adguard", "beszel"].includes(adapterType)) return Boolean(credentials.username && credentials.password);
  return Boolean(credentials.apiKey || credentials.token);
}

function serviceMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/private|loopback|HTTP\(S\)|credentials must not/i.test(message)) return message;
  return "Dashbored could not save that connection. Check the values and try again.";
}
