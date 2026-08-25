/** Parent-friendly timestamps for profile freshness messaging. */

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
