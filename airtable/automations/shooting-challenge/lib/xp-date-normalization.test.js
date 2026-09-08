#!/usr/bin/env node
/**
 * SC-021 / C-025 — date normalization regression checks for XP-producing automations.
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function denverKey(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const exact = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exact) return `${exact[1]}-${exact[2]}-${exact[3]}`;
    const local = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (local) return `${local[3]}-${local[1].padStart(2, "0")}-${local[2].padStart(2, "0")}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

test("053/054 no longer use UTC ISO slice for toDateKey", () => {
  for (const file of [
    "053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js",
    "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js",
  ]) {
    const body = fs.readFileSync(path.join(root, file), "utf8");
    assert.ok(/America\/Denver/.test(body));
    assert.ok(!/toISOString\(\)\.slice\(0,\s*10\)/.test(body));
  }
});

test("101 writes activity date fields from meetingDateKey", () => {
  const body = fs.readFileSync(
    path.join(root, "101-zoom-attendance-xp-award-meeting-xp.js"),
    "utf8",
  );
  assert.ok(/meetingDateKey/.test(body));
  assert.ok(/XP Activity Date/.test(body));
});

test("Denver date helper preserves local calendar day near UTC midnight", () => {
  assert.strictEqual(denverKey("2026-08-22T03:00:00.000Z"), "2026-08-21");
});

test("text date keys parse without timezone shift", () => {
  assert.strictEqual(denverKey("2026-08-21"), "2026-08-21");
  assert.strictEqual(denverKey("8/21/2026"), "2026-08-21");
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
    /Version:\s*v?2\.6/.test(s057) || /version:\s*"v?2\.6"/.test(s057),
    "057 header must declare current repository version 2.6"
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
  assert.ok(!/toISOString\(\)\.slice\(0,\s*10\)/.test(fnMatch[0]));
});

console.log("xp-date-normalization tests passed");
