/**
 * Game Log category filters — public athlete profile + private dashboard.
 * Categories are display labels derived from XP Source / public reason only.
 * Never expose Source Keys or Airtable record ids through this module.
 */

import type { XpEventSummary } from "@/types/xp";

/** Canonical filter ids used in UI + public API `category` query param. */
export const GAME_LOG_CATEGORY_IDS = [
  "shooting_submission",
  "homework",
  "video_feedback",
  "zoom",
  "streak",
  "weekly_threshold",
  "shot_milestone",
  "perfect_week",
  "manual_award",
] as const;

export type GameLogCategoryId = (typeof GAME_LOG_CATEGORY_IDS)[number];

export type GameLogCategoryOption = {
  id: GameLogCategoryId;
  label: string;
  /** Safe to offer on the public athlete Game Log. */
  publicSafe: boolean;
};

/**
 * Parent-facing filter chips. Labels match the product vocabulary Mike requested.
 * All nine are public-safe: they map from XP Source / XP Reason Public already
 * shown on the public Game Log (no Source Keys, no internal ids).
 */
export const GAME_LOG_CATEGORY_OPTIONS: readonly GameLogCategoryOption[] = [
  { id: "shooting_submission", label: "Shooting Submission", publicSafe: true },
  { id: "homework", label: "Homework", publicSafe: true },
  { id: "video_feedback", label: "Video Feedback", publicSafe: true },
  { id: "zoom", label: "Zoom", publicSafe: true },
  { id: "streak", label: "Streak", publicSafe: true },
  { id: "weekly_threshold", label: "Weekly Threshold", publicSafe: true },
  { id: "shot_milestone", label: "Shot Milestone", publicSafe: true },
  { id: "perfect_week", label: "Perfect Week", publicSafe: true },
  { id: "manual_award", label: "Manual Award", publicSafe: true },
] as const;

export const PUBLIC_GAME_LOG_CATEGORY_OPTIONS = GAME_LOG_CATEGORY_OPTIONS.filter(
  (option) => option.publicSafe,
);

export const PRIVATE_GAME_LOG_CATEGORY_OPTIONS = GAME_LOG_CATEGORY_OPTIONS;

const CATEGORY_ID_SET = new Set<string>(GAME_LOG_CATEGORY_IDS);

export function isGameLogCategoryId(value: string | null | undefined): value is GameLogCategoryId {
  return Boolean(value && CATEGORY_ID_SET.has(value));
}

/** Parse public API / UI category query. Unknown values → null (treat as All). */
export function parseGameLogCategoryParam(raw: string | null | undefined): GameLogCategoryId | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "all") return null;
  return isGameLogCategoryId(trimmed) ? trimmed : null;
}

/**
 * Classify an XP row into one Game Log category.
 * Order matters: weekly threshold before milestone; video before generic submission.
 */
export function classifyGameLogCategory(row: XpEventSummary): GameLogCategoryId | null {
  const source = String(row.sourceLabel ?? "").toLowerCase();
  const reason = String(row.reasonPublic ?? "").toLowerCase();
  const hay = `${source} ${reason}`;

  if (source.includes("video") || /video\s+(submission|feedback)/i.test(hay)) {
    return "video_feedback";
  }
  if (source.includes("homework") || /\bhomework\b/.test(hay)) {
    return "homework";
  }
  if (source.includes("zoom") || /\bzoom\b/.test(hay)) {
    return "zoom";
  }
  if (source.includes("perfect week") || /perfect\s+week/.test(hay)) {
    return "perfect_week";
  }
  if (source.includes("weekly threshold") || /weekly\s+(threshold|shot\s+goal|target)/.test(hay)) {
    return "weekly_threshold";
  }
  if (source.includes("milestone") || /shot\s+milestone|\bmilestone\b/.test(hay)) {
    return "shot_milestone";
  }
  if (source.includes("streak") || /\bstreak\b/.test(hay)) {
    return "streak";
  }
  if (
    source.includes("manual bonus") ||
    source.includes("manual award") ||
    /manual\s+(bonus|award)/.test(hay)
  ) {
    return "manual_award";
  }
  if (
    source.includes("submission") ||
    source.includes("shooting base") ||
    /shooting\s+submission/.test(hay)
  ) {
    return "shooting_submission";
  }

  return null;
}

export function filterXpRowsByCategory(
  rows: XpEventSummary[],
  category: GameLogCategoryId | null,
): XpEventSummary[] {
  if (!category) return rows;
  return rows.filter((row) => classifyGameLogCategory(row) === category);
}

export function gameLogCategoryLabel(category: GameLogCategoryId | null): string {
  if (!category) return "All";
  return GAME_LOG_CATEGORY_OPTIONS.find((option) => option.id === category)?.label ?? "All";
}
