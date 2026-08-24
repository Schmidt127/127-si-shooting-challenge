import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import {
  getLevelCoverAssetSources,
  getLevelCoverAssetSrc,
} from "@/lib/levels/level-cover-assets";

export type LevelCoverCandidate = {
  displayName: string;
  name: string;
  sortOrder?: number;
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
 * Resolve permanent repo-hosted level cover assets.
 * Expiring Airtable attachment URLs are ignored when a local asset exists.
 */
export function resolveLevelCoverImageUrl(
  _linkedCoverUrl: string | null | undefined,
  levelName: string | null | undefined,
  ladder?: LevelCoverCandidate[],
): string | null {
  void _linkedCoverUrl;

  const normalized = levelName?.trim();
  if (normalized) {
    const local = getLevelCoverAssetSrc(normalized);
    if (local) return local;
  }

  if (ladder?.length && normalized) {
    const search = normalized.toLowerCase();
    const match = ladder.find(
      (level) =>
        level.displayName.trim().toLowerCase() === search ||
        level.name.trim().toLowerCase() === search,
    );
    if (match) {
      return (
        getLevelCoverAssetSrc(match.name, match.sortOrder) ??
        getLevelCoverAssetSrc(match.displayName, match.sortOrder)
      );
    }
  }

  return null;
}

/** WebP + PNG sources for picture elements on profile and levels pages. */
export function resolveLevelCoverAssetSources(
  levelName: string | null | undefined,
  ladder?: LevelCoverCandidate[],
): ReturnType<typeof getLevelCoverAssetSources> {
  const normalized = levelName?.trim();
  if (normalized) {
    const local = getLevelCoverAssetSources(normalized);
    if (local) return local;
  }

  if (ladder?.length && normalized) {
    const search = normalized.toLowerCase();
    const match = ladder.find(
      (level) =>
        level.displayName.trim().toLowerCase() === search ||
        level.name.trim().toLowerCase() === search,
    );
    if (match) {
      return (
        getLevelCoverAssetSources(match.name, match.sortOrder) ??
        getLevelCoverAssetSources(match.displayName, match.sortOrder)
      );
    }
  }

  return null;
}

/**
 * Placeholder label when no cover image is available — uses the controlled badge ramp.
 */
export function getLevelGraphicPlaceholderLabel(levelName: string): string {
  const style = getLevelStyle(levelName);
  const label = style.label.trim();
  if (!label) return "LV";
  if (label.length <= 3) return label.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}
