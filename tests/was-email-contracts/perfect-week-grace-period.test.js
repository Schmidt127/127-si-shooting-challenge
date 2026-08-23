#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  DEFAULT_GRACE_PERIOD_HOURS,
  TIMING_STATUS,
  resolveGracePeriodHours,
  graceDeadlineMs,
  classifyPerfectWeekSubmissionTiming,
  isPerfectWeekGraceEligibleSubmission,
  countGeneralShootingDays,
  countPerfectWeekQualifyingDays,
  evaluateGracePeriodDailyRequirement,
} = require("../../lib/was-email-contracts/perfect-week-grace-period");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const WEEK_START = "2026-08-16";
const WEEK_END = "2026-08-22";
const BOUNDS = { weekStartKey: WEEK_START, weekEndKey: WEEK_END, gracePeriodHours: 48 };
const REF = Date.parse("2026-08-23T18:00:00.000Z");

function row(overrides = {}) {
  return {
    countThisSubmission: 1,
    shots: 200,
    enrollmentLinked: true,
    weekLinked: true,
    gracePeriodHours: 48,
    referenceNowMs: REF,
    ...overrides,
  };
}

test("default grace period is 48 hours and configurable", () => {
  assert.equal(resolveGracePeriodHours(null), DEFAULT_GRACE_PERIOD_HOURS);
  assert.equal(resolveGracePeriodHours(72), 72);
  assert.equal(resolveGracePeriodHours(-1), DEFAULT_GRACE_PERIOD_HOURS);
});

test("same-day submission is on_time", () => {
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-20",
    submittedAt: "2026-08-20T22:00:00.000Z",
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.ON_TIME);
  assert.equal(result.graceEligible, true);
});

test("submission 24 hours later (next calendar day) can be grace_period eligible", () => {
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-20",
    submittedAt: "2026-08-21T12:00:00.000Z",
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.GRACE_PERIOD);
  assert.equal(result.graceEligible, true);
});

test("submission 48 hours later at deadline boundary is grace_period eligible", () => {
  const activityDateKey = "2026-08-20";
  const deadline = graceDeadlineMs(activityDateKey, 48);
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey,
    submittedAt: new Date(deadline).toISOString(),
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.GRACE_PERIOD);
  assert.equal(result.graceEligible, true);
});

test("submission just over 48 hours is late", () => {
  const activityDateKey = "2026-08-20";
  const deadline = graceDeadlineMs(activityDateKey, 48);
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey,
    submittedAt: new Date(deadline + 1000).toISOString(),
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.LATE);
  assert.equal(result.graceEligible, false);
});

test("submission more than 48 hours late is ineligible", () => {
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-22T15:00:00.000Z",
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.LATE);
  assert.equal(isPerfectWeekGraceEligibleSubmission(row({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-22T15:00:00.000Z",
    ...BOUNDS,
  })), false);
});

test("future-dated Activity Date is never eligible", () => {
  const futureRef = Date.parse("2026-08-10T12:00:00.000Z");
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-16T18:00:00.000Z",
    referenceNowMs: futureRef,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.INELIGIBLE);
  assert.equal(result.reason, "future_activity_date");
});

test("backdated submission inside official week can qualify within grace", () => {
  assert.equal(
    isPerfectWeekGraceEligibleSubmission(row({
      activityDateKey: "2026-08-19",
      submittedAt: "2026-08-20T23:06:06.000Z",
      ...BOUNDS,
    })),
    true
  );
});

test("backdated submission outside official week does not count", () => {
  assert.equal(
    isPerfectWeekGraceEligibleSubmission(row({
      activityDateKey: "2026-08-10",
      submittedAt: "2026-08-11T12:00:00.000Z",
      weekStartKey: WEEK_START,
      weekEndKey: WEEK_END,
    })),
    false
  );
});

test("multiple submissions on one date aggregate for daily minimum", () => {
  const daily = evaluateGracePeriodDailyRequirement({
    weekStartDateKey: WEEK_START,
    weeklyGoal: 1333,
    gracePeriodHours: 48,
    referenceNowMs: REF,
    submissions: [
      row({ activityDateKey: "2026-08-21", submittedAt: "2026-08-21T10:00:00.000Z", shots: 100 }),
      row({ activityDateKey: "2026-08-21", submittedAt: "2026-08-21T20:00:00.000Z", shots: 150 }),
    ],
  });
  assert.ok(daily.passingDays.some((line) => line.startsWith("2026-08-21:")));
});

test("seven distinct Activity Dates with grace can pass daily requirement", () => {
  const submissions = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(Date.UTC(2026, 7, 16 + i, 15, 0, 0));
    const dateKey = date.toISOString().slice(0, 10);
    submissions.push(
      row({
        activityDateKey: dateKey,
        submittedAt: new Date(date.getTime() + 3600000).toISOString(),
        shots: 250,
      })
    );
  }
  const daily = evaluateGracePeriodDailyRequirement({
    weekStartDateKey: WEEK_START,
    weeklyGoal: 1333,
    gracePeriodHours: 48,
    referenceNowMs: REF,
    submissions,
  });
  assert.equal(daily.dailyMet, true);
  assert.equal(daily.passingOfficialDays, 7);
});

