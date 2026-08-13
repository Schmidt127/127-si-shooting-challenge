/** Leaderboard row mapped from Airtable Enrollments. */
export type PublicLeaderboardHeadshot = {
  url: string;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  school: string;
  grade: string;
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
};
