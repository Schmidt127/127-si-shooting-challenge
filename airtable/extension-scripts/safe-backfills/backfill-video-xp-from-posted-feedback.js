/*
Extension Script: Backfill Video XP From Posted Feedback (Automation 114 logic)
System: 127 SI Shooting Challenge
Purpose:
  Repairs Video XP Events for Awarded Video Feedback rows: legacy asset-ID Source Keys,
  XP points drift, WAS links, and VF ↔ XP links. Skips SUBMISSION_XP wrong-type links.

Safety:
  - DRY_RUN defaults to true
  - CONFIRM_WRITE = true to write
  - BATCH_LIMIT = 25; re-run until remainingCount is 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const DEBUG_VIDEO_FEEDBACK_ID = "";

const CONFIG = {
  scriptName: "backfill-video-xp-from-posted-feedback",
  version: "v1.0",

  tables: {
    video: "Video Feedback",
    submissions: "Submissions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  video: {
    submission: "Submission",
    enrollment: "Enrollment",
    submissionAsset: "Submission Asset",
    totalVideoXp: "Total Video XP Awarded",
    doNotAwardXp: "Do Not Award XP?",
    awardStatus: "Award Status",
    feedbackPosted: "Feedback Posted?",
    active: "Active?",
    readyForXpAutomation: "Ready for XP Automation?",
    xpEvents: "XP Events",
    videoFeedbackKey: "Video Feedback Key",
  },

  submissions: {
    week: "Week",
    activityDate: "Activity Date",
    weeklySummary: "Weekly Athlete Summary",
  },

  xpEvents: {
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    videoFeedback: "Video Feedback",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    xpPoints: "XP Points",
    sourceKey: "Source Key",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    active: "Active?",
    xpActivityDateCandidates: ["XP Activity Date", "XP Source Date"],
    xpActivityDateSourceCandidates: ["XP Activity Date Source", "XP Date Source"],
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    sourceKeyPrefix: "VIDEO_SUBMISSION|",
    videoFeedbackKeyPrefix: "VIDEO_FEEDBACK|",
    awardAwarded: "Awarded",
    xpBucketVideo: "Video Feedback",
    xpSourceVideo: "Video Submission",
    xpReasonPublic: "Video feedback XP earned.",
    xpActivityDateSource: "Video Submission Activity Date",
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

function getFirstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
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

function getDateValue(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return null;
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  return value;
}

function getFirstWritableFieldName(table, candidates) {
  for (const fieldName of candidates) {
    if (isWritableField(table, fieldName)) return fieldName;
  }
  return "";
}

function buildSourceKey(videoFeedbackId) {
  return `${CONFIG.values.sourceKeyPrefix}${videoFeedbackId}`;
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubmissionAssetId(videoRecord, videoTable) {
  const fromLink = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.submissionAsset);
  if (fromLink) return fromLink;
  const key = getText(videoRecord, videoTable, CONFIG.video.videoFeedbackKey);
  if (key.startsWith(CONFIG.values.videoFeedbackKeyPrefix)) {
    return key.slice(CONFIG.values.videoFeedbackKeyPrefix.length);
  }
  return "";
}

function isWrongXpTypeSourceKey(sourceKey) {
  const key = normalizeText(sourceKey);
  return key.startsWith("submission_xp|") || key.startsWith("homework_xp|");
}

function xpBelongsToVideoFeedback(xpRecord, xpEventsTable, videoFeedbackId, legacyAssetId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (sourceKey === buildSourceKey(videoFeedbackId)) return true;
  if (legacyAssetId && sourceKey === legacyAssetId) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId);
}

function findVideoXpIds(videoFeedbackId, linkedXpIds, legacyAssetId, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();
  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToVideoFeedback(xp, xpEventsTable, videoFeedbackId, legacyAssetId)) {
      ids.add(xpId);
    }
  }
  for (const xpId of xpBySourceKey.get(buildSourceKey(videoFeedbackId)) || []) {
    ids.add(xpId);
  }
  if (legacyAssetId) {
    for (const xpId of xpBySourceKey.get(legacyAssetId) || []) {
      ids.add(xpId);
    }
  }
  return [...ids];
}

function pickPrimaryXpId(xpIds, videoFeedbackId, linkedXpIds, legacyAssetId, xpQuery, xpEventsTable) {
  const expectedKey = buildSourceKey(videoFeedbackId);
  const scored = xpIds
    .map(xpId => {
      const xp = xpQuery.getRecord(xpId);
      if (!xp) return { xpId, score: -1 };
      const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
      let score = 0;
      if (sourceKey === expectedKey) score = 5;
      else if (legacyAssetId && sourceKey === legacyAssetId) score = 4;
      else if (linkedXpIds.includes(xpId)) score = 3;
      else if (getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId)) {
        score = 2;
      } else score = 1;
      return { xpId, score };
    })
    .filter(row => row.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.xpId || xpIds[0] || "";
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) return sourceWeeklySummaryIds[0];
  if (!enrollmentId || !weekId) return "";
  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) return matches[0];
  return "";
}

function isEligibleForBackfill(videoRecord, videoTable) {
  const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
  const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
  const doNotAward =
    fieldExists(videoTable, CONFIG.video.doNotAwardXp) &&
    getBooleanish(videoRecord, videoTable, CONFIG.video.doNotAwardXp);

  if (doNotAward || awardStatus === "Do Not Award") {
    return { ok: false, reason: "skipped_do_not_award" };
  }
  if (awardStatus !== CONFIG.values.awardAwarded || totalXp <= 0) {
    return { ok: false, reason: "skipped_not_awarded_or_zero_xp" };
  }
  if (!getFirstLinkedId(videoRecord, videoTable, CONFIG.video.submission)) {
    return { ok: false, reason: "skipped_missing_submission" };
  }
  if (!getFirstLinkedId(videoRecord, videoTable, CONFIG.video.enrollment)) {
    return { ok: false, reason: "skipped_missing_enrollment" };
  }
  return { ok: true };
}

async function main() {
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
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

  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [videoQuery, submissionQuery, xpQuery, summaryQuery] = await Promise.all([
    videoTable.selectRecordsAsync({ fields: videoFields }),
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
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

  for (const videoRecord of videoQuery.records) {
    const videoFeedbackId = videoRecord.id;
    if (DEBUG_VIDEO_FEEDBACK_ID && videoFeedbackId !== DEBUG_VIDEO_FEEDBACK_ID) continue;

    const eligibility = isEligibleForBackfill(videoRecord, videoTable);
    if (!eligibility.ok) {
      skipCounts[eligibility.reason] = (skipCounts[eligibility.reason] || 0) + 1;
      continue;
    }

    const linkedXpIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents);
    const legacyAssetId = getSubmissionAssetId(videoRecord, videoTable);
    const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
    const submissionId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.submission);
    const enrollmentId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.enrollment);
    const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
    const sourceKey = buildSourceKey(videoFeedbackId);

    const submissionRecord = submissionQuery.getRecord(submissionId);
    const weekId = submissionRecord
      ? getFirstLinkedId(submissionRecord, submissionsTable, CONFIG.submissions.week)
      : "";
    const activityDate = submissionRecord
      ? getDateValue(submissionRecord, submissionsTable, CONFIG.submissions.activityDate)
      : null;
    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: submissionRecord
        ? getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.weeklySummary)
        : [],
      enrollmentId,
      weekId,
      summaryIndex,
    });

    const xpIds = findVideoXpIds(
      videoFeedbackId,
      linkedXpIds,
      legacyAssetId,
      xpQuery,
      xpEventsTable,
      xpBySourceKey
    );

    if (xpIds.length > 1) {
      skipCounts.skipped_duplicate_xp = (skipCounts.skipped_duplicate_xp || 0) + 1;
      skipped.push({ videoFeedbackId, name: videoRecord.name, reason: "skipped_duplicate_xp", xpIds });
      continue;
    }

    const existingXpId = xpIds.length
      ? pickPrimaryXpId(xpIds, videoFeedbackId, linkedXpIds, legacyAssetId, xpQuery, xpEventsTable)
      : "";
    const existingXp = existingXpId ? xpQuery.getRecord(existingXpId) : null;

    if (!existingXp) {
      skipCounts.skipped_missing_xp = (skipCounts.skipped_missing_xp || 0) + 1;
      skipped.push({ videoFeedbackId, name: videoRecord.name, reason: "skipped_missing_xp" });
      continue;
    }

    const existingSourceKey = getText(existingXp, xpEventsTable, CONFIG.xpEvents.sourceKey);
    if (isWrongXpTypeSourceKey(existingSourceKey)) {
      skipCounts.skipped_wrong_xp_type = (skipCounts.skipped_wrong_xp_type || 0) + 1;
      skipped.push({
        videoFeedbackId,
        name: videoRecord.name,
        reason: "skipped_wrong_xp_type",
        xpEventId: existingXpId,
        actualSourceKey: existingSourceKey,
      });
      continue;
    }

    const existingPoints = getNumberish(existingXp, xpEventsTable, CONFIG.xpEvents.xpPoints);
    const existingWasId = getFirstLinkedId(existingXp, xpEventsTable, CONFIG.xpEvents.weeklySummary);
    const xpLinkedToVideo = getLinkedIds(existingXp, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(
      videoFeedbackId
    );

    const fullySynced =
      existingSourceKey === sourceKey &&
      existingPoints === totalXp &&
      linkedXpIds.includes(existingXpId) &&
      xpLinkedToVideo &&
      awardStatus === CONFIG.values.awardAwarded &&
      (!weeklySummaryId || existingWasId === weeklySummaryId);

    if (fullySynced) {
      skipCounts.skipped_already_synced = (skipCounts.skipped_already_synced || 0) + 1;
      continue;
    }

    let action = "";
    if (!linkedXpIds.includes(existingXpId) || !xpLinkedToVideo) {
      action = "link_existing_xp";
    } else if (weeklySummaryId && !existingWasId) {
      action = "repair_weekly_summary_link";
    } else if (existingPoints !== totalXp) {
      action = "repair_xp_points";
    } else if (existingSourceKey !== sourceKey) {
      action = "repair_source_key";
    } else if (awardStatus !== CONFIG.values.awardAwarded) {
      action = "mark_awarded";
    } else {
      skipCounts.skipped_no_action = (skipCounts.skipped_no_action || 0) + 1;
      continue;
    }

    candidates.push({
      videoFeedbackId,
      name: videoRecord.name,
      action,
      sourceKey,
      legacyAssetId,
      submissionId,
      enrollmentId,
      weekId,
      weeklySummaryId,
      existingXpEventId: existingXpId,
      totalXp,
      activityDate,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      let xpEventId = row.existingXpEventId;
      const xpUpdate = {};

      if (row.action === "repair_source_key") {
        xpUpdate[CONFIG.xpEvents.sourceKey] = row.sourceKey;
      }
      if (row.action === "repair_xp_points" || row.action === "repair_source_key") {
        if (row.totalXp !== getNumberish(xpQuery.getRecord(xpEventId), xpEventsTable, CONFIG.xpEvents.xpPoints)) {
          xpUpdate[CONFIG.xpEvents.xpPoints] = row.totalXp;
        }
      }
      if (row.action === "repair_weekly_summary_link" && row.weeklySummaryId) {
        xpUpdate[CONFIG.xpEvents.weeklySummary] = linkedCell([row.weeklySummaryId]);
      }
      if (
        row.action === "link_existing_xp" ||
        row.action === "repair_source_key" ||
        row.action === "repair_xp_points"
      ) {
        xpUpdate[CONFIG.xpEvents.videoFeedback] = linkedCell([row.videoFeedbackId]);
        if (row.sourceKey) xpUpdate[CONFIG.xpEvents.sourceKey] = row.sourceKey;
        if (row.enrollmentId && isWritableField(xpEventsTable, CONFIG.xpEvents.enrollment)) {
          xpUpdate[CONFIG.xpEvents.enrollment] = linkedCell([row.enrollmentId]);
        }
        if (row.submissionId && isWritableField(xpEventsTable, CONFIG.xpEvents.submission)) {
          xpUpdate[CONFIG.xpEvents.submission] = linkedCell([row.submissionId]);
        }
        if (row.weekId && isWritableField(xpEventsTable, CONFIG.xpEvents.week)) {
          xpUpdate[CONFIG.xpEvents.week] = linkedCell([row.weekId]);
        }
      }

      if (Object.keys(xpUpdate).length && !DRY_RUN && CONFIRM_WRITE) {
        await xpEventsTable.updateRecordAsync(xpEventId, xpUpdate);
      }

      const videoUpdate = {};
      if (row.action === "link_existing_xp" || row.action === "repair_source_key" || row.action === "repair_xp_points") {
        const current = getLinkedIds(videoQuery.getRecord(row.videoFeedbackId), videoTable, CONFIG.video.xpEvents);
        if (!current.includes(xpEventId)) {
          videoUpdate[CONFIG.video.xpEvents] = linkedCell([...current, xpEventId]);
        }
      }
      if (row.action !== "mark_awarded" && getSelectName(videoQuery.getRecord(row.videoFeedbackId), videoTable, CONFIG.video.awardStatus) !== CONFIG.values.awardAwarded) {
        videoUpdate[CONFIG.video.awardStatus] = buildCellValueForField(
          videoTable,
          CONFIG.video.awardStatus,
          CONFIG.values.awardAwarded
        );
      }

      if (Object.keys(videoUpdate).length && !DRY_RUN && CONFIRM_WRITE) {
        await videoTable.updateRecordAsync(row.videoFeedbackId, videoUpdate);
      }

      applied.push({ ...row, xpEventId, dryRun: DRY_RUN || !CONFIRM_WRITE });
    } catch (error) {
      errors.push({
        videoFeedbackId: row.videoFeedbackId,
        action: row.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const actionCounts = {};
  for (const row of candidates) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
  }

  console.log("===== BACKFILL VIDEO XP FROM POSTED FEEDBACK =====");
  console.log(
    JSON.stringify(
      {
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
        actionCounts,
        errors,
        skippedSample: skipped.slice(0, 10),
        sample: applied.slice(0, 15),
      },
      null,
      2
    )
  );
}

await main();
