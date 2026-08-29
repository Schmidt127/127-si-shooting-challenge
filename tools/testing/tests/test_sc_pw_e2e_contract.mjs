#!/usr/bin/env node
/**
 * SC-PW-E2E contract tests — fixture safety, assertions, dry-run guards (offline).
 *
 *   node tools/testing/tests/test_sc_pw_e2e_contract.mjs
 */
import assert from "node:assert/strict";
import {
  PWTEST_PREFIX,
  buildRunContext,
  buildDryRunPlan,
  assertPwtestLabel,
  denverNoon,
  evaluateWasExpectations,
  buildPerfectWeekSourceKey,
  GATED_ENROLLMENT_ID,
  evaluateWasVideoRequirementMet,
  EXPECTED_XP_AMOUNT,
  resolveUnlockSourceKeyField,
  resolveUnlockNotesField,
  classify058Outcome,
  classify059Outcome,
  inferFailurePoint,
  TABLES,
} from "../lib/sc-pw-e2e-lib.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("PWTEST prefix guard rejects operational labels", () => {
  assert.throws(() => assertPwtestLabel("Early Bird Week 1"), /Safety/);
  assert.equal(assertPwtestLabel("PWTEST|2026-08-27|qualifying|WEEK"), "PWTEST|2026-08-27|qualifying|WEEK");
});

test("buildRunContext uses gated enrollment and seven Sunday-start dates", () => {
  const ctx = buildRunContext("qualifying");
  assert.equal(ctx.enrollmentId, GATED_ENROLLMENT_ID);
  assert.equal(ctx.weekDates.length, 7);
  assert.equal(ctx.weekDates[0], "2026-07-27");
  assert.equal(ctx.weekDates[6], "2026-08-02");
  assert.match(ctx.weekName, /^PWTEST\|/);
  assert.match(ctx.batchKey, /SC-PW-E2E\|qualifying$/);
});

test("nonqualifying-video uses distinct week anchor", () => {
  const ctx = buildRunContext("nonqualifying-video");
  assert.equal(ctx.weekDates[0], "2026-07-13");
});

test("dry-run plan does not imply apply", () => {
  const ctx = buildRunContext("qualifying");
  const plan = buildDryRunPlan(ctx, { videoCount: 3 });
  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.submissionCount, 7);
  assert.equal(plan.videoCount, 3);
  assert.equal(plan.safety.noFormulaWrites, true);
  assert.equal(plan.safety.gatedEnrollmentOnly, GATED_ENROLLMENT_ID);
});

test("source key matches 058/059 contract", () => {
  const enr = GATED_ENROLLMENT_ID;
  const week = "recWeekPwE2e001";
  assert.equal(enr, "rec93mAfo5jKqP3g5");
  assert.equal(buildPerfectWeekSourceKey(enr, week), `PERFECT_WEEK|${enr}|${week}`);
});

test("denverNoon uses America/Denver offset for August dates", () => {
  assert.equal(denverNoon("2026-07-06"), "2026-07-06T12:00:00.000-06:00");
});

test("evaluateWasExpectations — qualifying path", () => {
  const was = {
    daysLogged: 7,
    dailyMet: true,
    videoCount: 3,
    videoMet: 1,
    homeworkMet: 1,
    zoomMet: 1,
    eligible: 1,
  };
  const checks = evaluateWasExpectations(was, {
    distinctDates: 7,
    dailyMet: true,
    videoCount: 3,
    videoMet: 1,
    homeworkMet: 1,
    zoomMet: 1,
    eligible: 1,
  });
  assert.ok(checks.every((c) => c.pass));
});

test("evaluateWasExpectations — nonqualifying video (2 videos)", () => {
  const was = { videoCount: 2, videoMet: 0, eligible: 0, daysLogged: 7, dailyMet: true };
  const checks = evaluateWasExpectations(was, { videoCount: 2, videoMet: 0, eligible: 0 });
  assert.ok(checks.every((c) => c.pass));
  assert.equal(evaluateWasVideoRequirementMet(2, 3), 0);
  assert.equal(evaluateWasVideoRequirementMet(3, 3), 1);
});

test("expected XP amount constant is 100", () => {
  assert.equal(EXPECTED_XP_AMOUNT, 100);
});

