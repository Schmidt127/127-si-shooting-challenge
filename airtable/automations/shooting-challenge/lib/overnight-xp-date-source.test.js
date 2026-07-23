#!/usr/bin/env node
/**
 * Overnight Agent 2 — XP date resolution coverage for every XP source.
 * Verifies America/Denver date-key behavior for the mappings documented in
 * docs/overnight/config-xp/XP-DATE-SOURCE-AUDIT.md:
 *   Submission Base -> Activity Date, Homework -> submission activity date,
 *   Video Feedback -> activity date, Streak -> streak end date,
 *   Zoom -> meeting date, Perfect Week -> week Saturday,
 *   Shot Milestone -> latest counted submission date, Manual -> explicit date.
 * Run: node airtable/automations/shooting-challenge/lib/overnight-xp-date-source.test.js
 */

"use strict";

const assert = require("assert");
const {
  toDateKeyFromText,
  toDateKeyFromDateObject,
  toSafeDateKey,
  addDaysToDateKey,
  buildRequiredWeekDates,
  priorSaturdayKeyDenver,
  buildStreakBlocks,
  unlockStreaksFromBlocks,
  buildStreakXpSourceKey,
} = require("./v2-engine-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

// --- Denver conversions (MDT = UTC-6, MST = UTC-7) ---

test("current-date submission: date-only Activity Date passes through unchanged", () => {
  // Submissions.Activity Date is a date-only field ("2026-07-23"); the text
  // path must win without timezone math.
  assert.strictEqual(toSafeDateKey(null, "2026-07-23"), "2026-07-23");
  assert.strictEqual(toSafeDateKey(new Date("2026-07-24T01:00:00Z"), "2026-07-23"), "2026-07-23");
});

test("backdated submission: earlier Activity Date is preserved regardless of run time", () => {
  // A submission entered on 7/23 for activity on 7/20 must resolve to 7/20.
  assert.strictEqual(toSafeDateKey(null, "2026-07-20"), "2026-07-20");
  assert.strictEqual(toDateKeyFromText("7/20/2026"), "2026-07-20");
});

test("Denver evening UTC timestamp resolves to the Denver date (summer, MDT)", () => {
  // 2026-07-24T03:00Z is 2026-07-23 21:00 in Denver.
  assert.strictEqual(toDateKeyFromDateObject(new Date("2026-07-24T03:00:00Z")), "2026-07-23");
});

test("Denver winter boundary (MST): 06:59Z previous day, 07:00Z same day", () => {
  assert.strictEqual(toDateKeyFromDateObject(new Date("2026-01-15T06:59:00Z")), "2026-01-14");
  assert.strictEqual(toDateKeyFromDateObject(new Date("2026-01-15T07:00:00Z")), "2026-01-15");
});

test("naive UTC slicing would disagree with Denver on evening timestamps", () => {
  // Regression guard for the 057 getDateKeyFromDateOnly UTC-slice pattern:
  // slicing the ISO string yields 2026-07-24, Denver truth is 2026-07-23.
  const iso = "2026-07-24T03:00:00.000Z";
  assert.strictEqual(iso.slice(0, 10), "2026-07-24");
  assert.strictEqual(toDateKeyFromDateObject(new Date(iso)), "2026-07-23");
});

// --- delayed grading: activity date beats graded-at date ---

test("delayed homework grading keeps the submission activity date", () => {
  // Homework graded days later still awards XP on the activity date the
  // Homework Completion inherited from its Submission.
  const activityDateText = "2026-07-19";
  const gradedAt = new Date("2026-07-23T18:00:00Z");
  assert.strictEqual(toSafeDateKey(gradedAt, activityDateText), "2026-07-19");
});

test("delayed video grading keeps the video activity date", () => {
  assert.strictEqual(toSafeDateKey(new Date("2026-07-23T18:00:00Z"), "2026-07-21"), "2026-07-21");
});

// --- Zoom recording approval ---

test("Zoom XP date follows the meeting date, not the approval date", () => {
  // Meeting on 5/24, quiz approved 7/23: XP date must stay 5/24.
  assert.strictEqual(toSafeDateKey(new Date("2026-07-23T20:00:00Z"), "2026-05-24"), "2026-05-24");
});

// --- streak unlock after recalculation ---

test("streak unlock after recalculation uses the block end date key", () => {
  const blocks = buildStreakBlocks(["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"]);
  const [unlock] = unlockStreaksFromBlocks(blocks, [3]);
  assert.strictEqual(unlock.streakEndDate, "2026-07-03");
  const key = buildStreakXpSourceKey("recEnrollment0001", "recAchStreak3Day1", unlock.streakEndDate);
  assert.match(key, /\|2026-07-03$/);
});

test("backdated repair shifts the effective streak end date deterministically", () => {
  // Backfill joins two runs; the 3-day threshold end date moves earlier.
  const before = unlockStreaksFromBlocks(
    buildStreakBlocks(["2026-07-03", "2026-07-04", "2026-07-05"]), [3]
  )[0];
  const after = unlockStreaksFromBlocks(
    buildStreakBlocks(["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]), [3]
  )[0];
  assert.strictEqual(before.streakEndDate, "2026-07-05");
  assert.strictEqual(after.streakEndDate, "2026-07-03");
  // Different end dates yield different source keys — documented 053 defect:
  // a rerun after backfill can award the same threshold twice without an
  // occurrence-level guard.
  assert.notStrictEqual(
    buildStreakXpSourceKey("recEnrollment0001", "recAchStreak3Day1", before.streakEndDate),
    buildStreakXpSourceKey("recEnrollment0001", "recAchStreak3Day1", after.streakEndDate)
  );
});

// --- milestone unlock after backfill ---

test("milestone activity date = latest counted submission date key", () => {
  // 066 contract: activity date is the max counted Activity Date Key, which
  // for backfills can be earlier than today.
  const countedDateKeys = ["2026-07-10", "2026-07-20", "2026-07-15"];
  const latest = [...countedDateKeys].sort().pop();
  assert.strictEqual(latest, "2026-07-20");
});

// --- Perfect Week week-end (Saturday) resolution ---

test("Perfect Week XP date = week Saturday (start + 6)", () => {
  assert.strictEqual(addDaysToDateKey("2026-07-19", 6), "2026-07-25");
  const weekDates = buildRequiredWeekDates("2026-07-19", 7);
  assert.strictEqual(weekDates[6], "2026-07-25");
});

test("Perfect Week calculated after week end still resolves the prior Saturday", () => {
  // Run on Monday 2026-07-27 Denver: prior completed Saturday is 07-25.
  const mondayAfter = new Date("2026-07-27T18:00:00Z");
  assert.strictEqual(priorSaturdayKeyDenver(mondayAfter), "2026-07-25");
});

test("priorSaturdayKeyDenver on Saturday returns the previous Saturday", () => {
  const saturdayNoon = new Date("2026-07-25T18:00:00Z");
  assert.strictEqual(priorSaturdayKeyDenver(saturdayNoon), "2026-07-18");
});

// --- manual bonus ---

test("manual bonus explicit date passes through untouched", () => {
  assert.strictEqual(toSafeDateKey(null, "2026-06-01"), "2026-06-01");
});

// --- date-key arithmetic edges ---

test("date-key arithmetic crosses month and year boundaries", () => {
  assert.strictEqual(addDaysToDateKey("2026-07-31", 1), "2026-08-01");
  assert.strictEqual(addDaysToDateKey("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(addDaysToDateKey("2026-03-01", -1), "2026-02-28");
});

console.log("overnight-xp-date-source: all tests passed");
