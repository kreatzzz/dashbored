import { z } from "zod";
import { encryptCredential } from "@/lib/crypto";
import { assertPrivateServiceUrl } from "@/lib/network";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(60).optional(),
  categorySlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  adapterType: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  description: z.string().max(160).optional(),
  baseUrl: z.string().url().nullable().optional(),
  launchUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
  configuration: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  credentials: z.record(z.string(), z.string().min(1).max(2000)).optional(),
});

const inputSchema = z.object({ services: z.array(serviceSchema).min(1).max(50) });

async function main() {
  const raw = await new Response(Bun.stdin.stream()).text();
  const input = inputSchema.parse(JSON.parse(raw));
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  for (const item of input.services) {
    if (item.baseUrl) await assertPrivateServiceUrl(item.baseUrl);
    if (item.launchUrl) await assertPrivateServiceUrl(item.launchUrl);

    const existing = await prisma.serviceInstance.findUnique({ where: { slug: item.slug } });
    const category = item.categorySlug
      ? await prisma.serviceCategory.findUnique({ where: { slug: item.categorySlug } })
      : null;

    if (!existing && (!item.name || !category || !item.adapterType || !item.icon || !item.launchUrl)) {
      throw new Error(`New service ${item.slug} is missing required catalog fields`);
    }
    if (item.categorySlug && !category) throw new Error(`Unknown category: ${item.categorySlug}`);

    const encrypted = item.credentials && Object.keys(item.credentials).length
      ? encryptCredential(item.credentials)
      : null;

    const service = await prisma.$transaction(async (tx) => {
      let credentialId = existing?.credentialId ?? null;
      if (encrypted) {
        if (credentialId) await tx.encryptedCredential.update({ where: { id: credentialId }, data: encrypted });
        else credentialId = (await tx.encryptedCredential.create({ data: encrypted })).id;
      }

      if (existing) {
        return tx.serviceInstance.update({
          where: { id: existing.id },
          data: {
            ...(item.name ? { name: item.name } : {}),
            ...(category ? { categoryId: category.id } : {}),
            ...(item.adapterType ? { adapterType: item.adapterType } : {}),
            ...(item.icon ? { icon: item.icon } : {}),
            ...(item.description !== undefined ? { description: item.description } : {}),
            ...(item.baseUrl !== undefined ? { baseUrl: item.baseUrl } : {}),
            ...(item.launchUrl ? { launchUrl: item.launchUrl } : {}),
            ...(item.sortOrder !== undefined ? { sortOrder: item.sortOrder } : {}),
            ...(item.configuration ? { configuration: item.configuration } : {}),
            credentialId,
          },
        });
      }

      return tx.serviceInstance.create({
        data: {
          slug: item.slug,
          name: item.name!,
          categoryId: category!.id,
          adapterType: item.adapterType!,
          icon: item.icon!,
          description: item.description,
          baseUrl: item.baseUrl ?? null,
          launchUrl: item.launchUrl!,
          sortOrder: item.sortOrder ?? 0,
          configuration: item.configuration ?? {},
          credentialId,
        },
      });
    });

    await prisma.actionAudit.create({
      data: {
        userId: owner?.id,
        serviceId: service.id,
        action: existing ? "service-configured" : "service-discovered",
        target: service.name,
        status: "success",
      },
    });
    console.log(`Configured ${service.name}`);
  }
}

main().finally(() => prisma.$disconnect());
