/** XP event and progression types — labels aligned with XP Events → XP Source options. */

/**
 * Canonical XP Source single-select values used by V2 automations.
 * Display helpers should prefer these strings over Softr-era aliases.
 */
export type XpSourceLabel =
  | "Submission Base"
  | "Homework Completion"
  | "Video Submission"
  | "Perfect Week"
  | "Shot Milestone"
  | "Zoom Attendance: Base"
  | "Zoom Attendance: Bonus 2"
  | "Zoom Attendance: Bonus 3"
  | "Zoom Recording"
  | string;

/** Bucket / category labels used alongside XP Source (not always identical). */
export type XpBucket =
  | "Shooting Base"
  | "Homework Completion"
  | "Video Submission"
  | "Streak"
  | "Perfect Week"
  | "Shot Milestone"
  | "Zoom"
  | "Zoom Attendance"
  | "Achievement"
  | string;

export type XpEventSummary = {
  id: string;
  points: number;
  bucket?: XpBucket;
  /** XP Events → XP Source (public-facing source label). */
  sourceLabel?: XpSourceLabel;
  activityDate?: string;
  /** Prefer XP Reason Public when present. */
  reasonPublic?: string;
};

export type LevelDefinition = {
  id: string;
  name: string;
  sortOrder: number;
  xpRequired: number;
  description?: string;
  badgeUrl?: string;
};
