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
    const result = await authClient.signIn.email({ email: String(formData.get("email")), password: String(formData.get("password")), rememberMe: true });
    setLoading(false);
    if (result.error) return setError(result.error.message ?? "Sign in failed");
    router.push("/dashboard"); router.refresh();
  }

  async function signInPasskey() {
    setError("");
    const result = await authClient.signIn.passkey({ autoFill: false });
    if (result?.error) return setError(result.error.message ?? "Passkey sign in failed");
    router.push("/dashboard"); router.refresh();
  }

  return <div>
    <p className="text-sm text-muted-foreground">Dashbored</p>
    <h2 className="mt-2 text-balance text-3xl font-semibold leading-[1.1] tracking-[-.035em]">Welcome back</h2>
    <p className="mt-2 max-w-[48ch] text-pretty text-sm leading-6 text-muted-foreground">Sign in to access your private infrastructure.</p>
    <form action={signIn} className="mt-8 space-y-4">
      <label className="block"><span className="mb-1.5 block text-xs font-medium">Email</span><Input name="email" type="email" autoComplete="username webauthn" required /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-medium">Password</span><Input name="password" type="password" autoComplete="current-password webauthn" minLength={12} required /></label>
      {error && <p role="alert" className="rounded-md bg-[#e5484d]/5 px-3 py-2 text-[13px] leading-5 text-[#c7373c] shadow-[0_0_0_1px_color-mix(in_srgb,var(--bad)_22%,transparent)]">{error}</p>}
      <Button className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={15} /> : <>Sign in <ArrowRight size={15} /></>}</Button>
    </form>
    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
    <Button variant="outline" className="w-full" onClick={signInPasskey}><Fingerprint size={15} />Use a passkey</Button>
  </div>;
}
