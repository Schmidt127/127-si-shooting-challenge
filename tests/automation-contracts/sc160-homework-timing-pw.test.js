#!/usr/bin/env node
"use strict";

/**
 * SC-160 — Homework timing + Perfect Week contracts (020 / 065 / 057).
 * Pure functions — no Airtable runtime.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  resolveHomeworkAssignedWeekId,
  resolveQualifyingSubmissionTimestamp,
  evaluateHomeworkSubmissionDeadline,
  evaluateHomeworkXpAwardDecision,
  countsTowardPerfectWeekHomework,
  buildTimingSubmissionNote,
  isPerfectWeekEvaluationTimeReached,
  denverEndOfDayMs,
  denverCalendarDateKey,
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

const PHA_WEEK = "recPhaWeek0000001";
const SUB_WEEK = "recSubWeek0000001";
const DUE = "2027-05-01";
const WEEK_START = "2027-04-25";
const WEEK_END = "2027-05-01";
const HC_ID = "recHomeworkComp01";

test("HC Week prefers PHA.Week over Submission.Week", () => {
  const result = resolveHomeworkAssignedWeekId({
    phaWeekId: PHA_WEEK,
    submissionWeekId: SUB_WEEK,
  });
  assert.equal(result.ok, true);
  assert.equal(result.weekId, PHA_WEEK);
  assert.equal(result.source, "pha_week");
  assert.equal(result.submissionWeekIgnored, true);
});

test("HC Week allows empty Submission.Week when PHA.Week present", () => {
  const result = resolveHomeworkAssignedWeekId({
    phaWeekId: PHA_WEEK,
    submissionWeekId: "",
  });
  assert.equal(result.ok, true);
  assert.equal(result.weekId, PHA_WEEK);
  assert.equal(result.submissionWeekIgnored, false);
});

test("qualifying timestamp prefers latest asset Uploaded At (placeholder rule)", () => {
  const result = resolveQualifyingSubmissionTimestamp({
    assetUploadedAts: ["2027-04-20T15:00:00.000Z", "2027-05-03T18:00:00.000Z"],
    activityDate: "2027-04-20",
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "asset_uploaded_at");
  assert.equal(result.dateKey, denverCalendarDateKey(result.epochMs));
  assert.ok(result.epochMs > Date.parse("2027-05-02T00:00:00.000Z"));
});

test("early before Week Start → PW eligible, timing early", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-09-04",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
  });
  assert.equal(result.timingStatus, "early");
  assert.equal(result.creditEligible, true);
  assert.equal(result.perfectWeekEligible, true);
});

test("on-time during assigned week → PW eligible", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2027-04-28",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
  });
  assert.equal(result.timingStatus, "on_time");
  assert.equal(result.perfectWeekEligible, true);
});

test("deadline boundary inclusive through Denver end-of-day", () => {
  const dueEnd = denverEndOfDayMs(DUE);
  assert.ok(dueEnd != null);
  const onTime = evaluateHomeworkSubmissionDeadline({
    qualifyingEpochMs: dueEnd,
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
  });
  assert.equal(onTime.timingStatus, "on_time");
  assert.equal(onTime.perfectWeekEligible, true);

  const late = evaluateHomeworkSubmissionDeadline({
    qualifyingEpochMs: dueEnd + 1,
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
  });
  assert.equal(late.timingStatus, "late");
  assert.equal(late.perfectWeekEligible, false);
});

test("placeholder early + satisfactory late → late for Perfect Week", () => {
  const qualifying = resolveQualifyingSubmissionTimestamp({
    assetUploadedAts: ["2027-04-20T12:00:00.000Z", "2027-05-05T12:00:00.000Z"],
  });
  assert.equal(
    countsTowardPerfectWeekHomework({
      satisfactory: true,
      qualifyingEpochMs: qualifying.epochMs,
      phaDueDate: DUE,
      weekEndDate: WEEK_END,
      weekStartDate: WEEK_START,
    }),
    false
  );
});

test("coach review delay does not change athlete timeliness", () => {
  // Athlete submitted on-time; review happens after deadline — timing still on_time.
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2027-04-28",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.timingStatus, "on_time");
  assert.equal(result.xpEligible, true);
  assert.equal(result.perfectWeekEligible, true);
});

test("early satisfactory still earns HOMEWORK_XP", () => {
  const result = evaluateHomeworkXpAwardDecision({
    satisfactory: true,
    reviewComplete: true,
    hasCoachFeedback: true,
    phaOwnershipEligible: true,
    submissionDateKey: "2026-09-04",
    phaDueDate: DUE,
    weekEndDate: WEEK_END,
    weekStartDate: WEEK_START,
    homeworkCompletionId: HC_ID,
  });
  assert.equal(result.timingStatus, "early");
  assert.equal(result.xpEligible, true);
  assert.equal(result.perfectWeekEligible, true);
  assert.equal(result.xpAction, "create");
});

test("Perfect Week evaluation time reached only after Week End Denver EOD", () => {
  const end = denverEndOfDayMs(WEEK_END);
  assert.equal(isPerfectWeekEvaluationTimeReached({ weekEndDate: WEEK_END, nowMs: end }), false);
  assert.equal(isPerfectWeekEvaluationTimeReached({ weekEndDate: WEEK_END, nowMs: end + 1 }), true);
  assert.equal(
    isPerfectWeekEvaluationTimeReached({ weekEndDate: WEEK_END, nowMs: Date.parse("2026-09-04T12:00:00.000Z") }),
    false
  );
});

test("early timing note documents assigned-week PW hold", () => {
  const note = buildTimingSubmissionNote({
    timingStatus: "early",
    submissionDateKey: "2026-09-04",
    weekStartDateKey: WEEK_START,
    dueDateKey: DUE,
  });
  assert.match(note, /Early submission/);
  assert.match(note, /evaluation time/);
  assert.match(note, /America\/Denver/);
});

test("020 GitHub script uses PHA Week ownership (SC-160)", () => {
  const root = path.join(__dirname, "../..");
  const s020 = fs.readFileSync(
    path.join(
      root,
      "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
    ),
    "utf8"
  );
  assert.match(s020, /v4\.0/);
  assert.match(s020, /resolveHomeworkAssignedWeekId/);
  assert.match(s020, /PHA\.Week is authoritative/);
  assert.doesNotMatch(s020, /Submission must have exactly one Week; found/);
});

test("057 GitHub script documents early homework + week evaluation hold", () => {
  const root = path.join(__dirname, "../..");
  const s057 = fs.readFileSync(
    path.join(
      root,
      "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
    ),
    "utf8"
  );
  assert.match(s057, /Version: 2\.5/);
  assert.match(s057, /week evaluation time|evaluation window/i);
  assert.match(s057, /early/i);
  assert.match(s057, /countsTowardPerfectWeekHomework/);
});

console.log("\nAll SC-160 homework timing contracts passed.");
