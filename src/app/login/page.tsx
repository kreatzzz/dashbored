import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return <main className="grid min-h-screen grid-cols-1 bg-[#f7f7f4] text-[#0b0b0a] lg:grid-cols-[1.1fr_.9fr]">
    <section className="relative hidden overflow-hidden border-r border-black/10 p-12 lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(#a8a89f_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex items-center gap-3"><BrandMark /><span className="text-sm font-semibold">DASHBORED / HOME OPS</span></div>
      <div className="relative max-w-xl">
        <p className="mono mb-5 text-[11px] tracking-[.22em] text-[#70706b]">PRIVATE CONTROL PLANE</p>
        <h1 className="text-balance text-6xl font-semibold leading-[.98] tracking-[-.065em]">Everything at home,<br />within reach.</h1>
        <div className="mt-10 flex items-center gap-3 text-sm text-[#70706b]"><span className="h-px w-12 bg-[#aaa9a1]" />LAN / TAILSCALE ONLY</div>
      </div>
      <p className="relative mono text-[10px] tracking-widest text-[#8f8f86]">PRIVATE NETWORK · DASHBORED</p>
    </section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-sm"><div className="mb-10 lg:hidden"><BrandMark /></div><LoginForm /></div></section>
  </main>;
}
