/*
Extension Script: AUDIT - Submission Asset Pipeline Duplicate XP
System: 127 SI Shooting Challenge
Purpose:
  Read-only audit from Submission Assets → Homework Completions / Video Feedback → XP Events
  ensuring athletes are not double-awarded XP in the XP Events table.

  Checks:
  - Duplicate Source Key rows in XP Events (pipeline keys only)
  - Duplicate submission-base XP per counted Submission
  - Duplicate homework XP per awarded / XP-linked Homework Completion
  - Duplicate video XP per awarded / XP-linked Video Feedback
  - Asset chain: uploaded asset → homework/video target → duplicate XP on that target

Default: read-only (no writes)

Recommended follow-up:
  dedupe-homework-xp-events.js
  backfill-homework-xp-from-reviewed.js / backfill-video-xp-from-posted-feedback.js
  repair-video-feedback-xp-link.js (single-record)
  Manual dedupe: keep canonical Source Key row, deactivate or delete duplicate XP Events
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;

const ALLOWED_ISSUE_TYPES = [
  "DUPLICATE_XP_SOURCE_KEY",
  "DUPLICATE_SUBMISSION_BASE_XP",
  "DUPLICATE_HOMEWORK_XP",
  "DUPLICATE_VIDEO_XP",
  "DUPLICATE_XP_ON_ASSET_HOMEWORK_CHAIN",
  "DUPLICATE_XP_ON_ASSET_VIDEO_CHAIN",
];

const CONFIG = {
  scriptName: "audit-submission-asset-pipeline-duplicate-xp",
  displayName: "AUDIT - Submission Asset Pipeline Duplicate XP",
  version: "v1.0",

  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
    submissions: "Submissions",
    xpEvents: "XP Events",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    uploadDestination: "Upload Destination",
    uploadStatus: "Upload Status",
  },

  homework: {
    name: "Homework Completion Full Name",
    enrollment: "Enrollment",
    submission: "Submissions - Linked",
    submissionAssets: "Submission Assets",
    awardStatus: "Award Status",
    baseXp: "Base XP Awarded",
    totalXp: "Total Homework XP Awarded",
    xpEvents: "XP Events",
  },

  video: {
    name: "Video Feedback Name",
    enrollment: "Enrollment",
    submission: "Submission",
    submissionAsset: "Submission Asset",
    awardStatus: "Award Status",
    totalVideoXp: "Total Video XP Awarded",
    xpEvents: "XP Events",
    doNotAwardXp: "Do Not Award XP?",
  },

  submissions: {
    name: "Submission Full Name",
    enrollment: "Enrollment",
    week: "Week",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    xpEvents: "XP Events",
    submissionAssets: "Submission Assets",
  },

  xpEvents: {
    sourceKey: "Source Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    videoFeedback: "Video Feedback",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    active: "Active?",
  },

  values: {
    submissionXpPrefix: "SUBMISSION_XP|",
    homeworkXpPrefix: "HOMEWORK_XP|",
    homeworkLegacyPrefix: "HOMEWORK_COMPLETION|",
    videoXpPrefix: "VIDEO_SUBMISSION|",
    awardAwarded: "Awarded",
    uploadDestinationHomework: "Homework Completions",
    uploadDestinationVideo: "Video Feedback",
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

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isPipelineSourceKey(sourceKey) {
  const key = normalizeText(sourceKey);
  return (
    key.startsWith(normalizeText(CONFIG.values.submissionXpPrefix)) ||
    key.startsWith(normalizeText(CONFIG.values.homeworkXpPrefix)) ||
    key.startsWith(normalizeText(CONFIG.values.homeworkLegacyPrefix)) ||
    key.startsWith(normalizeText(CONFIG.values.videoXpPrefix))
  );
}

function buildHomeworkSourceKeys(homeworkId) {
  return [
    `${CONFIG.values.homeworkXpPrefix}${homeworkId}`,
    `${CONFIG.values.homeworkLegacyPrefix}${homeworkId}`,
  ];
}

function buildVideoSourceKey(videoFeedbackId) {
  return `${CONFIG.values.videoXpPrefix}${videoFeedbackId}`;
}

function buildSubmissionSourceKey(submissionId) {
  return `${CONFIG.values.submissionXpPrefix}${submissionId}`;
}

function extractIdAfterPrefix(sourceKey, prefix) {
  const raw = String(sourceKey || "").trim();
  if (!normalizeText(raw).startsWith(normalizeText(prefix))) return "";
  return raw.slice(prefix.length).trim();
}

function xpBelongsToHomework(xpRecord, xpEventsTable, homeworkId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (buildHomeworkSourceKeys(homeworkId).includes(sourceKey)) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.homeworkCompletion).includes(homeworkId);
}

function xpBelongsToVideo(xpRecord, xpEventsTable, videoFeedbackId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const dedupeKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized);
  const expected = buildVideoSourceKey(videoFeedbackId);

  if (sourceKey === expected || dedupeKey === expected) return true;
  if (extractIdAfterPrefix(sourceKey, CONFIG.values.videoXpPrefix) === videoFeedbackId) return true;
  if (extractIdAfterPrefix(dedupeKey, CONFIG.values.videoXpPrefix) === videoFeedbackId) return true;
  return getLinkedIds(xpRecord, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId);
}

function isSubmissionBaseXpEvent(xpRecord, xpEventsTable, submissionId) {
  const sourceKey = getText(xpRecord, xpEventsTable, CONFIG.xpEvents.sourceKey);
  if (sourceKey === buildSubmissionSourceKey(submissionId)) return true;
  if (normalizeText(sourceKey).startsWith(normalizeText(CONFIG.values.submissionXpPrefix))) {
    return extractIdAfterPrefix(sourceKey, CONFIG.values.submissionXpPrefix) === submissionId;
  }
  const xpSource = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpSource);
  const xpBucket = getSelectName(xpRecord, xpEventsTable, CONFIG.xpEvents.xpBucket);
  return xpSource === "Submission Base" || xpBucket === "Shooting Base";
}

function getHomeworkXpIds(homeworkId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();
  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToHomework(xp, xpEventsTable, homeworkId)) ids.add(xpId);
  }
  for (const sourceKey of buildHomeworkSourceKeys(homeworkId)) {
    for (const xpId of xpBySourceKey.get(sourceKey) || []) ids.add(xpId);
  }
  return [...ids];
}

function getVideoXpIds(videoFeedbackId, linkedXpIds, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set();
  for (const xpId of linkedXpIds) {
    const xp = xpQuery.getRecord(xpId);
    if (xp && xpBelongsToVideo(xp, xpEventsTable, videoFeedbackId)) ids.add(xpId);
  }
  for (const xpId of xpBySourceKey.get(buildVideoSourceKey(videoFeedbackId)) || []) {
    ids.add(xpId);
  }
  return [...ids];
}

function getSubmissionBaseXpIds(submissionId, xpQuery, xpEventsTable, xpBySourceKey) {
  const ids = new Set(xpBySourceKey.get(buildSubmissionSourceKey(submissionId)) || []);
  for (const xp of xpQuery.records) {
    if (!getLinkedIds(xp, xpEventsTable, CONFIG.xpEvents.submission).includes(submissionId)) continue;
    if (isSubmissionBaseXpEvent(xp, xpEventsTable, submissionId)) ids.add(xp.id);
  }
  return [...ids];
}

function describeXpRows(xpIds, xpQuery, xpEventsTable) {
  return xpIds.map(xpId => {
    const xp = xpQuery.getRecord(xpId);
    if (!xp) return { recordId: xpId, missing: true };
    return {
      recordId: xpId,
      sourceKey: getText(xp, xpEventsTable, CONFIG.xpEvents.sourceKey),
      xpPoints: getNumberish(xp, xpEventsTable, CONFIG.xpEvents.xpPoints),
      xpSource: getSelectName(xp, xpEventsTable, CONFIG.xpEvents.xpSource),
      xpBucket: getSelectName(xp, xpEventsTable, CONFIG.xpEvents.xpBucket),
      active: fieldExists(xpEventsTable, CONFIG.xpEvents.active)
        ? getBooleanish(xp, xpEventsTable, CONFIG.xpEvents.active)
        : null,
    };
  });
}

function sumXpPoints(xpIds, xpQuery, xpEventsTable) {
  return xpIds.reduce(
    (sum, xpId) => sum + getNumberish(xpQuery.getRecord(xpId), xpEventsTable, CONFIG.xpEvents.xpPoints),
    0
  );
}

function excessPoints(totalPoints, primaryPoints) {
  return Math.max(0, totalPoints - primaryPoints);
}

function homeworkHasXpSurface(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.awardStatus) ===
      CONFIG.values.awardAwarded ||
    getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents).length > 0 ||
    getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.totalXp) > 0 ||
    getNumberish(homeworkRecord, homeworkTable, CONFIG.homework.baseXp) > 0
  );
}

function videoHasXpSurface(videoRecord, videoTable) {
  if (
    fieldExists(videoTable, CONFIG.video.doNotAwardXp) &&
    getBooleanish(videoRecord, videoTable, CONFIG.video.doNotAwardXp)
  ) {
    return false;
  }
  if (getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus) === "Do Not Award") {
    return false;
  }
  return (
    getSelectName(videoRecord, videoTable, CONFIG.video.awardStatus) === CONFIG.values.awardAwarded ||
    getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents).length > 0 ||
    getNumberish(videoRecord, videoTable, CONFIG.video.totalVideoXp) > 0
  );
}

function buildRecommendations(issueCounts) {
  const recommendations = [];

  if (issueCounts.DUPLICATE_XP_SOURCE_KEY) {
    recommendations.push(
      "Duplicate Source Key in XP Events: manual dedupe — keep one row per canonical key; run dedupe-homework-xp-events.js for homework rows."
    );
  }
  if (issueCounts.DUPLICATE_SUBMISSION_BASE_XP) {
    recommendations.push(
      "Duplicate submission-base XP: keep SUBMISSION_XP|{submissionId}; review audit-xp-vs-submissions.js samples."
    );
  }
  if (issueCounts.DUPLICATE_HOMEWORK_XP || issueCounts.DUPLICATE_XP_ON_ASSET_HOMEWORK_CHAIN) {
    recommendations.push(
      "Duplicate homework XP: dedupe-homework-xp-events.js then backfill-homework-xp-from-reviewed.js (dry run first)."
    );
  }
  if (issueCounts.DUPLICATE_VIDEO_XP || issueCounts.DUPLICATE_XP_ON_ASSET_VIDEO_CHAIN) {
    recommendations.push(
      "Duplicate video XP: manual dedupe keeping VIDEO_SUBMISSION|{videoFeedbackId}; repair-video-feedback-xp-link.js for link drift."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("No duplicate XP detected on submission-asset → homework/video → XP pipeline paths.");
  }

  return recommendations;
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );
  const xpFields = Object.values(CONFIG.xpEvents).filter(name => fieldExists(xpEventsTable, name));

  const [assetQuery, homeworkQuery, videoQuery, submissionQuery, xpQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
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

  const issueCounts = Object.fromEntries(ALLOWED_ISSUE_TYPES.map(type => [type, 0]));
  const detailedIssues = [];
  let totalExcessXpPoints = 0;
  const seenIssueKeys = new Set();

  function bump(issueType, payload) {
    issueCounts[issueType] = (issueCounts[issueType] || 0) + 1;
    if (detailedIssues.length < SAMPLE_LIMIT * ALLOWED_ISSUE_TYPES.length) {
      detailedIssues.push({ issueType, ...payload });
    }
  }

  function recordDuplicate({
    issueType,
    dedupeKey,
    primaryTable,
    primaryRecordId,
    primaryName,
    expectedSourceKey,
    xpEventIds,
    chain,
  }) {
    if (seenIssueKeys.has(dedupeKey)) return;
    seenIssueKeys.add(dedupeKey);

    const xpRows = describeXpRows(xpEventIds, xpQuery, xpEventsTable);
    const totalPoints = sumXpPoints(xpEventIds, xpQuery, xpEventsTable);
    const primaryPoints = xpRows[0]?.xpPoints || 0;
    const excess = excessPoints(totalPoints, primaryPoints);
    totalExcessXpPoints += excess;

    bump(issueType, {
      table: primaryTable,
      recordId: primaryRecordId,
      name: primaryName,
      expectedSourceKey,
      xpEventIds,
      xpRows,
      totalXpPoints: totalPoints,
      excessXpPoints: excess,
      chain: chain || null,
      recommendedAction: "Keep one canonical XP Event; dedupe or deactivate duplicates",
    });
  }

  for (const [sourceKey, xpIds] of xpBySourceKey.entries()) {
    if (xpIds.length < 2 || !isPipelineSourceKey(sourceKey)) continue;
    recordDuplicate({
      issueType: "DUPLICATE_XP_SOURCE_KEY",
      dedupeKey: `source_key|${sourceKey}`,
      primaryTable: CONFIG.tables.xpEvents,
      primaryRecordId: xpIds[0],
      primaryName: sourceKey,
      expectedSourceKey: sourceKey,
      xpEventIds: xpIds,
    });
  }

  for (const submission of submissionQuery.records) {
    if (getNumberish(submission, submissionsTable, CONFIG.submissions.countThisSubmission) !== 1) continue;

    const submissionId = submission.id;
    const xpIds = getSubmissionBaseXpIds(submissionId, xpQuery, xpEventsTable, xpBySourceKey);
    if (xpIds.length < 2) continue;

    recordDuplicate({
      issueType: "DUPLICATE_SUBMISSION_BASE_XP",
      dedupeKey: `submission|${submissionId}`,
      primaryTable: CONFIG.tables.submissions,
      primaryRecordId: submissionId,
      primaryName: getText(submission, submissionsTable, CONFIG.submissions.name) || submission.name,
      expectedSourceKey: buildSubmissionSourceKey(submissionId),
      xpEventIds: xpIds,
    });
  }

  for (const homeworkRecord of homeworkQuery.records) {
    if (!homeworkHasXpSurface(homeworkRecord, homeworkTable)) continue;

    const homeworkId = homeworkRecord.id;
    const linkedXpIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents);
    const xpIds = getHomeworkXpIds(
      homeworkId,
      linkedXpIds,
      xpQuery,
      xpEventsTable,
      xpBySourceKey
    );
    if (xpIds.length < 2) continue;

    recordDuplicate({
      issueType: "DUPLICATE_HOMEWORK_XP",
      dedupeKey: `homework|${homeworkId}`,
      primaryTable: CONFIG.tables.homework,
      primaryRecordId: homeworkId,
      primaryName:
        getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
      expectedSourceKey: buildHomeworkSourceKeys(homeworkId)[0],
      xpEventIds: xpIds,
    });
  }

  for (const videoRecord of videoQuery.records) {
    if (!videoHasXpSurface(videoRecord, videoTable)) continue;

    const videoFeedbackId = videoRecord.id;
    const linkedXpIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents);
    const xpIds = getVideoXpIds(
      videoFeedbackId,
      linkedXpIds,
      xpQuery,
      xpEventsTable,
      xpBySourceKey
    );
    if (xpIds.length < 2) continue;

    recordDuplicate({
      issueType: "DUPLICATE_VIDEO_XP",
      dedupeKey: `video|${videoFeedbackId}`,
      primaryTable: CONFIG.tables.video,
      primaryRecordId: videoFeedbackId,
      primaryName: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
      expectedSourceKey: buildVideoSourceKey(videoFeedbackId),
      xpEventIds: xpIds,
    });
  }

  for (const assetRecord of assetQuery.records) {
    const assetId = assetRecord.id;
    const homeworkIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.homeworkCompletions);
    const videoIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback);
    const submissionIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.submission);

    if (homeworkIds.length === 0 && videoIds.length === 0) continue;

    const assetName = getText(assetRecord, assetsTable, CONFIG.assets.fullName) || assetRecord.name;
    const chainBase = {
      assetId,
      assetName,
      submissionIds,
      uploadDestination: getText(assetRecord, assetsTable, CONFIG.assets.uploadDestination),
      uploadStatus: getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus),
    };

    for (const homeworkId of homeworkIds) {
      const homeworkRecord = homeworkQuery.getRecord(homeworkId);
      if (!homeworkRecord || !homeworkHasXpSurface(homeworkRecord, homeworkTable)) continue;

      const xpIds = getHomeworkXpIds(
        homeworkId,
        getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.xpEvents),
        xpQuery,
        xpEventsTable,
        xpBySourceKey
      );
      if (xpIds.length < 2) continue;

      recordDuplicate({
        issueType: "DUPLICATE_XP_ON_ASSET_HOMEWORK_CHAIN",
        dedupeKey: `asset_homework|${assetId}|${homeworkId}`,
        primaryTable: CONFIG.tables.assets,
        primaryRecordId: assetId,
        primaryName: assetName,
        expectedSourceKey: buildHomeworkSourceKeys(homeworkId)[0],
        xpEventIds: xpIds,
        chain: {
          ...chainBase,
          homeworkId,
          homeworkName:
            getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
        },
      });
    }

    for (const videoFeedbackId of videoIds) {
      const videoRecord = videoQuery.getRecord(videoFeedbackId);
      if (!videoRecord || !videoHasXpSurface(videoRecord, videoTable)) continue;

      const xpIds = getVideoXpIds(
        videoFeedbackId,
        getLinkedIds(videoRecord, videoTable, CONFIG.video.xpEvents),
        xpQuery,
        xpEventsTable,
        xpBySourceKey
      );
      if (xpIds.length < 2) continue;

      recordDuplicate({
        issueType: "DUPLICATE_XP_ON_ASSET_VIDEO_CHAIN",
        dedupeKey: `asset_video|${assetId}|${videoFeedbackId}`,
        primaryTable: CONFIG.tables.assets,
        primaryRecordId: assetId,
        primaryName: assetName,
        expectedSourceKey: buildVideoSourceKey(videoFeedbackId),
        xpEventIds: xpIds,
        chain: {
          ...chainBase,
          videoFeedbackId,
          videoName: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
        },
      });
    }
  }

  const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  const recommendations = buildRecommendations(issueCounts);

  const summary = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    assetsChecked: assetQuery.records.length,
    homeworkChecked: homeworkQuery.records.length,
    videoChecked: videoQuery.records.length,
    submissionsChecked: submissionQuery.records.length,
    xpEventsChecked: xpQuery.records.length,
    totalIssues,
    totalExcessXpPoints,
    issueCounts,
    recommendations,
  };

  console.log(`===== ${CONFIG.displayName} =====`);
  console.log(`Script: ${CONFIG.scriptName} ${CONFIG.version}`);
  console.log("Mode: READ-ONLY (no record changes)");
  console.log("\n----- ISSUE COUNTS -----");
  for (const issueType of ALLOWED_ISSUE_TYPES) {
    if (issueCounts[issueType]) {
      console.log(`${issueType}: ${issueCounts[issueType]}`);
    }
  }
  if (totalIssues === 0) {
    console.log("(none — no duplicate XP detected)");
  }
  console.log(`\nTotal excess XP points (duplicate rows beyond primary): ${totalExcessXpPoints}`);
  console.log("\n----- DETAILED ISSUES -----");
  if (detailedIssues.length === 0) {
    console.log("(none)");
  } else {
    for (const row of detailedIssues) {
      console.log(JSON.stringify(row));
    }
  }
  console.log("\n----- SUMMARY -----");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n----- RECOMMENDATIONS -----");
  for (const line of recommendations) {
    console.log(`- ${line}`);
  }
}

await main();
