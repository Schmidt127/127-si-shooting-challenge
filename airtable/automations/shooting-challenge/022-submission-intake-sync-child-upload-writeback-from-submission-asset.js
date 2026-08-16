/*
Automation: 022 - Submission Intake - Sync Child Upload Writeback from Submission Asset
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-08-16

Purpose:
Synchronize existing Homework Completion or Video Feedback upload writeback fields
from a Submission Asset after upload completes. Does not create children or XP Events.

Trigger:
Submission Assets when Upload Status is Uploaded, Processing, or Error; Upload
Destination is Homework Completions or Video Feedback; and the child record is linked.

Important Tables:
Submission Assets, Homework Completions, Video Feedback

Important Fields:
Upload Status, Reviewer File URL, Canonical File URL, Google Drive File URL,
Video URL or Drive Link, Upload Error, Uploaded At, Writeback Complete?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 022 - SUBMISSION INTAKE
 * Sync Child Upload Writeback from Submission Asset
 *
 * Version: v2.0
 * Date Written: 2026-06-21
 * Last Updated: 2026-08-16
 *
 * VERSION HISTORY
 * - v2.0 (2026-08-16): Full rewrite. Video Feedback coach URL uses Reviewer File
 *   URL → Canonical File URL → Google Drive File URL precedence; never clears an
 *   existing Video URL when all sources are empty; copies Upload Status exactly
 *   (Uploaded/Processing/Error) into the existing child single-select; never writes
 *   Pending Link; reread-verify required for success; JPEG/MIME does not block
 *   video writeback; expanded outputs (sourceUrlUsed, childUploadStatus,
 *   writebackVerified) and debug detail.
 * - v1.1 (2026-06-21): Schema validation, selectRecordAsync, 114-style selects.
 * - v1.0 (2026-06-21): Initial child upload writeback sync.
 *
 * PURPOSE
 * - Runs from one Submission Assets record after Make / Lambda / 070a / 070b
 *   updates upload state.
 * - Copies upload status and file metadata from the asset onto the already-linked
 *   Homework Completion or Video Feedback child record.
 * - Submission Assets remain the upload pipeline source of truth.
 *
 * IMPORTANT DESIGN RULES
 * - Idempotent: only write fields that differ; repeated runs must not churn.
 * - Never create Homework Completions, Video Feedback, or XP Events.
 * - Never alter Submission Asset Upload Status.
 * - Never write formula / lookup / rollup / computed fields.
 * - Never write Pending Link to a child Upload Status.
 * - Only write a single-select option when that option exists on the target field;
 *   otherwise error clearly.
 * - Video Feedback → Video URL or Drive Link precedence:
 *   1) Reviewer File URL
 *   2) Canonical File URL
 *   3) Google Drive File URL
 *   4) If all empty, do not overwrite the existing Video URL or Drive Link.
 * - Success requires a post-write reread confirming expected child values.
 * - MIME / JPEG / file extension must not block video writeback.
 *
 * THIS IS NOT
 * - Homework link/create (020).
 * - Video Feedback create/link (013).
 * - Make / Lambda send (070a / 070b).
 * - Asset Upload Status owner (Make / Lambda / 070c).
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
 * - Google Drive File URL is not empty (legacy Drive path)
 * - Reviewer File URL is not empty (Lambda / reviewer path)
 * - Canonical File URL is not empty (S3 canonical path)
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Upload Status is Pending Link (no post-upload data yet)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Submission Assets record
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = synced_homework | synced_video | already_synced | skipped_* | error
 * - errorOut
 * - debugStep
 * - submissionAssetId
 * - childRecordId
 * - childTable
 * - uploadDestination
 * - sourceUrlUsed
 * - childUploadStatus
 * - writebackVerified
 *
 * PRIMARY TABLES USED
 * - Submission Assets (trigger / read only)
 * - Homework Completions (write when Upload Destination = Homework Completions)
 * - Video Feedback (write when Upload Destination = Video Feedback)
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Homework Completions → Upload Status, Google Drive File URL/ID, Google Drive
 *   Folder ID/URL, Upload Error, Uploaded At, Writeback Complete?
 * - Video Feedback → Upload Status, Video URL or Drive Link, Video Asset File Name,
 *   Video Asset Uploaded At, Upload Error, optional Google Drive File/Folder/View/
 *   Download URL fields when present and writable
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "022 - Submission Intake - Sync Child Upload Writeback from Submission Asset",
  version: "v2.0",
  versionDate: "2026-08-16",
  originalWrittenDate: "2026-06-21",
  lastUpdated: "2026-08-16",
  folder: "02 - Submission Intake and Asset Creation",
  automationName: "022 - Submission Intake - Sync Child Upload Writeback from Submission Asset",
};

/* =========================================================
   SECTION 2 — CONFIGURATION (tables, fields, statuses only)
========================================================= */

