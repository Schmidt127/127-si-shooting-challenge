/**
 * Combined Zoom credit contract tests (Perfect Week + level gates).
 * Run: node airtable/automations/shooting-challenge/lib/c025-stage17-combined-zoom-credit.test.js
 */

const fs = require("fs");
const path = require("path");
const c = require("./c025-stage17-combined-zoom-credit");
const stage17 = require("./c025-stage17-zoom-attendance");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

const root = path.join(__dirname, "..");

test("Perfect Week: live attendance only", () => {
  const r = c.countPerfectWeekZoomAttendance({
    weekMeetingIds: ["m1", "m2"],
    liveAttendedMeetingIds: ["m1"],
    qualifyingRecordingMeetingIds: [],
  });
  assert(r.zoomMeetingCount === 2 && r.zoomAttendanceCount === 1, "live only");
});

test("Perfect Week: recording credit only", () => {
  const r = c.countPerfectWeekZoomAttendance({
    weekMeetingIds: ["m1"],
    liveAttendedMeetingIds: [],
    qualifyingRecordingMeetingIds: ["m1"],
  });
  assert(r.zoomAttendanceCount === 1, "recording only");
});

test("Perfect Week: live plus recording same meeting counts once", () => {
  const r = c.countPerfectWeekZoomAttendance({
    weekMeetingIds: ["m1"],
    liveAttendedMeetingIds: ["m1"],
    qualifyingRecordingMeetingIds: ["m1"],
  });
  assert(r.zoomAttendanceCount === 1, "dedupe");
});

test("Perfect Week: conflict/unapproved/needs-correction excluded", () => {
  assert(
    !c.isQualifyingRecordingForPerfectWeek({
      attendanceMethod: "Recording Quiz",
      enrollmentId: "e",
      meetingId: "m",
      approved: true,
      conflict: true,
      effectiveCountsForPerfectWeek: true,
    }),
    "conflict"
  );
  assert(
    !c.isQualifyingRecordingForPerfectWeek({
      attendanceMethod: "Recording Quiz",
      enrollmentId: "e",
      meetingId: "m",
      approved: false,
      conflict: false,
      effectiveCountsForPerfectWeek: true,
    }),
    "unapproved"
  );
  assert(
    !c.isQualifyingRecordingForPerfectWeek({
      attendanceMethod: "Recording Quiz",
      enrollmentId: "e",
      meetingId: "m",
      approved: true,
      conflict: false,
      effectiveCountsForPerfectWeek: true,
      reviewStatus: "Needs Correction",
    }),
    "needs correction"
  );
});

test("Perfect Week: week with no Zoom meeting reports zeros (formula auto-passes)", () => {
  const r = c.countPerfectWeekZoomAttendance({
    weekMeetingIds: [],
    liveAttendedMeetingIds: [],
    qualifyingRecordingMeetingIds: ["m1"],
  });
  assert(r.zoomMeetingCount === 0 && r.zoomAttendanceCount === 0, "no meetings");
});

test("Level gate: combine live and recording with precedence", () => {
  const combined = c.combineEnrollmentMeetingCredits({
    liveMeetingIds: ["m1"],
    recordingRows: [
      { meetingId: "m1", zoomAttendanceId: "za1" },
      { meetingId: "m2", zoomAttendanceId: "za2" },
      { meetingId: "m3", zoomAttendanceId: "za3" },
    ],
  });
  assert(combined.count === 3, "three distinct meetings");
  assert(combined.byMeeting.m1.source === c.LIVE_SOURCE, "prefer live");
  assert(combined.byMeeting.m2.source === c.RECORDING_SOURCE, "recording m2");
  assert(combined.countedRecordingIds.includes("za2"), "counted za2");
  assert(!combined.countedRecordingIds.includes("za1"), "za1 not counted under live");
});

test("Level gate: gate qualifying filters", () => {
  assert(
    c.isQualifyingRecordingForGate({
      attendanceMethod: "Recording Quiz",
      enrollmentId: "e",
      meetingId: "m",
      approved: true,
      conflict: false,
      gateCreditEarned: true,
    }),
    "ok"
  );
  assert(
    !c.isQualifyingRecordingForGate({
      attendanceMethod: "Recording Quiz",
      enrollmentId: "e",
      meetingId: "m",
      approved: true,
      conflict: false,
      gateCreditEarned: false,
    }),
    "no gate earned"
  );
});

test("Applied flag only after downstream consumption", () => {
  assert(c.planAppliedFlagUpdate({ alreadyApplied: false, countedByDownstream: false }).action === "not_consumed_downstream");
  assert(c.planAppliedFlagUpdate({ alreadyApplied: false, countedByDownstream: true }).setApplied === true);
  assert(c.orchestratorMustNotSetAppliedFlags().orchestratorSetsApplied === false);
});

test("Source keys remain distinct; recording never writes Attendees (stage17 lib)", () => {
  const credit = stage17.buildZoomCreditSourceKey("e", "m");
  const live = stage17.buildLiveAttendBaseSourceKey("mk", "e");
  assert(credit !== live, "disjoint");
  const orch = fs.readFileSync(path.join(root, "117-zoom-recording-credit-orchestrator.js"), "utf8");
  assert(stage17.assertNeverWritesLiveAttendees(orch).ok, "orch no attendees write");
});

test("Multiple distinct meetings increase gate count", () => {
  const combined = c.combineEnrollmentMeetingCredits({
    liveMeetingIds: ["m1", "m2"],
    recordingRows: [{ meetingId: "m3", zoomAttendanceId: "za3" }],
  });
  assert(combined.count === 3, "3 meetings");
});

console.log("\nAll c025-stage17-combined-zoom-credit tests passed.");
