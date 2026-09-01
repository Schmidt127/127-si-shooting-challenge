/*
Automation: 120 - Video Review and XP - Apply FUT-009 S3 Video Rename
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — paste pending Mike approval
Last GitHub Update: 2026-09-01

Purpose:
Automatically renames the linked video Submission Asset in S3 after the coach enters
Custom Video File Name and checks Confirm S3 Video Rename on Video Feedback.

Trigger:
Video Feedback when Confirm S3 Video Rename is checked and Custom Video File Name is valid.

Important Tables:
Video Feedback, Submission Assets

Important Fields:
Custom Video File Name, Confirm S3 Video Rename, Submission Asset, Storage Key

Notes:
Calls Lambda POST /fut009/rename (CopyObject + verified Airtable writeback).
CLI remains for recovery/backfill only. GitHub is source of truth; Airtable is deployed copy.
*/

/********************************************************************
 * AUTOMATION:
 * 120 - Video Review and XP - Apply FUT-009 S3 Video Rename
 *
 * SYSTEM:
 * 127 Sports Intensity - Shooting Challenge App
 *
 * TABLE:
 * Video Feedback
 *
 * VERSION:
 * v1.0 - Automatic post-feedback S3 rename via Lambda worker
 *
 * CREATED:
 * 2026-09-01
 *
 * LAST UPDATED:
 * 2026-09-01
 *
 * PURPOSE:
 * When a coach enters Custom Video File Name and checks Confirm S3 Video Rename,
 * this automation calls the FUT-009 Lambda rename worker. The worker:
 * - Validates the linked Submission Asset
 * - CopyObject source → Option D + FUT-007 destination key
 * - HeadObject verify destination
 * - Patches Storage Key, Canonical File URL, Formatted Upload Name
 * - Retains the original S3 object (no DeleteObject)
 *
 * Reviewer File URL / token remain unchanged (record/token formula).
 *
 * THIS IS NOT:
 * - A manual CLI replacement (CLI remains for recovery/backfill)
 * - An upload automation (070b) or parent email automation (073)
 * - Homework or headshot rename (out of scope v1)
 *
 * FOLDER:
 * 11 - Video Review and XP
 *
 * AUTOMATION NAME:
 * 120 - Video Review and XP - Apply FUT-009 S3 Video Rename
 *
 * RECOMMENDED TRIGGER CONDITIONS (all must match):
 * - Confirm S3 Video Rename is checked
 * - Custom Video File Name is not empty
 * - Custom Video File Name is not —
 * - Submission Asset is not empty
 *
 * REQUIRED INPUT VARIABLES:
 * - recordId — Video Feedback record ID from trigger
 * - lambdaRenameUrl — Lambda Function URL + /fut009/rename
 * - uploadWebhookSecret — X-Upload-Secret value (same as 070b upload)
 *
 * OPTIONAL INPUT:
 * - includeAuditFields — "true" to write Previous Storage Key + Renamed At (PKG-004)
 *
 * REQUIRED OUTPUTS:
 * - statusOut = success | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 * - submissionAssetRecordId
 * - sourceKey
 * - destinationKey
 ********************************************************************/

// @ts-nocheck

