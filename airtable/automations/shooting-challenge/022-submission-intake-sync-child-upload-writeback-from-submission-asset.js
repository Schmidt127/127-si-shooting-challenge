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
 * 022 - Submission Intake - Sync Child Upload Writeback from Submission Asset
 *
 * Version: v1.0
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
 * - Submission Assets
 * - Homework Completions
 * - Video Feedback
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
  version: "v1.0",

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

let assetsTable;
let homeworkTable;
let videoTable;

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

function getField(table, fieldName) {
  return table.fields.find(field => field.name === fieldName);
}

function fieldExists(table, fieldName) {
  return Boolean(getField(table, fieldName));
}

function isWritable(table, fieldName) {
  const field = getField(table, fieldName);
  if (!field) return false;

  const readOnlyTypes = new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "autoNumber",
    "createdBy",
    "lastModifiedBy",
    "button",
    "externalSyncSource",
  ]);

  return !readOnlyTypes.has(field.type);
}

function safeFields(table, fieldNames) {
  return [...new Set(fieldNames)].filter(name => fieldExists(table, name));
}

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function text(record, fieldName) {
  try {
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch {
    return "";
  }
}

function selectName(record, fieldName) {
  const value = cell(record, fieldName);
  return value?.name ? String(value.name).trim() : "";
}

function linkedIds(record, fieldName) {
  const value = cell(record, fieldName);
  if (!Array.isArray(value)) return [];
  return value.map(item => item?.id).filter(Boolean);
}

function choiceExists(table, fieldName, choiceName) {
  const field = getField(table, fieldName);
  if (!field?.options?.choices) return false;
  return field.options.choices.some(choice => choice.name === choiceName);
}

function firstExistingChoice(table, fieldName, preferredNames) {
  for (const name of preferredNames || []) {
    if (choiceExists(table, fieldName, name)) return name;
  }
  return "";
}

function setSingleSelect(fields, table, fieldName, choiceName) {
  if (!isWritable(table, fieldName) || !choiceName) return;
  if (!choiceExists(table, fieldName, choiceName)) return;

  fields[fieldName] = { name: choiceName };
}

function setCheckbox(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  fields[fieldName] = Boolean(value);
}

function setTextField(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  if (value === undefined || value === null) return;

  fields[fieldName] = String(value);
}

function setDate(fields, table, fieldName, value) {
  if (!isWritable(table, fieldName)) return;
  if (!value) return;

  fields[fieldName] = value;
}

function datesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();

  return left === right;
}

function syncTextFromAsset(fields, childTable, childField, childRecord, asset, assetField) {
  if (!isWritable(childTable, childField) || !fieldExists(assetsTable, assetField)) return;

  const assetValue = text(asset, assetField);
  const childValue = text(childRecord, childField);

  if (assetValue !== childValue) {
    fields[childField] = assetValue;
  }
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
  const assetUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToHomeworkStatus(assetUploadStatus);
  const currentStatus = selectName(homeworkRecord, CONFIG.homework.uploadStatus);

  if (targetStatus && targetStatus !== currentStatus) {
    setSingleSelect(fields, homeworkTable, CONFIG.homework.uploadStatus, targetStatus);
  }

  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFileUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFileUrl);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFileId, homeworkRecord, asset, CONFIG.assets.googleDriveFileId);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFolderId, homeworkRecord, asset, CONFIG.assets.googleDriveFolderId);
  syncTextFromAsset(fields, homeworkTable, CONFIG.homework.googleDriveFolderUrl, homeworkRecord, asset, CONFIG.assets.googleDriveFolderUrl);

  const assetError = text(asset, CONFIG.assets.uploadError);
  const currentError = text(homeworkRecord, CONFIG.homework.uploadError);
  if (assetError !== currentError && isWritable(homeworkTable, CONFIG.homework.uploadError)) {
    fields[CONFIG.homework.uploadError] = assetError;
  }

  const assetUploadedAt = cell(asset, CONFIG.assets.uploadedAt);
  const currentUploadedAt = cell(homeworkRecord, CONFIG.homework.uploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    setDate(fields, homeworkTable, CONFIG.homework.uploadedAt, assetUploadedAt);
  }

  if (assetUploadStatus === "Uploaded" && cell(homeworkRecord, CONFIG.homework.writebackComplete) !== true) {
    setCheckbox(fields, homeworkTable, CONFIG.homework.writebackComplete, true);
  }

  return fields;
}

