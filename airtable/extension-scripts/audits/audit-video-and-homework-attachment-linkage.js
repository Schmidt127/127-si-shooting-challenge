/*
Extension Script: AUDIT - Video and Homework Attachment Linkage
System: 127 SI Shooting Challenge
Purpose:
  Read-only audit of Submission Assets, Video Feedback, and Homework Completions
  upload linkage, writeback drift, and grading/parent-feedback workflow gaps.
  v1.2: upload/linkage issues only; no multiple-submissions or Drive-dupe noise.

Default: read-only (no writes, no creates, no deletes)

Recommended follow-up:
  audit-video-pipeline-integrity.js
  audit-homework-completion-upload-edge-cases.js
  audit-stuck-upload-processing.js
  backfill-video-pipeline-links.js / backfill-homework-completion-upload-edge-cases.js (dry run first)
*/

// @ts-nocheck

const FOCUS_NAME_PATTERNS = ["brayden"];

const ALLOWED_ISSUE_TYPES = [
  "SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED",
  "UPLOAD_STATUS_MISMATCH",
  "HOMEWORK_COMPLETION_WITHOUT_SUBMISSION_ASSET",
  "VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET",
  "SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD",
  "VIDEO_FEEDBACK_WITH_COACH_FEEDBACK_BUT_NOT_POSTED",
  "VIDEO_FEEDBACK_WITHOUT_COACH_FEEDBACK_BUT_PARENT_SENT",
  "HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS",
  "ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED",
  "TARGET_AND_ASSET_DRIVE_FILE_MISMATCH",
];

const CONFIG = {
  scriptName: "audit-video-and-homework-attachment-linkage",
  displayName: "AUDIT - Video and Homework Attachment Linkage",
  version: "v1.2",

  tables: {
    assets: "Submission Assets",
    video: "Video Feedback",
    homework: "Homework Completions",
    submissions: "Submissions",
  },

  assets: {
    fullName: "Submission Assets Full Name",
    uploadDestination: "Upload Destination",
    assetType: "Asset Type",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    sendToMakeTrigger: "Send to Make Trigger",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    uploadedAt: "Uploaded At",
    uploadError: "Upload Error",
    attachment: "Airtable Attachment",
    sourceAttachmentId: "Source Attachment ID",
    originalFileName: "Original File Name",
    writebackComplete: "Writeback Complete?",
  },

  video: {
    name: "Video Feedback Name",
    enrollment: "Enrollment",
    submission: "Submission",
    submissionAsset: "Submission Asset",
    googleDriveFileUrl: "Google Drive File URL",
    videoUrlOrDriveLink: "Video URL or Drive Link",
    googleDriveFileId: "Google Drive File ID",
    googleDriveViewUrl: "Google Drive View URL",
    googleDriveDownloadUrl: "Google Drive Download URL",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    coachFeedback: "Coach Feedback",
    feedbackPosted: "Feedback Posted?",
    parentFeedbackReady: "Parent Feedback Ready?",
    parentFeedbackSent: "Parent Feedback Sent?",
    parentFeedbackSentOn: "Parent Feedback Sent On",
    awardStatus: "Award Status",
    baseXpAwarded: "Base XP Awarded",
    xpEvents: "XP Events",
    readyForXpAutomation: "Ready for XP Automation?",
    workflowStatus: "Video Feedback Workflow Status",
    writebackComplete: "Writeback Complete?",
    activityDateLkp: "Activity Date - Lkp",
    key: "Video Feedback Key",
  },

  homework: {
    name: "Homework Completion Full Name",
    enrollment: "Enrollment",
    submission: "Submissions - Linked",
    submissionAssets: "Submission Assets",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    coachFeedback: "Coach Feedback",
    parentFeedbackSent: "Parent Feedback Sent?",
    parentFeedbackSentOn: "Parent Feedback Sent On",
    awardStatus: "Award Status",
    writebackComplete: "Writeback Complete?",
    googleDriveFileUrl: "Google Drive File URL",
    assetSlot: "Asset Slot",
  },

  submissions: {
    name: "Submission Full Name",
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    submissionAssets: "Submission Assets",
    videoFeedback: "Video Feedback",
    homeworkCompletions: "Homework Completions",
  },

  values: {
    uploadDestHomework: "Homework Completions",
    uploadDestVideo: "Video Feedback",
    syncableStatuses: ["Uploaded", "Processing", "Error"],
    uploadedStatus: "Uploaded",
    videoKeyPrefix: "VIDEO_FEEDBACK|",
  },
};

