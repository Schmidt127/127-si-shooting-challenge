"use client";

import { useEffect, useState } from "react";

import { ProfileFreshnessCheckedAt } from "@/components/athlete/profile-freshness-checked-at";
import { PROFILE_FRESHNESS_DEGRADED_MESSAGE } from "@/lib/formatters/profile-freshness";

type ProfileFreshnessNoticeProps = {
  mayBeStale: boolean;
  fetchedAt: string;
};

/**
 * Degraded-mode banner only. Render after mount so SSR and hydration stay aligned
 * when homework source fails on production athlete profiles.
 */
export function ProfileFreshnessNotice({ mayBeStale, fetchedAt }: ProfileFreshnessNoticeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mayBeStale || !mounted) return null;

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
      data-testid="profile-freshness-notice"
    >
      <p>{PROFILE_FRESHNESS_DEGRADED_MESSAGE}</p>
      <ProfileFreshnessCheckedAt fetchedAt={fetchedAt} />
    </div>
  );
}
