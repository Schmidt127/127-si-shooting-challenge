#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS,
  PERFECT_WEEK_SUBMISSION_TIMING_STATUS,
  resolvePerfectWeekSubmissionGraceHours,
  evaluatePerfectWeekSubmissionTiming,
  countDistinctPerfectWeekQualifyingDays,
  graceDeadlineMs,
  activityDateEndDenverMs,
} = require("../../lib/was-email-contracts/perfect-week-submission-timing");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const WEEK_START = "2026-08-16";
const WEEK_END = "2026-08-22";
const GRACE = 48;

function evaluate(overrides = {}) {
  return evaluatePerfectWeekSubmissionTiming({
    activityDateKey: "2026-08-18",
    submittedAt: "2026-08-18T18:00:00.000Z",
    countThisSubmission: true,
    weekStartKey: WEEK_START,
    weekEndKey: WEEK_END,
    graceHours: GRACE,
    nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
    ...overrides,
  });
}

test("default grace hours is 48 when config missing", () => {
  assert.equal(resolvePerfectWeekSubmissionGraceHours(null), DEFAULT_PERFECT_WEEK_SUBMISSION_GRACE_HOURS);
  assert.equal(resolvePerfectWeekSubmissionGraceHours(undefined), 48);
  assert.equal(resolvePerfectWeekSubmissionGraceHours(24), 24);
});

