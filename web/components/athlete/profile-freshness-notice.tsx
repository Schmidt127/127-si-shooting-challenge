import { ProfileFreshnessCheckedAt } from "@/components/athlete/profile-freshness-checked-at";
import { PROFILE_FRESHNESS_DEGRADED_MESSAGE } from "@/lib/formatters/profile-freshness";

type ProfileFreshnessNoticeProps = {
  mayBeStale: boolean;
  fetchedAt: string;
};

export function ProfileFreshnessNotice({ mayBeStale, fetchedAt }: ProfileFreshnessNoticeProps) {
  if (!mayBeStale) return null;

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
