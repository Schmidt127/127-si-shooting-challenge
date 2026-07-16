#!/usr/bin/env node
/**
 * Repository-level V2 engine contract tests (no Airtable / PROD credentials).
 * Run: node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
 */

"use strict";

const assert = require("assert");
const {
  SOURCE_KEY_PREFIXES,
  isValidRecordId,
  assertValidRecordId,
  normalizeDuplicateKey,
  toDateKeyFromText,
  toDateKeyFromDateObject,
  toSafeDateKey,
  buildRequiredWeekDates,
  buildStreakBlocks,
  unlockStreaksFromBlocks,
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
  extractVideoFeedbackIdFromSourceKey,
  decideXpEventAction,
  decideHomeworkCompletionAction,
  decideSubmissionDuplicateStatus,
  detectShotMilestoneCrossings,
  evaluatePerfectWeekEligibility,
  orderWeeksByStartDate,
  findPreviousWeek,
  evaluateGate,
  determineAllowedLevelWithGateBlocking,
  isValidSha256Hex,
  evaluateAssetUploadFields,
  isBooleanishTrue,
  evaluateEnrollmentProcessingGuard,
  ENROLLMENT_ACTIVE_GUARD_COVERAGE,
  evaluateWeeklySummaryBuildGate,
  evaluateWeeklySummarySendGate,
  decideAutomaticWeeklySummaryAction,
  mapAttachmentsToAssetSlotPlans,
  inferHomeworkAssetSlot,
  decideHw17QuizIntakeAction,
  ASSET_SLOT_SOURCES,
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
const ACH = "recAchievement0001";
const WEEK = "recWeek0000000001";
const SUB = "recSubmission00001";
const HW = "recHomeworkComp001";
const VF = "recVideoFeedback01";
const MS = "recShotMilestone01";
const ZM = "recZoomMeeting0001";

// --- malformed records / recordId validation ---
test("malformed records: empty and non-rec ids rejected", () => {
  assert.strictEqual(isValidRecordId(""), false);
  assert.strictEqual(isValidRecordId("   "), false);
  assert.strictEqual(isValidRecordId("tblSomething"), false);
  assert.strictEqual(isValidRecordId(SUB), true);
  assert.throws(() => assertValidRecordId("bad"), /Invalid recordId/);
});

// --- XP date normalization ---
test("XP date normalization: ISO and M/D/YYYY text", () => {
  assert.strictEqual(toDateKeyFromText("2026-07-15"), "2026-07-15");
  assert.strictEqual(toDateKeyFromText("2026-07-15T18:00:00.000Z"), "2026-07-15");
  assert.strictEqual(toDateKeyFromText("7/5/2026"), "2026-07-05");
  assert.strictEqual(toDateKeyFromText("07/05/2026"), "2026-07-05");
  assert.strictEqual(toDateKeyFromText("not-a-date"), "");
});

test("XP date normalization: Denver Date object (not raw UTC-only parse)", () => {
  // 2026-07-16T05:30:00Z is still 2026-07-15 evening in America/Denver (MDT).
  const denverEvening = new Date("2026-07-16T05:30:00.000Z");
  assert.strictEqual(toDateKeyFromDateObject(denverEvening, "America/Denver"), "2026-07-15");
  assert.strictEqual(toSafeDateKey(denverEvening, "", "America/Denver"), "2026-07-15");
  assert.strictEqual(toSafeDateKey(denverEvening, "7/15/2026", "America/Denver"), "2026-07-15");
});

// --- XP deduplication Source Keys ---
test("XP dedupe: submission / homework / video source keys", () => {
  assert.strictEqual(buildSubmissionXpSourceKey(SUB), `SUBMISSION_XP|${SUB}`);
  assert.strictEqual(buildHomeworkXpSourceKey(HW), `HOMEWORK_XP|${HW}`);
  assert.strictEqual(buildVideoXpSourceKey(VF), `VIDEO_SUBMISSION|${VF}`);
  assert.strictEqual(extractVideoFeedbackIdFromSourceKey(`VIDEO_SUBMISSION|${VF}`), VF);
  assert.strictEqual(extractVideoFeedbackIdFromSourceKey("VIDEO_SUBMISSION|nope"), "");
});

test("XP dedupe: streak / milestone / perfect week keys", () => {
  assert.strictEqual(
    buildStreakXpSourceKey(ENR, ACH, "2026-07-10"),
    `STREAK_XP|${ENR}|${ACH}|2026-07-10`,
  );
  assert.strictEqual(
    buildShotMilestoneSourceKey(ENR, MS),
    `SHOT_MILESTONE|${ENR}|${MS}`,
  );
  assert.strictEqual(
    buildPerfectWeekSourceKey(ENR, WEEK),
    `PERFECT_WEEK|${ENR}|${WEEK}`,
  );
});

test("automation reruns: create / skip / steal-guard / repair", () => {
  const key = buildSubmissionXpSourceKey(SUB);
  assert.deepStrictEqual(
    decideXpEventAction({ sourceKey: key, existingKeys: [] }),
    { action: "create", reason: "no_existing_source_key" },
  );
  assert.deepStrictEqual(
    decideXpEventAction({ sourceKey: key, existingKeys: [key] }),
    { action: "skip_existing", reason: "source_key_already_exists" },
  );
  assert.deepStrictEqual(
    decideXpEventAction({
      sourceKey: key,
      existingKeys: [],
      linkedXpEventId: "recXpExisting0001",
      linkedSourceKey: buildSubmissionXpSourceKey("recOtherSubmission1"),
    }),
    { action: "error", reason: "linked_xp_belongs_to_other_source" },
  );
  assert.deepStrictEqual(
    decideXpEventAction({
      sourceKey: key,
      existingKeys: [],
      linkedXpEventId: "recXpExisting0001",
      linkedSourceKey: "",
    }),
    { action: "repair_link", reason: "linked_xp_missing_or_mismatched_key_safe_to_repair" },
  );
  assert.deepStrictEqual(
    decideXpEventAction({ sourceKey: "" }),
    { action: "error", reason: "missing_source_key" },
  );
});

// --- homework duplicates ---
test("homework duplicates: link existing vs create vs ambiguous", () => {
  assert.deepStrictEqual(
    decideHomeworkCompletionAction({
      existingCompletionIdsForAsset: [],
      enrollmentId: ENR,
      homeworkAssignmentId: "recHwAssign000001",
    }),
    { action: "create", reason: "no_existing_completion" },
  );
  assert.deepStrictEqual(
    decideHomeworkCompletionAction({
      existingCompletionIdsForAsset: ["recHwCompExisting1"],
      enrollmentId: ENR,
      homeworkAssignmentId: "recHwAssign000001",
    }),
    { action: "link_existing", reason: "duplicate_resolved", completionId: "recHwCompExisting1" },
  );
  assert.strictEqual(
    decideHomeworkCompletionAction({
      existingCompletionIdsForAsset: ["recA", "recB"],
      enrollmentId: ENR,
      homeworkAssignmentId: "recHwAssign000001",
    }).action,
    "error",
  );
  assert.strictEqual(
    decideHomeworkCompletionAction({
      existingCompletionIdsForAsset: [],
      enrollmentId: "bad",
      homeworkAssignmentId: "recHwAssign000001",
    }).action,
    "error",
  );
});

test("submission duplicate key normalization and status", () => {
  assert.strictEqual(normalizeDuplicateKey("  abc  "), "abc");
  assert.strictEqual(
    decideSubmissionDuplicateStatus({ duplicateKey: "", matchingRecordIds: [] }).action,
    "skip",
  );
  assert.strictEqual(
    decideSubmissionDuplicateStatus({
      duplicateKey: "enr|2026-07-15",
      matchingRecordIds: [],
      currentRecordId: SUB,
    }).status,
    "Count It",
  );
  const dup = decideSubmissionDuplicateStatus({
    duplicateKey: "enr|2026-07-15",
    matchingRecordIds: [SUB, "recOtherSub000001"],
    currentRecordId: SUB,
  });
  assert.strictEqual(dup.status, "Needs Review");
  assert.strictEqual(dup.matchCount, 1);
});

// --- streak unlocks ---
test("streak unlocks: contiguous blocks and threshold unlocks", () => {
  const blocks = buildStreakBlocks([
    "2026-07-01",
    "2026-07-02",
    "2026-07-03",
    "2026-07-05",
    "2026-07-06",
  ]);
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks[0], ["2026-07-01", "2026-07-02", "2026-07-03"]);
  assert.deepStrictEqual(blocks[1], ["2026-07-05", "2026-07-06"]);

  const unlocks = unlockStreaksFromBlocks(blocks, [3, 5]);
  assert.strictEqual(unlocks.length, 1);
  assert.deepStrictEqual(unlocks[0], {
    streakDays: 3,
    streakStartDate: "2026-07-01",
    streakEndDate: "2026-07-03",
  });
});

