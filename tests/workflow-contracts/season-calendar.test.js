#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  SEASON_2026_2027,
  SUBMISSION_XP_POLICY,
  HOMEWORK_XP_POLICY,
  evaluateEarlyBirdActivityDate,
  evaluateHomeworkWeekOwnership,
  auditProgramHomeworkSchedule,
  evaluateSubmissionXpPolicy,
  evaluateLateWeekOnTimeDeadline,
  auditOperationalWeeksCalendar,
} = require("../../lib/workflow-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("season constants match confirmed Mike rules", () => {
  assert.equal(SEASON_2026_2027.earlyBirdStart, "2027-04-25");
  assert.equal(SEASON_2026_2027.earlyBirdEnd, "2027-05-01");
  assert.equal(SEASON_2026_2027.week1Start, "2027-05-02");
  assert.equal(SEASON_2026_2027.commonHomeworkDueDate, "2027-06-29");
  assert.equal(SEASON_2026_2027.week9HasHomework, false);
  assert.equal(SEASON_2026_2027.expectedActiveHomeworkAssignmentCount, 18);
  assert.equal(SEASON_2026_2027.earlyBirdCountable, true);
});

test("Early Bird window is countable inclusive", () => {
  assert.equal(evaluateEarlyBirdActivityDate("2027-04-25").countable, true);
  assert.equal(evaluateEarlyBirdActivityDate("2027-05-01").countable, true);
  assert.equal(evaluateEarlyBirdActivityDate("2027-05-02").countable, false);
  assert.equal(evaluateEarlyBirdActivityDate("2027-04-24").countable, false);
});

test("Week 9 expects zero homework; Weeks 1-8 and Early Bird expect two slots", () => {
  assert.equal(
    evaluateHomeworkWeekOwnership({ weekLabel: "Week 9", activePhaCountForWeek: 0 }).ok,
    true
  );
  assert.equal(
    evaluateHomeworkWeekOwnership({ weekLabel: "Week 9", activePhaCountForWeek: 2 }).ok,
    false
  );
  assert.equal(
    evaluateHomeworkWeekOwnership({ weekLabel: "Early Bird", activePhaCountForWeek: 2 }).ok,
    true
  );
  assert.equal(
    evaluateHomeworkWeekOwnership({ weekLabel: "Week 3", activePhaCountForWeek: 2 }).ok,
    true
  );
});

test("PHA schedule audit passes for 18 active rows with common due date and no Week 9", () => {
  const rows = [];
  const weeks = [
    "Early Bird",
    "Week 1",
    "Week 2",
    "Week 3",
    "Week 4",
    "Week 5",
    "Week 6",
    "Week 7",
    "Week 8",
  ];
  let n = 0;
  for (const week of weeks) {
    for (const slot of ["HW1", "HW2"]) {
      n += 1;
      rows.push({
        id: `recPha${String(n).padStart(10, "0")}`,
        weekName: week,
        slot,
        active: true,
        dueDate: "2027-06-29",
      });
    }
  }
  assert.equal(rows.length, 18);
  const audit = auditProgramHomeworkSchedule(rows);
  assert.equal(audit.ok, true, JSON.stringify(audit.findings, null, 2));
});

test("PHA schedule audit fails Week 9 homework and wrong due date", () => {
  const rows = [
    {
      id: "recPhaBad0000001",
      weekName: "Week 9",
      slot: "HW1",
      active: true,
      dueDate: "2027-06-30",
    },
  ];
  const audit = auditProgramHomeworkSchedule(rows);
  assert.equal(audit.ok, false);
  assert.ok(audit.findings.some((f) => f.code === "week9_has_homework"));
  assert.ok(audit.findings.some((f) => f.code === "pha_due_date_mismatch"));
});

test("Submission XP once per Count It submission; same-day multi is expected", () => {
  assert.equal(SUBMISSION_XP_POLICY.mode, "once_per_count_it_submission");
  assert.equal(SUBMISSION_XP_POLICY.sameDayMultipleAllowed, true);

  const result = evaluateSubmissionXpPolicy([
    {
      sourceKey: "SUBMISSION_XP|recSubmission0001",
      activityDate: "2027-04-26",
      active: true,
    },
    {
      sourceKey: "SUBMISSION_XP|recSubmission0002",
      activityDate: "2027-04-26",
      active: true,
    },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.uniqueSubmissionXpCount, 2);
  assert.equal(result.sameDayMultiXpDays.length, 1);
  assert.match(result.note, /EXPECTED/);
});

test("duplicate SUBMISSION_XP for same submission fails", () => {
  const result = evaluateSubmissionXpPolicy([
    { sourceKey: "SUBMISSION_XP|recSubmission0001", activityDate: "2027-04-26", active: true },
    { sourceKey: "SUBMISSION_XP|recSubmission0001", activityDate: "2027-04-26", active: true },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.duplicateSubmissionKeys.length, 1);
});

test("completion after linked week but on/before June 29 remains credit-eligible", () => {
  const result = evaluateLateWeekOnTimeDeadline({
    submissionDateKey: "2027-05-15",
    weekEndDate: "2027-05-08",
    phaDueDate: "2027-06-29",
  });
  assert.equal(result.afterLinkedWeekEnd, true);
  assert.equal(result.creditEligible, true);
  assert.equal(result.expectedCreditWhenBeforeCommonDue, true);
});

test("completion after June 29 is late but remains credit-eligible", () => {
  const result = evaluateLateWeekOnTimeDeadline({
    submissionDateKey: "2027-06-30",
    weekEndDate: "2027-05-08",
    phaDueDate: "2027-06-29",
  });
  assert.equal(result.creditEligible, true);
  assert.equal(result.timingStatus, "late");
  assert.equal(result.perfectWeekEligible, false);
});

test("homework XP policy is once per Homework Completion with Enrollment+PHA identity", () => {
  assert.equal(HOMEWORK_XP_POLICY.mode, "once_per_homework_completion");
  assert.equal(HOMEWORK_XP_POLICY.identity, "enrollment_plus_pha");
  assert.equal(HOMEWORK_XP_POLICY.multiAssetOneCompletion, true);
});

test("operational weeks calendar audit accepts confirmed Early Bird and Week 1", () => {
  const audit = auditOperationalWeeksCalendar([
    {
      weekName: "Early Bird",
      startDate: "2027-04-25T06:00:00.000Z",
      endDate: "2027-05-02T05:59:00.000Z",
      countsTowardChallenge: true,
    },
    {
      weekName: "Week 1",
      startDate: "2027-05-02T06:00:00.000Z",
      endDate: "2027-05-09T05:59:00.000Z",
      countsTowardChallenge: true,
    },
    {
      weekName: "Week 9",
      startDate: "2027-06-27T06:00:00.000Z",
      endDate: "2027-07-01T05:59:00.000Z",
      countsTowardChallenge: true,
    },
  ]);
  assert.equal(audit.ok, true, JSON.stringify(audit.findings, null, 2));
});

console.log("PASS — workflow-contracts season calendar");
