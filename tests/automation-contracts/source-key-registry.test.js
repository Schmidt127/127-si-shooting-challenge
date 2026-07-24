#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const repoRoot = path.join(__dirname, "../..");
const registry = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, "docs/next-wave/automation-ownership/xp-source-key-registry.json"),
    "utf8"
  )
);

const required = [
  { prefix: "SUBMISSION_XP|", scriptToken: "SUBMISSION_XP", script: "airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js" },
  { prefix: "HOMEWORK_XP|", scriptToken: "HOMEWORK_XP", script: "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js" },
  { prefix: "VIDEO_SUBMISSION|", scriptToken: "VIDEO_SUBMISSION", script: "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js" },
  { prefix: "STREAK_XP|", scriptToken: "STREAK_XP", script: "airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js" },
  { prefix: "ZOOM_ATTEND_BASE|", scriptToken: "ZOOM_ATTEND_BASE", script: "airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js" },
  { prefix: "ZOOM_CREDIT|", scriptToken: "ZOOM_CREDIT", script: "airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js" },
  { prefix: "WEEKLY_EMAIL|", scriptToken: "WEEKLY_EMAIL", script: "airtable/automations/shooting-challenge/074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js" },
];

test("registry lists canonical prefixes used by required scripts", () => {
  const prefixes = new Set((registry.prefixes || []).map((p) => p.prefix));
  for (const row of required) {
    assert.ok(prefixes.has(row.prefix), `registry missing ${row.prefix}`);
    const body = fs.readFileSync(path.join(repoRoot, row.script), "utf8");
    assert.ok(body.includes(row.scriptToken), `${row.script} must reference ${row.scriptToken}`);
  }
});

test("formula-only fields are marked never-write in registry", () => {
  for (const name of ["XP Dedupe Key", "XP Dedupe Key Normalized", "Summary Key", "Unlock Key"]) {
    assert.ok((registry.formula_only_fields || []).includes(name), `missing formula_only ${name}`);
  }
});

test("WEEKLY_THRESHOLD remains missing_writer (do not invent automation)", () => {
  const row = (registry.prefixes || []).find((p) => String(p.prefix).startsWith("WEEKLY_THRESHOLD"));
  assert.ok(row);
  assert.strictEqual(row.status, "missing_writer");
  assert.strictEqual(row.authoritative_writer, null);
});

console.log("source-key-registry tests passed");
