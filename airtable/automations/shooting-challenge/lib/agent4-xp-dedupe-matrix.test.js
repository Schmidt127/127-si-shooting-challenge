#!/usr/bin/env node
/**
 * Agent 4 — XP / achievement duplicate-prevention matrix.
 * Pure Source Key + decideXpEventAction contracts (no live Airtable).
 *
 * Families covered:
 *   Submission Base XP, Homework XP, Zoom XP (live + recording),
 *   Video Feedback XP, Streak XP, Shot Milestone XP, Perfect Week XP
 *
 * Weekly threshold XP: writer missing in repo — documented as gap assertion.
 *
 * Run: node airtable/automations/shooting-challenge/lib/agent4-xp-dedupe-matrix.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildSubmissionXpSourceKey,
  buildHomeworkXpSourceKey,
  buildVideoXpSourceKey,
  buildStreakXpSourceKey,
  buildShotMilestoneSourceKey,
  buildPerfectWeekSourceKey,
  buildZoomAttendBaseSourceKey,
  buildZoomAttendBonus2SourceKey,
  buildZoomAttendBonus3SourceKey,
  buildZoomRecordingCreditSourceKey,
  decideXpEventAction,
  SOURCE_KEY_PREFIXES,
} = require("./v2-engine-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recEnrollment0001";
const SUB = "recSubmission00001";
const HW = "recHomeworkComp001";
const VF = "recVideoFeedback01";
const ACH = "recAchievement0001";
const MS = "recShotMilestone01";
const WEEK = "recWeek0000000001";
const ZM = "recZoomMeeting0001";

const FAMILIES = [
  {
    name: "Submission Base XP",
    key: buildSubmissionXpSourceKey(SUB),
    expected: `SUBMISSION_XP|${SUB}`,
  },
  {
    name: "Homework XP",
    key: buildHomeworkXpSourceKey(HW),
    expected: `HOMEWORK_XP|${HW}`,
  },
  {
    name: "Video Feedback XP",
    key: buildVideoXpSourceKey(VF),
    expected: `VIDEO_SUBMISSION|${VF}`,
  },
  {
    name: "Streak XP",
    key: buildStreakXpSourceKey(ENR, ACH, "2026-07-03"),
    expected: `STREAK_XP|${ENR}|${ACH}|2026-07-03`,
  },
  {
    name: "Shot Milestone XP",
    key: buildShotMilestoneSourceKey(ENR, MS),
    expected: `SHOT_MILESTONE|${ENR}|${MS}`,
  },
  {
    name: "Perfect Week XP",
    key: buildPerfectWeekSourceKey(ENR, WEEK),
    expected: `PERFECT_WEEK|${ENR}|${WEEK}`,
  },
  {
    name: "Zoom Attend Base XP",
    key: buildZoomAttendBaseSourceKey(ZM, ENR),
    expected: `ZOOM_ATTEND_BASE|${ZM}|${ENR}`,
  },
  {
    name: "Zoom Attend Bonus 2 XP",
    key: buildZoomAttendBonus2SourceKey(ENR),
    expected: `ZOOM_ATTEND_BONUS_2|${ENR}`,
  },
  {
    name: "Zoom Attend Bonus 3 XP",
    key: buildZoomAttendBonus3SourceKey(ENR),
    expected: `ZOOM_ATTEND_BONUS_3|${ENR}`,
  },
  {
    name: "Zoom Recording Credit XP",
    key: buildZoomRecordingCreditSourceKey(ZM, ENR),
    expected: `ZOOM_RECORDING|${ZM}|${ENR}`,
  },
];

for (const family of FAMILIES) {
  test(`${family.name}: source key format + rerun skip`, () => {
    assert.strictEqual(family.key, family.expected);
    const create = decideXpEventAction({ sourceKey: family.key, existingKeys: [] });
    assert.strictEqual(create.action, "create");
    const rerun = decideXpEventAction({
      sourceKey: family.key,
      existingKeys: [family.key],
    });
    assert.strictEqual(rerun.action, "skip_existing");
  });
}

test("steal-guard: linked XP belonging to other source is error", () => {
  const key = buildVideoXpSourceKey(VF);
  const other = buildVideoXpSourceKey("recVideoFeedback99");
  const decision = decideXpEventAction({
    sourceKey: key,
    existingKeys: [],
    linkedXpEventId: "recXpEvent0000001",
    linkedSourceKey: other,
  });
  assert.strictEqual(decision.action, "error");
  assert.strictEqual(decision.reason, "linked_xp_belongs_to_other_source");
});

test("missing source key is error (not silent create)", () => {
  const decision = decideXpEventAction({ sourceKey: "", existingKeys: [] });
  assert.strictEqual(decision.action, "error");
});

test("all SOURCE_KEY_PREFIXES used by families remain defined", () => {
  assert.ok(SOURCE_KEY_PREFIXES.submissionXp);
  assert.ok(SOURCE_KEY_PREFIXES.homeworkXp);
  assert.ok(SOURCE_KEY_PREFIXES.videoSubmission);
  assert.ok(SOURCE_KEY_PREFIXES.streakXp);
  assert.ok(SOURCE_KEY_PREFIXES.shotMilestone);
  assert.ok(SOURCE_KEY_PREFIXES.perfectWeek);
  assert.ok(SOURCE_KEY_PREFIXES.zoomAttendBase);
  assert.ok(SOURCE_KEY_PREFIXES.zoomRecording);
});

test("Weekly Threshold XP writer still absent in automations folder (gap)", () => {
  const dir = path.join(__dirname, "..");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  let writerHits = 0;
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    if (/WEEKLY_THRESHOLD_/.test(text) && /createRecordsAsync|createRecordAsync/.test(text)) {
      writerHits += 1;
    }
  }
  assert.strictEqual(
    writerHits,
    0,
    "Unexpected WEEKLY_THRESHOLD writer appeared — update Agent 4 gap docs and add dedupe tests"
  );
});

test("duplicate keys across families remain distinct", () => {
  const keys = FAMILIES.map((f) => f.key);
  assert.strictEqual(new Set(keys).size, keys.length);
});

console.log("agent4-xp-dedupe-matrix: all tests passed");
