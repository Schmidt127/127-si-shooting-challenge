/**
 * Season-specific health findings for Reliability Command Center integration.
 *
 * Clean boundary — do not fork RCC:
 * - This module emits portable season findings only.
 * - If `lib/reliability-command-center` exists (merged via PR #40 / master),
 *   map into the canonical RCC `buildIssue` contract.
 * - If RCC is absent, return portable findings (Season Launch still works).
 *
 * Season-specific codes only: multiple/overlapping Configs, missing Weeks,
 * cross-season Enrollment/WAS/XP, stale prior-season send/build flags.
 */

"use strict";

function tryRequireRcc() {
  try {
    return require("../reliability-command-center");
  } catch {
    return null;
  }
}

/**
 * Build season findings from launch preflight artifacts.
 */
function buildSeasonReliabilityFindings(input = {}) {
  const findings = [];
  const year = input.challengeYear || null;
  const configId = input.configRecordId || null;

  const exportResult = input.exportResult;
  if (exportResult) {
    for (const f of exportResult.failed || []) {
      findings.push(mapFinding(f, year, configId));
    }
    for (const f of exportResult.warnings || []) {
      findings.push(mapFinding(f, year, configId));
    }
  }

  const rollover = input.rollover;
  if (rollover) {
    for (const c of rollover.failedChecks || []) {
      findings.push(
        mapFinding(
          { severity: "FAIL", code: c.code, message: c.message || c.code },
          year,
          configId
        )
      );
    }
  }

  const automationAudit = input.automationAudit;
  if (automationAudit) {
    for (const f of automationAudit.findings || []) {
      findings.push(
        mapFinding(
          {
            severity: f.severity || "FAIL",
            code: f.code,
            message: `${f.automation || ""} ${f.message}`.trim(),
          },
          year,
          configId
        )
      );
    }
  }

  // Deduplicate by code+message
  const seen = new Set();
  const unique = [];
  for (const f of findings) {
    const key = `${f.code}|${f.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }

  const rcc = tryRequireRcc();
  if (rcc && typeof rcc.buildIssue === "function") {
    return {
      integration: "reliability-command-center",
      issues: unique.map((f) =>
        rcc.buildIssue({
          code: f.code,
          workflow: "season_launch",
          sourceTable: "Config",
          sourceRecordId: configId || "unknown",
          healthStatus: f.severity === "FAIL" ? "Blocking Error" : "Needs Manual Review",
          recommendedAction: f.message,
          errorMessage: f.message,
          evidence: [f.code, year || "", ...(f.recordIds || [])].filter(Boolean),
          meta: { challengeYear: year, configRecordId: configId, category: f.category },
        })
      ),
      findings: unique,
    };
  }

  return {
    integration: "portable_season_findings",
    findings: unique,
    note: "RCC createIssue not available — portable findings emitted for later ingest.",
  };
}

function mapFinding(f, year, configId) {
  const code = f.code || "season_finding";
  const category = categorize(code);
  return {
    severity: f.severity || "FAIL",
    code,
    category,
    message: f.message || code,
    challengeYear: year,
    configRecordId: configId,
    recordIds: f.recordIds || f.affectedIds || [],
  };
}

function categorize(code) {
  if (/multiple_active_configs|overlapping_config/.test(code)) return "config_health";
  if (/week|week_0|post_challenge|gap_between|overlapping_date/.test(code)) return "week_plan";
  if (/enrollment|grade_band|stale_goal|prior_year_current_level/.test(code)) return "enrollment_season";
  if (/summary|was|duplicate_summaries|email_package|build_flag|sent_flag/.test(code)) {
    return "was_season";
  }
  if (/xp_|achievement|perfect_week|milestone|level_recalc/.test(code)) return "xp_cross_season";
  if (/hardcoded|automation/.test(code)) return "automation_hardcode";
  if (/fillout|make_package|web_package|web_old/.test(code)) return "external_routing";
  return "season_launch";
}

/** Catalog of season finding codes for RCC view wiring. */
const SEASON_FINDING_CODES = Object.freeze([
  "multiple_active_configs",
  "overlapping_config_dates",
  "missing_week_0",
  "missing_post_challenge",
  "overlapping_date_ranges",
  "gap_between_weeks",
  "enrollment_wrong_challenge_year",
  "summary_cross_year_links",
  "xp_wrong_enrollment_year",
  "sent_flag_copied_new_season",
  "build_flag_from_prior_season",
  "hardcoded_year_label",
  "hardcoded_config_record_id",
  "fillout_old_config",
  "web_old_config",
  "make_old_year_mapping",
  "live_schedule_historical_week",
  // softr_old_config retained only as Historical Reference Only — not emitted by active launch
]);

module.exports = {
  buildSeasonReliabilityFindings,
  SEASON_FINDING_CODES,
  categorize,
};
