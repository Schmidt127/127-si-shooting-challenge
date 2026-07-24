/**
 * Rollover manifest generator — JSON + Markdown checklist + Week CSV.
 */

"use strict";

const { normalizeChallengeYearConfig } = require("./contract");
const {
  generateWeekPlan,
  generateWeekPlanFromConfig,
  weeksToCsv,
  weeksToMarkdown,
} = require("./week-generator");
const { runRolloverPreflight } = require("./preflight");

const DEFAULT_AUTOMATIONS_TO_INSPECT = [
  "005 — assign Week from Activity Date",
  "010 — submission base XP",
  "031 — find/create Weekly Athlete Summary",
  "034 — previous-week helpers",
  "041/042 — level recalc",
  "072 — build weekly email package",
  "074 — send weekly email to Make",
  "101 — Zoom attendance WAS ensure",
  "114 — video XP",
  "118 — schedule weekly summary email build",
  "119 — schedule weekly summary email send",
];

const DEFAULT_MAKE_SCENARIOS = [
  "Weekly Athlete Summary - Bulk Email - May 18 (sender + writeback)",
  "Upload Engine / Lambda routes (season slug prefixes)",
  "Zoom Recording Approval Email 117f (if used)",
];

const DEFAULT_FILLOUT_FORMS = [
  "Enrollment form — hidden Config / School Year / Program Instance",
  "Daily submission form — Activity Date validation + year linkage",
];

const DEFAULT_SOFTR_PAGES = [
  "Current-year Enrollment visibility filters",
  "Weekly Athlete Summary visibility",
  "Levels / Achievements current-year separation",
  "Historical data pages (must not mix years)",
];

const DEFAULT_VIEWS = [
  "Enrollments — current year Active?",
  "Weeks — current challenge year",
  "Weekly Athlete Summary — current week / current year",
  "XP Events — current year reporting",
];

/**
 * @param {object} input
 */
function generateRolloverManifest(input = {}) {
  const newNorm = normalizeChallengeYearConfig(input.newConfig || {});
  if (!newNorm.ok) {
    return {
      ok: false,
      error: { code: newNorm.code, message: newNorm.message },
    };
  }
  const priorNorm = input.priorConfig
    ? normalizeChallengeYearConfig(input.priorConfig)
    : { ok: true, config: null };
  if (input.priorConfig && !priorNorm.ok) {
    return {
      ok: false,
      error: { code: priorNorm.code, message: priorNorm.message },
    };
  }

  let weekPlan;
  if (input.weekPlan && Array.isArray(input.weekPlan.weeks)) {
    weekPlan = input.weekPlan;
  } else if (input.generate) {
    weekPlan = generateWeekPlan({
      challengeYear: newNorm.config.challengeYearLabel,
      weekZeroStart: input.generate.weekZeroStart,
      regularWeeks: input.generate.regularWeeks || newNorm.config.regularWeekCount,
      configRecordId: newNorm.config.configRecordId,
      timezone: newNorm.config.timezone,
    });
  } else {
    weekPlan = generateWeekPlanFromConfig(newNorm.config, input.generateOverrides || {});
  }

  const preflight =
    input.preflight ||
    runRolloverPreflight({
      newConfig: input.newConfig,
      priorConfig: input.priorConfig,
      allConfigs: input.allConfigs,
      weeks: weekPlan.ok ? weekPlan.weeks : [],
      enrollments: input.enrollments,
      summaries: input.summaries,
      opsChecklist: input.opsChecklist,
      levelPolicy: input.levelPolicy,
      mode: "preflight",
    });

  const weeks = weekPlan.weeks || [];
  const expectedKeys = weeks.map((w) => w.weekKey).filter(Boolean);

  const manifest = {
    generatedAt: input.now || new Date().toISOString(),
    timezone: newNorm.config.timezone || "America/Denver",
    oldConfig: priorNorm.config
      ? {
          configRecordId: priorNorm.config.configRecordId,
          challengeYearLabel: priorNorm.config.challengeYearLabel,
          startDate: priorNorm.config.startDate,
          endDate: priorNorm.config.endDate,
          status: priorNorm.config.status,
          isCurrent: priorNorm.config.isCurrent,
        }
      : null,
    newConfig: {
      configRecordId: newNorm.config.configRecordId,
      challengeYearLabel: newNorm.config.challengeYearLabel,
      startDate: newNorm.config.startDate,
      endDate: newNorm.config.endDate,
      enrollmentOpenDate: newNorm.config.enrollmentOpenDate,
      enrollmentCloseDate: newNorm.config.enrollmentCloseDate,
      weekZeroStart: newNorm.config.weekZeroStart,
      regularWeekCount: newNorm.config.regularWeekCount,
      status: newNorm.config.status,
      testMode: newNorm.config.testMode,
      rolloverState: newNorm.config.rolloverState,
    },
    weeksToCreate: weeks.map((w) => ({
      displayLabel: w.displayLabel,
      weekType: w.weekType,
      startDate: w.startDate,
      endDate: w.endDate,
      weekKey: w.weekKey,
      weekEndKey: w.weekEndKey,
      sequence: w.sequence,
    })),
    expectedKeys,
    fieldsToUpdate: input.fieldsToUpdate || [
      "Config / Program Instance current flags and dates",
      "Enrollment School Year + Program Instance / Config links",
      "Weeks Program Instance link (and proposed Challenge Week Key if authorized)",
      "Fillout hidden year/config fields",
      "View filters for current year",
    ],
    automationsToInspect: input.automationsToInspect || DEFAULT_AUTOMATIONS_TO_INSPECT,
    makeScenariosToInspect: input.makeScenariosToInspect || DEFAULT_MAKE_SCENARIOS,
    filloutFormsToInspect: input.filloutFormsToInspect || DEFAULT_FILLOUT_FORMS,
    softrPagesAndFiltersToInspect: input.softrPagesAndFiltersToInspect || DEFAULT_SOFTR_PAGES,
    viewsToInspect: input.viewsToInspect || DEFAULT_VIEWS,
    testRecordsToRetain: input.testRecordsToRetain || [
      "Schmidt enrollment (testing family) — retain identity; re-link to new year intentionally",
    ],
    testRecordsToExclude: input.testRecordsToExclude || [
      "Stale Testing Scenarios tied only to prior year Weeks",
      "Orphan WAS rows with empty Enrollment",
    ],
    validationSteps: input.validationSteps || [
      "Run week generator + validator",
      "Run rollover preflight (expect PASS or PASS WITH WARNINGS)",
      "Dry-run Airtable preview helpers with explicit Config ID + year label",
      "Controlled Schmidt Activity Date → Week assignment (005)",
      "Controlled empty-week email path in Test mode before Live schedules",
    ],
    rollbackSteps: input.rollbackSteps || [
      "Keep prior Config isCurrent=true until new year proven",
      "Do not delete prior Weeks/Enrollments/WAS",
      "Turn 118/119 schedules OFF",
      "Point Fillout hidden fields back to prior year if activation aborted",
      "Re-run preflight after fixes before re-attempting activation",
    ],
    proofRequiredBeforeActivation: input.proofRequiredBeforeActivation || [
      "Preflight overall PASS or accepted PASS WITH WARNINGS with Mike sign-off",
      "Week import verified (keys, Sunday/Saturday, Config/year linkage)",
      "No multiple current Configs",
      "Schmidt controlled submission maps to correct new-year Week",
      "Weekly email Test send for one summary (no season-wide Live schedule yet)",
    ],
    preflightOverall: preflight.overall,
    preflightFailedChecks: (preflight.failedChecks || []).map((c) => c.code),
  };

  const markdown = renderManifestMarkdown(manifest, weekPlan);
  const csv = weeksToCsv(weeks);

  return {
    ok: weekPlan.ok !== false && preflight.overall !== "FAIL",
    manifest,
    markdown,
    csv,
    weekPlan,
    preflight,
  };
}

