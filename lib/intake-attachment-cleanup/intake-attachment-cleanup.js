/**
 * FUT-010 — Delete Airtable intake attachments after verified S3 upload.
 *
 * Pure helpers shared by:
 * - tools/airtable/fut_010_intake_attachment_cleanup.py (via duplicated contract tests)
 * - airtable/extension-scripts/safe-backfills/fut-010-clear-intake-attachments.js (inline copy)
 * - offline unit tests
 *
 * Architecture: post-upload cleanup worker — NOT part of 070a/b/c upload hot path.
 * The Airtable attachment is transient intake; S3/Lambda is durable application storage.
 */

"use strict";

const { classifySecureVideoUrl } = require("../secure-video-url.js");
const {
  evaluateSubmissionAssetWriteback,
  selectName,
} = require("../../airtable/automations/shooting-challenge/lib/upload-make-lambda-response.js");

/** @typedef {"homework"|"video"|"unknown"} AssetCategory */

/** @typedef {"eligible"|"skipped_already_empty"|"skipped_ineligible"|"skipped_verification_failed"|"skipped_uncertain_upload"|"skipped_unknown_destination"|"dry_run_would_delete"|"deleted"|"delete_failed"} CleanupAction */

/**
 * @typedef {{
 *   s3ObjectExists?: boolean|null,
 *   canonicalUrlReachable?: boolean|null,
 *   reviewerUrlClassification?: string|null,
 * }} ExternalVerificationChecks
 */

const FIELD_NAMES = {
  airtableAttachment: "Airtable Attachment",
  uploadStatus: "Upload Status",
  uploadDestination: "Upload Destination",
  assetPurpose: "Asset Purpose",
  storageKey: "Storage Key",
  canonicalFileUrl: "Canonical File URL",
  reviewerFileUrl: "Reviewer File URL",
  reviewerAccessToken: "Reviewer Access Token",
  uploadError: "Upload Error",
  writebackComplete: "Writeback Complete?",
  sendToMakeTrigger: "Send to Make Trigger",
  uploadedAt: "Uploaded At",
};

const UPLOAD_STATUS_UPLOADED = "Uploaded";
const UPLOAD_DESTINATION_HOMEWORK = "Homework Completions";
const UPLOAD_DESTINATION_VIDEO = "Video Feedback";

const UNCERTAIN_UPLOAD_STATUSES = new Set([
  "Pending Link",
  "Processing",
  "Ready",
  "Error",
  "No File",
]);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isWritebackCompleteFlag(value) {
  return value === 1 || value === true || value === "1";
}

/**
 * @param {unknown} attachments
 * @returns {number}
 */
function countAttachments(attachments) {
  if (!Array.isArray(attachments)) return 0;
  return attachments.filter((item) => item != null).length;
}

/**
 * @param {unknown} attachments
 * @returns {string[]}
 */
function attachmentIds(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return String(item.id || item.attachmentId || "").trim();
    })
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {AssetCategory}
 */
