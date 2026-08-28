#!/usr/bin/env node
/**
 * FUT-010 intake attachment cleanup — offline contract tests.
 * Run: node lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js
 */

const assert = require("assert");
const {
  decideIntakeAttachmentCleanup,
  buildAttachmentClearPayload,
  countAttachments,
  isReconciliationCandidate,
  shouldApplyAttachmentClear,
} = require("./intake-attachment-cleanup");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const LAMBDA_VIEWER_URL =
  "https://abc123.lambda-url.us-east-2.on.aws/file/recABCDEFGHIJKLMN?token=secure-token-value";
const CANONICAL_URL =
  "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/test.png";
const STORAGE_KEY = "shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/test.png";

function baseUploadedFields(overrides = {}) {
  return {
    "Upload Status": "Uploaded",
    "Upload Destination": "Homework Completions",
    "Asset Purpose": "Homework 1",
    "Storage Key": STORAGE_KEY,
    "Canonical File URL": CANONICAL_URL,
    "File Content Hash": "a".repeat(64),
    "File Hash Algorithm": "SHA-256",
    "Uploaded At": "2026-08-28T12:00:00.000Z",
    "Writeback Complete?": 1,
    "Upload Error": "",
    "Send to Make Trigger": false,
    "Airtable Attachment": [{ id: "attTEST001", filename: "hw.pdf" }],
    ...overrides,
  };
}

function externalOk() {
  return {
    s3ObjectExists: true,
    canonicalUrlReachable: true,
    reviewerUrlClassification: "valid_lambda_viewer",
  };
}

test("1. successful homework upload followed by attachment deletion", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recHOMEWORK01",
    fields: baseUploadedFields(),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(decision.action, "deleted");
  assert.strictEqual(decision.assetCategory, "homework");
  assert.strictEqual(decision.deletion.succeeded, true);
  assert.deepStrictEqual(decision.deletion.payload, buildAttachmentClearPayload());
});

test("2. successful video upload followed by attachment deletion", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recVIDEO00001",
    fields: baseUploadedFields({
      "Upload Destination": "Video Feedback",
      "Asset Purpose": "Video For Feedback",
      "Reviewer File URL": LAMBDA_VIEWER_URL,
      "Reviewer Access Token": "secure-token-value",
      "Airtable Attachment": [{ id: "attVID001", filename: "clip.mp4" }],
    }),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(decision.action, "deleted");
  assert.strictEqual(decision.assetCategory, "video");
  assert.strictEqual(decision.verification.aws.verified, true);
});

test("3. missing S3 object blocks deletion", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recMISSINGS3",
    fields: baseUploadedFields(),
    externalChecks: { s3ObjectExists: false, canonicalUrlReachable: true },
    dryRun: false,
  });
  assert.strictEqual(decision.action, "skipped_verification_failed");
  assert.match(decision.failureReason, /S3 object not found/);
  assert.strictEqual(decision.deletion.attempted, false);
});

test("4. invalid or missing Storage Key blocks deletion", () => {
  const missing = decideIntakeAttachmentCleanup({
    recordId: "recNOSTORAGE",
    fields: baseUploadedFields({ "Storage Key": "" }),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(missing.action, "skipped_ineligible");
  assert.match(missing.failureReason, /Storage Key/);

  const invalid = decideIntakeAttachmentCleanup({
    recordId: "recBADKEY",
    fields: baseUploadedFields({ "Storage Key": "not-a-valid-key" }),
    externalChecks: { s3ObjectExists: true, canonicalUrlReachable: true },
    dryRun: false,
  });
  assert.strictEqual(invalid.action, "skipped_verification_failed");
});

test("5. invalid Lambda viewer URL blocks video deletion", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recBADURL",
    fields: baseUploadedFields({
      "Upload Destination": "Video Feedback",
      "Asset Purpose": "Video For Feedback",
      "Reviewer File URL": "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/leak.mp4",
    }),
    externalChecks: { s3ObjectExists: true, canonicalUrlReachable: true },
    dryRun: false,
  });
  assert.strictEqual(decision.action, "skipped_verification_failed");
  assert.match(decision.failureReason, /Reviewer/);
});

test("6. upload status not Uploaded retains attachment", () => {
  for (const status of ["Pending Link", "Processing", "Error"]) {
    const decision = decideIntakeAttachmentCleanup({
      recordId: `recSTATUS${status}`,
      fields: baseUploadedFields({ "Upload Status": status }),
      externalChecks: externalOk(),
      dryRun: false,
    });
    assert.strictEqual(decision.action, "skipped_ineligible", `status ${status}`);
    assert.strictEqual(decision.deletion.attempted, false);
  }
});

test("7. retry after failed deletion can succeed on second dry-run then apply", () => {
  const first = decideIntakeAttachmentCleanup({
    recordId: "recRETRY001",
    fields: baseUploadedFields(),
    externalChecks: { s3ObjectExists: false },
    dryRun: true,
    previousDeletionFailed: true,
  });
  assert.strictEqual(first.action, "skipped_verification_failed");

  const second = decideIntakeAttachmentCleanup({
    recordId: "recRETRY001",
    fields: baseUploadedFields(),
    externalChecks: externalOk(),
    dryRun: true,
    previousDeletionFailed: true,
  });
  assert.strictEqual(second.action, "dry_run_would_delete");

  const third = decideIntakeAttachmentCleanup({
    recordId: "recRETRY001",
    fields: baseUploadedFields(),
    externalChecks: externalOk(),
    dryRun: false,
    previousDeletionFailed: true,
  });
  assert.strictEqual(third.action, "deleted");
});

test("8. already-empty attachment is idempotent skip", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recEMPTY001",
    fields: baseUploadedFields({ "Airtable Attachment": [] }),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(decision.action, "skipped_already_empty");
  assert.strictEqual(countAttachments(decision.deletion.payload?.["Airtable Attachment"]), 0);
});

test("9. multiple attachments cleared in one delete payload", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recMULTI001",
    fields: baseUploadedFields({
      "Airtable Attachment": [
        { id: "attA", filename: "a.pdf" },
        { id: "attB", filename: "b.pdf" },
      ],
    }),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(decision.attachmentCount, 2);
  assert.deepStrictEqual(decision.deletion.payload, { "Airtable Attachment": [] });
});

test("10. duplicate/reprocessing protection when Send to Make Trigger still checked", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recDUPE001",
    fields: baseUploadedFields({ "Send to Make Trigger": true }),
    externalChecks: externalOk(),
    dryRun: false,
  });
  assert.strictEqual(decision.action, "skipped_uncertain_upload");
  assert.match(decision.failureReason, /Send to Make Trigger/);
});

test("11. S3 remains intact — only attachment field in delete payload", () => {
  const decision = decideIntakeAttachmentCleanup({
    recordId: "recS3SAFE01",
    fields: baseUploadedFields(),
    externalChecks: externalOk(),
    dryRun: false,
  });
  const payload = decision.deletion.payload;
  assert.deepStrictEqual(Object.keys(payload), ["Airtable Attachment"]);
  assert.deepStrictEqual(payload, { "Airtable Attachment": [] });
  assert.strictEqual(shouldApplyAttachmentClear(decision), true);
});

test("reconciliation candidate detects uploaded rows with attachment retained", () => {
  assert.strictEqual(isReconciliationCandidate(baseUploadedFields()), true);
  assert.strictEqual(
    isReconciliationCandidate(baseUploadedFields({ "Airtable Attachment": [] })),
    false
  );
});

console.log("\nAll FUT-010 intake attachment cleanup tests passed.");
