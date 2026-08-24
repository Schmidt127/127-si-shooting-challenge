#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  toDateKey,
  toSafeDateKey,
  isDateKeyInWeekRange,
  countDistinctQualifyingDays,
  sumWeeklyShots,
  sumWeeklyMakes,
  goalCompletionPercentFromRatio,
  goalCompletionRatioFromShotsAndGoal,
  goalCompletionPercentFromShotsAndGoal,
  formatGoalCompletionDisplayForEmail,
  formatShootingPercentage,
  buildVideoSubmissionLines,
  buildWeeklyVideoSubmissionPayload,
  isSafeHttpUrl,
  buildZoomAttendanceSummary,
  filterCountableSubmissionsInWeek,
  buildVideoSubmissionPayload,
  buildZoomAttendanceStatus,
} = require("../../lib/was-email-contracts/weekly-summary-email-content");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("distinct Denver date keys yield 7 days when rollup would count 8 display strings", () => {
  const subs = [
    { activityDateKey: "2026-08-17", countable: true, shots: 100 },
    { activityDateKey: "2026-08-17", countable: true, shots: 200 },
    { activityDateKey: "2026-08-18", countable: true, shots: 150 },
    { activityDateKey: "2026-08-19", countable: true, shots: 120 },
    { activityDateKey: "2026-08-20", countable: true, shots: 110 },
    { activityDateKey: "2026-08-21", countable: true, shots: 90 },
    { activityDateKey: "2026-08-22", countable: true, shots: 80 },
    { activityDateKey: "2026-08-23", countable: true, shots: 70 },
    { activityDateKey: "2026-08-23", countable: true, shots: 60 },
  ];
  assert.equal(countDistinctQualifyingDays(subs), 7);
  assert.equal(sumWeeklyShots(subs), 980);
});

test("goal completion below, above, and decimal weekly goals", () => {
  assert.equal(goalCompletionPercentFromShotsAndGoal(500, 1000, null), 50);
  assert.equal(goalCompletionPercentFromShotsAndGoal(1500, 1000, null), 150);
  assert.equal(goalCompletionPercentFromShotsAndGoal(667, 1333, null), 50);
  assert.equal(goalCompletionPercentFromRatio(0.837), 84);
  assert.equal(formatGoalCompletionDisplayForEmail(0.837), "84%");
  assert.equal(formatGoalCompletionDisplayForEmail(1.5), "150%+");
  assert.equal(formatGoalCompletionDisplayForEmail(36.0495), "150%+");
});

test("weekly shots exclude out-of-week and non-countable submissions (not cumulative enrollment)", () => {
  const all = [
    { activityDateKey: "2026-08-18", countable: true, shots: 500, makes: 250 },
    { activityDateKey: "2026-08-19", countable: true, shots: 300, makes: 150 },
    { activityDateKey: "2026-08-10", countable: true, shots: 50000, makes: 25000 },
    { activityDateKey: "2026-08-18", countable: false, shots: 99999, makes: 99999 },
  ];
  const inWeek = filterCountableSubmissionsInWeek(all, {
    weekStartKey: "2026-08-17",
    weekEndKey: "2026-08-23",
  });
  assert.equal(inWeek.length, 2);
  assert.equal(sumWeeklyShots(inWeek), 800);
  assert.equal(sumWeeklyMakes(inWeek), 400);
  assert.equal(goalCompletionPercentFromShotsAndGoal(sumWeeklyShots(inWeek), 1333, null), 60);
});

test("shooting percentage uses weekly makes and shots", () => {
  assert.equal(formatShootingPercentage(400, 800), 50);
  assert.equal(formatShootingPercentage(0, 0), 0);
});

test("video submission lines and payload objects", () => {
  const entries = [
    {
      label: "Aug 18 shooting clip",
      reviewedAt: "Aug 20, 2026",
      secureUrl: "https://example.lambda-url.us-east-2.on.aws/file/recaXBfjeeu3bcm0t?token=abc",
    },
    { label: "Aug 19 form clip", reviewedAt: "Aug 21, 2026" },
  ];
  const lines = buildVideoSubmissionLines(entries);
  assert.match(lines[0], /Aug 18 shooting clip/);
  assert.match(lines[0], /token=abc/);
  assert.match(lines[1], /Aug 19 form clip/);
  const payload = buildWeeklyVideoSubmissionPayload(entries);
  assert.equal(payload.length, 2);
  assert.equal(payload[0].secureUrl.includes("token=abc"), true);
  assert.equal(payload[1].secureUrl, "");
  assert.equal(isSafeHttpUrl("ftp://bad"), false);
});

test("zoom attendance summary and Hub status", () => {
  const zoom = {
    status: "Attended",
    meetingCount: 1,
    attendanceCount: 1,
    requirementMet: true,
  };
  assert.match(buildZoomAttendanceSummary(zoom), /Attended/);
  assert.equal(buildZoomAttendanceStatus(zoom), "Attended");
});

test("toSafeDateKey prefers raw date object over display text", () => {
  const key = toSafeDateKey(new Date("2026-08-23T12:00:00.000-06:00"), "Aug 22, 2026");
  assert.equal(key, "2026-08-23");
});

test("isDateKeyInWeekRange enforces official week window", () => {
  assert.equal(isDateKeyInWeekRange("2026-08-18", "2026-08-17", "2026-08-23"), true);
  assert.equal(isDateKeyInWeekRange("2026-08-10", "2026-08-17", "2026-08-23"), false);
});

console.log("weekly-summary-email-content tests passed");