test("same-day submission is on_time and PW countable", () => {
  const r = evaluate({
    activityDateKey: "2026-08-21",
    submittedAt: "2026-08-21T22:47:17.000Z",
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.ON_TIME);
  assert.equal(r.timingEligible, true);
  assert.equal(r.perfectWeekCountable, true);
});

test("submission 24 hours after activity end is late_grace", () => {
  const activityKey = "2026-08-19";
  const endMs = activityDateEndDenverMs(activityKey);
  const submittedMs = endMs + 24 * 3600000;
  const r = evaluate({
    activityDateKey: activityKey,
    submittedAt: new Date(submittedMs).toISOString(),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE);
  assert.equal(r.perfectWeekCountable, true);
});

test("submission 48 hours after activity end is late_grace at boundary", () => {
  const activityKey = "2026-08-19";
  const deadline = graceDeadlineMs(activityKey, GRACE);
  const r = evaluate({
    activityDateKey: activityKey,
    submittedAt: new Date(deadline).toISOString(),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE);
  assert.equal(r.perfectWeekCountable, true);
});

test("submission just over 48 hours after activity end is late_ineligible", () => {
  const activityKey = "2026-08-19";
  const deadline = graceDeadlineMs(activityKey, GRACE);
  const r = evaluate({
    activityDateKey: activityKey,
    submittedAt: new Date(deadline + 1000).toISOString(),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_INELIGIBLE);
  assert.equal(r.perfectWeekCountable, false);
});

test("next calendar day but within 48 hours is late_grace", () => {
  const activityKey = "2026-08-20";
  const endMs = activityDateEndDenverMs(activityKey);
  const submittedMs = endMs + 12 * 3600000;
  const r = evaluate({
    activityDateKey: activityKey,
    submittedAt: new Date(submittedMs).toISOString(),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE);
  assert.equal(r.perfectWeekCountable, true);
});

test("submission more than 48 hours late is ineligible", () => {
  const r = evaluate({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-22T15:06:52.000Z",
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_INELIGIBLE);
  assert.equal(r.perfectWeekCountable, false);
});

test("future-dated Activity Date is never eligible", () => {
  const r = evaluate({
    activityDateKey: "2026-08-25",
    submittedAt: "2026-08-25T12:00:00.000Z",
    nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.FUTURE_INELIGIBLE);
  assert.equal(r.perfectWeekCountable, false);
});

test("backdated submission inside official week can qualify within grace", () => {
  const r = evaluate({
    activityDateKey: "2026-08-20",
    submittedAt: "2026-08-21T14:21:50.000Z",
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE);
  assert.equal(r.perfectWeekCountable, true);
});

test("backdated submission outside official week is ineligible", () => {
  const r = evaluate({
    activityDateKey: "2026-08-10",
    submittedAt: "2026-08-11T12:00:00.000Z",
    weekStartKey: WEEK_START,
    weekEndKey: WEEK_END,
  });
  assert.equal(r.perfectWeekCountable, false);
});

test("multiple submissions on one date count as one PW qualifying day", () => {
  const subs = [
    {
      activityDateKey: "2026-08-21",
      submittedAt: "2026-08-21T22:47:17.000Z",
      countThisSubmission: true,
    },
    {
      activityDateKey: "2026-08-21",
      submittedAt: "2026-08-21T22:48:07.000Z",
      countThisSubmission: true,
    },
  ];
  assert.equal(
    countDistinctPerfectWeekQualifyingDays(subs, {
      weekStartKey: WEEK_START,
      weekEndKey: WEEK_END,
      graceHours: GRACE,
      nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
    }),
    1
  );
});

test("seven distinct Activity Dates with grace produce seven PW qualifying days", () => {
  const dates = [
    "2026-08-16",
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
  ];
  const subs = dates.map((d) => ({
    activityDateKey: d,
    submittedAt: `${d}T20:00:00.000Z`,
    countThisSubmission: true,
  }));
  assert.equal(
    countDistinctPerfectWeekQualifyingDays(subs, {
      weekStartKey: WEEK_START,
      weekEndKey: WEEK_END,
      graceHours: GRACE,
      nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
    }),
    7
  );
});

test("manual approved exception overrides late ineligible", () => {
  const r = evaluate({
    activityDateKey: "2026-08-16",
    submittedAt: "2026-08-22T15:06:52.000Z",
    manualApproved: true,
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.MANUAL_APPROVED);
  assert.equal(r.perfectWeekCountable, true);
});

test("DST boundary: late grace uses Denver end-of-day not UTC shift", () => {
  const activityKey = "2026-03-08";
  const endMs = activityDateEndDenverMs(activityKey);
  const submittedMs = endMs + 36 * 3600000;
  const r = evaluatePerfectWeekSubmissionTiming({
    activityDateKey: activityKey,
    submittedAt: new Date(submittedMs).toISOString(),
    countThisSubmission: true,
    weekStartKey: "2026-03-08",
    weekEndKey: "2026-03-14",
    graceHours: GRACE,
    nowMs: Date.parse("2026-03-15T12:00:00.000Z"),
  });
  assert.equal(r.status, PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE);
});

test("replay evaluation is deterministic", () => {
  const input = {
    activityDateKey: "2026-08-19",
    submittedAt: "2026-08-20T23:06:06.000Z",
    countThisSubmission: true,
    weekStartKey: WEEK_START,
    weekEndKey: WEEK_END,
    graceHours: GRACE,
    nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
  };
  assert.deepStrictEqual(
    evaluatePerfectWeekSubmissionTiming(input),
    evaluatePerfectWeekSubmissionTiming(input)
  );
});

test("Perfect Week Testing enrollment regression — rec93mAfo5jKqP3g5 week Aug 16–22", () => {
  const subs = [
    { id: "rec0Yu4js37Xk5dHX", activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:46:07.000Z" },
    { id: "rec0zlESysvRwdtrX", activityDateKey: "2026-08-17", submittedAt: "2026-08-22T15:14:36.000Z" },
    { id: "rec4AeA9WXY2q4alp", activityDateKey: "2026-08-18", submittedAt: "2026-08-21T22:39:14.000Z" },
    { id: "rec8Qrt5dn0denguA", activityDateKey: "2026-08-19", submittedAt: "2026-08-20T23:06:06.000Z" },
    { id: "recDjNlaKssUZoe2c", activityDateKey: "2026-08-16", submittedAt: "2026-08-22T15:06:52.000Z" },
    { id: "recPj3RCFcF4dIlkL", activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:53:39.000Z" },
    { id: "recRqZKYBsiy9ch1m", activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:47:17.000Z" },
    { id: "recVFz2knPNMhWQb3", activityDateKey: "2026-08-17", submittedAt: "2026-08-21T22:38:48.000Z" },
    { id: "recaxgOnpULYSSvXs", activityDateKey: "2026-08-20", submittedAt: "2026-08-21T14:21:50.000Z" },
    { id: "reccHVxIEyJZg0NuN", activityDateKey: "2026-08-18", submittedAt: "2026-08-21T22:48:07.000Z" },
    { id: "recfTrpgx3NvO8IRg", activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:47:44.000Z" },
    { id: "reciMAjPxI0ip8EeM", activityDateKey: "2026-08-21", submittedAt: "2026-08-21T22:38:19.000Z" },
    { id: "recoCaIhL5KKVrcFK", activityDateKey: "2026-08-19", submittedAt: "2026-08-22T14:26:21.000Z" },
    { id: "recoin44RERFMChHg", activityDateKey: "2026-08-22", submittedAt: "2026-08-22T14:55:28.000Z" },
    { id: "recqYLtep74I0tvDF", activityDateKey: "2026-08-22", submittedAt: "2026-08-22T13:01:19.000Z" },
    { id: "rectqcHMxn2dO1ino", activityDateKey: "2026-08-16", submittedAt: "2026-08-21T22:37:55.000Z" },
    { id: "recv8a0SieH75Zzgu", activityDateKey: "2026-08-20", submittedAt: "2026-08-21T13:36:22.000Z" },
    { id: "recvtQh5Rq6yTFotc", activityDateKey: "2026-08-22", submittedAt: "2026-08-22T12:01:16.000Z" },
  ].map((s) => ({ ...s, countThisSubmission: true }));

  const qualifying = subs.filter(
    (s) =>
      evaluatePerfectWeekSubmissionTiming({
        activityDateKey: s.activityDateKey,
        submittedAt: s.submittedAt,
        countThisSubmission: true,
        weekStartKey: WEEK_START,
        weekEndKey: WEEK_END,
        graceHours: GRACE,
        nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
      }).perfectWeekCountable
  );

  const qualifyingDates = [...new Set(qualifying.map((s) => s.activityDateKey))].sort();
  assert.deepStrictEqual(qualifyingDates, [
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
  ]);
  assert.equal(qualifying.length, 11);
  assert.equal(
    countDistinctPerfectWeekQualifyingDays(subs, {
      weekStartKey: WEEK_START,
      weekEndKey: WEEK_END,
      graceHours: GRACE,
      nowMs: Date.parse("2026-08-23T12:00:00.000Z"),
    }),
    4
  );

  const graceOnly = qualifying.filter((s) => {
    const t = evaluatePerfectWeekSubmissionTiming({
      activityDateKey: s.activityDateKey,
      submittedAt: s.submittedAt,
      countThisSubmission: true,
      weekStartKey: WEEK_START,
      weekEndKey: WEEK_END,
      graceHours: GRACE,
    });
    return t.status === PERFECT_WEEK_SUBMISSION_TIMING_STATUS.LATE_GRACE;
  });
  assert.deepStrictEqual(
    [...new Set(graceOnly.map((s) => s.id))].sort(),
    ["rec8Qrt5dn0denguA", "recaxgOnpULYSSvXs", "recv8a0SieH75Zzgu"].sort()
  );
});

console.log("perfect-week-submission-timing tests passed");
