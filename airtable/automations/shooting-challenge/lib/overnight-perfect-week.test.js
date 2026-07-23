#!/usr/bin/env node
/**
 * Overnight Agent 2 — Perfect Week qualification coverage.
 * Product rules under test (completion master / 057):
 *   Sunday–Saturday week, same-day submissions only, seven distinct qualifying
 *   dates, daily minimum = weekly goal / 7 (enforced upstream when building
 *   countedSubmissionDateKeys), >= 3 qualifying videos, Zoom required only
 *   when a Zoom Meeting exists, XP amount owned by the PERFECT_WEEK rule (100).
 * Run: node airtable/automations/shooting-challenge/lib/overnight-perfect-week.test.js
 */

"use strict";

const assert = require("assert");
const {
  evaluatePerfectWeekEligibility,
  buildRequiredWeekDates,
  buildPerfectWeekSourceKey,
  decideXpEventAction,
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

const ENR = "recEnrollment0001";
const WEEK = "recWeek0000000001";

// Week of Sunday 2026-07-19 through Saturday 2026-07-25.
const WEEK_START = "2026-07-19";
const FULL_WEEK = buildRequiredWeekDates(WEEK_START, 7);

function evaluate(overrides = {}) {
  return evaluatePerfectWeekEligibility({
    weekStartDateKey: WEEK_START,
    countedSubmissionDateKeys: FULL_WEEK,
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
    videoCount: 3,
    videoRequired: 3,
    zoomAttendanceCount: 0,
    zoomRequired: 0,
    requiredDailyCount: 7,
    ...overrides,
  });
}

test("required week dates span Sunday through Saturday", () => {
  assert.deepStrictEqual(FULL_WEEK, [
    "2026-07-19", "2026-07-20", "2026-07-21", "2026-07-22",
    "2026-07-23", "2026-07-24", "2026-07-25",
  ]);
});

test("seven valid days passes", () => {
  const result = evaluate();
  assert.strictEqual(result.eligible, true);
  assert.strictEqual(result.dailyMet, true);
  assert.deepStrictEqual(result.missingDays, []);
});

test("1500 shots dumped on one day does not pass (one distinct date)", () => {
  // Seven submissions all on Monday collapse to a single distinct date key.
  const result = evaluate({
    countedSubmissionDateKeys: Array(7).fill("2026-07-20"),
  });
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.dailyMet, false);
  assert.strictEqual(result.missingDays.length, 6);
});

test("six of seven days does not pass", () => {
  const result = evaluate({
    countedSubmissionDateKeys: FULL_WEEK.slice(0, 6),
  });
  assert.strictEqual(result.eligible, false);
  assert.deepStrictEqual(result.missingDays, ["2026-07-25"]);
});

test("seven days with one below the daily minimum does not pass", () => {
  // Daily minimum (weekly goal / 7) is enforced upstream: a below-minimum day
  // never enters countedSubmissionDateKeys, so Wednesday is simply absent.
  const withoutWednesday = FULL_WEEK.filter((d) => d !== "2026-07-22");
  const result = evaluate({ countedSubmissionDateKeys: withoutWednesday });
  assert.strictEqual(result.eligible, false);
  assert.deepStrictEqual(result.missingDays, ["2026-07-22"]);
});

test("only two videos does not pass; three does", () => {
  assert.strictEqual(evaluate({ videoCount: 2 }).eligible, false);
  assert.strictEqual(evaluate({ videoCount: 2 }).videoMet, false);
  assert.strictEqual(evaluate({ videoCount: 3 }).eligible, true);
});

test("no Zoom meeting this week: zoom requirement defaults to met", () => {
  const result = evaluate({ zoomRequired: 0, zoomAttendanceCount: 0 });
  assert.strictEqual(result.zoomMet, true);
  assert.strictEqual(result.eligible, true);
});

test("Zoom meeting exists with no attendance: fails", () => {
  const result = evaluate({ zoomRequired: 1, zoomAttendanceCount: 0 });
  assert.strictEqual(result.zoomMet, false);
  assert.strictEqual(result.eligible, false);
});

test("Zoom meeting exists with attendance: passes", () => {
  const result = evaluate({ zoomRequired: 1, zoomAttendanceCount: 1 });
  assert.strictEqual(result.eligible, true);
});

test("backdated qualifying submission completes the week on recalculation", () => {
  const missingTuesday = FULL_WEEK.filter((d) => d !== "2026-07-21");
  assert.strictEqual(evaluate({ countedSubmissionDateKeys: missingTuesday }).eligible, false);
  // Same-day rule means a *backdated entry* cannot qualify; only a submission
  // whose Activity Date and Submitted At agree does. Once such a record exists
  // the recalculation sees the full set.
  const repaired = [...missingTuesday, "2026-07-21"];
  assert.strictEqual(evaluate({ countedSubmissionDateKeys: repaired }).eligible, true);
});

test("duplicate rerun is deterministic and dedupes via PERFECT_WEEK source key", () => {
  const first = evaluate();
  const second = evaluate();
  assert.deepStrictEqual(first, second);

  const sourceKey = buildPerfectWeekSourceKey(ENR, WEEK);
  assert.strictEqual(sourceKey, `PERFECT_WEEK|${ENR}|${WEEK}`);
  const createFirst = decideXpEventAction({ sourceKey, existingKeys: [] });
  assert.strictEqual(createFirst.action, "create");
  const rerun = decideXpEventAction({ sourceKey, existingKeys: [sourceKey] });
  assert.strictEqual(rerun.action, "skip_existing");
});

test("extra submissions outside the week do not help", () => {
  const result = evaluate({
    countedSubmissionDateKeys: [...FULL_WEEK.slice(0, 6), "2026-07-26", "2026-07-27"],
  });
  assert.strictEqual(result.eligible, false);
});

test("homework requirement respected when configured", () => {
  const result = evaluate({ homeworkSatisfactoryCount: 0, homeworkRequired: 1 });
  assert.strictEqual(result.homeworkMet, false);
  assert.strictEqual(result.eligible, false);
});

console.log("overnight-perfect-week: all tests passed");