const missingFields = [];

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function noteMissingField(tableName, fieldName) {
  const key = `${tableName}.${fieldName}`;
  if (!missingFields.includes(key)) {
    missingFields.push(key);
  }
}

function getText(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return "";
  }
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return "";
  }
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return [];
  }
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getCheckbox(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return false;
  }
  return record.getCellValue(fieldName) === true;
}

function getNumberish(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return 0;
  }
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasAttachments(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return false;
  }
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function getAttachmentFilenames(record, table, fieldName, tableName = "") {
  if (!fieldExists(table, fieldName)) {
    if (tableName) noteMissingField(tableName, fieldName);
    return [];
  }
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.filename || item?.name || "").filter(Boolean);
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDriveUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/\/+$/, "").toLowerCase();
}

function extractDriveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\/d\/([^/?#]+)/) || text.match(/[?&]id=([^&]+)/);
  return match ? match[1] : text;
}

function driveFilesMismatch(assetFileId, assetFileUrl, targetFileId, targetFileUrl) {
  const assetId = extractDriveFileId(assetFileId) || extractDriveFileId(assetFileUrl);
  const targetId = extractDriveFileId(targetFileId) || extractDriveFileId(targetFileUrl);
  if (assetId && targetId) return assetId !== targetId;

  const assetUrl = normalizeDriveUrl(assetFileUrl);
  const targetUrl = normalizeDriveUrl(targetFileUrl);
  return Boolean(assetUrl && targetUrl && assetUrl !== targetUrl);
}

function containsFocusName(...values) {
  const haystack = values.map(value => normalizeKey(value)).join(" ");
  return FOCUS_NAME_PATTERNS.some(pattern => haystack.includes(pattern));
}

function assetTypeMatchesScope(record, table) {
  const fieldName = CONFIG.assets.assetType;
  if (!fieldExists(table, fieldName)) {
    noteMissingField(CONFIG.tables.assets, fieldName);
    return false;
  }

  const raw = record.getCellValue(fieldName);
  const values = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item?.name) values.push(String(item.name));
    }
  }

  const text = values.length
    ? values.join(" ")
    : getText(record, table, fieldName, CONFIG.tables.assets);
  const key = normalizeKey(text);
  return key.includes("video feedback") || key.includes("homework");
}

function uploadDestinationMatchesScope(record, table) {
  const destination = getText(record, table, CONFIG.assets.uploadDestination, CONFIG.tables.assets);
  return (
    destination === CONFIG.values.uploadDestVideo ||
    destination === CONFIG.values.uploadDestHomework
  );
}

function isScopedSubmissionAsset(record, table) {
  if (!assetTypeMatchesScope(record, table)) return false;
  if (!uploadDestinationMatchesScope(record, table)) return false;
  if (!hasAttachments(record, table, CONFIG.assets.attachment, CONFIG.tables.assets)) return false;

  const driveUrl = getText(record, table, CONFIG.assets.googleDriveFileUrl, CONFIG.tables.assets);
  const driveId = getText(record, table, CONFIG.assets.googleDriveFileId, CONFIG.tables.assets);
  const uploadStatus = getSelectName(record, table, CONFIG.assets.uploadStatus, CONFIG.tables.assets);
  const hasDriveOrStatus = Boolean(driveUrl || driveId || uploadStatus);
  if (!hasDriveOrStatus) return false;

  const homeworkIds = getLinkedIds(
    record,
    table,
    CONFIG.assets.homeworkCompletions,
    CONFIG.tables.assets
  );
  const videoIds = getLinkedIds(record, table, CONFIG.assets.videoFeedback, CONFIG.tables.assets);
  return homeworkIds.length > 0 || videoIds.length > 0;
}

function isHomeworkAsset(record, table) {
  return (
    getText(record, table, CONFIG.assets.uploadDestination, CONFIG.tables.assets) ===
    CONFIG.values.uploadDestHomework
  );
}

function isVideoAsset(record, table) {
  return (
    getText(record, table, CONFIG.assets.uploadDestination, CONFIG.tables.assets) ===
    CONFIG.values.uploadDestVideo
  );
}

