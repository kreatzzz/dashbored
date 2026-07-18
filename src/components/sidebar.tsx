"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LayoutGrid, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app-icons";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StatusDot } from "@/components/ui/status-dot";

type Category = { id: string; name: string; slug: string; icon: string; services: Array<{ id: string; name: string; slug: string; icon: string; lastStatus: string }> };

export function Sidebar({ categories, email }: { categories: Category[]; email: string }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
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
      <div className="p-3"><button onClick={() => setSearchOpen(true)} className="flex h-9 w-full items-center gap-2 rounded-md bg-background px-2.5 text-xs text-muted-foreground shadow-[var(--surface-shadow)] transition-[scale,box-shadow,color] duration-150 ease-out active:scale-[0.96] hover:text-foreground hover:shadow-[var(--surface-shadow-hover)]"><Search size={13} />Search services<span className="mono ml-auto text-[10px]">⌘K</span></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{navigation}</div>
      <div className="border-t border-border p-3">
        <Link href="/dashboard/settings" className={cn(itemClass, path === "/dashboard/settings" && "bg-hover font-medium text-foreground")}><Settings size={14} />Settings</Link>
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-3"><div className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">{email.slice(0,2).toUpperCase()}</div><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{email}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await authClient.signOut(); router.push("/login"); router.refresh(); }} aria-label="Sign out"><LogOut size={13} /></Button></div>
      </div>
    </aside>
    <ServiceSearchDialog open={searchOpen} onOpenChange={setSearchOpen} categories={categories} />
  </>;
}

function ServiceSearchDialog({ open, onOpenChange, categories }: { open: boolean; onOpenChange: (open: boolean) => void; categories: Category[] }) {
  const [query, setQuery] = useState("");
  const items = useMemo<Array<{ name: string; description: string; href: string; icon: string; status?: string }>>(() => [
    { name: "Overview", description: "Live service health", href: "/dashboard", icon: "dashboard" },
    { name: "Launcher", description: "Private application catalog", href: "/dashboard/launcher", icon: "container" },
    { name: "Settings", description: "Connections and security", href: "/dashboard/settings", icon: "settings" },
    ...categories.flatMap((category) => category.services.map((service) => ({ name: service.name, description: category.name, href: `/dashboard/services/${service.slug}`, icon: service.icon, status: service.lastStatus }))),
  ], [categories]);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(term)) : items;
  }, [items, query]);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg overflow-hidden p-0"><DialogTitle className="sr-only">Search Dashbored</DialogTitle>
    <div className="flex items-center gap-3 border-b border-border px-4"><Search size={16} className="shrink-0 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Dashbored" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><kbd className="mono rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd></div>
    <div className="max-h-[360px] overflow-y-auto p-2">{matches.length ? matches.map((item) => <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-hover"><div className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background"><AppIcon name={item.icon} size={14} /></div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.description}</p></div>{item.status && <StatusDot status={item.status} />}</Link>) : <div className="px-3 py-10 text-center"><p className="text-sm font-medium">Nothing found</p><p className="mt-1 text-xs text-muted-foreground">Try a service, page, or category name.</p></div>}</div>
  </DialogContent></Dialog>;
}
