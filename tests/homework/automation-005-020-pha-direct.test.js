#!/usr/bin/env node
/**
 * Offline tests for 005 v5.3 + 020 v3.6 PHA-first intake contract.
 * Run: node --test tests/homework/automation-005-020-pha-direct.test.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MockRecord } from "../../tools/testing/tests/airtable_mock.mjs";
import {
  PHA_IDS,
  build005PhaBase,
  run005,
} from "../../tools/testing/tests/run_005_pha_script.mjs";
import {
  ASSET_ID,
  EXISTING_HC_ID,
  build020PhaBase,
  run020,
} from "../../tools/testing/tests/run_020_pha_script.mjs";
import { IDS as CHAIN_IDS } from "../../tools/testing/tests/run_023_script.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

test("005 v5.3 source contract — PHA direct load, no library reverse search", () => {
  const source = read(
    "airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
  );
  assert.match(source, /version:\s*"v5\.3"/);
  assert.match(source, /validateSelectedPha/);
  assert.match(source, /homework1PhaId/);
  assert.match(source, /homework1LibraryId/);
  assert.doesNotMatch(source, /validateHomeworkSelectionAgainstPha/);
  assert.doesNotMatch(source, /phaTable\.selectRecordsAsync/);
});

test("020 v3.6 source contract — PHA direct validate, library dereference", () => {
  const source = read(
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
  );
  assert.match(source, /version:\s*"v3\.6"/);
  assert.match(source, /validateSelectedPha/);
  assert.match(source, /libraryId/);
  assert.match(source, /Multi-band Grade Band never rejects/);
  assert.doesNotMatch(source, /resolveProgramHomeworkAssignmentId/);
  assert.doesNotMatch(source, /phaTable\.selectRecordsAsync/);
  assert.doesNotMatch(source, /PHA Grade Band mismatch/);
});

test("005 — correct PHA yields production PHA + library IDs", async () => {
  const base = build005PhaBase();
  const { output, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.homework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.homework1LibraryId, PHA_IDS.LIBRARY_HW1);
  assert.equal(output.values.gradeBandSchedulingUsed, false);
});

test("005 — inactive PHA fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_INACTIVE }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /inactive/i);
});

test("005 — wrong Program Instance fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_WRONG_PI }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /Program Instance mismatch/i);
});

test("005 — wrong Week fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_WRONG_WEEK }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /Week mismatch/i);
});

test("005 — wrong slot fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_WRONG_SLOT }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /slot mismatch/i);
});

test("005 — zero linked Homework Assignments fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_ZERO_LIB }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /exactly one Homework Assignment/i);
});

test("005 — multiple linked Homework Assignments fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_MULTI_LIB }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /exactly one Homework Assignment/i);
});

test("005 — Grade Band is never part of scheduling match", async () => {
  const base = build005PhaBase({
    phaRecords: [
      new MockRecord("recPhaWrongGbOnly", {
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }],
        "Program Instance": [{ id: PHA_IDS.PI }],
        Week: [{ id: PHA_IDS.WEEK }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
        "Grade Band": [{ id: "recTotallyWrongGb01" }],
      }),
    ],
    submissionCells: { "Homework Name 1": [{ id: "recPhaWrongGbOnly" }] },
  });
  const { output, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.homework1PhaId, "recPhaWrongGbOnly");
  assert.equal(output.values.homework1LibraryId, PHA_IDS.LIBRARY_HW1);
});

test("020 — multi-band PHA (K-2…9-12) creates completion for K-2 enrollment", async () => {
  const multiBandPhaId = "recPhaMultiBand0001";
  const base = build020PhaBase({
    phaRecords: [
      new MockRecord(multiBandPhaId, {
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }],
        "Program Instance": [{ id: PHA_IDS.PI }],
        Week: [{ id: PHA_IDS.WEEK }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
        "Grade Band": [
          { id: "recGbK2AAAAAAA" },
          { id: "recGb34AAAAAAA" },
          { id: "recGb56AAAAAAA" },
          { id: "recGb78AAAAAAA" },
          { id: "recGb912AAAAAA" },
        ],
      }),
    ],
    submissionCells: { "Homework Name 1": [{ id: multiBandPhaId }] },
  });
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.phaId, multiBandPhaId);
  assert.equal(output.values.libraryId, PHA_IDS.LIBRARY_HW1);
  assert.equal(output.values.gradeBandSchedulingUsed, false);
  assert.equal(homework.createdPayloads.length, 1);
  assert.deepEqual(homework.createdPayloads[0].payload["Program Homework Assignment"], [
    { id: multiBandPhaId },
  ]);
});

test("020 — creates completion with PHA + library links", async () => {
  const base = build020PhaBase();
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.phaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.libraryId, PHA_IDS.LIBRARY_HW1);
  assert.equal(output.values.actionOut, "created_new");
  assert.equal(homework.createdPayloads.length, 1);
  const created = homework.createdPayloads[0].payload;
  assert.deepEqual(created.Homework, [{ id: PHA_IDS.LIBRARY_HW1 }]);
  assert.deepEqual(created["Program Homework Assignment"], [{ id: PHA_IDS.PHA_HW1 }]);
});

test("020 — replay returns same completion without duplicate", async () => {
  const existing = new MockRecord(EXISTING_HC_ID, {
    Homework: [{ id: PHA_IDS.LIBRARY_HW1 }],
    "Program Homework Assignment": [{ id: PHA_IDS.PHA_HW1 }],
    Enrollment: [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }],
    Week: [{ id: PHA_IDS.WEEK }],
    "Item Slot": { name: "HW1" },
    "Asset Slot": { name: "HW1" },
    "Submissions - Linked": [{ id: CHAIN_IDS.SUBMISSION }],
    "Submission Assets": [],
    "Satisfactory?": true,
  });
  const base = build020PhaBase({ existingHomeworkCompletions: [existing] });
  const homework = base.tables.get("Homework Completions");

  const first = await run020({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(first.output.values.actionOut, "linked_existing_enrollment_identity");
  assert.equal(first.output.values.homeworkCompletionId, EXISTING_HC_ID);
  assert.equal(homework.createdPayloads.length, 0);

  const second = await run020({ base, recordId: ASSET_ID });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(second.output.values.homeworkCompletionId, EXISTING_HC_ID);
  assert.equal(homework.createdPayloads.length, 0);
});
