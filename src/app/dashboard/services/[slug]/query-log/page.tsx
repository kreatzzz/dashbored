import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServiceContext } from "@/lib/services";
import { getAdGuardQueryLog } from "@/lib/adapters/adguard";
import type { AdGuardQueryRecord } from "@/lib/adapters/adguard";
import { PageHeader } from "@/components/page-header";
import { AdGuardQueryLog } from "@/components/adguard-query-log";
import { Button } from "@/components/ui/button";

export default async function QueryLogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "adguard-home") notFound();
  const service = await prisma.serviceInstance.findUnique({ where: { slug } });
  if (!service?.credentialId || !service.baseUrl) notFound();
  let records: AdGuardQueryRecord[] = [];
  let error = "";
  try { records = await getAdGuardQueryLog(await getServiceContext(service), 200); }
  catch (reason) { error = reason instanceof Error ? reason.message : "AdGuard Home did not respond."; }
  return <main>
    <PageHeader eyebrow="Network / AdGuard Home / Query log" title="Query log" description="Search the latest DNS requests resolved by AdGuard Home." actions={<div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link href="/dashboard/services/adguard-home"><ArrowLeft size={13} />Dashboard</Link></Button><Button asChild size="sm"><a href={`${service.launchUrl.replace(/\/$/, "")}/#logs`} target="_blank" rel="noreferrer">Open AdGuard<ArrowUpRight size={13} /></a></Button></div>} />
    <div className="mx-auto max-w-[1400px] p-5 md:p-8"><AdGuardQueryLog records={records} error={error} /></div>
  </main>;
}
