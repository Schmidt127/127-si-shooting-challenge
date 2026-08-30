#!/usr/bin/env node
/**
 * Offline contract tests for SC-WEEKLY-SETTLEMENT-E2E.
 *   node tools/testing/tests/test_sc_weekly_settlement_contract.mjs
 */
import assert from "node:assert/strict";
import {
  WSTEST_PREFIX,
  HARNESS_ID,
  CASE_NAMES,
  CASE_DEFS,
  GATED_ENROLLMENT_ID,
  buildCaseContext,
  buildDryRunPlan,
  buildMatrixDryRunPlan,
  evaluateOfflineExpectations,
  evaluateHandoffCompatibility,
  evaluateLevelGateStructuralContract,
  citePerfectWeekAwardEvidence,
  assertWstestLabel,
  buildPerfectWeekSourceKey,
  DOCUMENTED_GAPS,
  EXPECTED_PW_XP,
} from "../lib/sc-weekly-settlement-lib.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("ten cases defined", () => {
  assert.equal(CASE_NAMES.length, 10);
  assert.ok(CASE_DEFS["fully-successful"]);
  assert.ok(CASE_DEFS["inactive-enrollment"]);
  assert.ok(CASE_DEFS["backdated-submissions"]);
});

test("WSTEST prefix guard", () => {
  assert.throws(() => assertWstestLabel("Early Bird Week 1"), /Safety/);
  assert.equal(assertWstestLabel("WSTEST|x"), "WSTEST|x");
});

test("buildCaseContext uses Sunday-start week and WSTEST label", () => {
  const ctx = buildCaseContext("missing-shooting-day");
  assert.equal(ctx.weekDates.length, 7);
  assert.equal(ctx.activityDates.length, 6);
  assert.match(ctx.weekName, new RegExp(`^${WSTEST_PREFIX}`));
  assert.equal(ctx.def.id, "WS-02");
});

test("fully-successful uses gated enrollment and seven days", () => {
  const ctx = buildCaseContext("fully-successful");
  assert.equal(ctx.enrollmentMode, "gated");
  assert.equal(ctx.activityDates.length, 7);
  assert.equal(ctx.gatedEnrollmentId, GATED_ENROLLMENT_ID);
});

test("inactive enrollment uses disposable-inactive mode", () => {
  const ctx = buildCaseContext("inactive-enrollment");
  assert.equal(ctx.enrollmentMode, "disposable-inactive");
  assert.equal(ctx.def.expect.emailSkippedInactive, true);
});

test("dry-run plan never implies send", () => {
  const plan = buildDryRunPlan("no-videos");
  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.safety.noEmailSend, true);
  assert.equal(plan.safety.noResendMakeGmail, true);
  assert.equal(plan.expect.pwUnlock, false);
  assert.equal(plan.videos, 0);
});

test("matrix dry-run cites closed Perfect Week award", () => {
  const matrix = buildMatrixDryRunPlan();
  assert.equal(matrix.harness, HARNESS_ID);
  assert.equal(matrix.cases.length, 10);
  assert.equal(matrix.perfectWeekAwardEvidence.wasId, "recl3DmBh22ADPWWe");
  assert.equal(matrix.perfectWeekAwardEvidence.xp, 100);
});

test("offline expectations pass for all cases", () => {
  for (const name of CASE_NAMES) {
    const result = evaluateOfflineExpectations(name);
    assert.equal(result.passed, true, name);
  }
});

test("fail-closed cases never expect unlock", () => {
  for (const name of CASE_NAMES) {
    const def = CASE_DEFS[name];
    if (def.expect.failClosed) {
      assert.equal(def.expect.pwUnlock, false, name);
      assert.equal(def.expect.pwEligible, false, name);
    }
  }
});

test("Milestone Source Key contract", () => {
  assert.equal(
    buildPerfectWeekSourceKey("recEnr", "recWeek"),
    "PERFECT_WEEK|recEnr|recWeek"
  );
  assert.equal(EXPECTED_PW_XP, 100);
});

test("handoff compatibility is prep-only", () => {
  const handoff = evaluateHandoffCompatibility();
  assert.equal(handoff.noSend, true);
  assert.ok(handoff.requiredWasPackageFields.includes("Weekly Email Payload JSON"));
  assert.ok(handoff.requiredQueueFields.includes("Handoff Key"));
  assert.equal(handoff.templateKeys.weekly, "WEEKLY_ATHLETE_SUMMARY");
  assert.equal(handoff.pass, true);
});

test("level gate structural contract lists threshold + PW + milestones", () => {
  const levels = evaluateLevelGateStructuralContract();
  assert.equal(levels.pass, true);
  assert.ok(levels.contracts.some((c) => /WEEKLY_THRESHOLD/.test(c.pattern || "")));
  assert.ok(levels.contracts.some((c) => c.unlockField === "Milestone Source Key"));
});

test("documented gaps cover coach queue naming drift", () => {
  assert.ok(DOCUMENTED_GAPS.some((g) => g.id === "GAP-COACH-SUMMARY-QUEUE"));
  assert.ok(DOCUMENTED_GAPS.some((g) => g.id === "GAP-GRADE-SUBMITTED"));
  assert.ok(DOCUMENTED_GAPS.every((g) => g.classification === "Documentation drift"));
});

test("cited Perfect Week award evidence is complete", () => {
  const cite = citePerfectWeekAwardEvidence();
  assert.equal(cite.passed, true);
  assert.equal(cite.unlockId, "recJ5umer4J4FHTOz");
  assert.equal(cite.xpPoints, 100);
  assert.match(cite.milestoneSourceKey, /^PERFECT_WEEK\|/);
});

test("zoom missing vs none expectations differ", () => {
  assert.equal(CASE_DEFS["zoom-required-not-completed"].expect.zoomMet, false);
  assert.equal(CASE_DEFS["no-zoom-meeting"].expect.pwEligible, true);
  assert.equal(CASE_DEFS["fewer-than-three-videos"].expect.videoCount, 2);
});

console.log("PASS test_sc_weekly_settlement_contract.mjs");
