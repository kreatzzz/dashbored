"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { encryptCredential } from "@/lib/crypto";
import { assertPrivateServiceUrl } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const schema = z.object({ name: z.string().min(2).max(60), categoryId: z.string().min(1), adapterType: z.string().min(1), icon: z.string().min(1), baseUrl: z.string().url().optional().or(z.literal("")), launchUrl: z.string().url(), description: z.string().max(160).optional(), username: z.string().max(120).optional(), password: z.string().max(300).optional(), apiKey: z.string().max(1000).optional(), token: z.string().max(2000).optional() });

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
  revalidatePath("/"); revalidatePath("/settings");
}

export async function deleteService(formData: FormData) {
  const session = await requireSession();
  const id = z.string().min(1).parse(formData.get("id"));
  const service = await prisma.serviceInstance.findUnique({ where: { id } });
  if (!service) return;
  await prisma.actionAudit.create({ data: { userId: session.user.id, action: "service-deleted", target: service.name, status: "success" } });
  await prisma.$transaction(async (tx) => { await tx.serviceInstance.delete({ where: { id } }); if (service.credentialId) await tx.encryptedCredential.delete({ where: { id: service.credentialId } }); });
  revalidatePath("/"); revalidatePath("/settings");
}

const updateSchema = schema.extend({ id: z.string().min(1) });

export async function updateService(formData: FormData) {
  const session = await requireSession();
  const parsed = updateSchema.parse(Object.fromEntries(formData));
  if (parsed.baseUrl) await assertPrivateServiceUrl(parsed.baseUrl);
  await assertPrivateServiceUrl(parsed.launchUrl);
  const existing = await prisma.serviceInstance.findUnique({ where: { id: parsed.id } });
  if (!existing) throw new Error("Service not found");
  const credentials = Object.fromEntries(Object.entries({ username: parsed.username, password: parsed.password, apiKey: parsed.apiKey, token: parsed.token }).filter(([, value]) => value));
  await prisma.$transaction(async (tx) => {
    let credentialId = existing.credentialId;
    if (Object.keys(credentials).length) {
      const encrypted = encryptCredential(credentials as Record<string, string>);
      if (credentialId) await tx.encryptedCredential.update({ where: { id: credentialId }, data: encrypted });
      else credentialId = (await tx.encryptedCredential.create({ data: encrypted })).id;
    }
    await tx.serviceInstance.update({ where: { id: parsed.id }, data: { name: parsed.name, categoryId: parsed.categoryId, adapterType: parsed.adapterType, icon: parsed.icon, description: parsed.description, baseUrl: parsed.baseUrl || null, launchUrl: parsed.launchUrl, credentialId } });
  });
  await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: parsed.id, action: "service-updated", status: "success" } });
  revalidatePath("/"); revalidatePath("/settings"); revalidatePath(`/services/${existing.slug}`);
}
