#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  planXpReconciliation,
  planBatch,
} = require("../../lib/reliability-command-center/xp-reconciliation-plan");
const {
  parseRecordIds,
} = require("../../tools/reliability-command-center/xp-reconcile-live");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const XP = "rec10000000000001";
const XP2 = "rec10000000000002";
const ENR = "rec20000000000001";

function xp(id = XP, fields = {}) {
  return {
    id,
    fields: {
      "Active?": true,
      Enrollment: [ENR],
      "Source Key": "HOMEWORK_XP|rec30000000000001",
      ...fields,
    },
  };
}

function issue(code, id = XP, enrollmentRecordId = ENR) {
  return { code, sourceRecordId: id, enrollmentRecordId };
}

test("active blank-Enrollment orphan plans permanent delete only", () => {
  const row = xp(XP, { Enrollment: [], "Source Key": "SUBMISSION_XP|rec30000000000001" });
  const plan = planXpReconciliation({
    xpRecord: row,
    issues: [issue("xp_active_orphan_blank_enrollment", XP, "")],
  });
  assert.strictEqual(plan.status, "DELETE_ORPHAN");
  assert.strictEqual(plan.destructive, true);
  assert.strictEqual(plan.confirmDestructiveRequired, true);
  assert.strictEqual(plan.actions.length, 1);
  assert.strictEqual(plan.actions[0].type, "DELETE_RECORD");
  assert.strictEqual(plan.actions[0].table, "XP Events");
});

test("missing source retires XP and queues 042 recalculation only", () => {
  const plan = planXpReconciliation({
    xpRecord: xp(),
    issues: [issue("xp_authoritative_source_missing")],
  });
  assert.strictEqual(plan.status, "RETIRE_AND_RECALC");
  assert.strictEqual(plan.actions.length, 2);
  assert.deepStrictEqual(plan.actions[0].fields, { "Active?": false });
  assert.deepStrictEqual(plan.actions[1].fields, { "Level Recalc Needed?": true });
  assert.strictEqual(plan.actions[1].table, "Enrollments");
  assert.ok(!JSON.stringify(plan.actions).includes("Current Level"));
  assert.ok(!JSON.stringify(plan.actions).includes("Next Level"));
});

test("moved source owner retires current XP instead of moving or stealing it", () => {
  const plan = planXpReconciliation({
    xpRecord: xp(),
    issues: [issue("xp_source_enrollment_mismatch")],
  });
  assert.strictEqual(plan.status, "RETIRE_AND_RECALC");
  assert.deepStrictEqual(plan.actions[0].fields, { "Active?": false });
  assert.strictEqual(plan.actions.some((a) => a.fields && Object.prototype.hasOwnProperty.call(a.fields, "Enrollment")), false);
});

test("ambiguous authority refuses whole target", () => {
  const plan = planXpReconciliation({
    xpRecord: xp(),
    issues: [issue("xp_authoritative_source_ambiguous")],
  });
  assert.strictEqual(plan.status, "REFUSE_MANUAL_REVIEW");
  assert.strictEqual(plan.actions.length, 0);
});

test("unaudited Manual Bonus refuses automatic mutation", () => {
  const plan = planXpReconciliation({
    xpRecord: xp(),
    issues: [issue("manual_bonus_missing_audit_ownership")],
  });
  assert.strictEqual(plan.status, "REFUSE_MANUAL_REVIEW");
  assert.strictEqual(plan.actions.length, 0);
});

test("inactive XP is an idempotent no-op", () => {
  const plan = planXpReconciliation({
    xpRecord: xp(XP, { "Active?": false }),
    issues: [issue("xp_authoritative_source_missing")],
  });
  assert.strictEqual(plan.status, "NOOP_ALREADY_INACTIVE");
  assert.strictEqual(plan.actions.length, 0);
});

test("healthy active XP is an idempotent no-op", () => {
  const first = planXpReconciliation({ xpRecord: xp(), issues: [] });
  const second = planXpReconciliation({ xpRecord: xp(), issues: [] });
  assert.strictEqual(first.status, "NOOP_HEALTHY");
  assert.deepStrictEqual(first, second);
});

test("batch refuses execute if any target is ambiguous", () => {
  const batch = planBatch({
    xpRecords: [xp(XP), xp(XP2)],
    issues: [
      issue("xp_authoritative_source_missing", XP),
      issue("xp_authoritative_source_ambiguous", XP2),
    ],
  });
  assert.strictEqual(batch.executeAllowed, false);
  assert.strictEqual(batch.retireCount, 1);
  assert.strictEqual(batch.refusedCount, 1);
});

test("explicit record-id parser refuses wildcard and malformed values", () => {
  assert.throws(() => parseRecordIds("*"));
  assert.throws(() => parseRecordIds("all"));
  assert.throws(() => parseRecordIds("not-a-record"));
  assert.deepStrictEqual(parseRecordIds(`${XP},${XP}`), [XP]);
});

console.log("xp-reconciliation-plan.test.js passed");
