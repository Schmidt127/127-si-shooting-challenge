/*
Extension Script: Repair Final 090G — Build Final Challenge Summary Email (Staging)
System: 127 SI Shooting Challenge
Purpose:
  Builds a final-summary planning/staging package for Active? enrollments using
  enrollment lookup fields and each enrollment's latest Weekly Athlete Summary.

Safety:
  - DRY_RUN defaults to true (read-only planning mode)
  - Set DRY_RUN = false and CONFIRM_BUILD = true to write staging fields
  - Does NOT send emails
  - Does NOT check Send to Make?
  - Does NOT call fetch/webhooks
  - BATCH_LIMIT = 25 for any optional staging writes

Staging approach:
  - Finds latest Weekly Athlete Summary per active enrollment
  - Builds subject/text/json payload preview (final summary package)
  - In dry-run, outputs families/enrollments that would get final summary
  - Optional write mode stores package fields on the latest Weekly Athlete Summary
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_BUILD = false;
const BATCH_LIMIT = 25;
const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_090g_stub";

const CONFIG = {
  scriptName: "repair-final-090g-build-final-challenge-summary-email",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    weeklySummary: "Weekly Athlete Summary",
    weeks: "Weeks",
  },

  enrollments: {
    active: "Active?",
    fullNameCandidates: ["Full Athlete Name", "Full Athlete Name - Backward"],
    firstName: "Athlete First Name",
    parentEmailCleaned: "Parent Email - Cleaned",
    athleteEmailCleaned: "Athlete Email - Cleaned",
    currentLevelCandidates: [
      "Level Name with Color (from Current Level)",
      "Current Level",
      "Level Status",
    ],
    lifetimeXpTotal: "Lifetime XP Total",
    xpNeededForNextLevel: "XP Needed for Next Level",
    xpProgressCurrentLevel: "XP Progress in Current Level",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    weekDisplay: "Week - Display",
    weeklyXp: "XP Earned This Week",
    levelNumber: "Level Number",
    totalXpAfterWeek: "Total XP After Week",

    // Staging fields
    weeklyEmailSubject: "Weekly Email Subject",
    weeklyEmailText: "Weekly Email Text",
    weeklyEmailPayloadJson: "Weekly Email Payload JSON",
    weeklyEmailRevision: "Weekly Email Revision",
    weeklyEmailLastBuiltAt: "Weekly Email Last Built At",
  },

  weeks: {
    weekName: "Week Name",
    startDate: "Start Date",
    endDate: "End Date",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Weekly Athlete Summary", "Enrollment"],
  ["Weekly Athlete Summary", "Week"],
  ["Weeks", "Start Date"],
  ["Weeks", "End Date"],
];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
  } catch {
    return false;
  }
}

function requireSchema(tables) {
  const missing = [];
  for (const [tableName, fieldName] of REQUIRED_FIELDS) {
    const table = tables[tableName];
    if (!table) {
      missing.push(`table:${tableName}`);
      continue;
    }
    if (!fieldExists(table, fieldName)) missing.push(`${tableName}.${fieldName}`);
  }
  if (missing.length) {
    throw new Error(`Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
  if (!record || !fieldExists(table, fieldName)) return fallback;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function firstNonBlank(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function firstExistingField(table, candidateFields) {
  for (const fieldName of candidateFields || []) {
    if (fieldExists(table, fieldName)) return fieldName;
  }
  return "";
}

function cleanCsvEmails(value) {
  const emails = String(value || "")
    .split(/[,\n;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)].join(",");
}

function parseIsoDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function weekSortTimestamp(weekRecord, weeksTable) {
  if (!weekRecord) return 0;
  const end = parseIsoDateOnly(getRaw(weekRecord, weeksTable, CONFIG.weeks.endDate));
  if (end) return end.getTime();
  const start = parseIsoDateOnly(getRaw(weekRecord, weeksTable, CONFIG.weeks.startDate));
  if (start) return start.getTime();
  return 0;
}

function formatNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0";
}

function buildSummaryTextPackage({
  athleteName,
  firstName,
  weekLabel,
  lifetimeXpTotal,
  currentLevel,
  xpNeededForNextLevel,
  xpProgressCurrentLevel,
  weeklyXp,
  levelNumber,
}) {
  const greeting = firstName || athleteName || "Athlete";
  const lines = [
    `Hi ${greeting},`,
    "",
    "Final Shooting Challenge Summary (staging build):",
    `- Athlete: ${athleteName || "Unknown Athlete"}`,
    `- Most Recent Week: ${weekLabel || "Unknown Week"}`,
    `- Lifetime XP Total: ${formatNumber(lifetimeXpTotal)} XP`,
    `- Current Level: ${currentLevel || "Unknown Level"}`,
    `- Level Number (latest summary): ${formatNumber(levelNumber)}`,
    `- Weekly XP (latest summary): ${formatNumber(weeklyXp)} XP`,
    `- XP Progress in Current Level: ${formatNumber(xpProgressCurrentLevel)} XP`,
    `- XP Needed for Next Level: ${formatNumber(xpNeededForNextLevel)} XP`,
    "",
    "This package is staged only. No email has been sent.",
  ];
  return lines.join("\n");
}

async function main() {
  if (CONFIRM_BUILD && DRY_RUN) {
    throw new Error("CONFIRM_BUILD is true while DRY_RUN is true. Set DRY_RUN = false to stage writes.");
  }

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  requireSchema({
    [CONFIG.tables.enrollments]: enrollmentsTable,
    [CONFIG.tables.weeklySummary]: weeklySummaryTable,
    [CONFIG.tables.weeks]: weeksTable,
  });

  const enrollmentFields = [
    CONFIG.enrollments.active,
    CONFIG.enrollments.firstName,
    CONFIG.enrollments.parentEmailCleaned,
    CONFIG.enrollments.athleteEmailCleaned,
    CONFIG.enrollments.lifetimeXpTotal,
    CONFIG.enrollments.xpNeededForNextLevel,
    CONFIG.enrollments.xpProgressCurrentLevel,
    ...CONFIG.enrollments.fullNameCandidates,
    ...CONFIG.enrollments.currentLevelCandidates,
  ].filter((v, i, arr) => arr.indexOf(v) === i && fieldExists(enrollmentsTable, v));

  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );
  const weekFields = Object.values(CONFIG.weeks).filter(name => fieldExists(weeksTable, name));

  const [enrollmentQuery, summaryQuery, weekQuery] = await Promise.all([
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
    weeksTable.selectRecordsAsync({ fields: weekFields }),
  ]);

  const activeEnrollments = enrollmentQuery.records.filter(enrollment =>
    getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)
  );

  const weekById = new Map();
  for (const week of weekQuery.records) {
    weekById.set(week.id, week);
  }

  const summariesByEnrollment = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    if (!enrollmentId) continue;
    if (!summariesByEnrollment.has(enrollmentId)) summariesByEnrollment.set(enrollmentId, []);
    summariesByEnrollment.get(enrollmentId).push(summary);
  }

  const fullNameField = firstExistingField(enrollmentsTable, CONFIG.enrollments.fullNameCandidates);
  const levelField = firstExistingField(enrollmentsTable, CONFIG.enrollments.currentLevelCandidates);

  const candidates = [];
  const excluded = [];
  const exclusionCounts = {};

  function exclude(reason, details) {
    exclusionCounts[reason] = (exclusionCounts[reason] || 0) + 1;
    if (excluded.length < SAMPLE_LIMIT) excluded.push({ reason, ...details });
  }

  for (const enrollment of activeEnrollments) {
    const enrollmentId = enrollment.id;
    const summaries = summariesByEnrollment.get(enrollmentId) || [];

    if (!summaries.length) {
      exclude("missing_weekly_summary", { enrollmentId, enrollmentName: enrollment.name });
      continue;
    }

    const sorted = [...summaries].sort((a, b) => {
      const aWeek = weekById.get(getFirstLinkedId(a, weeklySummaryTable, CONFIG.weeklySummary.week));
      const bWeek = weekById.get(getFirstLinkedId(b, weeklySummaryTable, CONFIG.weeklySummary.week));
      return weekSortTimestamp(bWeek, weeksTable) - weekSortTimestamp(aWeek, weeksTable);
    });

    const latestSummary = sorted[0];
    const latestWeekId = getFirstLinkedId(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.week);
    const latestWeek = weekById.get(latestWeekId);

    const athleteName = firstNonBlank(
      fullNameField ? getText(enrollment, enrollmentsTable, fullNameField) : "",
      enrollment.name
    );
    const firstName = getText(enrollment, enrollmentsTable, CONFIG.enrollments.firstName);
    const parentEmail = getText(enrollment, enrollmentsTable, CONFIG.enrollments.parentEmailCleaned);
    const athleteEmail = getText(enrollment, enrollmentsTable, CONFIG.enrollments.athleteEmailCleaned);
    const recipientCsv = cleanCsvEmails([parentEmail, athleteEmail].filter(Boolean).join(","));

    if (!recipientCsv) {
      exclude("missing_recipients", {
        enrollmentId,
        enrollmentName: athleteName,
        latestSummaryId: latestSummary.id,
      });
      continue;
    }

    const weekLabel = firstNonBlank(
      getText(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.weekDisplay),
      latestWeek ? getText(latestWeek, weeksTable, CONFIG.weeks.weekName) : ""
    );

    const currentLevel = firstNonBlank(
      levelField ? getText(enrollment, enrollmentsTable, levelField) : "",
      fieldExists(weeklySummaryTable, CONFIG.weeklySummary.levelNumber)
        ? `Level ${getNumber(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.levelNumber, 0)}`
        : ""
    );

    const lifetimeXpTotal = getNumber(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.lifetimeXpTotal,
      getNumber(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.totalXpAfterWeek, 0)
    );
    const xpNeededForNextLevel = getNumber(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.xpNeededForNextLevel,
      0
    );
    const xpProgressCurrentLevel = getNumber(
      enrollment,
      enrollmentsTable,
      CONFIG.enrollments.xpProgressCurrentLevel,
      0
    );
    const weeklyXp = getNumber(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.weeklyXp, 0);
    const levelNumber = getNumber(latestSummary, weeklySummaryTable, CONFIG.weeklySummary.levelNumber, 0);

    const subject = `Final Shooting Challenge Summary - ${athleteName}`;
    const textBody = buildSummaryTextPackage({
      athleteName,
      firstName,
      weekLabel,
      lifetimeXpTotal,
      currentLevel,
      xpNeededForNextLevel,
      xpProgressCurrentLevel,
      weeklyXp,
      levelNumber,
    });

    const payload = {
      script: CONFIG.scriptName,
      version: CONFIG.version,
      buildMode: DRY_RUN ? "planning_read_only" : CONFIRM_BUILD ? "staging_write" : "report_only",
      enrollmentId,
      enrollmentName: athleteName,
      latestWeeklySummaryId: latestSummary.id,
      latestWeekId,
      weekLabel,
      recipientsCsv: recipientCsv,
      metrics: {
        lifetimeXpTotal,
        currentLevel,
        levelNumber,
        weeklyXp,
        xpProgressCurrentLevel,
        xpNeededForNextLevel,
      },
    };

    candidates.push({
      enrollmentId,
      enrollmentName: athleteName,
      latestWeeklySummaryId: latestSummary.id,
      latestWeekId,
      weekLabel,
      recipientsCsv: recipientCsv,
      lifetimeXpTotal,
      currentLevel,
      levelNumber,
      weeklyXp,
      xpProgressCurrentLevel,
      xpNeededForNextLevel,
      subject,
      textBody,
      payloadJson: JSON.stringify(payload, null, 2),
      action: DRY_RUN ? "would_stage_final_summary_package" : "stage_final_summary_package",
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const staged = [];
  const errors = [];

  for (const row of batch) {
    try {
      const update = {};

      if (isWritableField(weeklySummaryTable, CONFIG.weeklySummary.weeklyEmailSubject)) {
        update[CONFIG.weeklySummary.weeklyEmailSubject] = row.subject;
      }
      if (isWritableField(weeklySummaryTable, CONFIG.weeklySummary.weeklyEmailText)) {
        update[CONFIG.weeklySummary.weeklyEmailText] = row.textBody;
      }
      if (isWritableField(weeklySummaryTable, CONFIG.weeklySummary.weeklyEmailPayloadJson)) {
        update[CONFIG.weeklySummary.weeklyEmailPayloadJson] = row.payloadJson;
      }
      if (isWritableField(weeklySummaryTable, CONFIG.weeklySummary.weeklyEmailRevision)) {
        update[CONFIG.weeklySummary.weeklyEmailRevision] = CONFIG.version;
      }
      if (isWritableField(weeklySummaryTable, CONFIG.weeklySummary.weeklyEmailLastBuiltAt)) {
        update[CONFIG.weeklySummary.weeklyEmailLastBuiltAt] = new Date();
      }

      if (!DRY_RUN && CONFIRM_BUILD && Object.keys(update).length > 0) {
        await weeklySummaryTable.updateRecordAsync(row.latestWeeklySummaryId, update);
      }

      staged.push({
        enrollmentId: row.enrollmentId,
        enrollmentName: row.enrollmentName,
        latestWeeklySummaryId: row.latestWeeklySummaryId,
        recipientsCsv: row.recipientsCsv,
        action: row.action,
        updateFields: Object.keys(update),
        dryRun: DRY_RUN || !CONFIRM_BUILD,
      });
    } catch (error) {
      errors.push({
        enrollmentId: row.enrollmentId,
        latestWeeklySummaryId: row.latestWeeklySummaryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: CONFIG.schemaSnapshot,
    dryRun: DRY_RUN,
    confirmBuild: CONFIRM_BUILD,
    mode: DRY_RUN ? "read_only_planning" : CONFIRM_BUILD ? "staging_write" : "report_only",
    constraints: {
      sendsEmail: false,
      checksSendToMake: false,
      performsFetch: false,
    },
    batchLimit: BATCH_LIMIT,
    activeEnrollmentCount: activeEnrollments.length,
    candidateCount: candidates.length,
    batchCount: batch.length,
    stagedCount: DRY_RUN || !CONFIRM_BUILD ? 0 : staged.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    excludedCount: Object.values(exclusionCounts).reduce((sum, n) => sum + n, 0),
    exclusionCounts,
    familiesWouldReceiveFinalSummarySample: candidates.slice(0, SAMPLE_LIMIT).map(row => ({
      enrollmentId: row.enrollmentId,
      enrollmentName: row.enrollmentName,
      latestWeeklySummaryId: row.latestWeeklySummaryId,
      weekLabel: row.weekLabel,
      recipientsCsv: row.recipientsCsv,
      lifetimeXpTotal: row.lifetimeXpTotal,
      currentLevel: row.currentLevel,
      levelNumber: row.levelNumber,
      weeklyXp: row.weeklyXp,
      xpProgressCurrentLevel: row.xpProgressCurrentLevel,
      xpNeededForNextLevel: row.xpNeededForNextLevel,
      action: row.action,
    })),
    stagedSample: staged.slice(0, SAMPLE_LIMIT),
    excludedSample: excluded,
    errors,
  };

  console.log("===== FINAL 090G — BUILD FINAL CHALLENGE SUMMARY EMAIL (STAGING) =====");
  console.log(JSON.stringify(report, null, 2));

  if (DRY_RUN) {
    console.log("Read-only planning mode: no records were updated.");
    return;
  }

  if (!CONFIRM_BUILD) {
    console.log("CONFIRM_BUILD is false. Reporting only; no staging writes were applied.");
    return;
  }

  console.log(
    `Staging writes applied to ${staged.length} Weekly Athlete Summary record(s); ${Math.max(
      0,
      candidates.length - batch.length
    )} candidate(s) remain for next batch.`
  );
}

await main();
