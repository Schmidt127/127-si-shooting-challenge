/**
 * Offline tests for expected-versus-actual verifier.
 * Run: node --test tools/testing/tests/test_expected_actual.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyDailySubmissionBundle,
  verifyXpIdempotencyInventory,
  expectedSourceKey,
  STATUSES,
} from "../lib/expected_actual.js";

const ENR = "recgP9qZYjAhE7NXm";
const SUB = "recuuTBgstSTGg2E3";
const WEEK = "recVDKiYATgzsfpmE";
const WAS = "rechWp330MqSgRWzN";

test("daily bundle PASS for known live-shaped fixture", () => {
  const result = verifyDailySubmissionBundle({
    scenario: {
      id: "recPdyfYRFgDtpzQ8",
      fields: {
        "Last Run Status": { name: "Pass" },
        "Run Test?": false,
        "Linked Submission": [{ id: SUB }],
      },
    },
    submission: {
      id: SUB,
      fields: {
        Enrollment: [{ id: ENR }],
        "Shot Total": 25,
        "Duplicate Review Status": { name: "Count It" },
        Week: [{ id: WEEK }],
      },
    },
    xpEvents: [
      {
        id: "recOodD23MQrP1O9F",
        fields: {
          "Source Key": `SUBMISSION_XP|${SUB}`,
          "XP Points": 20,
        },
      },
    ],
    wasRecords: [
      {
        id: WAS,
        fields: {
          Enrollment: [{ id: ENR }],
          Week: [{ id: WEEK }],
        },
      },
    ],
    expect: {
      enrollmentId: ENR,
      shotTotal: 25,
      xpAmount: 20,
      requireWeek: true,
    },
  });
  assert.equal(result.overall, STATUSES.PASS);
  assert.equal(result.counts.FAIL, 0);
});

test("daily bundle FAIL when XP Source Key duplicated", () => {
  const result = verifyDailySubmissionBundle({
    scenario: {
      id: "recSCENARIO",
      fields: {
        "Last Run Status": { name: "Pass" },
        "Run Test?": false,
        "Linked Submission": [{ id: SUB }],
      },
    },
    submission: {
      id: SUB,
      fields: {
        Enrollment: [{ id: ENR }],
        "Shot Total": 25,
        "Duplicate Review Status": { name: "Count It" },
        Week: [{ id: WEEK }],
      },
    },
    xpEvents: [
      { id: "recXP1", fields: { "Source Key": `SUBMISSION_XP|${SUB}`, "XP Points": 20 } },
      { id: "recXP2", fields: { "Source Key": `SUBMISSION_XP|${SUB}`, "XP Points": 20 } },
    ],
    wasRecords: [
      { id: WAS, fields: { Enrollment: [{ id: ENR }], Week: [{ id: WEEK }] } },
    ],
    expect: { enrollmentId: ENR, requireWeek: true },
  });
  assert.equal(result.overall, STATUSES.FAIL);
  const xpCount = result.checks.find((c) => c.id === "xp.count_for_submission_source_key");
  assert.equal(xpCount.status, STATUSES.FAIL);
  assert.equal(xpCount.expected, 1);
  assert.equal(xpCount.actual, 2);
  assert.ok(xpCount.probable_cause);
  assert.ok(xpCount.suggested_next_action);
});

test("dry run mode: submission must not exist", () => {
  const result = verifyDailySubmissionBundle({
    scenario: {
      id: "recSCENARIO",
      fields: { "Last Run Status": { name: "Pass" }, "Run Test?": false },
    },
    submission: null,
    xpEvents: [],
    wasRecords: [],
    expect: { mode: "dry_run" },
  });
  assert.equal(result.overall, STATUSES.PASS);
});

test("WAS uniqueness FAIL when two WAS share Enrollment+Week", () => {
  const result = verifyDailySubmissionBundle({
    scenario: {
      id: "recSCENARIO",
      fields: {
        "Last Run Status": { name: "Pass" },
        "Run Test?": false,
        "Linked Submission": [{ id: SUB }],
      },
    },
    submission: {
      id: SUB,
      fields: {
        Enrollment: [{ id: ENR }],
        "Shot Total": 25,
        "Duplicate Review Status": { name: "Count It" },
        Week: [{ id: WEEK }],
      },
    },
    xpEvents: [
      { id: "recXP1", fields: { "Source Key": `SUBMISSION_XP|${SUB}`, "XP Points": 20 } },
    ],
    wasRecords: [
      { id: "recWAS1", fields: { Enrollment: [{ id: ENR }], Week: [{ id: WEEK }] } },
      { id: "recWAS2", fields: { Enrollment: [{ id: ENR }], Week: [{ id: WEEK }] } },
    ],
    expect: { enrollmentId: ENR, requireWeek: true },
  });
  assert.equal(result.overall, STATUSES.FAIL);
  const uniq = result.checks.find((c) => c.id === "was.unique_enrollment_week");
  assert.equal(uniq.status, STATUSES.FAIL);
});

test("XP inventory detects blank and duplicate Source Keys", () => {
  const result = verifyXpIdempotencyInventory([
    { id: "a", fields: { "Source Key": "SUBMISSION_XP|rec1" } },
    { id: "b", fields: { "Source Key": "SUBMISSION_XP|rec1" } },
    { id: "c", fields: { "Source Key": "" } },
  ]);
  assert.equal(result.overall, STATUSES.FAIL);
  assert.equal(result.checks.find((c) => c.id === "xp.blank_source_keys").actual, 1);
  assert.equal(result.checks.find((c) => c.id === "xp.unique_source_keys").status, STATUSES.FAIL);
});

test("expectedSourceKey contracts match documented prefixes", () => {
  assert.equal(
    expectedSourceKey("Submission Base", { submissionId: "recS" }),
    "SUBMISSION_XP|recS"
  );
  assert.equal(
    expectedSourceKey("Homework Completion", { homeworkCompletionId: "recH" }),
    "HOMEWORK_XP|recH"
  );
  assert.equal(
    expectedSourceKey("Video Feedback", { videoFeedbackId: "recV" }),
    "VIDEO_SUBMISSION|recV"
  );
  assert.equal(
    expectedSourceKey("Zoom Recording Credit", {
      enrollmentId: "recE",
      meetingId: "recM",
    }),
    "ZOOM_CREDIT|recE|recM"
  );
  assert.equal(
    expectedSourceKey("Perfect Week", { enrollmentId: "recE", weekId: "recW" }),
    "PERFECT_WEEK|recE|recW"
  );
  assert.equal(
    expectedSourceKey("Shot Milestone", {
      enrollmentId: "recE",
      shotMilestoneId: "recM",
    }),
    "SHOT_MILESTONE|recE|recM"
  );
});

test("missing scenario is BLOCKED", () => {
  const result = verifyDailySubmissionBundle({ scenario: null });
  assert.equal(result.overall, STATUSES.BLOCKED);
});
