#!/usr/bin/env node
/**
 * SC-008 — Email, Make, upload, and failure-path proof pack (offline + mocks).
 *
 * Prefer mocks / isolated fixtures. Does not disable production services.
 * Does not send live email. Does not print secrets.
 *
 * Run: node tools/testing/sc-007-008/failure-path-pack.test.js
 */
"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const {
  evaluateWeeklySummarySendGate,
  planWeeklyEmailWebhookOutcome,
  decideWeeklyEmailRetryAction,
  classifyWeeklyEmailWebhookResponse,
  evaluateAssetUploadFields,
} = require("../../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

const {
  parseLambdaResponseBody,
  evaluateLambdaHandoffResult,
  resolveMakeHttpResponse,
  decide070cAction,
  evaluateFinalUploadSuccessContract,
  evaluateSubmissionAssetWriteback,
} = require("../../../airtable/automations/shooting-challenge/lib/upload-make-lambda-response");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.message ? error.message : error}`);
  }
}

function passingUploadFields(overrides = {}) {
  return {
    "Send to Make Trigger": false,
    "Upload Status": "Uploaded",
    "Canonical File URL":
      "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/x.pdf",
    "Storage Key": "shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/x.pdf",
    "File Content Hash": "b".repeat(64),
    "File Hash Algorithm": "SHA-256",
    "Uploaded At": "2026-08-04T20:00:00.000Z",
    "Upload Error": "",
    "Writeback Complete?": 1,
    "Reviewer Access Token": "viewer-token-abcdefghijklmnopqrstuvwxyz0123",
    "Reviewer File URL":
      "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recAsset?token=viewer-token-abcdefghijklmnopqrstuvwxyz0123",
    ...overrides,
  };
}

// --- Missing / invalid webhook configuration ---

test("missing webhook → classify as unknown/retryable; plan keeps Send to Make?", () => {
  const classified = classifyWeeklyEmailWebhookResponse({
    httpStatus: null,
    bodyText: "Missing required input: makeWebhookUrl",
  });
  assert.strictEqual(classified.webhookOk, false);
  assert.strictEqual(classified.retryable, true);

  const plan = planWeeklyEmailWebhookOutcome({
    webhookOk: false,
    emailSent: false,
    errorMessage: classified.errorMessage,
  });
  assert.strictEqual(plan.action, "handoff_failed_retryable");
  assert.ok(plan.mustNotClear.includes("Send to Make?"));
});

test("blank recipient gate: send not allowed without recipients (modeled as not ready / operator error)", () => {
  // 074 throws when cleanCsvEmails returns blank — modeled here as send gate refusing incomplete ready state
  // and retry SOP requiring data correction before rearm.
  const notArmed = evaluateWeeklySummarySendGate({
    emailReady: true,
    emailSent: false,
    sendToMake: false,
  });
  assert.strictEqual(notArmed.action, "error_send_not_armed");

  const rearm = decideWeeklyEmailRetryAction({
    emailSent: false,
    sendToMake: false,
    emailReady: true,
    hasErrorMessage: true,
  });
  assert.strictEqual(rearm.action, "rearm_send_to_make");
});

// --- Make / email failure + retry without duplicate ---

test("Make 502 → retryable; after success Sent? blocks duplicate", () => {
  const fail = classifyWeeklyEmailWebhookResponse({ httpStatus: 502 });
  assert.strictEqual(fail.class, "retryable_http");
  assert.strictEqual(fail.webhookOk, false);

  const failPlan = planWeeklyEmailWebhookOutcome({
    webhookOk: false,
    emailSent: false,
    errorMessage: fail.errorMessage,
  });
  assert.strictEqual(failPlan.allowRetry, true);
  assert.ok(!Object.prototype.hasOwnProperty.call(failPlan.fields, "Send to Make?"));

  const ok = classifyWeeklyEmailWebhookResponse({ httpStatus: 200, bodyText: '{"ok":true}' });
  assert.strictEqual(ok.webhookOk, true);
  const okPlan = planWeeklyEmailWebhookOutcome({ webhookOk: true, emailSent: false });
  assert.strictEqual(okPlan.fields["Send to Make?"], false);
  assert.ok(okPlan.mustNotWrite.includes("Weekly Email Sent?"));

  const dup = evaluateWeeklySummarySendGate({
    emailReady: true,
    emailSent: true,
    sendToMake: true,
  });
  assert.strictEqual(dup.action, "error_duplicate_send_blocked");

  const noRetry = decideWeeklyEmailRetryAction({ emailSent: true });
  assert.strictEqual(noRetry.action, "do_not_retry");
});

test("malformed Make response → retryable, no Sent? write", () => {
  const malformed = classifyWeeklyEmailWebhookResponse({ parseError: true });
  assert.strictEqual(malformed.class, "malformed_response");
  const plan = planWeeklyEmailWebhookOutcome({
    webhookOk: false,
    emailSent: false,
    errorMessage: malformed.errorMessage,
  });
  assert.ok(plan.mustNotWrite.includes("Weekly Email Sent?"));
});

// --- Upload / Lambda failure paths ---

test("invalid upload / Lambda error body → handoff fails closed", () => {
  const evaluation = evaluateLambdaHandoffResult({
    ok: false,
    statusOut: "error",
    actionOut: "error_unauthorized",
    errorOut: "Invalid X-Upload-Secret",
  });
  assert.strictEqual(evaluation.verified, false);
  assert.strictEqual(evaluation.actionOut, "error_lambda_upload_failed");
});

test("unsupported / blank Make body → invalid (not Accepted)", () => {
  const blank = parseLambdaResponseBody("");
  assert.strictEqual(blank.ok, false);
  assert.strictEqual(blank.reason, "blank_body");

  const junk = resolveMakeHttpResponse("OK");
  assert.strictEqual(junk.mode, "invalid");
});

test("Airtable writeback incomplete → 070c does not clear trigger", () => {
  const incomplete = decide070cAction(
    passingUploadFields({
      "Send to Make Trigger": true,
      "Storage Key": "",
      "Canonical File URL": "",
    })
  );
  assert.strictEqual(incomplete.writebackVerified, false);
  assert.strictEqual(incomplete.shouldClearTrigger, false);
  assert.strictEqual(incomplete.actionOut, "async_writeback_verification_failed");
});

test("retry after failed upload: once writeback complete, clear once then idempotent", () => {
  const afterSuccess = decide070cAction(
    passingUploadFields({ "Send to Make Trigger": true })
  );
  assert.strictEqual(afterSuccess.shouldClearTrigger, true);
  const rerun = decide070cAction(passingUploadFields({ "Send to Make Trigger": false }));
  assert.strictEqual(rerun.actionOut, "async_upload_already_verified");
  assert.strictEqual(rerun.shouldClearTrigger, false);
});

test("missing attachment / incomplete asset fields fail evaluateAssetUploadFields", () => {
  const bad = evaluateAssetUploadFields({
    "Upload Status": "Pending Link",
    "Canonical File URL": "",
    "Storage Key": "",
    "File Content Hash": "",
  });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.failures.includes("upload_status_not_uploaded"));
  assert.ok(bad.failures.includes("canonical_url_missing_or_insecure"));
});

test("final success contract requires Uploaded + trigger clear + reviewer fields", () => {
  const ok = evaluateFinalUploadSuccessContract(passingUploadFields());
  assert.strictEqual(ok.verified, true, ok.message);

  const stillArmed = evaluateFinalUploadSuccessContract(
    passingUploadFields({ "Send to Make Trigger": true })
  );
  assert.strictEqual(stillArmed.verified, false);
  assert.ok(stillArmed.failedChecks.includes("sendToMakeTriggerUnchecked"));

  const noToken = evaluateFinalUploadSuccessContract(
    passingUploadFields({ "Reviewer Access Token": "", "Reviewer File URL": "" })
  );
  assert.strictEqual(noToken.verified, false);
  assert.ok(noToken.failedChecks.includes("reviewerAccessTokenPopulated"));

  // 070c writeback remains independent of reviewer fields (SC-150 additive contract)
  const writebackOnly = evaluateSubmissionAssetWriteback(
    passingUploadFields({ "Reviewer Access Token": "", "Reviewer File URL": "" })
  );
  assert.strictEqual(writebackOnly.verified, true);
});

test("Uploaded must not regress to Processing in success contract", () => {
  const processing = evaluateFinalUploadSuccessContract(
    passingUploadFields({ "Upload Status": "Processing" })
  );
  assert.strictEqual(processing.verified, false);
  assert.ok(processing.failedChecks.includes("uploadStatusUploaded"));
});

// --- Reviewer token / private S3 (Lambda unit suite) ---

test("Lambda auth + viewer unit suites cover secret/token failure paths", () => {
  const root = path.join(__dirname, "../../..");
  const cwd = path.join(root, "lambda/upload-asset");
  const args = [
    "-m",
    "unittest",
    "tests.test_auth",
    "tests.test_viewer",
    "tests.test_token",
    "tests.test_homework_route",
  ];

  // Prefer an absolute python.exe (Windows Apps stub + shell:true breaks PATH entries with spaces).
  const which = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    ["python"],
    { encoding: "utf8" }
  );
  const resolved = String(which.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.toLowerCase().endsWith("python.exe") || s.endsWith("/python") || s.endsWith("/python3"));

  const candidates = [
    process.env.PYTHON,
    process.env.PYTHON_EXE,
    ...resolved,
    "python",
    "python3",
  ].filter(Boolean);

  let last = null;
  for (const bin of candidates) {
    const run = spawnSync(bin, args, {
      cwd,
      encoding: "utf8",
      env: process.env,
    });
    last = run;
    if (run.error && run.error.code === "ENOENT") continue;
    if (run.status === 0) return;
    if (run.status != null) {
      const out = `${run.stdout || ""}\n${run.stderr || ""}`.slice(-1500);
      assert.fail(`Lambda unit suites failed via ${bin} (status ${run.status}):\n${out}`);
    }
  }
  assert.fail(
    `Could not spawn Python for Lambda unit suites: ${
      last && last.error ? last.error.message : "unknown"
    }`
  );
});

console.log("");
console.log(`SC-008 failure-path proof pack: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
