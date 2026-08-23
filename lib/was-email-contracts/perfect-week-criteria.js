/**
 * Perfect Week criteria for weekly email rendering.
 * Reads authoritative Airtable-shaped inputs (WAS fields, Week bounds, Achievements, XP Reward Rules).
 * Does not hard-code product thresholds.
 */

"use strict";

const { toDateKey, isDateKeyInWeekRange } = require("./weekly-summary-email-content");

/**
 * Inclusive Denver calendar day count between week start and end keys.
 * @param {string} weekStartKey
 * @param {string} weekEndKey
 */
function inclusiveWeekDayCount(weekStartKey, weekEndKey) {
  if (!weekStartKey || !weekEndKey || weekEndKey < weekStartKey) return null;
  const [sy, sm, sd] = weekStartKey.split("-").map(Number);
  const [ey, em, ed] = weekEndKey.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  const diff = Math.round((end - start) / 86400000);
  return diff + 1;
}

/**
 * Parse Automation 057 writeback on WAS Perfect Week Daily Check Detail.
 * @param {string} detail
 */
function parsePerfectWeekDailyDetail(detail) {
  const text = String(detail || "");
  const result = {
    weekStartKey: "",
    weekEndKey: "",
    dailyMinimum: null,
    passingOfficialDays: null,
    requiredDays: null,
  };
  const weekMatch = text.match(/Official week:\s*(\d{4}-\d{2}-\d{2})\s+through\s+(\d{4}-\d{2}-\d{2})/i);
  if (weekMatch) {
    result.weekStartKey = weekMatch[1];
    result.weekEndKey = weekMatch[2];
    result.requiredDays = inclusiveWeekDayCount(result.weekStartKey, result.weekEndKey);
  }
  const dailyMinMatch = text.match(/Daily minimum:\s*(\d+)/i);
  if (dailyMinMatch) result.dailyMinimum = Number(dailyMinMatch[1]);
  const passingMatch = text.match(/Passing official days:\s*(\d+)\/(\d+)/i);
  if (passingMatch) {
    result.passingOfficialDays = Number(passingMatch[1]);
    result.requiredDays = Number(passingMatch[2]);
  }
  return result;
}

/**
 * Distinct qualifying Perfect Week activity days from submission snapshots.
 * Uses Perfect Week Countable Submission? and Activity Date (Denver), not created time.
 * @param {Array<{ perfectWeekCountable?: boolean, activityDateKey?: string }>} submissions
 * @param {{ weekStartKey?: string, weekEndKey?: string }} bounds
 */
function countDistinctPerfectWeekDays(submissions, bounds = {}) {
  const { weekStartKey = "", weekEndKey = "" } = bounds;
  const keys = new Set();
  for (const row of submissions || []) {
    if (!row?.perfectWeekCountable || !row.activityDateKey) continue;
    if (!isDateKeyInWeekRange(row.activityDateKey, weekStartKey, weekEndKey)) continue;
    keys.add(row.activityDateKey);
  }
  return keys.size;
}

/**
 * @param {number|null|undefined} logged
 * @param {number|null|undefined} required
 */
function formatDaysLoggedAgainstCriteria(logged, required) {
  const count = Number(logged || 0);
  if (required == null || !Number.isFinite(Number(required)) || Number(required) <= 0) {
    return String(count);
  }
  return `${count}/${Number(required)}`;
}

/**
 * @param {number} count
 * @param {number|null|undefined} required
 * @param {boolean|null|undefined} requirementMet
 */
function formatVideoProgress(count, required, requirementMet) {
  const n = Number(count || 0);
  if (required != null && Number.isFinite(Number(required)) && Number(required) > 0) {
    return `${n}/${Number(required)}`;
  }
  if (requirementMet === true) return `${n} (requirement met)`;
  if (requirementMet === false) return `${n} (requirement not met)`;
  return String(n);
}

/**
 * Build email-facing Perfect Week criteria from authoritative Airtable records/fields.
 * @param {{
 *   weekStartKey?: string,
 *   weekEndKey?: string,
 *   weeklyGoalShots?: number|null,
 *   dailyDetail?: string,
 *   daysLogged?: number|null,
 *   videoCount?: number|null,
 *   videoRequirementMet?: boolean|number|null,
 *   zoomMeetingCount?: number|null,
 *   zoomAttendanceCount?: number|null,
 *   zoomRequirementStatus?: string,
 *   zoomRequirementMet?: boolean|number|null,
 *   homeworkRequirementStatus?: string,
 *   homeworkRequirementMet?: boolean|number|null,
 *   eligible?: boolean|number|null,
 *   achievementRequiredDays?: number|null,
 *   achievementXpAmount?: number|null,
 *   videoRequired?: number|null,
 * }} input
 */
