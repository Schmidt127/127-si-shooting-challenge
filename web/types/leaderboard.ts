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
  /**
   * When set, public UIs may link the athlete name to `/athletes/[slug]`.
   * Null when the enrollment has no enabled public profile.
   */
  publicProfileSlug: string | null;
};
export type LeaderboardData = {
  entries: LeaderboardEntry[];
  updatedAt: string;
  seasonLabel: string;
};