test("resolveUnlockSourceKeyField prefers Source Key then Milestone Source Key", () => {
  const withSourceKey = new Map([
    [TABLES.unlocks, { fields: new Set(["Source Key", "Milestone Source Key"]) }],
  ]);
  const milestoneOnly = new Map([
    [TABLES.unlocks, { fields: new Set(["Milestone Source Key"]) }],
  ]);
  assert.equal(resolveUnlockSourceKeyField(withSourceKey), "Source Key");
  assert.equal(resolveUnlockSourceKeyField(milestoneOnly), "Milestone Source Key");
  assert.equal(resolveUnlockSourceKeyField(new Map()), null);
});

test("resolveUnlockNotesField prefers Notes then Coach Note", () => {
  const withNotes = new Map([[TABLES.unlocks, { fields: new Set(["Notes", "Coach Note"]) }]]);
  const coachOnly = new Map([[TABLES.unlocks, { fields: new Set(["Coach Note"]) }]]);
  assert.equal(resolveUnlockNotesField(withNotes), "Notes");
  assert.equal(resolveUnlockNotesField(coachOnly), "Coach Note");
});

test("classify058Outcome — never ran vs ran failed vs skipped vs unlock created", () => {
  const sourceKey = "PERFECT_WEEK|recEnroll|recWeek";
  const wasEligible = {
    eligible: 1,
    automationStatus: "Ready",
    automationError: "",
    unlockIds: [],
  };
  assert.equal(
    classify058Outcome(wasEligible, [], { expectUnlock: true }).outcome,
    "058_never_ran"
  );

  assert.equal(
    classify058Outcome(
      { ...wasEligible, automationError: "058 error: missing Source Key field." },
      []
    ).outcome,
    "058_ran_failed"
  );

  assert.equal(
    classify058Outcome(
      { ...wasEligible, automationError: "058 skipped: Enrollment is inactive." },
      []
    ).outcome,
    "058_ran_skipped"
  );

  const unlocks = [
    {
      id: "recUnlock001",
      fields: {
        "Active?": true,
        "Milestone Source Key": sourceKey,
        "XP Award Status": "Pending",
      },
    },
  ];
  const linked = classify058Outcome(
    { ...wasEligible, unlockIds: ["recUnlock001"] },
    unlocks,
    { unlockSourceField: "Milestone Source Key", sourceKey }
  );
  assert.equal(linked.outcome, "058_created_unlock");
  assert.equal(linked.sourceKeyMatch, true);

  const unlinked = classify058Outcome(wasEligible, unlocks, {
    unlockSourceField: "Milestone Source Key",
    sourceKey,
  });
  assert.equal(unlinked.outcome, "058_created_unlock_unlinked");
});

test("classify059Outcome — never ran vs zero xp vs created", () => {
  const sourceKey = "PERFECT_WEEK|recEnroll|recWeek";
  const pendingUnlock = {
    id: "recUnlock001",
    fields: { "XP Award Status": "Pending", "Shot Milestone": [] },
  };
  assert.equal(
    classify059Outcome(pendingUnlock, [], { expectXp: true }).outcome,
    "059_never_ran"
  );

  assert.equal(
    classify059Outcome(
      { id: "recUnlock001", fields: { "XP Award Status": "Awarded", "Shot Milestone": [] } },
      [],
      { expectXp: true }
    ).outcome,
    "059_ran_zero_xp"
  );

  const xpRows = [
    {
      id: "recXp001",
      fields: { "Source Key": sourceKey, "XP Points": 100 },
    },
  ];
  const created = classify059Outcome(
    { id: "recUnlock001", fields: { "XP Award Status": "Awarded", "Shot Milestone": [] } },
    xpRows,
    { sourceKey }
  );
  assert.equal(created.outcome, "059_created_xp");
  assert.equal(created.sourceKeyMatch, true);
});

test("inferFailurePoint uses timeout stage not preflight", () => {
  const err = new Error("Timeout at stage 058-unlock after 600000ms");
  err.stage = "058-unlock";
  err.diagnostic = { outcome: "058_never_ran" };
  assert.equal(inferFailurePoint(err, { preflight: { passed: true } }), "058-unlock");
});

console.log("\nSC-PW-E2E contract tests passed.");
