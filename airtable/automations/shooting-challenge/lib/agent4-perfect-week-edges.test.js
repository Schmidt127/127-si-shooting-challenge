#!/usr/bin/env node
/**
 * Agent 4 — Perfect Week edge-case supplement (alongside overnight-perfect-week).
 * Product rules: Sun–Sat, seven distinct dates, daily min via upstream keys,
 * video min, Zoom only when meeting exists, homework required when configured,
 * no one-day bulk award, no duplicate unlock/XP.
 *
 * Test-override behavior is NOT implemented in v2-engine-contracts helpers;
 * any override must remain isolated in Airtable script inputs and is flagged as a gap.
 *
 * Run: node airtable/automations/shooting-challenge/lib/agent4-perfect-week-edges.test.js
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
const WEEK_START = "2026-07-19";
const FULL = buildRequiredWeekDates(WEEK_START, 7);

function evaluate(overrides = {}) {
  return evaluatePerfectWeekEligibility({
    weekStartDateKey: WEEK_START,
    countedSubmissionDateKeys: FULL,
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

test("blank optional zoom/video zeros with no requirements still pass daily+homework", () => {
  const result = evaluate({
    videoCount: 0,
    videoRequired: 0,
    zoomAttendanceCount: 0,
    zoomRequired: 0,
  });
  assert.strictEqual(result.eligible, true);
});

test("blank required homework fails", () => {
  const result = evaluate({ homeworkSatisfactoryCount: 0, homeworkRequired: 1 });
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.homeworkMet, false);
});

test("empty counted keys never qualify (malformed activity set)", () => {
  const result = evaluate({ countedSubmissionDateKeys: [] });
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.dailyMet, false);
  assert.strictEqual(result.missingDays.length, 7);
});

test("historical vs current week: source keys differ by week id", () => {
  const current = buildPerfectWeekSourceKey(ENR, WEEK);
  const historical = buildPerfectWeekSourceKey(ENR, "recWeekHistorical01");
  assert.notStrictEqual(current, historical);
});

test("already-processed Perfect Week XP skips on rerun", () => {
  const key = buildPerfectWeekSourceKey(ENR, WEEK);
  assert.strictEqual(
    decideXpEventAction({ sourceKey: key, existingKeys: [key] }).action,
    "skip_existing"
  );
});

test("six days + bulk same-day pad still fails (distinct dates)", () => {
  const keys = [...FULL.slice(0, 6), FULL[0], FULL[0]];
  const result = evaluate({ countedSubmissionDateKeys: keys });
  assert.strictEqual(result.eligible, false);
});

test("scheduled Zoom without attendance blocks; no Zoom does not", () => {
  assert.strictEqual(evaluate({ zoomRequired: 1, zoomAttendanceCount: 0 }).eligible, false);
  assert.strictEqual(evaluate({ zoomRequired: 0, zoomAttendanceCount: 0 }).eligible, true);
});

test("engine helper has no silent testOverride flag (isolation gap documented)", () => {
  const result = evaluate({ testOverride: true, countedSubmissionDateKeys: [] });
  assert.strictEqual(result.eligible, false);
});

console.log("agent4-perfect-week-edges: all tests passed");
