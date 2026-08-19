#!/usr/bin/env node
/**
 * Automation 022 v2.0 — Video Feedback writeback contract (offline).
 * Run: node airtable/automations/shooting-challenge/lib/022-child-upload-writeback.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  resolvePreferredVideoUrl,
  planVideoFeedbackWriteback,
  isIdempotentReplay,
} = require("./022-child-upload-writeback");

const SCRIPT_PATH = path.join(
  __dirname,
  "..",
  "022-submission-intake-sync-child-upload-writeback-from-submission-asset.js"
);
const source = fs.readFileSync(SCRIPT_PATH, "utf8");

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

test("version is v2.1", () => {
  assert.match(source, /Version:\s*v2\.1/);
  assert.match(source, /version:\s*"v2\.1"/);
  assert.match(source, /Last Updated:\s*2026-08-17/);
});

test("Reviewer File URL is preferred over Canonical", () => {
  assert.match(source, /reviewerFileUrl:\s*"Reviewer File URL"/);
  assert.match(source, /canonicalFileUrl:\s*"Canonical File URL"/);
  assert.match(source, /function resolvePreferredVideoUrl/);
  assert.strictEqual(
    resolvePreferredVideoUrl({
      reviewerFileUrl: "https://reviewer.example/file",
      canonicalFileUrl: "https://canonical.example/file",
    }),
    "https://reviewer.example/file"
  );
});

test("Canonical File URL is the fallback", () => {
  assert.strictEqual(
    resolvePreferredVideoUrl({
      reviewerFileUrl: "",
      canonicalFileUrl: "https://canonical.example/file",
    }),
    "https://canonical.example/file"
  );
  assert.strictEqual(resolvePreferredVideoUrl({}), "");
});

test("existing Upload Status is updated", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    childUploadStatus: "Pending Link",
    assetReviewerFileUrl: "https://reviewer.example/a",
  });
  assert.strictEqual(planned.uploadStatus, "Uploaded");
  assert.match(source, /CONFIG\.video\.uploadStatus/);
  assert.doesNotMatch(source, /Upload Status 2|Duplicate Upload Status/);
});

test("Video URL or Drive Link is written from preferred URL", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: "https://reviewer.example/a",
    childVideoUrlOrDriveLink: "",
  });
  assert.strictEqual(planned.videoUrlOrDriveLink, "https://reviewer.example/a");
  assert.match(source, /videoUrlOrDriveLink:\s*"Video URL or Drive Link"/);
});

test("Video Asset File Name is written", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetOriginalFileName: "clip.mp4",
    childVideoAssetFileName: "",
  });
  assert.strictEqual(planned.videoAssetFileName, "clip.mp4");
  assert.match(source, /videoAssetFileName:\s*"Video Asset File Name"/);
});

test("Video Asset Uploaded At is written", () => {
  const when = "2026-08-16T18:00:00.000Z";
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetUploadedAt: when,
    childVideoAssetUploadedAt: null,
  });
  assert.strictEqual(planned.videoAssetUploadedAt, when);
  assert.match(source, /videoAssetUploadedAt:\s*"Video Asset Uploaded At"/);
});

test("Writeback Complete? is confirmed when Uploaded", () => {
  const planned = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    childWritebackComplete: false,
  });
  assert.strictEqual(planned.writebackComplete, true);
  assert.match(source, /writebackComplete:\s*"Writeback Complete\?"/);
});

test("re-run does not plan duplicate writeback when already synced", () => {
  const when = "2026-08-16T18:00:00.000Z";
  const first = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: "https://reviewer.example/a",
    assetOriginalFileName: "clip.mp4",
    assetUploadedAt: when,
    childUploadStatus: "Pending",
    childWritebackComplete: false,
  });
  assert.ok(Object.keys(first).length > 0);

  const second = planVideoFeedbackWriteback({
    assetUploadStatus: "Uploaded",
    assetReviewerFileUrl: "https://reviewer.example/a",
    assetOriginalFileName: "clip.mp4",
    assetUploadedAt: when,
    childUploadStatus: "Uploaded",
    childVideoUrlOrDriveLink: "https://reviewer.example/a",
    childVideoAssetFileName: "clip.mp4",
    childVideoAssetUploadedAt: when,
    childWritebackComplete: true,
  });
  assert.strictEqual(isIdempotentReplay(second), true);
});

test("automation never creates Video Feedback or Homework Completions", () => {
  assert.doesNotMatch(source, /createRecordAsync/);
  assert.match(source, /Does not create Homework Completions or Video Feedback/);
});

console.log(`PASS ${passed} Automation 022 v2.1 writeback contracts`);
