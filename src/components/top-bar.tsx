"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type ServiceCrumb = { name: string; slug: string; category: string };

export function TopBar({ services }: { services: ServiceCrumb[] }) {
  const pathname = usePathname();
  const slug = pathname.startsWith("/dashboard/services/") ? pathname.split("/")[3] : null;
  const service = services.find((item) => item.slug === slug);
  const servicePage = pathname.split("/")[4];
  const crumbs = pathname === "/dashboard/settings"
    ? [{ label: "Dashbored", href: "/dashboard" }, { label: "Settings" }]
    : service
      ? [{ label: "Dashbored", href: "/dashboard" }, { label: service.category }, ...(servicePage ? [{ label: service.name, href: `/dashboard/services/${service.slug}` }, { label: servicePage === "query-log" ? "Query log" : servicePage }] : [{ label: service.name }])]
      : pathname === "/dashboard/launcher" ? [{ label: "Dashbored", href: "/dashboard" }, { label: "Launcher" }] : [{ label: "Dashbored", href: "/dashboard" }, { label: "Overview" }];

  return <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/90 pl-16 pr-2 backdrop-blur-xl lg:px-4">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px] leading-none">
      {crumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
        {index > 0 && <ChevronRight size={13} className="shrink-0 text-muted-foreground" />}
        {crumb.href ? <Link href={crumb.href} className="truncate rounded-sm px-1 py-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground">{crumb.label}</Link> : <span className="truncate px-1 py-1.5 font-medium text-foreground">{crumb.label}</span>}
      </span>)}
    </nav>
    <ThemeToggle />
  </div>;
}
