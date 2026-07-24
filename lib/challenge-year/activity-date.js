/**
 * Submission Activity Date → Week resolution.
 *
 * Uses Activity Date (not Submitted At). America/Denver calendar keys.
 * Sunday–Saturday inclusive. Rejects cross-year matches.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { toDateKey, isDateInRange, compareDateKeys } = require("./dates");
const { normalizeWeekRow } = require("./week-validator");
const { parseCanonicalWeekKey, classifyWeekType } = require("./week-keys");

/**
 * @param {object} input
 * @param {unknown} input.activityDate
 * @param {object[]} input.weeks
 * @param {string} [input.challengeYear]
 * @param {string} [input.configRecordId]
 * @param {unknown} [input.submittedAt] — ignored for matching; logged in debug only
 * @param {string} [input.timezone]
 */
function resolveWeekForActivityDate(input = {}) {
  const timezone = input.timezone || "America/Denver";
  const activityKey = toDateKey(input.activityDate, timezone);
  const debug = {
    timezone,
    submittedAtIgnored: input.submittedAt != null,
    submittedAt: input.submittedAt ?? null,
    activityDateRaw: input.activityDate ?? null,
    activityDateKey: activityKey || null,
  };

  if (input.activityDate == null || String(input.activityDate).trim() === "") {
    return {
      ok: false,
      status: "unresolved",
      reason: "blank_activity_date",
      message: "Activity Date is required (do not use Submitted At alone).",
      week: null,
      debug,
    };
  }
  if (!activityKey) {
    return {
      ok: false,
      status: "unresolved",
      reason: "malformed_activity_date",
      message: `Activity Date could not be parsed: "${input.activityDate}".`,
      week: null,
      debug,
    };
  }

  let expectedYear = null;
  if (input.challengeYear) {
    const y = normalizeSchoolYear(input.challengeYear);
    if (!y.ok) {
      return {
        ok: false,
        status: "invalid_configuration",
        reason: y.code,
        message: y.message,
        week: null,
        debug,
      };
    }
    expectedYear = y.key;
  }

  const weeks = (input.weeks || []).map(normalizeWeekRow);
  if (weeks.length === 0) {
    return {
      ok: false,
      status: "unresolved",
      reason: "no_weeks",
      message: "No Weeks provided for resolution.",
      week: null,
      debug,
    };
  }

  const planStart = weeks
    .map((w) => w.startDate)
    .filter(Boolean)
    .sort(compareDateKeys)[0];
  const planEnd = weeks
    .map((w) => w.endDate)
    .filter(Boolean)
    .sort(compareDateKeys)
    .slice(-1)[0];

  if (planStart && compareDateKeys(activityKey, planStart) < 0) {
    return {
      ok: false,
      status: "unresolved",
      reason: "before_week_0",
      message: `Activity Date ${activityKey} is before plan start ${planStart}.`,
      week: null,
      debug: { ...debug, planStart, planEnd },
    };
  }
  if (planEnd && compareDateKeys(activityKey, planEnd) > 0) {
    return {
      ok: false,
      status: "unresolved",
      reason: "after_post_challenge",
      message: `Activity Date ${activityKey} is after plan end ${planEnd}.`,
      week: null,
      debug: { ...debug, planStart, planEnd },
    };
  }

  const candidates = weeks.filter((w) => {
    if (!w.startDate || !w.endDate) return false;
    if (!isDateInRange(activityKey, w.startDate, w.endDate)) return false;

    if (expectedYear) {
      let weekYear = w.challengeYear;
      if (!weekYear && w.weekKey) {
        const parsed = parseCanonicalWeekKey(w.weekKey);
        if (parsed.ok) weekYear = parsed.challengeYear;
      }
      if (weekYear && weekYear !== expectedYear) return false;
    }

    if (
      input.configRecordId &&
      w.configRecordId &&
      w.configRecordId !== input.configRecordId
    ) {
      return false;
    }

    return true;
  });

  debug.candidateIds = candidates.map((c) => c.id || c.weekKey || c.displayLabel);

  if (candidates.length === 0) {
    return {
      ok: false,
      status: "unresolved",
      reason: "outside_configured_challenge",
      message: `No Week covers Activity Date ${activityKey} for the requested challenge year/config.`,
      week: null,
      debug: { ...debug, planStart, planEnd },
    };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      status: "ambiguous",
      reason: "overlapping_or_duplicate_weeks",
      message: `Multiple Weeks match Activity Date ${activityKey}.`,
      week: null,
      matches: candidates,
      debug,
    };
  }

  const week = candidates[0];
  const weekType = week.weekType || classifyWeekType(week.displayLabel);

  return {
    ok: true,
    status: "resolved",
    reason: "activity_date_range_match",
    message: `Matched ${week.displayLabel} (${week.startDate}–${week.endDate}).`,
    week: {
      ...week,
      weekType,
    },
    debug,
  };
}

module.exports = {
  resolveWeekForActivityDate,
};
