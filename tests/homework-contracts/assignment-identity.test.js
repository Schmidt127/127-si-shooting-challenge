#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  resolveHomeworkAssignmentIdentity,
  buildHomeworkCompletionIdentityKeyByPha,
  findHomeworkCompletionByAssignmentIdentity,
  resolveAssignmentDueDateKey,
  evaluateHomeworkSubmissionDeadline,
  buildLateSubmissionNote,
} = require("../../lib/homework-contracts/assignment-identity");

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
const PHA = "recPhaAssign00001";
const PHA_B = "recPhaAssign00002";
const LIB = "recLibraryHw0001";
const WEEK = "recWeek0000000001";
const HC = "recHC000000000001";

test("HW1 field + HW1 upload resolves PHA from Homework Name 1", () => {
  const result = resolveHomeworkAssignmentIdentity({
    hw1PhaId: PHA,
    hw2PhaId: "",
    assetUploadSlot: "HW1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.phaId, PHA);
});

test("HW1 assignment uploaded through HW2 slot resolves same PHA identity", () => {
  const result = resolveHomeworkAssignmentIdentity({
    hw1PhaId: PHA,
    hw2PhaId: "",
    assetUploadSlot: "HW2",
  });
  assert.equal(result.ok, true);
  assert.equal(result.phaId, PHA);
  assert.equal(result.alternateUploadSlot, true);
});

test("HW2 field + HW1 upload resolves PHA from Homework Name 2", () => {
  const result = resolveHomeworkAssignmentIdentity({
    hw1PhaId: "",
    hw2PhaId: PHA,
    assetUploadSlot: "HW1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.phaId, PHA);
});

test("dual different assignments without slot field match fails closed", () => {
  const result = resolveHomeworkAssignmentIdentity({
    hw1PhaId: PHA,
    hw2PhaId: PHA_B,
    assetUploadSlot: "HW1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.phaId, PHA);
});

test("dual different assignments with empty slot field fails ambiguous", () => {
  const result = resolveHomeworkAssignmentIdentity({
    hw1PhaId: PHA,
    hw2PhaId: PHA_B,
    assetUploadSlot: "",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ambiguous_dual_assignment");
});

test("canonical dedupe key is enrollment + PHA only", () => {
  assert.equal(
    buildHomeworkCompletionIdentityKeyByPha({ enrollmentId: ENR, phaId: PHA }),
    `HC|enrollment|${ENR}|pha|${PHA}`
  );
});

test("findHomeworkCompletionByAssignmentIdentity matches enrollment + PHA across slots", () => {
  const records = [
    {
      id: HC,
      fields: {
        Enrollment: [ENR],
        "Program Homework Assignment": [PHA],
        Homework: [LIB],
        Week: [WEEK],
        "Item Slot": "HW1",
      },
    },
  ];
  const match = findHomeworkCompletionByAssignmentIdentity(records, {
    enrollmentId: ENR,
    phaId: PHA,
    weekId: WEEK,
    homeworkLibraryId: LIB,
  });
  assert.equal(match.matchType, "enrollment_pha_identity");
  assert.equal(match.homeworkCompletion.id, HC);
});

test("repeat upload links existing HC by PHA identity not upload slot", () => {
  const records = [
    {
      id: HC,
      fields: {
        Enrollment: [ENR],
        "Program Homework Assignment": [PHA],
        Homework: [LIB],
        Week: [WEEK],
        "Item Slot": "HW1",
      },
    },
  ];
  const match = findHomeworkCompletionByAssignmentIdentity(records, {
    enrollmentId: ENR,
    phaId: PHA,
  });
  assert.equal(match.candidateCount, 1);
});

test("cross-enrollment isolation: same PHA does not match other enrollment", () => {
  const otherEnr = "recEnrollment0002";
  const records = [
    {
      id: HC,
      fields: {
        Enrollment: [ENR],
        "Program Homework Assignment": [PHA],
        Homework: [LIB],
        Week: [WEEK],
      },
    },
  ];
  const match = findHomeworkCompletionByAssignmentIdentity(records, {
    enrollmentId: otherEnr,
    phaId: PHA,
  });
  assert.equal(match.homeworkCompletion, null);
});

test("XP dedupe key is one Homework Completion id (HOMEWORK_XP prefix owned by 065)", () => {
  const hcKey = buildHomeworkCompletionIdentityKeyByPha({ enrollmentId: ENR, phaId: PHA });
  assert.equal(hcKey, `HC|enrollment|${ENR}|pha|${PHA}`);
  assert.equal(`HOMEWORK_XP|${HC}`, `HOMEWORK_XP|${HC}`);
});

test("different PHA creates separate identity match space", () => {
  const records = [
    {
      id: HC,
      fields: {
        Enrollment: [ENR],
        "Program Homework Assignment": [PHA],
        Homework: [LIB],
        Week: [WEEK],
      },
    },
  ];
  const match = findHomeworkCompletionByAssignmentIdentity(records, {
    enrollmentId: ENR,
    phaId: PHA_B,
  });
  assert.equal(match.homeworkCompletion, null);
});

test("PHA Due Date overrides Week End Date", () => {
  assert.equal(resolveAssignmentDueDateKey("2026-08-31", "2026-08-24"), "2026-08-31");
});

test("blank PHA Due Date falls back to Week End Date", () => {
  assert.equal(resolveAssignmentDueDateKey("", "2026-08-24"), "2026-08-24");
  assert.equal(resolveAssignmentDueDateKey(null, "8/24/2026"), "2026-08-24");
});

test("on-time submission before due date is credit eligible", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-08-20",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.creditEligible, true);
  assert.equal(result.timingStatus, "on_time");
});

test("late submission after due date is ineligible", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-09-01",
    phaDueDate: "2026-08-31",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.creditEligible, false);
  assert.equal(result.timingStatus, "late_ineligible");
  assert.match(buildLateSubmissionNote(result), /Not eligible for homework credit/);
});

test("PHA Due Date blank uses week end for late check", () => {
  const result = evaluateHomeworkSubmissionDeadline({
    submissionDateKey: "2026-08-25",
    phaDueDate: "",
    weekEndDate: "2026-08-24",
  });
  assert.equal(result.creditEligible, false);
  assert.equal(result.dueDateKey, "2026-08-24");
});

console.log("all assignment-identity tests passed");
