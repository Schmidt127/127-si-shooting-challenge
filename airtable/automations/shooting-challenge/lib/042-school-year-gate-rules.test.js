#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  selectYearAwareGateRules,
} = require("./v2-engine-contracts");

const LEVEL_ID = "recLevel000000001";
const RULE_2025 = {
  id: "recGate2025",
  name: "Level 1 Gate — 2025-2026",
  levelId: LEVEL_ID,
  schoolYear: "2025-2026",
};
const RULE_2026 = {
  id: "recGate2026",
  name: "Level 1 Gate — 2026-2027",
  levelId: LEVEL_ID,
  schoolYear: "2026-2027",
};

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("selects the same-year rule for a 2026-2027 enrollment", () => {
  const selected = selectYearAwareGateRules([RULE_2025, RULE_2026], "2026–2027");
  assert.strictEqual(selected.get(LEVEL_ID).id, RULE_2026.id);
});

test("does not silently use a prior-year-only rule", () => {
  assert.throws(
    () => selectYearAwareGateRules([RULE_2025], "2026-2027"),
    /No active gate rule/
  );
});

test("uses an explicit shared rule when no exact-year rule exists", () => {
  const shared = { ...RULE_2025, id: "recGateShared", schoolYear: "Shared" };
  const selected = selectYearAwareGateRules([shared], "2026-2027");
  assert.strictEqual(selected.get(LEVEL_ID).id, shared.id);
});

test("fails closed on duplicate same-year rules", () => {
  assert.throws(
    () => selectYearAwareGateRules([
      RULE_2026,
      { ...RULE_2026, id: "recGate2026Duplicate" },
    ], "2026-2027"),
    /Multiple active gate rules/
  );
});

test("ignores an inactive same-year rule", () => {
  const inactive = { ...RULE_2026, id: "recGateInactive", active: false };
  const shared = { ...RULE_2025, id: "recGateShared", schoolYear: "Default" };
  const selected = selectYearAwareGateRules([shared, inactive], "2026-2027");
  assert.strictEqual(selected.get(LEVEL_ID).id, shared.id);
});

test("replay returns the same selected record without link churn", () => {
  const rules = [RULE_2025, RULE_2026];
  const first = selectYearAwareGateRules(rules, "2026-2027");
  const replay = selectYearAwareGateRules(rules, "2026-2027");
  assert.strictEqual(first.get(LEVEL_ID).id, replay.get(LEVEL_ID).id);
  assert.deepStrictEqual([...first.keys()], [...replay.keys()]);
});

console.log("042-school-year-gate-rules: all tests passed");
