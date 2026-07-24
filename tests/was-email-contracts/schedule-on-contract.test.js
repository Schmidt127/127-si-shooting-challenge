#!/usr/bin/env node
/**
 * Canonical docs must claim 118/119 schedules ON (verified_prod 2026-07-24).
 * Also guards 118 v1.5 Live-season arming contract.
 */
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

const root = path.join(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const architecture = read("docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md");
const index = read("docs/automation-index.md");
const projectState = read("docs/PROJECT_STATE.md");
const s118 = read(
  "airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js"
);

test("architecture claims 118/119 schedules ON", () => {
  assert.ok(/\*\*118\*\*.*\*\*ON\*\*/s.test(architecture) || /\| \*\*118\*\* \| \*\*ON\*\*/.test(architecture));
  assert.ok(/\*\*119\*\*.*\*\*ON\*\*/s.test(architecture) || /\| \*\*119\*\* \| \*\*ON\*\*/.test(architecture));
  assert.ok(/Sunday 5:00 AM/.test(architecture));
  assert.ok(/Sunday 10:00 AM/.test(architecture));
  assert.ok(!/Keep 118\/119 schedules OFF/.test(architecture));
});

test("automation-index claims 118/119 ON with current versions", () => {
  assert.ok(/118.*\*\*ON\*\*/s.test(index));
  assert.ok(/119.*\*\*ON\*\*/s.test(index));
  assert.ok(/v1\.5/.test(index) || /118-…-schedule.*v1\.5/.test(index) || /\*\*v1\.5\*\*/.test(index));
});

test("PROJECT_STATE does not instruct keeping schedules OFF", () => {
  assert.ok(!/Keep 118\/119.*OFF/i.test(projectState));
  assert.ok(/118\/119 schedules ON|118.*ON.*119.*ON/s.test(projectState) || /schedules ON/i.test(projectState));
});

test("118 v1.5 Live season: no Live+!dryRun hard-stop; writes input sendMode", () => {
  assert.ok(/version:\s*"v1\.5"/.test(s118));
  assert.ok(!/refuses sendMode=Live when dryRun=false/.test(s118));
  assert.ok(/sendModeSelectName/.test(s118));
  assert.ok(/\{ name: sendModeSelectName \}/.test(s118));
});

console.log("schedule-on-contract tests passed");
