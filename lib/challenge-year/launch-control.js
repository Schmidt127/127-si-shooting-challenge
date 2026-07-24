/**
 * Season Launch Control orchestration:
 * launch-status, launch-preflight, launch-manifest,
 * activation-preview, rollback-preview.
 */

"use strict";

const { normalizeChallengeYearConfig } = require("./contract");
const { runRolloverPreflight } = require("./preflight");
const { generateRolloverManifest } = require("./manifest");
const { validateSeasonExport } = require("./export-validator");
const { auditSeasonSensitiveAutomations } = require("./automation-audit");
const { generateWeekImportPackage } = require("./week-package");
const {
  createLaunchRecord,
  evaluateTransition,
  normalizeLaunchState,
  LAUNCH_STATES,
} = require("./launch-state");
const { buildSeasonReliabilityFindings } = require("./season-findings");
const { toMarkdownReport } = require("./report");

function overallFromParts(...parts) {
  if (parts.some((p) => p === "FAIL")) return "FAIL";
  if (parts.some((p) => p === "PASS WITH WARNINGS")) return "PASS WITH WARNINGS";
  return "PASS";
}

function collectMikeActions(findings = []) {
  const actions = [];
  for (const f of findings.filter((x) => x.severity === "FAIL" || x.severity === "WARNING")) {
    actions.push({
      code: f.code,
      severity: f.severity,
      action: f.requiredAction || f.message,
      recordIds: f.recordIds || f.affectedIds || [],
    });
  }
  return actions;
}

/**
 * launch-status — summarize launch record + export health.
 */
function launchStatus(input = {}) {
  const launch = createLaunchRecord(input.launch || input);
  const exportResult = input.export
    ? validateSeasonExport(input.export, {
        challengeYear: launch.challengeYear || input.challengeYear,
        configRecordId: launch.configRecordId || input.configRecordId,
      })
    : null;

  const state = normalizeLaunchState(launch.state);
  const result = {
    overall: exportResult ? exportResult.overall : state.ok ? "PASS" : "FAIL",
    launch,
    launchStates: LAUNCH_STATES,
    export: exportResult
      ? {
          overall: exportResult.overall,
          failedCount: exportResult.failed.length,
          warningCount: exportResult.warnings.length,
        }
      : null,
    mikeActions: exportResult ? collectMikeActions(exportResult.findings) : [],
  };
  result.markdown = toMarkdownReport("Season Launch Status", result);
  return result;
}

/**
 * launch-preflight — full season launch gate.
 */
