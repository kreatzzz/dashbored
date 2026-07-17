import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.1fr_.9fr]">
    <section className="relative hidden overflow-hidden border-r border-border bg-sidebar p-12 lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,color-mix(in_srgb,var(--ds-blue-700)_7%,transparent),transparent_42%)]" />
      <div className="auth-enter relative flex items-center gap-3"><BrandMark /><span className="text-sm font-medium">Dashbored Home Server</span></div>
      <div className="relative max-w-xl">
        <p className="mb-4 text-sm text-muted-foreground">Private control plane</p>
        <h1 className="auth-enter auth-enter-delay-1 text-balance text-5xl font-semibold leading-[1.04] tracking-[-.05em]">Everything at home,<br />within reach.</h1>
        <p className="auth-enter auth-enter-delay-2 mt-6 max-w-[60ch] text-pretty text-sm leading-6 text-muted-foreground">Monitor services, review infrastructure health, and open every application from one secure dashboard.</p>
      </div>
      <p className="auth-enter auth-enter-delay-3 mono relative text-xs text-muted-foreground">Private LAN · Tailscale</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-8"><div className="auth-enter auth-enter-delay-1 w-full max-w-md rounded-xl bg-card p-7 shadow-[var(--surface-shadow)] sm:p-9"><div className="mb-10 lg:hidden"><BrandMark /></div><LoginForm /></div></section>
  </main>;
}
