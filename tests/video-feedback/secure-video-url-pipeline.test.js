#!/usr/bin/env node
"use strict";

/**
 * Automation 072/073 secure video URL protection contracts.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  isValidLambdaViewerUrl,
  filterWeeklyVideoSubmissions,
} = require("../../lib/was-email-contracts/weekly-summary-email-content");

const root = path.join(__dirname, "../..");
const p072 = path.join(
  root,
  "airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
);
const p073 = path.join(
  root,
  "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js"
);
const s072 = fs.readFileSync(p072, "utf8");
const s073 = fs.readFileSync(p073, "utf8");

const LAMBDA =
  "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recaXBfjeeu3bcm0t?token=abc123";
const S3 = "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/private.mp4";

let pass = 0;
function t(name, fn) {
  fn();
  pass++;
  console.log(`ok - ${name}`);
}

function checkSyntax(p) {
  const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
}

t("072 syntax", () => checkSyntax(p072));
t("073 syntax", () => checkSyntax(p073));

t("072 v4.8 validates Lambda viewer URLs only", () => {
  assert.match(s072, /Version:\s*v4\.8/);
  assert.match(s072, /function classifySecureVideoUrl/);
  assert.match(s072, /function isValidLambdaViewerUrl/);
  assert.match(s072, /missingSecureUrlCount/);
});

t("072 valid Lambda URLs appear in payload helpers", () => {
  const { entries, missingSecureUrlCount } = filterWeeklyVideoSubmissions([
    { label: "Clip A", reviewedAt: "Aug 19, 2026", secureUrl: LAMBDA },
    { label: "Clip B", reviewedAt: "Aug 20, 2026", secureUrl: S3 },
  ]);
  assert.equal(entries[0].secureUrl, LAMBDA);
  assert.equal(entries[1].secureUrl, "");
  assert.equal(missingSecureUrlCount, 1);
});

t("072 eight valid Lambda URLs produce eight safe entries", () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    label: `Clip ${i + 1}`,
    reviewedAt: "Aug 19, 2026",
    secureUrl: `${LAMBDA}${i}`,
  }));
  const { entries: filtered, missingSecureUrlCount } = filterWeeklyVideoSubmissions(entries);
  assert.equal(filtered.length, 8);
  assert.equal(missingSecureUrlCount, 0);
  assert.ok(filtered.every((row) => isValidLambdaViewerUrl(row.secureUrl)));
});

t("073 v4.4 blocks unsafe parent handoff", () => {
  assert.match(s073, /Version:\s*v4\.4/);
  assert.match(s073, /function classifySecureVideoUrl/);
  assert.match(s073, /Lambda viewer URL required/);
  assert.match(s073, /direct_s3_rejected|presigned_s3_rejected|google_drive_rejected/);
});

t("073 preserves Hub handoff idempotency markers", () => {
  assert.match(s073, /created_handoff/);
  assert.match(s073, /existing_handoff/);
  assert.match(s073, /needs_review/);
  assert.match(s073, /VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|/);
});

console.log(`PASS ${pass} 072/073 secure video URL contracts`);
