#!/usr/bin/env node
/**
 * SC-147 Recorded Zoom half-XP — offline conflict matrix + contract tests.
 * Run: node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildSc147RecordingCreditSourceKey,
  isSc147RecordingCreditKey,
  is101LiveCreditKey,
  computeSc147HalfXpAmount,
  selectSc147XpRewardRules,
  resolveSc147XpAmountFromRules,
  canAwardSc147RecordingCredit,
  decideSc147RecordingXpAction,
  buildSc147RecordingXpEventFields,
  sc147PerfectWeekZoomAttendanceCount,
  recordingOnlyDoesNotCountForPerfectWeek,
  RULE_KEY_RECORDING,
  RULE_KEY_LIVE_BASE,
  AUTOMATION_117_SCOPE,
  PERFECT_WEEK_CONTRACT,
  SOURCE_KEY_PREFIX,
} = require("./sc-147-zoom-recording-credit");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const E = "recEnrollment0001";
const M = "recZoomMeeting0001";
const M2 = "recZoomMeeting0002";
const MEET_KEY = "987654321";

test("Source Key idempotency uses ZOOM_RECORDING_CREDIT|enrollment|meeting", () => {
  const key = buildSc147RecordingCreditSourceKey(E, M);
  assert.strictEqual(key, `ZOOM_RECORDING_CREDIT|${E}|${M}`);
  assert.ok(isSc147RecordingCreditKey(key));
  assert.strictEqual(buildSc147RecordingCreditSourceKey(E, M), key);
});

test("malformed record IDs fail clearly", () => {
  assert.throws(() => buildSc147RecordingCreditSourceKey("bad", M), /Invalid enrollmentId/);
  assert.throws(() => buildSc147RecordingCreditSourceKey(E, ""), /Invalid zoomMeetingId/);
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: "nope",
    zoomMeetingId: M,
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "error_malformed_record_id");
});

test("live 101 credit blocks recording credit for same meeting (record id in key)", () => {
  const liveKey = `ZOOM_ATTEND_BASE|${M}|${E}`;
  assert.ok(is101LiveCreditKey(liveKey));
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [{ sourceKey: liveKey, active: true }],
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_live_101_exists");
});

test("live 101 credit with Zoom Meeting Key blocks recording via meetingKeyToId", () => {
  const liveKey = `ZOOM_ATTEND_BASE|${MEET_KEY}|${E}`;
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [{ sourceKey: liveKey, active: true }],
    meetingKeyToId: { [MEET_KEY]: M },
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_live_101_exists");
});

test("live ZOOM_LIVE family also blocks recording for same meeting", () => {
  const liveKey = `ZOOM_LIVE|${M}|${E}`;
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [{ sourceKey: liveKey, active: true }],
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_live_101_exists");
});

test("live attendance full XP path uses ZOOM_ATTEND_BASE not recording key", () => {
  const liveKey = `ZOOM_ATTEND_BASE|${MEET_KEY}|${E}`;
  assert.ok(is101LiveCreditKey(liveKey));
  assert.ok(!isSc147RecordingCreditKey(liveKey));
});

test("recorded attendance half XP uses ZOOM_RECORDING_CREDIT key family", () => {
  const recKey = buildSc147RecordingCreditSourceKey(E, M);
  assert.ok(isSc147RecordingCreditKey(recKey));
  assert.ok(!is101LiveCreditKey(recKey));
});

test("unapproved recording (quiz not satisfactory) blocks award", () => {
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [],
    quizApproved: false,
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_not_approved");
});

test("Conflict rollup = 1 blocks award (SC-087 exclusivity)", () => {
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [],
    conflictRollup: 1,
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_conflict_rollup");
});

test("rerun is idempotent — same Source Key skips", () => {
  const sourceKey = buildSc147RecordingCreditSourceKey(E, M);
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [{ sourceKey, active: true }],
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_already_awarded");
  const decision = decideSc147RecordingXpAction({
    sourceKey,
    existingKeys: [sourceKey],
    awardGate: { ok: true, reason: "ok" },
  });
  assert.strictEqual(decision.action, "skipped");
});

test("half-XP amount = floor(live/2) when no ZOOM_RECORDING rule row", () => {
  assert.strictEqual(computeSc147HalfXpAmount({ liveRuleAmount: 60 }), 30);
  assert.strictEqual(computeSc147HalfXpAmount({ liveRuleAmount: 61 }), 30);
  assert.strictEqual(
    computeSc147HalfXpAmount({ liveRuleAmount: 50, config: { "Zoom Recording XP Percent of Live": 50 } }),
    25,
  );
});

test("ZOOM_RECORDING rule row amount wins when present", () => {
  assert.strictEqual(
    computeSc147HalfXpAmount({ liveRuleAmount: 60, recordingRuleAmount: 28 }),
    28,
  );
});

test("XP Reward Rules contract references ZOOM_RECORDING and ZOOM_ATTEND_BASE", () => {
  const rules = [
    { id: "recLive", ruleKey: RULE_KEY_LIVE_BASE, xpAmount: 60, active: true },
    { id: "recRec", ruleKey: RULE_KEY_RECORDING, xpAmount: 30, active: true },
  ];
  const selected = selectSc147XpRewardRules(rules);
  assert.strictEqual(selected.ruleKeyRecording, "ZOOM_RECORDING");
  assert.strictEqual(selected.ruleKeyLiveBase, "ZOOM_ATTEND_BASE");
  assert.strictEqual(selected.liveStatus, "ok");
  assert.strictEqual(selected.recordingStatus, "ok");
  const resolved = resolveSc147XpAmountFromRules(rules);
  assert.strictEqual(resolved.ok, true);
  assert.strictEqual(resolved.xpAmount, 30);
});

test("XP Reward Rules missing ZOOM_RECORDING falls back to floor(live/2)", () => {
  const rules = [{ id: "recLive", ruleKey: RULE_KEY_LIVE_BASE, xpAmount: 40, active: true }];
  const selected = selectSc147XpRewardRules(rules);
  assert.strictEqual(selected.recordingStatus, "missing");
  const resolved = resolveSc147XpAmountFromRules(rules);
  assert.strictEqual(resolved.ok, true);
  assert.strictEqual(resolved.xpAmount, 20);
});

test("different meetings can each receive recording credit", () => {
  const key1 = buildSc147RecordingCreditSourceKey(E, M);
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M2,
    xpRows: [{ sourceKey: key1, active: true }],
  });
  assert.strictEqual(gate.ok, true);
});

test("live plus recorded for same meeting blocked when live exists", () => {
  const liveKey = `ZOOM_ATTEND_BASE|${MEET_KEY}|${E}`;
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [{ sourceKey: liveKey, active: true }],
    meetingKeyToId: { [MEET_KEY]: M },
  });
  assert.strictEqual(gate.ok, false);
  assert.strictEqual(gate.reason, "skipped_live_101_exists");
});

test("create path when eligible", () => {
  const sourceKey = buildSc147RecordingCreditSourceKey(E, M);
  const gate = canAwardSc147RecordingCredit({
    enrollmentId: E,
    zoomMeetingId: M,
    xpRows: [],
    conflictRollup: 0,
  });
  assert.strictEqual(gate.ok, true);
  const decision = decideSc147RecordingXpAction({
    sourceKey,
    existingKeys: [],
    awardGate: gate,
  });
  assert.strictEqual(decision.action, "create");
});

test("XP Event fields use canonical reason fields and SC-147 Source Key", () => {
  const fields = buildSc147RecordingXpEventFields({
    enrollmentId: E,
    zoomMeetingId: M,
    weekId: "recWeek0000000001",
    xpAmount: 30,
    activityDateKey: "2026-07-08",
    zoomAttendanceId: "recZa00000000001",
  });
  assert.strictEqual(fields.sourceKey, buildSc147RecordingCreditSourceKey(E, M));
  assert.strictEqual(fields.xpPoints, 30);
  assert.strictEqual(fields.ruleKeyRecording, RULE_KEY_RECORDING);
  assert.ok(fields.reasonDebug.includes(SOURCE_KEY_PREFIX));
});

test("Perfect Week formulas must not count recording-only credit", () => {
  assert.strictEqual(PERFECT_WEEK_CONTRACT.recordingOnlyCountsForPerfectWeek, false);
  const weekMeetings = [M, M2];
  const live = { [M]: [], [M2]: [] };
  const count = sc147PerfectWeekZoomAttendanceCount({
    enrollmentId: E,
    weekMeetingIds: weekMeetings,
    liveAttendeesByMeeting: live,
    recordingOnlyMeetingIds: [M, M2],
  });
  assert.strictEqual(count, 0);
  const pw = recordingOnlyDoesNotCountForPerfectWeek({
    enrollmentId: E,
    meetingId: M,
    liveAttendees: [],
    hasRecordingCredit: true,
  });
  assert.strictEqual(pw.countsForPerfectWeek, false);
  assert.strictEqual(pw.reason, "recording_only_excluded");
});

test("Perfect Week still counts live attendance when present", () => {
  const count = sc147PerfectWeekZoomAttendanceCount({
    enrollmentId: E,
    weekMeetingIds: [M],
    liveAttendeesByMeeting: { [M]: [E] },
    recordingOnlyMeetingIds: [],
  });
  assert.strictEqual(count, 1);
  const pw = recordingOnlyDoesNotCountForPerfectWeek({
    enrollmentId: E,
    meetingId: M,
    liveAttendees: [E],
    hasRecordingCredit: true,
  });
  assert.strictEqual(pw.countsForPerfectWeek, true);
});

test("level/gate inclusion: recording XP Event links enrollment and meeting", () => {
  const fields = buildSc147RecordingXpEventFields({
    enrollmentId: E,
    zoomMeetingId: M,
    weekId: "recWeek0000000001",
    xpAmount: 30,
  });
  assert.strictEqual(fields.enrollmentId, E);
  assert.strictEqual(fields.zoomMeetingId, M);
  assert.strictEqual(fields.xpBucket, "Zoom");
});

test("117 email path does NOT write XP (scope boundary)", () => {
  assert.strictEqual(AUTOMATION_117_SCOPE.writesXpEvents, false);
  assert.strictEqual(AUTOMATION_117_SCOPE.writesAttendees, false);
  const scriptPath = path.join(
    __dirname,
    "..",
    "117-zoom-send-recording-approval-email-to-make.js",
  );
  const text = fs.readFileSync(scriptPath, "utf8");
  assert.ok(/Email Handoff Queue/.test(text));
  assert.ok(!/xpEvents\.createRecordAsync/.test(text));
  assert.ok(!/XP Events.*createRecordAsync/.test(text));
  assert.ok(!/tables\.xpEvents/.test(text));
  assert.ok(!/Recording Attendees/.test(text));
  assert.ok(!/Attendees.*updateRecordAsync/.test(text));
});

test("Automation 101 v6.8 implements SC-147 recording phase (not slot 121)", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "101-zoom-attendance-xp-award-meeting-xp.js",
  );
  const text = fs.readFileSync(scriptPath, "utf8");
  assert.ok(/Version: v6\.8/.test(text));
  assert.ok(/processRecordingCreditsForMeeting/.test(text));
  assert.ok(text.includes("ZOOM_RECORDING_CREDIT|"));
  assert.ok(text.includes("ZOOM_RECORDING"));
  assert.ok(text.includes("hasActiveLiveCreditForPair"));
  assert.ok(text.includes("buildRecordingSourceKey"));
  assert.ok(text.includes("created_recording_credit"));
  assert.ok(!/Automation: 121/.test(text));
});

test("slot 121 design artifact is archived and not a Production automation", () => {
  const artifactPath = path.join(
    __dirname,
    "..",
    "drafts",
    "sc-147-slot-121-design-artifact-not-production.js",
  );
  assert.ok(fs.existsSync(artifactPath));
  const text = fs.readFileSync(artifactPath, "utf8");
  assert.ok(/DESIGN ARTIFACT ONLY/.test(text));
  assert.ok(/superseded by SC-147 extension in Automation 101/.test(text));
  assert.ok(!/Status:\s*Live/.test(text));
  const prod121Path = path.join(__dirname, "..", "121-zoom-recording-credit-award-half-xp.js");
  assert.ok(!fs.existsSync(prod121Path));
});

console.log("\nAll sc-147-zoom-recording-credit tests passed.");
