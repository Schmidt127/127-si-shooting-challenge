/**
 * Offline unit tests for 020 v3.8 enrollment + PHA identity (FUT-001).
 */
const assert = require("assert");
const {
  findHomeworkCompletionByAssignmentIdentity,
  buildHomeworkCompletionIdentityKeyByPha,
  evaluateHomeworkSubmissionDeadline,
  resolveHomeworkAssignmentIdentity,
} = require("../../lib/homework-contracts/assignment-identity");

const enr = "recEn000000000001";
const enrOther = "recEn000000000002";
const week = "recWeek0000000001";
const hw = "recHw000000000001";
const pha = "recPa000000000001";

const existing = {
  id: "recKEEP",
  fields: {
    Enrollment: [enr],
    Week: [week],
    Homework: [hw],
    "Program Homework Assignment": [pha],
    "Item Slot": "HW1",
    "Submissions - Linked": ["recSUB1"],
    "Satisfactory?": true,
  },
};

const match = findHomeworkCompletionByAssignmentIdentity([existing], {
  enrollmentId: enr,
  phaId: pha,
  weekId: week,
  homeworkLibraryId: hw,
});
assert.strictEqual(match.matchType, "enrollment_pha_identity");
assert.strictEqual(match.homeworkCompletion.id, "recKEEP");

const alternateSlotContext = {
  enrollmentId: enr,
  phaId: pha,
};
const altMatch = findHomeworkCompletionByAssignmentIdentity([existing], alternateSlotContext);
assert.strictEqual(altMatch.homeworkCompletion.id, "recKEEP");

const wrongPha = findHomeworkCompletionByAssignmentIdentity([existing], {
  enrollmentId: enr,
  phaId: "recPa000000000002",
});
assert.strictEqual(wrongPha.homeworkCompletion, null);

const crossEnrollment = findHomeworkCompletionByAssignmentIdentity([existing], {
  enrollmentId: enrOther,
  phaId: pha,
});
assert.strictEqual(crossEnrollment.homeworkCompletion, null);

const alternateUpload = resolveHomeworkAssignmentIdentity({
  hw1PhaId: pha,
  hw2PhaId: "",
  assetUploadSlot: "HW2",
});
assert.strictEqual(alternateUpload.ok, true);
assert.strictEqual(alternateUpload.alternateUploadSlot, true);

const onTime = evaluateHomeworkSubmissionDeadline({
  submissionDateKey: "2026-08-20",
  phaDueDate: "2026-08-31",
  weekEndDate: "2026-08-24",
});
assert.strictEqual(onTime.creditEligible, true);
assert.strictEqual(onTime.timingStatus, "on_time");

const late = evaluateHomeworkSubmissionDeadline({
  submissionDateKey: "2026-09-01",
  phaDueDate: "2026-08-31",
  weekEndDate: "2026-08-24",
});
assert.strictEqual(late.creditEligible, true);
assert.strictEqual(late.timingStatus, "late");
assert.strictEqual(late.perfectWeekEligible, false);

assert.strictEqual(
  buildHomeworkCompletionIdentityKeyByPha({ enrollmentId: enr, phaId: pha }),
  `HC|enrollment|${enr}|pha|${pha}`
);

console.log("PASS automation-020-sc016-identity");
