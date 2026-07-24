/**
 * Canonical Week plan generator.
 *
 * Produces Week 0 + Week 1..N + Post-Challenge with Sunday–Saturday boundaries.
 * Does NOT write Airtable — outputs JSON/CSV/Markdown/validation report consumers.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { normalizeChallengeYearConfig } = require("./contract");
const {
  toDateKey,
  addDays,
  weekdaySunday0,
  compareDateKeys,
} = require("./dates");
const {
  buildCanonicalWeekKey,
  buildWeekEndKey,
  expectedDisplayLabel,
  validateSundaySaturday,
} = require("./week-keys");
const { validateWeekPlan } = require("./week-validator");

/**
 * Snap a date key to the Sunday on or before it (if already Sunday, keep).
 * Or require exact Sunday when requireExactSunday=true.
 */
function ensureSundayStart(dateKey, { requireExactSunday = true } = {}) {
  const key = toDateKey(dateKey);
  if (!key) {
    return { ok: false, code: "malformed_week_zero_start", message: "weekZeroStart required." };
  }
  const dow = weekdaySunday0(key);
  if (dow === 0) return { ok: true, startKey: key };
  if (requireExactSunday) {
    return {
      ok: false,
      code: "week_zero_start_not_sunday",
      message: `weekZeroStart ${key} must be a Sunday (got dow=${dow}).`,
    };
  }
  return { ok: true, startKey: addDays(key, -dow) };
}

/**
 * @param {object} input
 * @param {string} input.challengeYear
 * @param {string} input.weekZeroStart - Sunday YYYY-MM-DD
 * @param {number} input.regularWeeks - count of Week 1..N (Challenge Week Count)
 * @param {boolean} [input.includeWeekZero=true]
 * @param {boolean} [input.includePostChallenge=true]
 * @param {number} [input.postChallengeWeeks=1]
 * @param {string} [input.configRecordId]
 * @param {string} [input.timezone]
 */
function generateWeekPlan(input = {}) {
  const year = normalizeSchoolYear(input.challengeYear || input.challengeYearLabel);
  if (!year.ok) {
    return { ok: false, error: { code: year.code, message: year.message }, weeks: [] };
  }

  const regularWeeks = Number(input.regularWeeks ?? input.regularWeekCount);
  if (!Number.isInteger(regularWeeks) || regularWeeks < 1) {
    return {
      ok: false,
      error: {
        code: "invalid_regular_weeks",
        message: "regularWeeks must be a positive integer.",
      },
      weeks: [],
    };
  }

  const includeWeekZero = input.includeWeekZero !== false;
  const includePostChallenge = input.includePostChallenge !== false;
  const postChallengeWeeks = Number(input.postChallengeWeeks ?? 1);
  if (includePostChallenge && (!Number.isInteger(postChallengeWeeks) || postChallengeWeeks < 1)) {
    return {
      ok: false,
      error: {
        code: "invalid_post_challenge_weeks",
        message: "postChallengeWeeks must be a positive integer.",
      },
      weeks: [],
    };
  }

  const sunday = ensureSundayStart(input.weekZeroStart || input.weekZeroStartDate, {
    requireExactSunday: input.requireExactSunday !== false,
  });
  if (!sunday.ok) {
    return { ok: false, error: { code: sunday.code, message: sunday.message }, weeks: [] };
  }

  const timezone = String(input.timezone || "America/Denver");
  const configRecordId = input.configRecordId || null;
  const weeks = [];
  let cursor = sunday.startKey;
  let sequence = 0;

  const pushWeek = (weekType, ordinal) => {
    const startKey = cursor;
    const endKey = addDays(startKey, 6);
    const displayLabel = expectedDisplayLabel(weekType, ordinal);
    const key = buildCanonicalWeekKey(year.key, displayLabel);
    const endKeyBuilt = buildWeekEndKey(endKey, timezone);
    const boundary = validateSundaySaturday(startKey, endKey);
    const week = {
      sequence,
      ordinal: ordinal == null ? null : ordinal,
      weekType,
      displayLabel,
      weekName: displayLabel,
      startDate: startKey,
      endDate: endKey,
      weekEndKey: endKeyBuilt.ok ? endKeyBuilt.weekEndKey : "",
      weekKey: key.ok ? key.weekKey : "",
      challengeYear: year.key,
      configRecordId,
      timezone,
      currentHistoricalState: "planned",
      boundaryFindings: boundary,
    };
    weeks.push(week);
    sequence += 1;
    cursor = addDays(endKey, 1); // next Sunday
    return week;
  };

  if (includeWeekZero) {
    pushWeek("week_0", 0);
  }

  for (let n = 1; n <= regularWeeks; n += 1) {
    pushWeek("regular", n);
  }

  if (includePostChallenge) {
    for (let i = 0; i < postChallengeWeeks; i += 1) {
      // Only one Post-Challenge label is canonical; extra weeks get suffix.
      if (i === 0) pushWeek("post_challenge", null);
      else {
        // Keep Sunday/Sat geometry but mark non-canonical label for validation FAIL.
        const startKey = cursor;
        const endKey = addDays(startKey, 6);
        weeks.push({
          sequence,
          ordinal: null,
          weekType: "post_challenge",
          displayLabel: `Post-Challenge ${i + 1}`,
          weekName: `Post-Challenge ${i + 1}`,
          startDate: startKey,
          endDate: endKey,
          weekEndKey: endKey,
          weekKey: `${year.key}|Post-Challenge ${i + 1}`,
          challengeYear: year.key,
          configRecordId,
          timezone,
          currentHistoricalState: "planned",
          boundaryFindings: validateSundaySaturday(startKey, endKey),
          nonCanonical: true,
        });
        sequence += 1;
        cursor = addDays(endKey, 1);
      }
    }
  }

  const planStart = weeks[0] ? weeks[0].startDate : null;
  const planEnd = weeks.length ? weeks[weeks.length - 1].endDate : null;

  const validation = validateWeekPlan(weeks, {
    challengeYear: year.key,
    configRecordId,
    expectedRegularWeeks: regularWeeks,
    requireWeekZero: includeWeekZero,
    requirePostChallenge: includePostChallenge,
  });

  return {
    ok: validation.overall !== "FAIL",
    challengeYear: year.key,
    configRecordId,
    timezone,
    weekZeroStart: sunday.startKey,
    regularWeeks,
    includeWeekZero,
    includePostChallenge,
    planStart,
    planEnd,
    weeks,
    validation,
  };
}

