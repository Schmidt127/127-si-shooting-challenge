#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildHomeworkCompletionIdentityKey,
  build020MatchKey,
  build067MatchKey,
  assessCanonicalKeySufficiency,
  decideCompletionLinkOrCreate,
} = require("../../lib/homework-contracts/uniqueness");

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
const HW = "recHWAssign000001";
const SUB = "recSubmission0001";
const WEEK = "recWeek0000000001";
const HC1 = "recHC000000000001";
const HC2 = "recHC000000000002";

test("file identity key includes enrollment assignment slot submission", () => {
  const key = buildHomeworkCompletionIdentityKey({
    enrollmentId: ENR,
    homeworkAssignmentId: HW,
    itemSlot: "HW1",
    submissionId: SUB,
    responseKind: "file",
  });
  assert.strictEqual(key, `HC|file|${ENR}|${HW}|HW1|${SUB}`);
});

test("written-only allows missing submission", () => {
  const key = buildHomeworkCompletionIdentityKey({
    enrollmentId: ENR,
    homeworkAssignmentId: HW,
    itemSlot: "WRITTEN",
    responseKind: "written",
  });
  assert.strictEqual(key, `HC|written|${ENR}|${HW}|WRITTEN|NONE`);
});

test("quiz identity uses responseKind quiz", () => {
  const key = buildHomeworkCompletionIdentityKey({
    enrollmentId: ENR,
    homeworkAssignmentId: HW,
    itemSlot: "HW1",
    responseKind: "quiz",
  });
  assert.ok(key.startsWith("HC|quiz|"));
});

test("020 match key is submission+homework+slot", () => {
  assert.strictEqual(
    build020MatchKey({ submissionId: SUB, homeworkAssignmentId: HW, itemSlot: "HW2" }),
    `020|${SUB}|${HW}|HW2`
  );
});

test("067 match key is enrollment+week+homework", () => {
  assert.strictEqual(
    build067MatchKey({ enrollmentId: ENR, weekId: WEEK, homeworkAssignmentId: HW }),
    `067|${ENR}|${WEEK}|${HW}`
  );
});

test("canonical key sufficiency matrix", () => {
  assert.strictEqual(assessCanonicalKeySufficiency("multiple_attachments").sufficient, true);
  assert.strictEqual(assessCanonicalKeySufficiency("written_only_response").sufficient, true);
  assert.strictEqual(assessCanonicalKeySufficiency("quiz").sufficient, false);
  assert.strictEqual(assessCanonicalKeySufficiency("resubmission").sufficient, false);
  assert.strictEqual(assessCanonicalKeySufficiency("correction").sufficient, true);
  assert.strictEqual(assessCanonicalKeySufficiency("duplicate_fillout_submission").sufficient, false);
});

test("decide link or create", () => {
  assert.strictEqual(decideCompletionLinkOrCreate({}).action, "create");
  assert.deepStrictEqual(
    decideCompletionLinkOrCreate({ existingCompletionIds: [HC1] }),
    {
      action: "link_existing",
      completionId: HC1,
      reason: "exact_match",
    }
  );
  const multi = decideCompletionLinkOrCreate({
    existingCompletionIds: [HC1, HC2],
  });
  assert.strictEqual(multi.action, "link_preferred");
  assert.strictEqual(multi.completionIds.length, 2);
});

test("rejects malformed enrollment", () => {
  assert.throws(() =>
    buildHomeworkCompletionIdentityKey({
      enrollmentId: "bad",
      homeworkAssignmentId: HW,
      itemSlot: "HW1",
      submissionId: SUB,
      responseKind: "file",
    })
  );
});

console.log("uniqueness tests passed");
