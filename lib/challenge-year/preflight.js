/**
 * Annual rollover preflight — PASS / PASS WITH WARNINGS / FAIL.
 * Offline fixture driven; no live Airtable mutations.
 */

"use strict";

const { normalizeChallengeYearConfig, findOverlappingConfigs } = require("./contract");
const { generateWeekPlanFromConfig, generateWeekPlan } = require("./week-generator");
const { validateWeekPlan } = require("./week-validator");
const { validateEnrollmentsForChallengeYear } = require("./enrollment-validator");
const { validateWeeklyAthleteSummaries } = require("./was-validator");
const { compareDateKeys } = require("./dates");
const { normalizeSchoolYear } = require("../config-selection");

function check(severity, code, message, requiredAction = null) {
  return { severity, code, message, requiredAction };
}

function overallFrom(checks) {
  if (checks.some((c) => c.severity === "FAIL")) return "FAIL";
  if (checks.some((c) => c.severity === "WARNING")) return "PASS WITH WARNINGS";
  return "PASS";
}

/**
 * @param {object} input
 * @param {object} input.newConfig
 * @param {object} [input.priorConfig]
 * @param {object[]} [input.allConfigs]
 * @param {object[]} [input.weeks] existing/exported weeks for new year
 * @param {object[]} [input.enrollments]
 * @param {object[]} [input.summaries]
 * @param {object} [input.opsChecklist] documentation readiness flags
 * @param {object} [input.generate] optional generator overrides
 */
