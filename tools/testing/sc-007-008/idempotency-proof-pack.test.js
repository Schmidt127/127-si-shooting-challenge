#!/usr/bin/env node
/**
 * SC-007 — Duplicate and rerun idempotency proof pack (offline).
 *
 * For every path: canonical dedupe key, writer, first-run, second-run,
 * retry-after-partial-failure, and assertion that duplicate XP/sends are blocked.
 *
 * Run: node tools/testing/sc-007-008/idempotency-proof-pack.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  evaluateWeeklySummarySendGate,
  planWeeklyEmailWebhookOutcome,
  decideWeeklyEmailRetryAction,
  buildWeeklyEmailEventId,
} = require("../../../airtable/automations/shooting-challenge/lib/v2-engine-contracts");

const {
  decide070cAction,
  evaluateFinalUploadSuccessContract,
} = require("../../../airtable/automations/shooting-challenge/lib/upload-make-lambda-response");

const {
  FIX,
  IDEMPOTENCY_PATHS,
  proveXpRerun,
  proveHomeworkCompletionRerun,
} = require("./idempotency-matrix");

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

test("matrix covers all SC-007 required domains", () => {
  const ids = new Set(IDEMPOTENCY_PATHS.map((p) => p.id));
  for (const required of [
    "daily-submission-xp",
    "homework-completion",
    "homework-xp",
    "video-upload-writeback",
    "video-xp",
    "zoom-credit",
    "streak-xp",
    "shot-milestone",
    "was-uniqueness",
    "weekly-email-send",
  ]) {
    assert.ok(ids.has(required), `missing path ${required}`);
  }
});

test("every path documents key, writer, first/second/retry behaviors", () => {
  for (const p of IDEMPOTENCY_PATHS) {
    assert.ok(p.canonicalDedupeKey, `${p.id} missing key`);
    assert.ok(p.expectedWriter, `${p.id} missing writer`);
    assert.ok(p.firstRun, `${p.id} missing firstRun`);
    assert.ok(p.secondRun, `${p.id} missing secondRun`);
    assert.ok(p.retryAfterPartialFailure, `${p.id} missing retry`);
    assert.ok(Array.isArray(p.evidenceFields) && p.evidenceFields.length, `${p.id} evidence`);
  }
});

const XP_PATH_IDS = [
  "daily-submission-xp",
  "homework-xp",
  "video-xp",
  "zoom-credit",
  "zoom-attend-base",
  "streak-xp",
  "shot-milestone",
  "perfect-week",
  "weekly-threshold-xp",
];

for (const id of XP_PATH_IDS) {
  const pathDef = IDEMPOTENCY_PATHS.find((p) => p.id === id);
  test(`${id}: first create → second skip → retry skip (no duplicate XP)`, () => {
    assert.ok(pathDef, id);
    const { first, second, retryAfterCreate, repair } = proveXpRerun(pathDef.canonicalDedupeKey);
    assert.strictEqual(first.action, "create", `${id} first`);
    assert.strictEqual(second.action, "skip_existing", `${id} second`);
    assert.strictEqual(retryAfterCreate.action, "skip_existing", `${id} retry`);
    assert.strictEqual(repair.action, "repair_link", `${id} repair`);
  });
}

test("homework-completion: create then link_existing; multi-asset reuses HC", () => {
  const { first, second, multiAssetRetry, partialNoHc } = proveHomeworkCompletionRerun();
  assert.strictEqual(first.action, "create");
  assert.strictEqual(second.action, "link_existing");
  assert.strictEqual(second.completionId, FIX.homeworkCompletion);
  assert.strictEqual(multiAssetRetry.action, "link_existing");
  assert.strictEqual(multiAssetRetry.completionId, FIX.homeworkCompletion);
  assert.strictEqual(partialNoHc.action, "create");
});

test("video-upload-writeback: 070c second run is idempotent (already verified)", () => {
  const fields = {
    "Send to Make Trigger": false,
    "Upload Status": "Uploaded",
    "Canonical File URL": "https://s3.example/object.pdf",
    "Storage Key": "shooting-challenge/x.pdf",
    "File Content Hash": "a".repeat(64),
    "File Hash Algorithm": "SHA-256",
    "Uploaded At": "2026-08-04T18:00:00.000Z",
    "Upload Error": "",
    "Writeback Complete?": 1,
    "Reviewer Access Token": "viewer-token-abcdefghijklmnopqrstuvwxyz0123",
    "Reviewer File URL":
      "https://example.lambda-url.us-east-2.on.aws/file/recAsset?token=viewer-token",
  };
  const firstClear = decide070cAction({ ...fields, "Send to Make Trigger": true });
  assert.strictEqual(firstClear.actionOut, "async_upload_verified_trigger_cleared");
  const second = decide070cAction(fields);
  assert.strictEqual(second.actionOut, "async_upload_already_verified");
  assert.strictEqual(second.shouldClearTrigger, false);
  const contract = evaluateFinalUploadSuccessContract(fields);
  assert.strictEqual(contract.verified, true, contract.message);
});

test("weekly-email-send: Sent? blocks duplicate; failure keeps Send to Make?", () => {
  const eventId = buildWeeklyEmailEventId(FIX.enrollment, FIX.week);
  assert.strictEqual(eventId, `WEEKLY_EMAIL|${FIX.enrollment}|${FIX.week}`);

  const blocked = evaluateWeeklySummarySendGate({
    emailReady: true,
    emailSent: true,
    sendToMake: true,
  });
  assert.strictEqual(blocked.action, "error_duplicate_send_blocked");

  const failPlan = planWeeklyEmailWebhookOutcome({
    webhookOk: false,
    emailSent: false,
    errorMessage: "Make webhook failed with status 502",
  });
  assert.strictEqual(failPlan.action, "handoff_failed_retryable");
  assert.ok(failPlan.mustNotClear.includes("Send to Make?"));
  assert.ok(!("Send to Make?" in failPlan.fields));

  const retry = decideWeeklyEmailRetryAction({
    emailSent: false,
    sendToMake: true,
    emailReady: true,
    hasErrorMessage: true,
  });
  assert.ok(
    retry.action === "rerun_074" || retry.allowRetry === true || retry.retryClass === "automatically_retryable",
    JSON.stringify(retry)
  );

  const afterSent = decideWeeklyEmailRetryAction({
    emailSent: true,
    sendToMake: false,
    emailReady: true,
  });
  assert.strictEqual(afterSent.action, "do_not_retry");
});

test("canonical keys are unique across XP families in the matrix", () => {
  const xpKeys = IDEMPOTENCY_PATHS.filter((p) => p.domain === "xp").map((p) => p.canonicalDedupeKey);
  assert.strictEqual(new Set(xpKeys).size, xpKeys.length);
});

test("expected writer scripts exist in repo for XP creators", () => {
  const autoDir = path.join(
    __dirname,
    "../../../airtable/automations/shooting-challenge"
  );
  const mustExist = [
    "010-submission-intake-create-xp-event.js",
    "065-homework-review-and-xp-create-homework-xp-event.js",
    "114-video-review-and-xp-create-or-update-video-xp-event.js",
    "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js",
    "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js",
    "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js",
  ];
  for (const file of mustExist) {
    assert.ok(fs.existsSync(path.join(autoDir, file)), `missing ${file}`);
  }
});

console.log("");
console.log(`SC-007 idempotency proof pack: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
