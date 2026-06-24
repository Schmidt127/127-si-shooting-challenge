/*
Extension Script: Audit Video XP Pipeline Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only parity check for Video Feedback rows ready for XP (Automation 114 logic)
  vs VIDEO_SUBMISSION|{videoFeedbackId} XP Events: missing XP, duplicates, Source Key
  drift, points mismatch, Award Status gaps, and missing Weekly Athlete Summary on XP.

Default: read-only (no writes)

Recommended follow-up:
  backfill-video-xp-from-posted-feedback.js (dry run first)
  repair-video-feedback-xp-link.js (single-record manual repair)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const CONFIG = {
  scriptName: "audit-video-xp-pipeline-integrity",
  version: "v1.1",

  tables: {
    video: "Video Feedback",
    submissions: "Submissions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
  },

  video: {
    submission: "Submission",
    enrollment: "Enrollment",
    totalVideoXp: "Total Video XP Awarded",
    doNotAwardXp: "Do Not Award XP?",
    awardStatus: "Award Status",
    feedbackPosted: "Feedback Posted?",
    active: "Active?",
    readyForXpAutomation: "Ready for XP Automation?",
    xpEvents: "XP Events",
    videoFeedbackKey: "Video Feedback Key",
    uploadStatus: "Upload Status",
  },

  submissions: {
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
  },

  xpEvents: {
    sourceKey: "Source Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
    videoFeedback: "Video Feedback",
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    active: "Active?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  values: {
    sourceKeyPrefix: "VIDEO_SUBMISSION|",
    awardAwarded: "Awarded",
    xpSourceVideo: "Video Submission",
    xpBucketVideo: "Video Feedback",
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSourceKey(videoFeedbackId) {
  return `${CONFIG.values.sourceKeyPrefix}${videoFeedbackId}`;
}

function extractVideoFeedbackIdFromSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  if (!normalizeText(raw).startsWith("video_submission|")) return "";
  return raw.slice(raw.indexOf("|") + 1).trim();
}

function xpBelongsToVideoFeedback(xpRecord, xpEventsTable, videoFeedbackId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const dedupeKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized);

  if (sourceKey === buildSourceKey(videoFeedbackId)) return true;
  if (dedupeKey === buildSourceKey(videoFeedbackId)) return true;
  if (extractVideoFeedbackIdFromSourceKey(sourceKey) === videoFeedbackId) return true;
  if (extractVideoFeedbackIdFromSourceKey(dedupeKey) === videoFeedbackId) return true;

  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId);
}

function getVideoXpIds(videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();

  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToVideoFeedback(xp, xpEventsTable, videoFeedbackId)) {
      ids.add(xpId);
    }
  }

  for (const xpId of xpBySourceKey.get(buildSourceKey(videoFeedbackId)) || []) {
    ids.add(xpId);
  }

  return [...ids];
}

function pickPrimaryXpId(xpIds, videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable) {
  const expectedKey = buildSourceKey(videoFeedbackId);
  const scored = xpIds
    .map(xpId => {
      const xp = xpQuery.getRecord(xpId);
      if (!xp) return { xpId, score: -1 };

      const sourceKey = getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey);
      let score = 0;
      if (sourceKey === expectedKey) score = 4;
      else if (linkedXpIds.includes(xpId)) score = 3;
      else if (extractVideoFeedbackIdFromSourceKey(sourceKey) === videoFeedbackId) score = 2;
      else if (getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId)) {
        score = 1;
      }
      return { xpId, score };
    })
    .filter(row => row.score >= 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.xpId || xpIds[0] || "";
}

function buildSummaryIndexKey(enrollmentId, weekId) {
  return `${enrollmentId}|${weekId}`;
}

function resolveWeeklySummaryId({ sourceWeeklySummaryIds, enrollmentId, weekId, summaryIndex }) {
  if (sourceWeeklySummaryIds.length === 1) {
    return sourceWeeklySummaryIds[0];
  }

  if (!enrollmentId || !weekId) return "";

  const matches = summaryIndex.get(buildSummaryIndexKey(enrollmentId, weekId)) || [];
  if (matches.length === 1) return matches[0];
  return "";
}

function assessVideoXpReadiness(videoRecord, videoTable) {
  const missing = [];
  const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
  const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
  const feedbackPosted = fieldExists(videoTable, CONFIG.video.feedbackPosted)
    ? getBooleanish(videoRecord, videoTable, CONFIG.video.feedbackPosted)
    : true;
  const doNotAward =
    fieldExists(videoTable, CONFIG.video.doNotAwardXp) &&
    getBooleanish(videoRecord, videoTable, CONFIG.video.doNotAwardXp);
  const hasSubmission = getLinkedIds(videoRecord, videoTable, CONFIG.video.submission).length > 0;
  const hasEnrollment = getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment).length > 0;

  if (doNotAward || awardStatus === "Do Not Award") {
    missing.push("do_not_award_xp");
  }

  if (
    fieldExists(videoTable, CONFIG.video.active) &&
    !getBooleanish(videoRecord, videoTable, CONFIG.video.active)
  ) {
    missing.push("inactive");
  }

  // 114 clears Ready for XP Automation? after a successful award — do not require it
  // on rows that are already Awarded with positive XP (historical parity audit path).
  if (awardStatus === CONFIG.values.awardAwarded && totalXp > 0 && !doNotAward) {
    if (!hasSubmission) missing.push("submission");
    if (!hasEnrollment) missing.push("enrollment");
    return {
      ready: missing.length === 0,
      missing,
      auditMode: "awarded_parity",
    };
  }

  if (
    fieldExists(videoTable, CONFIG.video.feedbackPosted) &&
    !feedbackPosted
  ) {
    missing.push("feedback_not_posted");
  }

  if (
    fieldExists(videoTable, CONFIG.video.readyForXpAutomation) &&
    !getBooleanish(videoRecord, videoTable, CONFIG.video.readyForXpAutomation)
  ) {
    missing.push("not_ready_for_xp_automation");
  }

  if (!hasSubmission) {
    missing.push("submission");
  }

  if (!hasEnrollment) {
    missing.push("enrollment");
  }

  if (totalXp <= 0) {
    missing.push("zero_xp");
  }

  return {
    ready: missing.length === 0,
    missing,
    auditMode: "trigger_ready",
  };
}

async function main() {
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

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

  const issueCounts = {};
  const buckets = {
    ok: [],
    not_ready_for_xp: [],
    missing_xp_event: [],
    duplicate_xp_event: [],
    source_key_mismatch: [],
    xp_points_mismatch: [],
    award_status_gap: [],
    missing_weekly_summary_on_xp: [],
  };

  function bump(issue) {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }

  function pushSample(bucket, row) {
    if (buckets[bucket].length < SAMPLE_LIMIT) buckets[bucket].push(row);
  }

  for (const videoRecord of videoQuery.records) {
    const videoFeedbackId = videoRecord.id;
    const readiness = assessVideoXpReadiness(videoRecord, videoTable);

    if (!readiness.ready) {
      bump("not_ready_for_xp");
      pushSample("not_ready_for_xp", {
        videoFeedbackId,
        name: videoRecord.name,
        missing: readiness.missing,
        uploadStatus: getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus),
        awardStatus: getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus),
        totalVideoXp: getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp),
        recommendedAction: "Complete video review (113/114) or skip if Do Not Award XP",
      });
      continue;
    }

    const linkedXpIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents);
    const xpIds = getVideoXpIds(videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey);
    const awardStatus = getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus);
    const totalXp = getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp);
    const expectedKey = buildSourceKey(videoFeedbackId);
    const submissionId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.submission);
    const enrollmentId = getFirstLinkedId(videoRecord, videoTable, CONFIG.video.enrollment);

    const submissionRecord = submissionId ? submissionQuery.getRecord(submissionId) : null;
    const weekId = submissionRecord
      ? getFirstLinkedId(submissionRecord, submissionsTable, CONFIG.submissions.week)
      : "";
    const submissionWeeklySummaryIds = submissionRecord
      ? getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.weeklySummary)
      : [];
    const weeklySummaryId = resolveWeeklySummaryId({
      sourceWeeklySummaryIds: submissionWeeklySummaryIds,
      enrollmentId,
      weekId,
      summaryIndex,
    });

    let hasIssue = false;

    if (xpIds.length === 0) {
      bump("missing_xp_event");
      pushSample("missing_xp_event", {
        videoFeedbackId,
        name: videoRecord.name,
        expectedSourceKey: expectedKey,
        totalVideoXp: totalXp,
        recommendedAction: "Run 114 or backfill-video-xp-from-posted-feedback.js (planned)",
      });
      continue;
    }

    if (xpIds.length > 1) {
      bump("duplicate_xp_event");
      pushSample("duplicate_xp_event", {
        videoFeedbackId,
        name: videoRecord.name,
        xpEventIds: xpIds,
        recommendedAction: "Run dedupe-video-xp-events.js (planned) before source key backfill",
      });
      hasIssue = true;
    }

    const primaryXpId = pickPrimaryXpId(
      xpIds,
      videoFeedbackId,
      linkedXpIds,
      xpQuery,
      xpEventsTable
    );
    const primaryXp = primaryXpId ? xpQuery.getRecord(primaryXpId) : null;
    const primarySourceKey = primaryXp
      ? getText(primaryXp, xpEventsTable, CONFIG.xpEvents.sourceKey)
      : "";
    const primaryPoints = primaryXp
      ? getNumberish(primaryXp, xpEventsTable, CONFIG.xpEvents.xpPoints)
      : 0;
    const primaryWasId = primaryXp
      ? getFirstLinkedId(primaryXp, xpEventsTable, CONFIG.xpEvents.weeklySummary)
      : "";

    if (primarySourceKey !== expectedKey) {
      bump("source_key_mismatch");
      const looksLikeAssetId =
        primarySourceKey.startsWith("rec") &&
        !normalizeText(primarySourceKey).startsWith("video_submission|");
      pushSample("source_key_mismatch", {
        videoFeedbackId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        expectedSourceKey: expectedKey,
        actualSourceKey: primarySourceKey,
        recommendedAction: looksLikeAssetId
          ? "Wrong XP Event linked (asset ID as key) — run repair-video-feedback-xp-link.js"
          : "Repair Source Key on XP Event (run backfill repair_source_key)",
      });
      hasIssue = true;
    }

    if (primaryPoints !== totalXp) {
      bump("xp_points_mismatch");
      pushSample("xp_points_mismatch", {
        videoFeedbackId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        videoTotalXp: totalXp,
        xpEventPoints: primaryPoints,
        recommendedAction: "Align XP Points with Total Video XP Awarded",
      });
      hasIssue = true;
    }

    if (awardStatus !== CONFIG.values.awardAwarded && primaryXp) {
      bump("award_status_gap");
      pushSample("award_status_gap", {
        videoFeedbackId,
        name: videoRecord.name,
        awardStatus,
        xpEventId: primaryXpId,
        recommendedAction: "Set Award Status = Awarded after XP exists",
      });
      hasIssue = true;
    }

    if (weeklySummaryId && primaryXp && !primaryWasId) {
      bump("missing_weekly_summary_on_xp");
      pushSample("missing_weekly_summary_on_xp", {
        videoFeedbackId,
        name: videoRecord.name,
        xpEventId: primaryXpId,
        expectedWeeklySummaryId: weeklySummaryId,
        recommendedAction: "Link XP Event to Weekly Athlete Summary",
      });
      hasIssue = true;
    }

    if (!hasIssue) {
      bump("ok");
      if (buckets.ok.length < 5) {
        pushSample("ok", {
          videoFeedbackId,
          name: videoRecord.name,
          xpEventId: primaryXpId,
          totalVideoXp: totalXp,
        });
      }
    }
  }

  const repairIssues = Object.entries(issueCounts).filter(
    ([issue]) => issue !== "ok" && issue !== "not_ready_for_xp"
  );
  const issueTotal = repairIssues.reduce((sum, [, count]) => sum + count, 0);
  const xpReadyCount = videoQuery.records.length - (issueCounts.not_ready_for_xp || 0);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    videoFeedbackChecked: videoQuery.records.length,
    xpReadyCount,
    okCount: issueCounts.ok || 0,
    issueTotal,
    issueCounts,
    missingXpSample: buckets.missing_xp_event,
    duplicateXpSample: buckets.duplicate_xp_event,
    sourceKeyMismatchSample: buckets.source_key_mismatch,
    xpPointsMismatchSample: buckets.xp_points_mismatch,
    awardStatusGapSample: buckets.award_status_gap,
    missingWasSample: buckets.missing_weekly_summary_on_xp,
    notReadySample: buckets.not_ready_for_xp,
    okSample: buckets.ok,
  };

  console.log("===== VIDEO XP PIPELINE INTEGRITY AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
