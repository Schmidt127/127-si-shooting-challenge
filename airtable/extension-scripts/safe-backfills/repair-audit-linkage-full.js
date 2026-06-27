/*
Extension Script: Repair Audit Linkage — Full Batch (v1.3 audit)
System: 127 SI Shooting Challenge
Purpose:
  Batch repair for all issue types flagged by audit-video-and-homework-attachment-linkage.js v1.2.

  Fixes (in write order):
  1. Stale uploaded assets → unlink homework + uncheck Send to Make Trigger
  2. Submission Assets list on Submissions → drop stale duplicate asset ids (before homework writeback)
  3. Multi-asset Homework Completions → canonical asset + writeback
  4. Video Feedback parent-sent without coach feedback → reset stale parent flags
  5. Video Feedback coach feedback not posted → set Feedback Posted?
  6. Video Feedback without Submission Asset → link from Video Feedback Key
  7. Homework Completion without Submission Asset → link from submission + slot

  Why submission + send-trigger steps matter:
  Automation 020 re-links homework when a stale asset still fires on the submission.
  Unchecking Send to Make Trigger and removing stale ids from the submission stops re-link drift.

Safety:
  - DRY_RUN = true by default (report only)
  - Set CONFIRM_WRITE = true AND DRY_RUN = false to apply
  - BATCH_LIMIT caps total record updates per run (default 75); re-run until remainingCount is 0
  - Does not delete records

Setup:
  1. Run audit-video-and-homework-attachment-linkage.js and save output
  2. Run this script with DRY_RUN = true; review plannedActions
  3. Set CONFIRM_WRITE = true, DRY_RUN = false; re-run until remainingCount is 0
  4. Re-run audit to confirm clean
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 75;

/** Optional filter — empty array repairs all matching rows */
const TARGET_HOMEWORK_IDS = [];
const TARGET_VIDEO_IDS = [];
const TARGET_ASSET_IDS = [];

