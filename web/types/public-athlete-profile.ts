/** Privacy-safe public athlete profile — only allowlisted fields. */

export type PublicAthleteIdentity = {
  slug: string;
  displayName: string;
  school: string | null;
  grade: string | null;
  seasonLabel: string;
  programLabel: string | null;
  level: string | null;
  /** Airtable Levels cover image URL for the athlete's current tier (may expire). */
  levelCoverImageUrl: string | null;
  rank: number | null;
  headshotUrl: string | null;
  progressionStatus: string | null;
};

export type PublicPerformanceSummary = {
  totalShots: number;
  lifetimeXp: number;
  currentLevel: string | null;
  currentLevelCoverImageUrl: string | null;
  xpNeededForNextLevel: number | null;
  currentStreak: number;
  longestStreak: number;
  totalSubmissions: number;
  lastSubmissionDate: string | null;
};

export type PublicShootingSplit = {
  attempts: number | null;
  makes: number | null;
  /** 0–1 ratio when attempts > 0; null when never recorded. */
  percent: number | null;
  available: boolean;
};

export type PublicShootingStats = {
  totalShots: number;
  totalMakes: number | null;
  overallFg: PublicShootingSplit;
  twoPoint: PublicShootingSplit;
  threePoint: PublicShootingSplit;
  freeThrow: PublicShootingSplit;
  hasDetailedSplits: boolean;
};

export type PublicProgression = {
  currentLevel: string | null;
  currentLevelCoverImageUrl: string | null;
  nextLevel: string | null;
  lifetimeXp: number;
  xpIntoLevel: number | null;
  xpNeededForNextLevel: number | null;
  currentLevelXpRequired: number | null;
  nextLevelXpRequired: number | null;
  targetShotGoal: number | null;
  goalMet: boolean;
  goalProgressPercent: number | null;
  progressionStatus: string | null;
  gateMissingReason: string | null;
  missingRequirements: string[];
};

export type PublicStreaks = {
  current: number;
  longest: number;
  status: string | null;
  asOfDate: string | null;
};

export type PublicActivityItem = {
  /** Opaque client key — never an Airtable record id. */
  key: string;
  kind: "submission" | "xp";
  date: string | null;
  title: string;
  detail: string | null;
  shots: number | null;
  makes: number | null;
  xp: number | null;
  hasDetailedStats: boolean;
};

export type PublicWeeklySummary = {
  key: string;
  weekLabel: string;
  totalShots: number;
  daysLogged: number | null;
  weeklyXp: number | null;
  goalCompletionPercent: number | null;
  momentumStatus: string | null;
  homeworkCompleted: boolean | null;
  perfectWeek: boolean;
};

export type PublicAchievementGroup =
  | "Streaks"
  | "Shot Milestones"
  | "Perfect Week"
  | "Challenge Accomplishments"
  | "Other";

export type PublicAchievement = {
  key: string;
  name: string;
  type: string | null;
  category: string | null;
  group: PublicAchievementGroup;
  unlockedAt: string | null;
  triggerValue: number | null;
  xpAwarded: number | null;
  rarity: string | null;
  badgeIconName: string | null;
};

export type PublicAthleteProfile = {
  identity: PublicAthleteIdentity;
  performance: PublicPerformanceSummary;
  shooting: PublicShootingStats;
  progression: PublicProgression;
  streaks: PublicStreaks;
  recentActivity: PublicActivityItem[];
  /** Full count of XP activity rows loaded server-side (may exceed first-page UI slice). */
  activityLedgerTotal: number;
  /** Optional integrity or pagination notice — never includes raw Airtable record IDs. */
  activityLedgerNotice: string | null;
  weekly: PublicWeeklySummary[];
  achievements: PublicAchievement[];
  fetchedAt: string;
  mayBeStale: boolean;
};
