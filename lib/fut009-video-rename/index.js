/**
 * FUT-009 — Safe post-feedback S3 video rename (pure decision helpers).
 *
 * Shared by:
 * - tools/airtable/fut_009_video_rename.py (Python mirror in upload_core/fut009_rename.py)
 * - airtable/extension-scripts/safe-backfills/fut-009-video-rename.js (inline copy)
 * - offline unit tests
 *
 * Authority: docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md
 */

"use strict";

const {
  extractBasenameFromKey,
  isPathSafeStorageKey,
  prependLayoutPrefix,
} = require("../s3-storage/storage-key-format");

const {
  FUT009_LAYOUT_PREFIX,
  applyCollisionSuffix,
  buildMediaBasename,
  buildStorageKeyWithFut007Basename,
  extensionFromFilename,
  formatActivityDateFolder,
  nextCollisionIndex,
  resolveCustomNameSegment,
} = require("../aws-media-naming/index.js");

const FIELD_NAMES = {
  storageKey: "Storage Key",
  canonicalFileUrl: "Canonical File URL",
  originalFileName: "Original File Name",
  uploadStatus: "Upload Status",
  uploadDestination: "Upload Destination",
  uploadError: "Upload Error",
  sendToMakeTrigger: "Send to Make Trigger",
  formattedUploadName: "Formatted Upload Name",
  previousStorageKey: "Previous Storage Key",
  renamedAt: "Renamed At",
  confirmS3Rename: "Confirm S3 Video Rename",
  customVideoFileName: "Custom Video File Name",
};

const UPLOAD_STATUS_UPLOADED = "Uploaded";
const UPLOAD_DESTINATION_VIDEO = "Video Feedback";
const UNCERTAIN_UPLOAD_STATUSES = new Set([
  "Pending Link",
  "Processing",
  "Ready",
  "Error",
  "No File",
]);
const BLANK_CUSTOM_MARKERS = new Set(["", "—", "-", "\u2014", "\u2013"]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function selectName(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value && "name" in value) {
    return String(value.name).trim();
  }
  return String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isBlankCustomName(value) {
  const text = String(value ?? "").trim();
  return BLANK_CUSTOM_MARKERS.has(text);
}

/**
 * @param {object} input
 * @returns {string}
 */
function buildFut009DestinationKey(input) {
  const customSegment = resolveCustomNameSegment({
    category: "VIDEO",
    customVideoFileName: input.customVideoFileName,
  });
  const candidate = buildMediaBasename({
    activityDate: input.activityDate,
    category: "VIDEO",
    lastName: input.lastName,
    firstName: input.firstName,
    customName: customSegment,
    extension: input.extension,
  });
  const collisionIndex = nextCollisionIndex(candidate, input.existingBasenames || []);
  const basename = applyCollisionSuffix(candidate, collisionIndex);
  const activityDateFolder = formatActivityDateFolder(input.activityDate);
  const relative = buildStorageKeyWithFut007Basename({
    athleteFolder: input.athleteFolder,
    programInstanceFolder: input.programInstanceFolder,
    activityDateFolder,
    basename,
  });
  return prependLayoutPrefix(relative);
}

/**
 * @param {string} last
 * @param {string} first
 * @returns {string}
 */
function folderPersonName(last, first) {
  const lastToken = sanitizeFolderToken(last);
  const firstToken = sanitizeFolderToken(first);
  if (lastToken && firstToken) return `${lastToken}_${firstToken}`;
  return lastToken || firstToken || "Unknown_Athlete";
}

/**
 * @param {string} value
 * @returns {string}
 */
function sanitizeFolderToken(value) {
  const token = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\\|/]+/g, " ")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[\._]+|[\._]+$/g, "");
  if (!token || token === "." || token === "..") return "";
  return token;
}

/**
 * @param {string} value
 * @returns {string}
 */
function folderProgramInstance(value) {
  const token = sanitizeFolderToken(value);
  return token || "Unknown_Program_Instance";
}

/**
 * @param {boolean} coachConfirmed
 * @param {boolean} confirmFlag
 * @returns {boolean}
 */
function passesCoachConfirmation(coachConfirmed, confirmFlag) {
  return coachConfirmed || confirmFlag;
}

/**
 * @param {{
 *   recordId: string,
 *   assetFields: Record<string, unknown>,
 *   customVideoFileName: string,
 *   lastName?: string,
 *   firstName?: string,
 *   programInstanceName?: string,
 *   activityDate?: string,
 *   coachConfirmed?: boolean,
 *   existingBasenames?: string[],
 *   confirmFlag?: boolean,
 * }} input
 * @returns {{
 *   recordId: string,
 *   action: string,
 *   sourceKey: string,
 *   destinationKey: string,
 *   customVideoFileName: string,
 *   reason: string,
 *   shouldCopy: boolean,
 * }}
 */
