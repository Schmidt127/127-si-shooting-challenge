#!/usr/bin/env node
/**
 * Overnight Agent 2 (2026-07-24) — XP Reward Rule selection, Grade Band
 * normalization, and Achievement Unlock integrity helpers.
 * Run: node airtable/automations/shooting-challenge/lib/overnight-xp-rules-and-unlocks.test.js
 */

"use strict";

const assert = require("assert");
const {
  selectActiveXpRewardRule,
  normalizeGradeBandLabel,
  gradeBandsMatch,
  auditAchievementUnlockIntegrity,
  buildShotMilestoneSourceKey,
  buildPerfectWeekSourceKey,
  buildStreakXpSourceKey,
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

const RULES = [
  { id: "recRuleShoot", ruleKey: "SHOOTING_BASE", xpAmount: 20, active: true },
  { id: "recRuleHw", ruleKey: "HOMEWORK_COMPLETION", xpAmount: 35, active: true },
  { id: "recRuleVideo", ruleKey: "VIDEO_SUBMISSION", xpAmount: 25, active: true },
  { id: "recRulePw", ruleKey: "PERFECT_WEEK", xpAmount: 100, active: true },
  { id: "recRuleStreak3", ruleKey: "STREAK_3DAY", xpAmount: 10, active: true },
  { id: "recRuleInactive", ruleKey: "SHOOTING_BASE", xpAmount: 999, active: false },
  { id: "recRuleZero", ruleKey: "MANUAL_BONUS", xpAmount: 0, active: true },
];

test("rule found: SHOOTING_BASE returns 20", () => {
  const result = selectActiveXpRewardRule(RULES, ["SHOOTING_BASE"]);
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.rule.xpAmount, 20);
  assert.strictEqual(result.rule.id, "recRuleShoot");
});

test("missing rule: status missing", () => {
  const result = selectActiveXpRewardRule(RULES, ["DOES_NOT_EXIST"]);
  assert.strictEqual(result.status, "missing");
  assert.strictEqual(result.rule, null);
});

test("inactive rule ignored when searching SHOOTING_BASE", () => {
  const result = selectActiveXpRewardRule(RULES, ["SHOOTING_BASE"]);
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.rule.id, "recRuleShoot");
});

test("duplicate active rules: status duplicate", () => {
  const dupes = [
    { id: "a", ruleKey: "STREAK_3DAY", xpAmount: 10, active: true },
    { id: "b", ruleKey: "STREAK_3DAY", xpAmount: 15, active: true },
  ];
  const result = selectActiveXpRewardRule(dupes, ["STREAK_3DAY"]);
  assert.strictEqual(result.status, "duplicate");
  assert.strictEqual(result.matches.length, 2);
  assert.strictEqual(result.rule, null);
});

test("Grade Band mismatch: weekly-threshold style key not matched by wrong key", () => {
  const bandRules = [
    { id: "k2", ruleKey: "WEEKLY_THRESHOLD_100_K2", xpAmount: 10, active: true },
    { id: "b34", ruleKey: "WEEKLY_THRESHOLD_100_34", xpAmount: 10, active: true },
  ];
  const result = selectActiveXpRewardRule(bandRules, ["WEEKLY_THRESHOLD_100_K2"]);
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.rule.id, "k2");
  assert.strictEqual(selectActiveXpRewardRule(bandRules, ["WEEKLY_THRESHOLD_100_56"]).status, "missing");
});

test("zero XP rule is still selectable (caller decides validity)", () => {
  const result = selectActiveXpRewardRule(RULES, ["MANUAL_BONUS"]);
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.rule.xpAmount, 0);
});

test("fallback behavior: preferred key then fallback key", () => {
  const result = selectActiveXpRewardRule(RULES, ["STREAK_CUSTOM", "STREAK_3DAY"]);
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.rule.ruleKey, "STREAK_3DAY");
});

test("normalizeGradeBandLabel collapses dashes and Grades prefix", () => {
  assert.strictEqual(normalizeGradeBandLabel("K-2"), "K-2");
  assert.strictEqual(normalizeGradeBandLabel("Grades 1–2"), "1-2");
  assert.strictEqual(normalizeGradeBandLabel("  9—12 "), "9-12");
});

