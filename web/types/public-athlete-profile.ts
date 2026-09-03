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
  /** Second-row detail (left), e.g. Zoom meeting name. */
  subline?: string | null;
  /** When true, date renders on row 2 right instead of row 2 left. */
  dateOnSecondRowRight?: boolean;
  /** Optional note after the date on row 2 (e.g. Extra credit +125 XP). */
  dateTagline?: string | null;
};

export type PublicWeeklySummary = {
  key: string;
  weekLabel: string;
  weekDateRange: string | null;
  totalShots: number;
  daysLogged: number | null;
  weeklyXp: number | null;
  goalCompletionPercent: number | null;
  momentumStatus: string | null;
  homeworkCompleted: boolean | null;
  perfectWeek: boolean;
  videoCount: number | null;
  homeworkStatus: string | null;
  zoomStatus: string | null;
  perfectWeekStatusLabel: "Perfect Week" | "Not Perfect" | "In Progress";
};

export type PublicHomeworkCompletionStatus =
  | "not_started"
  | "submitted"
  | "under_review"
  | "approved"
  | "needs_revision"
  | "not_accepted";

/** One scheduled Program Homework Assignment row for this athlete's grade band. */
export type PublicHomeworkAssignment = {
  /** Opaque client key — never an Airtable record id. */
  key: string;
  /** Primary label — assignment name, not HW slot number. */
  assignmentName: string;
  /** Short instructions from Homework Library when available. */
  description: string | null;
  weekLabel: string;
  /** ISO date key (YYYY-MM-DD) from Week End Date until PHA Due Date exists. */
  dueDate: string | null;
  completionStatus: PublicHomeworkCompletionStatus;
  completionStatusLabel: string;
  submissionDate: string | null;
  /** Total XP awarded on the linked Homework Completion, when present. */
  xpAwarded: number | null;
  coachFeedback: string | null;
  /** Whether credit is eligible per due-date + existing completion/XP outcomes. */
  creditEligible: boolean | null;
  pastDue: boolean;
  lateSubmission: boolean;
  homeworkDetailHref: string | null;
  /** Parent-facing reviewer URL for submitted homework files — never direct S3/Drive. */
  viewSubmittedHomeworkHref: string | null;
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

/** Public-safe season award — never amounts, status, emails, or Airtable ids. */
export type PublicAthleteAward = {
  key: string;
  awardName: string;
  awardDate: string | null;
  scopeLabel: string | null;
  description: string | null;
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
  /** Whether additional Game Log rows are available via the pagination API. */
  activityLedgerHasMore: boolean;
  /** Opaque cursor for the next Game Log page (null when no more rows). */
  activityLedgerNextCursor: string | null;
  weekly: PublicWeeklySummary[];
  homeworkAssignments: PublicHomeworkAssignment[];
  achievements: PublicAchievement[];
  /** Season awards explicitly marked Public On Web — never private amounts/status. */
  awards: PublicAthleteAward[];
  fetchedAt: string;
  mayBeStale: boolean;
};
