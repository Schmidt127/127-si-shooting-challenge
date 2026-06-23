/*
Automation: 022 - Submission Intake - Sync Child Upload Writeback from Submission Asset
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-06-21

Purpose:
Syncs Homework Completion or Video Feedback upload writeback fields from a Submission Asset after Make updates the asset.

Trigger:
Submission Assets when Upload Status is Uploaded, Processing, or Error and a child record is linked.

Important Tables:
Submission Assets, Homework Completions, Video Feedback

Important Fields:
Upload Status, Google Drive File URL, Upload Error, Uploaded At, Writeback Complete?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 022 - SUBMISSION INTAKE
 * Sync Child Upload Writeback from Submission Asset
 *
 * Version: v1.1
 * Date Written: 2026-06-21
 * Last Updated: 2026-06-21
 *
 * PURPOSE
 * - Runs from one Submission Assets record after Make (or 070a/070b) updates upload state.
 * - Copies upload status, Drive URLs/IDs, upload error, and uploaded-at from the asset
 *   to the linked Homework Completion or Video Feedback child record.
 * - Submission Assets remain the upload pipeline source of truth; this keeps child tables in sync.
 *
 * IMPORTANT DESIGN RULES
 * - Idempotent: only writes fields that differ from the asset source.
 * - Does not create Homework Completions or Video Feedback (020 / 013 own that).
 * - Does not send to Make or change asset Upload Status.
 * - Skips when asset is still Pending Link (nothing to write back yet).
 *
 * FOLDER
 * - 02 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 022 - Submission Intake - Sync Child Upload Writeback from Submission Asset
 *
 * TRIGGER TABLE
 * - Submission Assets
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Upload Status is Uploaded or Processing or Error
 * - Upload Destination is Homework Completions or Video Feedback
 * - Homework Completions is not empty OR Video Feedback is not empty
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Google Drive File URL is not empty (Uploaded path)
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Upload Status is Pending Link (020/013 set child Pending at create; no post-Make data yet)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = synced_homework | synced_video | skipped_* | error
 * - errorOut
 * - debugStep
 * - submissionAssetId, childRecordId, childTable, uploadDestination
 *
 * PRIMARY TABLES USED
 * - Submission Assets (trigger / read)
 * - Homework Completions (write when Upload Destination = Homework Completions)
 * - Video Feedback (write when Upload Destination = Video Feedback)
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions → Upload Status, Drive fields, Upload Error, Uploaded At, Writeback Complete?
 * - Video Feedback → Upload Status, Drive fields, Video URL or Drive Link, Upload Error, Video Asset Uploaded At
 *
 * IMPORTANT NOTES
 * - This is not the homework link automation (020).
 * - This is not the video feedback prep automation (013).
 * - This is not the Make send automation (070a / 070b).
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "022 - Submission Intake - Sync Child Upload Writeback from Submission Asset",
  version: "v1.1",

  tables: {
    assets: "Submission Assets",
    homework: "Homework Completions",
    video: "Video Feedback",
  },

  assets: {
    uploadDestination: "Upload Destination",
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
    homeworkCompletions: "Homework Completions",
    videoFeedback: "Video Feedback",
  },

  homework: {
    uploadStatus: "Upload Status",
    uploadError: "Upload Error",
    uploadedAt: "Uploaded At",
    googleDriveFileUrl: "Google Drive File URL",
    googleDriveFileId: "Google Drive File ID",
    googleDriveFolderId: "Google Drive Folder ID",
    googleDriveFolderUrl: "Google Drive Folder URL",
    writebackComplete: "Writeback Complete?",
  },

  video: {
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

  values: {
    uploadDestinationHomework: "Homework Completions",
    uploadDestinationVideo: "Video Feedback",
    syncableAssetStatuses: ["Uploaded", "Processing", "Error"],
    pendingLinkStatus: "Pending Link",
  },

  outputStatuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
};

let assetsTable = null;
let homeworkTable = null;
let videoTable = null;

const fieldCache = new Map();

/* =========================================================
   SECTION 2 — HELPERS
========================================================= */

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped outputs.
  }
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  const tableName = table.name || "unknown-table";
  const cacheKey = `${tableName}:${fieldName}`;

  if (fieldCache.has(cacheKey)) {
    return fieldCache.get(cacheKey);
  }

  try {
    const field = table.getField(fieldName);
    fieldCache.set(cacheKey, field);
    return field;
  } catch {
    fieldCache.set(cacheKey, null);
    return null;
  }
}

function fieldExists(table, fieldName) {
  return !!getFieldSafe(table, fieldName);
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
  }
}

