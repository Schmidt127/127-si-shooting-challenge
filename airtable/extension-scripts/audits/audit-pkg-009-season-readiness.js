/*
PKG-009 Season Scope and Readiness Audit

Read-only Airtable Scripting Extension audit. It never creates, updates,
deletes, sends, or invokes automations.

Scope:
- Registering Shooting Challenge Program Instance cardinality
- active Config / School Year alignment
- Week calendar overlap within Program Instance
- active Enrollment identity (Athlete + Program Instance + School Year)
- cross-season leakage warnings on pipeline rows
*/
// @ts-nocheck

const SAMPLE_LIMIT = 25;
const CONFIG = {
  tables: {
    programInstances: "Program Instance - Sync",
    config: "Config",
    weeks: "Weeks",
    enrollments: "Enrollments",
    submissions: "Submissions",
    was: "Weekly Athlete Summary",
    xp: "XP Events",
  },
  f: {
    pi: {
      name: "Name - Program Instance",
      program: "Program - Linked",
      status: "Status",
      schoolYear: "School Year - Linked",
    },
    cfg: { active: "Active?", schoolYear: "Active School Year" },
    week: { active: "Active?", program: "Program Instance", start: "Week Start Date", end: "Week End Date" },
    enr: { active: "Active?", athlete: "Athlete", program: "Program Instance", schoolYear: "School Year" },
    sub: { enrollment: "Enrollment", week: "Week" },
    was: { enrollment: "Enrollment", week: "Week" },
    xp: { enrollment: "Enrollment", week: "Week", active: "Active?" },
  },
  knownIssueTypes: [
    "no_registering_program_instance",
    "multiple_registering_program_instances",
    "registering_program_instance_name_mismatch",
    "no_active_config",
    "multiple_active_configs",
    "active_config_school_year_mismatch",
    "week_missing_program_instance",
    "week_overlap",
    "duplicate_active_enrollment_identity",
    "enrollment_identity_incomplete",
    "cross_program_instance_pipeline_link",
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
function linkedName(record, field) {
  const value = raw(record, field);
  if (Array.isArray(value) && value[0]) return String(value[0].name || "").trim();
  return text(record, field);
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

function analyze({
  programInstances,
  configRows,
  weeks,
  enrollments,
  submissions,
  summaries,
  xpEvents,
}) {
  const report = {
    audit: "PKG-009-season-readiness",
    readOnly: true,
    issueCounts: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, 0])),
    samples: Object.fromEntries(CONFIG.knownIssueTypes.map((type) => [type, []])),
    counts: {
      programInstances: programInstances.length,
      configRows: configRows.length,
      weeks: weeks.length,
      enrollments: enrollments.length,
      submissions: submissions.length,
      weeklySummaries: summaries.length,
      xpEvents: xpEvents.length,
    },
    limitations: [
      "This audit cannot prove Fillout availability, Vercel deployment state, or web view membership.",
      "Program Instance comparisons use linked record IDs where available.",
      "Historical closed seasons are not errors unless they leak into the registering scope.",
    ],
  };

  const registering = programInstances.filter(
    (row) =>
      linkedName(row, CONFIG.f.pi.program) === "Shooting Challenge" &&
      text(row, CONFIG.f.pi.status) === "Registering",
  );
  if (!registering.length) addIssue(report, "no_registering_program_instance", "error", {});
  if (registering.length > 1) {
    addIssue(report, "multiple_registering_program_instances", "error", {
      ids: registering.map((row) => row.id),
    });
  }

  let targetPi = registering.length === 1 ? registering[0] : null;
  let targetYear = targetPi ? text(targetPi, CONFIG.f.pi.schoolYear) : "";
  if (targetPi && targetYear) {
    const expectedName = `Shooting Challenge | ${targetYear}`;
    const actualName = text(targetPi, CONFIG.f.pi.name);
    if (actualName !== expectedName) {
      addIssue(report, "registering_program_instance_name_mismatch", "error", {
        expectedName,
        actualName,
        programInstanceId: targetPi.id,
      });
    }
  }

  const activeConfig = configRows.filter((row) => bool(row, CONFIG.f.cfg.active));
  if (!activeConfig.length) addIssue(report, "no_active_config", "error", {});
  if (activeConfig.length > 1) {
    addIssue(report, "multiple_active_configs", "error", { ids: activeConfig.map((row) => row.id) });
  }
  if (activeConfig.length === 1 && targetYear) {
    const cfgYear = text(activeConfig[0], CONFIG.f.cfg.schoolYear);
    if (cfgYear && cfgYear !== targetYear) {
      addIssue(report, "active_config_school_year_mismatch", "error", {
        configId: activeConfig[0].id,
        configYear: cfgYear,
        registeringYear: targetYear,
      });
    }
  }

  const weeksByPi = new Map();
  for (const week of weeks) {
    const pi = linkedIds(week, CONFIG.f.week.program)[0] || "";
    if (!pi) {
      addIssue(report, "week_missing_program_instance", "error", { weekId: week.id });
      continue;
    }
    weeksByPi.set(pi, [...(weeksByPi.get(pi) || []), week]);
  }
  for (const [pi, piWeeks] of weeksByPi.entries()) {
    const active = piWeeks.filter((week) => bool(week, CONFIG.f.week.active));
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const aStart = text(active[i], CONFIG.f.week.start);
        const aEnd = text(active[i], CONFIG.f.week.end);
        const bStart = text(active[j], CONFIG.f.week.start);
        const bEnd = text(active[j], CONFIG.f.week.end);
        if (aStart && aEnd && bStart && bEnd && aStart <= bEnd && bStart <= aEnd) {
          addIssue(report, "week_overlap", "error", {
            programInstanceId: pi,
            weekIds: [active[i].id, active[j].id],
          });
        }
      }
    }
  }

  const enrollmentById = new Map(enrollments.map((row) => [row.id, row]));
  const identity = new Map();
  for (const enrollment of enrollments) {
    if (!bool(enrollment, CONFIG.f.enr.active)) continue;
    const athleteId = linkedIds(enrollment, CONFIG.f.enr.athlete)[0] || "";
    const pi = linkedIds(enrollment, CONFIG.f.enr.program)[0] || "";
    const year = text(enrollment, CONFIG.f.enr.schoolYear);
    if (!athleteId || !pi || !year) {
      addIssue(report, "enrollment_identity_incomplete", "error", { enrollmentId: enrollment.id });
      continue;
    }
    const key = `${athleteId}|${pi}|${year}`;
    identity.set(key, [...(identity.get(key) || []), enrollment.id]);
  }
  for (const [key, ids] of identity.entries()) {
    if (ids.length > 1) addIssue(report, "duplicate_active_enrollment_identity", "error", { key, ids });
  }

  const assertSamePi = (record, enrollmentId, tableLabel, recordId) => {
    const enrollment = enrollmentById.get(enrollmentId);
    if (!enrollment || !targetPi) return;
    const enrollmentPi = linkedIds(enrollment, CONFIG.f.enr.program)[0] || "";
    if (enrollmentPi && enrollmentPi !== targetPi.id) {
      addIssue(report, "cross_program_instance_pipeline_link", "error", {
        table: tableLabel,
        recordId,
        enrollmentId,
        enrollmentProgramInstanceId: enrollmentPi,
        registeringProgramInstanceId: targetPi.id,
      });
    }
  };

  for (const submission of submissions) {
    const enrollmentId = linkedIds(submission, CONFIG.f.sub.enrollment)[0] || "";
    if (enrollmentId) assertSamePi(submission, enrollmentId, "Submissions", submission.id);
  }
  for (const summary of summaries) {
    const enrollmentId = linkedIds(summary, CONFIG.f.was.enrollment)[0] || "";
    if (enrollmentId) assertSamePi(summary, enrollmentId, "Weekly Athlete Summary", summary.id);
  }
  for (const xp of xpEvents) {
    if (!bool(xp, CONFIG.f.xp.active)) continue;
    const enrollmentId = linkedIds(xp, CONFIG.f.xp.enrollment)[0] || "";
    if (enrollmentId) assertSamePi(xp, enrollmentId, "XP Events", xp.id);
  }

  return report;
}

async function main() {
  const piTable = base.getTable(CONFIG.tables.programInstances);
  const configTable = base.getTable(CONFIG.tables.config);
  const weekTable = base.getTable(CONFIG.tables.weeks);
  const enrollmentTable = base.getTable(CONFIG.tables.enrollments);
  const submissionTable = base.getTable(CONFIG.tables.submissions);
  const wasTable = base.getTable(CONFIG.tables.was);
  const xpTable = base.getTable(CONFIG.tables.xp);

  const [programInstances, configRows, weeks, enrollments, submissions, summaries, xpEvents] =
    await Promise.all([
      piTable.selectRecordsAsync(),
      configTable.selectRecordsAsync(),
      weekTable.selectRecordsAsync(),
      enrollmentTable.selectRecordsAsync(),
      submissionTable.selectRecordsAsync(),
      wasTable.selectRecordsAsync(),
      xpTable.selectRecordsAsync(),
    ]);

  const report = analyze({
    programInstances: programInstances.records,
    configRows: configRows.records,
    weeks: weeks.records,
    enrollments: enrollments.records,
    submissions: submissions.records,
    summaries: summaries.records,
    xpEvents: xpEvents.records,
  });

  console.log(JSON.stringify(report, null, 2));
}

await main();
