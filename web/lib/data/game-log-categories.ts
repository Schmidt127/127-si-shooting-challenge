/**
 * Game Log category filters — stable public slugs (never Airtable IDs).
 */

import type { XpEventSummary } from "@/types/xp";

export const GAME_LOG_CATEGORY_IDS = [
  "shooting-submission",
  "homework",
  "video-feedback",
  "zoom",
  "streak",
  "weekly-threshold",
  "shot-milestone",
  "perfect-week",
  "manual-award",
] as const;

export type GameLogCategoryId = (typeof GAME_LOG_CATEGORY_IDS)[number];

export type GameLogCategoryOption = {
  id: GameLogCategoryId;
  label: string;
  shortLabel: string;
};

/** Parent-facing filter labels (order matches product request). */
export const GAME_LOG_CATEGORY_OPTIONS: readonly GameLogCategoryOption[] = [
  { id: "shooting-submission", label: "Shooting Submission", shortLabel: "Shooting" },
  { id: "homework", label: "Homework", shortLabel: "Homework" },
  { id: "video-feedback", label: "Video Feedback", shortLabel: "Video" },
  { id: "zoom", label: "Zoom", shortLabel: "Zoom" },
  { id: "streak", label: "Streak", shortLabel: "Streak" },
  { id: "weekly-threshold", label: "Weekly Threshold", shortLabel: "Weekly" },
  { id: "shot-milestone", label: "Shot Milestone", shortLabel: "Milestone" },
  { id: "perfect-week", label: "Perfect Week", shortLabel: "Perfect" },
  { id: "manual-award", label: "Manual Award", shortLabel: "Manual" },
] as const;

const CATEGORY_ID_SET = new Set<string>(GAME_LOG_CATEGORY_IDS);

export function isGameLogCategoryId(value: string | null | undefined): value is GameLogCategoryId {
  return Boolean(value && CATEGORY_ID_SET.has(value));
}

/** Parse `?category=` — accepts slug ids only; rejects Airtable ids and unknown values. */
export function parseGameLogCategoryParam(raw: string | null | undefined): GameLogCategoryId | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.startsWith("rec") || trimmed.includes("|")) return null;
  return isGameLogCategoryId(trimmed) ? trimmed : null;
}

/**
 * Map XP Source (+ optional reason) to a Game Log filter category.
 * Returns null when the event does not fit a known filter bucket.
 */
export function resolveGameLogCategory(
  sourceLabel: string | null | undefined,
  reasonPublic?: string | null,
): GameLogCategoryId | null {
  const source = String(sourceLabel ?? "").trim().toLowerCase();
  const reason = String(reasonPublic ?? "").trim().toLowerCase();
  const blob = `${source} ${reason}`;

  if (source.includes("manual bonus") || /manual bonus|manual award/.test(blob)) {
    return "manual-award";
  }
  if (source.includes("perfect week") || /\bperfect week\b/.test(reason)) {
    return "perfect-week";
  }
  if (source.includes("weekly threshold") || /weekly shot goal|weekly threshold/.test(reason)) {
    return "weekly-threshold";
  }
  if (source.includes("milestone") || /\bshot milestone\b|\b% milestone\b/.test(reason)) {
    return "shot-milestone";
  }
  if (source.includes("streak") || /\bstreak\b/.test(reason)) {
    return "streak";
  }
  if (source.includes("zoom") || /\bzoom\b/.test(reason)) {
    return "zoom";
  }
  if (source.includes("video") || /\bvideo feedback\b|\bvideo submission\b/.test(reason)) {
    return "video-feedback";
  }
  if (source.includes("homework") || /\bhomework\b/.test(reason)) {
    return "homework";
  }
  if (
    source.includes("submission") ||
    source.includes("shooting base") ||
    /shooting submission|shot submission/.test(reason)
  ) {
    return "shooting-submission";
  }

  return null;
}

export function xpEventMatchesGameLogCategory(
  row: Pick<XpEventSummary, "sourceLabel" | "reasonPublic">,
  category: GameLogCategoryId,
): boolean {
  return resolveGameLogCategory(row.sourceLabel, row.reasonPublic) === category;
}

export function filterXpSummariesByCategory<T extends Pick<XpEventSummary, "sourceLabel" | "reasonPublic">>(
  rows: readonly T[],
  category: GameLogCategoryId | null,
): T[] {
  if (!category) return [...rows];
  return rows.filter((row) => xpEventMatchesGameLogCategory(row, category));
}
