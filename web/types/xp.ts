/** XP event and progression types. */

export type XpBucket = "Submission" | "Homework" | "Video Feedback" | "Streak" | "Achievement" | string;

export type XpEventSummary = {
  id: string;
  points: number;
  bucket?: XpBucket;
  sourceLabel?: string;
  activityDate?: string;
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