test("general Shooting Days vs Perfect Week Qualifying Days stay separate", () => {
  const submissions = [
    row({ activityDateKey: "2026-08-16", submittedAt: "2026-08-22T15:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-17", submittedAt: "2026-08-22T15:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-18", submittedAt: "2026-08-22T15:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-19", submittedAt: "2026-08-20T12:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-20", submittedAt: "2026-08-21T12:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-21", submittedAt: "2026-08-21T12:00:00.000Z", shots: 200 }),
    row({ activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:00:00.000Z", shots: 200 }),
  ];
  assert.equal(countGeneralShootingDays(submissions, BOUNDS), 7);
  assert.equal(countPerfectWeekQualifyingDays(submissions, BOUNDS), 4);
});

test("America/Denver evening submission stays on activity date (no UTC shift)", () => {
  const result = classifyPerfectWeekSubmissionTiming({
    activityDate: "2026-08-20T17:30:00.000Z",
    submittedAt: "2026-08-21T14:21:50.000Z",
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.equal(result.activityDateKey, "2026-08-20");
  assert.equal(result.timingStatus, TIMING_STATUS.GRACE_PERIOD);
});

test("manual exception is auditable and eligible", () => {
  const result = classifyPerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-25T12:00:00.000Z",
    manualPerfectWeekException: true,
    referenceNowMs: REF,
  });
  assert.equal(result.timingStatus, TIMING_STATUS.MANUAL_EXCEPTION);
  assert.equal(
    isPerfectWeekGraceEligibleSubmission(row({
      activityDateKey: "2026-08-16",
      submittedAt: "2026-08-25T12:00:00.000Z",
      manualPerfectWeekException: true,
      ...BOUNDS,
    })),
    true
  );
});

test("Perfect Week testing enrollment regression: 7 general days, 4 grace qualifying days", () => {
  const submissions = [
    { activityDateKey: "2026-08-19", submittedAt: "2026-08-20T23:06:06.000Z", countThisSubmission: 1, shots: 156, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-20", submittedAt: "2026-08-21T13:36:22.000Z", countThisSubmission: 1, shots: 125, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-20", submittedAt: "2026-08-21T14:21:50.000Z", countThisSubmission: 1, shots: 9000, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-16", submittedAt: "2026-08-21T22:37:55.000Z", countThisSubmission: 1, shots: 125, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:38:19.000Z", countThisSubmission: 1, shots: 123, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-17", submittedAt: "2026-08-21T22:38:48.000Z", countThisSubmission: 1, shots: 145, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-18", submittedAt: "2026-08-21T22:39:14.000Z", countThisSubmission: 1, shots: 233, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:47:17.000Z", countThisSubmission: 1, shots: 5500, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:47:44.000Z", countThisSubmission: 1, shots: 2500, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-18", submittedAt: "2026-08-21T22:48:07.000Z", countThisSubmission: 1, shots: 360, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:01:16.000Z", countThisSubmission: 1, shots: 8000, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:53:39.000Z", countThisSubmission: 1, shots: 4578, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-22", submittedAt: "2026-08-22T13:01:19.000Z", countThisSubmission: 1, shots: 345, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-19", submittedAt: "2026-08-22T14:26:21.000Z", countThisSubmission: 1, shots: 900, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-22", submittedAt: "2026-08-22T14:55:28.000Z", countThisSubmission: 1, shots: 1111, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-16", submittedAt: "2026-08-22T15:06:52.000Z", countThisSubmission: 1, shots: 1232, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-17", submittedAt: "2026-08-22T15:14:36.000Z", countThisSubmission: 1, shots: 12399, enrollmentLinked: true, weekLinked: true },
    { activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:46:07.000Z", countThisSubmission: 1, shots: 1234, enrollmentLinked: true, weekLinked: true },
  ].map((s) => ({ ...s, gracePeriodHours: 48, referenceNowMs: REF }));

  assert.equal(countGeneralShootingDays(submissions, BOUNDS), 7);
  assert.equal(countPerfectWeekQualifyingDays(submissions, BOUNDS), 4);
});

test("withdrawal: Count This Submission? false excludes both metrics", () => {
  const submissions = [
    row({ activityDateKey: "2026-08-20", submittedAt: "2026-08-20T12:00:00.000Z", countThisSubmission: 0 }),
    row({ activityDateKey: "2026-08-21", submittedAt: "2026-08-21T12:00:00.000Z", countThisSubmission: 1 }),
  ];
  assert.equal(countGeneralShootingDays(submissions, BOUNDS), 1);
  assert.equal(countPerfectWeekQualifyingDays(submissions, BOUNDS), 1);
});

test("replay and idempotency: repeated evaluation is deterministic", () => {
  const input = row({
    activityDateKey: "2026-08-19",
    submittedAt: "2026-08-20T23:06:06.000Z",
    ...BOUNDS,
  });
  const first = classifyPerfectWeekSubmissionTiming({
    activityDateKey: input.activityDateKey,
    submittedAt: input.submittedAt,
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  const second = classifyPerfectWeekSubmissionTiming({
    activityDateKey: input.activityDateKey,
    submittedAt: input.submittedAt,
    gracePeriodHours: 48,
    referenceNowMs: REF,
  });
  assert.deepStrictEqual(first, second);
  assert.equal(isPerfectWeekGraceEligibleSubmission(input), isPerfectWeekGraceEligibleSubmission(input));
});

test("Perfect Week XP eligibility requires dailyMet under grace rule", () => {
  const daily = evaluateGracePeriodDailyRequirement({
    weekStartDateKey: WEEK_START,
    weeklyGoal: 1333,
    gracePeriodHours: 48,
    referenceNowMs: REF,
    submissions: [
      row({ activityDateKey: "2026-08-19", submittedAt: "2026-08-20T12:00:00.000Z" }),
      row({ activityDateKey: "2026-08-20", submittedAt: "2026-08-21T12:00:00.000Z" }),
      row({ activityDateKey: "2026-08-21", submittedAt: "2026-08-21T12:00:00.000Z" }),
      row({ activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:00:00.000Z" }),
    ],
  });
  assert.equal(daily.dailyMet, false);
  assert.equal(daily.passingOfficialDays, 4);
});

console.log("perfect-week-grace-period tests passed");
