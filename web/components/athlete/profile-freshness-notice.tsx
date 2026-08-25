import { formatProfileFetchedAt, PROFILE_FRESHNESS_DEGRADED_MESSAGE } from "@/lib/formatters/profile-freshness";

type ProfileFreshnessNoticeProps = {
  mayBeStale: boolean;
  fetchedAt: string;
};

export function ProfileFreshnessNotice({ mayBeStale, fetchedAt }: ProfileFreshnessNoticeProps) {
  if (!mayBeStale) return null;

  const updatedLabel = formatProfileFetchedAt(fetchedAt);

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
      data-testid="profile-freshness-notice"
    >
      <p>{PROFILE_FRESHNESS_DEGRADED_MESSAGE}</p>
      {updatedLabel ? (
        <p className="mt-1 text-xs text-amber-900/90">Last checked {updatedLabel}.</p>
      ) : null}
    </div>
  );
}
