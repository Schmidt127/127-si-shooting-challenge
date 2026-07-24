/*
Extension Script: Preview Challenge-Year Config relationships
System: 127 SI Shooting Challenge
Purpose:
  Dry-run validation of Config / Program Instance / challenge-year relationships.
  Refuses to continue when multiple Configs appear "current/active".
  Never writes or deletes.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-challenge-year-config-relationships",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    enrollments: "Enrollments",
    weeks: "Weeks",
    programInstance: "Program Instance - Synced",
  },
  config: {
    activeSchoolYear: "Active School Year",
    challengeWeekCount: "Challenge Week Count",
  },
  enrollments: {
    schoolYear: "School Year",
    active: "Active?",
    programInstance: "Program Instance",
  },
  weeks: {
    name: "Week Name",
    programInstance: "Program Instance",
  },
  programInstance: {
    schoolYear: "School Year - Linked",
    status: "Status",
  },
  limits: {
    maxEnrollments: 2000,
    maxWeeks: 500,
  },
};

function normalizeYear(raw) {
  const text = String(raw || "")
    .trim()
    .replace(/[–—]/g, "-");
  const m = /^(\d{4})-(\d{4})$/.exec(text);
  if (!m) return null;
  if (Number(m[2]) !== Number(m[1]) + 1) return null;
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
  if (!challengeYear) {
    throw new Error("challengeYear is required (YYYY-YYYY)");
  }
  if (!dryRun) {
    throw new Error("Preview-only script. dryRun must remain true.");
  }
  return { configRecordId, challengeYear, dryRun: true };
}

async function main() {
  const opts = requireInput();
  const configTable = base.getTable(CONFIG.tables.config);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  const configQuery = await configTable.selectRecordsAsync({
    fields: [CONFIG.config.activeSchoolYear, CONFIG.config.challengeWeekCount],
  });

  const yearGroups = {};
  for (const rec of configQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.config.activeSchoolYear));
    if (!year) continue;
    if (!yearGroups[year]) yearGroups[year] = [];
    yearGroups[year].push(rec.id);
  }

  const duplicateYears = Object.entries(yearGroups)
    .filter(([, ids]) => ids.length > 1)
    .map(([year, ids]) => ({ year, ids }));

  if (duplicateYears.length) {
    throw new Error(
      `Refuse to continue: duplicate Config rows for year(s): ${duplicateYears
        .map((d) => d.year)
        .join(", ")}`
    );
  }

  const target = configQuery.getRecord(opts.configRecordId);
  if (!target) {
    throw new Error(`Config ${opts.configRecordId} not found`);
  }
  const targetYear = normalizeYear(
    target.getCellValueAsString(CONFIG.config.activeSchoolYear)
  );
  if (targetYear !== opts.challengeYear) {
    throw new Error(
      `Config ${opts.configRecordId} year ${targetYear} != required challengeYear ${opts.challengeYear}`
    );
  }

  const enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.schoolYear,
      CONFIG.enrollments.active,
      CONFIG.enrollments.programInstance,
    ],
  });
  if (enrollmentsQuery.records.length > CONFIG.limits.maxEnrollments) {
    throw new Error("Refuse to continue: enrollment scan limit exceeded.");
  }

  const mismatches = [];
  let activeForYear = 0;
  for (const rec of enrollmentsQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.enrollments.schoolYear));
    const active = Boolean(rec.getCellValue(CONFIG.enrollments.active));
    if (year === opts.challengeYear && active) activeForYear += 1;
    if (active && year && year !== opts.challengeYear) {
      mismatches.push({
        type: "active_enrollment_other_year",
        enrollmentId: rec.id,
        schoolYear: year,
      });
    }
  }

  const weeksQuery = await weeksTable.selectRecordsAsync({
    fields: [CONFIG.weeks.name, CONFIG.weeks.programInstance],
  });
  if (weeksQuery.records.length > CONFIG.limits.maxWeeks) {
    throw new Error("Refuse to continue: weeks scan limit exceeded.");
  }

  const report = {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    dryRun: true,
    configRecordId: opts.configRecordId,
    challengeYear: opts.challengeYear,
    configYears: Object.keys(yearGroups),
    duplicateYears,
    activeEnrollmentsForYear: activeForYear,
    activeEnrollmentOtherYearCount: mismatches.length,
    sampleMismatches: mismatches.slice(0, 25),
    weeksScanned: weeksQuery.records.length,
    proposedChanges: [],
    writesPerformed: 0,
    note: "Dry-run only. No historical links rewritten.",
  };

  console.log(JSON.stringify(report, null, 2));
  output.set("statusOut", mismatches.length ? "skipped" : "success");
  output.set("actionOut", "preview_config_relationships");
  output.set("errorOut", "");
  output.set("debugStep", "complete");
  output.set("dryRunOut", true);
}

try {
  await main();
} catch (error) {
  console.error(error);
  output.set("statusOut", "error");
  output.set("actionOut", "error");
  output.set("errorOut", error && error.message ? error.message : String(error));
  output.set("debugStep", "error");
  throw error;
}
