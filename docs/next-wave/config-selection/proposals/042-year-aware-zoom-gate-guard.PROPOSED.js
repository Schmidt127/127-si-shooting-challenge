/**
 * PROPOSED ONLY — not for PROD paste.
 *
 * Year-aware Config guard helpers for Automation 042.
 * Paste/adoption path: CONFIG-ROLLOUT-RUNBOOK.md (Phase B+).
 *
 * Source of truth for resolveConfig: lib/config-selection/index.js
 * (Airtable scripts must inline or paste a compatible excerpt — Airtable
 * cannot require() repo modules.)
 */

"use strict";

const { resolveConfig, normalizeSchoolYear } = require("../../../../lib/config-selection");

/**
 * @param {object} args
 * @param {Array<object>} args.configRows — [{ id, activeSchoolYear, fields }]
 * @param {string} [args.enrollmentSchoolYear]
 * @param {string} [args.programInstanceSchoolYear]
 * @param {string} [args.explicitConfigRecordId]
 * @param {boolean} [args.enforceConfigGateCreditFlag]
 * @param {"error"|"warn"|"off"} [args.configYearMismatchMode]
 */
function evaluate042ConfigGuard(args = {}) {
  const {
    configRows = [],
    enrollmentSchoolYear,
    programInstanceSchoolYear,
    explicitConfigRecordId,
    enforceConfigGateCreditFlag = false,
    configYearMismatchMode = "warn",
    linkedMeetingConfigYears = [],
  } = args;

  const resolved = resolveConfig({
    configRows,
    enrollmentSchoolYear,
    programInstanceSchoolYear,
    explicitConfigRecordId,
  });

  if (!resolved.ok) {
    return {
      ok: false,
      action: configYearMismatchMode === "off" ? "continue" : "block",
      reason: resolved.error.code,
      message: resolved.error.message,
      debug: resolved.debug,
      allowRecordingGateCredit: false,
    };
  }

  const mismatches = (linkedMeetingConfigYears || [])
    .map((y) => normalizeSchoolYear(y))
    .filter((n) => n.ok && n.key !== resolved.schoolYearKey)
    .map((n) => n.key);

  const yearMismatch = mismatches.length > 0;
  if (yearMismatch && configYearMismatchMode === "error") {
    return {
      ok: false,
      action: "block",
      reason: "meeting_config_year_mismatch",
      message: `Linked meeting Config year(s) ${mismatches.join(",")} != enrollment Config ${resolved.schoolYearKey}`,
      resolved,
      allowRecordingGateCredit: false,
    };
  }

  const gateFlag =
    resolved.config.fields &&
    resolved.config.fields["Recording Gives Full Zoom Gate Credit?"];
  const allowRecordingGateCredit = enforceConfigGateCreditFlag
    ? gateFlag === true
    : true;

  return {
    ok: true,
    action: yearMismatch ? "warn" : "continue",
    reason: yearMismatch ? "meeting_config_year_mismatch" : "ok",
    resolved,
    allowRecordingGateCredit,
    debug: {
      schoolYearKey: resolved.schoolYearKey,
      configRecordId: resolved.configRecordId,
      selectionSource: resolved.selectionSource,
      yearMismatch,
      mismatches,
      enforceConfigGateCreditFlag,
    },
  };
}

module.exports = {
  evaluate042ConfigGuard,
};
