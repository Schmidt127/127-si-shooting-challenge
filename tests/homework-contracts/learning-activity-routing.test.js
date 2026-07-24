#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  resolveHomeworkCompletionRouting,
  shouldCreateOrUpdateHomeworkCompletion,
  planSubmissionAssetFanout,
  assertStandAloneDoesNotCreateHomeworkCompletion,
  resolveLearningActivityXpOwnership,
  resolveAssetRoutingForMethod,
} = require("../../lib/homework-contracts/learning-activity-routing");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const HW = "recHWAssign000001";

test("linked + countsAsHomework routes to HC", () => {
  const d = resolveHomeworkCompletionRouting({
    id: "recLA000000000001",
    homeworkId: HW,
    countsAsHomework: true,
    active: true,
  });
  assert.strictEqual(d.action, "create_or_update_homework_completion");
  assert.strictEqual(d.homeworkId, HW);
  assert.strictEqual(shouldCreateOrUpdateHomeworkCompletion({
    homeworkId: HW,
    countsAsHomework: true,
    active: true,
  }), true);
});

test("stand-alone does not create HC", () => {
  const d = resolveHomeworkCompletionRouting({
    homeworkId: null,
    countsAsHomework: false,
    active: true,
  });
  assert.strictEqual(d.action, "no_homework_completion");
  assert.strictEqual(d.reason, "stand_alone_no_homework_link");
});

test("linked but not counting does not create HC", () => {
  const d = resolveHomeworkCompletionRouting({
    homeworkId: HW,
    countsAsHomework: false,
    active: true,
  });
  assert.strictEqual(d.reason, "homework_linked_but_not_configured_to_count");
});

test("inactive activity blocked", () => {
  assert.strictEqual(
    resolveHomeworkCompletionRouting({
      homeworkId: HW,
      countsAsHomework: true,
      active: false,
    }).reason,
    "activity_inactive"
  );
});

test("asset fanout filters empty filenames", () => {
  const plan = planSubmissionAssetFanout({
    id: "recLAR00000000001",
    uploadIntents: [
      { filename: "a.pdf", purpose: "homework_file" },
      { filename: "", purpose: "other" },
    ],
  });
  assert.strictEqual(plan.processingLayer, "Submission Assets");
  assert.strictEqual(plan.assetIntents.length, 1);
});

test("invalid countsAsHomework without link throws", () => {
  assert.throws(() =>
    assertStandAloneDoesNotCreateHomeworkCompletion({
      homeworkId: null,
      countsAsHomework: true,
    })
  );
});

test("XP ownership is 064/065 only", () => {
  const xp = resolveLearningActivityXpOwnership();
  assert.strictEqual(xp.xpOwnerAutomation, "065");
  assert.ok(xp.forbidden.includes("direct_xp_from_learning_activity_response"));
});

test("quiz method does not require attachment", () => {
  const r = resolveAssetRoutingForMethod("quiz");
  assert.strictEqual(r.requiresAttachment, false);
});

console.log("learning-activity-routing tests passed");