const CONFIG = {
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
    fileMimeType: "File MIME Type",
    reviewerFileUrl: "Reviewer File URL",
    canonicalFileUrl: "Canonical File URL",
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

/* =========================================================
   SECTION 3 — HELPERS
========================================================= */

let assetsTable = null;
let homeworkTable = null;
let videoTable = null;

const fieldCache = new Map();
let debugStep = "start";

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped outputs.
  }
}

function setDebugStep(step) {
  debugStep = step;
  setOutputSafe("debugStep", debugStep);
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

function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);

  if (!field || field.type !== "singleSelect") {
    return optionName;
  }

  const choices = field?.options?.choices || [];
  const match = choices.find(
    choice => normalizeText(choice?.name) === normalizeText(optionName)
  );

  if (!match) {
    const available = choices.map(choice => choice.name).join(", ");
    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available options: ${available}`
    );
  }

  return { id: match.id };
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
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") return raw.trim();
  if (raw?.name) return String(raw.name).trim();
  return getText(record, table, fieldName);
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

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return String(a) === String(b);
  }

  return left === right;
}

function addIfWritable(fields, table, fieldName, value) {
  if (value === undefined || !isWritableField(table, fieldName)) return false;
  fields[fieldName] = value;
  return true;
}

function requireChildUploadStatusOption(childTable, statusName) {
  requireWritableField(childTable, "Upload Status");

  const field = getFieldSafe(childTable, "Upload Status");
  if (!field || field.type !== "singleSelect") {
    throw new Error(
      `${childTable.name}.Upload Status must be a writable single-select field (do not replace with a lookup).`
    );
  }

  if (normalizeText(statusName) === normalizeText(CONFIG.values.pendingLinkStatus)) {
    throw new Error(
      `Refusing to write "${CONFIG.values.pendingLinkStatus}" to ${childTable.name}.Upload Status.`
    );
  }

  const choices = field.options?.choices || [];
  const match = choices.find(
    choice => normalizeText(choice?.name) === normalizeText(statusName)
  );

  if (!match) {
    const available = choices.map(choice => choice.name).join(", ");
    throw new Error(
      `Missing required Upload Status option "${statusName}" on ${childTable.name}. Available options: ${available}`
    );
  }

  return statusName;
}

function resolveVideoSourceUrl(asset) {
  const candidates = [
    { source: "Reviewer File URL", field: CONFIG.assets.reviewerFileUrl },
    { source: "Canonical File URL", field: CONFIG.assets.canonicalFileUrl },
    { source: "Google Drive File URL", field: CONFIG.assets.googleDriveFileUrl },
  ];

  for (const candidate of candidates) {
    if (!fieldExists(assetsTable, candidate.field)) continue;
    const url = getText(asset, assetsTable, candidate.field);
    if (url) {
      return { url, source: candidate.source };
    }
  }

  return { url: "", source: "" };
}

function addTextIfChanged(fields, childTable, childField, childRecord, nextValue) {
  if (!isWritableField(childTable, childField)) return false;

  const currentValue = getText(childRecord, childTable, childField);
  const desired = String(nextValue == null ? "" : nextValue).trim();

  if (desired === currentValue) return false;
  fields[childField] = desired;
  return true;
}

function addSingleSelectIfChanged(fields, table, fieldName, currentName, newName) {
  if (!newName) return false;
  if (normalizeText(currentName) === normalizeText(newName)) return false;
  if (!isWritableField(table, fieldName)) return false;

  fields[fieldName] = buildSingleSelectValue(table, fieldName, newName);
  return true;
}

function addDateIfChanged(fields, childTable, childField, childRecord, nextValue) {
  if (!isWritableField(childTable, childField)) return false;

  const currentValue = getRaw(childRecord, childTable, childField);
  if (datesEqual(currentValue, nextValue)) return false;

  fields[childField] = nextValue;
  return true;
}

function buildHomeworkSyncPlan(homeworkRecord, asset) {
  const fields = {};
  const writtenFields = [];
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const targetStatus = requireChildUploadStatusOption(homeworkTable, assetUploadStatus);
  const currentStatus = getSelectName(
    homeworkRecord,
    homeworkTable,
    CONFIG.homework.uploadStatus
  );

  if (
    addSingleSelectIfChanged(
      fields,
      homeworkTable,
      CONFIG.homework.uploadStatus,
      currentStatus,
      targetStatus
    )
  ) {
    writtenFields.push(CONFIG.homework.uploadStatus);
  }

  const driveCopies = [
    [CONFIG.homework.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.homework.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.homework.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.homework.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
  ];

  for (const [childField, assetField] of driveCopies) {
    if (!fieldExists(assetsTable, assetField)) continue;
    if (
      addTextIfChanged(
        fields,
        homeworkTable,
        childField,
        homeworkRecord,
        getText(asset, assetsTable, assetField)
      )
    ) {
      writtenFields.push(childField);
    }
  }

  if (
    addTextIfChanged(
      fields,
      homeworkTable,
      CONFIG.homework.uploadError,
      homeworkRecord,
      getText(asset, assetsTable, CONFIG.assets.uploadError)
    )
  ) {
    writtenFields.push(CONFIG.homework.uploadError);
  }

  if (
    addDateIfChanged(
      fields,
      homeworkTable,
      CONFIG.homework.uploadedAt,
      homeworkRecord,
      getRaw(asset, assetsTable, CONFIG.assets.uploadedAt)
    )
  ) {
    writtenFields.push(CONFIG.homework.uploadedAt);
  }

  if (assetUploadStatus === "Uploaded" && isWritableField(homeworkTable, CONFIG.homework.writebackComplete)) {
    const currentComplete = getRaw(
      homeworkRecord,
      homeworkTable,
      CONFIG.homework.writebackComplete
    );
    if (currentComplete !== true) {
      if (addIfWritable(fields, homeworkTable, CONFIG.homework.writebackComplete, true)) {
        writtenFields.push(CONFIG.homework.writebackComplete);
      }
    }
  }

  return {
    fields,
    writtenFields,
    expectedStatus: targetStatus,
    sourceUrlUsed: "",
    expectedVideoUrl: null,
  };
}

function buildVideoSyncPlan(videoRecord, asset) {
  const fields = {};
  const writtenFields = [];
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const targetStatus = requireChildUploadStatusOption(videoTable, assetUploadStatus);
  const currentStatus = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);

  if (
    addSingleSelectIfChanged(
      fields,
      videoTable,
      CONFIG.video.uploadStatus,
      currentStatus,
      targetStatus
    )
  ) {
    writtenFields.push(CONFIG.video.uploadStatus);
  }

  const { url: sourceUrl, source: sourceUrlUsed } = resolveVideoSourceUrl(asset);
  const currentVideoUrl = getText(
    videoRecord,
    videoTable,
    CONFIG.video.videoUrlOrDriveLink
  );

  let expectedVideoUrl = currentVideoUrl;

  if (sourceUrl) {
    expectedVideoUrl = sourceUrl;
    if (
      addTextIfChanged(
        fields,
        videoTable,
        CONFIG.video.videoUrlOrDriveLink,
        videoRecord,
        sourceUrl
      )
    ) {
      writtenFields.push(CONFIG.video.videoUrlOrDriveLink);
    }
  }
  // If all URL sources are empty, intentionally leave Video URL or Drive Link alone.

  const assetFileName = getText(asset, assetsTable, CONFIG.assets.originalFileName);
  if (assetFileName) {
    if (
      addTextIfChanged(
        fields,
        videoTable,
        CONFIG.video.videoAssetFileName,
        videoRecord,
        assetFileName
      )
    ) {
      writtenFields.push(CONFIG.video.videoAssetFileName);
    }
  }

  if (
    addDateIfChanged(
      fields,
      videoTable,
      CONFIG.video.videoAssetUploadedAt,
      videoRecord,
      getRaw(asset, assetsTable, CONFIG.assets.uploadedAt)
    )
  ) {
    writtenFields.push(CONFIG.video.videoAssetUploadedAt);
  }

  if (
    addTextIfChanged(
      fields,
      videoTable,
      CONFIG.video.uploadError,
      videoRecord,
      getText(asset, assetsTable, CONFIG.assets.uploadError)
    )
  ) {
    writtenFields.push(CONFIG.video.uploadError);
  }

  const optionalDriveCopies = [
    [CONFIG.video.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.video.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.video.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.video.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
    [CONFIG.video.googleDriveViewUrl, CONFIG.assets.googleDriveViewUrl],
    [CONFIG.video.googleDriveDownloadUrl, CONFIG.assets.googleDriveDownloadUrl],
  ];

  for (const [childField, assetField] of optionalDriveCopies) {
    if (!fieldExists(videoTable, childField)) continue;
    if (!fieldExists(assetsTable, assetField)) continue;
    if (
      addTextIfChanged(
        fields,
        videoTable,
        childField,
        videoRecord,
        getText(asset, assetsTable, assetField)
      )
    ) {
      writtenFields.push(childField);
    }
  }

  return {
    fields,
    writtenFields,
    expectedStatus: targetStatus,
    sourceUrlUsed,
    expectedVideoUrl,
  };
}

function verifyHomeworkWriteback(homeworkRecord, plan, asset) {
  const failures = [];
  const status = getSelectName(homeworkRecord, homeworkTable, CONFIG.homework.uploadStatus);

  if (normalizeText(status) !== normalizeText(plan.expectedStatus)) {
    failures.push(
      `Upload Status expected "${plan.expectedStatus}" but found "${status || "(blank)"}"`
    );
  }

  const checks = [
    [CONFIG.homework.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.homework.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.homework.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.homework.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
    [CONFIG.homework.uploadError, CONFIG.assets.uploadError],
  ];

  for (const [childField, assetField] of checks) {
    if (!isWritableField(homeworkTable, childField)) continue;
    if (!fieldExists(assetsTable, assetField)) continue;
    const expected = getText(asset, assetsTable, assetField);
    const actual = getText(homeworkRecord, homeworkTable, childField);
    if (expected !== actual) {
      failures.push(`${childField} mismatch`);
    }
  }

  if (isWritableField(homeworkTable, CONFIG.homework.uploadedAt)) {
    const expectedAt = getRaw(asset, assetsTable, CONFIG.assets.uploadedAt);
    const actualAt = getRaw(homeworkRecord, homeworkTable, CONFIG.homework.uploadedAt);
    if (!datesEqual(expectedAt, actualAt)) {
      failures.push(`${CONFIG.homework.uploadedAt} mismatch`);
    }
  }

  const assetStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  if (
    assetStatus === "Uploaded" &&
    isWritableField(homeworkTable, CONFIG.homework.writebackComplete) &&
    getRaw(homeworkRecord, homeworkTable, CONFIG.homework.writebackComplete) !== true
  ) {
    failures.push(`${CONFIG.homework.writebackComplete} expected true`);
  }

  return failures;
}

function verifyVideoWriteback(videoRecord, plan, asset) {
  const failures = [];
  const status = getSelectName(videoRecord, videoTable, CONFIG.video.uploadStatus);

  if (normalizeText(status) !== normalizeText(plan.expectedStatus)) {
    failures.push(
      `Upload Status expected "${plan.expectedStatus}" but found "${status || "(blank)"}"`
    );
  }

  if (isWritableField(videoTable, CONFIG.video.videoUrlOrDriveLink)) {
    const actualUrl = getText(
      videoRecord,
      videoTable,
      CONFIG.video.videoUrlOrDriveLink
    );
    if (plan.expectedVideoUrl != null && actualUrl !== plan.expectedVideoUrl) {
      failures.push(
        `Video URL or Drive Link expected "${plan.expectedVideoUrl || "(blank)"}" but found "${actualUrl || "(blank)"}"`
      );
    }
  }

  const assetFileName = getText(asset, assetsTable, CONFIG.assets.originalFileName);
  if (assetFileName && isWritableField(videoTable, CONFIG.video.videoAssetFileName)) {
    const actualName = getText(videoRecord, videoTable, CONFIG.video.videoAssetFileName);
    if (actualName !== assetFileName) {
      failures.push(`${CONFIG.video.videoAssetFileName} mismatch`);
    }
  }

  if (isWritableField(videoTable, CONFIG.video.uploadError)) {
    const expectedError = getText(asset, assetsTable, CONFIG.assets.uploadError);
    const actualError = getText(videoRecord, videoTable, CONFIG.video.uploadError);
    if (expectedError !== actualError) {
      failures.push(`${CONFIG.video.uploadError} mismatch`);
    }
  }

  if (isWritableField(videoTable, CONFIG.video.videoAssetUploadedAt)) {
    const expectedAt = getRaw(asset, assetsTable, CONFIG.assets.uploadedAt);
    const actualAt = getRaw(videoRecord, videoTable, CONFIG.video.videoAssetUploadedAt);
    if (!datesEqual(expectedAt, actualAt)) {
      failures.push(`${CONFIG.video.videoAssetUploadedAt} mismatch`);
    }
  }

  const optionalDriveCopies = [
    [CONFIG.video.googleDriveFileUrl, CONFIG.assets.googleDriveFileUrl],
    [CONFIG.video.googleDriveFileId, CONFIG.assets.googleDriveFileId],
    [CONFIG.video.googleDriveFolderId, CONFIG.assets.googleDriveFolderId],
    [CONFIG.video.googleDriveFolderUrl, CONFIG.assets.googleDriveFolderUrl],
    [CONFIG.video.googleDriveViewUrl, CONFIG.assets.googleDriveViewUrl],
    [CONFIG.video.googleDriveDownloadUrl, CONFIG.assets.googleDriveDownloadUrl],
  ];

  for (const [childField, assetField] of optionalDriveCopies) {
    if (!isWritableField(videoTable, childField)) continue;
    if (!fieldExists(assetsTable, assetField)) continue;
    const expected = getText(asset, assetsTable, assetField);
    const actual = getText(videoRecord, videoTable, childField);
    if (expected !== actual) {
      failures.push(`${childField} mismatch`);
    }
  }

  return failures;
}

function setFinalOutputs({
  statusOut,
  actionOut,
  errorOut = "",
  submissionAssetId = "",
  childRecordId = "",
  childTable = "",
  uploadDestination = "",
  sourceUrlUsed = "",
  childUploadStatus = "",
  writebackVerified = false,
  debugDetail = null,
}) {
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut);
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("submissionAssetId", submissionAssetId);
  setOutputSafe("childRecordId", childRecordId);
  setOutputSafe("childTable", childTable);
  setOutputSafe("uploadDestination", uploadDestination);
  setOutputSafe("sourceUrlUsed", sourceUrlUsed);
  setOutputSafe("childUploadStatus", childUploadStatus);
  setOutputSafe("writebackVerified", writebackVerified === true);

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut,
      actionOut,
      errorOut,
      debugStep,
      submissionAssetId,
      childRecordId,
      childTable,
      uploadDestination,
      sourceUrlUsed,
      childUploadStatus,
      writebackVerified: writebackVerified === true,
      debugDetail,
    })
  );
}

function assertRequiredSchema() {
  requireField(assetsTable, CONFIG.assets.uploadDestination);
  requireFieldType(assetsTable, CONFIG.assets.uploadStatus, ["singleSelect"]);
  requireField(assetsTable, CONFIG.assets.homeworkCompletions);
  requireField(assetsTable, CONFIG.assets.videoFeedback);

  requireWritableField(homeworkTable, CONFIG.homework.uploadStatus);
  requireFieldType(homeworkTable, CONFIG.homework.uploadStatus, ["singleSelect"]);

  requireWritableField(videoTable, CONFIG.video.uploadStatus);
  requireFieldType(videoTable, CONFIG.video.uploadStatus, ["singleSelect"]);
  requireWritableField(videoTable, CONFIG.video.videoUrlOrDriveLink);
}

function childFieldNames(childConfig, childTable) {
  return Object.values(childConfig).filter(name => fieldExists(childTable, name));
}

/* =========================================================
   SECTION 4 — MAIN
========================================================= */

async function main() {
  setDebugStep("start");

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input variable: recordId");
  }

  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId input. Expected Airtable record ID, received: ${recordId}`);
  }

  setDebugStep("load_tables");
  assetsTable = base.getTable(CONFIG.tables.assets);
  homeworkTable = base.getTable(CONFIG.tables.homework);
  videoTable = base.getTable(CONFIG.tables.video);

  setDebugStep("validate_schema");
  assertRequiredSchema();

  setDebugStep("load_submission_asset");
  const assetFields = [
    CONFIG.assets.uploadDestination,
    CONFIG.assets.uploadStatus,
    CONFIG.assets.uploadError,
    CONFIG.assets.uploadedAt,
    CONFIG.assets.originalFileName,
    CONFIG.assets.fileMimeType,
    CONFIG.assets.reviewerFileUrl,
    CONFIG.assets.canonicalFileUrl,
    CONFIG.assets.googleDriveFileUrl,
    CONFIG.assets.googleDriveFileId,
    CONFIG.assets.googleDriveFolderId,
    CONFIG.assets.googleDriveFolderUrl,
    CONFIG.assets.googleDriveViewUrl,
    CONFIG.assets.googleDriveDownloadUrl,
    CONFIG.assets.homeworkCompletions,
    CONFIG.assets.videoFeedback,
  ].filter(name => fieldExists(assetsTable, name));

  const asset = await assetsTable.selectRecordAsync(recordId, { fields: assetFields });

  if (!asset) {
    throw new Error(`Submission Asset not found: ${recordId}`);
  }

  const uploadDestination = getText(asset, assetsTable, CONFIG.assets.uploadDestination);
  const assetUploadStatus = getSelectName(asset, assetsTable, CONFIG.assets.uploadStatus);
  const homeworkIds = getLinkedIds(asset, assetsTable, CONFIG.assets.homeworkCompletions);
  const videoIds = getLinkedIds(asset, assetsTable, CONFIG.assets.videoFeedback);
  const mimeType = getText(asset, assetsTable, CONFIG.assets.fileMimeType);

  const baseDebug = {
    assetUploadStatus,
    uploadDestination,
    homeworkLinkedIds: homeworkIds,
    videoLinkedIds: videoIds,
    fileMimeType: mimeType || "",
    originalFileName: getText(asset, assetsTable, CONFIG.assets.originalFileName),
  };

  if (assetUploadStatus === CONFIG.values.pendingLinkStatus || !assetUploadStatus) {
    setDebugStep("skipped_pending_link");
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "skipped_pending_link",
      submissionAssetId: asset.id,
      uploadDestination,
      writebackVerified: false,
      debugDetail: baseDebug,
    });
    return;
  }

  if (!CONFIG.values.syncableAssetStatuses.includes(assetUploadStatus)) {
    setDebugStep("skipped_unsyncable_status");
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.skipped,
      actionOut: "skipped_unsyncable_status",
      submissionAssetId: asset.id,
      uploadDestination,
      childUploadStatus: assetUploadStatus,
      writebackVerified: false,
      debugDetail: baseDebug,
    });
    return;
  }

  if (uploadDestination === CONFIG.values.uploadDestinationHomework) {
    setDebugStep("sync_homework_completion");

    if (homeworkIds.length === 0) {
      setDebugStep("skipped_no_homework_completion");
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_no_homework_completion",
        submissionAssetId: asset.id,
        childTable: CONFIG.tables.homework,
        uploadDestination,
        writebackVerified: false,
        debugDetail: baseDebug,
      });
      return;
    }

    if (homeworkIds.length > 1) {
      throw new Error(
        `Multiple Homework Completions linked to one asset. Count: ${homeworkIds.length}. Asset: ${asset.id}. IDs: ${homeworkIds.join(", ")}`
      );
    }

    const homeworkRecord = await homeworkTable.selectRecordAsync(homeworkIds[0], {
      fields: childFieldNames(CONFIG.homework, homeworkTable),
    });

    if (!homeworkRecord) {
      throw new Error(`Linked Homework Completion not found: ${homeworkIds[0]}`);
    }

    const plan = buildHomeworkSyncPlan(homeworkRecord, asset);
    const wroteAnything = Object.keys(plan.fields).length > 0;

    if (wroteAnything) {
      setDebugStep("update_homework_completion");
      await homeworkTable.updateRecordAsync(homeworkRecord.id, plan.fields);
    }

    setDebugStep("verify_homework_writeback");
    const freshHomework = await homeworkTable.selectRecordAsync(homeworkRecord.id, {
      fields: childFieldNames(CONFIG.homework, homeworkTable),
    });

    if (!freshHomework) {
      throw new Error(`Homework Completion disappeared during verify: ${homeworkRecord.id}`);
    }

    const failures = verifyHomeworkWriteback(freshHomework, plan, asset);
    const childUploadStatus = getSelectName(
      freshHomework,
      homeworkTable,
      CONFIG.homework.uploadStatus
    );

    if (failures.length > 0) {
      throw new Error(
        `Homework writeback verification failed for ${homeworkRecord.id}: ${failures.join("; ")}`
      );
    }

    setDebugStep("complete");
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: wroteAnything ? "synced_homework" : "already_synced",
      submissionAssetId: asset.id,
      childRecordId: homeworkRecord.id,
      childTable: CONFIG.tables.homework,
      uploadDestination,
      sourceUrlUsed: "",
      childUploadStatus,
      writebackVerified: true,
      debugDetail: {
        ...baseDebug,
        urlSourceSelected: "",
        targetFieldsWritten: plan.writtenFields,
        verificationResults: { ok: true, failures: [] },
      },
    });
    return;
  }

  if (uploadDestination === CONFIG.values.uploadDestinationVideo) {
    setDebugStep("sync_video_feedback");

    if (videoIds.length === 0) {
      setDebugStep("skipped_no_video_feedback");
      setFinalOutputs({
        statusOut: CONFIG.outputStatuses.skipped,
        actionOut: "skipped_no_video_feedback",
        submissionAssetId: asset.id,
        childTable: CONFIG.tables.video,
        uploadDestination,
        writebackVerified: false,
        debugDetail: baseDebug,
      });
      return;
    }

    if (videoIds.length > 1) {
      throw new Error(
        `Multiple Video Feedback records linked to one asset. Count: ${videoIds.length}. Asset: ${asset.id}. IDs: ${videoIds.join(", ")}`
      );
    }

    const videoRecord = await videoTable.selectRecordAsync(videoIds[0], {
      fields: childFieldNames(CONFIG.video, videoTable),
    });

    if (!videoRecord) {
      throw new Error(`Linked Video Feedback not found: ${videoIds[0]}`);
    }

    const plan = buildVideoSyncPlan(videoRecord, asset);
    const wroteAnything = Object.keys(plan.fields).length > 0;

    if (wroteAnything) {
      setDebugStep("update_video_feedback");
      await videoTable.updateRecordAsync(videoRecord.id, plan.fields);
    }

    setDebugStep("verify_video_writeback");
    const freshVideo = await videoTable.selectRecordAsync(videoRecord.id, {
      fields: childFieldNames(CONFIG.video, videoTable),
    });

    if (!freshVideo) {
      throw new Error(`Video Feedback disappeared during verify: ${videoRecord.id}`);
    }

    const failures = verifyVideoWriteback(freshVideo, plan, asset);
    const childUploadStatus = getSelectName(
      freshVideo,
      videoTable,
      CONFIG.video.uploadStatus
    );

    if (failures.length > 0) {
      throw new Error(
        `Video writeback verification failed for ${videoRecord.id}: ${failures.join("; ")}`
      );
    }

    setDebugStep("complete");
    setFinalOutputs({
      statusOut: CONFIG.outputStatuses.success,
      actionOut: wroteAnything ? "synced_video" : "already_synced",
      submissionAssetId: asset.id,
      childRecordId: videoRecord.id,
      childTable: CONFIG.tables.video,
      uploadDestination,
      sourceUrlUsed: plan.sourceUrlUsed,
      childUploadStatus,
      writebackVerified: true,
      debugDetail: {
        ...baseDebug,
        urlSourceSelected: plan.sourceUrlUsed || "(none)",
        targetFieldsWritten: plan.writtenFields,
        verificationResults: { ok: true, failures: [] },
        expectedVideoUrl: plan.expectedVideoUrl,
      },
    });
    return;
  }

  setDebugStep("skipped_wrong_destination");
  setFinalOutputs({
    statusOut: CONFIG.outputStatuses.skipped,
    actionOut: "skipped_wrong_destination",
    submissionAssetId: asset.id,
    uploadDestination,
    writebackVerified: false,
    debugDetail: baseDebug,
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  setOutputSafe("statusOut", CONFIG.outputStatuses.error);
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", debugStep || "error");
  setOutputSafe("writebackVerified", false);

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.outputStatuses.error,
      actionOut: "error",
      errorOut: message,
      debugStep: debugStep || "error",
      writebackVerified: false,
    })
  );

  throw error;
}