// --- shot milestones ---
test("shot milestones: crossing detection + Source Key idempotency", () => {
  const milestones = [
    { id: "recMs100", threshold: 100 },
    { id: "recMs250", threshold: 250 },
    { id: "recMs500", threshold: 500 },
  ];
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR,
    previousShotTotal: 90,
    currentShotTotal: 260,
    milestones,
    unlockedSourceKeys: [],
  });
  assert.strictEqual(crossings.length, 2);
  assert.strictEqual(crossings[0].sourceKey, buildShotMilestoneSourceKey(ENR, "recMs100"));
  assert.strictEqual(crossings[1].sourceKey, buildShotMilestoneSourceKey(ENR, "recMs250"));

  const again = detectShotMilestoneCrossings({
    enrollmentId: ENR,
    previousShotTotal: 90,
    currentShotTotal: 260,
    milestones,
    unlockedSourceKeys: [buildShotMilestoneSourceKey(ENR, "recMs100")],
  });
  assert.strictEqual(again.length, 1);
  assert.strictEqual(again[0].milestoneId, "recMs250");
});

// --- Perfect Week ---
test("Perfect Week: required dates and eligibility matrix", () => {
  const required = buildRequiredWeekDates("2026-07-13", 5);
  assert.deepStrictEqual(required, [
    "2026-07-13",
    "2026-07-14",
    "2026-07-15",
    "2026-07-16",
    "2026-07-17",
  ]);

  const pass = evaluatePerfectWeekEligibility({
    weekStartDateKey: "2026-07-13",
    countedSubmissionDateKeys: required,
    homeworkSatisfactoryCount: 1,
    homeworkRequired: 1,
    videoCount: 1,
    videoRequired: 1,
    zoomAttendanceCount: 1,
    zoomRequired: 1,
  });
  assert.strictEqual(pass.eligible, true);

  const failDaily = evaluatePerfectWeekEligibility({
    weekStartDateKey: "2026-07-13",
    countedSubmissionDateKeys: required.slice(0, 4),
    homeworkSatisfactoryCount: 1,
  });
  assert.strictEqual(failDaily.eligible, false);
  assert.strictEqual(failDaily.dailyMet, false);
  assert.deepStrictEqual(failDaily.missingDays, ["2026-07-17"]);
});

