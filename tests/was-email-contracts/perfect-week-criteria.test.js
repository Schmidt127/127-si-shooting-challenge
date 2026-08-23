#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  inclusiveWeekDayCount,
  parsePerfectWeekDailyDetail,
  countDistinctPerfectWeekDays,
  formatDaysLoggedAgainstCriteria,
  buildPerfectWeekEmailCriteria,
  buildZoomAttendanceEmailLine,
} = require("../../lib/was-email-contracts/perfect-week-criteria");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const DETAIL_057 = [
  "Official week: 2026-08-17 through 2026-08-23",
  "Weekly goal: 1333",
  "Daily minimum: 191",
  "Passing official days: 7/7",
  "Ignored non-countable submissions: 1",
].join("\n");

test("parse Perfect Week Daily Check Detail from Automation 057", () => {
  const parsed = parsePerfectWeekDailyDetail(DETAIL_057);
  assert.equal(parsed.weekStartKey, "2026-08-17");
  assert.equal(parsed.weekEndKey, "2026-08-23");
  assert.equal(parsed.dailyMinimum, 191);
  assert.equal(parsed.passingOfficialDays, 7);
  assert.equal(parsed.requiredDays, 7);
});

test("required shooting days follow Week Start/End when detail is absent", () => {
  assert.equal(inclusiveWeekDayCount("2026-08-17", "2026-08-23"), 7);
  assert.equal(inclusiveWeekDayCount("2026-08-17", "2026-08-21"), 5);
});

test("distinct Perfect Week days ignore non-countable and out-of-week submissions", () => {
  const subs = [
    { perfectWeekCountable: true, activityDateKey: "2026-08-18" },
    { perfectWeekCountable: true, activityDateKey: "2026-08-18" },
    { perfectWeekCountable: true, activityDateKey: "2026-08-19" },
    { perfectWeekCountable: false, activityDateKey: "2026-08-19" },
    { perfectWeekCountable: true, activityDateKey: "2026-08-10" },
  ];
  assert.equal(
    countDistinctPerfectWeekDays(subs, { weekStartKey: "2026-08-17", weekEndKey: "2026-08-23" }),
    2
  );
});

test("days logged displays 7/7 for test week when criteria require 7", () => {
  const criteria = buildPerfectWeekEmailCriteria({
    dailyDetail: DETAIL_057,
    daysLogged: 7,
    achievementRequiredDays: 7,
    weeklyGoalShots: 1333,
    videoCount: 3,
    videoRequired: 3,
    videoRequirementMet: true,
    zoomMeetingCount: 1,
    zoomAttendanceCount: 1,
    zoomRequirementStatus: "Attended",
    zoomRequirementMet: true,
    homeworkRequirementStatus: "Complete - 100%",
    homeworkRequirementMet: true,
    eligible: true,
    achievementXpAmount: 100,
  });
  assert.equal(criteria.daysLoggedDisplay, "7/7");
  assert.equal(criteria.dailyShootingMinimum, 191);
  assert.equal(criteria.perfectWeekXpAmount, 100);
});

test("criteria change: required days 5 updates display without code constants", () => {
  const criteria = buildPerfectWeekEmailCriteria({
    weekStartKey: "2026-08-17",
    weekEndKey: "2026-08-21",
    achievementRequiredDays: 5,
    daysLogged: 4,
  });
  assert.equal(criteria.requiredShootingDays, 5);
  assert.equal(criteria.daysLoggedDisplay, "4/5");
});

test("criteria change: video required 5 updates progress display", () => {
  const criteria = buildPerfectWeekEmailCriteria({
    daysLogged: 7,
    achievementRequiredDays: 7,
    videoCount: 4,
    videoRequired: 5,
    videoRequirementMet: false,
  });
  assert.equal(criteria.videoProgressDisplay, "4/5");
});

test("zoom conditional rule: no meeting means no attendance required", () => {
  assert.equal(
    buildZoomAttendanceEmailLine({
      zoomRequirementStatus: "No Zoom This Week",
      zoomMeetingCount: 0,
      zoomAttendanceCount: 0,
    }),
    "No Zoom This Week"
  );
  assert.equal(
    buildZoomAttendanceEmailLine({
      zoomMeetingCount: 1,
      zoomAttendanceCount: 1,
      zoomRequirementMet: true,
    }),
    "Attended"
  );
});

test("rollup 8 vs canonical 7: email uses canonical days logged against criteria", () => {
  const rollupDays = 8;
  const canonicalDays = 7;
  const criteria = buildPerfectWeekEmailCriteria({
    dailyDetail: DETAIL_057,
    daysLogged: canonicalDays,
    achievementRequiredDays: 7,
  });
  assert.notEqual(rollupDays, canonicalDays);
  assert.equal(criteria.daysLoggedDisplay, "7/7");
  assert.equal(formatDaysLoggedAgainstCriteria(rollupDays, 7), "8/7");
});

console.log("perfect-week-criteria tests passed");
