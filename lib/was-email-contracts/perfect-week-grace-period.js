/**
 * Perfect Week backdated-submission grace period contract.
 *
 * Authoritative product rules (mirrored in Airtable formulas + Automation 057):
 * - Activity Date = when shooting happened (Denver calendar day).
 * - Submitted At = upload timestamp (never substitute Created).
 * - Future Activity Dates are never eligible.
 * - Grace deadline = end of Activity Date (America/Denver) + gracePeriodHours.
 * - Configurable grace hours come from Achievements / Perfect Week criteria (default 48).
 *
 * Timing status (auditable):
 * - on_time: same Denver calendar day as Activity Date
 * - grace_period: within grace window but not same day
 * - late: beyond grace window
 * - manual_exception: operator-approved override (checkbox on submission)
 */

"use strict";

const { toSafeDateKey, isDateKeyInWeekRange } = require("./weekly-summary-email-content");

const DEFAULT_TIME_ZONE = "America/Denver";
const DEFAULT_GRACE_PERIOD_HOURS = 48;

const TIMING_STATUS = Object.freeze({
  ON_TIME: "on_time",
  GRACE_PERIOD: "grace_period",
  LATE: "late",
  MANUAL_EXCEPTION: "manual_exception",
  INELIGIBLE: "ineligible",
});

/**
 * Resolve grace period hours from Achievements / config-shaped input.
 * @param {number|null|undefined} configuredHours
 * @param {number} [fallbackHours]
 */
function resolveGracePeriodHours(configuredHours, fallbackHours = DEFAULT_GRACE_PERIOD_HOURS) {
  if (configuredHours === null || configuredHours === undefined || configuredHours === "") {
    return fallbackHours;
  }
  const hours = Number(configuredHours);
  if (Number.isFinite(hours) && hours >= 0) return hours;
  return fallbackHours;
}

/**
 * Start of a Denver calendar day as UTC epoch ms.
 * Uses noon UTC anchor to avoid DST edge ambiguity when adding whole days.
 * @param {string} dateKey YYYY-MM-DD
 */
function denverDayStartMs(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (!year || !month || !day) return NaN;
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcNoon);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const denverHour = Number(byType.hour);
  const denverMinute = Number(byType.minute);
  const denverSecond = Number(byType.second);
  const offsetFromUtcNoonMs =
  (denverHour - 12) * 3600000 + denverMinute * 60000 + denverSecond * 1000;
  return utcNoon.getTime() - offsetFromUtcNoonMs;
}

/**
 * End of Activity Date in Denver = start of next Denver calendar day.
 * @param {string} activityDateKey
 */