function getVideoDriveUrl(videoRecord, videoTable) {
  return (
    getText(videoRecord, videoTable, CONFIG.video.googleDriveFileUrl, CONFIG.tables.video) ||
    getText(videoRecord, videoTable, CONFIG.video.videoUrlOrDriveLink, CONFIG.tables.video)
  );
}

function pushIssue(issues, issueCounts, issueType, row) {
  if (!ALLOWED_ISSUE_TYPES.includes(issueType)) return;
  issueCounts[issueType] = (issueCounts[issueType] || 0) + 1;
  issues.push({ issueType, ...row });
}

function collectExistingFields(table, fieldNames, tableName) {
  return fieldNames.filter(name => {
    if (fieldExists(table, name)) return true;
    noteMissingField(tableName, name);
    return false;
  });
}

function describeSubmissionAsset(record, table) {
  return {
    recordId: record.id,
    submissionAssetsFullName:
      getText(record, table, CONFIG.assets.fullName, CONFIG.tables.assets) || record.name,
    uploadDestination: getText(record, table, CONFIG.assets.uploadDestination, CONFIG.tables.assets),
    assetType: getText(record, table, CONFIG.assets.assetType, CONFIG.tables.assets),
    assetPurpose: getSelectName(record, table, CONFIG.assets.assetPurpose, CONFIG.tables.assets),
    assetSlot: getSelectName(record, table, CONFIG.assets.assetSlot, CONFIG.tables.assets),
    submissionLinked: getLinkedIds(record, table, CONFIG.assets.submission, CONFIG.tables.assets),
    enrollmentLinked: getLinkedIds(record, table, CONFIG.assets.enrollment, CONFIG.tables.assets),
    homeworkCompletions: getLinkedIds(
      record,
      table,
      CONFIG.assets.homeworkCompletions,
      CONFIG.tables.assets
    ),
    videoFeedback: getLinkedIds(record, table, CONFIG.assets.videoFeedback, CONFIG.tables.assets),
    uploadStatus: getSelectName(record, table, CONFIG.assets.uploadStatus, CONFIG.tables.assets),
    sendToMakeTrigger: getCheckbox(
      record,
      table,
      CONFIG.assets.sendToMakeTrigger,
      CONFIG.tables.assets
    ),
    googleDriveFileUrl: getText(record, table, CONFIG.assets.googleDriveFileUrl, CONFIG.tables.assets),
    googleDriveFileId: getText(record, table, CONFIG.assets.googleDriveFileId, CONFIG.tables.assets),
    googleDriveFolderId: getText(
      record,
      table,
      CONFIG.assets.googleDriveFolderId,
      CONFIG.tables.assets
    ),
    googleDriveFolderUrl: getText(
      record,
      table,
      CONFIG.assets.googleDriveFolderUrl,
      CONFIG.tables.assets
    ),
    uploadedAt: getText(record, table, CONFIG.assets.uploadedAt, CONFIG.tables.assets),
    uploadError: getText(record, table, CONFIG.assets.uploadError, CONFIG.tables.assets),
    writebackComplete: getText(record, table, CONFIG.assets.writebackComplete, CONFIG.tables.assets),
    attachmentFilenames: getAttachmentFilenames(
      record,
      table,
      CONFIG.assets.attachment,
      CONFIG.tables.assets
    ),
    sourceAttachmentId: getText(
      record,
      table,
      CONFIG.assets.sourceAttachmentId,
      CONFIG.tables.assets
    ),
    originalFileName: getText(record, table, CONFIG.assets.originalFileName, CONFIG.tables.assets),
    lastModifiedTime: record.lastModifiedTime || "",
  };
}