async function main() {
  /************************************************************
   * SECTION 1: SCRIPT METADATA + CONFIG
   ************************************************************/

  const SCRIPT = {
    scriptName: "120 - Video Review and XP - Apply FUT-009 S3 Video Rename",
    version: "v1.0",
    versionDate: "2026-09-01",
    originalWrittenDate: "2026-09-01",
    lastUpdated: "2026-09-01",
    folder: "11 - Video Review and XP",
    automationName: "120 - Video Review and XP - Apply FUT-009 S3 Video Rename",
  };

  const CONFIG = {
    tables: {
      videoFeedback: "Video Feedback",
    },
    fields: {
      customVideoFileName: "Custom Video File Name",
      confirmS3Rename: "Confirm S3 Video Rename",
      submissionAsset: "Submission Asset",
    },
    blankCustomMarkers: new Set(["", "—", "-", "\u2014", "\u2013"]),
    actions: {
      renamed: "renamed",
      airtableRecovery: "airtable_only_recovery",
      skippedAlreadyNamed: "skipped_already_named",
      readyForLambda: "ready_for_lambda",
      skippedBlankCustom: "skipped_blank_custom_name",
      skippedMissingConfirmation: "skipped_missing_confirmation",
      errorMissingAsset: "error_missing_submission_asset",
      errorInvalidRecord: "error_invalid_record_id",
      errorLambdaHttp: "error_lambda_http",
      errorLambdaBody: "error_lambda_body",
      errorConfig: "error_config",
      error: "error",
    },
  };

  /************************************************************
   * SECTION 2: HELPERS
   ************************************************************/

  function setOutputSafe(key, value) {
    try {
      output.set(key, value);
    } catch (_error) {
      // output may be unavailable in some test contexts
    }
  }

  function fieldText(value) {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value) && value.length) return String(value[0]).trim();
    if (typeof value === "object" && value && "name" in value) {
      return String(value.name).trim();
    }
    return String(value).trim();
  }

  function firstLinkId(value) {
    if (!Array.isArray(value) || !value.length) return "";
    const item = value[0];
    if (typeof item === "string" && item.startsWith("rec")) return item;
    if (item && typeof item === "object" && typeof item.id === "string" && item.id.startsWith("rec")) {
      return item.id;
    }
    return "";
  }

  function isBlankCustomName(value) {
    return CONFIG.blankCustomMarkers.has(fieldText(value));
  }

  function sanitizeUrl(value) {
    return String(value || "").trim().replace(/[\r\n\t]/g, "");
  }

  function shouldClearConfirmCheckbox(actionOut) {
    return (
      actionOut === CONFIG.actions.renamed ||
      actionOut === CONFIG.actions.airtableRecovery ||
      actionOut === CONFIG.actions.skippedAlreadyNamed
    );
  }

  function mapLambdaStatusOut(actionOut) {
    if (shouldClearConfirmCheckbox(actionOut)) return "success";
    if (String(actionOut || "").startsWith("skipped_")) return "skipped";
    if (String(actionOut || "").startsWith("error_")) return "error";
    if (actionOut === "dry_run_would_rename") return "skipped";
    return "error";
  }

  function fail(actionOut, errorOut, debugStep, extra = {}) {
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("errorOut", errorOut);
    setOutputSafe("debugStep", debugStep);
    for (const [key, value] of Object.entries(extra)) {
      setOutputSafe(key, value);
    }
    console.log(
      JSON.stringify({
        automation: SCRIPT.automationName,
        version: SCRIPT.version,
        statusOut: "error",
        actionOut,
        errorOut,
        debugStep,
        ...extra,
      }),
    );
    throw new Error(errorOut);
  }

  function skip(actionOut, reason, debugStep, extra = {}) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("errorOut", reason);
    setOutputSafe("debugStep", debugStep);
    for (const [key, value] of Object.entries(extra)) {
      setOutputSafe(key, value);
    }
    console.log(
      JSON.stringify({
        automation: SCRIPT.automationName,
        version: SCRIPT.version,
        statusOut: "skipped",
        actionOut,
        errorOut: reason,
        debugStep,
        ...extra,
      }),
    );
    return;
  }

  function success(actionOut, debugStep, extra = {}) {
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    for (const [key, value] of Object.entries(extra)) {
      setOutputSafe(key, value);
    }
    console.log(
      JSON.stringify({
        automation: SCRIPT.automationName,
        version: SCRIPT.version,
        statusOut: "success",
        actionOut,
        debugStep,
        ...extra,
      }),
    );
  }

  /************************************************************
   * SECTION 3: INPUT VALIDATION
   ************************************************************/

  setOutputSafe("debugStep", "validate_input");

  const inputConfig = input.config();
  const recordId = fieldText(inputConfig.recordId);
  const lambdaRenameUrl = sanitizeUrl(inputConfig.lambdaRenameUrl);
  const uploadWebhookSecret = fieldText(inputConfig.uploadWebhookSecret);
  const includeAuditFields = fieldText(inputConfig.includeAuditFields).toLowerCase() === "true";

  if (!recordId.startsWith("rec")) {
    fail(CONFIG.actions.errorInvalidRecord, "recordId must be a Video Feedback record ID.", "validate_input");
  }

  if (!lambdaRenameUrl.startsWith("https://")) {
    fail(
      CONFIG.actions.errorConfig,
      "lambdaRenameUrl must be the Lambda Function URL ending in /fut009/rename.",
      "validate_input",
    );
  }

  if (!uploadWebhookSecret) {
    fail(
      CONFIG.actions.errorConfig,
      "uploadWebhookSecret (X-Upload-Secret) is required.",
      "validate_input",
    );
  }

  /************************************************************
   * SECTION 4: LOAD VIDEO FEEDBACK + PRE-FLIGHT
   ************************************************************/

  setOutputSafe("debugStep", "load_video_feedback");

  const vfTable = base.getTable(CONFIG.tables.videoFeedback);
  const vfRecord = await vfTable.selectRecordAsync(recordId);
  if (!vfRecord) {
    fail(CONFIG.actions.errorInvalidRecord, `Video Feedback record not found: ${recordId}`, "load_video_feedback");
  }

  const customVideoFileName = fieldText(vfRecord.getCellValueAsString(CONFIG.fields.customVideoFileName));
  const confirmS3Rename = vfRecord.getCellValue(CONFIG.fields.confirmS3Rename) === true;
  const submissionAssetId = firstLinkId(vfRecord.getCellValue(CONFIG.fields.submissionAsset));

  setOutputSafe("submissionAssetRecordId", submissionAssetId);
  setOutputSafe("customVideoFileName", customVideoFileName);

  if (isBlankCustomName(customVideoFileName)) {
    return skip(
      CONFIG.actions.skippedBlankCustom,
      "Custom Video File Name is blank or em dash placeholder.",
      "preflight_blank_custom_name",
      { submissionAssetRecordId: submissionAssetId },
    );
  }

  if (!confirmS3Rename) {
    return skip(
      CONFIG.actions.skippedMissingConfirmation,
      "Confirm S3 Video Rename is not checked.",
      "preflight_missing_confirmation",
      { submissionAssetRecordId: submissionAssetId },
    );
  }

  if (!submissionAssetId) {
    fail(
      CONFIG.actions.errorMissingAsset,
      "Video Feedback has no linked Submission Asset.",
      "preflight_missing_submission_asset",
      { submissionAssetRecordId: "" },
    );
  }

  /************************************************************
   * SECTION 5: CALL LAMBDA FUT-009 RENAME WORKER
   ************************************************************/

  setOutputSafe("debugStep", "call_lambda_rename");

  const payload = {
    routeKey: "fut009_rename",
    source: "automation_120",
    videoFeedbackRecordId: recordId,
    submissionAssetRecordId: submissionAssetId,
    coachConfirmed: true,
    confirmRename: true,
    includeAuditFields,
    dryRun: false,
  };

  let response;
  try {
    response = await fetch(lambdaRenameUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Secret": uploadWebhookSecret,
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchError) {
    fail(
      CONFIG.actions.errorLambdaHttp,
      `Lambda fetch failed: ${fetchError.message || fetchError}`,
      "call_lambda_rename",
      { submissionAssetRecordId: submissionAssetId },
    );
  }

  const responseText = await response.text();
  let responseBody = {};
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch (_parseError) {
    fail(
      CONFIG.actions.errorLambdaBody,
      `Lambda returned non-JSON body (HTTP ${response.status}): ${responseText.slice(0, 400)}`,
      "call_lambda_rename",
      { submissionAssetRecordId: submissionAssetId },
    );
  }

  const actionOut = fieldText(responseBody.actionOut) || CONFIG.actions.error;
  const reason = fieldText(responseBody.reason || responseBody.errorOut);
  const sourceKey = fieldText(responseBody.sourceKey);
  const destinationKey = fieldText(responseBody.destinationKey);

  setOutputSafe("sourceKey", sourceKey);
  setOutputSafe("destinationKey", destinationKey);
  setOutputSafe("lambdaHttpStatus", response.status);
  setOutputSafe("lambdaActionOut", actionOut);

  if (!response.ok && mapLambdaStatusOut(actionOut) === "error") {
    fail(
      actionOut,
      reason || `Lambda rename failed with HTTP ${response.status}.`,
      "lambda_error_response",
      {
        submissionAssetRecordId: submissionAssetId,
        sourceKey,
        destinationKey,
      },
    );
  }

  /************************************************************
   * SECTION 6: CLEAR CONFIRM CHECKBOX ON SUCCESS / IDEMPOTENT SKIP
   ************************************************************/

  let confirmCheckboxCleared = false;

  if (shouldClearConfirmCheckbox(actionOut)) {
    setOutputSafe("debugStep", "clear_confirm_checkbox");
    try {
      await vfTable.updateRecordAsync(recordId, {
        [CONFIG.fields.confirmS3Rename]: false,
      });
      confirmCheckboxCleared = true;
      setOutputSafe("confirmCheckboxCleared", true);
    } catch (updateError) {
      setOutputSafe("confirmCheckboxCleared", false);
      setOutputSafe("confirmCheckboxClearError", updateError.message || String(updateError));
    }
  } else {
    setOutputSafe("confirmCheckboxCleared", false);
  }

  const statusOut = mapLambdaStatusOut(actionOut);
  setOutputSafe("statusOut", statusOut);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", statusOut === "error" ? reason : "");
  setOutputSafe("debugStep", "complete");

  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      statusOut,
      actionOut,
      submissionAssetRecordId: submissionAssetId,
      sourceKey,
      destinationKey,
      confirmCheckboxCleared,
      oldObjectRetained: responseBody.oldObjectRetained === true,
    }),
  );

  if (statusOut === "skipped") {
    return;
  }
  if (statusOut === "error") {
    throw new Error(reason || actionOut);
  }

  success(actionOut, "complete", {
    submissionAssetRecordId: submissionAssetId,
    sourceKey,
    destinationKey,
  });
}

try {
  await main();
} catch (error) {
  if (!String(error?.message || "").length) {
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", String(error));
  }
}
