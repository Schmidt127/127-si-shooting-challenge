#!/usr/bin/env node
/**
 * Current source and authority docs must preserve the 118/119 schedule.
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
const s119 = read(
  "airtable/automations/shooting-challenge/119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"
);

test("architecture claims 118/119 schedules ON", () => {
  assert.ok(/\*\*118\*\*.*\*\*ON\*\*/s.test(architecture) || /\| \*\*118\*\* \| \*\*ON\*\*/.test(architecture));
  assert.ok(/\*\*119\*\*.*\*\*ON\*\*/s.test(architecture) || /\| \*\*119\*\* \| \*\*ON\*\*/.test(architecture));
  assert.ok(/Sunday 5:00 AM/.test(architecture));
  assert.ok(/Sunday 10:00 AM/.test(architecture));
  assert.ok(!/Keep 118\/119 schedules OFF/.test(architecture));
});

test("automation-index records the current Hub flow and both schedules", () => {
  assert.ok(/118 → 072 → 119 → 074 → 079 → Communications Hub → Resend/.test(index));
  assert.ok(/118[\s\S]{0,180}Sunday \*\*5:00 AM\*\*/.test(index));
  assert.ok(/119[\s\S]{0,180}Sunday \*\*10:00 AM\*\*/.test(index));
});

test("PROJECT_STATE does not instruct keeping schedules OFF", () => {
  assert.ok(!/Keep 118\/119.*OFF/i.test(projectState));
  assert.ok(/118\/119 schedules ON|118.*ON.*119.*ON/s.test(projectState) || /schedules ON/i.test(projectState));
});

test("118 v2.0 Live season: no Live+!dryRun hard-stop; writes input sendMode", () => {
  assert.ok(/version:\s*"v2\.0"/.test(s118));
  assert.ok(!/refuses sendMode=Live when dryRun=false/.test(s118));
  assert.ok(/refuses sendMode=Live when includeSchmidt=true/.test(s118));
  assert.ok(/\{ name: sendMode \}/.test(s118));
});

test("119 current source preserves Sunday send arming contract", () => {
  assert.ok(/version:\s*"v1\.7"/.test(s119));
  assert.ok(/Send to Make\?/.test(s119));
  assert.ok(/scheduledWeekEndKeyOut/.test(s119));
  assert.ok(!/\bfetch\s*\(/.test(s119));
});

console.log("schedule-on-contract tests passed");
