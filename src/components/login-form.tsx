"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Fingerprint, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn(formData: FormData) {
    setLoading(true); setError("");
    try {
      const result = await authClient.signIn.email({ email: String(formData.get("email")), password: String(formData.get("password")), rememberMe: true });
      if (result.error) return setError(result.error.message ?? "Sign in failed");
      router.push("/dashboard"); router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function signInPasskey() {
    setError("");
    const result = await authClient.signIn.passkey({ autoFill: false });
    if (result?.error) return setError(result.error.message ?? "Passkey sign in failed");
    router.push("/dashboard"); router.refresh();
  }

  return <div>
    <p className="mono text-[10px] tracking-[.2em] text-[#70706b]">AUTHENTICATION REQUIRED</p>
    <h2 className="mt-3 text-3xl font-semibold tracking-[-.045em]">Welcome back.</h2>
    <p className="mt-2 text-sm leading-6 text-[#70706b]">Sign in to access your private infrastructure.</p>
    <form action={signIn} className="mt-8 space-y-4">
      <label className="block"><span className="mb-1.5 block text-xs font-medium">Email</span><Input className="border-[#d9d9d3] bg-white text-[#0b0b0a] placeholder:text-[#aaa9a1]" name="email" type="email" autoComplete="username webauthn" required /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-medium">Password</span><Input className="border-[#d9d9d3] bg-white text-[#0b0b0a] placeholder:text-[#aaa9a1]" name="password" type="password" autoComplete="current-password webauthn" minLength={12} required /></label>
      {error && <p role="alert" className="rounded-md border border-[#d14a3c]/20 bg-[#d14a3c]/5 px-3 py-2 text-xs text-[#a53127]">{error}</p>}
      <Button className="w-full bg-[#0b0b0a] text-white hover:bg-[#292925]" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={15} /> : <>Sign in <ArrowRight size={15} /></>}</Button>
    </form>
    <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#aaa9a1]"><span className="h-px flex-1 bg-[#deded8]" />or<span className="h-px flex-1 bg-[#deded8]" /></div>
    <Button variant="outline" className="w-full border-[#d9d9d3] bg-white text-[#0b0b0a] hover:bg-[#fafaf7]" onClick={signInPasskey}><Fingerprint size={15} />Use a passkey</Button>
  </div>;
}
