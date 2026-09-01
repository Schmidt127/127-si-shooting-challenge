/**
 * Weekly Athlete Summary email content helpers (072 build + 074 Hub payload).
 * Pure functions for Denver-safe week metrics, goal %, video rows, and Zoom summary.
 */

"use strict";

const {
  classifySecureVideoUrl,
  isValidLambdaViewerUrl,
  redactSecureVideoUrl,
} = require("../secure-video-url");

const DEFAULT_TIME_ZONE = "America/Denver";

/**
 * Denver calendar date key (YYYY-MM-DD) from ISO / Date / display text.
 * @param {unknown} value
 * @param {string} [timeZone]
 */
function toDateKey(value, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = String(value).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const localMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (localMatch) {
      return `${localMatch[3]}-${localMatch[1].padStart(2, "0")}-${localMatch[2].padStart(2, "0")}`;
    }
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/**
 * Prefer raw Activity Date object, then display text fallback.
 * @param {unknown} rawValue
 * @param {unknown} textValue
 * @param {string} [timeZone]
 */
function toSafeDateKey(rawValue, textValue, timeZone = DEFAULT_TIME_ZONE) {
  const fromRaw = toDateKey(rawValue, timeZone);
  if (fromRaw) return fromRaw;
  return toDateKey(textValue, timeZone);
}

/** @param {string} dateKey @param {string} startKey @param {string} endKey */
function isDateKeyInWeekRange(dateKey, startKey, endKey) {
  if (!dateKey || !startKey || !endKey) return true;
  return dateKey >= startKey && dateKey <= endKey;
}

/**
 * Count distinct qualifying activity days from countable submissions in the official week window.
 * @param {Array<{ activityDateKey?: string, shots?: number, makes?: number }>} submissions
 */
function countDistinctQualifyingDays(submissions) {
  const keys = new Set();
  for (const row of submissions || []) {
    if (row?.activityDateKey) keys.add(row.activityDateKey);
  }
  return keys.size;
}

/** @param {Array<{ shots?: number }>} submissions */
function sumWeeklyShots(submissions) {
  return (submissions || []).reduce((sum, row) => sum + Number(row?.shots || 0), 0);
}

/** @param {Array<{ makes?: number }>} submissions */
function sumWeeklyMakes(submissions) {
  return (submissions || []).reduce((sum, row) => sum + Number(row?.makes || 0), 0);
}

/** Weekly Threshold XP tiers — same bands as automation 035 / v2-engine-contracts. */
const WEEKLY_GOAL_THRESHOLD_PERCENTS = [100, 125, 150];

/**
 * Goal Completion % in Airtable stores a ratio (1.0 = 100%, 1.5 = 150%).
 * Convert ratio to integer percent points for payloads.
 * @param {number|null|undefined} ratio
 */
function goalCompletionPercentFromRatio(ratio) {
  const raw = Number(ratio);
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

/**
 * Resolve weekly goal-completion ratio from scoped shots/goal or WAS ratio fallback.
 * @param {number} shots
 * @param {number} goal
 * @param {number|null|undefined} ratioFromWas
 */
function goalCompletionRatioFromShotsAndGoal(shots, goal, ratioFromWas) {
  const weeklyShots = Number(shots || 0);
  const weeklyGoal = Number(goal || 0);
  if (weeklyGoal > 0) return weeklyShots / weeklyGoal;
  const raw = Number(ratioFromWas);
  if (!Number.isFinite(raw)) return null;
  return raw;
}

/**
 * Prefer weekly scoped shots / goal; fall back to WAS ratio when goal is blank.
 * @param {number} shots
 * @param {number} goal
 * @param {number|null|undefined} ratioFromWas
 */
function goalCompletionPercentFromShotsAndGoal(shots, goal, ratioFromWas) {
  const ratio = goalCompletionRatioFromShotsAndGoal(shots, goal, ratioFromWas);
  return ratio == null ? null : goalCompletionPercentFromRatio(ratio);
}

/**
 * Parent-friendly goal completion label aligned to Weekly Threshold tiers (100/125/150).
 * Caps extreme test-data ratios (e.g. 3,605%) at "150%+" instead of misleading raw values.
 * @param {number|null|undefined} ratio
 */
function formatGoalCompletionDisplayForEmail(ratio) {
  const raw = Number(ratio);
  if (!Number.isFinite(raw)) return "—";
  const maxTier = WEEKLY_GOAL_THRESHOLD_PERCENTS[WEEKLY_GOAL_THRESHOLD_PERCENTS.length - 1];
  if (raw + 1e-9 >= maxTier / 100) return `${maxTier}%+`;
  for (let i = WEEKLY_GOAL_THRESHOLD_PERCENTS.length - 1; i >= 0; i -= 1) {
    const tier = WEEKLY_GOAL_THRESHOLD_PERCENTS[i];
    if (raw + 1e-9 >= tier / 100) return `${tier}%`;
  }
  return `${Math.round(raw * 100)}%`;
}

/**
 * @param {number} makes
 * @param {number} shots
 */
function formatShootingPercentage(makes, shots) {
  const m = Number(makes || 0);
  const s = Number(shots || 0);
  if (s <= 0) return 0;
  return Math.round((m / s) * 100);
}

/**
 * Parent-facing video URLs must be Lambda viewer links only.
 * @param {unknown} url
 */
function isSafeParentVideoUrl(url) {
  return isValidLambdaViewerUrl(url);
}

/**
 * @param {unknown} url
 */
function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @param {Array<{ label?: string, originalFileName?: string, reviewedAt?: string, secureUrl?: string }>} entries
 * @returns {{ entries: Array<{ label: string, reviewedAt: string, secureUrl: string }>, missingSecureUrlCount: number }}
 */
function filterWeeklyVideoSubmissions(entries) {
  let missingSecureUrlCount = 0;
  const filtered = (entries || []).map((entry) => {
    const label = String(entry?.label || entry?.originalFileName || "Video submission").trim();
    const reviewedAt = String(entry?.reviewedAt || "").trim();
    const rawUrl = String(entry?.secureUrl || "").trim();
    const secureUrl = isSafeParentVideoUrl(rawUrl) ? rawUrl : "";
    if (rawUrl && !secureUrl) missingSecureUrlCount += 1;
    return { label, reviewedAt, secureUrl };
  });
  return { entries: filtered, missingSecureUrlCount };
}

/**
 * @param {Array<{ label?: string, originalFileName?: string, reviewedAt?: string, secureUrl?: string }>} entries
 */
function buildWeeklyVideoSubmissionPayload(entries) {
  const { entries: filtered } = filterWeeklyVideoSubmissions(entries);
  return filtered;
}

/**
 * @param {Array<{ label?: string, status?: string, reviewedAt?: string, secureUrl?: string, originalFileName?: string }>} entries
 */
function buildVideoSubmissionLines(entries) {
  if (!entries?.length) return ["No video submissions recorded for this week."];
  return buildWeeklyVideoSubmissionPayload(entries).map((entry) => {
    const datePart = entry.reviewedAt ? ` (${entry.reviewedAt})` : "";
    const urlPart = entry.secureUrl ? ` — ${entry.secureUrl}` : "";
    return `${entry.label}${datePart}${urlPart}`;
  });
}

/**
 * @param {{
 *   status?: string,
 *   meetingCount?: number|null,
 *   attendanceCount?: number|null,
 *   requirementMet?: boolean|null,
 * }} zoom
 */
function buildZoomAttendanceSummary(zoom = {}) {
  const status = String(zoom.status || "").trim();
  const meetingCount = Number(zoom.meetingCount);
  const attendanceCount = Number(zoom.attendanceCount);
  const parts = [];
  if (status) parts.push(`Status: ${status}`);
  if (Number.isFinite(meetingCount)) parts.push(`Meetings: ${meetingCount}`);
  if (Number.isFinite(attendanceCount)) parts.push(`Attendances: ${attendanceCount}`);
  if (zoom.requirementMet === true) parts.push("Perfect Week Zoom requirement met");
  if (zoom.requirementMet === false) parts.push("Perfect Week Zoom requirement not met");
  if (!parts.length) return "No Zoom attendance recorded for this week.";
  return parts.join("; ");
}

/**
 * Filter countable submissions to the official week window (Sunday–Saturday Denver).
 * @param {Array<{ activityDateKey?: string, countable?: boolean, shots?: number, makes?: number }>} submissions
 * @param {{ weekStartKey?: string, weekEndKey?: string }} bounds
 */
function filterCountableSubmissionsInWeek(submissions, bounds = {}) {
  const { weekStartKey = "", weekEndKey = "" } = bounds;
  return (submissions || []).filter((row) => {
    if (!row?.countable) return false;
    if (!row.activityDateKey) return false;
    return isDateKeyInWeekRange(row.activityDateKey, weekStartKey, weekEndKey);
  });
}

/**
 * Resolve Hub-facing video submission objects (no internal record IDs).
 * @param {Array<{ label?: string, originalFileName?: string, reviewedAt?: string, secureUrl?: string }>} entries
 */
function buildVideoSubmissionPayload(entries) {
  return buildWeeklyVideoSubmissionPayload(entries);
}

/**
 * Resolve Hub-facing Zoom attendance status string.
 * @param {{
 *   status?: string,
 *   meetingCount?: number|null,
 *   attendanceCount?: number|null,
 *   requirementMet?: boolean|null,
 * }} zoom
 */
function buildZoomAttendanceStatus(zoom = {}) {
  const status = String(zoom.status || "").trim();
  if (status) return status;
  if (zoom.requirementMet === true) return "Attended";
  if (zoom.requirementMet === false) return "Not met";
  return "";
}

/**
 * Parent-facing video filename: Custom Video File Name, else original upload name.
 * @param {unknown} customVideoFileName
 * @param {unknown} originalFileName
 */
function resolveVideoDisplayFileName(customVideoFileName, originalFileName) {
  const custom = String(customVideoFileName ?? "").trim();
  if (custom && custom !== "—") return custom;
  const original = String(originalFileName ?? "").trim();
  if (original && original !== "—") return original;
  return "";
}

/**
 * Build Hub `videosSubmittedThisWeek` rows from qualifying Video Feedback sources.
 * Canonical week bounds are Sunday–Saturday Denver date keys on the WAS Week.
 *
 * @param {Array<{
 *   recordId?: string,
 *   activityDateKey?: string,
 *   customVideoFileName?: string,
 *   originalFileName?: string,
 * }>} entries
 * @param {{ weekStartKey?: string, weekEndKey?: string }} [bounds]
 * @returns {Array<{ activityDate: string, fileName: string }>}
 */
function buildVideosSubmittedThisWeek(entries, bounds = {}) {
  const { weekStartKey = "", weekEndKey = "" } = bounds;
  const seen = new Set();
  const rows = [];

  for (const entry of entries || []) {
    const recordId = String(entry?.recordId || "").trim();
    if (recordId) {
      if (seen.has(recordId)) continue;
      seen.add(recordId);
    }

    const activityDateKey = String(entry?.activityDateKey || "").trim();
    if (weekStartKey && weekEndKey && activityDateKey) {
      if (!isDateKeyInWeekRange(activityDateKey, weekStartKey, weekEndKey)) continue;
    }

    const fileName =
      resolveVideoDisplayFileName(entry?.customVideoFileName, entry?.originalFileName) ||
      "Video submission";

    rows.push({
      activityDate: activityDateKey || "—",
      fileName,
    });
  }

  rows.sort((left, right) => {
    const dateCompare = String(left.activityDate).localeCompare(String(right.activityDate));
    if (dateCompare !== 0) return dateCompare;
    return String(left.fileName).localeCompare(String(right.fileName));
  });

  return rows;
}

module.exports = {
  DEFAULT_TIME_ZONE,
  WEEKLY_GOAL_THRESHOLD_PERCENTS,
  toDateKey,
  toSafeDateKey,
  isDateKeyInWeekRange,
  countDistinctQualifyingDays,
  sumWeeklyShots,
  sumWeeklyMakes,
  goalCompletionPercentFromRatio,
  goalCompletionRatioFromShotsAndGoal,
  goalCompletionPercentFromShotsAndGoal,
  formatGoalCompletionDisplayForEmail,
  formatShootingPercentage,
  classifySecureVideoUrl,
  isValidLambdaViewerUrl,
  isSafeParentVideoUrl,
  redactSecureVideoUrl,
  filterWeeklyVideoSubmissions,
  isSafeHttpUrl,
  buildVideoSubmissionLines,
  buildWeeklyVideoSubmissionPayload,
  buildZoomAttendanceSummary,
  filterCountableSubmissionsInWeek,
  buildVideoSubmissionPayload,
  buildZoomAttendanceStatus,
  resolveVideoDisplayFileName,
  buildVideosSubmittedThisWeek,
};
