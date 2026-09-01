#!/usr/bin/env node
/** FUT-009 automation 120 handoff — offline contract tests. */

const assert = require("assert");
const {
  buildLambdaRenamePayload,
  evaluateAutomationTrigger,
  isBlankCustomName,
  mapLambdaStatusOut,
  shouldClearConfirmCheckbox,
} = require("./fut009-rename-handoff");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("blank custom name does not call Lambda", () => {
  const result = evaluateAutomationTrigger({
    recordId: "recVF1234567890AB",
    customVideoFileName: "—",
    confirmS3Rename: true,
    submissionAssetId: "recSA1234567890AB",
  });
  assert.strictEqual(result.shouldCallLambda, false);
  assert.strictEqual(result.actionOut, "skipped_blank_custom_name");
});

test("missing confirmation does not call Lambda", () => {
  const result = evaluateAutomationTrigger({
    recordId: "recVF1234567890AB",
    customVideoFileName: "OffTheDribble",
    confirmS3Rename: false,
    submissionAssetId: "recSA1234567890AB",
  });
  assert.strictEqual(result.shouldCallLambda, false);
  assert.strictEqual(result.actionOut, "skipped_missing_confirmation");
});

test("valid custom name with confirmation calls Lambda", () => {
  const result = evaluateAutomationTrigger({
    recordId: "recVF1234567890AB",
    customVideoFileName: "OffTheDribble",
    confirmS3Rename: true,
    submissionAssetId: "recSA1234567890AB",
  });
  assert.strictEqual(result.shouldCallLambda, true);
  assert.strictEqual(result.actionOut, "ready_for_lambda");
});

test("missing submission asset blocks Lambda", () => {
  const result = evaluateAutomationTrigger({
    recordId: "recVF1234567890AB",
    customVideoFileName: "OffTheDribble",
    confirmS3Rename: true,
    submissionAssetId: "",
  });
  assert.strictEqual(result.shouldCallLambda, false);
  assert.strictEqual(result.actionOut, "error_missing_submission_asset");
});

test("Lambda payload includes coach confirmation", () => {
  const payload = buildLambdaRenamePayload({
    videoFeedbackRecordId: "recVF1234567890AB",
    includeAuditFields: true,
  });
  assert.strictEqual(payload.videoFeedbackRecordId, "recVF1234567890AB");
  assert.strictEqual(payload.coachConfirmed, true);
  assert.strictEqual(payload.confirmRename, true);
  assert.strictEqual(payload.dryRun, false);
  assert.strictEqual(payload.includeAuditFields, true);
});

test("clear confirm checkbox after successful rename actions", () => {
  assert.strictEqual(shouldClearConfirmCheckbox("renamed"), true);
  assert.strictEqual(shouldClearConfirmCheckbox("airtable_only_recovery"), true);
  assert.strictEqual(shouldClearConfirmCheckbox("skipped_already_named"), true);
  assert.strictEqual(shouldClearConfirmCheckbox("error_copy_failed"), false);
});

test("mapLambdaStatusOut for success and skip paths", () => {
  assert.strictEqual(mapLambdaStatusOut("renamed"), "success");
  assert.strictEqual(mapLambdaStatusOut("skipped_upload_in_flight"), "skipped");
  assert.strictEqual(mapLambdaStatusOut("error_copy_failed"), "error");
});

test("isBlankCustomName rejects whitespace-only", () => {
  assert.strictEqual(isBlankCustomName("   "), true);
});

console.log("\nAll fut009-rename-handoff tests passed.");
