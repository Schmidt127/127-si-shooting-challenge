#!/usr/bin/env node
/**
 * SC-167 — Submission XP canonical dedupe / concurrency contracts.
 * Run: node airtable/automations/shooting-challenge/lib/sc167-submission-xp-dedupe.test.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  SOURCE_KEY_PREFIX,
  buildSubmissionXpSourceKey,
  parseSubmissionIdFromSourceKey,
  compareSubmissionXpOwnerOrder,
  planSubmissionXpCanonicalDedupe,
  findDuplicateSourceKeyGroups,
} = require("./sc167-submission-xp-dedupe");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const SUB = "recSubmission0001"; // rec + 14 chars
const KEY = buildSubmissionXpSourceKey(SUB);

test("source key builder matches Automation 010 contract", () => {
  assert.strictEqual(SOURCE_KEY_PREFIX, "SUBMISSION_XP|");
  assert.strictEqual(KEY, `SUBMISSION_XP|${SUB}`);
  assert.strictEqual(parseSubmissionIdFromSourceKey(KEY), SUB);
  assert.strictEqual(parseSubmissionIdFromSourceKey("HOMEWORK_XP|x"), "");
});

test("deterministic owner prefers earlier createdTime then lower id", () => {
  const early = { id: "recZzzzzzzzzzzzzzz", createdTime: "2026-09-05T12:00:00.000Z" };
  const late = { id: "recAaaaaaaaaaaaaaa", createdTime: "2026-09-05T12:00:01.000Z" };
  assert.ok(compareSubmissionXpOwnerOrder(early, late) < 0);
  const a = { id: "recAaaaaaaaaaaaaaa", createdTime: "2026-09-05T12:00:00.000Z" };
  const b = { id: "recBbbbbbbbbbbbbbb", createdTime: "2026-09-05T12:00:00.000Z" };
  assert.ok(compareSubmissionXpOwnerOrder(a, b) < 0);
});

test("single canonical row needs no deactivate", () => {
  const plan = planSubmissionXpCanonicalDedupe({
    submissionId: SUB,
    rows: [
      {
        id: "recXp1",
        sourceKey: KEY,
        submissionId: SUB,
        active: true,
        ownershipExact: true,
        createdTime: "2026-09-05T12:00:00.000Z",
      },
    ],
  });
  assert.strictEqual(plan.ambiguous, false);
  assert.strictEqual(plan.ownerId, "recXp1");
  assert.deepStrictEqual(plan.deactivateIds, []);
});

test("duplicate same-ownership rows consolidate to earliest", () => {
  const plan = planSubmissionXpCanonicalDedupe({
    submissionId: SUB,
    rows: [
      {
        id: "recXpNew",
        sourceKey: KEY,
        submissionId: SUB,
        active: true,
        ownershipExact: true,
        createdTime: "2026-09-05T12:00:02.000Z",
      },
      {
        id: "recXpOld",
        sourceKey: KEY,
        submissionId: SUB,
        active: true,
        ownershipExact: true,
        createdTime: "2026-09-05T12:00:01.000Z",
      },
    ],
  });
  assert.strictEqual(plan.ambiguous, false);
  assert.strictEqual(plan.reason, "duplicate_canonical_consolidated");
  assert.strictEqual(plan.ownerId, "recXpOld");
  assert.deepStrictEqual(plan.deactivateIds, ["recXpNew"]);
  assert.strictEqual(plan.activeOwnerIds.length, 2);
});

test("ownership mismatch fails closed without deactivate list", () => {
  const plan = planSubmissionXpCanonicalDedupe({
    submissionId: SUB,
    rows: [
      {
        id: "recXpGood",
        sourceKey: KEY,
        submissionId: SUB,
        active: true,
        ownershipExact: true,
      },
      {
        id: "recXpBad",
        sourceKey: KEY,
        submissionId: SUB,
        active: true,
        ownershipExact: false,
      },
    ],
  });
  assert.strictEqual(plan.ambiguous, true);
  assert.strictEqual(plan.reason, "canonical_key_ownership_mismatch");
  assert.deepStrictEqual(plan.deactivateIds, []);
});

test("reconciliation report finds award-bearing duplicates without deleting", () => {
  const report = findDuplicateSourceKeyGroups([
    { id: "a", sourceKey: KEY, active: true },
    { id: "b", sourceKey: KEY, active: true },
    { id: "c", sourceKey: `SUBMISSION_XP|recOther000000001`, active: true },
    { id: "d", sourceKey: "HOMEWORK_XP|recHw", active: true },
  ]);
  assert.strictEqual(report.uniqueKeys, 2);
  assert.strictEqual(report.totalRows, 3);
  assert.strictEqual(report.duplicateGroups.length, 1);
  assert.strictEqual(report.duplicateGroups[0].multipleActive, true);
  assert.strictEqual(report.duplicateGroups[0].awardBearingDuplicate, true);
});

test("Active + correctly voided same key is still a duplicate row group (not multiple active)", () => {
  const report = findDuplicateSourceKeyGroups([
    { id: "a", sourceKey: KEY, active: true },
    { id: "b", sourceKey: KEY, active: false },
  ]);
  assert.strictEqual(report.duplicateGroups.length, 1);
  assert.strictEqual(report.duplicateGroups[0].multipleActive, false);
  assert.strictEqual(report.duplicateGroups[0].awardBearingDuplicate, false);
});

test("010 script embeds SC-167 consolidate markers", () => {
  const scriptPath = path.join(__dirname, "..", "010-submission-intake-create-xp-event.js");
  const text = fs.readFileSync(scriptPath, "utf8");
  assert.match(text, /SC-167/);
  assert.match(text, /planSubmissionXpCanonicalDedupe|consolidateCanonicalSubmissionXp/);
  assert.match(text, /v10\.14/);
  assert.match(text, /duplicate_canonical_consolidated|consolidated_duplicate_canonical/);
});

console.log("\nAll SC-167 submission XP dedupe tests passed.");