function describeVideoFeedback(record, table) {
  return {
    recordId: record.id,
    videoFeedbackName: getText(record, table, CONFIG.video.name, CONFIG.tables.video) || record.name,
    enrollment: getLinkedIds(record, table, CONFIG.video.enrollment, CONFIG.tables.video),
    submission: getLinkedIds(record, table, CONFIG.video.submission, CONFIG.tables.video),
    submissionAsset: getLinkedIds(record, table, CONFIG.video.submissionAsset, CONFIG.tables.video),
    googleDriveFileUrl: getText(record, table, CONFIG.video.googleDriveFileUrl, CONFIG.tables.video),
    videoUrlOrDriveLink: getText(
      record,
      table,
      CONFIG.video.videoUrlOrDriveLink,
      CONFIG.tables.video
    ),
    googleDriveFileId: getText(record, table, CONFIG.video.googleDriveFileId, CONFIG.tables.video),
    googleDriveViewUrl: getText(record, table, CONFIG.video.googleDriveViewUrl, CONFIG.tables.video),
    googleDriveDownloadUrl: getText(
      record,
      table,
      CONFIG.video.googleDriveDownloadUrl,
      CONFIG.tables.video
    ),
    uploadStatus: getSelectName(record, table, CONFIG.video.uploadStatus, CONFIG.tables.video),
    uploadError: getText(record, table, CONFIG.video.uploadError, CONFIG.tables.video),
    coachFeedback: getText(record, table, CONFIG.video.coachFeedback, CONFIG.tables.video),
    feedbackPosted: getCheckbox(record, table, CONFIG.video.feedbackPosted, CONFIG.tables.video),
    parentFeedbackReady: getCheckbox(
      record,
      table,
      CONFIG.video.parentFeedbackReady,
      CONFIG.tables.video
    ),
    parentFeedbackSent: getCheckbox(
      record,
      table,
      CONFIG.video.parentFeedbackSent,
      CONFIG.tables.video
    ),
    parentFeedbackSentOn: getText(
      record,
      table,
      CONFIG.video.parentFeedbackSentOn,
      CONFIG.tables.video
    ),
    awardStatus: getSelectName(record, table, CONFIG.video.awardStatus, CONFIG.tables.video),
    baseXpAwarded: getNumberish(record, table, CONFIG.video.baseXpAwarded, CONFIG.tables.video),
    xpEvents: getLinkedIds(record, table, CONFIG.video.xpEvents, CONFIG.tables.video),
    readyForXpAutomation: getCheckbox(
      record,
      table,
      CONFIG.video.readyForXpAutomation,
      CONFIG.tables.video
    ),
    videoFeedbackWorkflowStatus: getSelectName(
      record,
      table,
      CONFIG.video.workflowStatus,
      CONFIG.tables.video
    ),
    writebackComplete: getText(record, table, CONFIG.video.writebackComplete, CONFIG.tables.video),
    activityDateLkp: getText(record, table, CONFIG.video.activityDateLkp, CONFIG.tables.video),
    videoFeedbackKey: getText(record, table, CONFIG.video.key, CONFIG.tables.video),
    lastModifiedTime: record.lastModifiedTime || "",
  };
}

function describeHomeworkCompletion(record, table) {
  return {
    recordId: record.id,
    homeworkCompletionName:
      getText(record, table, CONFIG.homework.name, CONFIG.tables.homework) || record.name,
    enrollment: getLinkedIds(record, table, CONFIG.homework.enrollment, CONFIG.tables.homework),
    submission: getLinkedIds(record, table, CONFIG.homework.submission, CONFIG.tables.homework),
    submissionAssets: getLinkedIds(
      record,
      table,
      CONFIG.homework.submissionAssets,
      CONFIG.tables.homework
    ),
    uploadStatus: getSelectName(record, table, CONFIG.homework.uploadStatus, CONFIG.tables.homework),
    uploadError: getText(record, table, CONFIG.homework.uploadError, CONFIG.tables.homework),
    coachFeedback: getText(record, table, CONFIG.homework.coachFeedback, CONFIG.tables.homework),
    parentFeedbackSent: getCheckbox(
      record,
      table,
      CONFIG.homework.parentFeedbackSent,
      CONFIG.tables.homework
    ),
    parentFeedbackSentOn: getText(
      record,
      table,
      CONFIG.homework.parentFeedbackSentOn,
      CONFIG.tables.homework
    ),
    awardStatus: getSelectName(record, table, CONFIG.homework.awardStatus, CONFIG.tables.homework),
    writebackComplete: getText(
      record,
      table,
      CONFIG.homework.writebackComplete,
      CONFIG.tables.homework
    ),
    googleDriveFileUrl: getText(
      record,
      table,
      CONFIG.homework.googleDriveFileUrl,
      CONFIG.tables.homework
    ),
    assetSlot: getSelectName(record, table, CONFIG.homework.assetSlot, CONFIG.tables.homework),
    lastModifiedTime: record.lastModifiedTime || "",
  };
}

