/*
Extension Script: Backfill Video Pipeline Links (Automation 013 + 022 logic)
System: 127 SI Shooting Challenge
Purpose:
  Creates or repairs Video Feedback records for video Submission Assets:
  missing VF rows, legacy bare-asset Video Feedback Keys, intake link gaps,
  asset ↔ VF links, and upload writeback sync from uploaded assets.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply creates/updates
  - BATCH_LIMIT caps writes per run (default 25); re-run until remainingCount is 0
  - Does NOT reset Uploaded assets to Pending Link (historical backfill safe)

Setup:
  1. Run audit-video-pipeline-integrity.js
  2. Run this script with DRY_RUN = true; review candidateCount and sample
  3. Set CONFIRM_WRITE = true and re-run until remainingCount is 0
  4. Re-run audit to confirm okCount matches videoAssetsWithFile
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const DEBUG_ASSET_ID = "";

const CONFIG = {
  scriptName: "backfill-video-pipeline-links",
  version: "v1.0",

  tables: {
    assets: "Submission Assets",
    video: "Video Feedback",
    enrollments: "Enrollments",
  },

  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    uploadDestination: "Upload Destination",
    attachment: "Airtable Attachment",
    assetType: "Asset Type",
    assetSlot: "Asset Slot",
    videoFeedback: "Video Feedback",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    originalFileName: "Original File Name",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    googleDriveViewUrl: "Google Drive View URL",
    googleDriveDownloadUrl: "Google Drive Download URL",
  },

  video: {
    key: "Video Feedback Key",
    submissionAsset: "Submission Asset",
    submission: "Submission",
    enrollment: "Enrollment",
    gradeBand: "Grade Band",
    assetType: "Asset Type",
    active: "Active?",
    workflowStatus: "Video Feedback Workflow Status",
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    videoUrlOrDriveLink: "Video URL or Drive Link",
    videoAssetFileName: "Video Asset File Name",
    videoAssetUploadedAt: "Video Asset Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    googleDriveViewUrl: "Google Drive View URL",
    googleDriveDownloadUrl: "Google Drive Download URL",
  },

  enrollment: {
    gradeBand: "Grade Band",
  },

  values: {
    uploadDestinationVideo: "Video Feedback",
    videoKeyPrefix: "VIDEO_FEEDBACK|",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    pendingLinkStatus: "Pending Link",
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

function getRaw(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
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

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function hasAttachments(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return Array.isArray(raw) && raw.length > 0;
}

function hasUploadFile(record, table) {
  return (
    hasAttachments(record, table, CONFIG.assets.attachment) ||
    Boolean(getText(record, table, CONFIG.assets.googleDriveFileUrl)) ||
    Boolean(getText(record, table, CONFIG.assets.googleDriveFileId))
  );
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function idsMatch(leftIds, rightIds) {
  const left = [...new Set(leftIds.filter(Boolean))].sort();
  const right = [...new Set(rightIds.filter(Boolean))].sort();
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

function isVideoFeedbackAsset(assetRecord, assetsTable) {
  const uploadDestination = getText(assetRecord, assetsTable, CONFIG.assets.uploadDestination);
  const assetPurpose = getText(assetRecord, assetsTable, CONFIG.assets.assetPurpose);
  const assetType = getText(assetRecord, assetsTable, CONFIG.assets.assetType);
  const assetSlot = getText(assetRecord, assetsTable, CONFIG.assets.assetSlot);

  return (
    uploadDestination === CONFIG.values.uploadDestinationVideo ||
    assetPurpose === "Video For Feedback" ||
    assetType === "Video Feedback" ||
    assetSlot === "VIDEO"
  );
}

function buildVideoFeedbackKey(assetId) {
  return `${CONFIG.values.videoKeyPrefix}${assetId}`;
}

function isLegacyVideoFeedbackKey(key, assetId) {
  return Boolean(key && assetId && key === assetId);
}

function isCanonicalVideoFeedbackKey(key, assetId) {
  return key === buildVideoFeedbackKey(assetId);
}

function getSourceKeysForAsset(assetId) {
  return [buildVideoFeedbackKey(assetId), assetId];
}

function buildVideoByKeyIndex(videoQuery, videoTable) {
  const videoByKey = new Map();
  for (const videoRecord of videoQuery.records) {
    const key = getText(videoRecord, videoTable, CONFIG.video.key);
    if (!key) continue;
    if (!videoByKey.has(key)) videoByKey.set(key, []);
    videoByKey.get(key).push(videoRecord.id);
  }
  return videoByKey;
}

function findVideoFeedbackIds(assetId, assetLinkedVideoIds, videoQuery, videoTable, videoByKey) {
  const ids = new Set();
  for (const videoId of assetLinkedVideoIds) ids.add(videoId);
  for (const sourceKey of getSourceKeysForAsset(assetId)) {
    for (const videoId of videoByKey.get(sourceKey) || []) ids.add(videoId);
  }
  for (const videoRecord of videoQuery.records) {
    if (getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId)) {
      ids.add(videoRecord.id);
    }
  }
  return [...ids];
}

function pickPrimaryVideoFeedbackId(videoIds, assetId, assetLinkedVideoIds, videoQuery, videoTable) {
  const scored = videoIds
    .map(videoId => {
      const videoRecord = videoQuery.getRecord(videoId);
      if (!videoRecord) return { videoId, score: -1 };
      const key = getText(videoRecord, videoTable, CONFIG.video.key);
      let score = 0;
      if (isCanonicalVideoFeedbackKey(key, assetId)) score = 4;
      else if (isLegacyVideoFeedbackKey(key, assetId)) score = 3;
      else if (assetLinkedVideoIds.includes(videoId)) score = 3;
      else if (getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId)) {
        score = 2;
      } else {
        score = 1;
      }
      return { videoId, score };
    })
    .filter(row => row.score >= 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.videoId || videoIds[0] || "";
}

function choiceExists(table, fieldName, choiceName) {
  if (!fieldExists(table, fieldName) || !choiceName) return false;
  try {
    const field = table.getField(fieldName);
    return field.options?.choices?.some(choice => choice.name === choiceName) === true;
  } catch {
    return false;
  }
}

function firstExistingChoice(table, fieldName, choices) {
  for (const choice of choices) {
    if (choice && choiceExists(table, fieldName, choice)) return choice;
  }
  return null;
}

function addIfWritable(fields, table, fieldName, value) {
  if (!isWritableField(table, fieldName)) return;
  if (value === undefined || value === null) return;
  fields[fieldName] = value;
}

function addTextIfChanged(fields, table, fieldName, childRecord, childTable, assetRecord, assetTable, assetFieldName) {
  if (!isWritableField(table, fieldName)) return;
  const next = getText(assetRecord, assetTable, assetFieldName);
  const current = getText(childRecord, childTable, fieldName);
  if (next !== current) fields[fieldName] = next;
}

function addSingleSelectIfChanged(fields, table, fieldName, currentName, newName) {
  if (!newName || !isWritableField(table, fieldName)) return;
  if (String(currentName || "").trim() === String(newName || "").trim()) return;
  if (!choiceExists(table, fieldName, newName)) return;
  fields[fieldName] = { name: newName };
}

function mapAssetUploadStatusToVideoStatus(assetStatus, videoTable) {
  if (assetStatus === "Uploaded") {
    return firstExistingChoice(videoTable, CONFIG.video.uploadStatus, ["Uploaded"]);
  }
  if (assetStatus === "Processing") {
    return firstExistingChoice(videoTable, CONFIG.video.uploadStatus, ["Processing"]);
  }
  if (assetStatus === "Error") {
    return firstExistingChoice(videoTable, CONFIG.video.uploadStatus, ["Error"]);
  }
  return firstExistingChoice(videoTable, CONFIG.video.uploadStatus, [
    "Pending",
    "Pending Upload",
    "Pending Link",
  ]);
}

function getVideoDriveUrl(videoRecord, videoTable) {
  return (
    getText(videoRecord, videoTable, CONFIG.video.googleDriveFileUrl) ||
    getText(videoRecord, videoTable, CONFIG.video.videoUrlOrDriveLink)
  );
}

function buildVideoUploadSyncFields(videoRecord, videoTable, assetRecord, assetsTable) {
  const fields = {};
  const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToVideoStatus(assetUploadStatus, videoTable);
  const currentStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);

  addSingleSelectIfChanged(fields, videoTable, CONFIG.video.uploadStatus, currentStatus, targetStatus);

  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFileUrl, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFileId, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveFileId);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFolderId, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveFolderId);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFolderUrl, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveFolderUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveViewUrl, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveViewUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveDownloadUrl, videoRecord, videoTable, assetRecord, assetsTable, CONFIG.assets.googleDriveDownloadUrl);

  const driveUrl = getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl);
  const currentVideoUrl = getText(videoRecord, videoTable, CONFIG.video.videoUrlOrDriveLink);
  if (driveUrl && driveUrl !== currentVideoUrl) {
    addIfWritable(fields, videoTable, CONFIG.video.videoUrlOrDriveLink, driveUrl);
  }

  const assetFileName = getText(assetRecord, assetsTable, CONFIG.assets.originalFileName);
  const currentFileName = getText(videoRecord, videoTable, CONFIG.video.videoAssetFileName);
  if (assetFileName && assetFileName !== currentFileName) {
    addIfWritable(fields, videoTable, CONFIG.video.videoAssetFileName, assetFileName);
  }

  const assetError = getText(assetRecord, assetsTable, CONFIG.assets.uploadError);
  const currentError = getText(videoRecord, videoTable, CONFIG.video.uploadError);
  if (assetError !== currentError) {
    addIfWritable(fields, videoTable, CONFIG.video.uploadError, assetError);
  }

  const assetUploadedAt = getRaw(assetRecord, assetsTable, CONFIG.assets.uploadedAt);
  const currentUploadedAt = getRaw(videoRecord, videoTable, CONFIG.video.videoAssetUploadedAt);
  if (JSON.stringify(assetUploadedAt) !== JSON.stringify(currentUploadedAt)) {
    addIfWritable(fields, videoTable, CONFIG.video.videoAssetUploadedAt, assetUploadedAt);
  }

  return fields;
}

function buildInitialVideoStatusChoices(videoTable, assetRecord, assetsTable) {
  const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
  const uploadStatus = mapAssetUploadStatusToVideoStatus(assetUploadStatus, videoTable);
  const workflowStatus = firstExistingChoice(videoTable, CONFIG.video.workflowStatus, [
    assetUploadStatus === "Uploaded" ? "Uploaded" : "",
    "Pending Upload",
    "Pending",
    "Ready",
    "Processing",
  ].filter(Boolean));

  return { uploadStatus, workflowStatus };
}

function build013LinkFields({
  videoRecord,
  videoTable,
  assetRecord,
  assetsTable,
  submissionIds,
  enrollmentIds,
  gradeBandIds,
  assetId,
  sourceKey,
}) {
  const fields = {};

  if (videoRecord) {
    const currentAssetIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset);
    const currentSubmissionIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.submission);
    const currentEnrollmentIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment);
    const currentGradeBandIds = getLinkedIds(videoRecord, videoTable, CONFIG.video.gradeBand);

    if (!idsMatch(currentAssetIds, [assetId])) {
      addIfWritable(fields, videoTable, CONFIG.video.submissionAsset, linkedCell([assetId]));
    }
    if (!idsMatch(currentSubmissionIds, submissionIds)) {
      addIfWritable(fields, videoTable, CONFIG.video.submission, linkedCell(submissionIds));
    }
    if (!idsMatch(currentEnrollmentIds, enrollmentIds)) {
      addIfWritable(fields, videoTable, CONFIG.video.enrollment, linkedCell(enrollmentIds));
    }
    if (gradeBandIds.length > 0 && !idsMatch(currentGradeBandIds, gradeBandIds)) {
      addIfWritable(fields, videoTable, CONFIG.video.gradeBand, linkedCell(gradeBandIds));
    }
    if (getText(videoRecord, videoTable, CONFIG.video.key) !== sourceKey) {
      addIfWritable(fields, videoTable, CONFIG.video.key, sourceKey);
    }
    if (fieldExists(videoTable, CONFIG.video.active) && !getBooleanish(videoRecord, videoTable, CONFIG.video.active)) {
      addIfWritable(fields, videoTable, CONFIG.video.active, true);
    }
    const currentUploadStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);
    if (!currentUploadStatus) {
      const initial = buildInitialVideoStatusChoices(videoTable, assetRecord, assetsTable);
      if (initial.uploadStatus) {
        addSingleSelectIfChanged(fields, videoTable, CONFIG.video.uploadStatus, "", initial.uploadStatus);
      }
      if (initial.workflowStatus) {
        addSingleSelectIfChanged(fields, videoTable, CONFIG.video.workflowStatus, "", initial.workflowStatus);
      }
    }
    addIfWritable(fields, videoTable, CONFIG.video.uploadError, "");
    Object.assign(fields, buildVideoUploadSyncFields(videoRecord, videoTable, assetRecord, assetsTable));
  }

  return fields;
}

function buildCreateVideoFields({
  videoTable,
  assetsTable,
  assetRecord,
  submissionIds,
  enrollmentIds,
  gradeBandIds,
  assetId,
  sourceKey,
}) {
  const fields = {};
  const assetType = getText(assetRecord, assetsTable, CONFIG.assets.assetType);

  addIfWritable(fields, videoTable, CONFIG.video.submissionAsset, linkedCell([assetId]));
  addIfWritable(fields, videoTable, CONFIG.video.submission, linkedCell(submissionIds));
  addIfWritable(fields, videoTable, CONFIG.video.enrollment, linkedCell(enrollmentIds));
  if (gradeBandIds.length > 0) {
    addIfWritable(fields, videoTable, CONFIG.video.gradeBand, linkedCell(gradeBandIds));
  }
  addIfWritable(fields, videoTable, CONFIG.video.key, sourceKey);
  addIfWritable(fields, videoTable, CONFIG.video.active, true);
  addIfWritable(fields, videoTable, CONFIG.video.uploadError, "");

  const assetTypeChoice = firstExistingChoice(videoTable, CONFIG.video.assetType, [
    assetType,
    "Video Feedback",
    "Video",
  ]);
  if (assetTypeChoice) {
    addSingleSelectIfChanged(fields, videoTable, CONFIG.video.assetType, "", assetTypeChoice);
  }

  const initial = buildInitialVideoStatusChoices(videoTable, assetRecord, assetsTable);
  if (initial.workflowStatus) {
    addSingleSelectIfChanged(fields, videoTable, CONFIG.video.workflowStatus, "", initial.workflowStatus);
  }
  if (initial.uploadStatus) {
    addSingleSelectIfChanged(fields, videoTable, CONFIG.video.uploadStatus, "", initial.uploadStatus);
  }

  const blankVideo = { getCellValue: () => null, getCellValueAsString: () => "" };
  Object.assign(
    fields,
    buildVideoUploadSyncFields(blankVideo, videoTable, assetRecord, assetsTable)
  );

  return fields;
}

async function main() {
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const videoTable = base.getTable(CONFIG.tables.video);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const assetFields = Object.values(CONFIG.assets).filter(name => fieldExists(assetsTable, name));
  const videoFields = Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name));
  const enrollmentFields = Object.values(CONFIG.enrollment).filter(name =>
    fieldExists(enrollmentsTable, name)
  );

  const [assetQuery, videoQuery, enrollmentQuery] = await Promise.all([
    assetsTable.selectRecordsAsync({ fields: assetFields }),
    videoTable.selectRecordsAsync({ fields: videoFields }),
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
  ]);

  const videoByKey = buildVideoByKeyIndex(videoQuery, videoTable);
  const gradeBandByEnrollment = new Map(
    enrollmentQuery.records.map(record => [
      record.id,
      getLinkedIds(record, enrollmentsTable, CONFIG.enrollment.gradeBand),
    ])
  );

  const skipCounts = {};
  const skipped = [];
  const candidates = [];

  for (const assetRecord of assetQuery.records) {
    if (DEBUG_ASSET_ID && assetRecord.id !== DEBUG_ASSET_ID) continue;
    if (!isVideoFeedbackAsset(assetRecord, assetsTable)) continue;
    if (!hasUploadFile(assetRecord, assetsTable)) {
      skipCounts.skipped_no_file = (skipCounts.skipped_no_file || 0) + 1;
      continue;
    }

    const assetId = assetRecord.id;
    const submissionIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.submission);
    const enrollmentIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.enrollment);
    const submissionId = submissionIds[0] || "";
    const enrollmentId = enrollmentIds[0] || "";
    const assetLinkedVideoIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback);
    const assetUploadStatus = getSelectName(assetRecord, assetsTable, CONFIG.assets.uploadStatus);
    const sourceKey = buildVideoFeedbackKey(assetId);
    const gradeBandIds = enrollmentId ? gradeBandByEnrollment.get(enrollmentId) || [] : [];

    if (!submissionId) {
      skipCounts.skipped_missing_submission = (skipCounts.skipped_missing_submission || 0) + 1;
      if (DEBUG_ASSET_ID) {
        skipped.push({ assetId, reason: "skipped_missing_submission" });
      }
      continue;
    }

    if (!enrollmentId) {
      skipCounts.skipped_missing_enrollment = (skipCounts.skipped_missing_enrollment || 0) + 1;
      if (DEBUG_ASSET_ID) {
        skipped.push({ assetId, reason: "skipped_missing_enrollment" });
      }
      continue;
    }

    const videoIds = findVideoFeedbackIds(
      assetId,
      assetLinkedVideoIds,
      videoQuery,
      videoTable,
      videoByKey
    );

    if (videoIds.length > 1) {
      skipCounts.skipped_duplicate_video_feedback = (skipCounts.skipped_duplicate_video_feedback || 0) + 1;
      skipped.push({
        assetId,
        name: assetRecord.name,
        reason: "skipped_duplicate_video_feedback",
        videoFeedbackIds: videoIds,
      });
      continue;
    }

    const existingVideoId = videoIds.length
      ? pickPrimaryVideoFeedbackId(videoIds, assetId, assetLinkedVideoIds, videoQuery, videoTable)
      : "";
    const videoRecord = existingVideoId ? videoQuery.getRecord(existingVideoId) : null;

    const needsCreate = !videoRecord;
    const actualKey = videoRecord ? getText(videoRecord, videoTable, CONFIG.video.key) : "";
    const needsKeyRepair = videoRecord && !isCanonicalVideoFeedbackKey(actualKey, assetId);
    const needsAssetLink = videoRecord && !assetLinkedVideoIds.includes(existingVideoId);
    const needsVideoAssetLink =
      videoRecord && !getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId);
    const needsSubmissionLink =
      videoRecord && !getLinkedIds(videoRecord, videoTable, CONFIG.video.submission).includes(submissionId);
    const needsEnrollmentLink =
      videoRecord && !getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment).includes(enrollmentId);
    const needsGradeBandLink =
      videoRecord &&
      gradeBandIds.length > 0 &&
      !idsMatch(getLinkedIds(videoRecord, videoTable, CONFIG.video.gradeBand), gradeBandIds);
    const needsActiveRepair =
      videoRecord &&
      fieldExists(videoTable, CONFIG.video.active) &&
      !getBooleanish(videoRecord, videoTable, CONFIG.video.active);

    let needsUploadSync = false;
    if (videoRecord && CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
      const videoUploadStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);
      if (assetUploadStatus !== videoUploadStatus) needsUploadSync = true;
      const assetDriveUrl = getText(assetRecord, assetsTable, CONFIG.assets.googleDriveFileUrl);
      if (assetUploadStatus === "Uploaded" && assetDriveUrl && !getVideoDriveUrl(videoRecord, videoTable)) {
        needsUploadSync = true;
      }
    }

    const fullySynced =
      videoRecord &&
      isCanonicalVideoFeedbackKey(actualKey, assetId) &&
      assetLinkedVideoIds.includes(existingVideoId) &&
      getLinkedIds(videoRecord, videoTable, CONFIG.video.submissionAsset).includes(assetId) &&
      getLinkedIds(videoRecord, videoTable, CONFIG.video.submission).includes(submissionId) &&
      getLinkedIds(videoRecord, videoTable, CONFIG.video.enrollment).includes(enrollmentId) &&
      (gradeBandIds.length === 0 ||
        idsMatch(getLinkedIds(videoRecord, videoTable, CONFIG.video.gradeBand), gradeBandIds)) &&
      (!fieldExists(videoTable, CONFIG.video.active) ||
        getBooleanish(videoRecord, videoTable, CONFIG.video.active)) &&
      !needsUploadSync;

    if (fullySynced) {
      skipCounts.skipped_already_synced = (skipCounts.skipped_already_synced || 0) + 1;
      continue;
    }

    let action = "";
    if (needsCreate) action = "create_video_feedback";
    else if (needsVideoAssetLink || needsSubmissionLink || needsEnrollmentLink || needsGradeBandLink || needsActiveRepair) {
      action = "repair_video_feedback_links";
    } else if (needsAssetLink) action = "link_asset_to_video_feedback";
    else if (needsKeyRepair) action = "repair_video_feedback_key";
    else if (needsUploadSync) action = "sync_upload_writeback";
    else {
      skipCounts.skipped_no_action = (skipCounts.skipped_no_action || 0) + 1;
      continue;
    }

    candidates.push({
      assetId,
      name: assetRecord.name,
      action,
      sourceKey,
      submissionId,
      enrollmentId,
      gradeBandIds,
      existingVideoFeedbackId: existingVideoId,
      assetUploadStatus,
    });
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      const assetRecord = assetQuery.getRecord(row.assetId);
      if (!assetRecord) {
        throw new Error(`Submission Asset not found: ${row.assetId}`);
      }

      const submissionIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.submission);
      const enrollmentIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.enrollment);
      let videoFeedbackId = row.existingVideoFeedbackId;

      if (row.action === "create_video_feedback") {
        const createFields = buildCreateVideoFields({
          videoTable,
          assetsTable,
          assetRecord,
          submissionIds,
          enrollmentIds,
          gradeBandIds: row.gradeBandIds,
          assetId: row.assetId,
          sourceKey: row.sourceKey,
        });

        if (!DRY_RUN && CONFIRM_WRITE) {
          videoFeedbackId = await videoTable.createRecordAsync(createFields);
        }
      } else {
        const videoRecord = videoQuery.getRecord(row.existingVideoFeedbackId);
        if (!videoRecord) {
          throw new Error(`Video Feedback not found: ${row.existingVideoFeedbackId}`);
        }

        const updateFields =
          row.action === "repair_video_feedback_key"
            ? (() => {
                const fields = { [CONFIG.video.key]: row.sourceKey };
                if (CONFIG.values.syncableAssetStatuses.includes(row.assetUploadStatus)) {
                  Object.assign(
                    fields,
                    buildVideoUploadSyncFields(videoRecord, videoTable, assetRecord, assetsTable)
                  );
                }
                return fields;
              })()
            : row.action === "sync_upload_writeback"
              ? buildVideoUploadSyncFields(videoRecord, videoTable, assetRecord, assetsTable)
              : build013LinkFields({
                  videoRecord,
                  videoTable,
                  assetRecord,
                  assetsTable,
                  submissionIds,
                  enrollmentIds,
                  gradeBandIds: row.gradeBandIds,
                  assetId: row.assetId,
                  sourceKey: row.sourceKey,
                });

        if (row.action === "repair_video_feedback_key" && Object.keys(updateFields).length === 0) {
          updateFields[CONFIG.video.key] = row.sourceKey;
        }

        if (Object.keys(updateFields).length && !DRY_RUN && CONFIRM_WRITE) {
          await videoTable.updateRecordAsync(row.existingVideoFeedbackId, updateFields);
        }
      }

      const assetUpdateFields = {};
      const currentAssetVideoIds = getLinkedIds(assetRecord, assetsTable, CONFIG.assets.videoFeedback);
      const targetVideoId = videoFeedbackId || row.existingVideoFeedbackId;
      if (targetVideoId && !currentAssetVideoIds.includes(targetVideoId)) {
        addIfWritable(
          assetUpdateFields,
          assetsTable,
          CONFIG.assets.videoFeedback,
          linkedCell([...currentAssetVideoIds, targetVideoId])
        );
      }

      if (Object.keys(assetUpdateFields).length && !DRY_RUN && CONFIRM_WRITE) {
        await assetsTable.updateRecordAsync(row.assetId, assetUpdateFields);
      }

      applied.push({
        ...row,
        videoFeedbackId: targetVideoId || "(planned)",
        dryRun: DRY_RUN || !CONFIRM_WRITE,
      });
    } catch (error) {
      errors.push({
        assetId: row.assetId,
        action: row.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const actionCounts = {};
  for (const row of candidates) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
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
    skippedCount: Object.values(skipCounts).reduce((sum, count) => sum + count, 0),
    skipCounts,
    actionCounts,
    errors,
    skippedSample: skipped.slice(0, 10),
    sample: applied.slice(0, 15),
  };

  console.log("===== BACKFILL VIDEO PIPELINE LINKS =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
