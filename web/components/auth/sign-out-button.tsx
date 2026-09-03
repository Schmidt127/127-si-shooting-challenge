"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
      const response = await fetch(`${basePath}/api/auth/sign-out`, { method: "POST" });
      const payload = (await response.json()) as { redirectTo?: string };
      router.push(payload.redirectTo ?? "/dashboard/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onSignOut} disabled={pending} className="min-h-11">
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
