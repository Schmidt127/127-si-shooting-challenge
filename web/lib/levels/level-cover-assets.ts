import { withBasePath } from "@/lib/app-config";

/** Permanent level cover PNGs in `public/images/levels/` (match Airtable Level Name / sort order). */
export const LEVEL_COVER_FILES_BY_SORT: Record<number, string> = {
  1: "01_beginner",
  2: "02_rookie_shooter",
  3: "03_developing_shooter",
  4: "04_consistent_shooter",
  5: "05_dangerous_shooter",
  6: "06_hot_hand",
  7: "07_deadeye",
  8: "08_sharpshooter",
  9: "09_professional",
  10: "10_all_star",
  11: "11_legend",
  12: "12_goat",
};

/** Maps Airtable `Level Name` (and slug aliases) to repo filenames without extension. */
export const LEVEL_COVER_FILES_BY_NAME: Record<string, string> = {
  Beginner: "01_beginner",
  "01_beginner": "01_beginner",
  "Rookie Shooter": "02_rookie_shooter",
  "02_rookie_shooter": "02_rookie_shooter",
  "Developing Shooter": "03_developing_shooter",
  "03_developing_shooter": "03_developing_shooter",
  "Consistent Shooter": "04_consistent_shooter",
  "04_consistent_shooter": "04_consistent_shooter",
  "Dangerous Shooter": "05_dangerous_shooter",
  "05_dangerous_shooter": "05_dangerous_shooter",
  "Hot Hand": "06_hot_hand",
  "06_hot_hand": "06_hot_hand",
  Deadeye: "07_deadeye",
  "07_deadeye": "07_deadeye",
  Sharpshooter: "08_sharpshooter",
  "08_sharpshooter": "08_sharpshooter",
  Pro: "09_professional",
  Professional: "09_professional",
  "09_professional": "09_professional",
  "All-Star": "10_all_star",
  "10_all_star": "10_all_star",
  Legend: "11_legend",
  "11_legend": "11_legend",
  "G.O.A.T.": "12_goat",
  GOAT: "12_goat",
  "12_goat": "12_goat",
};

const LEVEL_COVER_DIR = "/images/levels";

/**
 * Resolve the permanent repo filename stem for a level cover image.
 */
export function resolveLevelCoverFileStem(
  levelName: string,
  sortOrder?: number,
): string | null {
  const trimmed = levelName.trim();
  if (!trimmed && !sortOrder) return null;

  if (trimmed) {
    const direct = LEVEL_COVER_FILES_BY_NAME[trimmed];
    if (direct) return direct;

    const lower = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(LEVEL_COVER_FILES_BY_NAME)) {
      if (key.toLowerCase() === lower) return value;
    }

    if (/^\d{2}_[a-z0-9_]+$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }

  if (sortOrder && sortOrder > 0) {
    return LEVEL_COVER_FILES_BY_SORT[sortOrder] ?? null;
  }

  return null;
}

/** Root-relative public path (without basePath) for a level cover PNG. */
export function getLevelCoverAssetPath(levelName: string, sortOrder?: number): string | null {
  const stem = resolveLevelCoverFileStem(levelName, sortOrder);
  return stem ? `${LEVEL_COVER_DIR}/${stem}.png` : null;
}

/** Full path for Next.js static assets under `/shoot`. */
export function getLevelCoverAssetSrc(levelName: string, sortOrder?: number): string | null {
  const path = getLevelCoverAssetPath(levelName, sortOrder);
  return path ? withBasePath(path) : null;
}

export function getLevelCoverAltText(displayName: string, levelName: string): string {
  const label = displayName.trim() || levelName.trim();
  return label ? `${label} level emblem` : "Level emblem";
}