function launchPreflight(input = {}) {
  const configId = input.configRecordId || input.configId || (input.newConfig && input.newConfig.id);
  const challengeYear =
    input.challengeYear ||
    (input.newConfig && (input.newConfig.activeSchoolYear || input.newConfig.challengeYear));

  if (!configId || !String(configId).startsWith("rec")) {
    return {
      overall: "FAIL",
      checks: [
        {
          severity: "FAIL",
          code: "missing_config_id",
          message: "Explicit Config record ID required.",
          requiredAction: "Pass --config <rec…>",
        },
      ],
      failedChecks: [{ code: "missing_config_id" }],
    };
  }
  if (!challengeYear) {
    return {
      overall: "FAIL",
      checks: [
        {
          severity: "FAIL",
          code: "missing_challenge_year",
          message: "Explicit challenge-year label required.",
          requiredAction: "Pass --challenge-year YYYY-YYYY",
        },
      ],
      failedChecks: [{ code: "missing_challenge_year" }],
    };
  }

  const rollover = runRolloverPreflight({
    mode: "launch-preflight",
    newConfig: input.newConfig || input.config || { id: configId, activeSchoolYear: challengeYear, ...(input.newConfig || {}) },
    priorConfig: input.priorConfig,
    allConfigs: input.allConfigs || input.export?.configs,
    weeks: input.weeks || input.export?.weeks,
    enrollments: input.enrollments || input.export?.enrollments,
    summaries: input.summaries || input.export?.summaries,
    opsChecklist: input.opsChecklist,
    generate: input.generate,
    levelPolicy: input.levelPolicy,
  });

  const exportResult = input.export
    ? validateSeasonExport(input.export, {
        challengeYear,
        configRecordId: configId,
        regularWeeks: input.regularWeeks,
      })
    : null;

  const automationAudit = auditSeasonSensitiveAutomations({
    allowYears: input.allowYears || [],
    allowRecIds: input.allowRecIds || [],
    allowlistByFile: input.allowlistByFile || defaultAutomationAllowlist(),
  });

  const ops = input.opsChecklist || {};
  const packageChecks = [
    checkFlag(ops.filloutPackageReady, "fillout_package", "Fillout season-routing package ready"),
    checkFlag(ops.makePackageReady, "make_package", "Make season-routing package ready"),
    checkFlag(
      ops.webPackageReady === true ||
        ops.websitePackageReady === true ||
        // Legacy Softr package flag is Obsolete — treat as web package for old fixtures only.
        ops.softrPackageReady === true
        ? true
        : ops.webPackageReady,
      "web_package",
      "Website (/shoot) season-routing package ready"
    ),
    checkFlag(ops.schmidtTestPlanReady, "schmidt_test_plan", "Schmidt controlled test plan ready"),
  ];

  const rccFindings = buildSeasonReliabilityFindings({
    exportResult,
    rollover,
    automationAudit,
    challengeYear,
    configRecordId: configId,
  });

  const checks = [
    ...rollover.checks,
    ...(exportResult
      ? [
          {
            severity: exportResult.overall === "FAIL" ? "FAIL" : exportResult.overall === "PASS WITH WARNINGS" ? "WARNING" : "PASS",
            code: "season_export_validation",
            message: `Season export validation ${exportResult.overall}`,
            requiredAction: exportResult.overall === "FAIL" ? "Fix export FAIL findings before launch." : null,
          },
        ]
      : [
          {
            severity: "WARNING",
            code: "season_export_missing",
            message: "No export provided — skipped Config/Week/Enrollment/WAS/XP export validation.",
            requiredAction: "Provide --input export JSON for full launch preflight.",
          },
        ]),
    {
      severity: automationAudit.overall === "FAIL" ? "FAIL" : automationAudit.overall === "PASS WITH WARNINGS" ? "WARNING" : "PASS",
      code: "automation_hardcode_audit",
      message: `Automation hard-code audit ${automationAudit.overall} (${automationAudit.findings.length} findings)`,
      requiredAction:
        automationAudit.overall === "FAIL"
          ? "Remove disallowed hard-coded years/record IDs or extend explicit allowlist for fixtures-only strings."
          : null,
    },
    ...packageChecks,
  ];

  const overall = overallFromParts(
    rollover.overall,
    exportResult ? exportResult.overall : "PASS WITH WARNINGS",
    automationAudit.overall,
    ...packageChecks.map((c) => c.severity)
  );

  const proposedChanges = [
    {
      action: "set_launch_status",
      configRecordId: configId,
      to: overall === "PASS" ? "Test Ready" : "Blocking Error",
      note: "Proposed only — Launch Status field not created unless Mike authorizes.",
    },
  ];

  const result = {
    overall,
    mode: "launch-preflight",
    configRecordId: configId,
    challengeYear,
    checks,
    failedChecks: checks.filter((c) => c.severity === "FAIL"),
    warningChecks: checks.filter((c) => c.severity === "WARNING"),
    proposedChanges,
    affectedRecordIds: [configId],
    mikeActions: collectMikeActions(checks),
    rollbackActions: [
      "Do not mark Config Live",
      "Keep prior Config current",
      "Leave 118/119 ON but verify they still target intended Weeks",
      "Re-run launch-preflight after fixes",
    ],
    rollover,
    export: exportResult,
    automationAudit: {
      overall: automationAudit.overall,
      findingCount: automationAudit.findings.length,
      findings: automationAudit.findings.slice(0, 50),
    },
    reliabilityFindings: rccFindings,
  };
  result.markdown = toMarkdownReport("Season Launch Preflight", result);
  return result;
}

function checkFlag(value, code, label) {
  if (value === true) return { severity: "PASS", code, message: label };
  if (value === "partial" || value === "warning") {
    return { severity: "WARNING", code, message: `${label} incomplete`, requiredAction: `Complete ${label}.` };
  }
  return { severity: "FAIL", code, message: `${label} missing`, requiredAction: `Complete ${label}.` };
}

function defaultAutomationAllowlist() {
  // Production scripts should not hard-code years; tests/docs may. Empty default = strict.
  return {};
}

/**
 * launch-manifest — rollover manifest + week package + launch checks.
 */
function launchManifest(input = {}) {
  const preflight = launchPreflight(input);
  const manifest = generateRolloverManifest({
    newConfig: input.newConfig || input.config,
    priorConfig: input.priorConfig,
    allConfigs: input.allConfigs,
    generate: input.generate,
    opsChecklist: input.opsChecklist,
    enrollments: input.enrollments || input.export?.enrollments,
    summaries: input.summaries || input.export?.summaries,
    levelPolicy: input.levelPolicy,
    preflight: preflight.rollover,
  });
  const weekPackage = generateWeekImportPackage({
    config: input.newConfig || input.config,
    generate: input.generate,
    challengeYear: input.challengeYear,
    weekZeroStart: input.generate?.weekZeroStart,
    regularWeeks: input.generate?.regularWeeks || input.regularWeeks,
    configRecordId: input.configRecordId,
  });

  return {
    ok: preflight.overall !== "FAIL" && weekPackage.ok,
    overall: overallFromParts(preflight.overall, weekPackage.ok ? "PASS" : "FAIL"),
    preflight,
    manifest,
    weekPackage,
    markdown: [
      "# Season Launch Manifest",
      "",
      `Preflight: **${preflight.overall}**`,
      "",
      manifest.markdown || "",
      "",
      weekPackage.files.weeksMarkdown || "",
    ].join("\n"),
    csv: weekPackage.files.weeksImportCsv,
  };
}

/**
 * activation-preview — exact proposed Live activation changes (dry-run).
 */
