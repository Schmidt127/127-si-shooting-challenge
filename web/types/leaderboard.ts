/** Leaderboard row types. */

export type LeaderboardEntry = {
  rank: number;
  athleteId: string;
  slug: string;
  displayName: string;
  totalXp: number;
  currentLevel?: string;
  weeklyXp?: number;
  streak?: number;
};

export type LeaderboardScope = "season" | "week" | "grade-band";
