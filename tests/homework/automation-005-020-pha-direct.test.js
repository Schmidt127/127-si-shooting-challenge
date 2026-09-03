#!/usr/bin/env node
/**
 * Offline tests for 005 v5.5 + 020 v3.7 PHA-first intake contract.
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

test("005 v5.5 source contract — PHA direct load, slot-authoritative normalize", () => {
  const source = read(
    "airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
  );
  assert.match(source, /version:\s*"v5\.5"/);
  assert.match(source, /validateSelectedPha/);
  assert.match(source, /normalizeHomeworkPlacement/);
  assert.match(source, /homework1PhaId/);
  assert.match(source, /homework1LibraryId/);
  assert.match(source, /originalHomework1PhaId/);
  assert.match(source, /normalizedHomework1PhaId/);
  assert.match(source, /homeworkSlotNormalized/);
  assert.doesNotMatch(source, /slot mismatch: expected/);
  assert.doesNotMatch(source, /validateHomeworkSelectionAgainstPha/);
  assert.doesNotMatch(source, /phaTable\.selectRecordsAsync/);
});

test("020 v3.9 source contract — PHA identity validate, alternate slot tolerant, late credit", () => {
  const source = read(
    "airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
  );
  assert.match(source, /version:\s*"v3\.9"/);
  assert.match(source, /resolveHomeworkAssignmentIdentity/);
  assert.match(source, /enrollment_pha_identity/);
  assert.match(source, /evaluateHomeworkSubmissionDeadline/);
  assert.match(source, /timingStatus:\s*"late"/);
  assert.match(source, /Full homework credit and XP still apply/);
  assert.doesNotMatch(source, /slot mismatch: expected/);
  assert.doesNotMatch(source, /resolveProgramHomeworkAssignmentId/);
  assert.doesNotMatch(source, /phaTable\.selectRecordsAsync/);
  assert.doesNotMatch(source, /PHA Grade Band mismatch/);
  assert.doesNotMatch(source, /Not eligible for homework credit or XP/);
});

test("005 — correct HW1/HW2 placement succeeds without normalization", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": [{ id: PHA_IDS.PHA_HW2 }],
    },
  });
  const { output, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.homework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.homework2PhaId, PHA_IDS.PHA_HW2);
  assert.equal(output.values.homework1LibraryId, PHA_IDS.LIBRARY_HW1);
  assert.equal(output.values.homework2LibraryId, PHA_IDS.LIBRARY_HW2);
  assert.equal(output.values.originalHomework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.originalHomework2PhaId, PHA_IDS.PHA_HW2);
  assert.equal(output.values.normalizedHomework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.normalizedHomework2PhaId, PHA_IDS.PHA_HW2);
  assert.equal(output.values.homeworkSlotNormalized, false);
  assert.equal(output.values.homeworkSlotNormalizationMessage, "");
  assert.equal(output.values.gradeBandSchedulingUsed, false);
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

test("005 — HW1 assignment entered in HW2 field is normalized to Homework Name 1", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": null,
      "Homework Name 2": [{ id: PHA_IDS.PHA_HW1 }],
    },
  });
  const submissions = base.tables.get("Submissions");
  const { output, console, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.homeworkSlotNormalized, true);
  assert.match(String(output.values.homeworkSlotNormalizationMessage), /HW2 input to official HW1/);
  assert.equal(output.values.originalHomework1PhaId, "");
  assert.equal(output.values.originalHomework2PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.normalizedHomework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.normalizedHomework2PhaId, "");
  assert.equal(output.values.homework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.homework2PhaId, "");
  assert.ok(console.lines.some((line) => /Normalized selected assignment from HW2 input to official HW1 slot/.test(line)));
  const lastUpdate = submissions.updates[submissions.updates.length - 1];
  assert.deepEqual(lastUpdate.fields["Homework Name 1"], [{ id: PHA_IDS.PHA_HW1 }]);
  assert.deepEqual(lastUpdate.fields["Homework Name 2"], []);
});

test("005 — HW2 assignment entered in HW1 field is normalized to Homework Name 2", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_OFFICIAL_HW2 }],
      "Homework Name 2": null,
    },
  });
  const submissions = base.tables.get("Submissions");
  const { output, console, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.homeworkSlotNormalized, true);
  assert.match(String(output.values.homeworkSlotNormalizationMessage), /HW1 input to official HW2/);
  assert.equal(output.values.originalHomework1PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  assert.equal(output.values.normalizedHomework1PhaId, "");
  assert.equal(output.values.normalizedHomework2PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  assert.equal(output.values.homework1LibraryId, "");
  assert.equal(output.values.homework2LibraryId, PHA_IDS.LIBRARY_HW2);
  assert.ok(console.lines.some((line) => /Normalized selected assignment from HW1 input to official HW2 slot/.test(line)));
  const lastUpdate = submissions.updates[submissions.updates.length - 1];
  assert.deepEqual(lastUpdate.fields["Homework Name 1"], []);
  assert.deepEqual(lastUpdate.fields["Homework Name 2"], [{ id: PHA_IDS.PHA_OFFICIAL_HW2 }]);
});

test("005 — both assignments entered in opposite fields are swapped", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW2 }],
      "Homework Name 2": [{ id: PHA_IDS.PHA_HW1 }],
    },
  });
  const submissions = base.tables.get("Submissions");
  const { output, console, error } = await run005({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "Complete");
  assert.equal(output.values.homeworkSlotNormalized, true);
  assert.equal(output.values.originalHomework1PhaId, PHA_IDS.PHA_HW2);
  assert.equal(output.values.originalHomework2PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.normalizedHomework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.normalizedHomework2PhaId, PHA_IDS.PHA_HW2);
  assert.equal(output.values.homework1PhaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.homework2PhaId, PHA_IDS.PHA_HW2);
  assert.ok(console.lines.some((line) => /HW1 input to official HW2/.test(line)));
  assert.ok(console.lines.some((line) => /HW2 input to official HW1/.test(line)));
  const lastUpdate = submissions.updates[submissions.updates.length - 1];
  assert.deepEqual(lastUpdate.fields["Homework Name 1"], [{ id: PHA_IDS.PHA_HW1 }]);
  assert.deepEqual(lastUpdate.fields["Homework Name 2"], [{ id: PHA_IDS.PHA_HW2 }]);
});

test("005 — duplicate assignments resolving to the same slot fail closed", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": [{ id: PHA_IDS.PHA_HW1_DUP }],
    },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /Duplicate official HW1 slot/i);
});

test("005 — blank PHA Homework Slot fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_BLANK_SLOT }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /blank Homework Slot/i);
});

test("005 — invalid PHA Homework Slot fails closed", async () => {
  const base = build005PhaBase({
    submissionCells: { "Homework Name 1": [{ id: PHA_IDS.PHA_INVALID_SLOT }] },
  });
  const { error } = await run005({ base });
  assert.ok(error);
  assert.match(String(error.message), /invalid Homework Slot/i);
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

test("005 — replay after normalization is idempotent (no homework field rewrite)", async () => {
  const base = build005PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_OFFICIAL_HW2 }],
      "Homework Name 2": null,
    },
  });
  const submissions = base.tables.get("Submissions");

  const first = await run005({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(first.output.values.homeworkSlotNormalized, true);
  assert.equal(first.output.values.normalizedHomework1PhaId, "");
  assert.equal(first.output.values.normalizedHomework2PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  const updatesAfterFirst = submissions.updates.length;
  assert.ok(updatesAfterFirst >= 1);

  const second = await run005({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(second.output.values.statusOut, "Complete");
  assert.equal(second.output.values.homeworkSlotNormalized, false);
  assert.equal(second.output.values.originalHomework1PhaId, "");
  assert.equal(second.output.values.originalHomework2PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  assert.equal(second.output.values.normalizedHomework1PhaId, "");
  assert.equal(second.output.values.normalizedHomework2PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  assert.equal(second.output.values.homework1PhaId, "");
  assert.equal(second.output.values.homework2PhaId, PHA_IDS.PHA_OFFICIAL_HW2);
  assert.equal(submissions.updates.length, updatesAfterFirst);
  assert.equal(String(second.output.values.updatedFields || ""), "");
});

test("020 — multi-band PHA (K-2…9-12) creates completion for K-2 enrollment", async () => {
  const multiBandPhaId = "recMb000000000001";
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

test("020 — HW1 assignment uploaded through HW2 slot links same PHA identity", async () => {
  const base = build020PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": null,
      "Activity Date": "2026-08-07",
    },
    assetCells: {
      "Asset Purpose": { name: "Homework 2" },
      "Asset Slot": { name: "HW2" },
      "Asset Label": "HW2 alternate slot",
    },
  });
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.phaId, PHA_IDS.PHA_HW1);
  assert.equal(output.values.officialSlot, "HW1");
  assert.equal(output.values.uploadSlot, "HW2");
  assert.equal(output.values.alternateUploadSlot, true);
});

test("020 — repeat alternate-slot upload reuses one Homework Completion", async () => {
  const existing = new MockRecord(EXISTING_HC_ID, {
    Homework: [{ id: PHA_IDS.LIBRARY_HW1 }],
    "Program Homework Assignment": [{ id: PHA_IDS.PHA_HW1 }],
    Enrollment: [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }],
    Week: [{ id: PHA_IDS.WEEK }],
    "Item Slot": { name: "HW1" },
    "Asset Slot": { name: "HW1" },
    "Submissions - Linked": [{ id: CHAIN_IDS.SUBMISSION }],
    "Submission Assets": [],
  });
  const base = build020PhaBase({
    existingHomeworkCompletions: [existing],
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": null,
    },
    assetCells: {
      "Asset Purpose": { name: "Homework 2" },
      "Asset Slot": { name: "HW2" },
    },
  });
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.homeworkCompletionId, EXISTING_HC_ID);
  assert.equal(output.values.actionOut, "linked_existing_enrollment_identity");
  assert.equal(homework.createdPayloads.length, 0);
});

test("020 — late submission stays reviewable and credit-eligible", async () => {
  const base = build020PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Activity Date": "2026-09-02",
    },
    phaRecords: [
      new MockRecord(PHA_IDS.PHA_HW1, {
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }],
        "Program Instance": [{ id: PHA_IDS.PI }],
        Week: [{ id: PHA_IDS.WEEK }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
        "Due Date": "2026-08-31",
      }),
    ],
  });
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.creditEligible, true);
  assert.equal(output.values.timingStatus, "late");
  assert.equal(homework.createdPayloads.length, 1);
  assert.match(String(homework.createdPayloads[0].payload.Notes || ""), /Late submission:/);
  assert.match(
    String(homework.createdPayloads[0].payload.Notes || ""),
    /Full homework credit and XP still apply/
  );
});

test("020 — on-time submission is credit eligible", async () => {
  const base = build020PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Activity Date": "2026-08-20",
    },
    phaRecords: [
      new MockRecord(PHA_IDS.PHA_HW1, {
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }],
        "Program Instance": [{ id: PHA_IDS.PI }],
        Week: [{ id: PHA_IDS.WEEK }],
        "Homework Slot": { name: "HW1" },
        "Active?": true,
        "Due Date": "2026-08-31",
      }),
    ],
  });
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.creditEligible, true);
  assert.equal(output.values.timingStatus, "on_time");
  assert.equal(output.values.dueDateKey, "2026-08-31");
  assert.equal(homework.createdPayloads.length, 1);
  assert.equal(homework.createdPayloads[0].payload.Notes, undefined);
});

test("020 — multiple assets for one assignment attach to one Homework Completion", async () => {
  const existing = new MockRecord(EXISTING_HC_ID, {
    Homework: [{ id: PHA_IDS.LIBRARY_HW1 }],
    "Program Homework Assignment": [{ id: PHA_IDS.PHA_HW1 }],
    Enrollment: [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }],
    Week: [{ id: PHA_IDS.WEEK }],
    "Item Slot": { name: "HW1" },
    "Asset Slot": { name: "HW1" },
    "Submissions - Linked": [{ id: CHAIN_IDS.SUBMISSION }],
    "Submission Assets": [{ id: "recAssetAlready01" }],
  });
  const secondAssetId = "recAssetHw200002";
  const base = build020PhaBase({
    existingHomeworkCompletions: [existing],
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": null,
    },
    assetCells: {
      "Asset Purpose": { name: "Homework 2" },
      "Asset Slot": { name: "HW2" },
      "Asset Label": "second upload",
    },
  });
  const assets = base.tables.get("Submission Assets");
  assets.records.set(
    secondAssetId,
    new MockRecord(secondAssetId, {
      ...assets.records.get(ASSET_ID).cells,
      "Asset Label": "second upload",
      "Asset Purpose": { name: "Homework 2" },
      "Asset Slot": { name: "HW2" },
      "Homework Completions": [],
    })
  );
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base, recordId: secondAssetId });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.homeworkCompletionId, EXISTING_HC_ID);
  assert.equal(output.values.actionOut, "linked_existing_enrollment_identity");
  assert.equal(homework.createdPayloads.length, 0);
  const update = homework.updates.find((row) => row.recordId === EXISTING_HC_ID);
  assert.ok(update);
  const linkedAssets = update.fields["Submission Assets"] || [];
  assert.equal(linkedAssets.length, 2);
  assert.ok(linkedAssets.some((row) => row.id === "recAssetAlready01"));
  assert.ok(linkedAssets.some((row) => row.id === secondAssetId));
});

test("020 — cross-enrollment isolation does not reuse another enrollment HC", async () => {
  const otherEnrollmentHc = new MockRecord("recOtherEnrollHc01", {
    Homework: [{ id: PHA_IDS.LIBRARY_HW1 }],
    "Program Homework Assignment": [{ id: PHA_IDS.PHA_HW1 }],
    Enrollment: [{ id: CHAIN_IDS.ENROLLMENT_HISTORICAL }],
    Week: [{ id: PHA_IDS.WEEK }],
    "Item Slot": { name: "HW1" },
    "Asset Slot": { name: "HW1" },
    "Submissions - Linked": [],
    "Submission Assets": [],
  });
  const base = build020PhaBase({
    existingHomeworkCompletions: [otherEnrollmentHc],
  });
  const homework = base.tables.get("Homework Completions");
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created_new");
  assert.notEqual(output.values.homeworkCompletionId, "recOtherEnrollHc01");
  assert.equal(homework.createdPayloads.length, 1);
  assert.deepEqual(homework.createdPayloads[0].payload.Enrollment, [
    { id: CHAIN_IDS.ENROLLMENT_CURRENT },
  ]);
});

test("020 — blank PHA Due Date uses Week End Date for deadline", async () => {
  const base = build020PhaBase({
    submissionCells: {
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Activity Date": "2026-09-01",
    },
  });
  const { output, error } = await run020({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.timingStatus, "late");
  assert.equal(output.values.dueDateKey, "2026-08-31");
});

test("065 v10.6 source contract — no late XP block + slot-agnostic PHA + XP key", () => {
  const source = read(
    "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
  );
  assert.match(source, /version:\s*"v10\.6"/);
  assert.match(source, /evaluateHomeworkSubmissionDeadline/);
  assert.match(source, /HOMEWORK_XP\|/);
  assert.match(source, /sourceKeyPrefix:\s*"HOMEWORK_XP\|"/);
  assert.doesNotMatch(source, /PHA Homework Slot ownership mismatch/);
  assert.doesNotMatch(source, /late_ineligible/);
  assert.doesNotMatch(source, /Submission after assignment due date/);
});