const CONFIG = {
  scriptName: "repair-audit-linkage-full",
  version: "v1.3",

  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
    submissions: "Submissions",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    uploadDestination: "Upload Destination",
    assetType: "Asset Type",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    submission: "Submission - Linked",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    sendToMakeTrigger: "Send to Make Trigger",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
  },

  homework: {
    name: "Homework Completion Full Name",
    submission: "Submissions - Linked",
    submissionAssets: "Submission Assets",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
    assetSlot: "Asset Slot",
    itemSlot: "Item Slot",
    parentFeedbackSent: "Parent Feedback Sent?",
    coachFeedback: "Coach Feedback",
  },

  video: {
    name: "Video Feedback Name",
    key: "Video Feedback Key",
    submissionAsset: "Submission Asset",
    submission: "Submission",
    enrollment: "Enrollment",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    videoUrlOrDriveLink: "Video URL or Drive Link",
    coachFeedback: "Coach Feedback",
    feedbackPosted: "Feedback Posted?",
    parentFeedbackReady: "Parent Feedback Ready?",
    parentFeedbackSent: "Parent Feedback Sent?",
    parentFeedbackSentOn: "Parent Feedback Sent On",
    writebackComplete: "Writeback Complete?",
  },

  submissions: {
    name: "Submission Full Name",
    submissionAssets: "Submission Assets",
    homeworkName1: "Homework 1 Name",
    homeworkName2: "Homework 2 Name",
  },

  values: {
    uploadDestinationHomework: "Homework Completions",
    uploadedStatus: "Uploaded",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    videoKeyPrefix: "VIDEO_FEEDBACK|",
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

function getCell(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getCheckbox(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  return record.getCellValue(fieldName) === true;
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left === right;
}

function uploadedAtMs(record, table, fieldName) {
  const value = getCell(record, table, fieldName);
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function extractDriveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const firstLine = text.split(/\s+/)[0];
  const match = firstLine.match(/\/d\/([^/?#]+)/) || firstLine.match(/[?&]id=([^&]+)/);
  return match ? match[1] : firstLine;
}

function driveIdsMatch(leftId, leftUrl, rightId, rightUrl) {
  const left = extractDriveFileId(leftId) || extractDriveFileId(leftUrl);
  const right = extractDriveFileId(rightId) || extractDriveFileId(rightUrl);
  if (!left || !right) return false;
  return left === right;
}

function mapAssetUploadStatusToHomeworkStatus(assetStatus) {
  if (assetStatus === "Uploaded") return "Uploaded";
  if (assetStatus === "Processing") return "Processing";
  if (assetStatus === "Error") return "Error";
  return "Pending";
}

function buildHomeworkWritebackFields(homeworkTable, homeworkRecord, assetRecord, assetsTable) {
  const fields = {};
  const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);

  if (!CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
    return fields;
  }

  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetUploadStatus);
  const currentStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);

  if (targetStatus && targetStatus !== currentStatus && isWritableField(homeworkTable, CONFIG.homework.uploadStatus)) {
    fields[CONFIG.homework.uploadStatus] = { name: targetStatus };
  }

  const textPairs = [
    [CONFIG.homework.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.homework.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.homework.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.homework.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
  ];

  for (const [homeworkField, assetField] of textPairs) {
    if (!isWritableField(homeworkTable, homeworkField) || !fieldExists(assetsTable, assetField)) continue;
    const assetValue = getText(assetRecord, assetsTable, assetField);
    const homeworkValue = getText(homeworkRecord, homeworkTable, homeworkField);
    if (assetValue !== homeworkValue) {
      fields[homeworkField] = assetValue;
    }
  }

  if (isWritableField(homeworkTable, CONFIG.homework.uploadError)) {
    const assetError = getText(assetRecord, assetsTable, CONFIG.assets.uploadError);
    const homeworkError = getText(homeworkRecord, homeworkTable, CONFIG.homework.uploadError);
    if (assetError !== homeworkError) {
      fields[CONFIG.homework.uploadError] = assetError;
    }
  }

  const assetUploadedAt = getCell(assetRecord, assetsTable, CONFIG.assets.uploadedAt);
  const homeworkUploadedAt = getCell(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);

  if (
    assetUploadedAt &&
    !datesEqual(assetUploadedAt, homeworkUploadedAt) &&
    isWritableField(homeworkTable, CONFIG.homework.uploadedAt)
  ) {
    fields[CONFIG.homework.uploadedAt] = assetUploadedAt;
  }

  if (
    assetUploadStatus === CONFIG.values.uploadedStatus &&
    getCell(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete)
  ) {
    fields[CONFIG.homework.writebackComplete] = true;
  }

  return fields;
}

function getHomeworkSlot(homeworkRecord, homeworkTable) {
  return (
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.assetSlot) ||
    getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.itemSlot)
  );
}

function pickCanonicalAsset(linkedAssetRecords, assetsTable) {
  const uploadedClean = linkedAssetRecords.filter(asset => {
    const status = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
    const error = getText(asset, assetsTable, CONFIG.assets.uploadError);
    return status === CONFIG.values.uploadedStatus && !error;
  });

  const pool = uploadedClean.length ? uploadedClean : linkedAssetRecords;

  // Duplicate re-upload: keep latest successful upload. Homework Drive URL may still
  // point at a stale file after bad 022 writeback even when parent feedback was sent.
  return [...pool].sort(
    (left, right) =>
      uploadedAtMs(right, assetsTable, CONFIG.assets.uploadedAt) -
      uploadedAtMs(left, assetsTable, CONFIG.assets.uploadedAt)
  )[0];
}

function parseAssetIdFromVideoKey(key) {
  const text = String(key || "").trim();
  if (!text) return "";
  if (text.startsWith(CONFIG.values.videoKeyPrefix)) {
    return text.slice(CONFIG.values.videoKeyPrefix.length);
  }
  if (text.startsWith("rec")) return text;
  return "";
}

function inferHomeworkSlotFromName(homeworkName) {
  const key = String(homeworkName || "").toLowerCase();
  if (key.includes("homework 2") || key.includes("hw2")) return "HW2";
  if (key.includes("homework 1") || key.includes("hw1")) return "HW1";
  return "";
}

function findHomeworkAssetsForSlot(allAssetRecords, assetsTable, submissionId, slot) {
  return allAssetRecords.filter(asset => {
    if (getFirstLinkedId(asset, assetsTable, CONFIG.assets.submission) !== submissionId) return false;
    const destination = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
    if (destination && destination !== CONFIG.values.uploadDestinationHomework) return false;
    const assetSlot = getSelectName(asset, assetsTable, CONFIG.assets.assetSlot);
    return assetSlot === slot;
  });
}

function assetHasFile(assetRecord, assetsTable) {
  return (
    Boolean(getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl)) ||
    Boolean(getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileId))
  );
}

