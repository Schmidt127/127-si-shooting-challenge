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
  assert.equal(ctx.weekDates[0], "2027-06-06");
  assert.equal(ctx.weekDates[6], "2027-06-12");
  assert.match(ctx.weekName, /^PWTEST\|/);
  assert.match(ctx.batchKey, /SC-PW-E2E\|qualifying$/);
});

test("nonqualifying-video uses distinct week anchor", () => {
  const ctx = buildRunContext("nonqualifying-video");
  assert.equal(ctx.weekDates[0], "2027-06-13");
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
  const enr = "recCyFEPeATOVNlr9";
  const week = "recWeekPwE2e001";
  assert.equal(buildPerfectWeekSourceKey(enr, week), `PERFECT_WEEK|${enr}|${week}`);
});

test("denverNoon uses America/Denver offset for August dates", () => {
  assert.equal(denverNoon("2027-06-06"), "2027-06-06T12:00:00.000-06:00");
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

console.log("\nSC-PW-E2E contract tests passed.");
