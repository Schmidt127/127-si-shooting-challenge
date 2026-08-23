/**
 * Perfect Week submission timing — 48-hour grace period after Activity Date (Denver).
 * Mirrors authoritative Airtable formula intent for Submissions timing fields.
 *
 * Config: grace hours resolve from Airtable Config lookup when provided; default 48.
 */

"use strict";

const { toDateKey, isDateKeyInWeekRange } = require("./weekly-summary-email-content");

const DEFAULT_TIME_ZONE = "America/Denver";
const DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS = 48;

/** Auditable timing categories for Perfect Week submission eligibility. */
const PERFECT_WEEK_SUBMISSION_TIMING_STATUS = Object.freeze({
  ON_TIME: "on_time",
  LATE_GRACE: "late_grace",
  LATE_INELIGIBLE: "late_ineligible",
  MANUAL_APPROVED: "manual_approved",
  FUTURE_INELIGIBLE: "future_ineligible",
  MISSING_ACTIVITY_DATE: "missing_activity_date",
  MISSING_SUBMITTED_AT: "missing_submitted_at",
});

/**
 * @param {number|null|undefined} configuredHours
 */
function resolvePerfectWeekSubmissionGraceHours(configuredHours) {
  if (configuredHours === null || configuredHours === undefined || configuredHours === "") {
    return DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS;
  }
  const n = Number(configuredHours);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS;
  return n;
}

/**
 * Denver wall-clock parts for an instant.
 * @param {Date} instant
 * @param {string} [timeZone]
 */
function getDenverWallParts(instant, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    second: Number(pick("second")),
  };
}

/**
 * UTC ms for Denver local midnight at the start of dateKey (YYYY-MM-DD).
 * @param {string} dateKey
 * @param {string} [timeZone]
 */
function denverMidnightMsForDateKey(dateKey, timeZone = DEFAULT_TIME_ZONE) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return null;

  // Denver midnight falls between UTC-7 and UTC-6 depending on DST — search the window.
  for (let utcHour = 0; utcHour < 24; utcHour += 1) {
    const candidate = Date.UTC(y, m - 1, d, utcHour, 0, 0, 0);
    const parts = getDenverWallParts(new Date(candidate), timeZone);
    if (
      parts.year === y &&
      parts.month === m &&
      parts.day === d &&
      parts.hour === 0 &&
      parts.minute === 0
    ) {
      return candidate;
    }
  }

  for (let utcHour = 0; utcHour < 24; utcHour += 1) {
    for (const minute of [0, 30]) {
      const candidate = Date.UTC(y, m - 1, d, utcHour, minute, 0, 0);
      const parts = getDenverWallParts(new Date(candidate), timeZone);
      if (parts.year === y && parts.month === m && parts.day === d && parts.hour === 0) {
        return candidate - parts.minute * 60000 - parts.second * 1000;
      }
    }
  }

  return null;
}

/**
 * @param {string} dateKey
 */
function addDaysToDateKey(dateKey, daysToAdd) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

/**
 * End of Activity Date in Denver = start of the next Denver calendar day.
 * @param {string} activityDateKey
 * @param {string} [timeZone]
 */
function activityDateEndDenverMs(activityDateKey, timeZone = DEFAULT_TIME_ZONE) {
  const nextKey = addDaysToDateKey(activityDateKey, 1);
  return denverMidnightMsForDateKey(nextKey, timeZone);
}

/**
 * @param {string} activityDateKey
 * @param {number} graceHours
 * @param {string} [timeZone]
 */
function graceDeadlineMs(activityDateKey, graceHours, timeZone = DEFAULT_TIME_ZONE) {
  const endMs = activityDateEndDenverMs(activityDateKey, timeZone);
  if (endMs == null) return null;
  return endMs + graceHours * 3600000;
}

/**
 * @param {unknown} value
 */