function evaluateRenameEligibility(input) {
  const fields = input.assetFields || {};
  const recordId = input.recordId;
  const sourceKey = selectName(fields[FIELD_NAMES.storageKey]);
  const confirmFlag = Boolean(input.confirmFlag);

  const result = {
    recordId,
    action: "skipped_not_uploaded",
    sourceKey,
    destinationKey: "",
    customVideoFileName: "",
    reason: "",
    shouldCopy: false,
  };

  const destination = selectName(fields[FIELD_NAMES.uploadDestination]);
  if (destination !== UPLOAD_DESTINATION_VIDEO) {
    result.action = destination ? "skipped_not_video" : "skipped_homework_or_headshot";
    result.reason = `Upload Destination must be ${UPLOAD_DESTINATION_VIDEO}; got ${destination || "[blank]"}.`;
    return result;
  }

  const status = selectName(fields[FIELD_NAMES.uploadStatus]);
  if (UNCERTAIN_UPLOAD_STATUSES.has(status)) {
    result.action = "skipped_upload_in_flight";
    result.reason = `Upload Status ${status} is in-flight or uncertain.`;
    return result;
  }
  if (status !== UPLOAD_STATUS_UPLOADED) {
    result.reason = `Upload Status must be ${UPLOAD_STATUS_UPLOADED}; got ${status || "[blank]"}.`;
    return result;
  }

  if (fields[FIELD_NAMES.sendToMakeTrigger] === true) {
    result.action = "skipped_upload_in_flight";
    result.reason = "Send to Make Trigger is checked.";
    return result;
  }

  if (!sourceKey || !isPathSafeStorageKey(sourceKey)) {
    result.action = "skipped_missing_source_key";
    result.reason = "Storage Key is missing or unsafe.";
    return result;
  }

  const customRaw = String(input.customVideoFileName ?? "").trim();
  if (isBlankCustomName(customRaw)) {
    result.action = ["—", "-", "\u2014", "\u2013"].includes(customRaw)
      ? "skipped_blank_custom_name"
      : "skipped_missing_custom_name";
    result.reason = "Custom Video File Name is blank or em dash placeholder.";
    return result;
  }

  if (!passesCoachConfirmation(Boolean(input.coachConfirmed), confirmFlag)) {
    result.action = "skipped_missing_confirmation";
    result.reason =
      "Coach confirmation required — set Confirm S3 Video Rename or pass --confirm-rename.";
    return result;
  }

  if (!input.activityDate) {
    result.action = "error_verify_failed";
    result.reason = "Activity Date is required.";
    return result;
  }

  const athleteFolder = folderPersonName(input.lastName || "", input.firstName || "");
  const programFolder = folderProgramInstance(input.programInstanceName || "");
  const originalName = selectName(fields[FIELD_NAMES.originalFileName]) || "upload.bin";
  const extension = extensionFromFilename(originalName);

  const destinationKey = buildFut009DestinationKey({
    athleteFolder,
    programInstanceFolder: programFolder,
    activityDate: input.activityDate,
    lastName: input.lastName,
    firstName: input.firstName,
    customVideoFileName: customRaw,
    extension,
    existingBasenames: input.existingBasenames || [],
  });

  result.destinationKey = destinationKey;
  result.customVideoFileName = customRaw;

  if (sourceKey === destinationKey) {
    result.action = "skipped_already_named";
    result.reason = "Storage Key already matches computed destination.";
    return result;
  }

  const sourceBasename = extractBasenameFromKey(sourceKey).toLowerCase();
  const destBasename = extractBasenameFromKey(destinationKey).toLowerCase();
  if (sourceBasename === destBasename) {
    result.action = "skipped_unchanged_custom_name";
    result.reason = "Custom name sanitizes to the same basename.";
    return result;
  }

  result.action = confirmFlag ? "dry_run_would_rename" : "dry_run_would_rename";
  result.shouldCopy = true;
  result.reason = "Eligible for FUT-009 copy-on-write rename.";
  return result;
}

/**
 * @param {string} bucket
 * @param {string} region
 * @param {string} storageKey
 * @returns {string}
 */
function buildCanonicalUrl(bucket, region, storageKey) {
  const encoded = String(storageKey)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://${bucket}.s3.${region}.amazonaws.com/${encoded}`;
}

/**
 * @param {object} input
 * @returns {Record<string, unknown>}
 */
function buildRenameWritebackFields(input) {
  const formattedBasename = extractBasenameFromKey(input.destinationKey);
  const fields = {
    [FIELD_NAMES.storageKey]: input.destinationKey,
    [FIELD_NAMES.canonicalFileUrl]: buildCanonicalUrl(
      input.bucket,
      input.region,
      input.destinationKey,
    ),
    [FIELD_NAMES.formattedUploadName]: formattedBasename,
    [FIELD_NAMES.uploadError]: null,
  };
  if (input.includeAuditFields) {
    fields[FIELD_NAMES.previousStorageKey] = input.previousStorageKey;
    fields[FIELD_NAMES.renamedAt] = new Date().toISOString();
  }
  return fields;
}

module.exports = {
  BLANK_CUSTOM_MARKERS,
  FIELD_NAMES,
  FUT009_LAYOUT_PREFIX,
  UPLOAD_DESTINATION_VIDEO,
  buildCanonicalUrl,
  buildFut009DestinationKey,
  buildRenameWritebackFields,
  evaluateRenameEligibility,
  extractBasenameFromKey,
  isBlankCustomName,
  passesCoachConfirmation,
};
