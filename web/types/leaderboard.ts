import type { GradeBandOption } from "@/lib/data/grade-bands";

/** Leaderboard row mapped from Airtable Enrollments. */
export type PublicLeaderboardHeadshot = {
  url: string;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  school: string;
  grade: string;
  /** Airtable Grade Band Label (lookup of Grade Band Name); used for band filters. */
  gradeBandLabel: string | null;
  level: string;
  headshot: PublicLeaderboardHeadshot | null;
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
  /** Active Grade Band filter options (includes All Grade Bands). */
  gradeBandOptions: GradeBandOption[];
};
