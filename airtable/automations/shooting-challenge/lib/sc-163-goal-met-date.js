/**
 * SC-163 Goal Met Date — pure helpers (no Airtable I/O).
 *
 * Ownership (production):
 * - Goal Met? (formula) = live Total Shots Counted >= Target Goal Shots.
 * - Goal Met Date = FIRST Activity Date where cumulative counted shots cross the
 *   Target Goal Shots line. Blank until met. Never overwrite once set.
 * - Award Recipients / Date Awarded are fulfillment (Conquered Goal gift card),
 *   not the activity Goal Met Date.
 * - Automation **066** stamps Goal Met Date (capacity-safe). Automation 122 is
 *   superseded and must not be installed.
 */

"use strict";

/**
 * @typedef {{ id: string, activityDate: Date, totalShotsCounted: number, createdTime?: string }} CountedSubmission
 * @typedef {{ date: Date, dateKey: string, submissionId: string, beforeTotal: number, afterTotal: number, submissionShots: number }} GoalMetCrossing
 * @typedef {{
 *   action:
 *     | 'stamped'
 *     | 'skipped_already_set'
 *     | 'skipped_not_met'
 *     | 'skipped_no_target'
 *     | 'error_unprovable'
 *     | 'error_ambiguous',
 *   dateKey?: string,
 *   crossing?: GoalMetCrossing,
 *   target?: number,
 * }} GoalMetDateDecision
 */

/**
 * Sort counted submissions chronologically (Activity Date, then createdTime, then id).
 * @param {CountedSubmission[]} submissions
 * @returns {CountedSubmission[]}
 */
