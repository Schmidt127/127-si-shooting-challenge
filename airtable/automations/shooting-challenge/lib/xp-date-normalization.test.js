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

test("Stage 17 117c is Denver-safe for XP Activity Date", () => {
  const s117c = fs.readFileSync(
    path.join(root, "_design-alternatives/stage17-modular-reference/117c-zoom-recording-create-zoom-xp-event.js"),
    "utf8",
  );
  assert.ok(/timeZone:\s*"America\/Denver"/.test(s117c));
  assert.ok(/XP Activity Date/.test(s117c));
  assert.ok(/toDenverDateKey/.test(s117c));
});

test("057 Perfect Week date keys use America/Denver (not UTC ISO slice)", () => {
  const s057 = fs.readFileSync(
    path.join(root, "057-achievements-and-milestones-calculate-perfect-week-eligibility.js"),
    "utf8",
  );
  assert.ok(/timezone:\s*"America\/Denver"/.test(s057));
  assert.ok(
    /Version:\s*v?2\.4/.test(s057) || /version:\s*"v?2\.4"/.test(s057),
    "057 header must declare current repository version 2.4"
  );
  assert.ok(
    /gracePeriodHours|Submission Grace Period Hours|grace period/i.test(s057),
    "057 must support configurable submission grace period"
  );
  assert.ok(
    /settledSeasonGoal/.test(s057) && /Goal Shots Target/.test(s057),
    "057 must settle on Goal Shots Target, not Weekly Goal vs season total"
  );
  const fnMatch = s057.match(
    /function getDateKeyFromDateOnly\(value\) \{[\s\S]*?\n\}/
  );
  assert.ok(fnMatch, "getDateKeyFromDateOnly function not found");
  const body = fnMatch[0];
  assert.ok(/Intl\.DateTimeFormat/.test(body), "057 getDateKeyFromDateOnly must use Intl");
  assert.ok(
    /isoMatch = trimmed\.match\(\/\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)\$\//.test(body),
    "057 must only short-circuit true date-only YYYY-MM-DD strings"
  );
  assert.ok(
    !/toISOString\(\)\.slice\(0,\s*10\)/.test(body),
    "057 getDateKeyFromDateOnly must not use UTC ISO slice"
  );
});

test("057 addDaysToDateKey avoids UTC ISO slice for week boundaries", () => {
  const s057 = fs.readFileSync(
    path.join(root, "057-achievements-and-milestones-calculate-perfect-week-eligibility.js"),
    "utf8",
  );
  const fnMatch = s057.match(/function addDaysToDateKey\(dateKey, daysToAdd\) \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, "addDaysToDateKey function not found");
  assert.ok(
    !/toISOString\(\)\.slice\(0,\s*10\)/.test(fnMatch[0]),
    "057 addDaysToDateKey must not use UTC ISO slice"
  );
});

/** Mirror of 057 addDaysToDateKey for week-boundary proofs. */
function addDaysToDateKey057(dateKey, daysToAdd) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

test("057 mirror: Sun–Sat week boundaries from Sunday start", () => {
  const week = [];
  for (let i = 0; i < 7; i += 1) week.push(addDaysToDateKey057("2026-08-02", i));
  assert.deepStrictEqual(week, [
    "2026-08-02",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-08-08",
  ]);
});

/** Mirror of 057 getDateKeyFromDateOnly (America/Denver) for boundary proofs. */
function getDateKeyFromDateOnly057(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = String(value).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const localMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (localMatch) {
      return `${localMatch[3]}-${localMatch[1].padStart(2, "0")}-${localMatch[2].padStart(2, "0")}`;
    }
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

test("057 mirror: Fillout Aug 19 6:00 PM Mountain stays Aug 19", () => {
  // 2026-08-19 18:00 America/Denver (MDT) = 2026-08-20T00:00:00.000Z
  const filloutEvening = new Date("2026-08-20T00:00:00.000Z");
  assert.strictEqual(getDateKeyFromDateOnly057(filloutEvening), "2026-08-19");
  assert.strictEqual(filloutEvening.toISOString().slice(0, 10), "2026-08-20");
  assert.strictEqual(
    getDateKeyFromDateOnly057("2026-08-20T00:00:00.000Z"),
    "2026-08-19"
  );
});

test("057 mirror: Saturday 11:59 PM Denver stays Saturday", () => {
  // 2026-07-25 23:59 MDT = 2026-07-26 05:59 UTC
  const ts = new Date("2026-07-26T05:59:00.000Z");
  assert.strictEqual(getDateKeyFromDateOnly057(ts), "2026-07-25");
  assert.strictEqual(ts.toISOString().slice(0, 10), "2026-07-26");
});

test("057 mirror: Sunday 12:01 AM Denver is Sunday (not Saturday)", () => {
  // 2026-07-26 00:01 MDT = 2026-07-26 06:01 UTC
  const ts = new Date("2026-07-26T06:01:00.000Z");
  assert.strictEqual(getDateKeyFromDateOnly057(ts), "2026-07-26");
});

test("057 mirror: DST spring forward 2026-03-08 Denver", () => {
  // 01:30 MST does not exist after spring forward; 08:30Z = 01:30 MST pre-spring
  // 2026-03-08 02:30 never exists; 09:30Z = 03:30 MDT
  assert.strictEqual(
    getDateKeyFromDateOnly057(new Date("2026-03-08T08:30:00.000Z")),
    "2026-03-08"
  );
  assert.strictEqual(
    getDateKeyFromDateOnly057(new Date("2026-03-08T09:30:00.000Z")),
    "2026-03-08"
  );
});

test("057 mirror: DST fall back 2026-11-01 Denver", () => {
  // 08:30Z = 01:30 MDT before fall back; 09:30Z = 01:30/02:30 ambiguity window → still 11/01
  assert.strictEqual(
    getDateKeyFromDateOnly057(new Date("2026-11-01T08:30:00.000Z")),
    "2026-11-01"
  );
  assert.strictEqual(
    getDateKeyFromDateOnly057(new Date("2026-11-01T09:30:00.000Z")),
    "2026-11-01"
  );
});

test("057 mirror: date-only string and invalid/blank", () => {
  assert.strictEqual(getDateKeyFromDateOnly057("2026-02-28"), "2026-02-28");
  assert.strictEqual(getDateKeyFromDateOnly057("2/29/2024"), "2024-02-29");
  assert.strictEqual(getDateKeyFromDateOnly057(""), "");
  assert.strictEqual(getDateKeyFromDateOnly057(null), "");
  assert.strictEqual(getDateKeyFromDateOnly057("not-a-date"), "");
});

test("035 Weekly Threshold activity date helper uses America/Denver", () => {
  const s035 = fs.readFileSync(
    path.join(root, "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js"),
    "utf8",
  );
  assert.ok(/timeZone:\s*"America\/Denver"/.test(s035));
  assert.ok(/function toDateKey\(value\)/.test(s035));
  assert.ok(/Intl\.DateTimeFormat/.test(s035));
  assert.ok(/version:\s*"v1\.3"/.test(s035));
});

console.log("\nAll xp-date-normalization tests passed.");