function toInstant(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Evaluate Perfect Week submission timing for one submission snapshot.
 * @param {{
 *   activityDateKey?: string,
 *   activityDateRaw?: unknown,
 *   submittedAt?: unknown,
 *   countThisSubmission?: boolean|number,
 *   manualApproved?: boolean|number,
 *   graceHours?: number|null,
 *   weekStartKey?: string,
 *   weekEndKey?: string,
 *   nowMs?: number,
 *   timeZone?: string,
 * }} input
 */
function evaluatePerfectWeekSubmissionTiming(input = {}) {
  const timeZone = input.timeZone || DEFAULT_TIME_ZONE;
  const graceHours = resolvePerfectWeekSubmissionGraceHours(input.graceHours);
  const activityDateKey =
    String(input.activityDateKey || "").trim() ||
    toDateKey(input.activityDateRaw, timeZone);

  const submittedMs = toInstant(input.submittedAt);
  const nowMs = input.nowMs != null ? Number(input.nowMs) : Date.now();
  const todayDenverKey = toDateKey(new Date(nowMs), timeZone);

  if (input.manualApproved === true || input.manualApproved === 1 || input.manualApproved === "1") {
    return {
      status: PERFECT_WEEK_SUBMISSION_TIMING_STATUS.MANUAL_APPROVED,
      timingEligible: true,
      perfectWeekCountable: Boolean(input.countThisSubmission),
      graceHours,
      activityDateKey,
      submittedAtMs: submittedMs,
      graceDeadlineMs: activityDateKey ? graceDeadlineMs(activityDateKey, graceHours, timeZone) : null,
    };
  }

  if (!activityDateKey) {
    return {
      status: PERFECT_WEEK_SUBMISSION_TIMING_STATUS.MISSING_ACTIVITY_DATE,
      timingEligible: false,
      perfectWeekCountable: false,
      graceHours,
      activityDateKey: "",
      submittedAtMs: submittedMs,
      graceDeadlineMs: null,
    };
  }

  if (activityDateKey > todayDenverKey) {
    return {
      status: PERFECT_WEEK_SUBMISSION_TIMING_STATUS.FUTURE_INELIGIBLE,
      timingEligible: false,
      perfectWeekCountable: false,
      graceHours,
      activityDateKey,
      submittedAtMs: submittedMs,
      graceDeadlineMs: graceDeadlineMs(activityDateKey, graceHours, timeZone),
    };
  }

  const weekStartKey = String(input.weekStartKey || "").trim();
  const weekEndKey = String(input.weekEndKey || "").trim();
  if (weekStartKey && weekEndKey && !isDateKeyInWeekRange(activityDateKey, weekStartKey, weekEndKey)) {
    return {
      status: PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_INELIGIBLE,
      timingEligible: false,
      perfectWeekCountable: false,
      graceHours,
      activityDateKey,
      submittedAtMs: submittedMs,
      graceDeadlineMs: graceDeadlineMs(activityDateKey, graceHours, timeZone),
      reason: "activity_outside_official_week",
    };
  }

  if (submittedMs == null) {
    return {
      status: PERFECT_WEEK_SUBMISSION_TIMING_STATUS.MISSING_SUBMITTED_AT,
      timingEligible: false,
      perfectWeekCountable: false,
      graceHours,
      activityDateKey,
      submittedAtMs: null,
      graceDeadlineMs: graceDeadlineMs(activityDateKey, graceHours, timeZone),
    };
  }

  const submittedDenverKey = toDateKey(new Date(submittedMs), timeZone);
  const deadlineMs = graceDeadlineMs(activityDateKey, graceHours, timeZone);

  let status;
  if (submittedDenverKey === activityDateKey) {
    status = PERFECT_WEEK_SUBMISSION_TIMING_STATUS.ON_TIME;
  } else if (deadlineMs != null && submittedMs <= deadlineMs) {
    status = PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE;
  } else {
    status = PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_INELIGIBLE;
  }

  const timingEligible =
    status === PERFECT_WEEK_SUBMISSION_TIMING_STATUS.ON_TIME ||
    status === PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE;

  const countableBase =
    input.countThisSubmission === true ||
    input.countThisSubmission === 1 ||
    input.countThisSubmission === "1";

  return {
    status,
    timingEligible,
    perfectWeekCountable: countableBase && timingEligible,
    graceHours,
    activityDateKey,
    submittedAtMs: submittedMs,
    submittedDenverKey,
    graceDeadlineMs: deadlineMs,
  };
}

/**
 * Distinct Perfect Week qualifying activity days after grace timing is applied.
 * @param {Array<{
 *   activityDateKey?: string,
 *   submittedAt?: unknown,
 *   countThisSubmission?: boolean|number,
 *   perfectWeekCountable?: boolean|number,
 *   manualApproved?: boolean|number,
 *   totalShotsCounted?: number,
 * }>} submissions
 * @param {{
 *   weekStartKey?: string,
 *   weekEndKey?: string,
 *   graceHours?: number|null,
 *   nowMs?: number,
 *   timeZone?: string,
 * }} bounds
 */
function countDistinctPerfectWeekQualifyingDays(submissions, bounds = {}) {
  const keys = new Set();
  for (const row of submissions || []) {
    if (row?.perfectWeekCountable === true || row?.perfectWeekCountable === 1) {
      if (row.activityDateKey) keys.add(row.activityDateKey);
      continue;
    }

    const timing = evaluatePerfectWeekSubmissionTiming({
      activityDateKey: row?.activityDateKey,
      submittedAt: row?.submittedAt,
      countThisSubmission: row?.countThisSubmission ?? true,
      manualApproved: row?.manualApproved,
      graceHours: bounds.graceHours,
      weekStartKey: bounds.weekStartKey,
      weekEndKey: bounds.weekEndKey,
      nowMs: bounds.nowMs,
      timeZone: bounds.timeZone,
    });

    if (!timing.perfectWeekCountable) continue;
    if (row?.totalShotsCounted != null && Number(row.totalShotsCounted) <= 0) continue;
    if (timing.activityDateKey) keys.add(timing.activityDateKey);
  }
  return keys.size;
}

module.exports = {
  DEFAULT_TIME_ZONE,
  DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS,
  PERFECT_WEEK_SUBMISSION_TIMING_STATUS,
  resolvePerfectWeekSubmissionGraceHours,
  denverMidnightMsForDateKey,
  activityDateEndDenverMs,
  graceDeadlineMs,
  evaluatePerfectWeekSubmissionTiming,
  countDistinctPerfectWeekQualifyingDays,
};
