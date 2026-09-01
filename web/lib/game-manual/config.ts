/** Approved Adobe Publish Online URL for the Shooting Challenge game manual. */
export const GAME_MANUAL_PUBLISH_URL =
  "https://indd.adobe.com/view/f3dcc153-0837-461b-9e81-e3fa11558e84";

function normalizeHttpUrl(raw: string | undefined): string | null {
  const url = raw?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/** Public URL for the game manual — env override, then approved Publish Online default. */
export function getGameManualUrl(): string | null {
  return normalizeHttpUrl(process.env.NEXT_PUBLIC_GAME_MANUAL_URL) ?? GAME_MANUAL_PUBLISH_URL;
}
