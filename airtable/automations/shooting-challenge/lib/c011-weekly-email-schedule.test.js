#!/usr/bin/env node
/**
 * Static source contracts for weekly email schedule safeguards (C-011).
 * Run: node airtable/automations/shooting-challenge/lib/c011-weekly-email-schedule.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { priorSaturdayKeyDenver, buildWeeklyEmailEventId } = require("./v2-engine-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("118/119 default dryRun true and refuse Live arming", () => {
  const s118 = read("118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js");
  const s119 = read("119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js");
  assert.ok(/parseBool\(inputConfig\.dryRun,\s*true\)/.test(s118));
  assert.ok(/parseBool\(inputConfig\.dryRun,\s*true\)/.test(s119));
  assert.ok(/refuses sendMode=Live when dryRun=false/.test(s118));
  assert.ok(/version:\s*"v1\.4"/.test(s118));
  assert.ok(/version:\s*"v1\.4"/.test(s119));
  assert.ok(/scheduledWeekEndKeyOut/.test(s118));
  assert.ok(/scheduledWeekEndKeyOut/.test(s119));
  assert.ok(/Summary Key/.test(s118));
  assert.ok(/emptyWeekPolicy/.test(s118));
  assert.ok(/emptyWeekPolicy/.test(s119));
  assert.ok(/send_short/.test(s118));
  assert.ok(/send_short/.test(s119));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s118));
  assert.ok(!/emptyWeekPolicy recorded but not enforced/.test(s119));
  assert.ok(/\{Enrollment Key\}\|\{Week Key\}/.test(s118));
  assert.ok(!/\bfetch\s*\(/.test(s119), "119 must not webhook");
});

test("074 emits eventId and never clears Weekly Email Sent?", () => {
  const s074 = read("074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js");
  assert.ok(/eventId/.test(s074));
  assert.ok(/WEEKLY_EMAIL\|/.test(s074));
  assert.ok(/Do NOT write Weekly Email Sent\? = false/.test(s074));
  assert.ok(!/successUpdates\[FIELD_EMAIL_SENT\]\s*=\s*false/.test(s074));
  assert.ok(/Version:\s*v2\.1/.test(s074));
});

test("priorSaturdayKeyDenver Sunday→Saturday boundary", () => {
  // 2026-07-19 is Sunday in America/Denver calendar math when constructed as UTC noon.
  const sunday = new Date(Date.UTC(2026, 6, 19, 18, 0, 0)); // afternoon UTC → still Sunday Denver
  const key = priorSaturdayKeyDenver(sunday);
  assert.strictEqual(key, "2026-07-18");
  const eventId = buildWeeklyEmailEventId("recEnrollment0001", "recWeek0000000001");
  assert.strictEqual(eventId, "WEEKLY_EMAIL|recEnrollment0001|recWeek0000000001");
});

test("119 only arms ready packages (source gate)", () => {
  const s119 = read("119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js");
  assert.ok(/!ready \|\| !subject \|\| !recipients \|\| !html/.test(s119));
  assert.ok(/booleanish\(row,\s*CONFIG\.was\.sent\)/.test(s119));
});

console.log("\nAll c011-weekly-email-schedule tests passed.");
