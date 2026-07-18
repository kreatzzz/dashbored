"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdapter } from "@/lib/adapters";
import { encryptCredential } from "@/lib/crypto";
import { syncPortainerLaunchers } from "@/lib/launchers";
import { assertPrivateServiceUrl } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const schema = z.object({ name: z.string().min(2).max(60), categoryId: z.string().min(1), adapterType: z.string().min(1), icon: z.string().min(1), baseUrl: z.string().url().optional().or(z.literal("")), launchUrl: z.string().url(), description: z.string().max(160).optional(), username: z.string().max(120).optional(), password: z.string().max(300).optional(), apiKey: z.string().max(1000).optional(), token: z.string().max(2000).optional() });

const portainerConnectionSchema = z.object({
  baseUrl: z.string().url().max(2048),
  launchUrl: z.string().url().max(2048).optional().or(z.literal("")),
  apiKey: z.string().min(1).max(1000),
  endpointId: z.coerce.number().int().min(1).max(1_000_000).default(1),
  replaceUnconfigured: z.literal("true").optional(),
});

export type PortainerConnectionState = { status: "idle" | "success" | "error"; error?: string; message?: string };

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
  if (!parsed.success) return { status: "error", error: "Enter a valid private Portainer URL, API key, and environment ID." };

  try {
    const launchUrl = parsed.data.launchUrl || parsed.data.baseUrl;
    await Promise.all([assertPrivateServiceUrl(parsed.data.baseUrl), assertPrivateServiceUrl(launchUrl)]);
    // Test the exact environment before saving credentials. A successful
    // `/api/endpoints` response alone is not enough: the token also needs to
    // be able to read the requested container environment.
    try {
      await getAdapter("portainer").getSummary({
        id: "connection-check",
        name: "Portainer",
        baseUrl: parsed.data.baseUrl,
        launchUrl,
        credentials: { apiKey: parsed.data.apiKey },
        configuration: { endpointId: parsed.data.endpointId },
      });
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
            configuration: { endpointId: parsed.data.endpointId },
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
          configuration: { endpointId: parsed.data.endpointId },
        },
      });
    });
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: existingPlaceholder ? "portainer-reconnected" : "portainer-connected", status: "success" } });
    let discoveryMessage = "Connected. Inventory will continue to refresh in the background.";
    try {
      const discovery = await syncPortainerLaunchers(service);
      discoveryMessage = discovery.discovered
        ? `Connected and imported ${discovery.discovered} container${discovery.discovered === 1 ? "" : "s"}.`
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

export async function createService(formData: FormData) {
  const session = await requireSession();
  const parsed = schema.parse(Object.fromEntries(formData));
  if (parsed.baseUrl) await assertPrivateServiceUrl(parsed.baseUrl);
  await assertPrivateServiceUrl(parsed.launchUrl);
  const credentials = Object.fromEntries(Object.entries({ username: parsed.username, password: parsed.password, apiKey: parsed.apiKey, token: parsed.token }).filter(([, value]) => value));
  const encrypted = Object.keys(credentials).length ? encryptCredential(credentials as Record<string, string>) : null;
  const slugBase = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 5)}`;
  const service = await prisma.$transaction(async (tx) => {
    const credential = encrypted ? await tx.encryptedCredential.create({ data: encrypted }) : null;
    return tx.serviceInstance.create({ data: { name: parsed.name, slug, categoryId: parsed.categoryId, adapterType: parsed.adapterType, icon: parsed.icon, baseUrl: parsed.baseUrl || null, launchUrl: parsed.launchUrl, description: parsed.description, credentialId: credential?.id } });
  });
  await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: "service-created", status: "success" } });
  revalidateDashboardPaths();
}

export async function deleteService(formData: FormData) {
  const session = await requireSession();
  const id = z.string().min(1).parse(formData.get("id"));
  const service = await prisma.serviceInstance.findUnique({ where: { id } });
  if (!service) return;
  await prisma.actionAudit.create({ data: { userId: session.user.id, action: "service-deleted", target: service.name, status: "success" } });
  await prisma.$transaction(async (tx) => { await tx.serviceInstance.delete({ where: { id } }); if (service.credentialId) await tx.encryptedCredential.delete({ where: { id: service.credentialId } }); });
  revalidateDashboardPaths();
}

const updateSchema = schema.extend({
  id: z.string().min(1),
  endpointId: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(1).max(1_000_000).optional()),
});

export async function updateService(formData: FormData) {
  const session = await requireSession();
  const parsed = updateSchema.parse(Object.fromEntries(formData));
  if (parsed.baseUrl) await assertPrivateServiceUrl(parsed.baseUrl);
  await assertPrivateServiceUrl(parsed.launchUrl);
  const existing = await prisma.serviceInstance.findUnique({ where: { id: parsed.id } });
  if (!existing) throw new Error("Service not found");
  const credentials = Object.fromEntries(Object.entries({ username: parsed.username, password: parsed.password, apiKey: parsed.apiKey, token: parsed.token }).filter(([, value]) => value));
  const existingConfiguration = existing.configuration && typeof existing.configuration === "object" && !Array.isArray(existing.configuration)
    ? existing.configuration as Record<string, unknown>
    : {};
  const configuration = parsed.endpointId === undefined ? undefined : { ...existingConfiguration, endpointId: parsed.endpointId };
  await prisma.$transaction(async (tx) => {
    let credentialId = existing.credentialId;
    if (Object.keys(credentials).length) {
      const encrypted = encryptCredential(credentials as Record<string, string>);
      if (credentialId) await tx.encryptedCredential.update({ where: { id: credentialId }, data: encrypted });
      else credentialId = (await tx.encryptedCredential.create({ data: encrypted })).id;
    }
    await tx.serviceInstance.update({ where: { id: parsed.id }, data: { name: parsed.name, categoryId: parsed.categoryId, adapterType: parsed.adapterType, icon: parsed.icon, description: parsed.description, baseUrl: parsed.baseUrl || null, launchUrl: parsed.launchUrl, credentialId, configuration } });
  });
  await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: parsed.id, action: "service-updated", status: "success" } });
  revalidateDashboardPaths();
  revalidatePath(`/dashboard/services/${existing.slug}`);
}
