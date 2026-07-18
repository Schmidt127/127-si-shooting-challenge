#!/usr/bin/env node
/**
 * C-025 Zoom recording credit contract tests (no Airtable / PROD).
 * Run: node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildZoomLiveSourceKey,
  buildZoomRecordingSourceKey,
  buildLegacyZoomAttendBaseSourceKey,
  buildZoomAttendBonus2SourceKey,
  isLiveFamilyKey,
  isRecordingFamilyKey,
  recordingXpAmount,
  computeRecordingDeadline,
  canAwardRecordingCredit,
  decideRecordingXpAction,
  shouldSendRecordingApprovalEmail,
  distinctZoomMeetingCredit,
  buildRecordingXpEventFields,
  perfectWeekZoomAttendanceCount,
  decideConflictSoftVoid,
  assertLiveAttendanceDoesNotOwnRecordingXp,
  S16_RESPONSIBILITY_OWNERS,
  XP_BUCKET_ZOOM,
  XP_SOURCE_RECORDING,
  RULE_KEY_LIVE_BASE,
  XP_REASON_PUBLIC_FIELD,
  XP_REASON_DEBUG_FIELD,
} = require("./c025-zoom-recording-credit");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const M = "recZoomMeeting0001";
const E = "recEnrollment0001";
const M2 = "recZoomMeeting0002";

test("malformed record IDs fail clearly", () => {
  assert.throws(() => buildZoomRecordingSourceKey("bad", E), /Invalid meetingId/);
  assert.throws(() => buildZoomRecordingSourceKey(M, ""), /Invalid enrollmentId/);
  const gate = canAwardRecordingCredit({
    meetingId: "nope",
    enrollmentId: E,
    quizStatus: "Satisfactory",
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "error_malformed_record_id");
});

test("recording Source Key is deterministic and distinct from live", () => {
  const recording = buildZoomRecordingSourceKey(M, E);
  const live = buildZoomLiveSourceKey(M, E);
  const legacy = buildLegacyZoomAttendBaseSourceKey(M, E);
  assert.strictEqual(recording, `ZOOM_RECORDING|${M}|${E}`);
  assert.strictEqual(live, `ZOOM_LIVE|${M}|${E}`);
  assert.strictEqual(legacy, `ZOOM_ATTEND_BASE|${M}|${E}`);
  assert.notStrictEqual(recording, live);
  assert.notStrictEqual(recording, legacy);
  assert.ok(isRecordingFamilyKey(recording));
  assert.ok(isLiveFamilyKey(live));
  assert.ok(isLiveFamilyKey(legacy));
  assert.ok(!isRecordingFamilyKey(live));
  assert.ok(!isLiveFamilyKey(recording));
});

test("live attendance bonuses are unchanged and not recording keys", () => {
  const bonus = buildZoomAttendBonus2SourceKey(E);
  assert.strictEqual(bonus, `ZOOM_ATTEND_BONUS_2|${E}`);
  assert.ok(!isRecordingFamilyKey(bonus));
});

test("XP amount uses Config percent of live (never hardcodes-only path)", () => {
  assert.strictEqual(recordingXpAmount(40, {}), 20);
  assert.strictEqual(recordingXpAmount(50, { "Zoom Recording XP Percent of Live": 40 }), 20);
  assert.strictEqual(recordingXpAmount(50, { "Zoom Recording XP Percent of Live": 25 }), 12);
});

test("different eligible meetings can each receive recording credit", () => {
  const key1 = buildZoomRecordingSourceKey(M, E);
  const key2 = buildZoomRecordingSourceKey(M2, E);
  assert.notStrictEqual(key1, key2);
  const gate2 = canAwardRecordingCredit({
    meetingId: M2,
    enrollmentId: E,
    xpRows: [{ sourceKey: key1, active: true }],
    quizStatus: "Satisfactory",
  });
  assert.strictEqual(gate2.ok, true);
});

test("rerun is idempotent — same recording Source Key skips", () => {
  const key = buildZoomRecordingSourceKey(M, E);
  const gate = canAwardRecordingCredit({
    meetingId: M,
    enrollmentId: E,
    xpRows: [{ sourceKey: key, active: true }],
    quizStatus: "Satisfactory",
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_already_awarded");
  const decision = decideRecordingXpAction({
    sourceKey: key,
    existingKeys: [key],
    awardGate: { ok: true, reason: "ok" },
  });
  assert.strictEqual(decision.action, "skipped");
});

test("live XP blocks recording for same meeting+enrollment (incl legacy)", () => {
  const live = buildZoomLiveSourceKey(M, E);
  const legacy = buildLegacyZoomAttendBaseSourceKey(M, E);
  for (const sourceKey of [live, legacy]) {
    const gate = canAwardRecordingCredit({
      meetingId: M,
      enrollmentId: E,
      xpRows: [{ sourceKey, active: true }],
      quizStatus: "Satisfactory",
    });
    assert.strictEqual(gate.ok, false);
    assert.strictEqual(gate.reason, "skipped_live_exists");
  }
});

test("recording does not change live Source Key family", () => {
  const live = buildLegacyZoomAttendBaseSourceKey(M, E);
  const recording = buildZoomRecordingSourceKey(M, E);
  // Awarding recording must not rewrite live key shapes used by 101.
  assert.ok(isLiveFamilyKey(live));
  assert.ok(isRecordingFamilyKey(recording));
  assert.ok(!live.startsWith("ZOOM_RECORDING|"));
});

test("ineligible quiz status does not receive XP", () => {
  const gate = canAwardRecordingCredit({
    meetingId: M,
    enrollmentId: E,
    xpRows: [],
    quizStatus: "Needs Review",
    config: { "Recording Quiz Requires Coach Approval?": true },
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_awaiting_coach_approval");
});

test("past makeup deadline skips award", () => {
  const gate = canAwardRecordingCredit({
    meetingId: M,
    enrollmentId: E,
    quizStatus: "Satisfactory",
    activityDateKey: "2026-07-20",
    deadlineDateKey: "2026-07-10",
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_past_makeup_deadline");
});

test("deadline modes and meeting overrides", () => {
  const d = computeRecordingDeadline({
    availableOnDateKey: "2026-07-01",
    weekEndDateKey: "2026-07-20",
    config: { "Zoom Recording Makeup Window Days": 7 },
  });
  assert.strictEqual(d, "2026-07-20");
  const override = computeRecordingDeadline({
    availableOnDateKey: "2026-07-01",
    weekEndDateKey: "2026-07-20",
    config: {
      "Zoom Recording Makeup Window Days": 7,
      "Zoom Recording Deadline Mode": "Days After Recording Available",
    },
    meetingDaysOverride: 3,
  });
  assert.strictEqual(override, "2026-07-04");
});

test("XP Event uses Zoom bucket + Zoom Recording source", () => {
  const fields = buildRecordingXpEventFields({
    enrollmentId: E,
    meetingId: M,
    weekId: "recWeek0000000001",
    xpAmount: 20,
    activityDateKey: "2026-07-08",
    homeworkCompletionId: "recHomeworkComp001",
  });
  assert.strictEqual(fields.xpBucket, XP_BUCKET_ZOOM);
  assert.strictEqual(fields.xpSource, XP_SOURCE_RECORDING);
  assert.strictEqual(fields.sourceKey, buildZoomRecordingSourceKey(M, E));
  assert.strictEqual(fields.activityDateKey, "2026-07-08");
  assert.strictEqual(RULE_KEY_LIVE_BASE, "ZOOM_ATTEND_BASE");
  assert.strictEqual(fields.reasonPublicField, XP_REASON_PUBLIC_FIELD);
  assert.strictEqual(fields.reasonDebugField, XP_REASON_DEBUG_FIELD);
  assert.strictEqual(fields.reasonPublic, "Zoom recording quiz credit");
  assert.ok(fields.reasonDebug.includes(fields.sourceKey));
});

test("S16 superseded 117a CONFIG maps canonical XP Reason Public/Debug fields", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "_superseded",
    "117a-s16-homework-completions-award-xp-SUPERSEDED.js",
  );
  const text = fs.readFileSync(scriptPath, "utf8");
  assert.ok(/reasonPublic:\s*"XP Reason Public"/.test(text));
  assert.ok(/reasonDebug:\s*"XP Reason Debug"/.test(text));
  assert.ok(!/reasonPublic:\s*"Reason Public"/.test(text));
  assert.ok(!/reasonDebug:\s*"Reason Debug"/.test(text));
  assert.ok(/version:\s*"v1\.1"/.test(text));
  assert.ok(/originalWrittenDate:\s*"2026-07-15"/.test(text));
  assert.ok(/versionDate:\s*"2026-07-18"/.test(text));
});

test("create path when eligible", () => {
  const sourceKey = buildZoomRecordingSourceKey(M, E);
  const gate = canAwardRecordingCredit({
    meetingId: M,
    enrollmentId: E,
    quizStatus: "Satisfactory",
    activityDateKey: "2026-07-08",
    deadlineDateKey: "2026-07-15",
  });
  assert.strictEqual(gate.ok, true);
  const decision = decideRecordingXpAction({
    sourceKey,
    existingKeys: [],
    awardGate: gate,
  });
  assert.strictEqual(decision.action, "create");
});

test("parent email only after Satisfactory when enabled", () => {
  const cfg = {
    "Recording Approval Email Enabled?": true,
    "Recording Approval Email Timing": "On Satisfactory",
    "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
  };
  assert.strictEqual(shouldSendRecordingApprovalEmail({ config: cfg, quizStatus: "Needs Review" }).send, false);
  assert.strictEqual(shouldSendRecordingApprovalEmail({ config: cfg, quizStatus: "Satisfactory" }).send, true);
  assert.strictEqual(shouldSendRecordingApprovalEmail({ config: {}, quizStatus: "Satisfactory" }).send, false);
});

test("gate credit union respects Config toggle", () => {
  assert.strictEqual(
    distinctZoomMeetingCredit({
      liveMeetingIds: [M],
      recordingMeetingIds: [M2],
      config: { "Recording Gives Full Zoom Gate Credit?": false },
    }),
    1,
  );
  assert.strictEqual(
    distinctZoomMeetingCredit({
      liveMeetingIds: [M],
      recordingMeetingIds: [M2],
      config: { "Recording Gives Full Zoom Gate Credit?": true },
    }),
    2,
  );
});

// --- Architecture reconciliation: every claimed responsibility ---

test("101 / live attendance does not own recording XP keys", () => {
  const ownership = assertLiveAttendanceDoesNotOwnRecordingXp();
  assert.strictEqual(ownership.liveOwnsRecording, false);
  assert.ok(!ownership.livePrefixes.includes(ownership.recordingPrefix));
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.recordingXpAward, "117a");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.liveAttendanceXp, "101");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.approvalEmail, "117b");
});

test("recording approval is coach Satisfactory — Stage17-117b not required under S16", () => {
  assert.ok(S16_RESPONSIBILITY_OWNERS.recordingApproval.includes("Satisfactory"));
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17CoachReviewZa, "NOT_REQUIRED_UNDER_S16_HC_PATH");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17NormalizeZa, "NOT_REQUIRED_UNDER_S16_HC_PATH");
});

test("Stage17 XP/email/gate fold into S16 117a/b with documented open gaps", () => {
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17CreateXp, "FOLDED_INTO_117a");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17Email, "FOLDED_INTO_117b");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17Gate, "FOLDED_INTO_117a_PLUS_FORMULA");
  assert.strictEqual(S16_RESPONSIBILITY_OWNERS.stage17PerfectWeek, "OPEN_GAP");
  assert.ok(S16_RESPONSIBILITY_OWNERS.postAwardConflictSoftVoid.startsWith("OPEN_GAP"));
  assert.ok(S16_RESPONSIBILITY_OWNERS.levelGateCount.startsWith("OPEN_GAP"));
  assert.ok(S16_RESPONSIBILITY_OWNERS.perfectWeekRosterCount.startsWith("OPEN_GAP"));
});

test("Perfect Week count includes Recording Attendees only when Config allows", () => {
  const weekMeetings = [M, M2];
  const live = { [M]: [E], [M2]: [] };
  const recording = { [M]: [], [M2]: [E] };
  assert.strictEqual(
    perfectWeekZoomAttendanceCount({
      enrollmentId: E,
      weekMeetingIds: weekMeetings,
      liveAttendeesByMeeting: live,
      recordingAttendeesByMeeting: recording,
      config: { "Recording Makeup Counts for Perfect Week?": true },
    }),
    2,
  );
  assert.strictEqual(
    perfectWeekZoomAttendanceCount({
      enrollmentId: E,
      weekMeetingIds: weekMeetings,
      liveAttendeesByMeeting: live,
      recordingAttendeesByMeeting: recording,
      config: { "Recording Makeup Counts for Perfect Week?": false },
    }),
    1,
  );
});

test("post-award live+recording conflict requires soft-void of recording keys", () => {
  const recordingKey = buildZoomRecordingSourceKey(M, E);
  const liveKey = buildZoomLiveSourceKey(M, E);
  const none = decideConflictSoftVoid({
    meetingId: M,
    enrollmentId: E,
    xpRows: [{ sourceKey: recordingKey, active: true }],
  });
  assert.strictEqual(none.conflict, false);
  const both = decideConflictSoftVoid({
    meetingId: M,
    enrollmentId: E,
    xpRows: [
      { sourceKey: recordingKey, active: true },
      { sourceKey: liveKey, active: true },
    ],
  });
  assert.strictEqual(both.conflict, true);
  assert.deepStrictEqual(both.deactivateSourceKeys, [recordingKey]);
});

test("corrections: Needs Review does not award or email", () => {
  const gate = canAwardRecordingCredit({
    meetingId: M,
    enrollmentId: E,
    quizStatus: "Needs Correction",
    config: { "Recording Quiz Requires Coach Approval?": true },
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_awaiting_coach_approval");
  assert.strictEqual(
    shouldSendRecordingApprovalEmail({
      config: {
        "Recording Approval Email Enabled?": true,
        "Recording Approval Email Timing": "On Satisfactory",
        "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
      },
      quizStatus: "Needs Correction",
    }).send,
    false,
  );
});

console.log("\nAll c025-zoom-recording-credit tests passed.");
