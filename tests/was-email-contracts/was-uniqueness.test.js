#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  normalizeSummaryKey,
  buildWasIdentity,
  selectExistingWas,
  detectWasDuplicates,
  decideWasCreateOrLink,
  simulateConcurrentEnsure,
  denverDateKey,
  resolveEmptyWeekEmailPolicy,
} = require("../../lib/was-email-contracts");

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
const WEEK2 = "recWeek0000000002";
const KEY = "ATH-recAthlete0001|2025-2026|recWeek0000000001";

test("normalize Summary Key", () => {
  assert.strictEqual(
    normalizeSummaryKey({
      enrollmentKey: "ATH-recAthlete0001|2025-2026",
      weekKey: "recWeek0000000001",
    }),
    KEY
  );
  assert.strictEqual(normalizeSummaryKey({ enrollmentKey: "", weekKey: WEEK }), "");
});

test("build identity", () => {
  const id = buildWasIdentity({ enrollmentId: ENR, weekId: WEEK });
  assert.strictEqual(id.identityKey, `WAS|${ENR}|${WEEK}`);
});

test("no existing WAS → create in ensure mode", () => {
  const selection = selectExistingWas({
    rows: [],
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(selection.action, "none");
  assert.strictEqual(
    decideWasCreateOrLink({ mode: "ensure", selection }).action,
    "create"
  );
});

test("one WAS → link", () => {
  const selection = selectExistingWas({
    rows: [{ id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY }],
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  const d = decideWasCreateOrLink({ mode: "ensure", selection });
  assert.strictEqual(d.action, "link_existing");
  assert.strictEqual(d.wasId, "recWAS00000000001");
});

test("duplicate WAS → deterministic lowest id winner", () => {
  const selection = selectExistingWas({
    rows: [
      { id: "recWAS00000000002", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY },
      { id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY },
    ],
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(selection.winnerId, "recWAS00000000001");
  assert.strictEqual(detectWasDuplicates(selection.matches, { enrollmentId: ENR, weekId: WEEK }).isDuplicate, true);
});

test("simultaneous creator inputs race risk", () => {
  const sim = simulateConcurrentEnsure([
    { rows: [], enrollmentId: ENR, weekId: WEEK, expectedSummaryKey: KEY },
    { rows: [], enrollmentId: ENR, weekId: WEEK, expectedSummaryKey: KEY },
  ]);
  assert.strictEqual(sim.raceRisk, true);
});

test("retry after one create links existing", () => {
  const after = selectExistingWas({
    rows: [{ id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY }],
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(decideWasCreateOrLink({ mode: "ensure", selection: after }).action, "link_existing");
});

test("wrong Week does not match", () => {
  const selection = selectExistingWas({
    rows: [{ id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY }],
    enrollmentId: ENR,
    weekId: WEEK2,
    expectedSummaryKey: "other",
  });
  assert.strictEqual(selection.action, "none");
});

test("wrong Enrollment does not match", () => {
  const selection = selectExistingWas({
    rows: [{ id: "recWAS00000000001", enrollmentId: ENR, weekId: WEEK, summaryKey: KEY }],
    enrollmentId: "recEnrollment0002",
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(selection.action, "none");
});

test("blank key / blank ids error or empty", () => {
  assert.strictEqual(normalizeSummaryKey({}), "");
  const selection = selectExistingWas({ rows: [], enrollmentId: "", weekId: WEEK });
  assert.strictEqual(selection.action, "error");
});

test("Denver week boundary End DateTime", () => {
  // Sat 23:59 Denver = Sun 05:59 UTC → Saturday key
  assert.strictEqual(denverDateKey("2026-06-07T05:59:00.000Z"), "2026-06-06");
});

test("link_only skips create", () => {
  const selection = selectExistingWas({
    rows: [],
    enrollmentId: ENR,
    weekId: WEEK,
    expectedSummaryKey: KEY,
  });
  assert.strictEqual(
    decideWasCreateOrLink({ mode: "link_only", selection }).action,
    "skip_missing"
  );
});

test("empty week policy hook defaults", () => {
  const p = resolveEmptyWeekEmailPolicy("suppress");
  assert.strictEqual(p.policy, "suppress");
  assert.strictEqual(p.enforced, false);
});

console.log("was-uniqueness tests passed");
