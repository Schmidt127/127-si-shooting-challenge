#!/usr/bin/env node
"use strict";

/**
 * Contract: Video Feedback Writeback Complete? must gate on VF-native
 * Upload Status + Video Asset Uploaded At only — not Homework/Submission Assets
 * Reviewer/Canonical URLs and not obsolete Google Drive completion fields.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const sync022 = fs.readFileSync(
  path.join(
    root,
    "airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js"
  ),
  "utf8"
);
const email073 = fs.readFileSync(
  path.join(
    root,
    "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js"
  ),
  "utf8"
);
const audit = fs.readFileSync(
  path.join(root, "docs/audits/video-parent-feedback-ready-workflow-audit-2026-08-17.md"),
  "utf8"
);

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const recommendedFormula = `AND(
  {Upload Status} = "Uploaded",
  {Video Asset Uploaded At} != BLANK()
)`;

test("recommended Writeback Complete? formula uses only VF Upload Status + Video Asset Uploaded At", () => {
  assert.match(audit, /\{Upload Status\} = "Uploaded"/);
  assert.match(audit, /\{Video Asset Uploaded At\} != BLANK\(\)/);
  assert.doesNotMatch(
    audit.split("## E.")[1].split("## F.")[0],
    /Google Drive File (ID|URL)|Google Drive Folder/
  );
  assert.strictEqual(
    recommendedFormula.replace(/\s+/g, " ").trim(),
    `AND( {Upload Status} = "Uploaded", {Video Asset Uploaded At} != BLANK() )`
  );
});

test("022 syncs VF Upload Status and Video Asset Uploaded At (formula inputs)", () => {
  assert.match(sync022, /uploadStatus: "Upload Status"/);
  assert.match(sync022, /videoAssetUploadedAt: "Video Asset Uploaded At"/);
  assert.match(sync022, /function buildVideoUploadSyncFields/);
});

test("022 prefers Reviewer File URL on Submission Assets for VF Video URL — does not invent VF Reviewer File URL", () => {
  assert.match(sync022, /reviewerFileUrl: "Reviewer File URL"/);
  assert.match(sync022, /videoUrlOrDriveLink: "Video URL or Drive Link"/);
  assert.match(sync022, /Prefer Reviewer File URL; Canonical File URL is the fallback/);
  const videoConfigBlock = sync022.slice(
    sync022.indexOf("video: {"),
    sync022.indexOf("values: {")
  );
  assert.doesNotMatch(videoConfigBlock, /reviewerFileUrl/);
  assert.doesNotMatch(videoConfigBlock, /canonicalFileUrl/);
});

test("022 does not mirror Google Drive fields onto Video Feedback", () => {
  const videoConfigBlock = sync022.slice(
    sync022.indexOf("video: {"),
    sync022.indexOf("values: {")
  );
  assert.doesNotMatch(videoConfigBlock, /googleDrive/);
  assert.match(sync022, /Do not mirror obsolete Google Drive fields onto Video Feedback/);
});

test("073 v4.3 Hub handoff uses only VF Video URL or Drive Link", () => {
  assert.match(email073, /Version: v4\.3/);
  assert.match(email073, /Email Handoff Queue/);
  assert.doesNotMatch(email073, /Google Drive File URL|Google Drive View URL|Google Drive File ID|Google Drive Folder/);
  assert.doesNotMatch(email073, /reviewer:\s*"Reviewer File URL"/);
  assert.doesNotMatch(email073, /canonical:\s*"Canonical File URL"/);
  const vfBlock = email073.slice(email073.indexOf("vf: {"), email073.indexOf("enr: {"));
  assert.doesNotMatch(vfBlock, /Reviewer File URL/);
  assert.match(vfBlock, /videoUrl: "Video URL or Drive Link"/);
});

test("073 v4.3 enriches branded Hub template payload without changing writeback gates", () => {
  assert.match(email073, /programName, reviewStatus, landingPageUrl, shootPageUrl/);
  assert.match(email073, /reviewStatus: "Review complete"/);
  assert.match(email073, /landingPageUrl: CANONICAL_URLS\.landing/);
  assert.match(email073, /shootPageUrl: CANONICAL_URLS\.shoot/);
  assert.match(email073, /if \(!payload\.programName\) delete payload\.programName/);
  assert.match(email073, /Conflicting Email Handoff Queue payload/);
  assert.match(email073, /Do not write Parent Feedback Sent\? or Parent Feedback Sent On/);
});

test("073 is Parent Feedback Ready consumer; 111 is not referenced as email sender", () => {
  assert.match(email073, /Parent Feedback Ready\?/);
  assert.doesNotMatch(email073, /\b111\b/);
  assert.match(audit, /Automation \*\*073\*\*/);
  assert.match(audit, /Is that Automation \*\*111\*\*\?/);
  assert.match(audit, /\*\*No\.\*\*/);
});

console.log(`PASS ${passed} video-feedback writeback / parent-ready contracts`);