// --- level gates ---
test("level gates: evaluateGate pass/fail and blocked ladder walk", () => {
  const gate = {
    name: "Level 3 Gate",
    gateEnabled: true,
    minimumSubmissions: 10,
    minimumHomework: 2,
    minimumVideos: 1,
    minimumZoomMeetings: 1,
    minimumStreakDays: 3,
  };
  const fail = evaluateGate(gate, {
    totalSubmissions: 12,
    totalHomeworkCompletions: 1,
    totalVideoSubmissions: 1,
    totalZoomAttendances: 1,
    longestStreakDays: 5,
  });
  assert.strictEqual(fail.passes, false);
  assert.ok(fail.reason.includes("Homework"));

  const levels = [
    { id: "recL1", xpRequired: 0, name: "L1" },
    { id: "recL2", xpRequired: 100, name: "L2" },
    { id: "recL3", xpRequired: 250, name: "L3" },
  ];
  const gateMap = new Map([
    ["recL3", gate],
  ]);
  const blocked = determineAllowedLevelWithGateBlocking(
    levels,
    gateMap,
    300,
    {
      totalSubmissions: 12,
      totalHomeworkCompletions: 1,
      totalVideoSubmissions: 1,
      totalZoomAttendances: 1,
      longestStreakDays: 5,
    },
  );
  assert.strictEqual(blocked.status, "Gate Blocked");
  assert.strictEqual(blocked.currentLevel.id, "recL2");
  assert.strictEqual(blocked.nextLevel.id, "recL3");

  const assigned = determineAllowedLevelWithGateBlocking(
    levels,
    gateMap,
    300,
    {
      totalSubmissions: 12,
      totalHomeworkCompletions: 2,
      totalVideoSubmissions: 1,
      totalZoomAttendances: 1,
      longestStreakDays: 5,
    },
  );
  assert.strictEqual(assigned.status, "Assigned");
  assert.strictEqual(assigned.currentLevel.id, "recL3");
  assert.strictEqual(assigned.nextLevel, null);
});

