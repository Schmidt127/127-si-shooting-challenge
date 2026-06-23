/*
Extension Script: Backfill Submission XP Events (Automation 010 logic)
System: 127 SI Shooting Challenge
Purpose:
  Creates or repairs Submission Base XP Events for counted Submissions that
  are missing SUBMISSION_XP|{submissionId} or have a legacy Source Key mismatch.
  Use when Automation 010 trigger view is empty and historical rows need XP.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply creates/updates
  - BATCH_LIMIT caps writes per run (default 50); re-run until remainingCount is 0
  - Skips submissions that fail 010 business rules (not counted, zero shots, etc.)
  - Does not create duplicate XP when a linked daily-shooting event already exists

Setup:
  1. Run audit-submission-pipeline-integrity.js or audit-xp-vs-submissions.js
  2. Run this script with DRY_RUN = true; review candidateCount and sample
  3. Set CONFIRM_WRITE = true and re-run until remainingCount is 0
  4. Re-run audit to confirm missing_submission_xp_event is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 50;

const CONFIG = {
  tables: {
    submissions: "Submissions",
    xpEvents: "XP Events",
    xpRules: "XP Reward Rules",
    enrollments: "Enrollments",
    weeklySummary: "Weekly Athlete Summary",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    submissionKey: "Submission Key",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  enrollments: {
    runShotMilestoneCheck: "Run Shot Milestone Check?",
  },

  xpRules: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
  },

  xpEvents: {
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    xpPoints: "XP Points",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    active: "Active?",
    sourceKey: "Source Key",
    xpDedupeKey: "XP Dedupe Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
    xpDateFieldCandidates: ["XP Source Date", "XP Activity Date"],
    xpDateSourceFieldCandidates: ["XP Date Source", "XP Activity Date Source"],
  },

  values: {
    ruleKeyDailyShootingBase: "SHOOTING_BASE",
    xpSourceSubmissionBase: "Submission Base",
    xpBucketShootingBase: "Shooting Base",
    xpDateSourceSubmissionActivity: "Submission Activity Date",
    publicReason: "Shooting submission completed.",
    sourceKeyPrefix: "SUBMISSION_XP|",
    statusAwarded: "Awarded",
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

function getRaw(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getBooleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw === null || raw === undefined) return false;
  const text = String(record.getCellValueAsString(fieldName) || "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
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

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function linkedCell(ids) {
  return uniqueIds(ids).map(id => ({ id }));
}

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  if (field.type === "multipleSelects") return [{ name: value }];
  return value;
}

function getFirstWritableFieldName(table, fieldNames) {
  for (const fieldName of fieldNames) {
    if (fieldExists(table, fieldName) && isWritableField(table, fieldName)) {
      return fieldName;
    }
  }
  return "";
}

function buildSubmissionSourceKey(submissionId) {
  return `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
}

function normalizeKeyPart(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSubmissionDedupeKey({ enrollmentId, submissionId, xpSource }) {
  if (!enrollmentId || !submissionId || !xpSource) return "";
  return [enrollmentId, submissionId, xpSource].join("|");
}

function buildSubmissionNormalizedDedupeKey({ enrollmentId, submissionId, xpSource }) {
  if (!enrollmentId || !submissionId || !xpSource) return "";
  return [normalizeKeyPart(enrollmentId), normalizeKeyPart(submissionId), normalizeKeyPart(xpSource)].join("|");
}

function buildDebugReason({ xpPoints, submissionId, submissionKey }) {
  return [
    `Daily shooting submission XP awarded from XP Reward Rule: ${CONFIG.values.ruleKeyDailyShootingBase}.`,
    `XP Source: ${CONFIG.values.xpSourceSubmissionBase}.`,
    `XP Bucket: ${CONFIG.values.xpBucketShootingBase}.`,
    `XP Points: ${xpPoints}.`,
    `XP Date Source: ${CONFIG.values.xpDateSourceSubmissionActivity}.`,
    `Submission Record ID: ${submissionId}.`,
    submissionKey ? `Submission Key: ${submissionKey}.` : "",
    "Backfill: backfill-submission-xp-events.js",
  ].filter(Boolean).join(" ");
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function findExistingXpEvent({
  submissionId,
  submissionKey,
  enrollmentId,
  existingXpEventIds,
  xpEvents,
  xpEventsTable,
}) {
  const sourceKey = buildSubmissionSourceKey(submissionId);
  const legacySourceKey = submissionKey;
  const dedupeKey = buildSubmissionDedupeKey({
    enrollmentId,
    submissionId,
    xpSource: CONFIG.values.xpSourceSubmissionBase,
  });
  const normalizedDedupeKey = buildSubmissionNormalizedDedupeKey({
    enrollmentId,
    submissionId,
    xpSource: CONFIG.values.xpSourceSubmissionBase,
  });
  const existingSet = new Set(existingXpEventIds);

  const candidates = xpEvents.filter(event => {
    const eventXpSource = getText(event, xpEventsTable, CONFIG.xpEvents.xpSource);
    const eventXpBucket = getText(event, xpEventsTable, CONFIG.xpEvents.xpBucket);
    const eventSourceKey = getText(event, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const eventSubmissionIds = getLinkedIds(event, xpEventsTable, CONFIG.xpEvents.submission);

    const isDailyShooting =
      eventXpSource === CONFIG.values.xpSourceSubmissionBase ||
      eventXpBucket === CONFIG.values.xpBucketShootingBase ||
      eventSourceKey.startsWith(CONFIG.values.sourceKeyPrefix);

    if (!isDailyShooting) return false;

    const sourceKeyMatches =
      eventSourceKey === sourceKey ||
      (legacySourceKey && eventSourceKey === legacySourceKey);

    const submissionLinkMatches = eventSubmissionIds.includes(submissionId);
    const directLinked = existingSet.has(event.id);

    const eventDedupeKey = fieldExists(xpEventsTable, CONFIG.xpEvents.xpDedupeKey)
      ? getText(event, xpEventsTable, CONFIG.xpEvents.xpDedupeKey)
      : "";
    const eventNormalizedDedupeKey = fieldExists(xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized)
      ? getText(event, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized)
      : "";

    return (
      sourceKeyMatches ||
      submissionLinkMatches ||
      directLinked ||
      (dedupeKey && eventDedupeKey === dedupeKey) ||
      (normalizedDedupeKey && eventNormalizedDedupeKey === normalizedDedupeKey)
    );
  });

  return { sourceKey, candidates };
}

function validateSubmissionForXp(submission, submissionsTable) {
  const submissionId = submission.id;
  const enrollmentId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.enrollment);
  const weekId = getFirstLinkedId(submission, submissionsTable, CONFIG.submissions.week);
  const submissionKey = getText(submission, submissionsTable, CONFIG.submissions.submissionKey);
  const activityDate = getRaw(submission, submissionsTable, CONFIG.submissions.activityDate);
  const totalShotsCounted = getNumber(submission, submissionsTable, CONFIG.submissions.totalShotsCounted);
  const countThisSubmission = getBooleanish(submission, submissionsTable, CONFIG.submissions.countThisSubmission);

  if (!countThisSubmission) {
    return { ok: false, reason: "skipped_not_counted" };
  }
  if (totalShotsCounted === null || totalShotsCounted <= 0) {
    return { ok: false, reason: "skipped_zero_shots" };
  }
  if (!enrollmentId) return { ok: false, reason: "skipped_missing_enrollment" };
  if (!weekId) return { ok: false, reason: "skipped_missing_week" };
  if (!submissionKey) return { ok: false, reason: "skipped_missing_submission_key" };
  if (!activityDate) return { ok: false, reason: "skipped_missing_activity_date" };

  return {
    ok: true,
    enrollmentId,
    weekId,
    submissionKey,
    activityDate,
    totalShotsCounted,
    existingXpEventIds: getLinkedIds(submission, submissionsTable, CONFIG.submissions.xpEvents),
    submissionWeeklySummaryIds: fieldExists(submissionsTable, CONFIG.submissions.weeklySummary)
      ? getLinkedIds(submission, submissionsTable, CONFIG.submissions.weeklySummary)
      : [],
  };
}

async function main() {
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const xpRulesTable = base.getTable(CONFIG.tables.xpRules);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const writableXpDateField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpDateFieldCandidates
  );
  const writableXpDateSourceField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpDateSourceFieldCandidates
  );

  const submissionFields = [
    CONFIG.submissions.enrollment,
    CONFIG.submissions.week,
    CONFIG.submissions.weeklySummary,
    CONFIG.submissions.submissionKey,
    CONFIG.submissions.activityDate,
    CONFIG.submissions.totalShotsCounted,
    CONFIG.submissions.countThisSubmission,
    CONFIG.submissions.xpAwardStatus,
    CONFIG.submissions.xpEvents,
  ].filter(name => fieldExists(submissionsTable, name));

  const xpEventFields = [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.submission,
    CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary,
    CONFIG.xpEvents.xpSource,
    CONFIG.xpEvents.xpBucket,
    CONFIG.xpEvents.xpPoints,
    CONFIG.xpEvents.xpReasonPublic,
    CONFIG.xpEvents.xpReasonDebug,
    CONFIG.xpEvents.active,
    CONFIG.xpEvents.sourceKey,
    CONFIG.xpEvents.xpDedupeKey,
    CONFIG.xpEvents.xpDedupeKeyNormalized,
    ...CONFIG.xpEvents.xpDateFieldCandidates,
    ...CONFIG.xpEvents.xpDateSourceFieldCandidates,
  ].filter(name => fieldExists(xpEventsTable, name));

  const xpRuleFields = Object.values(CONFIG.xpRules).filter(name =>
    fieldExists(xpRulesTable, name)
  );

  const summaryFields = Object.values(CONFIG.weeklySummary).filter(name =>
    fieldExists(weeklySummaryTable, name)
  );

  const [submissionQuery, xpQuery, xpRuleQuery, summaryQuery] = await Promise.all([
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpEventFields }),
    xpRulesTable.selectRecordsAsync({ fields: xpRuleFields }),
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

  const xpByCanonicalKey = new Map();
  for (const xp of xpQuery.records) {
    const key = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (key) xpByCanonicalKey.set(key, xp.id);
  }

  const matchingRules = xpRuleQuery.records.filter(rule => {
    return (
      getText(rule, xpRulesTable, CONFIG.xpRules.ruleKey) === CONFIG.values.ruleKeyDailyShootingBase &&
      getBooleanish(rule, xpRulesTable, CONFIG.xpRules.active)
    );
  });

  if (matchingRules.length !== 1) {
    throw new Error(
      `Expected exactly one active SHOOTING_BASE XP Reward Rule; found ${matchingRules.length}`
    );
  }

  const xpPoints = getNumber(matchingRules[0], xpRulesTable, CONFIG.xpRules.xpAmount);
  if (xpPoints === null || xpPoints <= 0) {
    throw new Error("SHOOTING_BASE XP Amount is missing or invalid");
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  for (const submission of submissionQuery.records) {
    const submissionId = submission.id;
    const canonicalKey = buildSubmissionSourceKey(submissionId);

    const validation = validateSubmissionForXp(submission, submissionsTable);
    if (!validation.ok) {
      skipCounts[validation.reason] = (skipCounts[validation.reason] || 0) + 1;
      continue;
    }

    const { sourceKey, candidates: xpMatches } = findExistingXpEvent({
      submissionId,
      submissionKey: validation.submissionKey,
      enrollmentId: validation.enrollmentId,
      existingXpEventIds: validation.existingXpEventIds,
      xpEvents: xpQuery.records,
      xpEventsTable,
    });

    const awardStatus = getSelectNameSafe(submission, submissionsTable, CONFIG.submissions.xpAwardStatus);

    if (xpMatches.length > 1) {
      skipped.push({
        submissionId,
        name: submission.name,
        reason: "skipped_ambiguous_existing_xp",
        xpEventIds: xpMatches.map(event => event.id),
      });
      skipCounts.skipped_ambiguous_existing_xp = (skipCounts.skipped_ambiguous_existing_xp || 0) + 1;
      continue;
    }

    const matchedXp = xpMatches[0] || null;
    const matchedSourceKey = matchedXp
      ? getText(matchedXp, xpEventsTable, CONFIG.xpEvents.sourceKey)
      : "";
    const submissionLinked = validation.existingXpEventIds.length > 0;

    const fullySynced =
      matchedXp &&
      matchedSourceKey === canonicalKey &&
      awardStatus === CONFIG.values.statusAwarded &&
      submissionLinked;

    if (fullySynced) continue;

    const needsCreate = !matchedXp && !xpByCanonicalKey.has(canonicalKey);
    const needsRepair = !needsCreate;

    if (!needsCreate && !needsRepair) continue;

    const summaryMatches =
      summaryIndex.get(buildSummaryIndexKey(validation.enrollmentId, validation.weekId)) || [];

    if (summaryMatches.length > 1) {
      skipped.push({
        submissionId,
        name: submission.name,
        reason: "skipped_ambiguous_weekly_summary",
        summaryIds: summaryMatches,
      });
      skipCounts.skipped_ambiguous_weekly_summary = (skipCounts.skipped_ambiguous_weekly_summary || 0) + 1;
      continue;
    }

    const weeklySummaryId =
      validation.submissionWeeklySummaryIds[0] ||
      summaryMatches[0] ||
      "";

    candidates.push({
      submissionId,
      name: submission.name,
      action: needsCreate ? "create_xp_event" : "repair_xp_event",
      enrollmentId: validation.enrollmentId,
      weekId: validation.weekId,
      weeklySummaryId,
      xpPoints,
      existingXpEventId: matchedXp?.id || xpByCanonicalKey.get(canonicalKey) || "",
      sourceKey: canonicalKey,
      submissionKey: validation.submissionKey,
      activityDate: validation.activityDate,
      fromAwardStatus: awardStatus,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const xpEventFields = {
        [CONFIG.xpEvents.enrollment]: linkedCell([row.enrollmentId]),
        [CONFIG.xpEvents.submission]: linkedCell([row.submissionId]),
        [CONFIG.xpEvents.week]: linkedCell([row.weekId]),
        [CONFIG.xpEvents.xpSource]: buildCellValueForField(
          xpEventsTable,
          CONFIG.xpEvents.xpSource,
          CONFIG.values.xpSourceSubmissionBase
        ),
        [CONFIG.xpEvents.xpBucket]: buildCellValueForField(
          xpEventsTable,
          CONFIG.xpEvents.xpBucket,
          CONFIG.values.xpBucketShootingBase
        ),
        [CONFIG.xpEvents.xpPoints]: row.xpPoints,
        [CONFIG.xpEvents.xpReasonPublic]: CONFIG.values.publicReason,
        [CONFIG.xpEvents.xpReasonDebug]: buildDebugReason({
          xpPoints: row.xpPoints,
          submissionId: row.submissionId,
          submissionKey: row.submissionKey,
        }),
        [CONFIG.xpEvents.active]: true,
        [CONFIG.xpEvents.sourceKey]: row.sourceKey,
      };

      if (writableXpDateField) {
        xpEventFields[writableXpDateField] = row.activityDate;
      }
      if (writableXpDateSourceField) {
        xpEventFields[writableXpDateSourceField] = buildCellValueForField(
          xpEventsTable,
          writableXpDateSourceField,
          CONFIG.values.xpDateSourceSubmissionActivity
        );
      }
      if (row.weeklySummaryId && isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
        xpEventFields[CONFIG.xpEvents.weeklySummary] = linkedCell([row.weeklySummaryId]);
      }

      let xpEventId = row.existingXpEventId;

      if (!DRY_RUN && CONFIRM_WRITE) {
        if (row.action === "create_xp_event") {
          xpEventId = await xpEventsTable.createRecordAsync(xpEventFields);
        } else if (xpEventId) {
          await xpEventsTable.updateRecordAsync(xpEventId, xpEventFields);
        } else {
          xpEventId = await xpEventsTable.createRecordAsync(xpEventFields);
        }

        const submission = submissionQuery.getRecord(row.submissionId);
        const mergedXpIds = uniqueIds([
          ...getLinkedIds(submission, submissionsTable, CONFIG.submissions.xpEvents),
          xpEventId,
        ]);

        await submissionsTable.updateRecordAsync(row.submissionId, {
          [CONFIG.submissions.xpEvents]: linkedCell(mergedXpIds),
          [CONFIG.submissions.xpAwardStatus]: buildCellValueForField(
            submissionsTable,
            CONFIG.submissions.xpAwardStatus,
            CONFIG.values.statusAwarded
          ),
        });

        if (
          isWritableField(enrollmentsTable, CONFIG.enrollments.runShotMilestoneCheck)
        ) {
          await enrollmentsTable.updateRecordAsync(row.enrollmentId, {
            [CONFIG.enrollments.runShotMilestoneCheck]: true,
          });
        }
      }

      applied.push({
        ...row,
        xpEventId: xpEventId || "(planned)",
        dryRun: DRY_RUN || !CONFIRM_WRITE,
      });
    } catch (error) {
      errors.push({
        submissionId: row.submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: "backfill-submission-xp-events",
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    xpPointsFromRule: xpPoints,
    candidateCount: candidates.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    skippedCount: skipped.length,
    skipCounts,
    actionCounts: applied.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
    errors,
    skippedSample: skipped.slice(0, 10),
    sample: applied.slice(0, 15),
  };

  console.log("===== BACKFILL SUBMISSION XP EVENTS =====");
  console.log(JSON.stringify(report, null, 2));
}

function getSelectNameSafe(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

await main();
