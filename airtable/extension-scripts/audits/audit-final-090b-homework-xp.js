/*
Extension Script: Final Pre-Close 090B — Homework XP
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity for reviewed Homework Completions vs Homework XP (065 logic),
  HW17 / Final Reflection Quiz linkage, inverse checks — Active? enrollments only.

Schema gate: 20260629_045741
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090b-homework-xp",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    homework: "Homework Completions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
    quizSubmissions: "Final Reflection Quiz Submissions",
  },

  enrollments: { active: "Active?" },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary Link",
    satisfactory: "Satisfactory?",
    reviewComplete: "Review Complete",
    coachFeedback: "Coach Feedback",
    baseXp: "Base XP Awarded",
    totalXp: "Total Homework XP Awarded",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    completionKey: "Homework Completion Key",
    submissionDate: "Submission Date",
    submissionDateDateOnly: "Submission Date - Date Only",
    uploadStatus: "Upload Status",
    reflectionQuiz: "Final Reflection Quiz Submissions",
  },

  xpEvents: {
    sourceKey: "Source Key",
    homeworkCompletion: "Homework Completion",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
  },

  weeklySummary: { enrollment: "Enrollment", week: "Week" },

  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
  },

  values: {
    sourceKeyPrefix: "HOMEWORK_XP|",
    legacySourceKeyPrefix: "HOMEWORK_COMPLETION|",
    awardAwarded: "Awarded",
    hw17NameHints: ["hw17", "homework 17", "final reflection"],
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Homework Completions", "Enrollment"],
  ["Homework Completions", "Award Status"],
  ["Homework Completions", "XP Events"],
  ["XP Events", "Source Key"],
  ["XP Events", "Homework Completion"],
];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
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

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getDateValue(record, table, fieldNames) {
  for (const fieldName of fieldNames) {
    if (!fieldName || !fieldExists(table, fieldName)) continue;
    const value = record.getCellValue(fieldName);
    if (!value) continue;
    if (value instanceof Date && !isNaN(value)) return value;
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function buildSourceKey(homeworkId) {
  return `${CONFIG.values.sourceKeyPrefix}${homeworkId}`;
}

function buildLegacySourceKey(homeworkId) {
  return `${CONFIG.values.legacySourceKeyPrefix}${homeworkId}`;
}

function getSourceKeysForHomework(homeworkId) {
  return [buildSourceKey(homeworkId), buildLegacySourceKey(homeworkId)];
}

function xpBelongsToHomework(xpRecord, xpEventsTable, homeworkId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (getSourceKeysForHomework(homeworkId).includes(sourceKey)) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.homeworkCompletion).includes(homeworkId);
}

function isHw17Record(homeworkRecord, homeworkTable) {
  const homeworkName = getText(homeworkRecord, homeworkTable, CONFIG.homework.homework).toLowerCase();
  const completionKey = getText(homeworkRecord, homeworkTable, CONFIG.homework.completionKey).toLowerCase();
  const combined = `${homeworkRecord.name} ${homeworkName} ${completionKey}`.toLowerCase();
  return CONFIG.values.hw17NameHints.some(hint => combined.includes(hint));
}

function assessReviewReadiness(homeworkRecord, homeworkTable) {
  const missing = [];
  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment).length) missing.push("enrollment");
  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.homework).length) missing.push("homework");
  if (!getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week).length) missing.push("week");
  if (!getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback)) missing.push("coach_feedback");
  if (!getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory)) missing.push("satisfactory");
  if (!getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete)) missing.push("review_complete");
  if (getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp) <= 0) missing.push("total_xp");
  if (!getDateValue(homeworkRecord, homeworkTable, [CONFIG.homework.submissionDateDateOnly, CONFIG.homework.submissionDate])) {
    missing.push("submission_date");
  }
  return { ready: missing.length === 0, missing };
}

function getHomeworkXpIds(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();
  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToHomework(xp, xpEventsTable, homeworkId)) ids.add(xpId);
  }
  for (const sourceKey of getSourceKeysForHomework(homeworkId)) {
    for (const xpId of xpBySourceKey.get(sourceKey) || []) ids.add(xpId);
  }
  return [...ids];
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  requireSchema({
    Enrollments: enrollmentsTable,
    "Homework Completions": homeworkTable,
    "XP Events": xpEventsTable,
  });

  const activeEnrollmentIds = new Set();
  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.active],
  });
  for (const e of enrollmentQuery.records) {
    if (getBooleanish(e, enrollmentsTable, CONFIG.enrollments.active)) activeEnrollmentIds.add(e.id);
  }

  const homeworkFields = Object.values(CONFIG.homework).filter(n => fieldExists(homeworkTable, n));
  const xpFields = Object.values(CONFIG.xpEvents).filter(n => fieldExists(xpEventsTable, n));

  let quizQuery = { records: [] };
  let quizTable = null;
  try {
    quizTable = base.getTable(CONFIG.tables.quizSubmissions);
    const quizFields = Object.values(CONFIG.quiz).filter(n => fieldExists(quizTable, n));
    quizQuery = await quizTable.selectRecordsAsync({ fields: quizFields });
  } catch {
    /* optional */
  }

  const [homeworkQuery, xpQuery, summaryQuery] = await Promise.all([
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({
      fields: Object.values(CONFIG.weeklySummary).filter(n => fieldExists(weeklySummaryTable, n)),
    }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sk = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sk) continue;
    if (!xpBySourceKey.has(sk)) xpBySourceKey.set(sk, []);
    xpBySourceKey.get(sk).push(xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment)[0] || "";
    const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    summaryIndex.set(buildSummaryIndexKey(enrollmentId, weekId), summary.id);
  }

  const quizByHomework = new Map();
  if (quizTable) {
    for (const quiz of quizQuery.records) {
      const hwId = getLinkedIds(quiz, quizTable, CONFIG.quiz.homeworkCompletion)[0];
      if (hwId) quizByHomework.set(hwId, quiz.id);
    }
  }

  const issueCounts = {};
  const issues = [];
  let scopedChecked = 0;
  let hw17Checked = 0;

  function bump(issue) {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  function pushIssue(row) {
    bump(row.issue);
    if (issues.length < SAMPLE_LIMIT) issues.push(row);
  }

  for (const homeworkRecord of homeworkQuery.records) {
    const enrollmentId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;

    scopedChecked += 1;
    const homeworkId = homeworkRecord.id;
    const readiness = assessReviewReadiness(homeworkRecord, homeworkTable);

    if (!readiness.ready) {
      bump("excluded_not_ready");
      continue;
    }

    if (isHw17Record(homeworkRecord, homeworkTable)) {
      hw17Checked += 1;
      const quizLinkIds = fieldExists(homeworkTable, CONFIG.homework.reflectionQuiz)
        ? getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.reflectionQuiz)
        : [];
      if (!quizLinkIds.length && !quizByHomework.get(homeworkId)) {
        pushIssue({
          homeworkId,
          enrollmentId,
          classification: "issue",
          issue: "hw17_missing_quiz_link",
          recommendedAction: "needs_manual_review",
        });
      }
    }

    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const xpIds = getHomeworkXpIds(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey);
    const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);
    const totalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
    const weekId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week)[0] || "";
    const expectedKey = buildSourceKey(homeworkId);

    if (xpIds.length === 0) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "missing_xp_event",
        recommendedAction: "safe_auto_fix_later",
      });
      continue;
    }

    if (xpIds.length > 1) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "duplicate_xp_event",
        xpEventIds: xpIds,
        recommendedAction: "needs_manual_review",
      });
      continue;
    }

    const primaryXp = xpQuery.getRecord(xpIds[0]);
    const primarySourceKey = getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const primaryPoints = getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints);
    const primaryWasId = getLinkedIds(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary)[0] || "";
    const expectedWasId =
      getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary)[0] ||
      summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) ||
      "";

    if (primarySourceKey && primarySourceKey !== expectedKey) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "source_key_mismatch",
        recommendedAction: "safe_auto_fix_later",
      });
      continue;
    }

    if (primaryPoints !== totalXp) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "xp_points_mismatch",
        recommendedAction: "needs_manual_review",
      });
      continue;
    }

    if (awardStatus !== CONFIG.values.awardAwarded) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "award_status_gap",
        recommendedAction: "safe_auto_fix_later",
      });
      continue;
    }

    if (expectedWasId && !primaryWasId) {
      pushIssue({
        homeworkId,
        enrollmentId,
        classification: "issue",
        issue: "missing_weekly_summary_on_xp",
        recommendedAction: "safe_auto_fix_later",
      });
      continue;
    }

    bump("clean");
  }

  const orphanHomeworkXp = [];
  for (const xp of xpQuery.records) {
    const enrollmentId = getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.enrollment)[0] || "";
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) continue;
    const sk = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sk.startsWith(CONFIG.values.sourceKeyPrefix) && !sk.startsWith(CONFIG.values.legacySourceKeyPrefix)) continue;
    const hwIds = getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.homeworkCompletion);
    if (!hwIds.length && orphanHomeworkXp.length < SAMPLE_LIMIT) {
      orphanHomeworkXp.push({ xpEventId: xp.id, sourceKey: sk, enrollmentId });
      bump("orphan_homework_xp");
    }
  }

  const issueTotal = Object.entries(issueCounts)
    .filter(([k]) => k !== "clean" && k !== "excluded_not_ready")
    .reduce((sum, [, v]) => sum + v, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments only",
    activeEnrollmentCount: activeEnrollmentIds.size,
    homeworkChecked: scopedChecked,
    hw17Checked,
    excludedNotReady: issueCounts.excluded_not_ready || 0,
    cleanCount: issueCounts.clean || 0,
    issueTotal,
    issueCounts,
    issuesSample: issues,
    orphanHomeworkXpSample: orphanHomeworkXp,
    recommendedFollowUp: [
      "backfill-homework-xp-from-reviewed.js",
      "dedupe-homework-xp-events.js",
      "audit-homework17-reflection-quiz-pipeline.js",
    ],
  };

  console.log("===== FINAL 090B — HOMEWORK XP =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
