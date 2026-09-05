#!/usr/bin/env node
/**
 * Offline tests for 067 PHA-first HW17 quiz path.
 *
 * Version authority (2026-09-05):
 * - Repository (GitHub) SCRIPT/CONFIG version: v3.5 (V2 structure-only bump)
 * - Current live Airtable Automation 067 script body: v3.4
 * - Mike declined the optional structure-only paste; do not treat v3.5 as live.
 * Evidence: docs/audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  build067PhaBase,
  run067,
  goodHw17Pha,
  goodHc,
  QUIZ_ID,
  HW17_PHA,
  HW17_LIBRARY,
  HW17_WEEK,
  HC_GOOD,
  ENROLLMENT_ID,
  ENROLLMENT_OTHER,
  WEEK_OTHER,
  PHA_OTHER,
  PI,
} from "../../tools/testing/tests/run_067_pha_script.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

/** Documented live Production body version — not the GitHub SCRIPT version. */
const LIVE_AIRTABLE_067_VERSION = "v3.4";
/** Current repository SCRIPT / CONFIG version (structure-only vs live). */
const REPO_067_VERSION = "v3.5";

test("067 source contract — repo v3.5 declares structure-only lineage from live v3.4", () => {
  const source = read(
    "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
  );

  // Repository version (GitHub canonical file)
  assert.match(source, new RegExp(`version:\\s*"${REPO_067_VERSION.replace(/\./g, "\\.")}"`));
  assert.match(source, /\*\s*Version:\s*v3\.5\b/);
  assert.match(
    source,
    /Business logic unchanged from v3\.4|v3\.5 is structure-only|structure-only/i
  );

  // Explicit non-claim: this file must not be treated as proving live Airtable is v3.5
  assert.equal(
    LIVE_AIRTABLE_067_VERSION,
    "v3.4",
    "Documented live Airtable 067 is v3.4; Mike declined the optional GitHub v3.5 structure paste"
  );
  assert.notEqual(
    REPO_067_VERSION,
    LIVE_AIRTABLE_067_VERSION,
    "Repo v3.5 is intentionally ahead of live v3.4 (optional structure paste declined)"
  );

  // Behavioral contracts shared by live v3.4 and repo v3.5
  assert.match(source, /resolveHw17PhaForEnrollment/);
  assert.match(source, /homeworkName1.*PHA record ID/s);
  assert.match(source, /validateLinkedHomeworkCompletion/);
  assert.match(source, /requireSingleCompletionMatch/);
  assert.match(source, /isExactCompletionIdentity/);
  assert.match(source, /must have exactly one link/);
  assert.doesNotMatch(source, /resolveHw17WeekFromPha/);
  assert.doesNotMatch(source, /hw\[0\]===hw17Id/);
  assert.doesNotMatch(source, /let match=matches\[0\]/);
  assert.doesNotMatch(source, /homeworkCompletionId=matches\[0\]/);
});

test("067 — resolves HW17 PHA and library IDs", async () => {
  const base = build067PhaBase();
  const { output, error } = await run067({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.phaId, HW17_PHA);
  assert.equal(output.values.libraryId, HW17_LIBRARY);
  const homework = base.tables.get("Homework Completions");
  assert.equal(homework.createdPayloads.length, 1);
  const created = homework.createdPayloads[0].payload;
  assert.deepEqual(created.Homework, [{ id: HW17_LIBRARY }]);
  assert.deepEqual(created["Program Homework Assignment"], [{ id: HW17_PHA }]);
});

test("067 — parent Submission stores PHA in Homework Name 1", async () => {
  const base = build067PhaBase({
    quizCells: {
      "Quiz Result PDF": [{ id: "att1", url: "https://example.com/quiz.pdf", filename: "quiz.pdf", type: "application/pdf" }],
    },
  });
  const { error } = await run067({ base });
  assert.equal(error, null, error && error.message);
  const submissions = base.tables.get("Submissions");
  assert.equal(submissions.createdPayloads.length, 1);
  assert.deepEqual(submissions.createdPayloads[0].payload["Homework Name 1"], [{ id: HW17_PHA }]);
});

test("067 — inactive PHA fails closed", async () => {
  const base = build067PhaBase({
    phaRecords: [goodHw17Pha("recPhaInactive0671", { "Active?": false })],
  });
  base.tables.get("Program Homework Assignments").records.delete(HW17_PHA);
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /HW17 PHA/i);
});

test("067 — wrong Program Instance fails closed", async () => {
  const base = build067PhaBase({
    phaRecords: [goodHw17Pha("recPhaWrongPi0671", { "Program Instance": [{ id: "recWrongProgramPi01" }] })],
  });
  base.tables.get("Program Homework Assignments").records.delete(HW17_PHA);
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /HW17 PHA/i);
});

