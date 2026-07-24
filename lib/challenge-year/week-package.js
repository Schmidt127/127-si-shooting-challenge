/**
 * Complete Week import package generation for season launch.
 */

"use strict";

const {
  generateWeekPlan,
  generateWeekPlanFromConfig,
  weeksToCsv,
  weeksToMarkdown,
} = require("./week-generator");
const { addDays, weekdaySunday0 } = require("./dates");

function sundayEmailDates(weeks = []) {
  // 118/119 run Sunday after a Week ends (prior Saturday = week end).
  return weeks
    .filter((w) => w.weekType !== "post_challenge" || true)
    .map((w) => {
      const end = w.endDate || w.weekEndKey;
      const runSunday = end ? addDays(end, 1) : null;
      return {
        weekLabel: w.displayLabel || w.weekName,
        weekEndKey: w.weekEndKey || end,
        expectedBuildSendSunday: runSunday,
        note:
          runSunday && weekdaySunday0(runSunday) === 0
            ? "118 05:00 / 119 10:00 America/Denver target this Sunday for prior Saturday week end"
            : "Could not derive Sunday",
      };
    });
}

/**
 * @param {object} input
 */
function generateWeekImportPackage(input = {}) {
  let plan;
  if (input.weekPlan && input.weekPlan.weeks) {
    plan = input.weekPlan;
  } else if (input.config) {
    plan = generateWeekPlanFromConfig(input.config, input.generate || {});
  } else {
    plan = generateWeekPlan({
      challengeYear: input.challengeYear,
      weekZeroStart: input.weekZeroStart,
      regularWeeks: input.regularWeeks,
      configRecordId: input.configRecordId,
      timezone: input.timezone || "America/Denver",
    });
  }

  const weeks = plan.weeks || [];
  const weekCodeMap = weeks.map((w) => ({
    displayLabel: w.displayLabel,
    weekCode: w.weekKey, // canonical year-aware code
    recordIdentityField: "Week Key (Airtable formula RECORD_ID — assigned after import)",
    startDate: w.startDate,
    endDate: w.endDate,
  }));
  const weekEndKeyMap = weeks.map((w) => ({
    displayLabel: w.displayLabel,
    weekEndKey: w.weekEndKey,
    endDate: w.endDate,
  }));

  const configChecklist = [
    "Confirm Config.Active School Year matches challenge year",
    "Confirm Challenge Week Count / regularWeeks matches generated plan",
    "Link Weeks.Program Instance to the season Program Instance record (use record ID in CSV if required)",
    "Do not overwrite Airtable Week Key formula (RECORD_ID)",
    "Optionally add Challenge Week Key / Week End Key only if Mike authorizes schema",
    "Keep prior-year Weeks historical — do not delete",
  ];

  const importVerification = [
    "Row count matches generated plan (Week 0 + N + Post-Challenge)",
    "Each Start Date is Sunday; End Date is Saturday (America/Denver)",
    "Week Name labels exact: Week 0, Week 1..N, Post-Challenge",
    "Program Instance link present on every new Week",
    "No overlapping date ranges",
    "005 Activity Date smoke test maps into expected Week",
  ];

  const warnings = [
    "Airtable linked-record fields (Program Instance, Config) often require record IDs — display names may fail on import.",
    "Canonical weekCode in this package is repository ops identity ({year}|{Week Name}); live Week Key remains RECORD_ID() until a Challenge Week Key field is authorized.",
    "118/119 schedules are ON in PROD — verify Week End targeting before first Sunday after import.",
  ];

  const summaryKeyPattern =
    "{Enrollment Key}|{Week Key} where Week Key is Airtable RECORD_ID of the Week after import; ops may also track {Enrollment Key}|{challengeYear}|{Week Name}";

  const csv = weeksToCsv(weeks);
  const markdown = [
    weeksToMarkdown(plan),
    "",
    "## Config update checklist",
    ...configChecklist.map((c) => `- [ ] ${c}`),
    "",
    "## Import verification",
    ...importVerification.map((c) => `- [ ] ${c}`),
    "",
    "## Warnings",
    ...warnings.map((w) => `- ${w}`),
    "",
  ].join("\n");

  const rollback = {
    note: "Do not delete imported Weeks if linked to Submissions/WAS. Mark Config not current and pause processing instead.",
    steps: [
      "Set new Config isCurrent=false / Launch Status=Rolled Back",
      "Restore prior Config as current",
      "Leave new Weeks in place (orphaned until re-activated) or filter views to prior year",
      "Re-point Fillout hidden year/Config values to prior year",
      "Confirm 118/119 still target intended Week End keys",
    ],
    csvHint: "No destructive rollback CSV — export current Weeks before import for comparison only.",
  };

  return {
    ok: plan.ok !== false && (!plan.validation || plan.validation.overall !== "FAIL"),
    challengeYear: plan.challengeYear,
    configRecordId: plan.configRecordId || input.configRecordId || null,
    plan,
    files: {
      weeksImportCsv: csv,
      weeksMarkdown: markdown,
      validationReport: plan.validation || null,
    },
    weekCodeMap,
    weekEndKeyMap,
    expectedWasKeyPattern: summaryKeyPattern,
    expectedAutomationSelectionDates: weeks.map((w) => ({
      label: w.displayLabel,
      activityDateInclusive: `${w.startDate}..${w.endDate}`,
    })),
    expectedSundayEmailDates: sundayEmailDates(weeks),
    expectedPostChallengeDates: weeks
      .filter((w) => w.weekType === "post_challenge")
      .map((w) => ({ startDate: w.startDate, endDate: w.endDate, weekCode: w.weekKey })),
    configUpdateChecklist: configChecklist,
    importVerificationChecklist: importVerification,
    warnings,
    rollback,
  };
}

module.exports = {
  generateWeekImportPackage,
  sundayEmailDates,
};