function buildPerfectWeekEmailCriteria(input = {}) {
  const parsed = parsePerfectWeekDailyDetail(input.dailyDetail);
  const weekStartKey = input.weekStartKey || parsed.weekStartKey || "";
  const weekEndKey = input.weekEndKey || parsed.weekEndKey || "";

  const requiredShootingDays =
    input.achievementRequiredDays ??
    parsed.requiredDays ??
    (weekStartKey && weekEndKey ? inclusiveWeekDayCount(weekStartKey, weekEndKey) : null);

  const weeklyGoal = Number(input.weeklyGoalShots || 0);
  const dailyShootingMinimum =
    parsed.dailyMinimum ??
    (weeklyGoal > 0 && requiredShootingDays
      ? Math.ceil(weeklyGoal / requiredShootingDays)
      : null);

  const daysLogged = Number(input.daysLogged ?? parsed.passingOfficialDays ?? 0);
  const videoCount = Number(input.videoCount || 0);
  const videoRequirementMet =
    input.videoRequirementMet === true ||
    input.videoRequirementMet === 1 ||
    input.videoRequirementMet === "1";
  const videoRequired = input.videoRequired ?? null;

  const zoomMeetingCount = Number(input.zoomMeetingCount || 0);
  const zoomAttendanceCount = Number(input.zoomAttendanceCount || 0);
  const zoomRequirementStatus = String(input.zoomRequirementStatus || "").trim();
  const zoomRequirementMet =
    input.zoomRequirementMet === true ||
    input.zoomRequirementMet === 1 ||
    input.zoomRequirementMet === "1" ||
    zoomRequirementStatus === "Attended" ||
    zoomRequirementStatus === "No Zoom This Week";

  return {
    weekStartKey,
    weekEndKey,
    requiredShootingDays,
    dailyShootingMinimum,
    daysLogged,
    daysLoggedDisplay: formatDaysLoggedAgainstCriteria(daysLogged, requiredShootingDays),
    videoCount,
    videoRequired,
    videoRequirementMet,
    videoProgressDisplay: formatVideoProgress(videoCount, videoRequired, videoRequirementMet),
    zoomMeetingCount,
    zoomAttendanceCount,
    zoomRequirementStatus,
    zoomRequirementMet,
    zoomApplies: zoomMeetingCount > 0,
    homeworkRequirementStatus: String(input.homeworkRequirementStatus || "").trim(),
    homeworkRequirementMet:
      input.homeworkRequirementMet === true ||
      input.homeworkRequirementMet === 1 ||
      input.homeworkRequirementMet === "1",
    eligible: input.eligible === true || input.eligible === 1 || input.eligible === "1",
    perfectWeekXpAmount:
      input.achievementXpAmount == null ? null : Number(input.achievementXpAmount),
  };
}

/**
 * Zoom display follows WAS Perfect Week Zoom Requirement Status semantics.
 * @param {{
 *   zoomRequirementStatus?: string,
 *   zoomMeetingCount?: number|null,
 *   zoomAttendanceCount?: number|null,
 *   zoomRequirementMet?: boolean|number|null,
 * }} zoom
 */
function buildZoomAttendanceEmailLine(zoom = {}) {
  const status = String(zoom.zoomRequirementStatus || "").trim();
  if (status) return status;
  const meetings = Number(zoom.zoomMeetingCount || 0);
  const attendances = Number(zoom.zoomAttendanceCount || 0);
  if (meetings === 0) return "No Zoom This Week";
  if (zoom.zoomRequirementMet === true || zoom.zoomRequirementMet === 1) return "Attended";
  if (attendances >= 1) return "Attended";
  return "Missed";
}

module.exports = {
  inclusiveWeekDayCount,
  parsePerfectWeekDailyDetail,
  countDistinctPerfectWeekDays,
  formatDaysLoggedAgainstCriteria,
  formatVideoProgress,
  buildPerfectWeekEmailCriteria,
  buildZoomAttendanceEmailLine,
};
