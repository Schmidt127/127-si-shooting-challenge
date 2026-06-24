/** Leaderboard row mapped from Airtable Enrollments. */

export type LeaderboardEntry = {
  id: string;
  rank: number;
  displayName: string;
  school: string;
  grade: string;
  level: string;
  xp: number;
  totalShots: number;
};

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  updatedAt: string;
  seasonLabel: string;
};