// --- weekly summaries ---
test("weekly summaries: week order and previous-week helper", () => {
  const weeks = [
    { id: "recW3", startDateKey: "2026-07-20" },
    { id: "recW1", startDateKey: "2026-07-06" },
    { id: "recW2", startDateKey: "2026-07-13" },
  ];
  const ordered = orderWeeksByStartDate(weeks);
  assert.deepStrictEqual(ordered.map((w) => w.id), ["recW1", "recW2", "recW3"]);
  assert.strictEqual(findPreviousWeek(weeks, "recW2").id, "recW1");
  assert.strictEqual(findPreviousWeek(weeks, "recW1"), null);
});

// --- Zoom attendance + recording credit placeholder ---
test("Zoom attendance source keys and recording credit non-collision", () => {
  const live = buildZoomAttendBaseSourceKey(ZM, ENR);
  assert.strictEqual(live, `ZOOM_ATTEND_BASE|${ZM}|${ENR}`);
  assert.strictEqual(buildZoomAttendBonus2SourceKey(ENR), `ZOOM_ATTEND_BONUS_2|${ENR}`);
  assert.strictEqual(buildZoomAttendBonus3SourceKey(ENR), `ZOOM_ATTEND_BONUS_3|${ENR}`);

  const recording = buildZoomRecordingCreditSourceKey(ZM, ENR);
  assert.ok(recording.startsWith("ZOOM_RECORDING|"));
  assert.strictEqual(recording, `ZOOM_RECORDING|${ZM}|${ENR}`);
  assert.notStrictEqual(recording, live);
  assert.strictEqual(
    decideXpEventAction({ sourceKey: live, existingKeys: [live] }).action,
    "skip_existing",
  );
});

// --- asset upload validation ---
test("asset upload validation: SHA-256 and required writeback fields", () => {
  assert.strictEqual(isValidSha256Hex("a".repeat(64)), true);
  assert.strictEqual(isValidSha256Hex("zz"), false);

  const ok = evaluateAssetUploadFields({
    uploadStatus: "Uploaded",
    canonicalFileUrl: "https://cdn.example.com/file.mp4",
    storageKey: "shooting-challenge/file.mp4",
    fileContentHash: "b".repeat(64),
    fileHashAlgorithm: "SHA-256",
  });
  assert.strictEqual(ok.ok, true);

  const bad = evaluateAssetUploadFields({
    uploadStatus: "Processing",
    canonicalFileUrl: "http://insecure.example.com/x",
    storageKey: "",
    fileContentHash: "short",
  });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.failures.includes("upload_status_not_uploaded"));
  assert.ok(bad.failures.includes("canonical_url_missing_or_insecure"));
  assert.ok(bad.failures.includes("storage_key_missing"));
  assert.ok(bad.failures.includes("file_hash_invalid"));
});

