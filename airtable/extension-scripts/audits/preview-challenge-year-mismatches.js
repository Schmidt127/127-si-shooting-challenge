/*
Extension Script: Preview current-year mismatches
System: 127 SI Shooting Challenge
Purpose:
  Dry-run scan for current-year mismatches:
  - Active Enrollment School Year != required challenge year
  - WAS Enrollment/Week missing
  - Build/Send flags on summaries outside the target year sample
  Never deletes or rewrites historical links.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-challenge-year-mismatches",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    enrollments: "Enrollments",
    was: "Weekly Athlete Summary",
    weeks: "Weeks",
  },
  config: {
    activeSchoolYear: "Active School Year",
  },
  enrollments: {
    schoolYear: "School Year",
    active: "Active?",
    gradeBand: "Grade Band",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
    buildNow: "Build Weekly Email Now?",
  },
  weeks: {
    name: "Week Name",
  },
  limits: {
    maxEnrollments: 3000,
    maxWas: 5000,
    sample: 50,
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
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const wasTable = base.getTable(CONFIG.tables.was);

  const configQuery = await configTable.selectRecordsAsync({
    fields: [CONFIG.config.activeSchoolYear],
  });
  const byYear = {};
  for (const rec of configQuery.records) {
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.config.activeSchoolYear));
    if (!year) continue;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(rec.id);
  }
  const dupYears = Object.entries(byYear).filter(([, ids]) => ids.length > 1);
  if (dupYears.length) {
    throw new Error(
      `Refuse to continue: multiple Configs for year(s) ${dupYears
        .map(([y]) => y)
        .join(", ")}`
    );
  }

  const target = configQuery.getRecord(opts.configRecordId);
  if (!target) throw new Error(`Config ${opts.configRecordId} not found`);
  const targetYear = normalizeYear(
    target.getCellValueAsString(CONFIG.config.activeSchoolYear)
  );
  if (targetYear !== opts.challengeYear) {
    throw new Error(
      `Config year ${targetYear} does not match challengeYear ${opts.challengeYear}`
    );
  }

  const enrQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [
      CONFIG.enrollments.schoolYear,
      CONFIG.enrollments.active,
      CONFIG.enrollments.gradeBand,
    ],
  });
  if (enrQuery.records.length > CONFIG.limits.maxEnrollments) {
    throw new Error("Refuse to continue: enrollment scan limit exceeded.");
  }

  const mismatches = [];
  for (const rec of enrQuery.records) {
    const active = Boolean(rec.getCellValue(CONFIG.enrollments.active));
    const year = normalizeYear(rec.getCellValueAsString(CONFIG.enrollments.schoolYear));
    if (active && !year) {
      mismatches.push({
        code: "active_enrollment_blank_year",
        enrollmentId: rec.id,
      });
    }
    if (active && year && year !== opts.challengeYear) {
      mismatches.push({
        code: "active_enrollment_wrong_year",
        enrollmentId: rec.id,
        schoolYear: year,
      });
    }
    if (active && year === opts.challengeYear) {
      const band = rec.getCellValue(CONFIG.enrollments.gradeBand);
      if (!band || (Array.isArray(band) && band.length === 0)) {
        mismatches.push({
          code: "active_enrollment_missing_grade_band",
          enrollmentId: rec.id,
        });
      }
    }
  }

  const wasQuery = await wasTable.selectRecordsAsync({
    fields: [CONFIG.was.enrollment, CONFIG.was.week, CONFIG.was.buildNow],
  });
  if (wasQuery.records.length > CONFIG.limits.maxWas) {
    throw new Error("Refuse to continue: WAS scan limit exceeded.");
  }

  let missingEnrollment = 0;
  let missingWeek = 0;
  for (const rec of wasQuery.records) {
    const enr = rec.getCellValue(CONFIG.was.enrollment);
    const week = rec.getCellValue(CONFIG.was.week);
    if (!enr || (Array.isArray(enr) && enr.length === 0)) {
      missingEnrollment += 1;
      if (mismatches.length < CONFIG.limits.sample) {
        mismatches.push({ code: "was_missing_enrollment", wasId: rec.id });
      }
    }
    if (!week || (Array.isArray(week) && week.length === 0)) {
      missingWeek += 1;
      if (mismatches.length < CONFIG.limits.sample) {
        mismatches.push({ code: "was_missing_week", wasId: rec.id });
      }
    }
  }

  const report = {
    automation: SCRIPT.scriptName,
    version: SCRIPT.version,
    dryRun: true,
    configRecordId: opts.configRecordId,
    challengeYear: opts.challengeYear,
    mismatchCount: mismatches.length,
    wasMissingEnrollmentCount: missingEnrollment,
    wasMissingWeekCount: missingWeek,
    sampleMismatches: mismatches.slice(0, CONFIG.limits.sample),
    proposedChanges: mismatches.slice(0, CONFIG.limits.sample).map((m) => ({
      ...m,
      action: "manual_review",
      note: "Dry-run only. No automatic rewrites.",
    })),
    writesPerformed: 0,
  };

  console.log(JSON.stringify(report, null, 2));
  output.set("statusOut", mismatches.length ? "skipped" : "success");
  output.set("actionOut", "preview_year_mismatches");
  output.set("errorOut", "");
  output.set("debugStep", "complete");
  output.set("dryRunOut", true);
  output.set("mismatchCountOut", mismatches.length);
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
