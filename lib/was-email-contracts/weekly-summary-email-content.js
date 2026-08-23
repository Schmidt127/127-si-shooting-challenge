/**
 * Weekly Athlete Summary email content helpers (072 build + 074 Hub payload).
 * Pure functions for Denver-safe week metrics, goal %, video rows, and Zoom summary.
 */

"use strict";

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

/**
 * Goal Completion % in Airtable stores a ratio (1.0 = 100%).
 * Display percent points for email/Hub payloads.
 * @param {number|null|undefined} ratio
 */
function goalCompletionPercentFromRatio(ratio) {
  const raw = Number(ratio);
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

/**
 * Prefer weekly scoped shots / goal; fall back to WAS ratio when goal is blank.
 * @param {number} shots
 * @param {number} goal
 * @param {number|null|undefined} ratioFromWas
 */
function goalCompletionPercentFromShotsAndGoal(shots, goal, ratioFromWas) {
  const weeklyShots = Number(shots || 0);
  const weeklyGoal = Number(goal || 0);
  if (weeklyGoal > 0) return Math.round((weeklyShots / weeklyGoal) * 100);
  return goalCompletionPercentFromRatio(ratioFromWas);
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
 * @param {Array<{ label?: string, status?: string, reviewedAt?: string }>} entries
 */
function buildVideoSubmissionLines(entries) {
  if (!entries?.length) return ["No video submissions recorded for this week."];
  return entries.map((entry) => {
    const label = String(entry?.label || "Video submission").trim();
    const status = String(entry?.status || "Pending").trim();
    const reviewedAt = String(entry?.reviewedAt || "").trim();
    return reviewedAt ? `${label}: ${status} (${reviewedAt})` : `${label}: ${status}`;
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
 * Resolve Hub-facing video submission objects.
 * @param {Array<{ id?: string, label?: string, status?: string, reviewedAt?: string, posted?: boolean, sent?: boolean }>} entries
 */
function buildVideoSubmissionPayload(entries) {
  return (entries || []).map((entry) => ({
    id: entry?.id || "",
    label: String(entry?.label || "Video submission").trim(),
    status: String(entry?.status || "Pending").trim(),
    reviewedAt: String(entry?.reviewedAt || "").trim(),
    posted: Boolean(entry?.posted),
    sent: Boolean(entry?.sent),
  }));
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

module.exports = {
  DEFAULT_TIME_ZONE,
  toDateKey,
  toSafeDateKey,
  isDateKeyInWeekRange,
  countDistinctQualifyingDays,
  sumWeeklyShots,
  sumWeeklyMakes,
  goalCompletionPercentFromRatio,
  goalCompletionPercentFromShotsAndGoal,
  formatShootingPercentage,
  buildVideoSubmissionLines,
  buildZoomAttendanceSummary,
  filterCountableSubmissionsInWeek,
  buildVideoSubmissionPayload,
  buildZoomAttendanceStatus,
};
