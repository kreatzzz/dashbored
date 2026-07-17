import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { syncPortainerLaunchers } from "@/lib/launchers";
import { prisma } from "@/lib/prisma";
import { isTrustedRequestOrigin } from "@/lib/request-origin";

const requestSchema = z.object({ providerId: z.string().min(1).max(128) });

/** Manually refresh the inventory for one Portainer provider. */
export async function POST(request: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTrustedRequestOrigin(request.url, requestHeaders)) return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const provider = await prisma.serviceInstance.findUnique({ where: { id: parsed.data.providerId } });
  if (!provider || provider.adapterType !== "portainer") return NextResponse.json({ error: "Portainer provider not found" }, { status: 404 });
  try {
    return NextResponse.json(await syncPortainerLaunchers(provider));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Launcher discovery failed" }, { status: 502 });
  }
}
