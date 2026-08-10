#!/usr/bin/env node
/**
 * Offline tests for 067 v3.3 PHA-first HW17 quiz path.
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
  QUIZ_ID,
  HW17_PHA,
  HW17_LIBRARY,
  HW17_WEEK,
  PI,
} from "../../tools/testing/tests/run_067_pha_script.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

test("067 v3.3 source contract — PI-first HW17 PHA resolution", () => {
  const source = read(
    "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
  );
  assert.match(source, /version:\s*"v3\.3"/);
  assert.match(source, /resolveHw17PhaForEnrollment/);
  assert.match(source, /homeworkName1.*PHA record ID/s);
  assert.doesNotMatch(source, /resolveHw17WeekFromPha/);
  assert.doesNotMatch(source, /hw\[0\]===hw17Id/);
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
