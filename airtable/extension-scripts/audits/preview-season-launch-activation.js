/*
Extension Script: Preview Season Launch activation changes
System: 127 SI Shooting Challenge
Purpose:
  Dry-run preview of what would change when activating a new Config/year.
  Requires explicit Config record ID + challenge-year label.
  Refuses multiple Configs for the same year.
  Never writes, deletes, or rewrites historical records.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-season-launch-activation",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    weeks: "Weeks",
    enrollments: "Enrollments",
  },
  config: {
    activeSchoolYear: "Active School Year",
  },
  enrollments: {
    schoolYear: "School Year",
    active: "Active?",
  },
  weeks: {
    name: "Week Name",
  },
  limits: {
    maxEnrollments: 3000,
    maxWeeks: 500,
    sample: 40,
  },
};

function normalizeYear(raw) {
  const text = String(raw || "")
    .trim()
    .replace(/[–—]/g, "-");
  const m = /^(\d{4})-(\d{4})$/.exec(text);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) return null;
  return `${m[1]}-${m[2]}`;
}

function requireInput() {
  const inputConfig = input.config();
  const configRecordId = String(inputConfig.configRecordId || "").trim();
  const challengeYear = normalizeYear(inputConfig.challengeYear);
  const dryRun = inputConfig.dryRun !== false && inputConfig.dryRun !== "false";
  if (!configRecordId.startsWith("rec")) {
    throw new Error("configRecordId is required (rec…)");
  }
  if (!challengeYear) throw new Error("challengeYear is required (YYYY-YYYY)");
  if (!dryRun) throw new Error("Preview-only. dryRun must remain true.");
  return { configRecordId, challengeYear, dryRun: true };
}

async function main() {
  const opts = requireInput();
  const configTable = base.getTable(CONFIG.tables.config);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const configQuery = await configTable.selectRecordsAsync({
    fields: [CONFIG.config.activeSchoolYear],
  });
  const target = configQuery.getRecord(opts.configRecordId);
  if (!target) throw new Error(`Config ${opts.configRecordId} not found`);
  const targetYear = normalizeYear(
    target.getCellValueAsString(CONFIG.config.activeSchoolYear)
  );
  if (targetYear !== opts.challengeYear) {
    throw new Error(
      `Config year ${targetYear || "(blank)"} != required ${opts.challengeYear}`
    );
  }

  const byYear = {};
  for (const rec of configQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.config.activeSchoolYear));
    if (!year) continue;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(rec.id);
  }
  if ((byYear[opts.challengeYear] || []).length > 1) {
    throw new Error(
      `Refuse activation preview: multiple Configs for ${opts.challengeYear}`
    );
  }

  const otherCurrent = configQuery.records.filter((rec) => {
    if (rec.id === opts.configRecordId) return false;
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.config.activeSchoolYear));
    return year && year !== opts.challengeYear;
  });

  const weeksQuery = await weeksTable.selectRecordsAsync({
    fields: [CONFIG.weeks.name],
  });
  const weekNames = weeksQuery.records.map((r) =>
    r.getCellValueAsString(CONFIG.weeks.name)
  );
  const hasWeek0 = weekNames.some((n) => /week\s*0/i.test(n));
  const hasPost = weekNames.some((n) => /post/i.test(n));

  const enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.schoolYear, CONFIG.enrollments.active],
  });
  const activeWrongYear = [];
  for (const rec of enrollmentsQuery.records) {
    const active = rec.getCellValue(CONFIG.enrollments.active);
    if (!active) continue;
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.enrollments.schoolYear));
    if (year && year !== opts.challengeYear) {
      activeWrongYear.push(rec.id);
      if (activeWrongYear.length >= CONFIG.limits.sample) break;
    }
  }

  const proposed = [
    {
      action: "set_operational_current_config",
      configRecordId: opts.configRecordId,
      challengeYear: opts.challengeYear,
    },
    {
      action: "verify_weeks_imported",
      hasWeek0,
      hasPostChallengeLikeLabel: hasPost,
      weekCountSampled: weeksQuery.records.length,
    },
    {
      action: "review_active_enrollments_outside_target_year",
      sampleIds: activeWrongYear,
      note: "Preview only — do not auto-deactivate",
    },
    {
      action: "preserve_prior_configs",
      priorConfigCount: otherCurrent.length,
      note: "Do not delete prior Config rows",
    },
  ];

  console.log(
    JSON.stringify(
      {
        script: SCRIPT,
        dryRun: true,
        status: "PASS",
        proposedChanges: proposed,
        skipped: [],
        mikeActions: [
          "Run repository activation-preview CLI and compare",
          "Complete Fillout/Make/website (/shoot) checklists before Live",
          "Softr is Obsolete / Not Used — do not block on Softr",
          "Do not flip Live until Schmidt tests pass",
        ],
      },
      null,
      2
    )
  );
}

await main();
