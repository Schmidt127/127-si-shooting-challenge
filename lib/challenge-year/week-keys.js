/**
 * Canonical Week key helpers.
 *
 * Verified PROD (schema snapshot 20260723-post-ts):
 * - Weeks.Week Name = primary display label (e.g. "Week 0", "Week 1", "Post-Challenge")
 * - Weeks.Week Key = formula RECORD_ID() today (NOT the challenge-year key)
 * - Weeks.Week End Key = NOT present on Weeks (118/119 fall back to End Date Denver key)
 *
 * Repository canonical key (desired ops identity):
 *   {challengeYear}|{displayLabel}  e.g. 2026-2027|Week 0
 *
 * Summary Key formula uses Enrollment Key - Lkp | Week Key - Lkp where Week Key
 * is currently the record id. Do not assume display label == unique key field.
 */

"use strict";

const { normalizeSchoolYear } = require("../config-selection");
const { toDateKey, weekdaySunday0 } = require("./dates");

const WEEK_LABEL_RE = /^Week\s+(\d+)$/i;
const POST_CHALLENGE_LABELS = new Set(["post-challenge", "post challenge"]);
const WEEK_ZERO_LABELS = new Set(["week 0", "week0", "early bird"]);

/**
 * @param {unknown} challengeYear
 * @param {unknown} displayLabel
 * @returns {{ ok: true, weekKey: string, challengeYear: string, displayLabel: string } | { ok: false, code: string, message: string }}
 */
function buildCanonicalWeekKey(challengeYear, displayLabel) {
  const year = normalizeSchoolYear(challengeYear);
  if (!year.ok) {
    return { ok: false, code: year.code, message: year.message };
  }
  const label = String(displayLabel || "").trim();
  if (!label) {
    return {
      ok: false,
      code: "blank_week_label",
      message: "Week display label is blank.",
    };
  }
  return {
    ok: true,
    weekKey: `${year.key}|${label}`,
    challengeYear: year.key,
    displayLabel: label,
  };
}

/**
 * Parse `{YYYY-YYYY}|{label}` keys. Rejects bare RECORD_ID-shaped values as
 * canonical challenge-year keys (they are Airtable Week Key today).
 *
 * @param {unknown} raw
 */
function parseCanonicalWeekKey(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return { ok: false, code: "blank_week_key", message: "Week key is blank." };
  }
  if (/^rec[a-zA-Z0-9]{14}$/.test(text)) {
    return {
      ok: false,
      code: "record_id_week_key",
      message:
        "Value looks like an Airtable record id. Canonical Week Key is {challengeYear}|{label}.",
    };
  }
  const pipe = text.indexOf("|");
  if (pipe <= 0 || pipe === text.length - 1) {
    return {
      ok: false,
      code: "malformed_week_key",
      message: `Week key is malformed: "${text}". Expected {YYYY-YYYY}|{label}.`,
    };
  }
  const yearPart = text.slice(0, pipe);
  const label = text.slice(pipe + 1).trim();
  const year = normalizeSchoolYear(yearPart);
  if (!year.ok) {
    return { ok: false, code: year.code, message: year.message };
  }
  if (!label) {
    return {
      ok: false,
      code: "blank_week_label",
      message: "Week label portion is blank.",
    };
  }
  return {
    ok: true,
    weekKey: `${year.key}|${label}`,
    challengeYear: year.key,
    displayLabel: label,
  };
}

/**
 * @param {unknown} endDate
 * @param {string} [timeZone]
 * @returns {{ ok: true, weekEndKey: string } | { ok: false, code: string, message: string }}
 */
function buildWeekEndKey(endDate, timeZone = "America/Denver") {
  const key = toDateKey(endDate, timeZone);
  if (!key) {
    return {
      ok: false,
      code: "malformed_week_end_key",
      message: "Could not derive Week End Key (YYYY-MM-DD) from End Date.",
    };
  }
  return { ok: true, weekEndKey: key };
}

/**
 * Classify a week display label into a week type.
 * @param {unknown} displayLabel
 * @param {unknown} [explicitType]
 */
function classifyWeekType(displayLabel, explicitType) {
  const explicit = String(explicitType || "").trim();
  if (explicit) {
    const normalized = explicit.toLowerCase();
    if (normalized === "week_0" || normalized === "week0") return "week_0";
    if (normalized === "regular" || normalized === "challenge") return "regular";
    if (normalized === "post_challenge" || normalized === "post-challenge") {
      return "post_challenge";
    }
    if (normalized === "early_bird" || normalized === "early bird") return "week_0";
    if (normalized === "final") return "regular";
    return normalized;
  }

  const label = String(displayLabel || "").trim();
  const lower = label.toLowerCase();
  if (WEEK_ZERO_LABELS.has(lower) || /^week\s*0$/i.test(label)) return "week_0";
  if (POST_CHALLENGE_LABELS.has(lower)) return "post_challenge";
  if (WEEK_LABEL_RE.test(label)) return "regular";
  return "unknown";
}

/**
 * Extract ordinal: Week 0 → 0, Week 1 → 1, Post-Challenge → null.
 * @param {unknown} displayLabel
 * @param {string} [weekType]
 */
function weekOrdinal(displayLabel, weekType) {
  const type = weekType || classifyWeekType(displayLabel);
  if (type === "post_challenge") return null;
  const label = String(displayLabel || "").trim();
  const m = WEEK_LABEL_RE.exec(label);
  if (m) return Number(m[1]);
  if (type === "week_0") return 0;
  return null;
}

/**
 * Expected display label for a generated week.
 * @param {"week_0"|"regular"|"post_challenge"} weekType
 * @param {number} [ordinal]
 */
function expectedDisplayLabel(weekType, ordinal) {
  if (weekType === "week_0") return "Week 0";
  if (weekType === "post_challenge") return "Post-Challenge";
  return `Week ${ordinal}`;
}

/**
 * Validate Sunday start / Saturday end for a challenge week.
 * @param {string} startKey
 * @param {string} endKey
 */
function validateSundaySaturday(startKey, endKey) {
  const findings = [];
  const startDow = weekdaySunday0(startKey);
  const endDow = weekdaySunday0(endKey);
  if (startDow !== 0) {
    findings.push({
      severity: "FAIL",
      code: "start_not_sunday",
      message: `Start Date ${startKey} is not Sunday (dow=${startDow}).`,
    });
  }
  if (endDow !== 6) {
    findings.push({
      severity: "FAIL",
      code: "end_not_saturday",
      message: `End Date ${endKey} is not Saturday (dow=${endDow}).`,
    });
  }
  return findings;
}

module.exports = {
  buildCanonicalWeekKey,
  parseCanonicalWeekKey,
  buildWeekEndKey,
  classifyWeekType,
  weekOrdinal,
  expectedDisplayLabel,
  validateSundaySaturday,
  WEEK_LABEL_RE,
};
