#!/usr/bin/env node
"use strict";

/**
 * Homework late-credit policy contracts (065 / 020 / 057).
 * Pure functions — no Airtable runtime.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  evaluateHomeworkSubmissionDeadline,
  evaluateHomeworkXpAwardDecision,
  countsTowardPerfectWeekHomework,
  homeworkXpSourceKey,
  buildLateSubmissionNote,
} = require("../../lib/homework-contracts/assignment-identity");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const HC_ID = "recHomeworkComp01";
const DUE = "2026-08-31";
const WEEK_END = "2026-08-24";

test("on-time satisfactory → XP eligible", () => {
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-08-20",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.xpEligible, true);
  assert.equal(result.timingStatus, "on_time");
  assert.equal(result.creditEligible, true);
  assert.equal(result.perfectWeekEligible, true);
  assert.equal(result.xpAction, "create");
  assert.equal(result.sourceKey, `HOMEWORK_XP|${HC_ID}`);
});

test("late satisfactory → full XP (credit eligible, timing late)", () => {
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-09-05",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.xpEligible, true);
  assert.equal(result.creditEligible, true);
  assert.equal(result.timingStatus, "late");
  assert.equal(result.perfectWeekEligible, false);
  assert.equal(result.xpAction, "create");
});

test("delayed grading (submit on-time, grade later) is not penalized", () => {
  const deadline = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-08-20",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
  });
  assert.equal(deadline.timingStatus, "on_time");
  assert.equal(deadline.creditEligible, true);

  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-08-20",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.xpEligible, true);
  assert.equal(result.timingStatus, "on_time");
});

test("Needs Revision / unsatisfactory → no homework XP", () => {
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: false,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-08-20",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.xpEligible, false);
  assert.equal(result.xpAction, "skip_no_xp");
  assert.equal(result.noXpReason, "needs_revision_or_unsatisfactory");
});

test("revision of existing completion updates — no duplicate XP/events", () => {
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-08-20",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    existingXpEventCount: 1,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.xpEligible, true);
  assert.equal(result.xpAction, "update_existing");
  assert.equal(result.duplicateXpForbidden, true);
  assert.equal(result.sourceKey, homeworkXpSourceKey(HC_ID));
});

test("Source Key is stable HOMEWORK_XP|{hcId} (no duplicate identity)", () => {
  assert.equal(homeworkXpSourceKey(HC_ID), "HOMEWORK_XP|recHomeworkComp01");
  assert.equal(homeworkXpSourceKey(""), "");
});

test("late satisfactory does NOT count toward Perfect Week", () => {
  assert.equal(
    countsTowardPerfectWeekHomework({
      satisfactory: true,
      submissionDateKey: "2026-09-05",
      phaDueDate: DUE,
      weekEndDate: WEEK_END,
    }),
    false
  );
  assert.equal(
    countsTowardPerfectWeekHomework({
      satisfactory: true,
      submissionDateKey: "2026-08-20",
      phaDueDate: DUE,
      weekEndDate: WEEK_END,
    }),
    true
  );
});

test("late note documents full XP credit + Perfect Week exclusion", () => {
  const deadline = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-09-01",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
  });
  assert.equal(deadline.timingStatus, "late");
  assert.equal(deadline.creditEligible, true);
  assert.equal(deadline.perfectWeekEligible, false);
  const note = buildLateSubmissionNote({
    timingStatus: deadline.timingStatus,
    dueDateKey: deadline.dueDateKey,
    submissionDateKey: "2026-09-01",
  });
  assert.match(note, /Full homework XP credit/);
  assert.match(note, /does not count toward Perfect Week/);
  assert.doesNotMatch(note, /Not eligible for homework credit/);
});

test("065 GitHub script no longer blocks XP on late_ineligible", () => {
  const root = path.join(__dirname, "../..");
  const s065 = fs.readFileSync(
    path.join(
      root,
      "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
    ),
    "utf8"
  );
  assert.match(s065, /v10\.7/);
  assert.doesNotMatch(s065, /late_ineligible/);
  assert.match(s065, /does not block homework XP/);
});

test("057 GitHub script filters late homework from Perfect Week counts", () => {
  const root = path.join(__dirname, "../..");
  const s057 = fs.readFileSync(
    path.join(
      root,
      "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
    ),
    "utf8"
  );
  assert.match(s057, /Version: 2\.5/);
  assert.match(s057, /countsTowardPerfectWeekHomework/);
  assert.match(s057, /isHomeworkOnTimeForPerfectWeek/);
});

console.log("065 homework late-credit policy contract tests passed");
