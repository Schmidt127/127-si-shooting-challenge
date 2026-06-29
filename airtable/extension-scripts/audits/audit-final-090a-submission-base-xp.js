/*
Extension Script: Final Pre-Close 090A — Submission Base XP
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check for counted Submissions vs submission-base XP Events
  (Automation 010 logic), scoped to Active? enrollments only.

Schema gate: 20260629_045741
Default: read-only (no writes)

Run order: First in Final 090 pass (see audits/README.md).
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";

const CONFIG = {
  scriptName: "audit-final-090a-submission-base-xp",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    xpEvents: "XP Events",
  },

  enrollments: {
    active: "Active?",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
  },

  xpEvents: {
    sourceKey: "Source Key",
    submission: "Submission",
    enrollment: "Enrollment",
    week: "Week",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    active: "Active?",
  },

  values: {
    sourceKeyPrefix: "SUBMISSION_XP|",
    xpAwarded: "Awarded",
    xpSourceSubmissionBase: "Submission Base",
    xpBucketShootingBase: "Shooting Base",
  },
};

const REQUIRED_FIELDS = [
  ["Enrollments", "Active?"],
  ["Submissions", "Enrollment"],
  ["Submissions", "Count This Submission?"],
  ["Submissions", "XP Events"],
  ["Submissions", "XP Award Status"],
  ["XP Events", "Source Key"],
  ["XP Events", "Submission"],
  ["XP Events", "Enrollment"],
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
    throw new Error(
      `Schema gate failed (${SCHEMA_SNAPSHOT}). Missing: ${missing.join(", ")}`
    );
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

function isSubmissionBaseXpEvent(xpRecord, xpEventsTable, submissionId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const xpSource = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource);
  const xpBucket = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket);
  const expectedKey = `${CONFIG.values.sourceKeyPrefix}${submissionId}`;

  return (
    sourceKey === expectedKey ||
    sourceKey.startsWith(CONFIG.values.sourceKeyPrefix) ||
    xpSource === CONFIG.values.xpSourceSubmissionBase ||
    xpBucket === CONFIG.values.xpBucketShootingBase
  );
}

function actionForIssue(issue) {
  if (issue === "missing_submission_xp" || issue === "xp_award_status_not_awarded") {
    return "safe_auto_fix_later";
  }
  if (issue === "duplicate_submission_base_xp") return "needs_manual_review";
  if (issue === "legacy_source_key_or_missing_prefix") return "safe_auto_fix_later";
  return "needs_manual_review";
}

async function main() {
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  requireSchema({
    Enrollments: enrollmentsTable,
    Submissions: submissionsTable,
    "XP Events": xpEventsTable,
  });

  const activeEnrollmentIds = new Set();
  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: [CONFIG.enrollments.active],
  });
  for (const enrollment of enrollmentQuery.records) {
    if (getBooleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
      activeEnrollmentIds.add(enrollment.id);
    }
  }

  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name =>
    fieldExists(xpEventsTable, name)
  );

  const [submissionQuery, xpQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  function getSubmissionBaseXpIds(submissionId) {
    const expectedKey = `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
    const ids = new Set(xpBySourceKey.get(expectedKey) || []);

    for (const xp of xpQuery.records) {
      if (!getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.submission).includes(submissionId)) {
        continue;
      }
      if (isSubmissionBaseXpEvent(xp, xpEventsTable, submissionId)) {
        ids.add(xp.id);
      }
    }
    return [...ids];
  }

  const issues = [];
  const excluded = [];
  const clean = [];
  const issueCounts = {};

  function bump(key) {
    issueCounts[key] = (issueCounts[key] || 0) + 1;
  }

  let scopedCounted = 0;

  for (const submission of submissionQuery.records) {
    const enrollmentId = getLinkedIds(submission, submissionsTable, CONFIG.submissions.enrollment)[0] || "";
    if (!enrollmentId || !activeEnrollmentIds.has(enrollmentId)) {
      continue;
    }

    if (getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) !== 1) {
      excluded.push({
        submissionId: submission.id,
        enrollmentId,
        classification: "excluded",
        reason: "count_this_submission_not_1",
      });
      continue;
    }

    scopedCounted += 1;
    const submissionId = submission.id;
    const expectedKey = `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
    const byKey = xpBySourceKey.get(expectedKey) || [];
    const submissionBaseXpIds = getSubmissionBaseXpIds(submissionId);
    const xpAwardStatus = getSelectName(submission, submissionsTable, CONFIG.submissions.xpAwardStatus);

    const base = {
      submissionId,
      name: submission.name,
      enrollmentId,
      weekId: getLinkedIds(submission, submissionsTable, CONFIG.submissions.week)[0] || "",
      expectedSourceKey: expectedKey,
      submissionBaseXpEventIds: submissionBaseXpIds,
      xpAwardStatus,
    };

    let issueType = null;

    if (submissionBaseXpIds.length === 0) {
      issueType = "missing_submission_xp";
    } else if (submissionBaseXpIds.length > 1 || byKey.length > 1) {
      issueType = "duplicate_submission_base_xp";
    } else if (byKey.length === 0 && submissionBaseXpIds.length > 0) {
      issueType = "legacy_source_key_or_missing_prefix";
    } else if (xpAwardStatus !== CONFIG.values.xpAwarded) {
      issueType = "xp_award_status_not_awarded";
    }

    if (issueType) {
      bump(issueType);
      if (issues.length < SAMPLE_LIMIT) {
        issues.push({
          ...base,
          classification: "issue",
          issue: issueType,
          recommendedAction: actionForIssue(issueType),
        });
      }
    } else {
      bump("clean");
      if (clean.length < 5) clean.push({ submissionId, enrollmentId });
    }
  }

  const issueTotal = Object.entries(issueCounts)
    .filter(([k]) => k !== "clean")
    .reduce((sum, [, v]) => sum + v, 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    scope: "Active? enrollments only",
    activeEnrollmentCount: activeEnrollmentIds.size,
    countedSubmissionsChecked: scopedCounted,
    excludedCount: excluded.length,
    cleanCount: issueCounts.clean || 0,
    issueTotal,
    issueCounts,
    issuesSample: issues,
    cleanSample: clean,
    recommendedFollowUp: [
      "backfill-submission-xp-events.js (DRY_RUN first)",
      "Re-trigger 010 on stuck submissions",
    ],
  };

  console.log("===== FINAL 090A — SUBMISSION BASE XP =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
