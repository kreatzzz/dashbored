import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveLauncherEntry, updateLauncherOverrides } from "@/lib/launchers";
import { isTrustedRequestOrigin } from "@/lib/request-origin";

const patchSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  launchUrl: z.string().url().max(2048).nullable().optional(),
  hidden: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "No changes requested");

/** User customizations are stored separately so the next inventory sync keeps them. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTrustedRequestOrigin(request.url, requestHeaders)) return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const entry = await updateLauncherOverrides((await params).id, parsed.data);
    return NextResponse.json(resolveLauncherEntry(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update launcher";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
