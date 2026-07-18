import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Unauthenticated, intentionally minimal readiness endpoint.
 *
 * Docker and a private reverse proxy can use this to distinguish a running
 * Next.js process from a dashboard that can actually reach PostgreSQL. Do not
 * add version, configuration, credentials, or service health details here.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: noStore });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: noStore });
  }
}