function sortCountedSubmissions(submissions) {
  return [...submissions].sort((a, b) => {
    const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    const createdA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
    const createdB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
    if (createdA !== createdB) return createdA - createdB;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * America/Denver calendar key for a Date (matches 005/034/066).
 * @param {Date|string|null|undefined} value
 * @param {string} [timeZone]
 * @returns {string}
 */
function toDenverDateKey(value, timeZone = "America/Denver") {
  if (!value) return "";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/**
 * Resolve Target Goal Shots from a raw cell value (number or lookup array).
 * @param {unknown} raw
 * @returns {{ status: 'ok'|'missing'|'ambiguous', target: number }}
 */
function resolveTargetGoalShots(raw) {
  if (raw == null || raw === "") {
    return { status: "missing", target: 0 };
  }
  if (Array.isArray(raw)) {
    const nums = [];
    for (const item of raw) {
      const n = typeof item === "number" ? item : Number(item);
      if (Number.isFinite(n) && n > 0) nums.push(n);
    }
    const unique = [...new Set(nums)];
    if (unique.length === 0) return { status: "missing", target: 0 };
    if (unique.length > 1) return { status: "ambiguous", target: 0 };
    return { status: "ok", target: unique[0] };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { status: "missing", target: 0 };
  return { status: "ok", target: n };
}

/**
 * First Activity Date where running counted shots cross target.
 * @param {CountedSubmission[]} submissions - already filtered to counted + shots > 0 + activity date
 * @param {number} targetGoalShots
 * @param {{ timeZone?: string }} [options]
 * @returns {GoalMetCrossing|null}
 */
function findFirstGoalMetCrossing(submissions, targetGoalShots, options = {}) {
  const target = Number(targetGoalShots);
  if (!Number.isFinite(target) || target <= 0) return null;
  const timeZone = options.timeZone || "America/Denver";
  const ordered = sortCountedSubmissions(submissions);
  let runningTotal = 0;
  for (const submission of ordered) {
    const shots = Number(submission.totalShotsCounted) || 0;
    if (
      shots <= 0 ||
      !(submission.activityDate instanceof Date) ||
      Number.isNaN(submission.activityDate.getTime())
    ) {
      continue;
    }
    const beforeTotal = runningTotal;
    runningTotal += shots;
    if (beforeTotal < target && runningTotal >= target) {
      return {
        date: submission.activityDate,
        dateKey: toDenverDateKey(submission.activityDate, timeZone),
        submissionId: submission.id,
        beforeTotal,
        afterTotal: runningTotal,
        submissionShots: shots,
      };
    }
  }
  return null;
}

/**
 * Decide whether Goal Met Date may be written.
 * Never invent. Never overwrite a non-empty existing date.
 * Fail closed when met but crossing cannot be proven.
 *
 * @param {{
 *   existingDate: Date|string|null|undefined,
 *   goalMetNow: boolean,
 *   crossing: GoalMetCrossing|null,
 *   targetStatus?: 'ok'|'missing'|'ambiguous',
 *   calculatedTotal?: number,
 *   reportedTotal?: number,
 *   target?: number,
 * }} input
 * @returns {GoalMetDateDecision}
 */
function decideGoalMetDateWrite(input) {
  const existing = input.existingDate;
  const existingKey =
    existing instanceof Date
      ? toDenverDateKey(existing)
      : String(existing || "").trim().slice(0, 10);
  if (existingKey) {
    return { action: "skipped_already_set", dateKey: existingKey };
  }

  const targetStatus = input.targetStatus || "ok";
  if (targetStatus === "ambiguous") {
    return { action: "error_ambiguous" };
  }
  if (targetStatus === "missing") {
    return { action: "skipped_no_target" };
  }

  if (!input.goalMetNow) {
    return { action: "skipped_not_met" };
  }

  const target = Number(input.target) || 0;
  const calculated = Number(input.calculatedTotal);
  if (
    Number.isFinite(calculated) &&
    target > 0 &&
    calculated < target &&
    input.goalMetNow
  ) {
    // Formula/rollup claims met, but counted submissions cannot reach target.
    return { action: "error_ambiguous" };
  }

  if (!input.crossing || !input.crossing.dateKey) {
    return { action: "error_unprovable" };
  }

  return {
    action: "stamped",
    dateKey: input.crossing.dateKey,
    crossing: input.crossing,
    target,
  };
}

/**
 * Post-conversion / migration decision.
 *
 * Legacy Award Recipient lookup dates must not become permanently accepted.
 * Preserve an existing stored date only when it equals the provable crossing.
 * Replace mismatches only with a provable crossing. Never invent.
 * Clear unprovable legacy values so award dates cannot stick.
 *
 * @param {{
 *   existingDate: Date|string|null|undefined,
 *   goalMetNow: boolean,
 *   crossing: GoalMetCrossing|null,
 *   targetStatus?: 'ok'|'missing'|'ambiguous',
 *   calculatedTotal?: number,
 *   reportedTotal?: number,
 *   target?: number,
 *   legacyLookupDate?: Date|string|null|undefined,
 * }} input
 * @returns {GoalMetDateDecision & { action: GoalMetDateDecision['action'] | 'replaced_mismatch' | 'clear_unprovable_legacy' }}
 */
function decideGoalMetDateMigrationWrite(input) {
  const existingKey =
    input.existingDate instanceof Date
      ? toDenverDateKey(input.existingDate)
      : String(input.existingDate || "").trim().slice(0, 10);
  const crossingKey = input.crossing && input.crossing.dateKey ? input.crossing.dateKey : "";
  const legacyKey =
    input.legacyLookupDate instanceof Date
      ? toDenverDateKey(input.legacyLookupDate)
      : String(input.legacyLookupDate || "").trim().slice(0, 10);

  const targetStatus = input.targetStatus || "ok";
  if (targetStatus === "ambiguous") {
    return { action: "error_ambiguous" };
  }
  if (targetStatus === "missing") {
    return { action: "skipped_no_target" };
  }

  // Existing equals provable crossing → keep forever.
  if (existingKey && crossingKey && existingKey === crossingKey) {
    return { action: "skipped_already_set", dateKey: existingKey, crossing: input.crossing };
  }

  // Mismatch (including legacy award date that survived conversion) → replace only if provable.
  if (existingKey && crossingKey && existingKey !== crossingKey) {
    return {
      action: "replaced_mismatch",
      dateKey: crossingKey,
      crossing: input.crossing,
      target: Number(input.target) || 0,
    };
  }

  // Existing date with no provable crossing: clear so legacy award dates cannot stick.
  if (existingKey && !crossingKey) {
    return { action: "clear_unprovable_legacy", dateKey: "" };
  }

  // Blank existing → same blank-path rules as steady-state writer.
  const blankDecision = decideGoalMetDateWrite({
    ...input,
    existingDate: null,
  });
  // If snapshot said a legacy lookup existed for this enrollment but the cell is
  // already blank after conversion, do not invent — blankDecision already fails closed.
  if (legacyKey && blankDecision.action === "skipped_not_met") {
    return blankDecision;
  }
  return blankDecision;
}

/** @deprecated Use decideGoalMetDateWrite; kept for older callers expecting write/skip_* names. */
function decideGoalMetDateWriteLegacy(input) {
  const decision = decideGoalMetDateWrite(input);
  if (decision.action === "stamped") {
    return { action: "write", dateKey: decision.dateKey, crossing: decision.crossing };
  }
  if (decision.action === "error_unprovable") {
    return { action: "skip_unprovable" };
  }
  if (decision.action === "skipped_already_set") {
    return { action: "skip_already_set", dateKey: decision.dateKey };
  }
  if (decision.action === "skipped_not_met") {
    return { action: "skip_not_met" };
  }
  return { action: decision.action };
}

module.exports = {
  sortCountedSubmissions,
  toDenverDateKey,
  resolveTargetGoalShots,
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
  decideGoalMetDateMigrationWrite,
  decideGoalMetDateWriteLegacy,
};
