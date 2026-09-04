"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toAppRouterHref } from "@/lib/app-config";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
      const response = await fetch(`${basePath}/api/auth/sign-out`, { method: "POST" });
      const payload = (await response.json()) as { redirectTo?: string };
      // Must stay app-relative — router.push prepends basePath (/shoot).
      router.push(toAppRouterHref(payload.redirectTo ?? "/dashboard/sign-in"));
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
