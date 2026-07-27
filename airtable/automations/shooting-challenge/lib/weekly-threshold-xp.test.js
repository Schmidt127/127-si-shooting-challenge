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
  weeklyThresholdXpSourceLabel,
  weeklyThresholdTierAlreadyAwarded,
  listWeeklyThresholdLegacyKeyRiskNotes,
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

test("xp source labels are Weekly Threshold {percent}", () => {
  assert.strictEqual(weeklyThresholdXpSourceLabel(100), "Weekly Threshold 100");
  assert.strictEqual(weeklyThresholdXpSourceLabel(125), "Weekly Threshold 125");
  assert.strictEqual(weeklyThresholdXpSourceLabel(150), "Weekly Threshold 150");
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
  assert.strictEqual(goalCompletionMeetsThreshold(null, 100), false);
  assert.strictEqual(goalCompletionMeetsThreshold("", 100), false);
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

test("above 100% but below 125 creates only 100", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.1,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.toCreate[0].percent, 100);
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

test("xp amount as string still converts numerically", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.0,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: { WEEKLY_THRESHOLD_100_K2: { xpAmount: "10" } },
  });
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.toCreate[0].xpAmount, 10);
  assert.strictEqual(typeof plan.toCreate[0].xpAmount, "number");
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

test("legacy XP Source label skips even when Source Key shape differs", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    existingSourceKeys: ["LEGACY_THRESHOLD|something|100"],
    existingXpSourceLabels: ["Weekly Threshold 100", "Weekly Threshold 125"],
    rulesByKey: RULES,
  });
  assert.strictEqual(plan.skipExistingCount, 2);
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.toCreate[0].percent, 150);
  const via100 = plan.plans.find((p) => p.percent === 100);
  assert.strictEqual(via100.skipVia, "xp_source_label");
});

test("weeklyThresholdTierAlreadyAwarded prefers source_key then label", () => {
  const key = buildWeeklyThresholdSourceKey(ENR, WEEK, 100);
  assert.deepStrictEqual(
    weeklyThresholdTierAlreadyAwarded({
      sourceKey: key,
      xpSourceLabel: "Weekly Threshold 100",
      existingSourceKeys: [key],
      existingXpSourceLabels: ["Weekly Threshold 100"],
    }),
    { awarded: true, via: "source_key" }
  );
  assert.deepStrictEqual(
    weeklyThresholdTierAlreadyAwarded({
      sourceKey: key,
      xpSourceLabel: "Weekly Threshold 100",
      existingSourceKeys: [],
      existingXpSourceLabels: ["Weekly Threshold 100"],
    }),
    { awarded: true, via: "xp_source_label" }
  );
  assert.strictEqual(
    weeklyThresholdTierAlreadyAwarded({
      sourceKey: key,
      xpSourceLabel: "Weekly Threshold 100",
      existingSourceKeys: [],
      existingXpSourceLabels: [],
    }).awarded,
    false
  );
});

test("inactive enrollment skips all tiers", () => {
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
    enrollmentActive: false,
  });
  assert.strictEqual(plan.action, "skipped_inactive_enrollment");
  assert.strictEqual(plan.createCount, 0);
  assert.strictEqual(plan.plans.length, 0);
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

test("inactive rule absent from rulesByKey errors tier", () => {
  // Script filters Active?=false before planning; planner only sees active map.
  const plan = planWeeklyThresholdAwards({
    goalCompletionValue: 1.25,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: {
      WEEKLY_THRESHOLD_100_K2: { xpAmount: 10 },
      // 125 intentionally omitted (= inactive / missing)
    },
  });
  assert.strictEqual(plan.createCount, 1);
  assert.strictEqual(plan.errors.length, 1);
  assert.strictEqual(plan.errors[0].percent, 125);
});

