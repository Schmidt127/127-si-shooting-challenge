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
 *
 * Date-only rule (critical):
 * Airtable date-only Activity Dates often arrive as UTC midnight Date objects
 * (e.g. 2026-08-30T00:00:00.000Z). Converting those through America/Denver
 * yields the previous calendar day. Never timezone-convert a YYYY-MM-DD
 * date-only value — preserve the literal calendar key via toDateKeyFromText /
 * getCellValueAsString / toSafeDateKey before constructing a Date.
 */

"use strict";

/**
 * @typedef {{
 *   id: string,
 *   activityDateKey: string,
 *   totalShotsCounted: number,
 *   createdTime?: string,
 *   activityDate?: Date,
 * }} CountedSubmission
 * @typedef {{ dateKey: string, submissionId: string, beforeTotal: number, afterTotal: number, submissionShots: number, date?: Date }} GoalMetCrossing
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
 * Extract YYYY-MM-DD from a date-only string without timezone conversion.
 * Accepts ISO date prefixes and US M/D/YYYY display strings.
 * @param {unknown} textValue
 * @returns {string}
 */
function toDateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    const month = localMatch[1].padStart(2, "0");
    const day = localMatch[2].padStart(2, "0");
    const year = localMatch[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

/**
 * America/Denver calendar key for a true timestamp Date.
 * Do NOT use this for Airtable date-only UTC-midnight values — prefer
 * toDateKeyFromText / preserveActivityDateKey first.
 * @param {Date|string|null|undefined} value
 * @param {string} [timeZone]
 * @returns {string}
 */
function toDenverDateKey(value, timeZone = "America/Denver") {
  if (!value) return "";
  if (typeof value === "string") {
    const fromText = toDateKeyFromText(value);
    if (fromText) return fromText;
  }
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
 * Preserve a date-only Activity Date calendar key.
 * Prefer string/display text; never TZ-convert YYYY-MM-DD.
 * Fallback for Date-only UTC midnight uses UTC Y-M-D (Airtable date-only shape).
 * @param {unknown} rawValue - getCellValue result
 * @param {unknown} [textValue] - getCellValueAsString result
 * @returns {string}
 */
function preserveActivityDateKey(rawValue, textValue) {
  const fromText = toDateKeyFromText(textValue);
  if (fromText) return fromText;

  if (typeof rawValue === "string") {
    const fromRawText = toDateKeyFromText(rawValue);
    if (fromRawText) return fromRawText;
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    // Airtable date-only fields return UTC midnight for the calendar day.
    // Use UTC components — do not convert through America/Denver.
    const year = rawValue.getUTCFullYear();
    const month = String(rawValue.getUTCMonth() + 1).padStart(2, "0");
    const day = String(rawValue.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

/**
 * Sort counted submissions chronologically by preserved date key, then
 * createdTime, then record id.
 * @param {CountedSubmission[]} submissions
 * @returns {CountedSubmission[]}
 */
function sortCountedSubmissions(submissions) {
  return [...submissions].sort((a, b) => {
    const keyA = String(a.activityDateKey || "").trim();
    const keyB = String(b.activityDateKey || "").trim();
    const keyDiff = keyA.localeCompare(keyB);
    if (keyDiff !== 0) return keyDiff;
    const createdA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
    const createdB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
    if (createdA !== createdB) return createdA - createdB;
    return String(a.id).localeCompare(String(b.id));
  });
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
 * Uses preserved activityDateKey — never re-derives via Denver TZ conversion.
 * @param {CountedSubmission[]} submissions - already filtered to counted + shots > 0 + date key
 * @param {number} targetGoalShots
 * @returns {GoalMetCrossing|null}
 */
function findFirstGoalMetCrossing(submissions, targetGoalShots) {
  const target = Number(targetGoalShots);
  if (!Number.isFinite(target) || target <= 0) return null;
  const ordered = sortCountedSubmissions(submissions);
  let runningTotal = 0;
  for (const submission of ordered) {
    const shots = Number(submission.totalShotsCounted) || 0;
    const dateKey = String(submission.activityDateKey || "").trim();
    if (shots <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      continue;
    }
    const beforeTotal = runningTotal;
    runningTotal += shots;
    if (beforeTotal < target && runningTotal >= target) {
      return {
        dateKey,
        date: submission.activityDate,
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
 * Normalize an existing Goal Met Date cell to YYYY-MM-DD without previous-day shift.
 * @param {Date|string|null|undefined} existing
 * @returns {string}
 */
function existingGoalMetDateKey(existing) {
  if (!existing) return "";
  if (typeof existing === "string") {
    return toDateKeyFromText(existing) || String(existing).trim().slice(0, 10);
  }
  if (existing instanceof Date && !Number.isNaN(existing.getTime())) {
    return preserveActivityDateKey(existing, "");
  }
  return "";
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
  const existingKey = existingGoalMetDateKey(input.existingDate);
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
  const existingKey = existingGoalMetDateKey(input.existingDate);
  const crossingKey = input.crossing && input.crossing.dateKey ? input.crossing.dateKey : "";
  const legacyKey = existingGoalMetDateKey(input.legacyLookupDate);

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
  toDateKeyFromText,
  toDenverDateKey,
  preserveActivityDateKey,
  existingGoalMetDateKey,
  resolveTargetGoalShots,
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
  decideGoalMetDateMigrationWrite,
  decideGoalMetDateWriteLegacy,
};
