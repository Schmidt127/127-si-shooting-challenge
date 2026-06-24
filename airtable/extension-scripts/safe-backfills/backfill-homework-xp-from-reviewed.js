/*
Extension Script: Backfill Homework XP From Reviewed Completions (Automation 065 logic)
System: 127 SI Shooting Challenge
Purpose:
  Creates or repairs Homework XP Events for reviewed Homework Completions that
  are missing HOMEWORK_XP|{homeworkId}, or need Award Status / WAS link repair.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply creates/updates
  - BATCH_LIMIT caps writes per run (default 25); re-run until remainingCount is 0
  - Skips rows that fail 065 business rules (no review, zero XP, coach-accepted-only, etc.)

Setup:
  1. Run audit-homework-pipeline-integrity.js
  2. Run this script with DRY_RUN = true; review candidateCount and sample
  3. Set CONFIRM_WRITE = true and re-run until remainingCount is 0
  4. Re-run audit to confirm missing_xp_event is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const DEBUG_HOMEWORK_ID = "";

const CONFIG = {
  scriptName: "backfill-homework-xp-from-reviewed",
  version: "v1.3",

  tables: {
    homework: "Homework Completions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary Link",
    submission: "Submissions - Linked",
    satisfactory: "Satisfactory?",
    reviewComplete: "Review Complete",
    coachFeedback: "Coach Feedback",
    baseXp: "Base XP Awarded",
    extraXp: "Extra Credit XP Awarded",
    totalXp: "Total Homework XP Awarded",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    completionKey: "Homework Completion Key",
    submissionDate: "Submission Date",
    submissionDateDateOnly: "Submission Date - Date Only",
    automationError: "Automation Error",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    xpPoints: "XP Points",
    sourceKey: "Source Key",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    awardedAt: "Awarded At",
    active: "Active?",
    processed: "Processed",
    xpActivityDateCandidates: ["XP Activity Date", "XP Source Date"],
    xpActivityDateSourceCandidates: ["XP Activity Date Source", "XP Date Source"],
  },

  values: {
    sourceKeyPrefix: "HOMEWORK_XP|",
    legacySourceKeyPrefix: "HOMEWORK_COMPLETION|",
    awardPending: "Pending",
    awardAwarded: "Awarded",
    xpBucketHomework: "Homework Completion",
    xpSourceHomework: "Homework Completion",
    xpActivityDateSource: "Homework Submission Activity Date",
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
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (first instanceof Date && !isNaN(first)) return first;
      if (typeof first === "string") {
        const parsed = new Date(first);
        if (!isNaN(parsed)) return parsed;
      }
    }
  }
  return null;
}

function linkedCell(ids) {
  return ids.filter(Boolean).map(id => ({ id }));
}

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  if (field.type === "multipleSelects") return [{ name: value }];
  return value;
}

function getFirstWritableFieldName(table, candidates) {
  for (const fieldName of candidates) {
    if (isWritableField(table, fieldName)) return fieldName;
  }
  return "";
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function buildSourceKey(homeworkId) {
  return `${CONFIG.values.sourceKeyPrefix}${homeworkId}`;
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function resolveWeeklySummaryId({
  sourceWeeklySummaryIds = [],
  enrollmentId = "",
  weekId = "",
  summaryIndex = new Map(),
}) {
  const fromSource = uniqueIds(sourceWeeklySummaryIds);
  if (fromSource.length === 1) return fromSource[0];
  if (fromSource.length > 1) {
    throw new Error(`Multiple Weekly Athlete Summary links: ${fromSource.join(", ")}`);
  }

  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length > 1) {
    throw new Error(
      `Multiple Weekly Athlete Summary records for Enrollment ${enrollmentId} + Week ${weekId}: ${matches.join(", ")}`
    );
  }
  return matches[0] || "";
}

function validateHomeworkFor065(homeworkRecord, homeworkTable) {
  const missing = [];
  const enrollmentId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.enrollment)[0] || "";
  const homeworkLinkId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.homework)[0] || "";
  const weekId = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.week)[0] || "";
  const completionKey = getText(homeworkRecord, homeworkTable, CONFIG.homework.completionKey);
  const coachFeedback = getText(homeworkRecord, homeworkTable, CONFIG.homework.coachFeedback);
  const satisfactory = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.satisfactory);
  const reviewComplete = getBooleanish(homeworkRecord, homeworkTable, CONFIG.homework.reviewComplete);
  const baseXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp);
  const extraXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.extraXp);
  const totalXp = getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp);
  const activityDate = getDateValue(homeworkRecord, homeworkTable, [
    CONFIG.homework.submissionDateDateOnly,
    CONFIG.homework.submissionDate,
  ]);
  const awardStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus);

  if (!enrollmentId) missing.push("enrollment");
  if (!homeworkLinkId) missing.push("homework");
  if (!weekId) missing.push("week");
  if (!completionKey) missing.push("completion_key");
  if (!coachFeedback) missing.push("coach_feedback");
  if (!satisfactory) missing.push("satisfactory");
  if (!reviewComplete) missing.push("review_complete");
  if (baseXp <= 0) missing.push("base_xp");
  if (totalXp <= 0) missing.push("total_xp");
  if (!activityDate) missing.push("submission_date");

  return {
    ok: missing.length === 0,
    missing,
    enrollmentId,
    homeworkLinkId,
    weekId,
    completionKey,
    coachFeedback,
    baseXp,
    extraXp,
    totalXp,
    activityDate,
    awardStatus,
    weeklySummaryIds: getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.weeklySummary),
    submissionIds: getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submission),
    linkedXpIds: getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents),
  };
}

function findXpMatches(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();

  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (!xp) continue;
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    const linkedHomework = getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.homeworkCompletion);
    if (
      sourceKey === buildSourceKey(homeworkId) ||
      sourceKey === `${CONFIG.values.legacySourceKeyPrefix}${homeworkId}` ||
      linkedHomework.includes(homeworkId)
    ) {
      ids.add(xpId);
    }
  }

  for (const sourceKey of [
    buildSourceKey(homeworkId),
    `${CONFIG.values.legacySourceKeyPrefix}${homeworkId}`,
  ]) {
    for (const xpId of xpBySourceKey.get(sourceKey) || []) {
      ids.add(xpId);
    }
  }

  return [...ids];
}

async function main() {
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

  const writableXpDateField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpActivityDateCandidates
  );
  const writableXpDateSourceField = getFirstWritableFieldName(
    xpEventsTable,
    CONFIG.xpEvents.xpActivityDateSourceCandidates
  );

  if (!writableXpDateField) {
    throw new Error("Missing writable XP activity date field");
  }
  if (!writableXpDateSourceField) {
    throw new Error("Missing writable XP activity date source field");
  }

  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [homeworkQuery, xpQuery, summaryQuery] = await Promise.all([
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    xpEventsTable.selectRecordsAsync({ fields: xpFields }),
    weeklySummaryTable.selectRecordsAsync({
      fields: Object.values(CONFIG.weeklySummary).filter(name => fieldExists(weeklySummaryTable, name)),
    }),
  ]);

  const xpBySourceKey = new Map();
  for (const xp of xpQuery.records) {
    const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (!sourceKey) continue;
    if (!xpBySourceKey.has(sourceKey)) xpBySourceKey.set(sourceKey, []);
    xpBySourceKey.get(sourceKey).push(xp.id);
  }

  const summaryIndex = new Map();
  for (const summary of summaryQuery.records) {
    const enrollmentId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment)[0] || "";
    const weekId = getLinkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.week)[0] || "";
    if (!enrollmentId || !weekId) continue;
    const key = buildSummaryIndexKey(enrollmentId, weekId);
    if (!summaryIndex.has(key)) summaryIndex.set(key, []);
    summaryIndex.get(key).push(summary.id);
  }

  const candidates = [];
  const skipped = [];
  const skipCounts = {};

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    const validation = validateHomeworkFor065(homeworkRecord, homeworkTable);

    if (!validation.ok) {
      const reason = "skipped_not_reviewed";
      skipCounts[reason] = (skipCounts[reason] || 0) + 1;
      if (DEBUG_HOMEWORK_ID && homeworkId === DEBUG_HOMEWORK_ID) {
        skipped.push({ homeworkId, name: homeworkRecord.name, reason, missing: validation.missing });
      }
      continue;
    }

    const xpIds = findXpMatches(
      homeworkId,
      validation.linkedXpIds,
      xpQuery,
      xpEventsTable,
      xpBySourceKey
    );

    if (xpIds.length > 1) {
      skipCounts.skipped_duplicate_xp = (skipCounts.skipped_duplicate_xp || 0) + 1;
      skipped.push({
        homeworkId,
        name: homeworkRecord.name,
        reason: "skipped_duplicate_xp",
        xpEventIds: xpIds,
        recommendedAction: "Run dedupe-homework-xp-events.js first",
      });
      continue;
    }

    let weeklySummaryId = "";
    try {
      weeklySummaryId = resolveWeeklySummaryId({
        sourceWeeklySummaryIds: validation.weeklySummaryIds,
        enrollmentId: validation.enrollmentId,
        weekId: validation.weekId,
        summaryIndex,
      });
    } catch (error) {
      const reason = "skipped_ambiguous_weekly_summary";
      skipCounts[reason] = (skipCounts[reason] || 0) + 1;
      skipped.push({
        homeworkId,
        name: homeworkRecord.name,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const sourceKey = buildSourceKey(homeworkId);
    const existingXpId = xpIds[0] || "";
    const existingXp = existingXpId ? xpQuery.getRecord(existingXpId) : null;
    const existingSourceKey = existingXp
      ? getText(existingXp, xpEventsTable, CONFIG.xpEvents.sourceKey)
      : "";
    const existingWasId = existingXp
      ? getLinkedIds(existingXp, xpEventsTable, CONFIG.xpEvents.weeklySummary)[0] || ""
      : "";

    const existingPoints = existingXp
      ? getNumberish(existingXp, xpEventsTable, CONFIG.xpEvents.xpPoints)
      : 0;

    const fullySynced =
      existingXp &&
      existingSourceKey === sourceKey &&
      existingPoints === validation.totalXp &&
      validation.awardStatus === CONFIG.values.awardAwarded &&
      validation.linkedXpIds.includes(existingXpId) &&
      (!weeklySummaryId || existingWasId === weeklySummaryId);

    if (fullySynced) {
      skipCounts.skipped_already_synced = (skipCounts.skipped_already_synced || 0) + 1;
      continue;
    }

    let action = "";

    if (!existingXp) {
      if (validation.awardStatus !== CONFIG.values.awardPending) {
        skipCounts.skipped_award_status_not_pending = (skipCounts.skipped_award_status_not_pending || 0) + 1;
        if (DEBUG_HOMEWORK_ID && homeworkId === DEBUG_HOMEWORK_ID) {
          skipped.push({
            homeworkId,
            name: homeworkRecord.name,
            reason: "skipped_award_status_not_pending",
            awardStatus: validation.awardStatus,
          });
        }
        continue;
      }
      action = "create_xp_event";
    } else if (validation.linkedXpIds.length === 0) {
      action = "link_existing_xp_by_source_key";
    } else if (validation.awardStatus !== CONFIG.values.awardAwarded) {
      action = "mark_awarded_existing_link";
    } else if (weeklySummaryId && !existingWasId) {
      action = "repair_weekly_summary_link";
    } else if (existingXp && existingPoints !== validation.totalXp) {
      action = "repair_xp_points";
    } else if (existingSourceKey !== sourceKey) {
      action = "repair_source_key";
    } else {
      skipCounts.skipped_no_action = (skipCounts.skipped_no_action || 0) + 1;
      continue;
    }

    candidates.push({
      homeworkId,
      name: homeworkRecord.name,
      action,
      sourceKey,
      enrollmentId: validation.enrollmentId,
      weekId: validation.weekId,
      submissionId: validation.submissionIds[0] || "",
      weeklySummaryId,
      existingXpEventId: existingXpId,
      totalXp: validation.totalXp,
      baseXp: validation.baseXp,
      extraXp: validation.extraXp,
      completionKey: validation.completionKey,
      activityDate: validation.activityDate,
      fromAwardStatus: validation.awardStatus,
      homeworkName: getText(homeworkRecord, homeworkTable, CONFIG.homework.homework) || homeworkRecord.name,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const publicReason = `Homework completed: ${row.homeworkName}`;
      const debugReason = [
        `Homework XP backfill from Homework Completion ${row.homeworkId}.`,
        `Action: ${row.action}`,
        `Base XP: ${row.baseXp}`,
        `Extra Credit XP: ${row.extraXp}`,
        `Total XP: ${row.totalXp}`,
        `Homework Completion Key: ${row.completionKey}`,
        `Source Key: ${row.sourceKey}`,
      ].join("\n");

      let xpEventId = row.existingXpEventId;

      if (row.action === "create_xp_event") {
        const createFields = {
          [CONFIG.xpEvents.enrollment]: linkedCell([row.enrollmentId]),
          [CONFIG.xpEvents.week]: linkedCell([row.weekId]),
          [CONFIG.xpEvents.homeworkCompletion]: linkedCell([row.homeworkId]),
          [CONFIG.xpEvents.xpBucket]: buildCellValueForField(
            xpEventsTable,
            CONFIG.xpEvents.xpBucket,
            CONFIG.values.xpBucketHomework
          ),
          [CONFIG.xpEvents.xpSource]: buildCellValueForField(
            xpEventsTable,
            CONFIG.xpEvents.xpSource,
            CONFIG.values.xpSourceHomework
          ),
          [CONFIG.xpEvents.xpPoints]: row.totalXp,
          [CONFIG.xpEvents.sourceKey]: row.sourceKey,
          [writableXpDateField]: row.activityDate,
          [writableXpDateSourceField]: buildCellValueForField(
            xpEventsTable,
            writableXpDateSourceField,
            CONFIG.values.xpActivityDateSource
          ),
        };

        if (row.weeklySummaryId && isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)) {
          createFields[CONFIG.xpEvents.weeklySummary] = linkedCell([row.weeklySummaryId]);
        }
        if (
          row.submissionId &&
          fieldExists(xpEventsTable, CONFIG.xpEvents.submission) &&
          isWritableField(xpEventsTable, CONFIG.xpEvents.submission)
        ) {
          createFields[CONFIG.xpEvents.submission] = linkedCell([row.submissionId]);
        }
        if (isWritableField(xpEventsTable, CONFIG.xpEvents.reasonPublic)) {
          createFields[CONFIG.xpEvents.reasonPublic] = publicReason;
        }
        if (isWritableField(xpEventsTable, CONFIG.xpEvents.reasonDebug)) {
          createFields[CONFIG.xpEvents.reasonDebug] = debugReason;
        }
        if (isWritableField(xpEventsTable, CONFIG.xpEvents.awardedAt)) {
          createFields[CONFIG.xpEvents.awardedAt] = new Date();
        }
        if (isWritableField(xpEventsTable, CONFIG.xpEvents.active)) {
          createFields[CONFIG.xpEvents.active] = true;
        }
        if (isWritableField(xpEventsTable, CONFIG.xpEvents.processed)) {
          createFields[CONFIG.xpEvents.processed] = true;
        }

        if (!DRY_RUN && CONFIRM_WRITE) {
          xpEventId = await xpEventsTable.createRecordAsync(createFields);
          if (
            row.weeklySummaryId &&
            isWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary)
          ) {
            await xpEventsTable.updateRecordAsync(xpEventId, {
              [CONFIG.xpEvents.weeklySummary]: linkedCell([row.weeklySummaryId]),
            });
          }
        }
      } else if (xpEventId) {
        const updateFields = {};
        if (row.action === "repair_weekly_summary_link" && row.weeklySummaryId) {
          updateFields[CONFIG.xpEvents.weeklySummary] = linkedCell([row.weeklySummaryId]);
        }
        if (row.action === "repair_source_key") {
          updateFields[CONFIG.xpEvents.sourceKey] = row.sourceKey;
        }
        if (row.action === "repair_xp_points") {
          updateFields[CONFIG.xpEvents.xpPoints] = row.totalXp;
        }
        if (Object.keys(updateFields).length && !DRY_RUN && CONFIRM_WRITE) {
          await xpEventsTable.updateRecordAsync(xpEventId, updateFields);
        }
      }

      const homeworkUpdate = {};
      if (
        row.action === "create_xp_event" ||
        row.action === "link_existing_xp_by_source_key"
      ) {
        homeworkUpdate[CONFIG.homework.xpEvents] = linkedCell([xpEventId || row.existingXpEventId]);
      }
      if (
        row.action === "create_xp_event" ||
        row.action === "link_existing_xp_by_source_key" ||
        row.action === "mark_awarded_existing_link"
      ) {
        homeworkUpdate[CONFIG.homework.awardStatus] = buildCellValueForField(
          homeworkTable,
          CONFIG.homework.awardStatus,
          CONFIG.values.awardAwarded
        );
      }
      if (
        fieldExists(homeworkTable, CONFIG.homework.automationError) &&
        isWritableField(homeworkTable, CONFIG.homework.automationError)
      ) {
        homeworkUpdate[CONFIG.homework.automationError] = "";
      }

      if (Object.keys(homeworkUpdate).length && !DRY_RUN && CONFIRM_WRITE) {
        await homeworkTable.updateRecordAsync(row.homeworkId, homeworkUpdate);
      }

      applied.push({
        ...row,
        xpEventId: xpEventId || "(planned)",
        dryRun: DRY_RUN || !CONFIRM_WRITE,
      });
    } catch (error) {
      errors.push({
        homeworkId: row.homeworkId,
        action: row.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,
    candidateCount: candidates.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, candidates.length - batch.length),
    skippedCount: Object.values(skipCounts).reduce((sum, n) => sum + n, 0),
    skipCounts,
    actionCounts: applied.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
    errors,
    skippedSample: skipped.slice(0, 10),
    sample: applied.slice(0, 15),
  };

  console.log("===== BACKFILL HOMEWORK XP FROM REVIEWED =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
