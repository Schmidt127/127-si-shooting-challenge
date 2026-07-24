/*
Extension Script: Preview Submission ↔ Week season mismatches
System: 127 SI Shooting Challenge
Purpose:
  Dry-run list Submissions missing Week, or whose Enrollment School Year
  does not match the required challenge year (sample).
  Never writes or deletes. Never auto-reassigns Weeks.

Version: v1.0
Date Written: 2026-07-24
Last Updated: 2026-07-24
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "preview-submission-week-mismatches",
  version: "v1.0",
  versionDate: "2026-07-24",
  originalWrittenDate: "2026-07-24",
  lastUpdated: "2026-07-24",
};

const CONFIG = {
  tables: {
    config: "Config",
    enrollments: "Enrollments",
    submissions: "Submissions",
  },
  config: { activeSchoolYear: "Active School Year" },
  enrollments: { schoolYear: "School Year" },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
  },
  limits: { maxSubmissions: 5000, sample: 50 },
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
  if (!configRecordId.startsWith("rec")) throw new Error("configRecordId is required (rec…)");
  if (!challengeYear) throw new Error("challengeYear is required (YYYY-YYYY)");
  if (!dryRun) throw new Error("Preview-only. dryRun must remain true.");
  return { configRecordId, challengeYear, dryRun: true };
}

function linkedId(cell) {
  if (!cell) return null;
  if (Array.isArray(cell) && cell[0]) return cell[0].id || null;
  return cell.id || null;
}

async function main() {
  const opts = requireInput();
  const configTable = base.getTable(CONFIG.tables.config);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

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
  if ((byYear[opts.challengeYear] || []).length > 1) {
    throw new Error(`Refuse: multiple Configs for ${opts.challengeYear}`);
  }
  if (!configQuery.getRecord(opts.configRecordId)) {
    throw new Error(`Config ${opts.configRecordId} not found`);
  }

  const enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.schoolYear],
  });
  const enrollmentYear = {};
  for (const rec of enrollmentsQuery.records) {
    enrollmentYear[rec.id] = normalizeYear(
      rec.getCellValueAsString(CONFIG.enrollments.schoolYear)
    );
  }

  const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: [
      CONFIG.submissions.enrollment,
      CONFIG.submissions.week,
      CONFIG.submissions.activityDate,
    ],
  });

  const missingWeek = [];
  const wrongEnrollmentYear = [];
  for (const rec of submissionsQuery.records) {
    const enrId = linkedId(rec.getCellValue(CONFIG.submissions.enrollment));
    const weekId = linkedId(rec.getCellValue(CONFIG.submissions.week));
    const year = enrId ? enrollmentYear[enrId] : null;
    if (!weekId && missingWeek.length < CONFIG.limits.sample) {
      missingWeek.push({
        submissionId: rec.id,
        enrollmentId: enrId,
        activityDate: rec.getCellValueAsString(CONFIG.submissions.activityDate),
        proposed: "re_run_005_after_weeks_fixed",
      });
    }
    if (year && year !== opts.challengeYear && wrongEnrollmentYear.length < CONFIG.limits.sample) {
      wrongEnrollmentYear.push({
        submissionId: rec.id,
        enrollmentId: enrId,
        enrollmentYear: year,
        weekId,
        proposed: "review_only_do_not_auto_relink",
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        script: SCRIPT,
        dryRun: true,
        status:
          missingWeek.length || wrongEnrollmentYear.length ? "PASS WITH WARNINGS" : "PASS",
        challengeYear: opts.challengeYear,
        findings: { missingWeek, wrongEnrollmentYear },
        proposedChanges: [],
        skipped: [],
      },
      null,
      2
    )
  );
}

await main();
