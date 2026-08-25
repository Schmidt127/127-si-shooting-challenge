"use client";

import { useEffect, useState } from "react";

import { formatProfileFetchedAt } from "@/lib/formatters/profile-freshness";

type ProfileFreshnessCheckedAtProps = {
  fetchedAt: string;
};

/**
 * Renders the "Last checked …" line after hydration so locale/time-zone labels
 * match the browser (SSR + Playwright use different Intl output than Node).
 */
export function ProfileFreshnessCheckedAt({ fetchedAt }: ProfileFreshnessCheckedAtProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatProfileFetchedAt(fetchedAt));
  }, [fetchedAt]);

  if (!label) return null;

  return (
    <p className="mt-1 text-xs text-amber-900/90">
      Last checked {label}.
    </p>
  );
}
