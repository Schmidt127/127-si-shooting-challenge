#!/usr/bin/env node
/**
 * Offline contracts for Automation 005 v4.1 Program Instance Week scoping.
 * Usage: node tools/testing/test_005_program_instance_week_scope.mjs
 */
import assert from "node:assert/strict";
import {
  matchWeekByActivityDateScoped,
  resolveWeekHomeworkFirst,
} from "./lib/005_week_match.js";

const PI_2027 = "rec5mEM0YPqPqq0hZ";
const PI_OTHER = "recOtherProgramInstanceXX";

const EARLY_BIRD = {
  id: "recWeVrSabnsYaHc2",
  weekName: "Early Bird",
  startKey: "2026-08-02",
  endKey: "2026-08-08",
  isActive: true,
  programInstanceId: PI_2027,
};

const PWTEST = {
  id: "recPwTestWeekOverlapping",
  weekName: "PWTEST|2026-08-05|CASE-01|WEEK",
  startKey: "2026-08-02",
  endKey: "2026-08-08",
  isActive: true,
  programInstanceId: PI_OTHER,
};

const SAME_PI_OVERLAP_A = {
  id: "recSamePiWeekA",
  weekName: "Overlap A",
  startKey: "2026-08-02",
  endKey: "2026-08-08",
  isActive: true,
  programInstanceId: PI_2027,
};

const SAME_PI_OVERLAP_B = {
  id: "recSamePiWeekB",
  weekName: "Overlap B",
  startKey: "2026-08-02",
  endKey: "2026-08-08",
  isActive: true,
  programInstanceId: PI_2027,
};

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

test("Test 1 shape — live overlapping dates pick Early Bird only", () => {
  const result = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [EARLY_BIRD, PWTEST],
  });
  assert.equal(result.status, "match");
  assert.equal(result.week.id, EARLY_BIRD.id);
  assert.equal(result.week.weekName, "Early Bird");
  assert.equal(result.excludedOtherProgramInstanceCount, 1);
  assert.equal(result.candidates.length, 1);
});

test("Test 2 — Homework Name 1 wins; Activity Date fallback not used", () => {
  const result = resolveWeekHomeworkFirst({
    homework1WeekId: "recHomeworkWeek1",
    homework2WeekId: "recHomeworkWeek2",
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [EARLY_BIRD, PWTEST],
  });
  assert.equal(result.sourceUsed, "Homework Name 1");
  assert.equal(result.weekId, "recHomeworkWeek1");
  assert.equal(result.fallback, null);
});

test("Test 2b — Homework Name 2 used when Name 1 empty", () => {
  const result = resolveWeekHomeworkFirst({
    homework1WeekId: null,
    homework2WeekId: "recHomeworkWeek2",
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [EARLY_BIRD, PWTEST],
  });
  assert.equal(result.sourceUsed, "Homework Name 2");
  assert.equal(result.weekId, "recHomeworkWeek2");
});

test("Test 3 — Wrong-year / other Program Instance overlapping Week excluded", () => {
  const result = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [PWTEST, EARLY_BIRD],
  });
  assert.equal(result.status, "match");
  assert.equal(result.week.id, EARLY_BIRD.id);
  assert.ok(!result.candidates.some((c) => c.id === PWTEST.id));
});

test("Test 4 — Same Program Instance overlap → overlap status (no guess)", () => {
  const result = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [SAME_PI_OVERLAP_A, SAME_PI_OVERLAP_B, PWTEST],
  });
  assert.equal(result.status, "overlap");
  assert.equal(result.candidates.length, 2);
  assert.ok(!result.week);
});

test("Test 5 shape — missing Program Instance → missing_program_instance", () => {
  const result = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: "",
    weeks: [EARLY_BIRD],
  });
  assert.equal(result.status, "missing_program_instance");
});

test("Test 6 shape — no Week in Program Instance for date → none", () => {
  const result = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [PWTEST],
  });
  assert.equal(result.status, "none");
  assert.equal(result.excludedOtherProgramInstanceCount, 1);
});

test("Test 7 — idempotent match returns same Early Bird on repeat", () => {
  const first = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [EARLY_BIRD, PWTEST],
  });
  const second = matchWeekByActivityDateScoped({
    activityDateKey: "2026-08-05",
    submissionProgramInstanceId: PI_2027,
    weeks: [EARLY_BIRD, PWTEST],
  });
  assert.equal(first.week.id, second.week.id);
  assert.equal(first.week.id, "recWeVrSabnsYaHc2");
});

console.log(`\n${passed} offline 005 Program Instance scope tests passed.`);
