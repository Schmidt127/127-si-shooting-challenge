/*
Extension Script: Audit XP vs Submissions
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check between counted Submissions and submission-base XP Events.
  Detects missing XP, duplicate XP, Source Key drift, and XP Award Status gaps.

Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  tables: {
    submissions: "Submissions",
    xpEvents: "XP Events",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    activityDate: "Activity Date",
  },

  xpEvents: {
    sourceKey: "Source Key",
    submission: "Submission",
    enrollment: "Enrollment",
    week: "Week",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    active: "Active?",
  },

  values: {
    sourceKeyPrefix: "SUBMISSION_XP|",
    xpAwarded: "Awarded",
    xpSourceSubmissionBase: "Submission Base",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
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

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

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
  const xpBySubmissionId = new Map();

  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (sourceKey) {
      if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
      xpBySourceKey.get(sourceKey).push(xp.id);
    }

    for (const submissionId of getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.submission)) {
      if (!xpBySubmissionId.has(submissionId)) xpBySubmissionId.set(submissionId, []);
      xpBySubmissionId.get(submissionId).push(xp.id);
    }
  }

  const missingXp = [];
  const duplicateXp = [];
  const sourceKeyMismatch = [];
  const awardStatusGap = [];
  const okCount = [];

  for (const submission of submissionQuery.records) {
    if (getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) !== 1) {
      continue;
    }

    const submissionId = submission.id;
    const expectedKey = `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
    const byKey = xpBySourceKey.get(expectedKey) || [];
    const byLink = xpBySubmissionId.get(submissionId) || [];
    const linkedXpIds = getLinkedIds(submission, submissionsTable, CONFIG.submissions.xpEvents);
    const xpAwardStatus = getSelectName(submission, submissionsTable, CONFIG.submissions.xpAwardStatus);

    const allXpIds = [...new Set([...byKey, ...byLink, ...linkedXpIds])];

    const base = {
      submissionId,
      name: submission.name,
      enrollmentId: getLinkedIds(submission, submissionsTable, CONFIG.submissions.enrollment)[0] || "",
      weekId: getLinkedIds(submission, submissionsTable, CONFIG.submissions.week)[0] || "",
      expectedSourceKey: expectedKey,
      xpEventIds: allXpIds,
      xpAwardStatus,
    };

    if (allXpIds.length === 0) {
      missingXp.push({
        ...base,
        issue: "missing_submission_xp",
        recommendedAction: "Re-run 010 or backfill-submission-xp-events (planned)",
      });
      continue;
    }

    if (allXpIds.length > 1 || byKey.length > 1 || byLink.length > 1) {
      duplicateXp.push({
        ...base,
        issue: "duplicate_submission_xp",
        byKeyCount: byKey.length,
        byLinkCount: byLink.length,
        recommendedAction: "Manual dedupe: keep one XP Event with canonical Source Key",
      });
    }

    if (byKey.length === 0 && allXpIds.length > 0) {
      sourceKeyMismatch.push({
        ...base,
        issue: "legacy_source_key_or_missing_prefix",
        recommendedAction: "Review XP Event Source Key; align to SUBMISSION_XP|{submissionId}",
      });
    }

    if (xpAwardStatus !== CONFIG.values.xpAwarded) {
      awardStatusGap.push({
        ...base,
        issue: "xp_award_status_not_awarded",
        recommendedAction: "Re-run 010 repair or backfill-submission-pipeline-links",
      });
    }

    if (
      allXpIds.length === 1 &&
      byKey.length === 1 &&
      xpAwardStatus === CONFIG.values.xpAwarded
    ) {
      okCount.push(submissionId);
    }
  }

  const report = {
    script: "audit-xp-vs-submissions",
    dryRun: true,
    countedSubmissionsChecked: submissionQuery.records.filter(
      s => getNumberish(s, submissionsTable, CONFIG.submissions.countThisSubmission) === 1
    ).length,
    okCount: okCount.length,
    missingXpCount: missingXp.length,
    duplicateXpCount: duplicateXp.length,
    sourceKeyMismatchCount: sourceKeyMismatch.length,
    awardStatusGapCount: awardStatusGap.length,
    missingXpSample: missingXp.slice(0, SAMPLE_LIMIT),
    duplicateXpSample: duplicateXp.slice(0, SAMPLE_LIMIT),
    sourceKeyMismatchSample: sourceKeyMismatch.slice(0, SAMPLE_LIMIT),
    awardStatusGapSample: awardStatusGap.slice(0, SAMPLE_LIMIT),
  };

  console.log("===== XP VS SUBMISSIONS AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
