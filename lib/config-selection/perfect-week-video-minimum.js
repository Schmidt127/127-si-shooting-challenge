/**
 * Perfect Week video minimum — shared contract for Automation 057 and WAS formula.
 *
 * Config field: Perfect Week Video MInimum (number, precision 0; year-aware via resolveConfig).
 * Verified Production base appn84sqPw03zEbTT 2026-08-27 — field id fldqRxjWGXcbUZUg3.
 * Note: Airtable field name uses capital "I" in "MInimum" (rename recommended; code matches live schema).
 */

"use strict";

const PERFECT_WEEK_VIDEO_MINIMUM_FIELD = "Perfect Week Video MInimum";
/** Recommended WAS lookup from Enrollment → Config - Lnk → Perfect Week Video MInimum */
const WAS_CONFIG_VIDEO_MINIMUM_LOOKUP_FIELD = "Config: Perfect Week Video MInimum";

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
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      code: "invalid_video_minimum",
      message: `Perfect Week Video Minimum must be a positive integer; got "${String(raw)}".`,
    };
  }

  return { ok: true, value: parsed };
}

/**
 * Resolve the effective video minimum for Perfect Week eligibility (fail-closed).
 *
 * @param {object} input
 * @param {Record<string, unknown>|null|undefined} [input.configRowFields]
 */
function resolvePerfectWeekVideoMinimum({ configRowFields } = {}) {
  const parsed = parsePerfectWeekVideoMinimum(
    configRowFields && configRowFields[PERFECT_WEEK_VIDEO_MINIMUM_FIELD]
  );
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed,
    };
  }

  return {
    ok: true,
    requiredVideoCount: parsed.value,
    source: "config_perfect_week_video_minimum",
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
 * WAS `Perfect Week Video Requirement Met?` formula using Config lookup (not a literal threshold).
 * @param {string} [lookupFieldName]
 */
function buildWasVideoRequirementFormula(
  lookupFieldName = WAS_CONFIG_VIDEO_MINIMUM_LOOKUP_FIELD
) {
  const name = String(lookupFieldName || "").trim();
  if (!name) {
    throw new Error("WAS video requirement lookup field name is required.");
  }
  return `IF({Perfect Week Video Count} >= {${name}}, 1, 0)`;
}

module.exports = {
  PERFECT_WEEK_VIDEO_MINIMUM_FIELD,
  WAS_CONFIG_VIDEO_MINIMUM_LOOKUP_FIELD,
  parsePerfectWeekVideoMinimum,
  resolvePerfectWeekVideoMinimum,
  evaluateWasVideoRequirementMet,
  buildWasVideoRequirementFormula,
};
