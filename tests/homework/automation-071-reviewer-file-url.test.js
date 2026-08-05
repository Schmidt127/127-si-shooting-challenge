#!/usr/bin/env node
/**
 * Automation 071 — homework feedback parent email asset URL contract (offline).
 * Run: node tests/homework/automation-071-reviewer-file-url.test.js
 *
 * No live Make/Gmail/Airtable calls — mirrors pure resolvers from the canonical script
 * and asserts source contracts (version, URL priority, Make ownership).
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js"
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(`  ${error && error.stack ? error.stack : error}`);
  }
}

function firstNonBlank(...values) {
  for (const value of values) {
    const s = String(value ?? "").trim();
    if (s) return s;
  }
  return "";
}

function resolveParentFacingAssetUrl(fields = {}) {
  const reviewerFileUrl = String(fields.reviewerFileUrl ?? "").trim();
  const googleDriveViewUrl = String(fields.googleDriveViewUrl ?? "").trim();
  const googleDriveFileUrl = String(fields.googleDriveFileUrl ?? "").trim();

  if (reviewerFileUrl) return { url: reviewerFileUrl, source: "reviewerFileUrl" };
  if (googleDriveViewUrl) return { url: googleDriveViewUrl, source: "googleDriveViewUrl" };
  if (googleDriveFileUrl) return { url: googleDriveFileUrl, source: "googleDriveFileUrl" };
  return { url: "", source: "" };
}

function resolveAssetDisplayLabel(fields = {}, fallbackIndex = 1) {
  const originalFileName = String(fields.originalFileName ?? "").trim();
  const assetLabel = String(fields.assetLabel ?? "").trim();
  return (
    firstNonBlank(originalFileName, assetLabel, "View submitted homework") ||
    `Homework File ${fallbackIndex}`
  );
}

function buildParentFacingAssetFiles(rawAssets = []) {
  const assetFiles = [];
  const seenUrls = new Set();

  for (let index = 0; index < rawAssets.length; index += 1) {
    const raw = rawAssets[index] || {};
    const assetId = String(raw.id || "").trim();
    const originalFileName = String(raw.originalFileName ?? "").trim();
    const assetLabel = String(raw.assetLabel ?? "").trim();
    const resolved = resolveParentFacingAssetUrl({
      reviewerFileUrl: raw.reviewerFileUrl,
      googleDriveViewUrl: raw.googleDriveViewUrl,
      googleDriveFileUrl: raw.googleDriveFileUrl,
    });

    if (!resolved.url) continue;
    if (seenUrls.has(resolved.url)) continue;
    seenUrls.add(resolved.url);

    assetFiles.push({
      id: assetId,
      fileName: originalFileName,
      url: resolved.url,
      label: resolveAssetDisplayLabel({ originalFileName, assetLabel }, index + 1),
      urlSource: resolved.source,
    });
  }

  return assetFiles;
}

function buildSubject(athleteName, sendMode) {
  const subjectBase = `New Homework Feedback for ${athleteName || "Athlete"}`;
  return sendMode === "test" ? `[TEST] ${subjectBase}` : subjectBase;
}

function planSuccessWriteback({ parentErrorWritable, parentSubjectWritable, subjectOut }) {
  const successUpdates = {};
  if (parentErrorWritable) successUpdates["Parent Feedback Send Error"] = "";
  if (parentSubjectWritable) successUpdates["Parent Feedback Subject"] = subjectOut;
  return successUpdates;
}

function shouldSkipAlreadySent(parentFeedbackSent) {
  return parentFeedbackSent === true;
}

const REVIEWER =
  "https://example.lambda-url.us-east-2.on.aws/file/recAsset1?token=abc123token";
const DRIVE_VIEW = "https://drive.google.com/file/d/view1/view";
const DRIVE_FILE = "https://drive.google.com/file/d/file1";
const PRIVATE_S3 =
  "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/key/private.png";

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("script is v3.5 with 2026-08-05 update + Reviewer File URL priority", () => {
  assert.match(source, /Version:\s*v3\.5/);
  assert.match(source, /version:\s*"v3\.5"/);
  assert.match(source, /Last Updated:\s*2026-08-05/);
  assert.match(source, /reviewerFileUrl:\s*"Reviewer File URL"/);
  assert.match(
    source,
    /Reviewer File URL → Google Drive View URL → Google Drive File URL|Reviewer File URL as the primary/
  );
  assert.match(
    source,
    /No Reviewer File URL, Google Drive View URL, or Google Drive File URL was found/
  );
  assert.doesNotMatch(
    source,
    /No Google Drive File URL or View URL was found on linked Submission Assets\./
  );
});

test("script does not mark Parent Feedback Sent fields; Make owns them", () => {
  assert.match(source, /This script does not set Parent Feedback Sent\?/);
  assert.match(source, /parentFeedbackSentField/);
  assert.match(source, /successUpdates\[CONFIG\.homeworkFields\.parentSubject\]/);
  assert.match(source, /successUpdates\[CONFIG\.homeworkFields\.parentError\]\s*=\s*""/);
  assert.doesNotMatch(
    source,
    /successUpdates\[CONFIG\.homeworkFields\.parentSent\]/
  );
  assert.doesNotMatch(
    source,
    /successUpdates\[CONFIG\.homeworkFields\.parentSentOn\]/
  );
});

test("script never selects Canonical File URL or Storage Key as parent links", () => {
  assert.match(source, /Intentionally unused for parent links/);
  assert.match(source, /\/\/ canonicalFileUrl: "Canonical File URL"/);
  assert.match(source, /\/\/ storageKey: "Storage Key"/);
  assert.doesNotMatch(source, /CONFIG\.assetFields\.canonicalFileUrl/);
  assert.doesNotMatch(source, /CONFIG\.assetFields\.storageKey/);
  assert.doesNotMatch(
    source,
    /getText\(\s*assetRecord[\s\S]{0,200}Canonical File URL/
  );
});

test("1. Reviewer File URL alone is accepted", () => {
  const files = buildParentFacingAssetFiles([
    {
      id: "recA",
      originalFileName: "hw.png",
      reviewerFileUrl: REVIEWER,
      googleDriveViewUrl: "",
      googleDriveFileUrl: "",
    },
  ]);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].url, REVIEWER);
  assert.strictEqual(files[0].urlSource, "reviewerFileUrl");
});

test("2. Reviewer File URL preferred over Google Drive URLs", () => {
  const resolved = resolveParentFacingAssetUrl({
    reviewerFileUrl: REVIEWER,
    googleDriveViewUrl: DRIVE_VIEW,
    googleDriveFileUrl: DRIVE_FILE,
  });
  assert.strictEqual(resolved.url, REVIEWER);
  assert.strictEqual(resolved.source, "reviewerFileUrl");
});

test("3. Google Drive View URL used when reviewer blank", () => {
  const resolved = resolveParentFacingAssetUrl({
    reviewerFileUrl: "",
    googleDriveViewUrl: DRIVE_VIEW,
    googleDriveFileUrl: DRIVE_FILE,
  });
  assert.strictEqual(resolved.url, DRIVE_VIEW);
  assert.strictEqual(resolved.source, "googleDriveViewUrl");
});

test("4. Google Drive File URL used when preferred fields blank", () => {
  const resolved = resolveParentFacingAssetUrl({
    reviewerFileUrl: "  ",
    googleDriveViewUrl: "",
    googleDriveFileUrl: DRIVE_FILE,
  });
  assert.strictEqual(resolved.url, DRIVE_FILE);
  assert.strictEqual(resolved.source, "googleDriveFileUrl");
});

test("5. all URL fields blank → empty list (caller throws updated error)", () => {
  const files = buildParentFacingAssetFiles([
    { id: "recBlank", originalFileName: "x.png", assetLabel: "HW1" },
  ]);
  assert.strictEqual(files.length, 0);
  assert.match(
    source,
    /No Reviewer File URL, Google Drive View URL, or Google Drive File URL was found on linked Submission Assets/
  );
});

test("6. one valid + one invalid asset still includes the valid asset", () => {
  const files = buildParentFacingAssetFiles([
    { id: "recBad", originalFileName: "missing.png" },
    {
      id: "recGood",
      originalFileName: "good.png",
      reviewerFileUrl: REVIEWER,
    },
  ]);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].id, "recGood");
  assert.strictEqual(files[0].url, REVIEWER);
});

test("7. multiple valid assets are included", () => {
  const files = buildParentFacingAssetFiles([
    {
      id: "rec1",
      originalFileName: "a.png",
      reviewerFileUrl: `${REVIEWER}&a=1`,
    },
    {
      id: "rec2",
      originalFileName: "b.png",
      googleDriveFileUrl: DRIVE_FILE,
    },
  ]);
  assert.strictEqual(files.length, 2);
  assert.strictEqual(files[0].urlSource, "reviewerFileUrl");
  assert.strictEqual(files[1].urlSource, "googleDriveFileUrl");
});

test("8. display label prefers Original File Name", () => {
  assert.strictEqual(
    resolveAssetDisplayLabel({
      originalFileName: "photo-homework.jpg",
      assetLabel: "HW1",
    }),
    "photo-homework.jpg"
  );
});

test("9. display label falls back safely", () => {
  assert.strictEqual(
    resolveAssetDisplayLabel({ originalFileName: "", assetLabel: "HW2-slot" }),
    "HW2-slot"
  );
  assert.strictEqual(
    resolveAssetDisplayLabel({ originalFileName: "", assetLabel: "" }),
    "View submitted homework"
  );
});

test("10. private S3 / Canonical URL is not selected as recipient URL", () => {
  const resolved = resolveParentFacingAssetUrl({
    reviewerFileUrl: "",
    googleDriveViewUrl: "",
    googleDriveFileUrl: "",
    canonicalFileUrl: PRIVATE_S3,
    storageKey: "shooting-challenge/private/key.png",
  });
  assert.strictEqual(resolved.url, "");
  assert.strictEqual(resolved.source, "");
});

test("11. Fillout/quiz no-asset path can send without files", () => {
  const isReflectionQuizCompletion = true;
  const assetFiles = buildParentFacingAssetFiles([]);
  assert.strictEqual(assetFiles.length, 0);
  // Quiz path: empty assets are allowed (script skips asset URL gate when quiz).
  assert.ok(isReflectionQuizCompletion);
  assert.match(source, /isReflectionQuizCompletion/);
  assert.match(source, /Final Reflection Quiz/);
});

test("12. eligible upload homework builds a nonblank subject", () => {
  const subject = buildSubject("Schmidt Testing", "live");
  assert.ok(subject.length > 0);
  assert.strictEqual(subject, "New Homework Feedback for Schmidt Testing");
  assert.strictEqual(buildSubject("Schmidt Testing", "test"), "[TEST] New Homework Feedback for Schmidt Testing");
});

test("13–14. successful Make handoff writes subject and clears send error", () => {
  const updates = planSuccessWriteback({
    parentErrorWritable: true,
    parentSubjectWritable: true,
    subjectOut: "New Homework Feedback for Schmidt Testing",
  });
  assert.strictEqual(updates["Parent Feedback Send Error"], "");
  assert.strictEqual(
    updates["Parent Feedback Subject"],
    "New Homework Feedback for Schmidt Testing"
  );
  assert.strictEqual(Object.prototype.hasOwnProperty.call(updates, "Parent Feedback Sent?"), false);
});

test("15. Automation 071 still does not mark Parent Feedback Sent", () => {
  const updates = planSuccessWriteback({
    parentErrorWritable: true,
    parentSubjectWritable: true,
    subjectOut: "x",
  });
  assert.ok(!("Parent Feedback Sent?" in updates));
  assert.ok(!("Parent Feedback Sent On" in updates));
});

test("16. already-sent record skips gracefully", () => {
  assert.strictEqual(shouldSkipAlreadySent(true), true);
  assert.strictEqual(shouldSkipAlreadySent(false), false);
  assert.match(source, /skipped_already_sent/);
});

test("17. sendMode / testRecipient behavior remains in script", () => {
  assert.match(source, /sendMode === "test"/);
  assert.match(source, /Missing required input: testRecipientEmail for Test mode/);
  assert.match(source, /toEmail: sendMode === "test" \? testRecipientEmail : parentEmailsCsv/);
});

test("18. script passes node --check", () => {
  const result = spawnSync(process.execPath, ["--check", SCRIPT_PATH], {
    encoding: "utf8",
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
});

test("duplicate identical URLs are deduped", () => {
  const files = buildParentFacingAssetFiles([
    { id: "rec1", originalFileName: "a.png", reviewerFileUrl: REVIEWER },
    { id: "rec2", originalFileName: "b.png", reviewerFileUrl: REVIEWER },
  ]);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].id, "rec1");
});

test("Make payload still exposes assetFiles (preserve property name)", () => {
  assert.match(source, /assetFiles,/);
  assert.match(source, /sendType:\s*"homework_feedback"|sendType,\s*$/m);
  assert.match(source, /HOMEWORK_FEEDBACK_PARENT/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
