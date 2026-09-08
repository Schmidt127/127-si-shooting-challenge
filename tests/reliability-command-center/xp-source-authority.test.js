#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { checkXpSourceAuthority } = require("../../lib/reliability-command-center/workflows/xp-source-authority");

function rec(id, fields) {
  return { id, fields };
}

function codes(data) {
  return new Set(checkXpSourceAuthority(data).map((issue) => issue.code));
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recEnroll00000001";
const ENR2 = "recEnroll00000002";
const MEETING = "recMeeting0000001";
const ATT = "recAttend00000001";
const ACH = "recAchieve0000001";
const STREAK = "recStreak00000001";
const UNLOCK = "recUnlock0000001";
const MS = "recMilestone000001";
const WEEK = "recWeek000000001";
const WAS = "recWas0000000001";

function xp(id, sourceKey, source = "Other", extra = {}) {
  return rec(id, {
    "Enrollment": [ENR],
    "Active?": true,
    "XP Source": source,
    "XP Points": 25,
    "Source Key": sourceKey,
    ...extra,
  });
}

test("Zoom live source key owner mismatch is blocked", () => {
  const c = codes({
    xpEvents: [xp("recXp00000000001", `ZOOM_ATTEND_BASE|${MEETING}|${ENR2}`, "Zoom Attendance")],
    zoomMeetings: [rec(MEETING, { "Attendees": [ENR2] })],
  });
  assert.ok(c.has("xp_source_key_enrollment_mismatch"));
});

test("Zoom recording credit requires meeting and one recording-quiz source", () => {
  const c = codes({
    xpEvents: [xp("recXp00000000002", `ZOOM_RECORDING_CREDIT|${ENR}|${MEETING}`, "Zoom Meeting Recording Quiz")],
    zoomMeetings: [rec(MEETING, {})],
    zoomAttendance: [
      rec(ATT, {
        "Enrollment": [ENR],
        "Zoom Meeting": [MEETING],
        "Attendance Method": "Recording Quiz",
        "Recording Quiz Satisfactory?": true,
      }),
    ],
  });
  assert.strictEqual(c.size, 0);
});

test("Zoom recording credit with deleted meeting is unsupported", () => {
  const c = codes({
    xpEvents: [xp("recXp00000000003", `ZOOM_RECORDING_CREDIT|${ENR}|${MEETING}`, "Zoom Meeting Recording Quiz")],
    zoomMeetings: [],
  });
  assert.ok(c.has("xp_authoritative_source_missing"));
});

test("Streak XP resolves one exact Streak Occurrence", () => {
  const sourceKey = `STREAK_XP|${ENR}|${ACH}|2027-05-08`;
  const c = codes({
    xpEvents: [xp("recXp00000000004", sourceKey, "7-Day Streak")],
    streakOccurrences: [
      rec(STREAK, {
        "Enrollment": [ENR],
        "Achievement": [ACH],
        "Streak End Date": "2027-05-08",
        "Active?": true,
        "Source Status": "Awarded",
      }),
    ],
  });
  assert.strictEqual(c.size, 0);
});

test("Inactive Streak Occurrence retires active XP", () => {
  const sourceKey = `STREAK_XP|${ENR}|${ACH}|2027-05-08`;
  const c = codes({
    xpEvents: [xp("recXp00000000005", sourceKey, "7-Day Streak")],
    streakOccurrences: [
      rec(STREAK, {
        "Enrollment": [ENR],
        "Achievement": [ACH],
        "Streak End Date": "2027-05-08",
        "Active?": false,
        "Source Status": "Withdrawn",
      }),
    ],
  });
  assert.ok(c.has("xp_authoritative_source_inactive"));
});

test("Shot Milestone XP resolves canonical Achievement Unlock", () => {
  const sourceKey = `SHOT_MILESTONE|${ENR}|${MS}`;
  const c = codes({
    xpEvents: [xp("recXp00000000006", sourceKey, "Shot Milestone")],
    achievementUnlocks: [
      rec(UNLOCK, {
        "Enrollment": [ENR],
        "Shot Milestone": [MS],
        "Milestone Source Key": sourceKey,
        "Active?": true,
        "XP Award Status": "Awarded",
      }),
    ],
  });
  assert.strictEqual(c.size, 0);
});

test("Perfect Week XP with no exact unlock is unsupported", () => {
  const sourceKey = `PERFECT_WEEK|${ENR}|${WEEK}`;
  const c = codes({
    xpEvents: [xp("recXp00000000007", sourceKey, "Perfect Week")],
    achievementUnlocks: [
      rec(UNLOCK, {
        "Enrollment": [ENR],
        "Week": ["recOtherWeek00001"],
        "Source Key": `PERFECT_WEEK|${ENR}|recOtherWeek00001`,
        "Active?": true,
      }),
    ],
  });
  assert.ok(c.has("xp_authoritative_source_missing"));
});

test("Weekly Threshold requires exactly one Enrollment+Week WAS", () => {
  const sourceKey = `WEEKLY_THRESHOLD|${ENR}|${WEEK}|100`;
  const c = codes({
    xpEvents: [xp("recXp00000000008", sourceKey, "Weekly Threshold")],
    weeklyAthleteSummaries: [
      rec(WAS, { "Enrollment": [ENR], "Week": [WEEK] }),
      rec("recWasDuplicate001", { "Enrollment": [ENR], "Week": [WEEK] }),
    ],
  });
  assert.ok(c.has("xp_authoritative_source_ambiguous"));
});

test("Manual Bonus with explicit audit ownership remains valid", () => {
  const c = codes({
    xpEvents: [xp(
      "recXp00000000009",
      `MANUAL_BONUS|${ENR}|coach-adjustment-1`,
      "Manual Bonus",
      { "Awarded By": "Coach", "XP Reason Public": "Approved adjustment" }
    )],
  });
  assert.strictEqual(c.size, 0);
});

test("Manual Bonus without audit owner/reason fails closed to manual review", () => {
  const c = codes({
    xpEvents: [xp("recXp00000000010", `MANUAL_BONUS|${ENR}|adjustment-2`, "Manual Bonus")],
  });
  assert.ok(c.has("manual_bonus_missing_audit_ownership"));
});

console.log("xp-source-authority.test.js passed");
