/*
PKG-039 First-Time Setup and Scheduled-Check Reliability Audit

Read-only Airtable Scripting Extension audit. It never creates, updates,
deletes, sends, or invokes automations.

Scope:
- first enrollment / first submission / first XP / first WAS readiness
- canonical identity duplicates
- ownership gaps for setup writers and scheduled consumers
- scheduled-job eligibility (zero / one / many records) without arming email
*/
// @ts-nocheck

const SAMPLE_LIMIT = 25;
const CONFIG = {
  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    xp: "XP Events",
    was: "Weekly Athlete Summary",
    weeks: "Weeks",
  },
  ownership: [
    { function: "athlete_enrollment_intake", owner: "001" },
    { function: "submission_enrollment_week", owner: "005" },
    { function: "canonical_was_create", owner: "031" },
    { function: "submission_base_xp", owner: "010" },
    { function: "weekly_goal_link", owner: "032" },
    { function: "weekly_email_schedule", owner: "118" },
    { function: "progression_queue", owner: "041" },
    { function: "progression_assign", owner: "042" },
  ],
  f: {
    enr: {
      active: "Active?",
      athlete: "Athlete",
      program: "Program Instance",
      schoolYear: "School Year",
      xp: "Lifetime XP Total",
      currentLevel: "Current Level",
      recalc: "Level Recalc Needed?",
    },
    sub: {
      count: "Count This Submission?",
      enrollment: "Enrollment",
      week: "Week",
      was: "Weekly Athlete Summary",
      activityDate: "Activity Date",
    },
    xp: { key: "Source Key", active: "Active?", enrollment: "Enrollment", week: "Week", was: "Weekly Athlete Summary" },
    was: { enrollment: "Enrollment", week: "Week", goalRecord: "Goal Record", summaryKey: "Summary Key" },
    week: { active: "Active?", program: "Program Instance", start: "Week Start Date", end: "Week End Date" },
  },
  knownIssueTypes: [
    "setup_no_enrollments",
    "setup_no_submissions",
    "setup_no_xp_events",
    "setup_no_weekly_summaries",
    "duplicate_canonical_was",
    "missing_ownership_documentation",
    "scheduled_overlap_weeks",
    "inactive_enrollment_with_pipeline_rows",
    "first_record_ambiguous_program_instance",
    "first_record_ambiguous_school_year",
    "formula_timing_limitation",
  ],
};

function fieldExists(table, name) {
  try { table.getField(name); return true; } catch { return false; }
}
function raw(record, field) { return record ? record.getCellValue(field) : null; }
function text(record, field) { return record ? String(record.getCellValueAsString(field) || "").trim() : ""; }
function linkedIds(record, field) {
  const value = raw(record, field);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}
function bool(record, field) {
  const value = raw(record, field);
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}
function addIssue(report, type, severity, row) {
  if (!Object.prototype.hasOwnProperty.call(report.issueCounts, type)) report.issueCounts[type] = 0;
  if (!Array.isArray(report.samples[type])) report.samples[type] = [];
  report.issueCounts[type] += 1;
  if (report.samples[type].length < SAMPLE_LIMIT) report.samples[type].push({ severity, ...row });
}

