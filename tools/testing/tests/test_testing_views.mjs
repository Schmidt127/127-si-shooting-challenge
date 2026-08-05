/**
 * Offline tests for SC-003 testing-view name matching.
 * Run: node --test tools/testing/tests/test_testing_views.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findMatchingView,
  countRequiredViews,
  normalizeName,
} from "../lib/testing_views.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = JSON.parse(
  readFileSync(resolve(HERE, "../../../docs/testing/views/TESTING-VIEWS-SPEC.json"), "utf8")
);

function views(...names) {
  return names.map((name, i) => ({ id: `viw${i}`, name }));
}

function specFor(table) {
  return SPEC.views.find((v) => v.table === table && !v.optional);
}

test("required count remains 10", () => {
  assert.equal(countRequiredViews(SPEC), 10);
});

test("optional views do not affect the required count", () => {
  const optional = SPEC.views.filter((v) => v.optional);
  assert.ok(optional.length >= 1);
  assert.equal(countRequiredViews(SPEC), SPEC.views.length - optional.length);
  assert.equal(countRequiredViews(SPEC), 10);
});

test("canonical names pass", () => {
  const s = specFor("XP Events");
  const { match, match_kind } = findMatchingView(views(s.view_name, "Grid view"), s);
  assert.equal(match_kind, "canonical");
  assert.equal(match.name, s.view_name);
});

test("short PROD aliases pass (exact live names)", () => {
  const cases = [
    ["Testing Scenarios", "Schmidt Testing"],
    ["Submissions", "Schmidt Submissions"],
    ["XP Events", "Schmidt XP Events"],
    ["Weekly Athlete Summary", "Schmidt WAS"],
    ["Submission Assets", "Schmidt Assets"],
    ["Homework Completions", "Schmidt Homework Completions"],
    ["Video Feedback", "Schmidt Video Feedback"],
    ["Athlete Achievement Unlocks", "Schmidt Unlocks"],
    ["Enrollments", "Schmidt Enrollment"],
    ["Weeks", "Seeded Weeks"],
  ];
  for (const [table, shortName] of cases) {
    const s = specFor(table);
    const { match, match_kind } = findMatchingView(views(shortName, "Grid view"), s);
    assert.equal(match_kind, "acceptable_alias", table);
    assert.equal(match.name, shortName, table);
  }
});

test("aliases are table-specific (Testing on Unlocks does not satisfy Enrollments)", () => {
  const unlocks = specFor("Athlete Achievement Unlocks");
  const enrollments = specFor("Enrollments");
  const unlockHit = findMatchingView(views("Testing"), unlocks);
  assert.equal(unlockHit.match_kind, "acceptable_alias");
  const enrollHit = findMatchingView(views("Testing"), enrollments);
  assert.equal(enrollHit.match_kind, "missing");
  assert.equal(enrollHit.match, null);
});

test("unknown names fail", () => {
  const s = specFor("XP Events");
  const { match, match_kind } = findMatchingView(views("Grid view", "Homework"), s);
  assert.equal(match_kind, "missing");
  assert.equal(match, null);
});

test("partial Schmidt string matching is not used", () => {
  const s = specFor("XP Events");
  const { match_kind } = findMatchingView(views("Schmidt Something Else"), s);
  assert.equal(match_kind, "missing");
});

test("unsafe Grid Testing View does not automatically pass for WAS", () => {
  const s = specFor("Weekly Athlete Summary");
  assert.ok((s.name_aliases_unacceptable_without_filter || []).includes("Grid Testing View"));
  const { match, match_kind } = findMatchingView(views("Grid Testing View", "Grid view"), s);
  assert.equal(match_kind, "missing");
  assert.equal(match, null);
});

test("interim Workflow testing only is interim_only for Submissions", () => {
  const s = specFor("Submissions");
  const { match, match_kind } = findMatchingView(views("Workflow testing only"), s);
  assert.equal(match_kind, "interim_only");
  assert.equal(match.name, "Workflow testing only");
});

test("Schmidt Submissions alias preferred over interim", () => {
  const s = specFor("Submissions");
  const { match, match_kind } = findMatchingView(
    views("Workflow testing only", "Schmidt Submissions"),
    s
  );
  assert.equal(match_kind, "acceptable_alias");
  assert.equal(match.name, "Schmidt Submissions");
});

test("normalizeName collapses whitespace and case", () => {
  assert.equal(normalizeName("  Schmidt   WAS "), "schmidt was");
});

test("preserved legacy aliases remain accepted", () => {
  const hw = findMatchingView(
    views("Testing - Schmidt Homework"),
    specFor("Homework Completions")
  );
  assert.equal(hw.match_kind, "acceptable_alias");
  const enr = findMatchingView(
    views("Testing - Schmidt Only"),
    specFor("Enrollments")
  );
  assert.equal(enr.match_kind, "acceptable_alias");
});

test("optional Zoom short alias matches without changing required count", () => {
  const zoom = SPEC.views.find((v) => v.table === "Zoom Attendance");
  assert.equal(zoom.optional, true);
  const { match_kind } = findMatchingView(views("Schmidt Zoom Attendance"), zoom);
  assert.equal(match_kind, "acceptable_alias");
  assert.equal(countRequiredViews(SPEC), 10);
});