/**
 * Generate from a normalized challenge-year config object / fixture.
 * @param {object} configRaw
 * @param {object} [overrides]
 */
function generateWeekPlanFromConfig(configRaw = {}, overrides = {}) {
  const normalized = normalizeChallengeYearConfig(configRaw);
  if (!normalized.ok) {
    return {
      ok: false,
      error: { code: normalized.code, message: normalized.message },
      weeks: [],
    };
  }
  const c = normalized.config;
  if (!c.weekZeroStart) {
    return {
      ok: false,
      error: {
        code: "missing_week_zero_start",
        message:
          "Config is missing weekZeroStart (proposed field). Pass --week-zero-start or set it on the fixture.",
      },
      weeks: [],
    };
  }
  if (!c.regularWeekCount) {
    return {
      ok: false,
      error: {
        code: "missing_regular_week_count",
        message: "Config is missing regularWeekCount / Challenge Week Count.",
      },
      weeks: [],
    };
  }
  return generateWeekPlan({
    challengeYear: c.challengeYearLabel,
    weekZeroStart: c.weekZeroStart,
    regularWeeks: c.regularWeekCount,
    configRecordId: c.configRecordId,
    timezone: c.timezone,
    ...overrides,
  });
}

/**
 * @param {object[]} weeks
 * @returns {string}
 */
function weeksToCsv(weeks = []) {
  const headers = [
    "Week Name",
    "Start Date",
    "End Date",
    "Sequence",
    "Week Type",
    "Week Key",
    "Week End Key",
    "Challenge Year",
    "Config Record ID",
    "Timezone",
    "Active?",
    "Intake Open?",
    "Counts for XP?",
    "Counts for Leaderboard?",
  ];
  const typeMap = {
    week_0: "Week 0",
    regular: "Regular",
    post_challenge: "Post-Challenge",
  };
  const lines = [headers.join(",")];
  for (const w of weeks) {
    const countsXp = w.weekType !== "week_0";
    const row = [
      csvEscape(w.weekName || w.displayLabel),
      w.startDate,
      w.endDate,
      w.sequence,
      typeMap[w.weekType] || w.weekType,
      w.weekKey,
      w.weekEndKey,
      w.challengeYear,
      w.configRecordId || "",
      w.timezone || "America/Denver",
      "true",
      "true",
      countsXp ? "true" : "false",
      countsXp ? "true" : "false",
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {object} plan
 * @returns {string}
 */
function weeksToMarkdown(plan) {
  const weeks = plan.weeks || [];
  const lines = [
    `# Week plan — ${plan.challengeYear || "(unknown year)"}`,
    "",
    `- Regular weeks: ${plan.regularWeeks}`,
    `- Week 0 start: ${plan.weekZeroStart || ""}`,
    `- Timezone: ${plan.timezone || "America/Denver"}`,
    `- Validation: ${plan.validation ? plan.validation.overall : "n/a"}`,
    "",
    "| Seq | Label | Type | Start | End | Week Key | Week End Key |",
    "|----:|-------|------|-------|-----|----------|--------------|",
  ];
  for (const w of weeks) {
    lines.push(
      `| ${w.sequence} | ${w.displayLabel} | ${w.weekType} | ${w.startDate} | ${w.endDate} | \`${w.weekKey}\` | ${w.weekEndKey} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  generateWeekPlan,
  generateWeekPlanFromConfig,
  weeksToCsv,
  weeksToMarkdown,
  ensureSundayStart,
};
