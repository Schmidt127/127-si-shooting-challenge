#!/usr/bin/env node
/** 070a Submission - Linked gate — offline contract tests (SC-STRUCTURED-HOMEWORK-FILES-001). */

const assert = require("assert");
const { evaluateSubmissionLinkedGate } = require("./070a-submission-gate");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("HC destination + HC link + Enrollment allows blank Submission", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Homework Completions",
    submissionLinkedCount: 0,
    enrollmentLinkedCount: 1,
    homeworkCompletionsLinkedCount: 1,
    targetRecordId: "recHc000000000001",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.allowBlankSubmission, true);
});

test("HC destination + HC RID + Enrollment allows blank Submission", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Homework Completions",
    submissionLinkedCount: 0,
    enrollmentLinkedCount: 1,
    homeworkCompletionsLinkedCount: 0,
    homeworkCompletionsRid: "recHc000000000002",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.allowBlankSubmission, true);
});

test("legacy path still requires Submission when no HC", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Homework Completions",
    submissionLinkedCount: 0,
    enrollmentLinkedCount: 1,
    homeworkCompletionsLinkedCount: 0,
    homeworkCompletionsRid: "",
    targetRecordId: "",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actionOut, "error_missing_submission");
});

test("Video Feedback still requires Submission when blank", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Video Feedback",
    submissionLinkedCount: 0,
    enrollmentLinkedCount: 1,
    targetRecordId: "recVf000000000001",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.actionOut, "error_missing_submission");
});

test("HC destination without Enrollment still requires Submission", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Homework Completions",
    submissionLinkedCount: 0,
    enrollmentLinkedCount: 0,
    homeworkCompletionsLinkedCount: 1,
    targetRecordId: "recHc000000000001",
  });
  assert.strictEqual(result.ok, false);
});

test("legacy path with Submission present is ok", () => {
  const result = evaluateSubmissionLinkedGate({
    uploadDestination: "Homework Completions",
    submissionLinkedCount: 1,
    enrollmentLinkedCount: 1,
    homeworkCompletionsLinkedCount: 1,
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.allowBlankSubmission, false);
});

console.log("All 070a-submission-gate tests passed.");
