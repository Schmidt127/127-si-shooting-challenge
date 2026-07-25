#!/usr/bin/env node
/**
 * SC-049 / XP-D1 — Weekly Threshold XP contract coverage.
 * Run: node airtable/automations/shooting-challenge/lib/weekly-threshold-xp.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildWeeklyThresholdSourceKey,
  buildWeeklyThresholdRuleKey,
  normalizeThresholdGradeBandCode,
  goalCompletionMeetsThreshold,
  planWeeklyThresholdAwards,
  decideXpEventAction,
  WEEKLY_THRESHOLD_PERCENTS,
  SOURCE_KEY_PREFIXES,
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

const RULES = {
  WEEKLY_THRESHOLD_100_K2: { xpAmount: 10 },
  WEEKLY_THRESHOLD_125_K2: { xpAmount: 20 },
  WEEKLY_THRESHOLD_150_K2: { xpAmount: 30 },
};

test("canonical percents are 100/125/150", () => {
  assert.deepStrictEqual([...WEEKLY_THRESHOLD_PERCENTS], [100, 125, 150]);
});

test("source key format is WEEKLY_THRESHOLD|enrollment|week|percent", () => {
  assert.strictEqual(
    buildWeeklyThresholdSourceKey(ENR, WEEK, 100),
    `WEEKLY_THRESHOLD|${ENR}|${WEEK}|100`
  );
  assert.strictEqual(SOURCE_KEY_PREFIXES.weeklyThreshold, "WEEKLY_THRESHOLD|");
});

test("rule key uses band code suffix", () => {
  assert.strictEqual(buildWeeklyThresholdRuleKey(125, "K2"), "WEEKLY_THRESHOLD_125_K2");
  assert.strictEqual(normalizeThresholdGradeBandCode("K-2"), "K2");
  assert.strictEqual(normalizeThresholdGradeBandCode("Grades 9-12"), "912");
  assert.strictEqual(normalizeThresholdGradeBandCode("3–4"), "34");
});

test("goal completion ratio and whole-percent both work", () => {
  assert.strictEqual(goalCompletionMeetsThreshold(1.0, 100), true);
  assert.strictEqual(goalCompletionMeetsThreshold(0.99, 100), false);
  assert.strictEqual(goalCompletionMeetsThreshold(1.24, 125), false);
  assert.strictEqual(goalCompletionMeetsThreshold(1.25, 125), true);
  assert.strictEqual(goalCompletionMeetsThreshold(150, 150), true);
  assert.strictEqual(goalCompletionMeetsThreshold(149, 150), false);
});

test("below 100% creates nothing", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 0.9,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.anyMet, false);
  assert.strictEqual(plan.createCount, 0);
  assert.strictEqual(plan.notMetCount, 3);
});

test("exactly 100% creates only 100 tier", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.0,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.toCreate[0].percent, 100);
  assert.strictEqual(plan.toCreate[0].xpAmount, 10);
});

test("150% creates all three tiers", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.createCount, 3);
  assert.deepStrictEqual(plan.toCreate.map((p) => p.percent), [100, 125, 150]);
  assert.deepStrictEqual(plan.toCreate.map((p) => p.xpAmount), [10, 20, 30]);
});

test("existing source keys skip without duplicate create", () => {
  const existing = [
    buildWeeklyThresholdSourceKey(ENR, WEEK, 100),
    buildWeeklyThresholdSourceKey(ENR, WEEK, 125),
  ];
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    existingSourceKeys: existing,
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.skipExistingCount, 2);
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.toCreate[0].percent, 150);
  assert.strictEqual(
    decideXpEventAction({
      sourceKey: existing[0],
      existingKeys: existing,
    }).action,
    "skip_existing"
  );
});

test("missing reward rule errors that tier (does not invent amount)", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.0,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: {},
  });
  assert.strictEqual(plan.errors.length, 1);
  assert.strictEqual(plan.errors[0].action, "error_missing_rule");
  assert.strictEqual(plan.createCount, 0);
});

test("different weeks produce different source keys", () => {
  const a = buildWeeklyThresholdSourceKey(ENR, WEEK, 100);
  const b = buildWeeklyThresholdSourceKey(ENR, "recWeekHistorical01", 100);
  assert.notStrictEqual(a, b);
});

test("035 automation script exists and mints WEEKLY_THRESHOLD Source Keys", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js"
  );
  assert.ok(fs.existsSync(scriptPath), "035 script missing");
  const body = fs.readFileSync(scriptPath, "utf8");
  assert.ok(body.includes("WEEKLY_THRESHOLD|"));
  assert.ok(body.includes("createRecordAsync"));
  assert.ok(body.includes("Threshold XP Status"));
  assert.ok(body.includes("Weekly Threshold 100"));
  assert.ok(body.includes("America/Denver"));
  assert.ok(body.includes("async function main()"));
});

console.log("weekly-threshold-xp: all tests passed");
