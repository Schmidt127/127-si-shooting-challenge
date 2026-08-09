/**
 * Canonical Shooting Challenge season-period generator.
 *
 * Product contract (2026-08-08):
 * - Program dates are May 1 through June 30.
 * - Early Bird is a full Sunday-Saturday period ending on the program start date.
 * - Numbered challenge Weeks begin the following Sunday.
 * - The final numbered Week may be truncated by the hard program end date.
 * - Post-Challenge begins after the hard program end and is not required to be Sunday-Saturday.
 *
 * Does NOT write Airtable — outputs JSON/CSV/Markdown/validation consumers.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { normalizeChallengeYearConfig } = require("./contract");
const { toDateKey, addDays, weekdaySunday0, compareDateKeys } = require("./dates");
const {
  buildCanonicalWeekKey,
  buildWeekEndKey,
  expectedDisplayLabel,
  validateSundaySaturday,
} = require("./week-keys");
const { validateWeekPlan } = require("./week-validator");

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

function makePeriod({
  sequence,
  ordinal,
  weekType,
  startDate,
  endDate,
  year,
  configRecordId,
  timezone,
  boundaryFindings,
}) {
  const displayLabel = expectedDisplayLabel(weekType, ordinal);
  const key = buildCanonicalWeekKey(year, displayLabel);
  const endKey = buildWeekEndKey(endDate, timezone);
  return {
    sequence,
    ordinal: ordinal == null ? null : ordinal,
    weekType,
    displayLabel,
    weekName: displayLabel,
    startDate,
    endDate,
    weekEndKey: endKey.ok ? endKey.weekEndKey : "",
    weekKey: key.ok ? key.weekKey : "",
    challengeYear: year,
    configRecordId,
    timezone,
    currentHistoricalState: "planned",
    boundaryFindings: boundaryFindings || [],
  };
}

/**
 * @param {object} input
 * @param {string} input.challengeYear
 * @param {string} input.weekZeroStart - Sunday starting Early Bird
 * @param {number} input.regularWeeks - count of numbered challenge Weeks
 * @param {string} [input.challengeEndDate] - hard challenge/program end; may truncate final Week
 * @param {boolean} [input.includeWeekZero=true]
 * @param {boolean} [input.includePostChallenge=true]
 * @param {string} [input.postChallengeStartDate]
 * @param {string} [input.postChallengeEndDate]
 * @param {number} [input.postChallengeDays=7]
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
      error: { code: "invalid_regular_weeks", message: "regularWeeks must be a positive integer." },
      weeks: [],
    };
  }

  const includeWeekZero = input.includeWeekZero !== false;
  const includePostChallenge = input.includePostChallenge !== false;
  const sunday = ensureSundayStart(input.weekZeroStart || input.weekZeroStartDate, {
    requireExactSunday: input.requireExactSunday !== false,
  });
  if (!sunday.ok) {
    return { ok: false, error: { code: sunday.code, message: sunday.message }, weeks: [] };
  }

  const timezone = String(input.timezone || "America/Denver");
  const configRecordId = input.configRecordId || null;
  const challengeEndDate = toDateKey(
    input.challengeEndDate || input.endDate || input.programEndDate,
    timezone
  );
  const weeks = [];
  let sequence = 0;
  let cursor = sunday.startKey;

  if (includeWeekZero) {
    const earlyBirdEnd = addDays(cursor, 6);
    weeks.push(
      makePeriod({
        sequence: sequence++,
        ordinal: 0,
        weekType: "week_0",
        startDate: cursor,
        endDate: earlyBirdEnd,
        year: year.key,
        configRecordId,
        timezone,
        boundaryFindings: validateSundaySaturday(cursor, earlyBirdEnd),
      })
    );
    cursor = addDays(earlyBirdEnd, 1);
  }

  for (let n = 1; n <= regularWeeks; n += 1) {
    const naturalEnd = addDays(cursor, 6);
    let endDate = naturalEnd;
    let terminalPartial = false;

    if (
      n === regularWeeks &&
      challengeEndDate &&
      compareDateKeys(challengeEndDate, cursor) >= 0 &&
      compareDateKeys(challengeEndDate, naturalEnd) < 0
    ) {
      endDate = challengeEndDate;
      terminalPartial = true;
    }

    if (challengeEndDate && compareDateKeys(cursor, challengeEndDate) > 0) {
      return {
        ok: false,
        error: {
          code: "regular_week_starts_after_challenge_end",
          message: `Week ${n} starts ${cursor}, after challenge end ${challengeEndDate}.`,
        },
        weeks,
      };
    }

    const boundary = terminalPartial
      ? []
      : validateSundaySaturday(cursor, endDate);
    const week = makePeriod({
      sequence: sequence++,
      ordinal: n,
      weekType: "regular",
      startDate: cursor,
      endDate,
      year: year.key,
      configRecordId,
      timezone,
      boundaryFindings: boundary,
    });
    if (terminalPartial) week.terminalPartial = true;
    weeks.push(week);
    cursor = addDays(endDate, 1);
  }

  if (challengeEndDate) {
    const finalRegular = [...weeks].reverse().find((week) => week.weekType === "regular");
    if (!finalRegular || finalRegular.endDate !== challengeEndDate) {
      return {
        ok: false,
        error: {
          code: "challenge_end_not_covered",
          message: `Final numbered Week must end on hard challenge end ${challengeEndDate}.`,
        },
        weeks,
      };
    }
  }

  if (includePostChallenge) {
    const defaultPostStart = challengeEndDate ? addDays(challengeEndDate, 1) : cursor;
    const postStart = toDateKey(input.postChallengeStartDate || input.postChallengeStart, timezone) || defaultPostStart;
    const postDays = Number(input.postChallengeDays ?? 7);
    if (!Number.isInteger(postDays) || postDays < 1) {
      return {
        ok: false,
        error: { code: "invalid_post_challenge_days", message: "postChallengeDays must be a positive integer." },
        weeks,
      };
    }
    const postEnd =
      toDateKey(input.postChallengeEndDate || input.postChallengeEnd, timezone) || addDays(postStart, postDays - 1);
    if (compareDateKeys(postEnd, postStart) < 0) {
      return {
        ok: false,
        error: {
          code: "post_challenge_end_before_start",
          message: `Post-Challenge end ${postEnd} is before start ${postStart}.`,
        },
        weeks,
      };
    }
    weeks.push(
      makePeriod({
        sequence: sequence++,
        ordinal: null,
        weekType: "post_challenge",
        startDate: postStart,
        endDate: postEnd,
        year: year.key,
        configRecordId,
        timezone,
        boundaryFindings: [],
      })
    );
  }

  const validation = validateWeekPlan(weeks, {
    challengeYear: year.key,
    configRecordId,
    expectedRegularWeeks: regularWeeks,
    requireWeekZero: includeWeekZero,
    requirePostChallenge: includePostChallenge,
    allowTerminalPartialWeek: Boolean(challengeEndDate),
    challengeEndDate,
    allowFlexiblePostChallenge: true,
  });

  return {
    ok: validation.overall !== "FAIL",
    challengeYear: year.key,
    configRecordId,
    timezone,
    weekZeroStart: sunday.startKey,
    regularWeeks,
    challengeEndDate: challengeEndDate || null,
    includeWeekZero,
    includePostChallenge,
    planStart: weeks[0]?.startDate || null,
    planEnd: weeks.at(-1)?.endDate || null,
    weeks,
    validation,
  };
}

function generateWeekPlanFromConfig(configRaw = {}, overrides = {}) {
  const normalized = normalizeChallengeYearConfig(configRaw);
  if (!normalized.ok) {
    return { ok: false, error: { code: normalized.code, message: normalized.message }, weeks: [] };
  }
  const c = normalized.config;
  if (!c.weekZeroStart) {
    return {
      ok: false,
      error: {
        code: "missing_week_zero_start",
        message: "Config is missing weekZeroStart. Pass the Sunday starting Early Bird.",
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
    challengeEndDate: c.endDate,
    postChallengeStartDate: c.postChallengeStart,
    postChallengeEndDate: c.postChallengeEnd,
    configRecordId: c.configRecordId,
    timezone: c.timezone,
    ...overrides,
  });
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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
  const typeMap = { week_0: "Early Bird", regular: "Regular", post_challenge: "Post-Challenge" };
  const lines = [headers.join(",")];
  for (const w of weeks) {
    const countsXp = w.weekType !== "week_0";
    const row = [
      w.weekName || w.displayLabel,
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

function weeksToMarkdown(plan) {
  const lines = [
    `# Week plan — ${plan.challengeYear || "(unknown year)"}`,
    "",
    `- Regular weeks: ${plan.regularWeeks}`,
    `- Early Bird start: ${plan.weekZeroStart || ""}`,
    `- Challenge end: ${plan.challengeEndDate || ""}`,
    `- Timezone: ${plan.timezone || "America/Denver"}`,
    `- Validation: ${plan.validation ? plan.validation.overall : "n/a"}`,
    "",
    "| Seq | Label | Type | Start | End | Week Key | Week End Key |",
    "|----:|-------|------|-------|-----|----------|--------------|",
  ];
  for (const w of plan.weeks || []) {
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