function buildVideoUploadSyncFields(videoRecord, asset) {
  const fields = {};
  const assetUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);
  const targetStatus = mapAssetUploadStatusToVideoStatus(assetUploadStatus);
  const currentStatus = selectName(videoRecord, CONFIG.video.uploadStatus);

  if (targetStatus && targetStatus !== currentStatus) {
    setSingleSelect(fields, videoTable, CONFIG.video.uploadStatus, targetStatus);
  }

  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveFileUrl, videoRecord, asset, CONFIG.assets.googleDriveFileUrl);
  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveFileId, videoRecord, asset, CONFIG.assets.googleDriveFileId);
  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveFolderId, videoRecord, asset, CONFIG.assets.googleDriveFolderId);
  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveFolderUrl, videoRecord, asset, CONFIG.assets.googleDriveFolderUrl);
  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveViewUrl, videoRecord, asset, CONFIG.assets.googleDriveViewUrl);
  syncTextFromAsset(fields, videoTable, CONFIG.video.googleDriveDownloadUrl, videoRecord, asset, CONFIG.assets.googleDriveDownloadUrl);

  const driveUrl = text(asset, CONFIG.assets.googleDriveFileUrl);
  const currentVideoUrl = text(videoRecord, CONFIG.video.videoUrlOrDriveLink);
  if (driveUrl && driveUrl !== currentVideoUrl) {
    setTextField(fields, videoTable, CONFIG.video.videoUrlOrDriveLink, driveUrl);
  }

  const assetFileName = text(asset, CONFIG.assets.originalFileName);
  const currentFileName = text(videoRecord, CONFIG.video.videoAssetFileName);
  if (assetFileName && assetFileName !== currentFileName) {
    setTextField(fields, videoTable, CONFIG.video.videoAssetFileName, assetFileName);
  }

  const assetError = text(asset, CONFIG.assets.uploadError);
  const currentError = text(videoRecord, CONFIG.video.uploadError);
  if (assetError !== currentError && isWritable(videoTable, CONFIG.video.uploadError)) {
    fields[CONFIG.video.uploadError] = assetError;
  }

  const assetUploadedAt = cell(asset, CONFIG.assets.uploadedAt);
  const currentUploadedAt = cell(videoRecord, CONFIG.video.videoAssetUploadedAt);
  if (!datesEqual(assetUploadedAt, currentUploadedAt)) {
    setDate(fields, videoTable, CONFIG.video.videoAssetUploadedAt, assetUploadedAt);
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

  assetsTable = base.getTable(CONFIG.tables.assets);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  videoTable = base.getTable(CONFIG.tables.video);

  debugStep = "load_submission_asset";
  setOutputSafe("debugStep", debugStep);

  const assetQuery = await assetsTable.selectRecordsAsync({
    fields: safeFields(assetsTable, Object.values(CONFIG.assets)),
  });

  const asset = assetQuery.getRecord(recordId);

  if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
  }

  const uploadDestination = text(asset, CONFIG.assets.uploadDestination);
  const assetUploadStatus = selectName(asset, CONFIG.assets.uploadStatus);

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

    const homeworkIds = linkedIds(asset, CONFIG.assets.homeworkCompletions);

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

    const homeworkQuery = await homeworkTable.selectRecordsAsync({
      fields: safeFields(homeworkTable, Object.values(CONFIG.homework)),
    });

    const homeworkRecord = homeworkQuery.getRecord(homeworkIds[0]);

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

    const videoIds = linkedIds(asset, CONFIG.assets.videoFeedback);

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

    const videoQuery = await videoTable.selectRecordsAsync({
      fields: safeFields(videoTable, Object.values(CONFIG.video)),
    });

    const videoRecord = videoQuery.getRecord(videoIds[0]);

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
