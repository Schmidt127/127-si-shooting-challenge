import { getLevelStyle } from "@/lib/leaderboard/level-styles";

export type LevelCoverCandidate = {
  displayName: string;
  name: string;
  coverImageUrl: string | null;
};

/**
 * Meaningful alt text for level cover graphics on public pages.
 */
export function getLevelGraphicAltText(levelName: string): string {
  const trimmed = levelName.trim();
  if (!trimmed) return "Athlete level emblem";
  return `${trimmed} level emblem`;
}

/**
 * Prefer the enrollment-linked cover URL; fall back to ladder lookup by display name.
 */
export function resolveLevelCoverImageUrl(
  linkedCoverUrl: string | null | undefined,
  levelName: string | null | undefined,
  ladder?: LevelCoverCandidate[],
): string | null {
  const linked = linkedCoverUrl?.trim();
  if (linked) return linked;

  const normalized = levelName?.trim().toLowerCase();
  if (!normalized || !ladder?.length) return null;

  const match = ladder.find(
    (level) =>
      level.displayName.trim().toLowerCase() === normalized ||
      level.name.trim().toLowerCase() === normalized,
  );
  const ladderUrl = match?.coverImageUrl?.trim();
  return ladderUrl || null;
}

/**
 * Placeholder label when no cover image is available — uses the controlled badge ramp.
 * Never emits the ambiguous "LV" abbreviation; falls back to a neutral dash.
 */
export function getLevelGraphicPlaceholderLabel(
  levelName: string,
  levelNumber?: number | null,
): string {
  if (levelNumber && levelNumber > 0) return String(levelNumber);

  const style = getLevelStyle(levelName);
  const label = style.label.trim();
  if (!label || label === "Unranked") return "—";
  if (label.length <= 3) return label.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}