function matchesTargetFilter(recordId, targetIds) {
  if (!Array.isArray(targetIds) || targetIds.length === 0) return true;
  return targetIds.includes(recordId);
}

async function main() {
  if (CONFIRM_WRITE && DRY_RUN) {
    throw new Error("CONFIRM_WRITE is true but DRY_RUN is still true. Set DRY_RUN = false to apply writes.");
  }

  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const videoTable = base.getTable(CONFIG.tables.video);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const submissionFields = Object.values(CONFIG.submissions).filter(name =>
    fieldExists(submissionsTable, name)
  );

  const [assetQuery, homeworkQuery, videoQuery, submissionQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
  ]);

  const assetById = new Map(assetQuery.records.map(record => [record.id, record]));
  const planned = [];
  /** submissionId -> Set of stale asset ids to remove (merged across all homework fixes) */
  const submissionStaleRemovals = new Map();

  // --- 1. Multi-asset homework repairs ---
  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    if (!matchesTargetFilter(homeworkId, TARGET_HOMEWORK_IDS)) continue;

    const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
    if (linkedAssetIds.length < 2) continue;

    const linkedAssetRecords = linkedAssetIds
      .map(id => assetById.get(id))
      .filter(Boolean);

    if (linkedAssetRecords.length < 2) continue;

    const canonicalAsset = pickCanonicalAsset(linkedAssetRecords, assetsTable);
    if (!canonicalAsset) continue;

    const staleAssets = linkedAssetRecords.filter(record => record.id !== canonicalAsset.id);
    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);

    const homeworkFieldsUpdate = {};
    if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
      homeworkFieldsUpdate[CONFIG.homework.submissionAssets] = [{ id: canonicalAsset.id }];
    }
    Object.assign(
      homeworkFieldsUpdate,
      buildHomeworkWritebackFields(homeworkTable, homeworkRecord, canonicalAsset, assetsTable)
    );

    planned.push({
      phase: 3,
      action: "homework_multi_asset_canonical",
      table: CONFIG.tables.homework,
      recordId: homeworkId,
      name: getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
      fields: homeworkFieldsUpdate,
      meta: {
        canonicalAssetId: canonicalAsset.id,
        staleAssetIds: staleAssets.map(record => record.id),
        submissionId,
      },
      issuesAddressed: [
        "HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS",
        "TARGET_AND_ASSET_DRIVE_FILE_MISMATCH",
      ],
    });

    for (const staleAsset of staleAssets) {
      const currentHomeworkLinks = getLinkedIds(staleAsset, assetsTable, CONFIG.assets.homeworkCompletions);
      const nextHomeworkLinks = currentHomeworkLinks.filter(id => id !== homeworkId);
      const staleFields = {};
      const uploadStatus = getSelectName(staleAsset, assetsTable, CONFIG.assets.uploadStatus);

      if (
        nextHomeworkLinks.length !== currentHomeworkLinks.length &&
        isWritableField(assetsTable, CONFIG.assets.homeworkCompletions)
      ) {
        staleFields[CONFIG.assets.homeworkCompletions] = linkedCell(nextHomeworkLinks);
      }

      if (
        uploadStatus === CONFIG.values.uploadedStatus &&
        getCheckbox(staleAsset, assetsTable, CONFIG.assets.sendToMakeTrigger) &&
        isWritableField(assetsTable, CONFIG.assets.sendToMakeTrigger)
      ) {
        staleFields[CONFIG.assets.sendToMakeTrigger] = false;
      }

      if (Object.keys(staleFields).length === 0) continue;

      planned.push({
        phase: 1,
        action: "stale_asset_unlink_and_clear_trigger",
        table: CONFIG.tables.assets,
        recordId: staleAsset.id,
        name: getText(staleAsset, assetsTable, CONFIG.assets.fullName) || staleAsset.name,
        fields: staleFields,
        meta: { homeworkId },
        issuesAddressed: [
          "HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS",
          "SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD",
        ],
      });
    }

    if (submissionId && staleAssets.length > 0) {
      if (!submissionStaleRemovals.has(submissionId)) {
        submissionStaleRemovals.set(submissionId, new Set());
      }
      for (const staleAsset of staleAssets) {
        submissionStaleRemovals.get(submissionId).add(staleAsset.id);
      }
    }
  }

  for (const [submissionId, staleIds] of submissionStaleRemovals.entries()) {
    const submissionRecord = submissionQuery.getRecord(submissionId);
    if (!submissionRecord || !isWritableField(submissionsTable, CONFIG.submissions.submissionAssets)) {
      continue;
    }

    const currentSubmissionAssets = getLinkedIds(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.submissionAssets
    );
    const nextSubmissionAssets = currentSubmissionAssets.filter(id => !staleIds.has(id));

    if (nextSubmissionAssets.length === currentSubmissionAssets.length) continue;

    planned.push({
      phase: 2,
      action: "submission_remove_stale_assets",
      table: CONFIG.tables.submissions,
      recordId: submissionId,
      name: getText(submissionRecord, submissionsTable, CONFIG.submissions.name) || submissionRecord.name,
      fields: {
        [CONFIG.submissions.submissionAssets]: linkedCell(nextSubmissionAssets),
      },
      meta: {
        removedAssetIds: currentSubmissionAssets.filter(id => staleIds.has(id)),
      },
      issuesAddressed: ["HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS"],
    });
  }

  // --- 2. Send trigger on uploaded assets (not already in stale_asset plan) ---
  const sendTriggerPlannedIds = new Set(
    planned
      .filter(row => row.table === CONFIG.tables.assets && row.fields[CONFIG.assets.sendToMakeTrigger] === false)
      .map(row => row.recordId)
  );

  for (const assetRecord of assetQuery.records) {
    if (!matchesTargetFilter(assetRecord.id, TARGET_ASSET_IDS)) continue;
    if (sendTriggerPlannedIds.has(assetRecord.id)) continue;

    const uploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
    const sendTrigger = getCheckbox(assetRecord, assetsTable, CONFIG.assets.sendToMakeTrigger);

    if (uploadStatus !== CONFIG.values.uploadedStatus || !sendTrigger) continue;
    if (!isWritableField(assetsTable, CONFIG.assets.sendToMakeTrigger)) continue;

    planned.push({
      phase: 1,
      action: "clear_send_trigger",
      table: CONFIG.tables.assets,
      recordId: assetRecord.id,
      name: getText(assetRecord, assetsTable, CONFIG.assets.fullName) || assetRecord.name,
      fields: { [CONFIG.assets.sendToMakeTrigger]: false },
      issuesAddressed: ["SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD"],
    });
  }

  // --- 3. Video: parent sent without coach feedback ---
  for (const videoRecord of videoQuery.records) {
    const videoId = videoRecord.id;
    if (!matchesTargetFilter(videoId, TARGET_VIDEO_IDS)) continue;

    const coachFeedback = getText(videoRecord, videoTable, CONFIG.video.coachFeedback);
    const parentSent = getCheckbox(videoRecord, videoTable, CONFIG.video.parentFeedbackSent);
    const parentSentOn = getText(videoRecord, videoTable, CONFIG.video.parentFeedbackSentOn);

    if (!parentSent || coachFeedback) continue;

    if (parentSentOn) {
      planned.push({
        phase: 0,
        action: "manual_review_video_parent_sent_without_coach",
        table: CONFIG.tables.video,
        recordId: videoId,
        name: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
        fields: {},
        meta: { parentFeedbackSentOn: parentSentOn, reason: "Parent Feedback Sent On is set — manual review" },
        issuesAddressed: ["VIDEO_FEEDBACK_WITHOUT_COACH_FEEDBACK_BUT_PARENT_SENT"],
      });
      continue;
    }

    const fields = {};
    if (isWritableField(videoTable, CONFIG.video.parentFeedbackSent)) {
      fields[CONFIG.video.parentFeedbackSent] = false;
    }
    if (isWritableField(videoTable, CONFIG.video.parentFeedbackReady)) {
      fields[CONFIG.video.parentFeedbackReady] = false;
    }

    if (Object.keys(fields).length === 0) continue;

    planned.push({
      phase: 4,
      action: "reset_video_parent_flags_no_coach",
      table: CONFIG.tables.video,
      recordId: videoId,
      name: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
      fields,
      issuesAddressed: ["VIDEO_FEEDBACK_WITHOUT_COACH_FEEDBACK_BUT_PARENT_SENT"],
    });
  }

  // --- 4. Video: coach feedback but not posted ---
  for (const videoRecord of videoQuery.records) {
    const videoId = videoRecord.id;
    if (!matchesTargetFilter(videoId, TARGET_VIDEO_IDS)) continue;

    const coachFeedback = getText(videoRecord, videoTable, CONFIG.video.coachFeedback);
    const feedbackPosted = getCheckbox(videoRecord, videoTable, CONFIG.video.feedbackPosted);

    if (!coachFeedback || feedbackPosted) continue;
    if (!isWritableField(videoTable, CONFIG.video.feedbackPosted)) continue;

    planned.push({
      phase: 4,
      action: "set_video_feedback_posted",
      table: CONFIG.tables.video,
      recordId: videoId,
      name: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
      fields: { [CONFIG.video.feedbackPosted]: true },
      meta: {
        note: "May trigger parent email / XP automations if not already sent",
      },
      issuesAddressed: ["VIDEO_FEEDBACK_WITH_COACH_FEEDBACK_BUT_NOT_POSTED"],
    });
  }

  // --- 5. Video without submission asset ---
  for (const videoRecord of videoQuery.records) {
    const videoId = videoRecord.id;
    if (!matchesTargetFilter(videoId, TARGET_VIDEO_IDS)) continue;

    const linkedAssetIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset);
    if (linkedAssetIds.length > 0) continue;

    const key = getText(videoRecord, videoTable, CONFIG.video.key);
    const assetId = parseAssetIdFromVideoKey(key);
    if (!assetId || !assetById.has(assetId)) continue;
    if (!isWritableField(videoTable, CONFIG.video.submissionAsset)) continue;

    planned.push({
      phase: 4,
      action: "link_video_to_submission_asset",
      table: CONFIG.tables.video,
      recordId: videoId,
      name: getText(videoRecord, videoTable, CONFIG.video.name) || videoRecord.name,
      fields: { [CONFIG.video.submissionAsset]: [{ id: assetId }] },
      meta: { assetId, videoFeedbackKey: key },
      issuesAddressed: ["VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET"],
    });
  }

  // --- 6. Homework without submission asset ---
  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkId = homeworkRecord.id;
    if (!matchesTargetFilter(homeworkId, TARGET_HOMEWORK_IDS)) continue;

    const linkedAssetIds = getLinkedIds(homeworkRecord, homeworkTable, CONFIG.homework.submissionAssets);
    const uploadStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);
    const driveUrl = getText(homeworkRecord, homeworkTable, CONFIG.homework.googleDriveFileUrl);
    const inPipeline = uploadStatus || driveUrl || linkedAssetIds.length > 0;

    if (linkedAssetIds.length > 0 || !inPipeline) continue;

    const submissionId = getFirstLinkedId(homeworkRecord, homeworkTable, CONFIG.homework.submission);
    if (!submissionId) continue;

    const slot =
      getHomeworkSlot(homeworkRecord, homeworkTable) ||
      inferHomeworkSlotFromName(getText(homeworkRecord, homeworkTable, CONFIG.homework.name));

    if (!slot) continue;

    const matchingAssets = findHomeworkAssetsForSlot(assetQuery.records, assetsTable, submissionId, slot);
    const fileAssets = matchingAssets.filter(asset => assetHasFile(asset, assetsTable));

    if (fileAssets.length === 0) continue;

    const canonicalAsset = [...fileAssets].sort(
      (left, right) =>
        uploadedAtMs(right, assetsTable, CONFIG.assets.uploadedAt) -
        uploadedAtMs(left, assetsTable, CONFIG.assets.uploadedAt)
    )[0];

    const fields = {};
    if (isWritableField(homeworkTable, CONFIG.homework.submissionAssets)) {
      fields[CONFIG.homework.submissionAssets] = [{ id: canonicalAsset.id }];
    }
    Object.assign(
      fields,
      buildHomeworkWritebackFields(homeworkTable, homeworkRecord, canonicalAsset, assetsTable)
    );

    if (Object.keys(fields).length === 0) continue;

    planned.push({
      phase: 3,
      action: "homework_orphan_link_asset",
      table: CONFIG.tables.homework,
      recordId: homeworkId,
      name: getText(homeworkRecord, homeworkTable, CONFIG.homework.name) || homeworkRecord.name,
      fields,
      meta: { submissionId, slot, assetId: canonicalAsset.id },
      issuesAddressed: ["HOMEWORK_COMPLETION_WITHOUT_SUBMISSION_ASSET"],
    });
  }

  // Dedupe: same recordId + table — keep highest phase priority merge
  const deduped = new Map();
  for (const row of planned) {
    const key = `${row.table}|${row.recordId}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, { ...row, fields: { ...row.fields } });
      continue;
    }
    existing.fields = { ...existing.fields, ...row.fields };
    existing.action = `${existing.action}+${row.action}`;
    existing.issuesAddressed = [...new Set([...(existing.issuesAddressed || []), ...(row.issuesAddressed || [])])];
    existing.meta = { ...(existing.meta || {}), ...(row.meta || {}) };
  }

  const allActions = [...deduped.values()]
    .filter(row => row.phase > 0)
    .sort((left, right) => left.phase - right.phase || left.recordId.localeCompare(right.recordId));

  const manualReview = planned.filter(row => row.phase === 0);
  const batch = allActions.slice(0, BATCH_LIMIT);
  const remainingCount = Math.max(0, allActions.length - batch.length);

  const summary = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    plannedCount: allActions.length,
    batchCount: batch.length,
    remainingCount,
    manualReviewCount: manualReview.length,
    byAction: batch.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),
  };

  console.log("===== Repair Audit Linkage — Full Batch =====");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}`);
  console.log(JSON.stringify(summary, null, 2));

  if (manualReview.length > 0) {
    console.log("\n----- MANUAL REVIEW (skipped) -----");
    for (const row of manualReview) {
      console.log(JSON.stringify(row));
    }
  }

  console.log("\n----- PLANNED ACTIONS (this batch) -----");
  if (batch.length === 0) {
    console.log("(none)");
  } else {
    for (const row of batch) {
      console.log(JSON.stringify(row));
    }
  }

  if (DRY_RUN || !CONFIRM_WRITE) {
    console.log("\nTo apply: set DRY_RUN = false and CONFIRM_WRITE = true, then re-run.");
    if (remainingCount > 0) {
      console.log(`After this batch, ${remainingCount} action(s) remain — re-run until remainingCount is 0.`);
    }
    return;
  }

  const tableMap = {
    [CONFIG.tables.assets]: assetsTable,
    [CONFIG.tables.homework]: homeworkTable,
    [CONFIG.tables.video]: videoTable,
    [CONFIG.tables.submissions]: submissionsTable,
  };

  const results = [];
  for (const row of batch) {
    const table = tableMap[row.table];
    if (!table) continue;
    await table.updateRecordAsync(row.recordId, row.fields);
    results.push({ recordId: row.recordId, table: row.table, action: row.action });
  }

  console.log(
    JSON.stringify({
      status: "success",
      updatedCount: results.length,
      remainingCount,
      results,
    })
  );
}

await main();