function renderManifestMarkdown(manifest, weekPlan) {
  const lines = [
    `# Challenge-year rollover manifest — ${manifest.newConfig.challengeYearLabel}`,
    "",
    `Generated: ${manifest.generatedAt}`,
    `Timezone: ${manifest.timezone}`,
    `Preflight: **${manifest.preflightOverall}**`,
    "",
    "## Configs",
    "",
    `- Old: ${
      manifest.oldConfig
        ? `${manifest.oldConfig.challengeYearLabel} (${manifest.oldConfig.configRecordId || "no id"})`
        : "(none provided)"
    }`,
    `- New: ${manifest.newConfig.challengeYearLabel} (${manifest.newConfig.configRecordId || "no id"})`,
    `- New dates: ${manifest.newConfig.startDate || "?"} → ${manifest.newConfig.endDate || "?"}`,
    "",
    "## Weeks to create",
    "",
  ];

  if (weekPlan && weekPlan.weeks) {
    lines.push(weeksToMarkdown(weekPlan).split("\n").slice(6).join("\n"));
  }

  lines.push("", "## Expected keys", "");
  for (const key of manifest.expectedKeys) {
    lines.push(`- \`${key}\``);
  }

  const sections = [
    ["Fields to update", manifest.fieldsToUpdate],
    ["Automations to inspect", manifest.automationsToInspect],
    ["Make scenarios to inspect", manifest.makeScenariosToInspect],
    ["Fillout forms to inspect", manifest.filloutFormsToInspect],
    ["Softr pages and filters", manifest.softrPagesAndFiltersToInspect],
    ["Views to inspect", manifest.viewsToInspect],
    ["Test records to retain", manifest.testRecordsToRetain],
    ["Test records to exclude", manifest.testRecordsToExclude],
    ["Validation steps", manifest.validationSteps],
    ["Rollback steps", manifest.rollbackSteps],
    ["Proof required before activation", manifest.proofRequiredBeforeActivation],
  ];

  for (const [title, items] of sections) {
    lines.push("", `## ${title}`, "");
    for (const item of items) lines.push(`- [ ] ${item}`);
  }

  lines.push("");
  return lines.join("\n");
}

module.exports = {
  generateRolloverManifest,
  renderManifestMarkdown,
  DEFAULT_AUTOMATIONS_TO_INSPECT,
};
