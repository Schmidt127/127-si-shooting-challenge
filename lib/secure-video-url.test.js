#!/usr/bin/env node
/**
 * Shared secure video URL validator tests.
 * Run: node lib/secure-video-url.test.js
 */
"use strict";

const assert = require("assert");
const {
  classifySecureVideoUrl,
  isValidLambdaViewerUrl,
  redactSecureVideoUrl,
  resolveParentFacingVideoUrl,
} = require("./secure-video-url");

const LAMBDA_BASE = "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws";
const VALID_LAMBDA = `${LAMBDA_BASE}/file/recaXBfjeeu3bcm0t?token=abc123def456ghi789jkl012mno345pq`;
const VALID_LAMBDA_WITH_CREDS_IN_PATH = `${LAMBDA_BASE}/file/recABCDEFGHIJKLM?token=safe-token-value`;

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

test("Lambda viewer URL accepted", () => {
  const result = classifySecureVideoUrl(VALID_LAMBDA);
  assert.strictEqual(result.classification, "valid_lambda_viewer");
  assert.strictEqual(result.safeUrl, VALID_LAMBDA);
  assert.ok(isValidLambdaViewerUrl(VALID_LAMBDA));
});

test("direct S3 URL rejected", () => {
  const url = "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/season/foo.mp4";
  const result = classifySecureVideoUrl(url);
  assert.strictEqual(result.classification, "direct_s3_rejected");
  assert.strictEqual(result.safeUrl, "");
});

test("expired S3 presigned URL rejected", () => {
  const url =
    "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/foo.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE";
  const result = classifySecureVideoUrl(url);
  assert.strictEqual(result.classification, "presigned_s3_rejected");
});

test("Google Drive URL rejected", () => {
  const result = classifySecureVideoUrl("https://drive.google.com/file/d/abc/view");
  assert.strictEqual(result.classification, "google_drive_rejected");
});

test("missing token rejected", () => {
  const url = `${LAMBDA_BASE}/file/recaXBfjeeu3bcm0t`;
  const result = classifySecureVideoUrl(url);
  assert.strictEqual(result.classification, "missing_token");
});

test("invalid host rejected", () => {
  const result = classifySecureVideoUrl("https://evil.example/file/recaXBfjeeu3bcm0t?token=abc");
  assert.strictEqual(result.classification, "invalid_host");
});

test("malformed URL rejected", () => {
  assert.strictEqual(classifySecureVideoUrl("not-a-url").classification, "malformed_url");
  assert.strictEqual(classifySecureVideoUrl("http://insecure.example/file").classification, "malformed_url");
});

test("blank URL is missing_reviewer_url", () => {
  assert.strictEqual(classifySecureVideoUrl("").classification, "missing_reviewer_url");
});

test("redactSecureVideoUrl never exposes tokens", () => {
  const redacted = redactSecureVideoUrl(VALID_LAMBDA);
  assert.doesNotMatch(redacted, /abc123def456/);
  assert.match(redacted, /token=\[REDACTED\]/);
  const presigned = redactSecureVideoUrl(
    "https://bucket.s3.amazonaws.com/x?X-Amz-Signature=secret"
  );
  assert.doesNotMatch(presigned, /secret/);
  assert.match(presigned, /PRESIGNED_REDACTED/);
});

test("resolveParentFacingVideoUrl writes Lambda URL when reviewer present", () => {
  const plan = resolveParentFacingVideoUrl({
    reviewerFileUrl: VALID_LAMBDA,
    canonicalFileUrl: "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/private.mp4",
    currentChildUrl: "",
    assetUploadStatus: "Uploaded",
  });
  assert.strictEqual(plan.url, VALID_LAMBDA);
  assert.strictEqual(plan.shouldWriteUrl, true);
  assert.strictEqual(plan.repairNote, "");
});

test("resolveParentFacingVideoUrl never falls back to Canonical S3", () => {
  const canonical = "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/private.mp4";
  const plan = resolveParentFacingVideoUrl({
    reviewerFileUrl: "",
    canonicalFileUrl: canonical,
    currentChildUrl: canonical,
    assetUploadStatus: "Uploaded",
  });
  assert.strictEqual(plan.url, "");
  assert.strictEqual(plan.shouldWriteUrl, true);
  assert.match(plan.repairNote, /Missing Reviewer File URL/);
});

test("resolveParentFacingVideoUrl preserves existing valid Lambda URL", () => {
  const plan = resolveParentFacingVideoUrl({
    reviewerFileUrl: "",
    canonicalFileUrl: "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/x.mp4",
    currentChildUrl: VALID_LAMBDA,
    assetUploadStatus: "Uploaded",
  });
  assert.strictEqual(plan.url, null);
  assert.strictEqual(plan.shouldWriteUrl, false);
});

test("logs and reports never include raw AWS access keys", () => {
  const url = "https://bucket.s3.amazonaws.com/x?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Signature=abc";
  const result = classifySecureVideoUrl(url);
  const report = JSON.stringify({ classification: result.classification, redacted: result.redactedUrl });
  assert.doesNotMatch(report, /AKIAIOSFODNN7EXAMPLE/);
});

console.log(`PASS ${passed} secure-video-url tests`);
