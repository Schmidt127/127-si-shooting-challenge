#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { checkXpSourceAuthority } = require("../../lib/reliability-command-center/workflows/xp-source-authority");
const { proposeRepair } = require("../../tools/reliability-command-center/repair-preview");

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

const ENR = "rec00000000000001";
const ENR2 = "rec00000000000002";
const MEETING = "rec00000000000003";
const ATT = "rec00000000000004";
const ACH = "rec00000000000005";
const STREAK = "rec00000000000006";
const UNLOCK = "rec00000000000007";
const MS = "rec00000000000008";
const WEEK = "rec00000000000009";
const WAS = "rec00000000000010";
const OTHER_WEEK = "rec00000000000011";
const WAS_DUP = "rec00000000000012";

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
    xpEvents: [xp("rec10000000000001", `ZOOM_ATTEND_BASE|${MEETING}|${ENR2}`, "Zoom Attendance")],
    zoomMeetings: [rec(MEETING, { "Attendees": [ENR2] })],
  });
  assert.ok(c.has("xp_source_key_enrollment_mismatch"));
});

test("Zoom recording credit requires meeting and one recording-quiz source", () => {
  const c = codes({
    xpEvents: [xp("rec10000000000002", `ZOOM_RECORDING_CREDIT|${ENR}|${MEETING}`, "Zoom Meeting Recording Quiz")],
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
    xpEvents: [xp("rec10000000000003", `ZOOM_RECORDING_CREDIT|${ENR}|${MEETING}`, "Zoom Meeting Recording Quiz")],
    zoomMeetings: [],
  });
  assert.ok(c.has("xp_authoritative_source_missing"));
});

test("Streak XP resolves one exact Streak Occurrence", () => {
  const sourceKey = `STREAK_XP|${ENR}|${ACH}|2027-05-08`;
  const c = codes({
    xpEvents: [xp("rec10000000000004", sourceKey, "7-Day Streak")],
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
    xpEvents: [xp("rec10000000000005", sourceKey, "7-Day Streak")],
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
    xpEvents: [xp("rec10000000000006", sourceKey, "Shot Milestone")],
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
    xpEvents: [xp("rec10000000000007", sourceKey, "Perfect Week")],
    achievementUnlocks: [
      rec(UNLOCK, {
        "Enrollment": [ENR],
        "Week": [OTHER_WEEK],
        "Source Key": `PERFECT_WEEK|${ENR}|${OTHER_WEEK}`,
        "Active?": true,
      }),
    ],
  });
  assert.ok(c.has("xp_authoritative_source_missing"));
});

test("Weekly Threshold requires exactly one Enrollment+Week WAS", () => {
  const sourceKey = `WEEKLY_THRESHOLD|${ENR}|${WEEK}|100`;
  const c = codes({
    xpEvents: [xp("rec10000000000008", sourceKey, "Weekly Threshold")],
    weeklyAthleteSummaries: [
      rec(WAS, { "Enrollment": [ENR], "Week": [WEEK] }),
      rec(WAS_DUP, { "Enrollment": [ENR], "Week": [WEEK] }),
    ],
  });
  assert.ok(c.has("xp_authoritative_source_ambiguous"));
});

test("Manual Bonus with explicit audit ownership remains valid", () => {
  const c = codes({
    xpEvents: [xp(
      "rec10000000000009",
      `MANUAL_BONUS|${ENR}|coach-adjustment-1`,
      "Manual Bonus",
      { "Awarded By": "Coach", "XP Reason Public": "Approved adjustment" }
    )],
  });
  assert.strictEqual(c.size, 0);
});

test("Manual Bonus without audit owner/reason fails closed to manual review", () => {
  const c = codes({
    xpEvents: [xp("rec10000000000010", `MANUAL_BONUS|${ENR}|adjustment-2`, "Manual Bonus")],
  });
  assert.ok(c.has("manual_bonus_missing_audit_ownership"));
});

test("repair preview retires unsupported Enrollment-owned XP and queues level recalculation", () => {
  const plan = proposeRepair({
    code: "xp_authoritative_source_missing",
    retryEligibility: "manual_review_required",
  });
  assert.strictEqual(plan.explicitOperatorAction, true);
  assert.ok(plan.proposedChanges.some((c) => c.targetTable === "XP Events" && c.field === "Active?"));
  assert.ok(plan.proposedChanges.some((c) => c.targetTable === "Enrollments" && c.field === "Level Recalc Needed?"));
  assert.strictEqual(plan.apply, false, "preview tool never performs live writes");
});

test("repair preview fails closed on ownership ambiguity", () => {
  const plan = proposeRepair({
    code: "xp_authoritative_source_ambiguous",
    retryEligibility: "manual_review_required",
  });
  assert.strictEqual(plan.explicitOperatorAction, true);
  assert.ok(plan.proposedChanges.some((c) => /manual domain reconciliation/i.test(c.to)));
  assert.strictEqual(plan.apply, false);
});

test("repair preview preserves narrow orphan permanent-delete exception", () => {
  const plan = proposeRepair({
    code: "xp_active_orphan_blank_enrollment",
    retryEligibility: "manual_review_required",
  });
  assert.strictEqual(plan.explicitOperatorAction, true);
  assert.ok(plan.proposedChanges.some((c) => /fresh exact re-query/i.test(c.to)));
  assert.strictEqual(plan.apply, false);
});

console.log("xp-source-authority.test.js passed");
