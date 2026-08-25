/** Parent-friendly timestamps and freshness messaging for public athlete profiles. */

export function formatProfileFetchedAt(fetchedAt: string): string | null {
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return null;

  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  });
}

/** Parent-facing banner when profile data could not be loaded completely. */
export const PROFILE_FRESHNESS_DEGRADED_MESSAGE =
  "Some profile details could not be loaded right now. Please check again shortly.";

/** Parent-facing homework empty-state when the homework source is unavailable. */
export const PROFILE_HOMEWORK_UNAVAILABLE_MESSAGE =
  "Homework assignments are temporarily unavailable. Other profile information is still shown below.";

type ResolvePublicProfileMayBeStaleInput = {
  homeworkLoadFailed?: boolean;
};

/**
 * Whether the profile-level freshness banner should appear.
 * Internal XP reconciliation and loader fallback warnings do not qualify.
 */
export function resolvePublicProfileMayBeStale(
  input: ResolvePublicProfileMayBeStaleInput,
): boolean {
  return Boolean(input.homeworkLoadFailed);
}

type ResolvePublicActivityLedgerNoticeInput = {
  loaderWarning?: string;
  missingXpSubmissionCount: number;
};

/**
 * Public Game Log notice text. Internal loader diagnostics stay in server logs only.
 */
export function resolvePublicActivityLedgerNotice(
  input: ResolvePublicActivityLedgerNoticeInput,
): string | null {
  void input;
  return null;
}
