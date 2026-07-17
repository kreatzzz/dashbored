import type { ServiceInstance } from "@/generated/prisma/client";
import { decryptCredential } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { AdapterContext } from "@/lib/adapters";

export async function getServiceContext(service: ServiceInstance): Promise<AdapterContext> {
  if (!service.baseUrl) throw new Error("No API base URL is configured");
  const credential = service.credentialId ? await prisma.encryptedCredential.findUnique({ where: { id: service.credentialId } }) : null;
  return {
    id: service.id,
    name: service.name,
    baseUrl: service.baseUrl,
    launchUrl: service.launchUrl,
    credentials: credential ? decryptCredential(credential) : {},
    configuration: (service.configuration ?? {}) as Record<string, unknown>,
  };
}