// --- C-010 Active? / Progress Processing guards ---
test("Active? processing guard: inactive enrollment skips (not error)", () => {
  assert.strictEqual(isBooleanishTrue(false), false);
  assert.strictEqual(isBooleanishTrue("checked", false), true);

  const inactive = evaluateEnrollmentProcessingGuard({ enrollmentActive: false });
  assert.strictEqual(inactive.allow, false);
  assert.strictEqual(inactive.statusOut, "skipped");
  assert.strictEqual(inactive.actionOut, "skipped_inactive_enrollment");

  const active = evaluateEnrollmentProcessingGuard({ enrollmentActive: true });
  assert.strictEqual(active.allow, true);
  assert.strictEqual(active.actionOut, "continue");
});

test("Active? processing guard: Progress Processing Enabled? optional field", () => {
  const disabled = evaluateEnrollmentProcessingGuard({
    enrollmentActive: true,
    progressFieldExists: true,
    progressProcessingEnabled: false,
  });
  assert.strictEqual(disabled.allow, false);
  assert.strictEqual(disabled.actionOut, "skipped_progress_disabled");

  const missingField = evaluateEnrollmentProcessingGuard({
    enrollmentActive: true,
    progressFieldExists: false,
    progressProcessingEnabled: false,
  });
  assert.strictEqual(missingField.allow, true);

  assert.ok(ENROLLMENT_ACTIVE_GUARD_COVERAGE.guarded.includes("066"));
  assert.ok(ENROLLMENT_ACTIVE_GUARD_COVERAGE.guarded.includes("117a"));
  assert.ok(ENROLLMENT_ACTIVE_GUARD_COVERAGE.gaps.includes("010"));
  assert.ok(ENROLLMENT_ACTIVE_GUARD_COVERAGE.gaps.includes("072"));
});

// --- C-011 weekly summary dedupe / resend prevention ---
test("weekly summary build gate: manual Build Now + already-sent skip", () => {
  assert.deepStrictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: false, emailSent: false, autoMode: false }).action,
    "skip_build_not_armed",
  );
  assert.deepStrictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: true, emailSent: true, autoMode: false }).action,
    "skip_already_sent",
  );
  assert.deepStrictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: true, emailSent: false, autoMode: false }).action,
    "manual_build",
  );
  assert.deepStrictEqual(
    evaluateWeeklySummaryBuildGate({ buildNow: false, emailSent: false, autoMode: true }).action,
    "auto_build",
  );
});

test("weekly summary send gate: 074 duplicate send blocked", () => {
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: true,
      sendToMake: true,
    }).action,
    "error_duplicate_send_blocked",
  );
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: false,
      emailSent: false,
      sendToMake: true,
    }).action,
    "error_not_ready",
  );
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: false,
      sendToMake: false,
    }).action,
    "error_send_not_armed",
  );
  assert.strictEqual(
    evaluateWeeklySummarySendGate({
      emailReady: true,
      emailSent: false,
      sendToMake: true,
    }).action,
    "send",
  );
});

test("automatic weekly summary: resend prevention + inactive skip", () => {
  assert.strictEqual(
    decideAutomaticWeeklySummaryAction({
      emailSent: true,
      emailReady: true,
      hasPackage: true,
      enrollmentActive: true,
    }).action,
    "skip_already_sent",
  );
  assert.strictEqual(
    decideAutomaticWeeklySummaryAction({
      emailSent: false,
      emailReady: true,
      hasPackage: true,
      enrollmentActive: false,
    }).action,
    "skip_inactive_enrollment",
  );
  assert.strictEqual(
    decideAutomaticWeeklySummaryAction({
      emailSent: false,
      emailReady: true,
      hasPackage: true,
      enrollmentActive: true,
    }).action,
    "send_existing_package",
  );
  assert.strictEqual(
    decideAutomaticWeeklySummaryAction({
      emailSent: false,
      emailReady: false,
      hasPackage: false,
      enrollmentActive: true,
    }).action,
    "build_then_send",
  );
});