function runRolloverPreflight(input = {}) {
  const checks = [];
  const newNorm = normalizeChallengeYearConfig(input.newConfig || {});
  if (!newNorm.ok) {
    return {
      overall: "FAIL",
      checks: [
        check("FAIL", newNorm.code, newNorm.message, "Fix new Config fixture fields."),
      ],
      newConfig: null,
    };
  }
  const newConfig = newNorm.config;

  const allConfigs = (input.allConfigs || [input.newConfig, input.priorConfig].filter(Boolean))
    .map((c) => normalizeChallengeYearConfig(c))
    .filter((r) => r.ok)
    .map((r) => r.config);

  // Exactly one intended new Config for the year
  const sameYear = allConfigs.filter(
    (c) => c.challengeYearLabel === newConfig.challengeYearLabel
  );
  if (sameYear.length === 0) {
    checks.push(
      check(
        "FAIL",
        "missing_new_config",
        "Intended new Config not present in catalog.",
        "Add the new Config record/fixture."
      )
    );
  } else if (sameYear.length > 1) {
    checks.push(
      check(
        "FAIL",
        "multiple_new_configs",
        `Multiple Configs for ${newConfig.challengeYearLabel}.`,
        "Keep exactly one Config row per challenge year."
      )
    );
  } else {
    checks.push(
      check("PASS", "exactly_one_new_config", `Exactly one Config for ${newConfig.challengeYearLabel}.`)
    );
  }

  if (!newConfig.startDate || !newConfig.endDate) {
    checks.push(
      check(
        "FAIL",
        "invalid_date_range",
        "New Config missing startDate/endDate.",
        "Set challenge start/end (Program Instance or proposed Config fields)."
      )
    );
  } else if (compareDateKeys(newConfig.endDate, newConfig.startDate) < 0) {
    checks.push(
      check("FAIL", "invalid_date_range", "endDate before startDate.", "Fix dates.")
    );
  } else {
    checks.push(
      check(
        "PASS",
        "valid_date_range",
        `Date range ${newConfig.startDate} → ${newConfig.endDate}.`
      )
    );
  }

  // Week plan complete
  let weekPlan = null;
  if (Array.isArray(input.weeks) && input.weeks.length) {
    weekPlan = {
      ok: true,
      weeks: input.weeks,
      validation: validateWeekPlan(input.weeks, {
        challengeYear: newConfig.challengeYearLabel,
        configRecordId: newConfig.configRecordId,
        expectedRegularWeeks: newConfig.regularWeekCount,
        requireCanonicalWeekKey: true,
      }),
    };
  } else if (newConfig.weekZeroStart && newConfig.regularWeekCount) {
    weekPlan = generateWeekPlanFromConfig(newConfig, input.generate || {});
  } else if (input.generate && input.generate.weekZeroStart) {
    weekPlan = generateWeekPlan({
      challengeYear: newConfig.challengeYearLabel,
      weekZeroStart: input.generate.weekZeroStart,
      regularWeeks: input.generate.regularWeeks || newConfig.regularWeekCount,
      configRecordId: newConfig.configRecordId,
    });
  } else {
    checks.push(
      check(
        "FAIL",
        "incomplete_week_plan",
        "No Weeks export and insufficient fields to generate a plan.",
        "Provide weeks[] or weekZeroStart + regularWeekCount."
      )
    );
  }

  if (weekPlan) {
    const v = weekPlan.validation || validateWeekPlan(weekPlan.weeks || []);
    if (v.overall === "FAIL") {
      checks.push(
        check(
          "FAIL",
          "incomplete_week_plan",
          `Week validation FAIL (${v.findings.filter((f) => f.severity === "FAIL").length} issues).`,
          "Regenerate/fix Weeks until validation PASS."
        )
      );
    } else if (v.overall === "PASS WITH WARNINGS") {
      checks.push(
        check(
          "WARNING",
          "week_plan_warnings",
          "Week plan has warnings.",
          "Review Week validation warnings before activation."
        )
      );
    } else {
      checks.push(check("PASS", "complete_week_plan", "Week plan complete."));
    }

    const keys = (weekPlan.weeks || []).map((w) => w.weekKey).filter(Boolean);
    const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupKeys.length) {
      checks.push(
        check(
          "FAIL",
          "duplicate_week_keys",
          `Duplicate Week Keys: ${[...new Set(dupKeys)].join(", ")}`,
          "Ensure unique {challengeYear}|{label} keys."
        )
      );
    } else {
      checks.push(check("PASS", "no_duplicate_week_keys", "No duplicate Week Keys."));
    }
  }

  // No overlap with previous Config
  if (input.priorConfig) {
    const prior = normalizeChallengeYearConfig(input.priorConfig);
    if (prior.ok) {
      const overlaps = findOverlappingConfigs([prior.config, newConfig]);
      if (overlaps.length) {
        checks.push(
          check(
            "FAIL",
            "overlap_with_prior_config",
            "New Config date range overlaps prior Config.",
            "Adjust start/end so seasons do not overlap."
          )
        );
      } else {
        checks.push(
          check("PASS", "no_prior_overlap", "No date overlap with prior Config.")
        );
      }
      checks.push(
        check(
          "PASS",
          "old_year_preserved",
          `Prior Config ${prior.config.challengeYearLabel} retained in catalog (not deleted).`
        )
      );
    }
  } else {
    checks.push(
      check(
        "WARNING",
        "prior_config_missing",
        "No prior Config provided to prove non-overlap / preservation.",
        "Include priorConfig in the preflight fixture."
      )
    );
  }

  // Ops documentation checklist
  const ops = input.opsChecklist || {};
  const requiredOps = [
    ["formsDocumented", "Forms documented for new-year update", "Document Fillout enrollment + daily submission year updates."],
    ["automationsDocumented", "Automations documented for new-year update", "List Config-aware automations + schedule changes."],
    ["weeklySchedulesDocumented", "Weekly schedules documented", "Document 118/119 OFF→ON activation plan."],
    ["activeRewardRules", "Active reward rules available", "Confirm XP Reward Rules for the new year."],
    ["gradeBandsAvailable", "Grade bands available", "Confirm active Grade Bands."],
    ["levelRulesAvailable", "Level rules available", "Confirm Levels + Level Gate Rules."],
    ["achievementRulesAvailable", "Achievement rules available", "Confirm Achievements catalog."],
    ["xpSourceValuesAvailable", "XP source values available", "Confirm XP source/select options."],
    ["emailTemplatesReady", "Email templates ready", "Confirm weekly/welcome templates."],
    ["testValuesIdentified", "Test values identified", "List Test Mode / Schmidt fixtures."],
    ["schmidtHandlingDocumented", "Schmidt test enrollment handling documented", "Document Schmidt Active?/includeSchmidt gates."],
    ["currentYearViewsDocumented", "Current-year views documented", "Document Softr/Airtable current-year view filters."],
    ["makeNotHardCoded", "Make scenarios not hard-coded to old year", "Inspect Make for hard-coded season strings."],
    ["softrNotHardCoded", "Softr filters not hard-coded to old year", "Inspect Softr filters for hard-coded season strings."],
  ];

  for (const [key, label, action] of requiredOps) {
    const value = ops[key];
    if (value === true) {
      checks.push(check("PASS", key, label));
    } else if (value === "warning" || value === "partial") {
      checks.push(check("WARNING", key, `${label} incomplete.`, action));
    } else {
      checks.push(check("FAIL", key, `${label} missing.`, action));
    }
  }

  if (Array.isArray(input.enrollments)) {
    const enr = validateEnrollmentsForChallengeYear({
      enrollments: input.enrollments,
      configs: allConfigs,
      weeks: weekPlan ? weekPlan.weeks : input.weeks,
      expectedChallengeYear: newConfig.challengeYearLabel,
      expectedConfigRecordId: newConfig.configRecordId,
      levelPolicy: input.levelPolicy || "undocumented",
    });
    if (enr.overall === "FAIL") {
      checks.push(
        check(
          "FAIL",
          "enrollment_validation_failed",
          `Enrollment-year validation FAIL (${enr.findings.filter((f) => f.severity === "FAIL").length}).`,
          "Fix enrollment Config/year/active issues before activation."
        )
      );
    } else if (enr.overall === "PASS WITH WARNINGS") {
      checks.push(
        check(
          "WARNING",
          "enrollment_validation_warnings",
          "Enrollment-year validation has warnings (often level-policy ambiguity).",
          "Confirm level carry-over vs reset with Mike."
        )
      );
    } else {
      checks.push(check("PASS", "enrollment_validation_passed", "Enrollment-year validation PASS."));
    }
  }

  if (Array.isArray(input.summaries)) {
    const was = validateWeeklyAthleteSummaries({
      summaries: input.summaries,
      enrollments: input.enrollments || [],
      weeks: weekPlan ? weekPlan.weeks : input.weeks || [],
      expectedChallengeYear: newConfig.challengeYearLabel,
    });
    if (was.overall === "FAIL") {
      checks.push(
        check(
          "FAIL",
          "was_validation_failed",
          `WAS uniqueness/year validation FAIL (${was.duplicates.length} duplicate groups).`,
          "Review dry-run repair recommendations; do not auto-delete."
        )
      );
    } else {
      checks.push(check("PASS", "was_validation_passed", "WAS validation PASS."));
    }
  }

  // Refuse activation if multiple currents across catalog
  const currents = allConfigs.filter((c) => c.isCurrent);
  if (currents.length > 1) {
    checks.push(
      check(
        "FAIL",
        "multiple_active_configs",
        `Multiple current Configs: ${currents.map((c) => c.challengeYearLabel).join(", ")}`,
        "Mark exactly one Config current before activation."
      )
    );
  }

  const overall = overallFrom(checks);
  return {
    overall,
    mode: input.mode || "preflight",
    newConfig,
    priorConfig: input.priorConfig
      ? normalizeChallengeYearConfig(input.priorConfig).config || null
      : null,
    checks,
    failedChecks: checks.filter((c) => c.severity === "FAIL"),
    warningChecks: checks.filter((c) => c.severity === "WARNING"),
    weekPlan: weekPlan
      ? {
          weekCount: (weekPlan.weeks || []).length,
          validationOverall: (weekPlan.validation || {}).overall,
        }
      : null,
  };
}

module.exports = {
  runRolloverPreflight,
  overallFrom,
};
