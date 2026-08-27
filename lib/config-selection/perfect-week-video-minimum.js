/**
 * Perfect Week video minimum — shared contract for Automation 057 and WAS formula.
 *
 * Config field (when present): Perfect Week Video Minimum (numeric, year-aware via resolveConfig).
 * Until the field exists in Airtable, consumers use legacyRequiredVideoCount (3) aligned with WAS.
 */

"use strict";

const PERFECT_WEEK_VIDEO_MINIMUM_FIELD = "Perfect Week Video Minimum";
const LEGACY_REQUIRED_VIDEO_COUNT = 3;

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: number } | { ok: false, code: string, message: string }}
 */
function parsePerfectWeekVideoMinimum(value) {
  if (value === null || value === undefined || value === "") {
    return {
      ok: false,
      code: "blank_video_minimum",
      message: "Perfect Week Video Minimum is blank.",
    };
  }

  let raw = value;
  if (Array.isArray(raw)) {
    if (raw.length !== 1) {
      return {
        ok: false,
        code: "ambiguous_video_minimum",
        message: "Perfect Week Video Minimum must be a single numeric value.",
      };
    }
    raw = raw[0];
  }

  if (raw === null || raw === undefined || raw === "") {
    return {
      ok: false,
      code: "blank_video_minimum",
      message: "Perfect Week Video Minimum is blank.",
    };
  }

  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return {
      ok: false,
      code: "invalid_video_minimum",
      message: `Perfect Week Video Minimum must be a non-negative integer; got "${String(raw)}".`,
    };
  }

  return { ok: true, value: parsed };
}

/**
 * Resolve the effective video minimum for Perfect Week eligibility.
 *
 * @param {object} input
 * @param {boolean} input.configFieldExists — Config table has Perfect Week Video Minimum
 * @param {Record<string, unknown>|null|undefined} [input.configRowFields]
 * @param {number} [input.legacyRequiredVideoCount]
 */
function resolvePerfectWeekVideoMinimum({
  configFieldExists,
  configRowFields,
  legacyRequiredVideoCount = LEGACY_REQUIRED_VIDEO_COUNT,
} = {}) {
  if (!configFieldExists) {
    return {
      ok: true,
      requiredVideoCount: legacyRequiredVideoCount,
      source: "legacy_was_formula_alignment",
      configFieldExists: false,
    };
  }

  const parsed = parsePerfectWeekVideoMinimum(
    configRowFields && configRowFields[PERFECT_WEEK_VIDEO_MINIMUM_FIELD]
  );
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed,
      configFieldExists: true,
    };
  }

  return {
    ok: true,
    requiredVideoCount: parsed.value,
    source: "config_perfect_week_video_minimum",
    configFieldExists: true,
  };
}

/**
 * Mirror of WAS `Perfect Week Video Requirement Met?` for contract tests.
 * @param {number} videoCount
 * @param {number} requiredVideoCount
 */
function evaluateWasVideoRequirementMet(videoCount, requiredVideoCount) {
  return Number(videoCount) >= Number(requiredVideoCount) ? 1 : 0;
}

/**
 * Proposed WAS formula body once a numeric lookup/threshold field is available.
 * @param {number} threshold
 */
function buildWasVideoRequirementFormula(threshold) {
  const n = Number(threshold);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("WAS video requirement threshold must be a non-negative number.");
  }
  return `IF({Perfect Week Video Count} >= ${n}, 1, 0)`;
}

module.exports = {
  PERFECT_WEEK_VIDEO_MINIMUM_FIELD,
  LEGACY_REQUIRED_VIDEO_COUNT,
  parsePerfectWeekVideoMinimum,
  resolvePerfectWeekVideoMinimum,
  evaluateWasVideoRequirementMet,
  buildWasVideoRequirementFormula,
};