test("repeated plan with prior creates is idempotent", () => {
  const first = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    rulesByKey: RULES,
  });
  assert.strictEqual(first.createCount, 3);
  const keys = first.toCreate.map((p) => p.sourceKey);
  const labels = first.toCreate.map((p) => p.xpSourceLabel);
  const second = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    existingSourceKeys: keys,
    existingXpSourceLabels: labels,
    rulesByKey: RULES,
  });
  assert.strictEqual(second.createCount, 0);
  assert.strictEqual(second.skipExistingCount, 3);
  const third = planWeeklyThresholdAwards({
    goalCompletionValue: 1.5,
    enrollmentId: ENR,
    weekId: WEEK,
    bandCode: "K2",
    existingSourceKeys: keys,
    existingXpSourceLabels: labels,
    rulesByKey: RULES,
  });
  assert.strictEqual(third.createCount, 0);
});

test("different weeks produce different source keys", () => {
  const a = buildWeeklyThresholdSourceKey(ENR, WEEK, 100);
  const b = buildWeeklyThresholdSourceKey(ENR, "recWeekHistorical01", 100);
  assert.notStrictEqual(a, b);
});

test("legacy key risk notes are documented for Mike", () => {
  const notes = listWeeklyThresholdLegacyKeyRiskNotes();
  assert.ok(notes.length >= 3);
  assert.ok(notes.some((n) => n.includes("WEEKLY_THRESHOLD|")));
  assert.ok(notes.some((n) => n.includes("XP Source")));
});

test("035 automation script v1.1 implements semantic dedupe and inactive skip", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js"
  );
  assert.ok(fs.existsSync(scriptPath), "035 script missing");
  const body = fs.readFileSync(scriptPath, "utf8");
  assert.ok(body.includes('version: "v1.1"'));
  assert.ok(body.includes("WEEKLY_THRESHOLD|"));
  assert.ok(body.includes("createRecordAsync"));
  assert.ok(body.includes("Threshold XP Status"));
  assert.ok(body.includes("Weekly Threshold 100"));
  assert.ok(body.includes("America/Denver"));
  assert.ok(body.includes("async function main()"));
  assert.ok(body.includes("skipped_inactive_enrollment"));
  assert.ok(body.includes("existingXpSourceLabels"));
  assert.ok(body.includes("filterByFormula"));
  assert.ok(body.includes("getCheckboxTriState"));
  assert.ok(body.includes("resolveRuleForTier"));
  // Must not still do per-create full-table scans of Source Key only.
  assert.ok(!/selectRecordsAsync\(\{\s*fields:\s*\[CONFIG\.xp\.sourceKey\]\s*\}\)/.test(body));
});

test("035 script Source Key matches registry format", () => {
  const registryPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "docs",
    "next-wave",
    "automation-ownership",
    "xp-source-key-registry.json"
  );
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const entry = (registry.prefixes || registry.entries || registry.families || [])
    .find?.((e) => e.prefix === "WEEKLY_THRESHOLD|")
    || (Array.isArray(registry) ? registry.find((e) => e.prefix === "WEEKLY_THRESHOLD|") : null)
    || (() => {
      const list = registry.entries || registry.prefixes || registry.source_keys || [];
      return list.find((e) => e.prefix === "WEEKLY_THRESHOLD|");
    })();

  // Support either top-level array or { entries: [] } / similar.
  let weekly = entry;
  if (!weekly) {
    const blob = JSON.stringify(registry);
    assert.ok(blob.includes("WEEKLY_THRESHOLD|"), "registry missing WEEKLY_THRESHOLD");
    const parsed = typeof registry === "object" ? registry : {};
    const candidates = [];
    for (const value of Object.values(parsed)) {
      if (Array.isArray(value)) candidates.push(...value);
    }
    weekly = candidates.find((e) => e && e.prefix === "WEEKLY_THRESHOLD|");
  }
  assert.ok(weekly, "WEEKLY_THRESHOLD registry entry missing");
  assert.strictEqual(weekly.authoritative_writer, "035");
  assert.strictEqual(
    weekly.format,
    "WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}"
  );
  const minted = buildWeeklyThresholdSourceKey(ENR, WEEK, 125);
  assert.ok(/^WEEKLY_THRESHOLD\|rec.+\|rec.+\|125$/.test(minted));
  assert.strictEqual(minted.split("|").length, 4);
});

console.log("weekly-threshold-xp: all tests passed");
