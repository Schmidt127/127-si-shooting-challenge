/*
Extension Script: Backfill Homework Completion WAS Links
System: 127 SI Shooting Challenge
Purpose:
  Links Homework Completions to Weekly Athlete Summary when missing, using the
  same resolution order as Automation 020:
  1. Submission.Weekly Athlete Summary (when Submissions - Linked is set)
  2. Enrollment + Week on the homework row → canonical WAS lookup

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE must be true to write
  - BATCH_LIMIT caps planned fixes per run (default 50)
  - Skips ambiguous enrollment+week matches (multiple WAS rows)

Setup:
  1. Run audit-field-coverage-report.js (Weekly Athlete Summary Link gaps)
  2. Dry run this script; review plannedCount and sample
  3. CONFIRM_WRITE = true; re-run until remainingCount is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;

const CONFIG = {
  tables: {
    submissions: "Submissions",
    homework: "Homework Completions",
    weeklySummary: "Weekly Athlete Summary",
  },

  submissions: {
    weeklySummary: "Weekly Athlete Summary",
  },

  homework: {
    enrollment: "Enrollment",
    week: "Week",
    submission: "Submissions - Linked",
    weeklySummaryLink: "Weekly Athlete Summary Link",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
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

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
  } catch {
    return false;
  }
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

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function resolveWeeklySummaryId({
  homeworkRecord,
  homeworkTable,
  submissionsTable,
  submissionQuery,
  summaryIndex,
}) {
  const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
  if (submissionId) {
    const submission = submissionQuery.getRecord(submissionId);
    if (submission) {
      const fromSubmission = getFirstLinkedId(
        submission,
        submissionsTable,
        CONFIG.submissions.weeklySummary
      );
      if (fromSubmission) {
        return { weeklySummaryId: fromSubmission, source: "submission_weekly_summary" };
      }
    }
  }

  const enrollmentId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.enrollment);
  const weekId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.week);
  if (!enrollmentId || !weekId) {
    return { weeklySummaryId: "", source: "missing_enrollment_or_week" };
  }

  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) {
    return { weeklySummaryId: matches[0], source: "enrollment_week_lookup" };
  }
  if (matches.length > 1) {
    return { weeklySummaryId: "", source: "ambiguous_weekly_summary", summaryIds: matches };
  }

  return { weeklySummaryId: "", source: "missing_weekly_summary_record" };
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  if (!isWritableField(homeworkTable, CONFIG.homework.weeklySummaryLink)) {
    throw new Error(
      `Field is not writable: ${CONFIG.tables.homework}.${CONFIG.homework.weeklySummaryLink}`
    );
  }

  const submissionFields = [CONFIG.submissions.weeklySummary].filter(name =>
    fieldExists(submissionsTable, name)
  );
  const homeworkFields = Object.values(CONFIG.homework).filter(name =>
    fieldExists(homeworkTable, name)
  );
  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [submissionQuery, homeworkQuery, summaryQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    weeklySummaryTable.selectRecordsAsync({ fields: summaryFields }),
  ]);

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment);
    const weekId = getFirstLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week);
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const planned = [];
  const skipCounts = {};
  const skipped = [];

  function skip(reason, row) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
    skipped.push({ reason, ...row });
  }

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    const currentWasId = getFirstLinkedId(
      homeworkRecord,
      homeworkTable,
      CONFIG.homework.weeklySummaryLink
    );
    if (currentWasId) continue;

    const resolved = resolveWeeklySummaryId({
      homeworkRecord,
      homeworkTable,
      submissionsTable,
      submissionQuery,
      summaryIndex,
    });

    if (!resolved.weeklySummaryId) {
      skip(resolved.source, {
        homeworkId,
        name: homeworkRecord.name,
        submissionId: getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission),
        summaryIds: resolved.summaryIds || [],
      });
      continue;
    }

    planned.push({
      action: "link_homework_weekly_summary",
      homeworkId,
      name: homeworkRecord.name,
      submissionId: getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission),
      toWeeklySummaryId: resolved.weeklySummaryId,
      source: resolved.source,
    });
  }

  const batch = planned.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      if (!DRY_RUN && CONFIRM_WRITE) {
        await homeworkTable.updateRecordAsync(row.homeworkId, {
          [CONFIG.homework.weeklySummaryLink]: linkedCell([row.toWeeklySummaryId]),
        });
      }
      applied.push(row);
    } catch (error) {
      errors.push({
        homeworkId: row.homeworkId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: "backfill-homework-completion-was-links",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    plannedCount: planned.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, planned.length - batch.length),
    skipCounts,
    actionCounts: applied.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
    sourceCounts: applied.reduce((acc, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {}),
    errors,
    skippedSample: skipped.slice(0, 15),
    sample: applied.slice(0, 20),
  };

  console.log("===== BACKFILL HOMEWORK COMPLETION WAS LINKS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