test("gradeBandsMatch prefers linked IDs over labels", () => {
  assert.strictEqual(
    gradeBandsMatch({
      enrollmentBandIds: ["recK2"],
      milestoneBandIds: ["recK2"],
      enrollmentLabel: "WRONG",
      milestoneLabel: "ALSO_WRONG",
    }),
    true
  );
  assert.strictEqual(
    gradeBandsMatch({
      enrollmentBandIds: ["recK2"],
      milestoneBandIds: ["rec34"],
      enrollmentLabel: "K-2",
      milestoneLabel: "K-2",
    }),
    false
  );
});

test("gradeBandsMatch falls back to normalized labels when IDs missing", () => {
  assert.strictEqual(
    gradeBandsMatch({
      enrollmentBandIds: [],
      milestoneBandIds: [],
      enrollmentLabel: "K-2",
      milestoneLabel: "K-2",
    }),
    true
  );
  assert.strictEqual(
    gradeBandsMatch({
      enrollmentBandIds: [],
      milestoneBandIds: [],
      enrollmentLabel: "K-2",
      milestoneLabel: "3-4",
    }),
    false
  );
});

test("achievement unlock keys are deterministic", () => {
  assert.strictEqual(
    buildShotMilestoneSourceKey("recEnrollment0001", "recMilestone00001"),
    "SHOT_MILESTONE|recEnrollment0001|recMilestone00001"
  );
  assert.strictEqual(
    buildPerfectWeekSourceKey("recEnrollment0001", "recWeek0000000001"),
    "PERFECT_WEEK|recEnrollment0001|recWeek0000000001"
  );
  assert.strictEqual(
    buildStreakXpSourceKey("recEnrollment0001", "recAchStreak3Day1", "2026-07-10"),
    "STREAK_XP|recEnrollment0001|recAchStreak3Day1|2026-07-10"
  );
});

test("unlock integrity: blank key and duplicate key findings", () => {
  const report = auditAchievementUnlockIntegrity([
    { id: "u1", unlockKey: "", sourceKey: "", enrollmentId: "recE1", awardStatus: "Pending", xpEventIds: [] },
    { id: "u2", unlockKey: "SHOT_MILESTONE|recE1|recM1", enrollmentId: "recE1", awardStatus: "Awarded", xpEventIds: [] },
    { id: "u3", unlockKey: "SHOT_MILESTONE|recE1|recM1", enrollmentId: "recE1", awardStatus: "Awarded", xpEventIds: ["recXp1"] },
    { id: "u4", unlockKey: "PERFECT_WEEK|recE1|recW1", enrollmentId: "", awardStatus: "Pending", xpEventIds: [] },
  ]);
  const codes = report.findings.map((f) => f.code).sort();
  assert.ok(codes.includes("blank_unlock_key"));
  assert.ok(codes.includes("duplicate_unlock_key"));
  assert.ok(codes.includes("unlock_without_xp"));
  assert.ok(codes.includes("missing_enrollment"));
});

test("unlock integrity: clean unlock set has zero findings", () => {
  const report = auditAchievementUnlockIntegrity([
    {
      id: "u1",
      unlockKey: "SHOT_MILESTONE|recEnrollment0001|recMilestone00001",
      enrollmentId: "recEnrollment0001",
      awardStatus: "Awarded",
      xpEventIds: ["recXpEvent000001"],
    },
  ]);
  assert.strictEqual(report.findingCount, 0);
});

test("XP dedupe: rerun after unlock is skip_existing", () => {
  const key = buildShotMilestoneSourceKey("recEnrollment0001", "recMilestone00001");
  const first = decideXpEventAction({ sourceKey: key, existingKeys: [] });
  assert.strictEqual(first.action, "create");
  const rerun = decideXpEventAction({ sourceKey: key, existingKeys: [key] });
  assert.strictEqual(rerun.action, "skip_existing");
});

console.log("overnight-xp-rules-and-unlocks: all tests passed.");
