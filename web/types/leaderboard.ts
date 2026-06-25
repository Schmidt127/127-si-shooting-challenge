import type { CatalogAttachment } from "@/types/levels";

/** Leaderboard row mapped from Airtable Enrollments. */

export type LeaderboardEntry = {
  id: string;
  rank: number;
  displayName: string;
  school: string;
  grade: string;
  level: string;
  /** Level Sort Order lookup — used for ranking; higher = higher level. */
  levelSortOrder: number;
  headshot: CatalogAttachment | null;
  xp: number;
  totalShots: number;
};
export type LeaderboardData = {
  entries: LeaderboardEntry[];
  updatedAt: string;
  seasonLabel: string;
};