function describeSubmission(record, table) {
  return {
    recordId: record.id,
    submissionName:
      getText(record, table, CONFIG.submissions.name, CONFIG.tables.submissions) || record.name,
    enrollment: getLinkedIds(record, table, CONFIG.submissions.enrollment, CONFIG.tables.submissions),
    activityDate: getText(record, table, CONFIG.submissions.activityDate, CONFIG.tables.submissions),
    submissionAssets: getLinkedIds(
      record,
      table,
      CONFIG.submissions.submissionAssets,
      CONFIG.tables.submissions
    ),
    videoFeedback: getLinkedIds(
      record,
      table,
      CONFIG.submissions.videoFeedback,
      CONFIG.tables.submissions
    ),
    homeworkCompletions: getLinkedIds(
      record,
      table,
      CONFIG.submissions.homeworkCompletions,
      CONFIG.tables.submissions
    ),
  };
}

function findVideoFeedbackIdsForAsset(assetId, assetLinkedVideoIds, videoQuery, videoTable, videoByKey) {
  const ids = new Set(assetLinkedVideoIds);

  const canonicalKey = `${CONFIG.values.videoKeyPrefix}${assetId}`;
  for (const key of [canonicalKey, assetId]) {
    for (const videoId of videoByKey.get(key) || []) {
      ids.add(videoId);
    }
  }

  for (const videoRecord of videoQuery.records) {
    if (
      getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset, CONFIG.tables.video).includes(
        assetId
      )
    ) {
      ids.add(videoRecord.id);
    }
  }

  return [...ids];
}

function buildVideoByKeyIndex(videoQuery, videoTable) {
  const videoByKey = new Map();
  for (const videoRecord of videoQuery.records) {
    const key = getText(videoRecord, videoTable, CONFIG.video.key, CONFIG.tables.video);
    if (!key) continue;
    if (!videoByKey.has(key)) videoByKey.set(key, []);
    videoByKey.get(key).push(videoRecord.id);
  }
  return videoByKey;
}

function auditAssetTargetWriteback(bump, assetReport, uploadStatus, targetTable, targetRecordId, targetRecord, targetTableObj, targetFields) {
  const targetStatus = getSelectName(
    targetRecord,
    targetTableObj,
    targetFields.uploadStatus,
    targetTable
  );
  const targetDriveUrl = targetFields.getDriveUrl(targetRecord, targetTableObj);
  const targetDriveId = targetFields.getDriveId
    ? targetFields.getDriveId(targetRecord, targetTableObj)
    : "";

  const assetUploaded = normalizeKey(uploadStatus) === normalizeKey(CONFIG.values.uploadedStatus);
  const targetUploaded = normalizeKey(targetStatus) === normalizeKey(CONFIG.values.uploadedStatus);

  if (assetUploaded && assetReport.googleDriveFileUrl && !targetUploaded) {
    bump("SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED", {
      table: CONFIG.tables.assets,
      recordId: assetReport.recordId,
      name: assetReport.submissionAssetsFullName,
      targetTable,
      targetRecordId,
      assetUploadStatus: uploadStatus,
      targetUploadStatus: targetStatus,
    });
  }

  if (
    CONFIG.values.syncableStatuses.includes(uploadStatus) &&
    targetStatus &&
    uploadStatus !== targetStatus
  ) {
    bump("UPLOAD_STATUS_MISMATCH", {
      table: CONFIG.tables.assets,
      recordId: assetReport.recordId,
      name: assetReport.submissionAssetsFullName,
      targetTable,
      targetRecordId,
      assetUploadStatus: uploadStatus,
      targetUploadStatus: targetStatus,
    });
  }

  if (
    assetUploaded &&
    targetUploaded &&
    (assetReport.googleDriveFileId || assetReport.googleDriveFileUrl) &&
    (targetDriveId || targetDriveUrl) &&
    driveFilesMismatch(
      assetReport.googleDriveFileId,
      assetReport.googleDriveFileUrl,
      targetDriveId,
      targetDriveUrl
    )
  ) {
    bump("TARGET_AND_ASSET_DRIVE_FILE_MISMATCH", {
      table: CONFIG.tables.assets,
      recordId: assetReport.recordId,
      name: assetReport.submissionAssetsFullName,
      targetTable,
      targetRecordId,
      assetGoogleDriveFileId: assetReport.googleDriveFileId,
      assetGoogleDriveFileUrl: assetReport.googleDriveFileUrl,
      targetGoogleDriveFileId: targetDriveId,
      targetGoogleDriveFileUrl: targetDriveUrl,
    });
  }
}