function resolveAssetCategory(fields) {
  const destination = selectName(fields[FIELD_NAMES.uploadDestination]);
  if (destination === UPLOAD_DESTINATION_HOMEWORK) return "homework";
  if (destination === UPLOAD_DESTINATION_VIDEO) return "video";

  const purpose = selectName(fields[FIELD_NAMES.assetPurpose]);
  if (/homework/i.test(purpose)) return "homework";
  if (/video/i.test(purpose)) return "video";
  return "unknown";
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
function isSendToMakeTriggerChecked(fields) {
  return fields[FIELD_NAMES.sendToMakeTrigger] === true;
}

/**
 * Field-level eligibility before AWS verification.
 * @param {Record<string, unknown>} fields
 * @returns {{
 *   eligible: boolean,
 *   category: AssetCategory,
 *   attachmentCount: number,
 *   failedChecks: string[],
 *   checks: Record<string, boolean>,
 *   reason: string,
 * }}
 */
function evaluateFieldEligibility(fields) {
  const category = resolveAssetCategory(fields);
  const attachmentCount = countAttachments(fields[FIELD_NAMES.airtableAttachment]);
  const uploadStatus = selectName(fields[FIELD_NAMES.uploadStatus]);
  const storageKey = selectName(fields[FIELD_NAMES.storageKey]);
  const uploadError = selectName(fields[FIELD_NAMES.uploadError]);
  const writeback = evaluateSubmissionAssetWriteback(fields);

  const checks = {
    supportedDestination: category === "homework" || category === "video",
    uploadStatusUploaded: uploadStatus === UPLOAD_STATUS_UPLOADED,
    storageKeyPopulated: Boolean(storageKey),
    writebackComplete: writeback.verified,
    uploadErrorBlank: !uploadError,
    attachmentPresent: attachmentCount > 0,
    sendToMakeTriggerUnchecked: !isSendToMakeTriggerChecked(fields),
    writebackFormulaChecked: isWritebackCompleteFlag(fields[FIELD_NAMES.writebackComplete]),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);

  let reason = "Field eligibility verified.";
  if (!checks.attachmentPresent) {
    reason = "Attachment already empty — nothing to delete.";
  } else if (!checks.supportedDestination) {
    reason = "Upload destination is not homework or video — skip.";
  } else if (!checks.uploadStatusUploaded || UNCERTAIN_UPLOAD_STATUSES.has(uploadStatus)) {
    reason = `Upload status is not Uploaded (${uploadStatus || "blank"}) — retain attachment.`;
  } else if (!checks.storageKeyPopulated) {
    reason = "Storage Key is missing — retain attachment.";
  } else if (!checks.writebackComplete || !checks.writebackFormulaChecked) {
    reason = "Writeback is incomplete — retain attachment.";
  } else if (!checks.uploadErrorBlank) {
    reason = "Upload Error is populated — retain attachment.";
  } else if (!checks.sendToMakeTriggerUnchecked) {
    reason = "Send to Make Trigger is still checked — upload may be in flight.";
  }

  const eligible =
    checks.supportedDestination &&
    checks.uploadStatusUploaded &&
    checks.storageKeyPopulated &&
    checks.writebackComplete &&
    checks.writebackFormulaChecked &&
    checks.uploadErrorBlank &&
    checks.attachmentPresent &&
    checks.sendToMakeTriggerUnchecked;

  return {
    eligible,
    category,
    attachmentCount,
    failedChecks,
    checks,
    reason,
  };
}

/**
 * AWS / URL verification layered on top of field eligibility.
 * @param {Record<string, unknown>} fields
 * @param {AssetCategory} category
 * @param {ExternalVerificationChecks} external
 * @returns {{
 *   verified: boolean,
 *   checks: Record<string, boolean>,
 *   failedChecks: string[],
 *   reason: string,
 * }}
 */
function evaluateAwsVerification(fields, category, external = {}) {
  const storageKey = selectName(fields[FIELD_NAMES.storageKey]);
  const canonicalUrl = selectName(fields[FIELD_NAMES.canonicalFileUrl]);
  const reviewerFileUrl = selectName(fields[FIELD_NAMES.reviewerFileUrl]);

  const checks = {
    storageKeyFormatValid: /^shooting-challenge\//.test(storageKey),
    canonicalUrlHttps: /^https:\/\//i.test(canonicalUrl),
    s3ObjectExists: external.s3ObjectExists === true,
    canonicalUrlReachable: external.canonicalUrlReachable !== false,
  };

  if (category === "video") {
    const reviewer = classifySecureVideoUrl(reviewerFileUrl);
    checks.reviewerUrlValid = reviewer.classification === "valid_lambda_viewer";
    if (external.reviewerUrlClassification != null) {
      checks.reviewerUrlValid =
        external.reviewerUrlClassification === "valid_lambda_viewer";
    }
  }

  const failedChecks = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);

  let reason = "AWS verification passed.";
  if (!checks.storageKeyFormatValid) {
    reason = "Storage Key format is invalid.";
  } else if (!checks.canonicalUrlHttps) {
    reason = "Canonical File URL is missing or not HTTPS.";
  } else if (!checks.s3ObjectExists) {
    reason = "S3 object not found at Storage Key.";
  } else if (!checks.canonicalUrlReachable) {
    reason = "Canonical File URL probe failed.";
  } else if (category === "video" && !checks.reviewerUrlValid) {
    reason = "Reviewer/Lambda viewer URL is missing or invalid.";
  }

  const verified = failedChecks.length === 0;
  return { verified, checks, failedChecks, reason };
}

/**
 * Full cleanup decision for one Submission Asset record.
 * @param {{
 *   recordId: string,
 *   fields: Record<string, unknown>,
 *   externalChecks?: ExternalVerificationChecks,
 *   dryRun?: boolean,
 *   previousDeletionFailed?: boolean,
 * }} input
 * @returns {{
 *   recordId: string,
 *   assetPurpose: string,
 *   assetCategory: AssetCategory,
 *   storageKey: string,
 *   attachmentCount: number,
 *   attachmentIds: string[],
 *   action: CleanupAction,
 *   eligible: boolean,
 *   verification: { field: ReturnType<typeof evaluateFieldEligibility>, aws: ReturnType<typeof evaluateAwsVerification>|null },
 *   deletion: { attempted: boolean, succeeded: boolean, payload: Record<string, unknown>|null },
 *   failureReason: string,
 *   logLine: string,
 * }}
 */
