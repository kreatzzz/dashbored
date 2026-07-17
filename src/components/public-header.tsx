import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { docsUrl } from "@/lib/docs-url";

export function PublicHeader() {
  return <header className="public-header"><div className="public-shell flex h-14 items-center justify-between gap-4"><Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-blue-700)]"><BrandMark small /><span className="text-[13px] font-medium tracking-[-.01em]">Dashbored</span></Link><nav aria-label="Primary" className="hidden items-center gap-1 sm:flex"><a href={docsUrl} className="public-nav-link">Documentation</a></nav><Link href="/dashboard" className="public-console-link">Open console <ArrowUpRight size={13} /></Link></div></header>;
}