function activationPreview(input = {}) {
  const configId = input.configRecordId || input.newConfig?.id;
  const challengeYear = input.challengeYear || input.newConfig?.activeSchoolYear;
  const prior = input.priorConfig ? normalizeChallengeYearConfig(input.priorConfig) : null;
  const next = normalizeChallengeYearConfig(input.newConfig || { id: configId, activeSchoolYear: challengeYear });

  if (!next.ok) {
    return { overall: "FAIL", error: next, proposedChanges: [] };
  }

  const transition = evaluateTransition({
    fromState: input.fromState || "Approved for Live",
    toState: "Live",
    completedChecks: input.completedChecks || [],
    evidence: {
      multipleActiveConfigs: Boolean(input.multipleActiveConfigs),
      testMode: next.config.testMode,
    },
    operator: input.operator || "Mike",
  });

  const proposedChanges = [
    {
      table: "Config",
      recordId: next.config.configRecordId,
      field: "Current Challenge Year? / isCurrent",
      from: false,
      to: true,
      note: "Proposed field or ops convention",
    },
    prior && prior.ok
      ? {
          table: "Config",
          recordId: prior.config.configRecordId,
          field: "Current Challenge Year? / isCurrent",
          from: true,
          to: false,
        }
      : null,
    {
      table: "Config",
      recordId: next.config.configRecordId,
      field: "Launch Status",
      to: "Live",
      note: "Proposed field — Mike authorize schema",
    },
    {
      system: "Fillout",
      action: "point_hidden_config_and_school_year",
      to: challengeYear,
      configRecordId: configId,
    },
    {
      system: "Web/Airtable views",
      action: "set_current_year_filters_for_shoot",
      to: challengeYear,
      note: "Next.js /shoot + Airtable views — Softr is Obsolete / Not Used",
    },
    {
      system: "Make",
      action: "confirm_no_old_year_hardcodes",
      scenario: "Weekly Athlete Summary - Bulk Email - May 18",
      note: "Do not redesign ownership; verify Live writeback only",
    },
  ].filter(Boolean);

  const result = {
    overall: transition.ok ? "PASS" : "FAIL",
    dryRun: true,
    configRecordId: configId,
    challengeYear,
    transition,
    proposedChanges,
    affectedRecordIds: proposedChanges.map((c) => c.recordId).filter(Boolean),
    mikeActions: transition.missingChecks.map((c) => ({
      action: `Provide evidence for ${c}`,
      severity: "FAIL",
    })),
    rollbackActions: [
      "Run rollback-preview and execute listed reverse changes",
      "Keep new Weeks/Enrollments; stop marking new Config current",
    ],
    writesPerformed: 0,
  };
  result.markdown = toMarkdownReport("Season Launch Activation Preview", result);
  return result;
}

/**
 * rollback-preview — reverse activation (dry-run).
 */
function rollbackPreview(input = {}) {
  const configId = input.configRecordId || input.newConfig?.id;
  const challengeYear = input.challengeYear || input.newConfig?.activeSchoolYear;
  const prior = input.priorConfig ? normalizeChallengeYearConfig(input.priorConfig) : null;

  const proposedChanges = [
    {
      table: "Config",
      recordId: configId,
      field: "isCurrent / Launch Status",
      to: "Rolled Back",
      note: "New season Config no longer current",
    },
    prior && prior.ok
      ? {
          table: "Config",
          recordId: prior.config.configRecordId,
          field: "isCurrent",
          to: true,
          note: `Restore ${prior.config.challengeYearLabel} as current`,
        }
      : {
          severity: "WARNING",
          note: "No priorConfig provided — Mike must identify prior current Config manually",
        },
    {
      system: "Fillout",
      action: "restore_hidden_config_and_school_year",
      to: prior && prior.ok ? prior.config.challengeYearLabel : "(prior year)",
    },
    {
      system: "Web/Airtable views",
      action: "restore_prior_year_filters_for_shoot",
      note: "Softr is Obsolete — do not include Softr rollback steps",
    },
    {
      system: "Airtable",
      action: "do_not_delete_weeks_enrollments_was",
      note: "Freeze processing; historical preservation required",
    },
    {
      system: "118/119",
      action: "verify_week_targeting",
      note: "Schedules may remain ON — confirm they do not email wrong season Weeks",
    },
  ];

  const result = {
    overall: prior && prior.ok ? "PASS" : "PASS WITH WARNINGS",
    dryRun: true,
    configRecordId: configId,
    challengeYear,
    proposedChanges,
    affectedRecordIds: [configId, prior && prior.ok ? prior.config.configRecordId : null].filter(Boolean),
    mikeActions: [
      {
        severity: prior && prior.ok ? "PASS" : "WARNING",
        action: "Confirm prior Config record ID before executing rollback",
      },
    ],
    rollbackActions: proposedChanges,
    writesPerformed: 0,
  };
  result.markdown = toMarkdownReport("Season Launch Rollback Preview", result);
  return result;
}

module.exports = {
  launchStatus,
  launchPreflight,
  launchManifest,
  activationPreview,
  rollbackPreview,
};
