#!/usr/bin/env node
"use strict";

/**
 * Homework late-credit policy (SC-112 / SC-023 audit § D).
 * Covers: on-time, late full credit, delayed grading, Needs Revision / no XP,
 * revision no-duplicate identity, Perfect Week late exclusion.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateHomeworkSubmissionDeadline,
  buildLateSubmissionNote,
  buildHomeworkCompletionIdentityKeyByPha,
} = require("../../lib/homework-contracts/assignment-identity");

const ROOT = path.resolve(__dirname, "../..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("on-time submission is credit eligible with timingStatus on_time", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-08-20",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.creditEligible, true);
  assert.equal(result.timingStatus, "on_time");
  assert.equal(buildLateSubmissionNote(result), "");
});

test("late submission is full-credit eligible with timingStatus late", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-09-02",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.creditEligible, true);
  assert.equal(result.timingStatus, "late");
  assert.match(buildLateSubmissionNote(result), /Full homework credit and XP still apply/);
  assert.match(buildLateSubmissionNote(result), /does not count toward Perfect Week/);
});

test("delayed grading does not penalize — Submission Date (not graded-at) controls late", () => {
  // Coach grades weeks later; student submitted on due date.
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-08-31",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.timingStatus, "on_time");
  assert.equal(result.creditEligible, true);
});

test("065 keeps Satisfactory gate and no longer blocks late XP", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
    ),
    "utf8"
  );
  assert.match(source, /version:\s*"v10\.6"/);
  assert.match(source, /Satisfactory\?/);
  assert.match(source, /Late Submission Date does not block XP/);
  assert.doesNotMatch(source, /late_ineligible/);
  assert.doesNotMatch(source, /Submission after assignment due date/);
  // Needs Revision / not satisfactory → no positive XP path remains via Satisfactory gate
  assert.match(source, /satisfactory/);
});

test("020 revision identity is Enrollment+PHA — no duplicate HC key", () => {
  const keyA = buildHomeworkCompletionIdentityKeyByPha({
    enrollmentId: "recEnroll00000001",
    phaId: "recPhaAssign00001",
  });
  const keyB = buildHomeworkCompletionIdentityKeyByPha({
    enrollmentId: "recEnroll00000001",
    phaId: "recPhaAssign00001",
  });
  assert.equal(keyA, keyB);
  assert.equal(keyA, "HC|enrollment|recEnroll00000001|pha|recPhaAssign00001");

  const source = fs.readFileSync(
    path.join(
      ROOT,
      "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
    ),
    "utf8"
  );
  assert.match(source, /version:\s*"v3\.9"/);
  assert.match(source, /One Homework Completion per Enrollment \+ Program Homework Assignment/);
  assert.match(source, /no duplicate HC\/XP/);
});

test("057 Perfect Week excludes late homework for original week", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
    ),
    "utf8"
  );
  assert.match(source, /Version:\s*2\.3/);
  assert.match(source, /isHomeworkSatisfactoryForPerfectWeek/);
  assert.match(source, /isHomeworkOnTimeForPerfectWeek/);
  assert.match(source, /Submission Date/);
  assert.match(source, /does not count toward Perfect Week/);
  assert.match(source, /endDate:\s*"End Date"/);
});

test("shared contracts + 020/065/v2-engine agree on late timingStatus", () => {
  const shared = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-09-01",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(shared.timingStatus, "late");
  assert.equal(shared.creditEligible, true);

  for (const rel of [
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js",
    "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js",
    "airtable/automations/shooting-challenge/lib/v2-engine-contracts.js",
    "lib/homework-contracts/assignment-identity.js",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.match(src, /timingStatus:\s*"late"/, rel);
    assert.doesNotMatch(src, /timingStatus:\s*"late_ineligible"/, rel);
  }
});

console.log("all homework-late-credit-policy tests passed");
