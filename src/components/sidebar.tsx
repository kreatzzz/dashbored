"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LayoutGrid, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app-icons";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

type Category = { id: string; name: string; slug: string; icon: string; services: Array<{ id: string; name: string; slug: string; icon: string; lastStatus: string }> };

export function Sidebar({ categories, email }: { categories: Category[]; email: string }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const itemClass = "group relative flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] leading-none text-muted-foreground transition-[background-color,color] duration-150 hover:bg-hover hover:text-foreground";
  const navigation = <>
    <Link href="/dashboard" onClick={() => setOpen(false)} className={cn(itemClass, path === "/dashboard" && "bg-hover font-medium text-foreground")}><AppIcon name="dashboard" size={15} />Overview</Link>
    <Link href="/dashboard/launcher" onClick={() => setOpen(false)} className={cn(itemClass, "mb-4", path === "/dashboard/launcher" && "bg-hover font-medium text-foreground")}><LayoutGrid size={14} />Launcher</Link>
    <nav className="space-y-4">
      {categories.map((category) => <section key={category.id}>
        <p className="mb-1 px-2.5 text-[11px] font-medium tracking-[.01em] text-muted-foreground">{category.name}</p>
        <div>{category.services.map((service) => <Link key={service.id} href={`/dashboard/services/${service.slug}`} onClick={() => setOpen(false)} className={cn(itemClass, path === `/dashboard/services/${service.slug}` && "bg-hover font-medium text-foreground")}><AppIcon name={service.icon} size={14} className="text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{service.name}</span><StatusDot status={service.lastStatus} /></Link>)}</div>
      </section>)}
    </nav>
  </>;
  return <>
    <button className="fixed left-1 top-1 z-40 grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.96] hover:bg-hover hover:text-foreground lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={17} /></button>
    <button className={cn("fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ease-out lg:hidden", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} onClick={() => setOpen(false)} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-sidebar transition-transform duration-[220ms] ease-[var(--ease-drawer)] lg:translate-x-0", !open && "-translate-x-full lg:translate-x-0")}>
      <div className="flex h-12 items-center gap-2.5 border-b border-border px-3"><BrandMark small /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-tight">Dashbored</p><p className="truncate text-[11px] text-muted-foreground">Home Server</p></div><ChevronsUpDown size={14} className="text-muted-foreground" /><button className="ml-1 grid h-10 w-10 place-items-center rounded-md transition-[scale,background-color] duration-150 active:scale-[0.96] hover:bg-hover lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={17} /></button></div>
      <div className="p-3"><button className="flex h-9 w-full items-center gap-2 rounded-md bg-background px-2.5 text-xs text-muted-foreground shadow-[var(--surface-shadow)] transition-[scale,box-shadow,color] duration-150 ease-out active:scale-[0.96] hover:text-foreground hover:shadow-[var(--surface-shadow-hover)]"><Search size={13} />Search services<span className="mono ml-auto text-[10px]">⌘K</span></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{navigation}</div>
      <div className="border-t border-border p-3">
        <Link href="/dashboard/settings" className={cn(itemClass, path === "/dashboard/settings" && "bg-hover font-medium text-foreground")}><Settings size={14} />Settings</Link>
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-3"><div className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">{email.slice(0,2).toUpperCase()}</div><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{email}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await authClient.signOut(); router.push("/login"); router.refresh(); }} aria-label="Sign out"><LogOut size={13} /></Button></div>
      </div>
    </aside>
  </>;
}