function endOfDenverActivityDayMs(activityDateKey) {
  const [year, month, day] = String(activityDateKey).split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  const nextKey = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`;
  return denverDayStartMs(nextKey);
}

/**
 * @param {unknown} value
 */
function toTimestampMs(value) {
  if (!value) return NaN;
  const dateValue = value instanceof Date ? value : new Date(value);
  const ms = dateValue.getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * @param {string} activityDateKey
 * @param {number} gracePeriodHours
 */
function graceDeadlineMs(activityDateKey, gracePeriodHours) {
  const endMs = endOfDenverActivityDayMs(activityDateKey);
  if (!Number.isFinite(endMs)) return NaN;
  return endMs + resolveGracePeriodHours(gracePeriodHours) * 3600000;
}

/**
 * Classify one submission's upload timing relative to Activity Date.
 * @param {{
 *   activityDate?: unknown,
 *   activityDateKey?: string,
 *   submittedAt?: unknown,
 *   gracePeriodHours?: number,
 *   manualPerfectWeekException?: boolean,
 *   referenceNowMs?: number,
 * }} input
 */
function classifyPerfectWeekSubmissionTiming(input = {}) {
  const activityDateKey =
    input.activityDateKey ||
    toSafeDateKey(input.activityDate, input.activityDateText || input.activityDate);
  const submittedMs = toTimestampMs(input.submittedAt);
  const graceHours = resolveGracePeriodHours(input.gracePeriodHours);
  const nowMs = Number.isFinite(Number(input.referenceNowMs))
    ? Number(input.referenceNowMs)
    : Date.now();

  if (input.manualPerfectWeekException === true) {
    return {
      activityDateKey,
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: activityDateKey ? graceDeadlineMs(activityDateKey, graceHours) : NaN,
      timingStatus: TIMING_STATUS.MANUAL_EXCEPTION,
      graceEligible: Boolean(activityDateKey),
      sameDenverDay: false,
      reason: "manual_exception",
    };
  }

  if (!activityDateKey) {
    return {
      activityDateKey: "",
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: NaN,
      timingStatus: TIMING_STATUS.INELIGIBLE,
      graceEligible: false,
      sameDenverDay: false,
      reason: "missing_activity_date",
    };
  }

  const activityDayStartMs = denverDayStartMs(activityDateKey);
  if (activityDayStartMs > nowMs) {
    return {
      activityDateKey,
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: graceDeadlineMs(activityDateKey, graceHours),
      timingStatus: TIMING_STATUS.INELIGIBLE,
      graceEligible: false,
      sameDenverDay: false,
      reason: "future_activity_date",
    };
  }

  if (!Number.isFinite(submittedMs)) {
    return {
      activityDateKey,
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: graceDeadlineMs(activityDateKey, graceHours),
      timingStatus: TIMING_STATUS.INELIGIBLE,
      graceEligible: false,
      sameDenverDay: false,
      reason: "missing_submitted_at",
    };
  }

  const submittedDateKey = toSafeDateKey(input.submittedAt);
  const sameDenverDay = submittedDateKey === activityDateKey;
  const deadline = graceDeadlineMs(activityDateKey, graceHours);
  const withinGrace = submittedMs <= deadline;

  if (sameDenverDay) {
    return {
      activityDateKey,
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: deadline,
      timingStatus: TIMING_STATUS.ON_TIME,
      graceEligible: true,
      sameDenverDay: true,
      reason: "on_time",
    };
  }

  if (withinGrace) {
    return {
      activityDateKey,
      submittedAtMs: submittedMs,
      gracePeriodHours: graceHours,
      graceDeadlineMs: deadline,
      timingStatus: TIMING_STATUS.GRACE_PERIOD,
      graceEligible: true,
      sameDenverDay: false,
      reason: "grace_period",
    };
  }

  return {
    activityDateKey,
    submittedAtMs: submittedMs,
    gracePeriodHours: graceHours,
    graceDeadlineMs: deadline,
    timingStatus: TIMING_STATUS.LATE,
    graceEligible: false,
    sameDenverDay: false,
    reason: "beyond_grace_period",
  };
}

/**
 * Evaluate whether a submission counts for Perfect Week daily math.
 * @param {{
 *   countThisSubmission?: boolean|number,
 *   shots?: number,
 *   enrollmentLinked?: boolean,
 *   weekLinked?: boolean,
 *   timing?: ReturnType<typeof classifyPerfectWeekSubmissionTiming>,
 *   weekStartKey?: string,
 *   weekEndKey?: string,
 *   manualPerfectWeekException?: boolean,
 * }} row
 */
function isPerfectWeekGraceEligibleSubmission(row = {}) {
  const countThis =
    row.countThisSubmission === true ||
    row.countThisSubmission === 1 ||
    row.countThisSubmission === "1";
  if (!countThis) return false;
  if (row.enrollmentLinked === false || row.weekLinked === false) return false;

  const timing =
    row.timing ||
    classifyPerfectWeekSubmissionTiming({
      activityDateKey: row.activityDateKey,
      activityDate: row.activityDate,
      submittedAt: row.submittedAt,
      gracePeriodHours: row.gracePeriodHours,
      manualPerfectWeekException: row.manualPerfectWeekException,
      referenceNowMs: row.referenceNowMs,
    });

  if (!timing.activityDateKey) return false;
  if (!isDateKeyInWeekRange(timing.activityDateKey, row.weekStartKey, row.weekEndKey)) {
    return false;
  }
  if (timing.timingStatus === TIMING_STATUS.INELIGIBLE) return false;
  if (timing.timingStatus === TIMING_STATUS.LATE && !row.manualPerfectWeekException) return false;

  const shots = Number(row.shots);
  if (!Number.isFinite(shots) || shots <= 0) return false;

  return timing.graceEligible || row.manualPerfectWeekException === true;
}

/**
 * Distinct general shooting days (Count This Submission? only).
 * @param {Array<{ countThisSubmission?: boolean|number, activityDateKey?: string }>} submissions
 * @param {{ weekStartKey?: string, weekEndKey?: string }} bounds
 */
function countGeneralShootingDays(submissions, bounds = {}) {
  const { weekStartKey = "", weekEndKey = "" } = bounds;
  const keys = new Set();
  for (const row of submissions || []) {
    const countThis =
      row.countThisSubmission === true ||
      row.countThisSubmission === 1 ||
      row.countThisSubmission === "1";
    if (!countThis || !row.activityDateKey) continue;
    if (!isDateKeyInWeekRange(row.activityDateKey, weekStartKey, weekEndKey)) continue;
    keys.add(row.activityDateKey);
  }
  return keys.size;
}

/**
 * Distinct Perfect Week qualifying days after grace-period rule.
 * @param {Array<object>} submissions
 * @param {{ weekStartKey?: string, weekEndKey?: string, gracePeriodHours?: number, referenceNowMs?: number }} bounds
 */
function countPerfectWeekQualifyingDays(submissions, bounds = {}) {
  const keys = new Set();
  for (const row of submissions || []) {
    if (!isPerfectWeekGraceEligibleSubmission({ ...row, ...bounds })) continue;
    const activityDateKey =
      row.activityDateKey ||
      toSafeDateKey(row.activityDate, row.activityDateText || row.activityDate);
    if (activityDateKey) keys.add(activityDateKey);
  }
  return keys.size;
}

/**
 * Aggregate shots by activity date for grace-eligible submissions.
 * @param {Array<object>} submissions
 * @param {{ weekStartKey?: string, weekEndKey?: string, gracePeriodHours?: number }} bounds
 */
function aggregateGraceEligibleShotsByDate(submissions, bounds = {}) {
  const dayMap = new Map();
  let ignored = 0;
  let outside = 0;
  const timingBreakdown = {
    on_time: 0,
    grace_period: 0,
    late: 0,
    manual_exception: 0,
    ineligible: 0,
  };

  for (const row of submissions || []) {
    const timing = classifyPerfectWeekSubmissionTiming({
      activityDateKey: row.activityDateKey,
      activityDate: row.activityDate,
      submittedAt: row.submittedAt,
      gracePeriodHours: bounds.gracePeriodHours ?? row.gracePeriodHours,
      manualPerfectWeekException: row.manualPerfectWeekException,
      referenceNowMs: bounds.referenceNowMs ?? row.referenceNowMs,
    });
    if (timing.timingStatus in timingBreakdown) {
      timingBreakdown[timing.timingStatus] += 1;
    }

    if (!isPerfectWeekGraceEligibleSubmission({ ...row, timing, ...bounds })) {
      ignored += 1;
      continue;
    }

    const dateKey = timing.activityDateKey;
    if (!isDateKeyInWeekRange(dateKey, bounds.weekStartKey, bounds.weekEndKey)) {
      outside += 1;
      continue;
    }

    const shots = Number(row.shots) || 0;
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + shots);
  }

  return { dayMap, ignored, outside, timingBreakdown };
}

/**
 * 057-style daily requirement using grace-eligible submissions.
 * @param {{
 *   weekStartDateKey: string,
 *   submissions?: Array<object>,
 *   weeklyGoal: number,
 *   requiredDailyCount?: number,
 *   gracePeriodHours?: number,
 * }} input
 */
function evaluateGracePeriodDailyRequirement(input = {}) {
  const requiredDailyCount = Number(input.requiredDailyCount) || 7;
  const weekStartDateKey = String(input.weekStartDateKey || "").trim();
  const requiredDates = [];
  for (let i = 0; i < requiredDailyCount; i += 1) {
    const [y, m, d] = weekStartDateKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + i);
    requiredDates.push(date.toISOString().slice(0, 10));
  }
  const weekEndDateKey = requiredDates[requiredDates.length - 1] || "";
  const dailyMinimum = Math.ceil(Number(input.weeklyGoal) / requiredDailyCount);
  const { dayMap, ignored, outside, timingBreakdown } = aggregateGraceEligibleShotsByDate(
    input.submissions || [],
    {
      weekStartKey: weekStartDateKey,
      weekEndKey: weekEndDateKey,
      gracePeriodHours: input.gracePeriodHours,
      referenceNowMs: input.referenceNowMs,
    }
  );

  const missingDays = [];
  const failingDays = [];
  const passingDays = [];

  for (const dateKey of requiredDates) {
    const shots = dayMap.get(dateKey) || 0;
    if (shots <= 0) missingDays.push(dateKey);
    else if (shots < dailyMinimum) failingDays.push(`${dateKey}: ${shots}/${dailyMinimum}`);
    else passingDays.push(`${dateKey}: ${shots}/${dailyMinimum}`);
  }

  return {
    dailyMet: missingDays.length === 0 && failingDays.length === 0,
    requiredDates,
    weekEndDateKey,
    dailyMinimum,
    missingDays,
    failingDays,
    passingDays,
    passingOfficialDays: passingDays.length,
    ignored,
    outside,
    timingBreakdown,
    qualifyingDayCount: passingDays.length + failingDays.length,
  };
}

module.exports = {
  DEFAULT_TIME_ZONE,
  DEFAULT_GRACE_PERIOD_HOURS,
  TIMING_STATUS,
  resolveGracePeriodHours,
  denverDayStartMs,
  endOfDenverActivityDayMs,
  graceDeadlineMs,
  classifyPerfectWeekSubmissionTiming,
  isPerfectWeekGraceEligibleSubmission,
  countGeneralShootingDays,
  countPerfectWeekQualifyingDays,
  aggregateGraceEligibleShotsByDate,
  evaluateGracePeriodDailyRequirement,
};