// --- HW17 / 009 attachment-slot mapping + duplicate handling ---
test("009 attachment-slot mapping: HW1/HW2/VIDEO + duplicate source ids skipped", () => {
  assert.strictEqual(ASSET_SLOT_SOURCES.length, 3);

  const plan = mapAttachmentsToAssetSlotPlans({
    hw1Files: [{ id: "attHw1a", filename: "tracker.pdf" }],
    hw2Files: [
      { id: "attHw2a", filename: "note.pdf" },
      { id: "attHw2a", filename: "note-dup.pdf" },
    ],
    videoFiles: [{ id: "attVid1", filename: "form.mp4" }],
    existingSourceAttachmentIds: ["attHw1a"],
  });

  assert.strictEqual(plan.creates.length, 2);
  assert.strictEqual(plan.creates[0].slot, "HW2");
  assert.strictEqual(plan.creates[0].label, "HW2-1");
  assert.strictEqual(plan.creates[1].slot, "VIDEO");
  assert.ok(plan.skipped.some((row) => row.reason === "asset_already_exists" && row.slot === "HW1"));
  assert.ok(plan.skipped.some((row) => row.reason === "asset_already_exists" && row.file === "note-dup.pdf"));

  const missing = mapAttachmentsToAssetSlotPlans({
    hw1Files: [{ filename: "no-id.pdf" }],
  });
  assert.strictEqual(missing.creates.length, 0);
  assert.strictEqual(missing.skipped[0].reason, "missing_attachment_id");
});

test("020 inferHomeworkAssetSlot from slot / purpose / label", () => {
  assert.strictEqual(inferHomeworkAssetSlot({ assetSlot: "HW1" }), "HW1");
  assert.strictEqual(inferHomeworkAssetSlot({ assetPurpose: "Homework 2" }), "HW2");
  assert.strictEqual(inferHomeworkAssetSlot({ assetLabel: "VID-1" }), "VIDEO");
  assert.strictEqual(inferHomeworkAssetSlot({ assetLabel: "other" }), "");
});

test("HW17 quiz intake: Enrollment+Week+Homework dedupe; C-009 no-asset gap", () => {
  const hw = "recHomework000001";
  const created = decideHw17QuizIntakeAction({
    enrollmentId: ENR,
    weekId: WEEK,
    homeworkId: hw,
    existingCompletionIdsForKey: [],
    hasAttachment: false,
  });
  assert.strictEqual(created.action, "created_new");
  assert.strictEqual(created.c009Gap, true);
  assert.strictEqual(created.hasAssetSlot, false);

  const linked = decideHw17QuizIntakeAction({
    enrollmentId: ENR,
    weekId: WEEK,
    homeworkId: hw,
    existingCompletionIdsForKey: [HW],
    hasAttachment: false,
  });
  assert.strictEqual(linked.action, "linked_existing");
  assert.strictEqual(linked.completionId, HW);

  const ambiguous = decideHw17QuizIntakeAction({
    enrollmentId: ENR,
    weekId: WEEK,
    homeworkId: hw,
    existingCompletionIdsForKey: [HW, "recHomeworkComp002"],
  });
  assert.strictEqual(ambiguous.action, "error");
  assert.strictEqual(ambiguous.reason, "ambiguous_hw17_duplicate_completions");

  const already = decideHw17QuizIntakeAction({
    enrollmentId: ENR,
    weekId: WEEK,
    homeworkId: hw,
    alreadyLinkedCompletionId: HW,
  });
  assert.strictEqual(already.action, "skipped_already_linked");
});

console.log("\nAll v2-engine-contracts tests passed.");
