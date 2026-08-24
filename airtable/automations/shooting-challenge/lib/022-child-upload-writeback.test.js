#!/usr/bin/env node
/**
 * Automation 022 v2.2 — Video Feedback writeback contract (offline).
 * Run: node airtable/automations/shooting-challenge/lib/022-child-upload-writeback.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  resolveParentFacingVideoUrl,
  planVideoFeedbackWriteback,
  isIdempotentReplay,
  classifySecureVideoUrl,
} = require("./022-child-upload-writeback");

const SCRIPT_PATH = path.join(
  __dirname,
  "..",
  "022-submission-intake-sync-child-upload-writeback-from-submission-asset.js"
);
const source = fs.readFileSync(SCRIPT_PATH, "utf8");

const LAMBDA_BASE = "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws";
const VALID_LAMBDA = `${LAMBDA_BASE}/file/recaXBfjeeu3bcm0t?token=abc123def456ghi789jkl012mno345pq`;
const S3_URL = "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/private.mp4";

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("syntax check", () => {
  const result = spawnSync(process.execPath, ["--check", SCRIPT_PATH], {
    encoding: "utf8",
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
});

test("version is v2.2", () => {
  assert.match(source, /Version:\s*v2\.2/);
  assert.match(source, /version:\s*"v2\.2"/);
  assert.match(source, /Last Updated:\s*2026-08-24/);
});

test("Reviewer File URL present writes Lambda URL", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: VALID_LAMBDA,
    childVideoUrlOrDriveLink: "",
  });
  assert.strictEqual(planned.videoUrlOrDriveLink, VALID_LAMBDA);
  assert.match(source, /function resolveParentFacingVideoUrl/);
  assert.match(source, /function classifySecureVideoUrl/);
});

test("Reviewer File URL missing does not write Canonical S3 URL", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetCanonicalFileUrl: S3_URL,
    childVideoUrlOrDriveLink: "",
  });
  assert.strictEqual(planned.videoUrlOrDriveLink, undefined);
  assert.match(planned.uploadError, /Missing Reviewer File URL/);
  assert.doesNotMatch(source, /fall back to Canonical File URL/);
});

test("Canonical URL present but Reviewer URL missing leaves parent field blank", () => {
  const plan = resolveParentFacingVideoUrl({
    reviewerFileUrl: "",
    canonicalFileUrl: S3_URL,
    currentChildUrl: S3_URL,
    assetUploadStatus: "Uploaded",
  });
  assert.strictEqual(plan.url, "");
  assert.strictEqual(plan.shouldWriteUrl, true);
});

test("existing valid Lambda URL remains unchanged when reviewer blank", () => {
  const plan = resolveParentFacingVideoUrl({
    reviewerFileUrl: "",
    canonicalFileUrl: S3_URL,
    currentChildUrl: VALID_LAMBDA,
    assetUploadStatus: "Uploaded",
  });
  assert.strictEqual(plan.url, null);
  assert.strictEqual(plan.shouldWriteUrl, false);
});

test("replay is idempotent when already synced", () => {
  const when = "2026-08-16T18:00:00.000Z";
  const first = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: VALID_LAMBDA,
    assetOriginalFileName: "clip.mp4",
    assetUploadedAt: when,
    childUploadStatus: "Pending",
    childWritebackComplete: false,
  });
  assert.ok(Object.keys(first).length > 0);

  const second = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: VALID_LAMBDA,
    assetOriginalFileName: "clip.mp4",
    assetUploadedAt: when,
    childUploadStatus: "Uploaded",
    childVideoUrlOrDriveLink: VALID_LAMBDA,
    childVideoAssetFileName: "clip.mp4",
    childVideoAssetUploadedAt: when,
    childUploadError: "",
    childWritebackComplete: true,
  });
  assert.strictEqual(isIdempotentReplay(second), true);
});

test("direct S3 URL in reviewer field is rejected", () => {
  assert.strictEqual(classifySecureVideoUrl(S3_URL).classification, "direct_s3_rejected");
});

test("automation never creates Video Feedback or Homework Completions", () => {
  assert.doesNotMatch(source, /createRecordAsync/);
  assert.match(source, /Does not create Homework Completions or Video Feedback/);
});

console.log(`PASS ${passed} Automation 022 v2.2 writeback contracts`);