function buildSafeCleanupRecommendations(issueCounts) {
  const recommendations = [];

  if (
    issueCounts.UPLOAD_STATUS_MISMATCH ||
    issueCounts.SUBMISSION_ASSET_UPLOAD_COMPLETE_BUT_TARGET_NOT_UPDATED ||
    issueCounts.TARGET_AND_ASSET_DRIVE_FILE_MISMATCH
  ) {
    recommendations.push(
      "Upload writeback drift: re-run Automation 022 on the Submission Asset or use backfill-video-pipeline-links.js / backfill-homework-completion-upload-status.js (dry run first)."
    );
  }

  if (issueCounts.ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED) {
    recommendations.push(
      "Assets marked Uploaded with a non-empty Upload Error: confirm Drive has the correct file, then clear the stale error or re-run 070a/070b + 022 if the upload did not finish cleanly."
    );
  }

  if (issueCounts.HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS) {
    recommendations.push(
      "Homework Completions linked to multiple Submission Assets: keep the asset with the latest successful upload; unlink or archive the extra asset after confirming parent feedback and Drive file."
    );
  }

  if (issueCounts.VIDEO_FEEDBACK_WITHOUT_COACH_FEEDBACK_BUT_PARENT_SENT) {
    recommendations.push(
      "Video Feedback with Parent Feedback Sent? but empty Coach Feedback: identify which row received the email vs which row still appears in grading. Unlink or archive the stale grading-queue row after confirming the sent row."
    );
  }

  if (issueCounts.VIDEO_FEEDBACK_WITH_COACH_FEEDBACK_BUT_NOT_POSTED) {
    recommendations.push(
      "Coach feedback filled but Feedback Posted? is false: complete the posting workflow so parent email and XP can proceed."
    );
  }

  if (issueCounts.SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD) {
    recommendations.push(
      "Uncheck Send to Make Trigger on Uploaded assets only after confirming Make finished (070a/070b clears on success). Stale checked triggers can cause duplicate webhook attempts."
    );
  }

  if (issueCounts.HOMEWORK_COMPLETION_WITHOUT_SUBMISSION_ASSET) {
    recommendations.push(
      "Homework Completions without assets may be pre-upload placeholders. Run audit-homework-completion-upload-edge-cases.js and backfill-homework-completion-orphan-resolve.js if files exist elsewhere."
    );
  }

  if (issueCounts.VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET) {
    recommendations.push(
      "Video Feedback without a linked Submission Asset: verify Video Feedback Key points to a valid asset; run backfill-video-pipeline-links.js (dry run first) or link manually."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("No automated cleanup recommended from flagged issue types. Re-run after any manual fixes.");
  }

  return recommendations;
}

function printIssueCountsTable(issueCounts) {
  const rows = ALLOWED_ISSUE_TYPES.map(issueType => [issueType, issueCounts[issueType] || 0]).filter(
    ([, count]) => count > 0
  );
  rows.sort((left, right) => right[1] - left[1]);

  console.log("\n----- ISSUE COUNTS -----");
  if (rows.length === 0) {
    console.log("(none)");
    return;
  }
  for (const [issueType, count] of rows) {
    console.log(`${issueType}: ${count}`);
  }
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.video);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);

  const assetFields = collectExistingFields(
    assetsTable,
    Object.values(CONFIG.assets),
    CONFIG.tables.assets
  );
  const videoFields = collectExistingFields(
    videoTable,
    Object.values(CONFIG.video),
    CONFIG.tables.video
  );
  const homeworkFields = collectExistingFields(
    homeworkTable,
    Object.values(CONFIG.homework),
    CONFIG.tables.homework
  );
  const submissionFields = collectExistingFields(
    submissionsTable,
    Object.values(CONFIG.submissions),
    CONFIG.tables.submissions
  );

  const [assetQuery, videoQuery, homeworkQuery, submissionQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    submissionsTable.selectRecordsAsync({ fields: submissionFields }),
  ]);

  const videoByKey = buildVideoByKeyIndex(videoQuery, videoTable);
  const issueCounts = {};
  const issues = [];
  const scopedAssets = [];
  const videoFeedbackReports = [];
  const homeworkReports = [];
  const homeworkById = new Map(homeworkQuery.records.map(record => [record.id, record]));
  const submissionById = new Map(submissionQuery.records.map(record => [record.id, record]));

  function bump(issueType, row) {
    pushIssue(issues, issueCounts, issueType, row);
  }

  for (const assetRecord of assetQuery.records) {
    if (!isScopedSubmissionAsset(assetRecord, assetsTable)) continue;

    const assetReport = describeSubmissionAsset(assetRecord, assetsTable);
    scopedAssets.push(assetReport);

    const uploadStatus = assetReport.uploadStatus;
    const uploadError = assetReport.uploadError;
    const sendTrigger = assetReport.sendToMakeTrigger;

    if (
      normalizeKey(uploadStatus) === normalizeKey(CONFIG.values.uploadedStatus) &&
      uploadError
    ) {
      bump("ASSET_HAS_UPLOAD_ERROR_BUT_STATUS_UPLOADED", {
        table: CONFIG.tables.assets,
        recordId: assetReport.recordId,
        name: assetReport.submissionAssetsFullName,
        uploadStatus,
        uploadError,
      });
    }

    if (
      normalizeKey(uploadStatus) === normalizeKey(CONFIG.values.uploadedStatus) &&
      sendTrigger
    ) {
      bump("SEND_TRIGGER_STILL_CHECKED_AFTER_UPLOAD", {
        table: CONFIG.tables.assets,
        recordId: assetReport.recordId,
        name: assetReport.submissionAssetsFullName,
        uploadStatus,
      });
    }

    if (isVideoAsset(assetRecord, assetsTable)) {
      const linkedVideoIds = findVideoFeedbackIdsForAsset(
        assetReport.recordId,
        assetReport.videoFeedback,
        videoQuery,
        videoTable,
        videoByKey
      );

      for (const videoId of linkedVideoIds) {
        const videoRecord = videoQuery.getRecord(videoId);
        if (!videoRecord) continue;

        auditAssetTargetWriteback(bump, assetReport, uploadStatus, CONFIG.tables.video, videoId, videoRecord, videoTable, {
          uploadStatus: CONFIG.video.uploadStatus,
          getDriveUrl: getVideoDriveUrl,
          getDriveId: (record, table) =>
            getText(record, table, CONFIG.video.googleDriveFileId, CONFIG.tables.video),
        });
      }
    }

    if (isHomeworkAsset(assetRecord, assetsTable) && assetReport.homeworkCompletions.length > 0) {
      for (const homeworkId of assetReport.homeworkCompletions) {
        const homeworkRecord = homeworkById.get(homeworkId);
        if (!homeworkRecord) continue;

        auditAssetTargetWriteback(
          bump,
          assetReport,
          uploadStatus,
          CONFIG.tables.homework,
          homeworkId,
          homeworkRecord,
          homeworkTable,
          {
            uploadStatus: CONFIG.homework.uploadStatus,
            getDriveUrl: (record, table) =>
              getText(record, table, CONFIG.homework.googleDriveFileUrl, CONFIG.tables.homework),
          }
        );
      }
    }
  }

  for (const videoRecord of videoQuery.records) {
    const videoReport = describeVideoFeedback(videoRecord, videoTable);
    videoFeedbackReports.push(videoReport);

    const coachFeedback = videoReport.coachFeedback;
    const parentSent = videoReport.parentFeedbackSent;
    const feedbackPosted = videoReport.feedbackPosted;

    if (parentSent && !coachFeedback) {
      bump("VIDEO_FEEDBACK_WITHOUT_COACH_FEEDBACK_BUT_PARENT_SENT", {
        table: CONFIG.tables.video,
        recordId: videoReport.recordId,
        name: videoReport.videoFeedbackName,
        parentFeedbackSentOn: videoReport.parentFeedbackSentOn,
        submissionAssetIds: videoReport.submissionAsset,
      });
    }

    if (coachFeedback && !feedbackPosted) {
      bump("VIDEO_FEEDBACK_WITH_COACH_FEEDBACK_BUT_NOT_POSTED", {
        table: CONFIG.tables.video,
        recordId: videoReport.recordId,
        name: videoReport.videoFeedbackName,
      });
    }

    if (videoReport.submissionAsset.length === 0) {
      bump("VIDEO_FEEDBACK_WITHOUT_SUBMISSION_ASSET", {
        table: CONFIG.tables.video,
        recordId: videoReport.recordId,
        name: videoReport.videoFeedbackName,
        videoFeedbackKey: videoReport.videoFeedbackKey,
      });
    }
  }

  for (const homeworkRecord of homeworkQuery.records) {
    const homeworkReport = describeHomeworkCompletion(homeworkRecord, homeworkTable);
    homeworkReports.push(homeworkReport);

    const linkedAssets = homeworkReport.submissionAssets;
    const inPipeline =
      homeworkReport.uploadStatus ||
      homeworkReport.googleDriveFileUrl ||
      linkedAssets.length > 0;

    if (linkedAssets.length === 0 && inPipeline) {
      bump("HOMEWORK_COMPLETION_WITHOUT_SUBMISSION_ASSET", {
        table: CONFIG.tables.homework,
        recordId: homeworkReport.recordId,
        name: homeworkReport.homeworkCompletionName,
        uploadStatus: homeworkReport.uploadStatus,
      });
    }

    if (linkedAssets.length > 1) {
      bump("HOMEWORK_COMPLETION_LINKED_TO_MULTIPLE_ASSETS", {
        table: CONFIG.tables.homework,
        recordId: homeworkReport.recordId,
        name: homeworkReport.homeworkCompletionName,
        submissionAssetIds: linkedAssets,
        count: linkedAssets.length,
      });
    }
  }

  const focusSection = {
    submissionAssets: scopedAssets.filter(asset =>
      containsFocusName(asset.submissionAssetsFullName)
    ),
    videoFeedback: videoFeedbackReports.filter(video =>
      containsFocusName(video.videoFeedbackName)
    ),
    homeworkCompletions: homeworkReports.filter(hw =>
      containsFocusName(hw.homeworkCompletionName)
    ),
    submissions: [],
  };

  const focusSubmissionIds = new Set();
  for (const asset of focusSection.submissionAssets) {
    for (const submissionId of asset.submissionLinked) focusSubmissionIds.add(submissionId);
  }
  for (const video of focusSection.videoFeedback) {
    for (const submissionId of video.submission) focusSubmissionIds.add(submissionId);
  }
  for (const hw of focusSection.homeworkCompletions) {
    for (const submissionId of hw.submission) focusSubmissionIds.add(submissionId);
  }

  for (const submissionId of focusSubmissionIds) {
    const submissionRecord = submissionById.get(submissionId);
    if (submissionRecord) {
      focusSection.submissions.push(describeSubmission(submissionRecord, submissionsTable));
    }
  }

  for (const submissionRecord of submissionQuery.records) {
    const submissionReport = describeSubmission(submissionRecord, submissionsTable);
    if (containsFocusName(submissionReport.submissionName)) {
      if (!focusSection.submissions.some(row => row.recordId === submissionReport.recordId)) {
        focusSection.submissions.push(submissionReport);
      }
    }
  }

  const safeCleanupRecommendations = buildSafeCleanupRecommendations(issueCounts);

  console.log(`===== ${CONFIG.displayName} =====`);
  console.log(`Script: ${CONFIG.scriptName} ${CONFIG.version}`);
  console.log("Mode: READ-ONLY (no record changes)");

  console.log("\n----- BRAYDEN ELDERS -----");
  console.log(JSON.stringify(focusSection, null, 2));

  printIssueCountsTable(issueCounts);

  console.log("\n----- DETAILED ISSUES -----");
  if (issues.length === 0) {
    console.log("(none)");
  } else {
    for (const issue of issues) {
      console.log(JSON.stringify(issue));
    }
  }

  console.log("\n----- SAFE CLEANUP RECOMMENDATIONS (manual only) -----");
  for (const recommendation of safeCleanupRecommendations) {
    console.log(`- ${recommendation}`);
  }
}

await main();
