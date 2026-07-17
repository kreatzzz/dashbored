"use client";

import { Fingerprint, LoaderCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const subscribeToSecureContext = () => () => {};

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const secure = useSyncExternalStore(subscribeToSecureContext, () => window.isSecureContext, () => false);
  async function enroll() {
    setLoading(true);
    const result = await authClient.passkey.addPasskey({ name: "Dashbored passkey" });
    setLoading(false);
    if (result?.error) return toast.error(result.error.message ?? "Passkey enrollment failed");
    toast.success("Passkey added");
  }
  return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Fingerprint size={15} /><h2 className="text-sm font-medium">Passkey</h2></div><p className="mt-1 text-[13px] text-muted-foreground">{secure ? "Add a phishing-resistant sign-in method for this secure hostname." : "Available after the dashboard is placed behind private HTTPS."}</p></div><Button variant="outline" size="sm" disabled={!secure || loading} onClick={enroll}>{loading && <LoaderCircle size={13} className="animate-spin" />}Add passkey</Button></div>;
}
