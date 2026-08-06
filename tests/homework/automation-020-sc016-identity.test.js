/**
 * Offline unit tests for 020 v3.2 enrollment-scoped HC identity (SC-016).
 */
const assert = require("assert");

function firstLinkedId(record, field) {
  const v = record.fields?.[field];
  if (Array.isArray(v)) return v[0] || "";
  return "";
}

function getHomeworkSlot(record) {
  return record.fields["Asset Slot"] || record.fields["Item Slot"] || "";
}

function pickPreferred(candidates) {
  return [...candidates].sort((a, b) => {
    const aSat = a.fields["Satisfactory?"] ? 1 : 0;
    const bSat = b.fields["Satisfactory?"] ? 1 : 0;
    if (bSat !== aSat) return bSat - aSat;
    return a.id.localeCompare(b.id);
  })[0];
}

function findHomeworkCompletionMatch(records, { submissionId, enrollmentId, weekId, homeworkId, slot }) {
  if (enrollmentId && weekId && homeworkId && slot) {
    const enrollmentCandidates = records.filter((hw) => {
      return (
        firstLinkedId(hw, "Enrollment") === enrollmentId &&
        firstLinkedId(hw, "Week") === weekId &&
        firstLinkedId(hw, "Homework") === homeworkId &&
        getHomeworkSlot(hw) === slot
      );
    });
    if (enrollmentCandidates.length > 0) {
      return {
        homeworkCompletion: pickPreferred(enrollmentCandidates),
        matchType: "enrollment_week_homework_slot",
        candidateCount: enrollmentCandidates.length,
      };
    }
  }

  const exact = records.filter(
    (hw) =>
      firstLinkedId(hw, "Submissions - Linked") === submissionId &&
      firstLinkedId(hw, "Homework") === homeworkId &&
      getHomeworkSlot(hw) === slot
  );
  if (exact.length) {
    return { homeworkCompletion: exact[0], matchType: "exact", candidateCount: exact.length };
  }
  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
}

const enr = "recENR";
const week = "recWEEK";
const hw = "recHW";
const slot = "HW1";

const existing = {
  id: "recKEEP",
  fields: {
    Enrollment: [enr],
    Week: [week],
    Homework: [hw],
    "Item Slot": slot,
    "Submissions - Linked": ["recSUB1"],
    "Satisfactory?": true,
  },
};

const newerSubmissionAssetContext = {
  submissionId: "recSUB2",
  enrollmentId: enr,
  weekId: week,
  homeworkId: hw,
  slot,
};

const match = findHomeworkCompletionMatch([existing], newerSubmissionAssetContext);
assert.strictEqual(match.matchType, "enrollment_week_homework_slot");
assert.strictEqual(match.homeworkCompletion.id, "recKEEP");
assert.strictEqual(match.candidateCount, 1);

const noEnrMatch = findHomeworkCompletionMatch(
  [
    {
      id: "recOTHER",
      fields: {
        Enrollment: ["recOTHERENR"],
        Week: [week],
        Homework: [hw],
        "Item Slot": slot,
        "Submissions - Linked": ["recSUB2"],
      },
    },
  ],
  newerSubmissionAssetContext
);
assert.strictEqual(noEnrMatch.matchType, "exact");
assert.strictEqual(noEnrMatch.homeworkCompletion.id, "recOTHER");

console.log("PASS automation-020-sc016-identity");
