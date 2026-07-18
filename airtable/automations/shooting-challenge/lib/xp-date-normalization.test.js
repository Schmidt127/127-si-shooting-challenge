#!/usr/bin/env node
/**
 * Offline contract: Denver date keys for streak/zoom XP (no Airtable).
 * Run: node airtable/automations/shooting-challenge/lib/xp-date-normalization.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { toDateKeyFromDateObject, toDateKeyFromText } = require("./v2-engine-contracts");

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

test("053/054 no longer use UTC ISO slice for toDateKey", () => {
  const s053 = fs.readFileSync(
    path.join(root, "053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js"),
    "utf8",
  );
  const s054 = fs.readFileSync(
    path.join(root, "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js"),
    "utf8",
  );
  assert.ok(/America\/Denver/.test(s053));
  assert.ok(/America\/Denver/.test(s054));
  assert.ok(/Intl\.DateTimeFormat/.test(s053));
  assert.ok(/Intl\.DateTimeFormat/.test(s054));
  // Ensure the unsafe UTC slice pattern is not the active toDateKey body.
  assert.ok(!/function toDateKey\(value\) \{[\s\S]*?toISOString\(\)\.slice\(0,\s*10\)/.test(s053));
  assert.ok(!/function toDateKey\(value\) \{[\s\S]*?toISOString\(\)\.slice\(0,\s*10\)/.test(s054));
});

test("101 writes activity date fields from meetingDateKey", () => {
  const s101 = fs.readFileSync(
    path.join(root, "101-zoom-attendance-xp-award-meeting-xp.js"),
    "utf8",
  );
  assert.ok(/activityDate:\s*"Activity Date"/.test(s101));
  assert.ok(/activityDateKey:\s*meetingDateKey/.test(s101));
  assert.ok(/xpActivityDate:\s*"XP Activity Date"/.test(s101));
});

test("Denver date helper preserves local calendar day near UTC midnight", () => {
  // 2026-07-18 23:30 America/Denver = 2026-07-19 05:30 UTC — UTC slice would be 19th.
  const lateDenver = new Date("2026-07-19T05:30:00.000Z");
  const denverKey = toDateKeyFromDateObject(lateDenver, "America/Denver");
  const utcSlice = lateDenver.toISOString().slice(0, 10);
  assert.strictEqual(denverKey, "2026-07-18");
  assert.strictEqual(utcSlice, "2026-07-19");
  assert.notStrictEqual(denverKey, utcSlice);
});

test("text date keys parse without timezone shift", () => {
  assert.strictEqual(toDateKeyFromText("2026-07-18"), "2026-07-18");
  assert.strictEqual(toDateKeyFromText("7/18/2026"), "2026-07-18");
});

test("117a already Denver-safe for activity dates", () => {
  const s117a = fs.readFileSync(
    path.join(root, "117a-zoom-recording-credit-award-xp-from-quiz-completion.js"),
    "utf8",
  );
  assert.ok(/timeZone:\s*"America\/Denver"/.test(s117a));
  assert.ok(/toDateKeyFromDateObject/.test(s117a));
});

console.log("\nAll xp-date-normalization tests passed.");
