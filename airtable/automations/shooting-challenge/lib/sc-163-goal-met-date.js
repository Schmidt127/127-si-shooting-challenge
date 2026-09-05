/**
 * SC-163 Goal Met Date — pure helpers (no Airtable I/O).
 *
 * Ownership rule:
 * - Goal Met? (formula) = live Total Shots Counted >= Target Goal Shots.
 * - Goal Met Date = FIRST Activity Date where cumulative counted shots cross the
 *   Target Goal Shots line. Blank until met. Never overwrite once set.
 * - Award Recipients / Date Awarded are fulfillment (Conquered Goal gift card),
 *   not the activity Goal Met Date.
 */

"use strict";

/**
 * @typedef {{ id: string, activityDate: Date, totalShotsCounted: number, createdTime?: string }} CountedSubmission
 * @typedef {{ date: Date, dateKey: string, submissionId: string, beforeTotal: number, afterTotal: number, submissionShots: number }} GoalMetCrossing
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
    if (shots <= 0 || !(submission.activityDate instanceof Date) || Number.isNaN(submission.activityDate.getTime())) {
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
 * @param {{ existingDate: Date|string|null|undefined, goalMetNow: boolean, crossing: GoalMetCrossing|null }} input
 * @returns {{ action: 'write'|'skip_already_set'|'skip_not_met'|'skip_unprovable', dateKey?: string, crossing?: GoalMetCrossing }}
 */
function decideGoalMetDateWrite(input) {
  const existing = input.existingDate;
  const existingKey =
    existing instanceof Date
      ? toDenverDateKey(existing)
      : String(existing || "").trim().slice(0, 10);
  if (existingKey) {
    return { action: "skip_already_set", dateKey: existingKey };
  }
  if (!input.goalMetNow) {
    return { action: "skip_not_met" };
  }
  if (!input.crossing || !input.crossing.dateKey) {
    return { action: "skip_unprovable" };
  }
  return {
    action: "write",
    dateKey: input.crossing.dateKey,
    crossing: input.crossing,
  };
}

module.exports = {
  sortCountedSubmissions,
  toDenverDateKey,
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
};