function decideIntakeAttachmentCleanup({
  recordId,
  fields,
  externalChecks = {},
  dryRun = true,
  previousDeletionFailed = false,
} = {}) {
  const assetPurpose = selectName(fields[FIELD_NAMES.assetPurpose]) || selectName(fields[FIELD_NAMES.uploadDestination]);
  const storageKey = selectName(fields[FIELD_NAMES.storageKey]);
  const attachmentCount = countAttachments(fields[FIELD_NAMES.airtableAttachment]);
  const ids = attachmentIds(fields[FIELD_NAMES.airtableAttachment]);

  const fieldEval = evaluateFieldEligibility(fields);
  const base = {
    recordId,
    assetPurpose,
    assetCategory: fieldEval.category,
    storageKey,
    attachmentCount,
    attachmentIds: ids,
    eligible: false,
    verification: { field: fieldEval, aws: null },
    deletion: { attempted: false, succeeded: false, payload: null },
    failureReason: "",
    logLine: "",
  };

  if (attachmentCount === 0) {
    return {
      ...base,
      action: "skipped_already_empty",
      failureReason: fieldEval.reason,
      logLine: formatCleanupLogLine({
        recordId,
        assetPurpose,
        storageKey,
        verificationResult: "skipped_already_empty",
        deletionResult: "not_attempted",
        failureReason: fieldEval.reason,
      }),
    };
  }

  if (!fieldEval.eligible) {
    const action = fieldEval.checks.sendToMakeTriggerUnchecked === false
      ? "skipped_uncertain_upload"
      : "skipped_ineligible";
    return {
      ...base,
      action,
      failureReason: fieldEval.reason,
      logLine: formatCleanupLogLine({
        recordId,
        assetPurpose,
        storageKey,
        verificationResult: action,
        deletionResult: "not_attempted",
        failureReason: fieldEval.reason,
      }),
    };
  }

  const awsEval = evaluateAwsVerification(fields, fieldEval.category, externalChecks);
  base.verification.aws = awsEval;

  if (!awsEval.verified) {
    return {
      ...base,
      action: "skipped_verification_failed",
      failureReason: awsEval.reason,
      logLine: formatCleanupLogLine({
        recordId,
        assetPurpose,
        storageKey,
        verificationResult: "failed",
        deletionResult: "not_attempted",
        failureReason: awsEval.reason,
      }),
    };
  }

  const payload = buildAttachmentClearPayload();
  const action = dryRun ? "dry_run_would_delete" : "deleted";

  return {
    ...base,
    eligible: true,
    action: previousDeletionFailed && dryRun ? "dry_run_would_delete" : action,
    deletion: {
      attempted: !dryRun,
      succeeded: !dryRun,
      payload,
    },
    failureReason: "",
    logLine: formatCleanupLogLine({
      recordId,
      assetPurpose,
      storageKey,
      verificationResult: "passed",
      deletionResult: dryRun ? "dry_run_would_delete" : "deleted",
      failureReason: previousDeletionFailed ? "retry_after_prior_failure" : "",
    }),
  };
}

/**
 * Airtable REST / Script API: empty array clears all attachments; record row is preserved.
 * @returns {{ "Airtable Attachment": [] }}
 */
function buildAttachmentClearPayload() {
  return { [FIELD_NAMES.airtableAttachment]: [] };
}

/**
 * @param {{
 *   recordId: string,
 *   assetPurpose: string,
 *   storageKey: string,
 *   verificationResult: string,
 *   deletionResult: string,
 *   failureReason?: string,
 * }} parts
 * @returns {string}
 */
function formatCleanupLogLine(parts) {
  const failure = parts.failureReason ? ` failureReason=${JSON.stringify(parts.failureReason)}` : "";
  return [
    `recordId=${parts.recordId}`,
    `assetPurpose=${JSON.stringify(parts.assetPurpose || "")}`,
    `storageKey=${JSON.stringify(parts.storageKey || "")}`,
    `verificationResult=${parts.verificationResult}`,
    `deletionResult=${parts.deletionResult}`,
  ].join(" ") + failure;
}

/**
 * Idempotent re-run guard: never create side effects beyond attachment clear.
 * @param {ReturnType<typeof decideIntakeAttachmentCleanup>} decision
 * @returns {boolean}
 */
function shouldApplyAttachmentClear(decision) {
  return decision.eligible && decision.action === "deleted";
}

/**
 * Reconciliation scan filter — uploaded rows that still retain intake attachment.
 * @param {Record<string, unknown>} fields
 * @returns {boolean}
 */
function isReconciliationCandidate(fields) {
  const uploadStatus = selectName(fields[FIELD_NAMES.uploadStatus]);
  const attachmentCount = countAttachments(fields[FIELD_NAMES.airtableAttachment]);
  const writeback = evaluateSubmissionAssetWriteback(fields);
  return (
    uploadStatus === UPLOAD_STATUS_UPLOADED &&
    attachmentCount > 0 &&
    writeback.verified &&
    Boolean(selectName(fields[FIELD_NAMES.storageKey]))
  );
}

module.exports = {
  FIELD_NAMES,
  UPLOAD_STATUS_UPLOADED,
  UPLOAD_DESTINATION_HOMEWORK,
  UPLOAD_DESTINATION_VIDEO,
  resolveAssetCategory,
  countAttachments,
  attachmentIds,
  evaluateFieldEligibility,
  evaluateAwsVerification,
  decideIntakeAttachmentCleanup,
  buildAttachmentClearPayload,
  formatCleanupLogLine,
  shouldApplyAttachmentClear,
  isReconciliationCandidate,
  isSendToMakeTriggerChecked,
};
