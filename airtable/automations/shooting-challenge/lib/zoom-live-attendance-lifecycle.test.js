/**
 * PKG-034 offline lifecycle tests.
 * Run: node airtable/automations/shooting-challenge/lib/zoom-live-attendance-lifecycle.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const c = require("./zoom-live-attendance-lifecycle");

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const baseContext = {
  meetingId: "recMeeting",
  meetingKey: "recMeeting",
  attendeeIds: ["recEnrollment"],
  weekIds: ["recWeek"],
  meetingStatus: "Completed",
};

const eligible = {
  enrollmentId: "recEnrollment",
  active: true,
  programInstanceIds: ["recProgram"],
  schoolYear: "2026-2027",
};

const week = {
  weekId: "recWeek",
  programInstanceIds: ["recProgram"],
  schoolYear: "2026-2027",
};

function expected() {
  return {
    sourceKey: c.buildLiveSourceKey("recMeeting", "recEnrollment"),
    enrollmentId: "recEnrollment",
    meetingId: "recMeeting",
    weekId: "recWeek",
  };
}

test("qualifying live attendance creates one canonical event", () => {
  const result = c.planAward({
    eligible: true,
    expected: expected(),
    events: [],
    weeklySummaryIds: ["recWas"],
  });
  assert.strictEqual(result.action, "create_after_last_chance_recheck");
});

test("replay reuses the same active event", () => {
  const event = {
    id: "recXp",
    sourceKey: expected().sourceKey,
    enrollmentIds: ["recEnrollment"],
    zoomMeetingIds: ["recMeeting"],
    weekIds: ["recWeek"],
    active: true,
  };
  const result = c.planAward({
    eligible: true,
    expected: expected(),
    events: [event],
    weeklySummaryIds: ["recWas"],
  });
  assert.strictEqual(result.action, "repair_or_replay_same_event");
  assert.strictEqual(result.eventId, "recXp");
});

test("withdrawal deactivates, restoration reactivates the same event", () => {
  const event = {
    id: "recXp",
    sourceKey: expected().sourceKey,
    enrollmentIds: ["recEnrollment"],
    zoomMeetingIds: ["recMeeting"],
    weekIds: ["recWeek"],
    active: true,
  };
  const withdrawn = c.planAward({
    eligible: false,
    expected: expected(),
    events: [event],
    weeklySummaryIds: [],
  });
  assert.strictEqual(withdrawn.action, "deactivate_same_event");
  event.active = false;
  const restored = c.planAward({
    eligible: true,
    expected: expected(),
    events: [event],
    weeklySummaryIds: ["recWas"],
  });
  assert.strictEqual(restored.action, "reactivate_same_event");
  assert.strictEqual(restored.eventId, "recXp");
});

test("inactive Enrollment deactivates an owned event", () => {
  const result = c.planAward({
    eligible: false,
    expected: expected(),
    events: [{
      id: "recXp",
      sourceKey: expected().sourceKey,
      enrollmentIds: ["recEnrollment"],
      zoomMeetingIds: ["recMeeting"],
      weekIds: ["recWeek"],
      active: true,
    }],
    weeklySummaryIds: [],
  });
  assert.strictEqual(result.action, "deactivate_same_event");
});

test("exact cardinality keeps roster plural but rejects multiple Week links", () => {
  const result = c.validateMeetingContext({
    ...baseContext,
    attendeeIds: ["recEnrollment", "recOther"],
    weekIds: ["recWeek", "recOtherWeek"],
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.errors.length, 1);
});

test("Program Instance and School Year mismatches fail closed", () => {
  const mismatch = c.validateProgramScope(
    c.validateEnrollmentContext(eligible),
    c.validateWeekContext({ ...week, schoolYear: "2027-2028" }),
  );
  assert.strictEqual(mismatch.ok, false);
  assert.strictEqual(mismatch.errors.length, 1);
  const inactive = c.validateEnrollmentContext({ ...eligible, active: false });
  assert.strictEqual(inactive.ok, false);
});

test("zero or multiple WAS blocks positive creation", () => {
  for (const weeklySummaryIds of [[], ["recWas", "recOtherWas"]]) {
    const result = c.planAward({
      eligible: true,
      expected: expected(),
      events: [],
      weeklySummaryIds,
    });
    assert.strictEqual(result.action, "error_weekly_summary_ambiguity");
  }
});

test("wrong owner and duplicate canonical events fail closed", () => {
  const wrongOwner = c.planAward({
    eligible: true,
    expected: expected(),
    events: [{
      id: "recStolen",
      sourceKey: expected().sourceKey,
      enrollmentIds: ["recOtherEnrollment"],
      zoomMeetingIds: ["recMeeting"],
      weekIds: ["recWeek"],
      active: true,
    }],
    weeklySummaryIds: ["recWas"],
  });
  assert.strictEqual(wrongOwner.action, "error_wrong_owner");

  const duplicate = c.planAward({
    eligible: true,
    expected: expected(),
    events: [
      { id: "recXp1", sourceKey: expected().sourceKey, enrollmentIds: ["recEnrollment"], zoomMeetingIds: ["recMeeting"], weekIds: ["recWeek"], active: true },
      { id: "recXp2", sourceKey: expected().sourceKey, enrollmentIds: ["recEnrollment"], zoomMeetingIds: ["recMeeting"], weekIds: ["recWeek"], active: true },
    ],
    weeklySummaryIds: ["recWas"],
  });
  assert.strictEqual(duplicate.action, "error_duplicate_canonical_event");
});

test("last-chance recheck detects concurrent creation", () => {
  const first = c.lastChanceCreateDecision([], expected());
  assert.strictEqual(first.action, "safe_to_create");
  const concurrent = c.lastChanceCreateDecision([{
    id: "recConcurrent",
    sourceKey: expected().sourceKey,
    enrollmentIds: ["recEnrollment"],
    zoomMeetingIds: ["recMeeting"],
    weekIds: ["recWeek"],
    active: true,
  }], expected());
  assert.strictEqual(concurrent.action, "reuse_existing_same_event");
});

test("partial writeback is surfaced and XP Events are never deleted", () => {
  const result = c.writebackResult({
    eventWrite: { ok: true, label: "XP Event" },
    wasWrite: { ok: false, label: "WAS backlink" },
    meetingWrite: { ok: true, label: "Zoom Meeting" },
  });
  assert.strictEqual(result.ok, false);
  assert.match(result.warning, /WAS backlink/);
  const automationSource = fs.readFileSync(
    path.join(__dirname, "..", "101-zoom-attendance-xp-award-meeting-xp.js"),
    "utf8",
  );
  assert.strictEqual(automationSource.includes("deleteRecordAsync"), false);
});

test("formula lag does not acknowledge the starting signature", () => {
  const unsettled = c.settleSignature({
    currentSignature: "fresh",
    startingSignature: "start",
    freshSignature: "start",
    needed: 1,
  });
  assert.strictEqual(unsettled.acknowledged, false);
  const settled = c.settleSignature({
    currentSignature: "fresh",
    startingSignature: "start",
    freshSignature: "fresh",
    needed: 0,
  });
  assert.strictEqual(settled.acknowledged, true);
});

test("recording source family is not live attendance", () => {
  assert.strictEqual(c.isLiveSourceKey("ZOOM_CREDIT|recEnrollment|recMeeting"), false);
  assert.strictEqual(c.parseLiveSourceKey(expected().sourceKey).meetingKey, "recMeeting");
});

console.log("\nAll PKG-034 offline lifecycle tests passed.");
