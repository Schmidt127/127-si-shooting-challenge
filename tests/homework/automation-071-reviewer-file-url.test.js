#!/usr/bin/env node
/** Automation 071 Hub handoff — parent-facing homework URL contract (v4.1). */
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js"
);
const source = fs.readFileSync(SCRIPT_PATH, "utf8");
let passed = 0;
function test(n, f) {
  f();
  passed++;
  console.log(`ok - ${n}`);
}
function resolve(fields = {}) {
  return String(fields.reviewer || "").trim() || "";
}

test("syntax", () => {
  const r = spawnSync(process.execPath, ["--check", SCRIPT_PATH], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
});
test("version is v4.1 Hub handoff", () => {
  assert.match(source, /Version: v4\.1/);
  assert.match(source, /Email Handoff Queue/);
  assert.match(source, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
});
test("Reviewer File URL is the only homework asset URL source", () => {
  assert.match(source, /reviewer: "Reviewer File URL"/);
  assert.match(source, /function assetUrl/);
  assert.strictEqual(resolve({ reviewer: "reviewer", driveView: "view", driveFile: "file" }), "reviewer");
  assert.strictEqual(resolve({ driveView: "view", driveFile: "file" }), "");
  assert.doesNotMatch(source, /Google Drive View URL|Google Drive File URL/);
});
test("private canonical S3 fields are not selected", () => {
  assert.doesNotMatch(source, /Canonical File URL/);
  assert.doesNotMatch(source, /Storage Key/);
});
test("Hub writeback owns final Sent fields; no Make send", () => {
  assert.match(source, /Do not write Parent Feedback Sent\? or Parent Feedback Sent On/);
  assert.doesNotMatch(source, /\[["']Parent Feedback Sent On["']\]\s*:/);
  assert.doesNotMatch(source, /makeWebhookUrl|hook\.us1\.make\.com|semanticFailure/);
});
test("PHA Grade Band is not an ownership gate", () => {
  assert.doesNotMatch(source, /PHA Grade Band mismatch/);
  assert.match(source, /PHA Grade Band is descriptive eligibility metadata only/);
});

console.log(`PASS ${passed} Automation 071 reviewer URL / Hub contracts`);
