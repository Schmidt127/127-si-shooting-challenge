#!/usr/bin/env node
/**
 * Automation 117 — Zoom recording approval email → Communications Hub (offline contract).
 * Run: node tests/zoom/automation-117-recording-approval-email.test.js
 *
 * Static source checks against the canonical Hub handoff script (not Make).
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js"
);
const ACTIVE_DIR = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const DESIGN_DIR = path.join(ACTIVE_DIR, "_design-alternatives/stage17-modular-reference");

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

function requireRecId(label, value) {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`Missing required input: ${label}`);
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) {
    throw new Error(`Invalid ${label}: must be a valid Airtable record ID.`);
  }
  return id;
}

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("canonical 117 email script is Hub handoff v2.2", () => {
  assert.match(source, /Version:\s*v2\.2/);
  assert.match(source, /version:\s*"v2\.2"/);
  assert.match(source, /eventType:\s*"ZOOM_RECORDING_APPROVAL"/);
  assert.match(source, /templateKey:\s*"ZOOM_RECORDING_APPROVED"/);
  assert.match(source, /Email Handoff Queue/);
  assert.match(source, /ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|/);
  assert.doesNotMatch(source, /makeWebhookUrl|webhookUrl|hook\.us1\.make\.com/);
  assert.doesNotMatch(source, /automationNumber\s*[:=]/);
});

test("117 v2.2 meeting / athlete / timestamp payload fields", () => {
  assert.match(source, /meetingName:\s*"Meeting Name"/);
  assert.match(source, /meetingDisplayName:\s*"Meeting Display Name"/);
  assert.match(source, /athleteFirst:\s*"Athlete First Name"/);
  assert.match(source, /Recording Quiz Submitted At/);
  assert.match(source, /Recording Quiz Reviewed At/);
  assert.match(source, /America\/Denver/);
  assert.match(source, /payload\.athleteFirstName/);
  assert.match(source, /payload\.proofSubmittedAt/);
  assert.match(source, /payload\.reviewedAt/);
});

test("only one active Airtable Automation 117 script in canonical folder", () => {
  const active117 = fs
    .readdirSync(ACTIVE_DIR)
    .filter((f) => /^117[^a-zA-Z]/.test(f) || f.startsWith("117-") || f.startsWith("117f"));
  const js = active117.filter((f) => f.endsWith(".js"));
  assert.deepStrictEqual(js, ["117-zoom-send-recording-approval-email-to-make.js"]);
});

test("modular orchestrator/117a–e live under design-alternatives only", () => {
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117-zoom-recording-credit-orchestrator.js")));
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117a-zoom-recording-normalize-recording-quiz-submission.js")));
  assert.ok(fs.existsSync(path.join(DESIGN_DIR, "117c-zoom-recording-create-zoom-xp-event.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117-zoom-recording-credit-orchestrator.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117a-zoom-recording-normalize-recording-quiz-submission.js")));
  assert.ok(!fs.existsSync(path.join(ACTIVE_DIR, "117c-zoom-recording-create-zoom-xp-event.js")));
});

test("rejects missing or invalid record IDs", () => {
  assert.throws(() => requireRecId("recordId", ""), /Missing required input/);
  assert.throws(() => requireRecId("recordId", "xyz"), /valid Airtable record ID/);
  assert.strictEqual(requireRecId("recordId", "recABCDEFGHIJKLMN"), "recABCDEFGHIJKLMN");
});

test("script parses with node --check", () => {
  const result = spawnSync(process.execPath, ["--check", SCRIPT_PATH], { encoding: "utf8" });
  if (result.status !== 0) {
    const err = `${result.stderr || ""}${result.stdout || ""}`;
    assert.ok(/await is only valid in async functions/.test(err), err || "node --check failed");
  }
});

test("unloadData compat pack must not instruct pasting orchestrator as Automation 117", () => {
  const pack = fs.readFileSync(
    path.join(__dirname, "../../docs/deploy-checklists/active-automation-unloadData-compat.md"),
    "utf8"
  );
  assert.match(pack, /must not be pasted|NOT the live PROD Automation 117|design-alternatives/i);
  assert.doesNotMatch(
    pack,
    /Paste order[\s\S]*117 — Zoom recording orchestrator/
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
