#!/usr/bin/env node
/**
 * Offline contract tests for MRW-F07 weekly email positive-arm harness.
 *   node tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs
 */
import assert from "node:assert/strict";
import {
  HARNESS_ID,
  WETEST_PREFIX,
  DISPOSABLE_ENROLLMENT_IDS,
  buildWeeklyHandoffKey,
  buildDryRunPlan,
  evaluateChainSnapshot,
  evaluateOfflineContract,
} from "../lib/mrw-f07-weekly-email-lib.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("harness id and offline contract", () => {
  const contract = evaluateOfflineContract();
  assert.equal(contract.harness, HARNESS_ID);
  assert.match(contract.chain, /118 → 072 → 119 → 074 → 079/);
  assert.equal(contract.pass, true);
});

test("handoff key pattern", () => {
  assert.equal(
    buildWeeklyHandoffKey("recWasTest0001"),
    "WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|recWasTest0001",
  );
});

test("evaluateChainSnapshot — empty WAS", () => {
  const snap = evaluateChainSnapshot({}, "recWasTest0001", []);
  assert.equal(snap.furthestStage, 0);
  assert.equal(snap.passed, false);
  assert.equal(snap.stages.length, 5);
});

test("evaluateChainSnapshot — full chain", () => {
  const wasId = "recWasTest0001";
  const fields = {
    "Build Weekly Email Now?": true,
    "Weekly Email Ready?": true,
    "Weekly Email Subject": "Weekly summary",
    "Weekly Email Payload JSON": "{}",
    "Send to Make?": true,
  };
  const queue = [
    {
      fields: {
        "Handoff Key": buildWeeklyHandoffKey(wasId),
        Status: "Accepted",
      },
    },
  ];
  const snap = evaluateChainSnapshot(fields, wasId, queue);
  assert.equal(snap.passed, true);
  assert.equal(snap.furthestStage, 5);
});

test("buildDryRunPlan arms build then optional send", () => {
  const plan = buildDryRunPlan({ wasId: "recWasTest0001", armBuild: true, armSend: true });
  assert.equal(plan.actions.length, 2);
  assert.equal(plan.actions[0].step, "WE-01");
  assert.equal(plan.actions[1].step, "WE-03");
  assert.match(plan.actions[1].expectQueueKey, /recWasTest0001/);
});

test("disposable enrollment set includes Schmidt ids", () => {
  assert.ok(DISPOSABLE_ENROLLMENT_IDS.has("recCyFEPeATOVNlr9"));
  assert.ok(DISPOSABLE_ENROLLMENT_IDS.has("recgP9qZYjAhE7NXm"));
});

test("WETEST prefix documented", () => {
  assert.match(WETEST_PREFIX, /^WETEST\|/);
});

console.log(`\n${HARNESS_ID} contract tests passed.`);
