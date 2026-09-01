/**
 * FUT-009 automation handoff helpers — eligibility pre-check + Lambda payload builder.
 *
 * Used by:
 * - airtable/automations/shooting-challenge/120-…-apply-fut009-s3-video-rename.js
 * - offline tests (lib/fut009-rename-handoff.test.js)
 *
 * Authority: docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md
 */

"use strict";

const BLANK_CUSTOM_MARKERS = new Set(["", "—", "-", "\u2014", "\u2013"]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function fieldText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && value.length) return String(value[0]).trim();
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
  return BLANK_CUSTOM_MARKERS.has(fieldText(value));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function firstLinkId(value) {
  if (!Array.isArray(value) || !value.length) return "";
  const item = value[0];
  if (typeof item === "string" && item.startsWith("rec")) return item;
  if (item && typeof item === "object" && typeof item.id === "string" && item.id.startsWith("rec")) {
    return item.id;
  }
  return "";
}

/**
 * Pre-flight trigger validation before calling Lambda.
 *
 * @param {{
 *   recordId: string,
 *   customVideoFileName: string,
 *   confirmS3Rename: boolean,
 *   submissionAssetId: string,
 * }} input
 * @returns {{ shouldCallLambda: boolean, actionOut: string, reason: string }}
 */
function evaluateAutomationTrigger(input) {
  const recordId = fieldText(input.recordId);
  if (!recordId.startsWith("rec")) {
    return {
      shouldCallLambda: false,
      actionOut: "error_invalid_record_id",
      reason: "recordId must be a Video Feedback record ID.",
    };
  }

  const customName = fieldText(input.customVideoFileName);
  if (isBlankCustomName(customName)) {
    return {
      shouldCallLambda: false,
      actionOut: "skipped_blank_custom_name",
      reason: "Custom Video File Name is blank or em dash placeholder.",
    };
  }

  if (input.confirmS3Rename !== true) {
    return {
      shouldCallLambda: false,
      actionOut: "skipped_missing_confirmation",
      reason: "Confirm S3 Video Rename is not checked.",
    };
  }

  const submissionAssetId = fieldText(input.submissionAssetId);
  if (!submissionAssetId.startsWith("rec")) {
    return {
      shouldCallLambda: false,
      actionOut: "error_missing_submission_asset",
      reason: "Video Feedback has no linked Submission Asset.",
    };
  }

  return {
    shouldCallLambda: true,
    actionOut: "ready_for_lambda",
    reason: "Eligible for automatic FUT-009 rename handoff.",
  };
}

/**
 * @param {{
 *   videoFeedbackRecordId: string,
 *   includeAuditFields?: boolean,
 * }} input
 * @returns {Record<string, unknown>}
 */
function buildLambdaRenamePayload(input) {
  return {
    routeKey: "fut009_rename",
    source: "automation_120",
    videoFeedbackRecordId: input.videoFeedbackRecordId,
    coachConfirmed: true,
    confirmRename: true,
    includeAuditFields: input.includeAuditFields === true,
    dryRun: false,
  };
}

/**
 * Whether to clear Confirm S3 Video Rename after Lambda response.
 *
 * @param {string} actionOut
 * @returns {boolean}
 */
function shouldClearConfirmCheckbox(actionOut) {
  return actionOut === "renamed" || actionOut === "airtable_only_recovery" || actionOut === "skipped_already_named";
}

/**
 * Map Lambda actionOut to automation statusOut.
 *
 * @param {string} actionOut
 * @returns {"success"|"skipped"|"error"}
 */
function mapLambdaStatusOut(actionOut) {
  if (
    actionOut === "renamed" ||
    actionOut === "airtable_only_recovery" ||
    actionOut === "skipped_already_named"
  ) {
    return "success";
  }
  if (actionOut.startsWith("skipped_") || actionOut === "dry_run_would_rename") {
    return "skipped";
  }
  if (actionOut.startsWith("error_")) {
    return "error";
  }
  return "error";
}

module.exports = {
  BLANK_CUSTOM_MARKERS,
  buildLambdaRenamePayload,
  evaluateAutomationTrigger,
  fieldText,
  firstLinkId,
  isBlankCustomName,
  mapLambdaStatusOut,
  shouldClearConfirmCheckbox,
};
