import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAdapter } from "@/lib/adapters";
import { prisma } from "@/lib/prisma";
import { getServiceContext } from "@/lib/services";
import { isTrustedRequestOrigin } from "@/lib/request-origin";

const bodySchema = z.object({ action: z.string().min(1).max(50), target: z.string().max(128).optional(), confirmation: z.string().max(80) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTrustedRequestOrigin(request.url, requestHeaders)) return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const service = await prisma.serviceInstance.findUnique({ where: { id: (await params).id } });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  const adapter = getAdapter(service.adapterType);
  const allowed = await adapter.getAvailableActions(await getServiceContext(service));
  const requested = allowed.find((action) => action.id === parsed.data.action);
  if (!requested || parsed.data.confirmation !== requested.confirmation) return NextResponse.json({ error: "Confirmation did not match" }, { status: 400 });
  try {
    const result = await adapter.executeAction(await getServiceContext(service), parsed.data.action, parsed.data.target);
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: parsed.data.action, target: parsed.data.target, status: "success", ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0] } });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    await prisma.actionAudit.create({ data: { userId: session.user.id, serviceId: service.id, action: parsed.data.action, target: parsed.data.target, status: "failed", detail: { message } } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