test("067 — wrong Week on sole PHA fails closed", async () => {
  const base = build067PhaBase({
    phaRecords: [goodHw17Pha("recPhaWrongWeek0671", { Week: [] })],
  });
  base.tables.get("Program Homework Assignments").records.delete(HW17_PHA);
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Week/i);
});

test("067 — wrong slot fails closed", async () => {
  const base = build067PhaBase({
    phaRecords: [goodHw17Pha("recPhaWrongSlot0671", { "Homework Slot": { name: "HW2" } })],
  });
  base.tables.get("Program Homework Assignments").records.delete(HW17_PHA);
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /HW17 PHA/i);
});

test("067 — ambiguous Homework Assignment links fail closed", async () => {
  const base = build067PhaBase({
    phaRecords: [
      goodHw17Pha("recPhaMultiLib0671", {
        "Homework Assignment": [{ id: HW17_LIBRARY }, { id: "recOtherLibrary001" }],
      }),
    ],
  });
  base.tables.get("Program Homework Assignments").records.delete(HW17_PHA);
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /HW17 PHA/i);
});

test("067 — already-linked correct Homework Completion succeeds", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD)],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { output, error } = await run067({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.phaId, HW17_PHA);
  assert.equal(output.values.libraryId, HW17_LIBRARY);
  assert.equal(base.tables.get("Homework Completions").createdPayloads.length, 0);
});

test("067 — already-linked wrong Enrollment fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD, { Enrollment: [{ id: ENROLLMENT_OTHER }] })],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Enrollment mismatch/i);
});

test("067 — already-linked wrong Week fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD, { Week: [{ id: WEEK_OTHER }] })],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Week mismatch/i);
});

test("067 — already-linked wrong Homework Library fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD, { Homework: [{ id: "recOtherLibrary001" }] })],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Homework mismatch/i);
});

test("067 — already-linked wrong PHA fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD, { "Program Homework Assignment": [{ id: PHA_OTHER }] })],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Program Homework Assignment mismatch/i);
});

test("067 — already-linked multiple Enrollments fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [
      goodHc(HC_GOOD, { Enrollment: [{ id: ENROLLMENT_ID }, { id: ENROLLMENT_OTHER }] }),
    ],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Enrollment must have exactly one link/i);
});

test("067 — already-linked multiple Weeks fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [
      goodHc(HC_GOOD, { Week: [{ id: HW17_WEEK }, { id: WEEK_OTHER }] }),
    ],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Week must have exactly one link/i);
});

test("067 — already-linked multiple Homework Library links fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [
      goodHc(HC_GOOD, { Homework: [{ id: HW17_LIBRARY }, { id: "recOtherLibrary001" }] }),
    ],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Homework must have exactly one link/i);
});

test("067 — already-linked multiple PHA links fails closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [
      goodHc(HC_GOOD, { "Program Homework Assignment": [{ id: HW17_PHA }, { id: PHA_OTHER }] }),
    ],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Program Homework Assignment must have exactly one link/i);
});

test("067 — discovery ignores completion with ambiguous identity links", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [
      goodHc("recHcMultiWeek0671", { Week: [{ id: HW17_WEEK }, { id: WEEK_OTHER }] }),
    ],
  });
  const { output, error } = await run067({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(base.tables.get("Homework Completions").createdPayloads.length, 1);
});

test("067 — blank PHA on otherwise exact linked completion is populated", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD, { "Program Homework Assignment": [] })],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const { output, error } = await run067({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "linked_existing_quiz_populated_pha");
  const homework = base.tables.get("Homework Completions");
  const phaUpdate = homework.updates.find(
    (u) => u.recordId === HC_GOOD && u.fields["Program Homework Assignment"]
  );
  assert.ok(phaUpdate);
  assert.deepEqual(phaUpdate.fields["Program Homework Assignment"], [{ id: HW17_PHA }]);
});

test("067 — multiple matching completions fail closed", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc("recHcDup067001"), goodHc("recHcDup067002")],
  });
  const { error } = await run067({ base });
  assert.ok(error);
  assert.match(String(error.message), /Multiple Homework Completions match/i);
  assert.match(String(error.message), /recHcDup067001/);
  assert.match(String(error.message), /recHcDup067002/);
});

test("067 — replay remains idempotent when quiz already links correct completion", async () => {
  const base = build067PhaBase({
    homeworkCompletions: [goodHc(HC_GOOD)],
    quizCells: { "Homework Completion": [{ id: HC_GOOD }] },
  });
  const first = await run067({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  const homework = base.tables.get("Homework Completions");
  const createdAfterFirst = homework.createdPayloads.length;
  const updatesAfterFirst = homework.updates.length;

  const second = await run067({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(second.output.values.statusOut, "success");
  assert.equal(homework.createdPayloads.length, createdAfterFirst);
  assert.equal(homework.updates.length, updatesAfterFirst);
});