function analyze({ enrollments, submissions, xpEvents, summaries, weeks, enrollmentTable, weekTable }) {
  const report = {
    audit: "PKG-039-first-setup-scheduled-checks",
    readOnly: true,
    ownership: CONFIG.ownership,
    scheduledJobs: [
      { automation: "041", cadence: "every_15_minutes", table: "Enrollments" },
      { automation: "056", cadence: "daily", table: "Enrollments" },
      { automation: "118", cadence: "weekly_sunday_05_denver", table: "Weeks" },
      { automation: "119", cadence: "weekly_sunday_10_denver", table: "Weeks" },
    ],
    issueCounts: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, 0])),
    samples: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, []])),
    counts: {
      enrollments: enrollments.length,
      submissions: submissions.length,
      xpEvents: xpEvents.length,
      weeklySummaries: summaries.length,
      weeks: weeks.length,
    },
    limitations: [
      "This audit cannot prove automation trigger reachability or installed script versions.",
      "Scheduled jobs are reported by eligibility shape only; Mike must attest ON/OFF and dryRun settings separately.",
      "Formula and rollup values are one read only; blank computed values are not treated as configured zero.",
    ],
  };

  if (!enrollments.length) addIssue(report, "setup_no_enrollments", "info", { detail: "No enrollments in base" });
  if (!submissions.length && enrollments.length) {
    addIssue(report, "setup_no_submissions", "warn", { detail: "Enrollment exists without submissions" });
  }
  if (!xpEvents.length && submissions.length) {
    addIssue(report, "setup_no_xp_events", "warn", { detail: "Submissions exist without XP events" });
  }
  if (!summaries.length && submissions.length) {
    addIssue(report, "setup_no_weekly_summaries", "warn", { detail: "Submissions exist without canonical WAS" });
  }

  const wasByPair = new Map();
  for (const summary of summaries) {
    const enrollmentId = linkedIds(summary, CONFIG.f.was.enrollment)[0] || "";
    const weekId = linkedIds(summary, CONFIG.f.was.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    const key = `${enrollmentId}|${weekId}`;
    wasByPair.set(key, [...(wasByPair.get(key) || []), summary.id]);
  }
  for (const [key, ids] of wasByPair.entries()) {
    if (ids.length > 1) addIssue(report, "duplicate_canonical_was", "error", { key, ids });
  }

  for (const enrollment of enrollments) {
    if (!bool(enrollment, CONFIG.f.enr.active)) continue;
    const programIds = linkedIds(enrollment, CONFIG.f.enr.program);
    const schoolYear = text(enrollment, CONFIG.f.enr.schoolYear);
    if (programIds.length !== 1) {
      addIssue(report, "first_record_ambiguous_program_instance", "error", {
        enrollmentId: enrollment.id,
        programIds,
      });
    }
    if (!schoolYear) {
      addIssue(report, "first_record_ambiguous_school_year", "error", { enrollmentId: enrollment.id });
    }
  }

  const activeWeeksByPi = new Map();
  for (const week of weeks) {
    if (!bool(week, CONFIG.f.week.active)) continue;
    const pi = linkedIds(week, CONFIG.f.week.program)[0] || "";
    if (!pi) continue;
    activeWeeksByPi.set(pi, [...(activeWeeksByPi.get(pi) || []), week]);
  }
  for (const [pi, piWeeks] of activeWeeksByPi.entries()) {
    for (let i = 0; i < piWeeks.length; i += 1) {
      for (let j = i + 1; j < piWeeks.length; j += 1) {
        const aStart = text(piWeeks[i], CONFIG.f.week.start);
        const aEnd = text(piWeeks[i], CONFIG.f.week.end);
        const bStart = text(piWeeks[j], CONFIG.f.week.start);
        const bEnd = text(piWeeks[j], CONFIG.f.week.end);
        if (aStart && aEnd && bStart && bEnd && aStart <= bEnd && bStart <= aEnd) {
          addIssue(report, "scheduled_overlap_weeks", "error", {
            programInstanceId: pi,
            weekIds: [piWeeks[i].id, piWeeks[j].id],
          });
        }
      }
    }
  }

  const inactiveWithPipeline = enrollments.filter((enrollment) => {
    if (bool(enrollment, CONFIG.f.enr.active)) return false;
    return submissions.some((sub) => linkedIds(sub, CONFIG.f.sub.enrollment).includes(enrollment.id));
  });
  for (const enrollment of inactiveWithPipeline) {
    addIssue(report, "inactive_enrollment_with_pipeline_rows", "warn", { enrollmentId: enrollment.id });
  }

  return report;
}

async function main() {
  const enrollmentTable = base.getTable(CONFIG.tables.enrollments);
  const submissionTable = base.getTable(CONFIG.tables.submissions);
  const xpTable = base.getTable(CONFIG.tables.xp);
  const wasTable = base.getTable(CONFIG.tables.was);
  const weekTable = base.getTable(CONFIG.tables.weeks);

  const [enrollments, submissions, xpEvents, summaries, weeks] = await Promise.all([
    enrollmentTable.selectRecordsAsync(),
    submissionTable.selectRecordsAsync(),
    xpTable.selectRecordsAsync(),
    wasTable.selectRecordsAsync(),
    weekTable.selectRecordsAsync(),
  ]);

  const report = analyze({
    enrollments: enrollments.records,
    submissions: submissions.records,
    xpEvents: xpEvents.records,
    summaries: summaries.records,
    weeks: weeks.records,
    enrollmentTable,
    weekTable,
  });

  console.log(JSON.stringify(report, null, 2));
}

await main();