function fieldHasType(table, fieldName, allowedTypes) {
  const field = getFieldSafe(table, fieldName);
  return !!field && allowedTypes.includes(field.type);
}

function requireFieldType(table, fieldName, allowedTypes) {
  requireField(table, fieldName);

  const field = getFieldSafe(table, fieldName);

  if (!allowedTypes.includes(field.type)) {
    throw new Error(
      `Field ${table.name}.${fieldName} has type "${field.type}" but expected one of: ${allowedTypes.join(", ")}`
    );
  }
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;

  if (field.isComputed === true) {
    return false;
  }

  const nonWritableTypes = new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "createdBy",
    "lastModifiedBy",
    "autoNumber",
    "button",
    "aiText",
    "externalSyncSource",
  ]);

  return !nonWritableTypes.has(field.type);
}

function requireWritableField(table, fieldName) {
  requireField(table, fieldName);

  if (!isWritableField(table, fieldName)) {
    throw new Error(`Field ${table.name}.${fieldName} exists but is not writable.`);
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function singleSelectOptionExists(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);

  if (!field || field.type !== "singleSelect") {
    return true;
  }

  return field.options?.choices?.some(
    choice => normalizeText(choice?.name) === normalizeText(optionName)
  ) === true;
}

function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);

  if (!field || field.type !== "singleSelect") {
    return optionName;
  }

  const choices = field?.options?.choices || [];
  const match = choices.find(choice =>
    normalizeText(choice?.name) === normalizeText(optionName)
  );

  if (!match) {
    const available = choices.map(choice => choice.name).join(", ");
    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available options: ${available}`
    );
  }

  return { id: match.id };
}

function firstExistingChoice(table, fieldName, preferredNames) {
  for (const name of preferredNames || []) {
    if (singleSelectOptionExists(table, fieldName, name)) return name;
  }
  return "";
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getSelectName(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();

  return left === right;
}

function addIfWritable(fields, table, fieldName, value) {
  if (value === undefined || !isWritableField(table, fieldName)) return;
  fields[fieldName] = value;
}

function addTextIfChanged(fields, childTable, childField, childRecord, asset, assetField) {
  if (!isWritableField(childTable, childField) || !fieldExists(assetsTable, assetField)) return;

  const assetValue = getText(asset, assetsTable, assetField);
  const childValue = getText(childRecord, childTable, childField);

  if (assetValue !== childValue) {
    fields[childField] = assetValue;
  }
}

function addSingleSelectIfChanged(fields, table, fieldName, currentName, newName) {
  if (!newName || normalizeText(currentName) === normalizeText(newName)) return;
  if (!isWritableField(table, fieldName)) return;

  fields[fieldName] = buildSingleSelectValue(table, fieldName, newName);
}

function mapAssetUploadStatusToHomeworkStatus(assetStatus) {
  if (assetStatus === "Uploaded") return "Uploaded";
  if (assetStatus === "Processing") return "Processing";
  if (assetStatus === "Error") return "Error";
  return "Pending";
}

function mapAssetUploadStatusToVideoStatus(assetStatus) {
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

function buildHomeworkUploadSyncFields(homeworkRecord, asset) {
  const fields = {};
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetUploadStatus);
  const currentStatus = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);

  addSingleSelectIfChanged(
    fields,
    homeworkTable,
    CONFIG.homework.uploadStatus,
    currentStatus,
    targetStatus
  );

  addTextIfChanged(fields, homeworkTable, CONFIG.homework.googleDriveFileUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFileUrl);
  addTextIfChanged(fields, homeworkTable, CONFIG.homework.googleDriveFileId, homeworkRecord, asset, CONFIG.assets.googleDriveFileId);
  addTextIfChanged(fields, homeworkTable, CONFIG.homework.googleDriveFolderId, homeworkRecord, asset, CONFIG.assets.googleDriveFolderId);
  addTextIfChanged(fields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFolderUrl);

  const assetError = getText(asset, assetsTable, CONFIG.assets.uploadError);
  const currentError = getText(homeworkRecord, homeworkTable, CONFIG.homework.uploadError);
  if (assetError !== currentError) {
    addIfWritable(fields, homeworkTable, CONFIG.homework.uploadError, assetError);
  }

  const assetUploadedAt = getRaw(asset, assetsTable, CONFIG.assets.uploadedAt);
  const currentUploadedAt = getRaw(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    addIfWritable(fields, homeworkTable, CONFIG.homework.uploadedAt, assetUploadedAt);
  }

  if (
    assetUploadStatus === "Uploaded" &&
    getRaw(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true
  ) {
    addIfWritable(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
  }

  return fields;
}

function buildVideoUploadSyncFields(videoRecord, asset) {
  const fields = {};
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToVideoStatus(assetUploadStatus);
  const currentStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);

  addSingleSelectIfChanged(
    fields,
    videoTable,
    CONFIG.video.uploadStatus,
    currentStatus,
    targetStatus
  );

  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFileUrl, videoRecord, asset, CONFIG.assets.googleDriveFileUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFileId, videoRecord, asset, CONFIG.assets.googleDriveFileId);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFolderId, videoRecord, asset, CONFIG.assets.googleDriveFolderId);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveFolderUrl, videoRecord, asset, CONFIG.assets.googleDriveFolderUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveViewUrl, videoRecord, asset, CONFIG.assets.googleDriveViewUrl);
  addTextIfChanged(fields, videoTable, CONFIG.video.googleDriveDownloadUrl, videoRecord, asset, CONFIG.assets.googleDriveDownloadUrl);

  const driveUrl = getText(asset, assetsTable, CONFIG.assets.googleDriveFileUrl);
  const currentVideoUrl = getText(videoRecord, videoTable, CONFIG.video.videoUrlOrDriveLink);
  if (driveUrl && driveUrl !== currentVideoUrl) {
    addIfWritable(fields, videoTable, CONFIG.video.videoUrlOrDriveLink, driveUrl);
  }

  const assetFileName = getText(asset, assetsTable, CONFIG.assets.originalFileName);
  const currentFileName = getText(videoRecord, videoTable, CONFIG.video.videoAssetFileName);
  if (assetFileName && assetFileName !== currentFileName) {
    addIfWritable(fields, videoTable, CONFIG.video.videoAssetFileName, assetFileName);
  }

  const assetError = getText(asset, assetsTable, CONFIG.assets.uploadError);
  const currentError = getText(videoRecord, videoTable, CONFIG.video.uploadError);
  if (assetError !== currentError) {
    addIfWritable(fields, videoTable, CONFIG.video.uploadError, assetError);
  }

  const assetUploadedAt = getRaw(asset, assetsTable, CONFIG.assets.uploadedAt);
  const currentUploadedAt = getRaw(videoRecord, videoTable, CONFIG.video.videoAssetUploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    addIfWritable(fields, videoTable, CONFIG.video.videoAssetUploadedAt, assetUploadedAt);
  }

  return fields;
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  debugStep,
  submissionAssetId = "",
  childRecordId = "",
  childTable = "",
  uploadDestination = "",
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("submissionAssetId", submissionAssetId);
  setOutputSafe("childRecordId", childRecordId);
  setOutputSafe("childTable", childTable);
  setOutputSafe("uploadDestination", uploadDestination);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut,
    actionOut,
    errorOut,
    debugStep,
    submissionAssetId,
    childRecordId,
    childTable,
    uploadDestination,
  }));
}

function assertRequiredSchema() {
  requireField(assetsTable, CONFIG.assets.uploadDestination);
  requireFieldType(assetsTable, CONFIG.assets.uploadStatus, ["singleSelect"]);
  requireField(assetsTable, CONFIG.assets.homeworkCompletions);
  requireField(assetsTable, CONFIG.assets.videoFeedback);

  requireWritableField(homeworkTable, CONFIG.homework.uploadStatus);
  requireWritableField(videoTable, CONFIG.video.uploadStatus);
}

/* =========================================================
   SECTION 3 — MAIN
========================================================= */

async function main() {
  let debugStep = "start";

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input variable: recordId");
  }

  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
  }

  setOutputSafe("debugStep", debugStep);

  debugStep = "load_tables";
  setOutputSafe("debugStep", debugStep);

  assetsTable = base.getTable(CONFIG.tables.assets);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  videoTable = base.getTable(CONFIG.tables.video);

  debugStep = "validate_schema";
  setOutputSafe("debugStep", debugStep);
  assertRequiredSchema();

  debugStep = "load_submission_asset";
  setOutputSafe("debugStep", debugStep);

  const asset = await assetsTable.selectRecordAsync(recordId, {
    fields: [
      CONFIG.assets.uploadDestination,
      CONFIG.assets.uploadStatus,
      CONFIG.assets.uploadError,
      CONFIG.assets.uploadedAt,
      CONFIG.assets.originalFileName,
      CONFIG.assets.googleDriveFileUrl,
      CONFIG.assets.googleDriveFileId,
      CONFIG.assets.googleDriveFolderId,
      CONFIG.assets.googleDriveFolderUrl,
      CONFIG.assets.googleDriveViewUrl,
      CONFIG.assets.googleDriveDownloadUrl,
      CONFIG.assets.homeworkCompletions,
      CONFIG.assets.videoFeedback,
    ].filter(name => fieldExists(assetsTable, name)),
  });

  if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
  }

  const uploadDestination = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);

  if (assetUploadStatus === CONFIG.values.pendingLinkStatus || !assetUploadStatus) {
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "skipped_pending_link",
      errorOut: "",
      debugStep: "skipped_pending_link",
      submissionAssetId: asset.id,
      uploadDestination,
    });
    return;
  }

  if (!CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "skipped_unsyncable_status",
      errorOut: "",
      debugStep: "skipped_unsyncable_status",
      submissionAssetId: asset.id,
      uploadDestination,
    });
    return;
  }

  if (uploadDestination === CONFIG.values.uploadDestinationHomework) {
    debugStep = "sync_homework_completion";
    setOutputSafe("debugStep", debugStep);

    const homeworkIds = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);

    if (homeworkIds.length === 0) {
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_no_homework_completion",
        errorOut: "",
        debugStep: "skipped_no_homework_completion",
        submissionAssetId: asset.id,
        uploadDestination,
      });
      return;
    }

    if (homeworkIds.length > 1) {
      throw new Error(
        `Multiple Homework Completions linked to one asset. Count: ${homeworkIds.length}. Asset: ${asset.id}`
      );
    }

    const homeworkRecord = await homeworkTable.selectRecordAsync(homeworkIds[0], {
      fields: Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name)),
    });

    if (!homeworkRecord) {
      throw new Error(`Linked Homework Completion not found: ${homeworkIds[0]}`);
    }

    const syncFields = buildHomeworkUploadSyncFields(homeworkRecord, asset);

    if (Object.keys(syncFields).length === 0) {
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_already_synced",
        errorOut: "",
        debugStep: "skipped_already_synced",
        submissionAssetId: asset.id,
        childRecordId: homeworkRecord.id,
        childTable: CONFIG.tables.homework,
        uploadDestination,
      });
      return;
    }

    debugStep = "update_homework_completion";
    setOutputSafe("debugStep", debugStep);
    await homeworkTable.updateRecordAsync(homeworkRecord.id, syncFields);

    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: "synced_homework",
      errorOut: "",
      debugStep: "complete",
      submissionAssetId: asset.id,
      childRecordId: homeworkRecord.id,
      childTable: CONFIG.tables.homework,
      uploadDestination,
    });
    return;
  }

  if (uploadDestination === CONFIG.values.uploadDestinationVideo) {
    debugStep = "sync_video_feedback";
    setOutputSafe("debugStep", debugStep);

    const videoIds = getLinkedIds(asset, assetsTable, CONFIG.assets.videoFeedback);

    if (videoIds.length === 0) {
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_no_video_feedback",
        errorOut: "",
        debugStep: "skipped_no_video_feedback",
        submissionAssetId: asset.id,
        uploadDestination,
      });
      return;
    }

    if (videoIds.length > 1) {
      throw new Error(
        `Multiple Video Feedback records linked to one asset. Count: ${videoIds.length}. Asset: ${asset.id}`
      );
    }

    const videoRecord = await videoTable.selectRecordAsync(videoIds[0], {
      fields: Object.values(CONFIG.video).filter(name => fieldExists(videoTable, name)),
    });

    if (!videoRecord) {
      throw new Error(`Linked Video Feedback not found: ${videoIds[0]}`);
    }

    const syncFields = buildVideoUploadSyncFields(videoRecord, asset);

    if (Object.keys(syncFields).length === 0) {
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_already_synced",
        errorOut: "",
        debugStep: "skipped_already_synced",
        submissionAssetId: asset.id,
        childRecordId: videoRecord.id,
        childTable: CONFIG.tables.video,
        uploadDestination,
      });
      return;
    }

    debugStep = "update_video_feedback";
    setOutputSafe("debugStep", debugStep);
    await videoTable.updateRecordAsync(videoRecord.id, syncFields);

    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: "synced_video",
      errorOut: "",
      debugStep: "complete",
      submissionAssetId: asset.id,
      childRecordId: videoRecord.id,
      childTable: CONFIG.tables.video,
      uploadDestination,
    });
    return;
  }

  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.skipped,
    actionOut: "skipped_wrong_destination",
    errorOut: "",
    debugStep: "skipped_wrong_destination",
    submissionAssetId: asset.id,
    uploadDestination,
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  setOutputSafe("statusOut", CONFIG.outputStatuses.error);
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: CONFIG.outputStatuses.error,
    actionOut: "error",
    errorOut: message,
    debugStep: "error",
  }));

  throw error;
}
