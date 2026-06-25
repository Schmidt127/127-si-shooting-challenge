/** Public URL for the Shooting Challenge game manual (Adobe Document Cloud, PDF, etc.). */
export function getGameManualUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GAME_MANUAL_URL?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}
