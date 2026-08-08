import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGateRulesSignature,
  buildProgressionSignature,
  shouldQueueRecalculation,
} from "../lib/041-recalculation-coverage.mjs";

const baseEnrollment = {
  id: "rec-enrollment",
  "Lifetime XP Total": 100,
  "Lifetime XP Manual Adjustments": 0,
  "Total Submissions": 10,
  "Total Homework Completions": 2,
  "Total Video Submissions": 3,
  "Total Zoom Attendances": 1,
  "Longest Streak Days": 4,
  "School Year": "2026-2027",
  "Current Level": "Rookie Shooter",
  "Next Level": "Developing Shooter",
  "Level Gate Rule": "Level 2 Gate",
  "Level Status": "Gate Blocked",
  "Active?": true,
};

const baseGateRules = [
  {
    id: "rule-2",
    level: "level-2",
    schoolYear: "2026-2027",
    ruleSet: "2026-2027",
    versionActive: true,
    gateEnabled: true,
    minimumSubmissions: 10,
    minimumHomework: 2,
    minimumVideos: 3,
    minimumZoomMeetings: 1,
    minimumStreakDays: 4,
  },
];

function signatureFor(changes = {}, gateRules = baseGateRules) {
  return buildProgressionSignature({ ...baseEnrollment, ...changes }, gateRules);
}

test("positive XP changes the progression signature", () => {
  assert.notEqual(
    signatureFor(),
    signatureFor({ "Lifetime XP Total": 120 })
  );
});

test("XP deactivation and downward correction change the signature", () => {
  assert.notEqual(signatureFor(), signatureFor({ "Lifetime XP Total": 0 }));
  assert.notEqual(
    signatureFor(),
    signatureFor({ "Lifetime XP Total": 90 })
  );
});

test("manual XP adjustments change the signature", () => {
  assert.notEqual(
    signatureFor(),
    signatureFor({ "Lifetime XP Manual Adjustments": -10 })
  );
});

test("each non-XP gate statistic changes the signature", () => {
  for (const fieldName of [
    "Total Submissions",
    "Total Homework Completions",
    "Total Video Submissions",
    "Total Zoom Attendances",
    "Longest Streak Days",
  ]) {
    const changed = { [fieldName]: baseEnrollment[fieldName] + 1 };
    assert.notEqual(signatureFor(), signatureFor(changed), fieldName);
  }
});

test("school year changes the signature", () => {
  assert.notEqual(
    signatureFor(),
    signatureFor({ "School Year": "2025-2026" })
  );
});

test("active status changes the signature", () => {
  assert.notEqual(signatureFor(), signatureFor({ "Active?": false }));
});

test("042-owned output changes do not create signature churn", () => {
  assert.equal(
    signatureFor(),
    signatureFor({
      "Current Level": "Developing Shooter",
      "Next Level": "Consistent Shooter",
      "Level Gate Rule": "Level 3 Gate",
      "Level Status": "Assigned",
    })
  );
});

test("active gate-rule threshold/version changes change the signature", () => {
  assert.notEqual(
    signatureFor(),
    signatureFor({}, [
      { ...baseGateRules[0], minimumVideos: 4 },
    ])
  );
  assert.notEqual(
    signatureFor(),
    signatureFor({}, [
      { ...baseGateRules[0], versionActive: false },
    ])
  );
});

test("gate-rule ordering does not create signature churn", () => {
  const reversed = [
    { ...baseGateRules[0], id: "rule-3", level: "level-3" },
    baseGateRules[0],
  ];
  const normal = [
    baseGateRules[0],
    { ...baseGateRules[0], id: "rule-3", level: "level-3" },
  ];
  assert.deepEqual(buildGateRulesSignature(normal), buildGateRulesSignature(reversed));
});

test("new signatures queue exactly once", () => {
  const currentSignature = signatureFor();
  assert.deepEqual(
    shouldQueueRecalculation({
      currentSignature,
      lastQueuedSignature: "",
      levelRecalcNeeded: false,
    }),
    { queue: true, reason: "initial_signature" }
  );
  assert.deepEqual(
    shouldQueueRecalculation({
      currentSignature,
      lastQueuedSignature: currentSignature,
      levelRecalcNeeded: false,
    }),
    { queue: false, reason: "unchanged_signature" }
  );
});

test("pending queue state prevents repeated writes", () => {
  assert.deepEqual(
    shouldQueueRecalculation({
      currentSignature: "new",
      lastQueuedSignature: "old",
      levelRecalcNeeded: true,
    }),
    { queue: false, reason: "already_pending" }
  );
});

