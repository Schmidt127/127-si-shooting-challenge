import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MockBase, MockTable, MockRecord, MockOutput, makeInput, makeConsole } from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../airtable/automations/shooting-challenge/032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const IDS = {
  summary: "recSummary032001",
  enrollment: "recEnrollment032001",
  programInstance: "recProgram032001",
  band: "recBand032001",
  goal: "recGoal032001",
};

function buildBase({
  target = 0,
  active = true,
  existingGoal = [],
  extraGoals = [],
  goalProgramInstance = IDS.programInstance,
} = {}) {
  const was = new MockTable("Weekly Athlete Summary", [
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Goal Record", type: "multipleRecordLinks" },
  ], [new MockRecord(IDS.summary, {
    Week: [{ id: "recWeek032001" }],
    Enrollment: [{ id: IDS.enrollment }],
    "Grade Band": [{ id: IDS.band }],
    "Goal Record": existingGoal,
  })]);
  const enrollments = new MockTable("Enrollments", [
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], [new MockRecord(IDS.enrollment, {
    "Program Instance": [{ id: IDS.programInstance }],
  })]);
  const goals = new MockTable("Target Goal Shots", [
    { name: "Target Label", type: "formula", isComputed: true },
    { name: "Goal Key", type: "formula", isComputed: true },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Total Shot Target", type: "number" },
    { name: "Active?", type: "checkbox" },
  ], [new MockRecord(IDS.goal, {
    "Target Label": `Grade ${target}`,
    "Goal Key": "GOAL",
    "Grade Band": [{ id: IDS.band }],
    "Program Instance": [{ id: goalProgramInstance }],
    "Total Shot Target": target,
    "Active?": active,
  }), ...extraGoals]);
  return new MockBase([was, enrollments, goals]);
}

async function run(base) {
  const fn = new AsyncFunction("base", "input", "output", "console", readFileSync(SCRIPT, "utf8"));
  const output = new MockOutput();
  let error = null;
  try { await fn(base, makeInput({ recordId: IDS.summary }), output, makeConsole()); } catch (caught) { error = caught; }
  return { output, error };
}

test("explicit configured zero links an eligible goal", async () => {
  const base = buildBase({ target: 0 });
  const { output, error } = await run(base);
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  assert.deepEqual(base.getTable("Weekly Athlete Summary").records.get(IDS.summary).getCellValue("Goal Record"), [{ id: IDS.goal }]);
});

test("inactive or blank goal configuration is never linked", async () => {
  for (const options of [{ active: false }, { target: "" }]) {
    const base = buildBase(options);
    const { output, error } = await run(base);
    assert.equal(error, null);
    assert.equal(output.values.statusOut, "skipped");
    assert.equal(output.values.goalRecordId, "");
    assert.deepEqual(base.getTable("Weekly Athlete Summary").records.get(IDS.summary).getCellValue("Goal Record"), []);
  }
});

test("wrong Program Instance is ineligible rather than a matching grade-band goal", async () => {
  const base = buildBase({ target: 50, goalProgramInstance: "recOtherProgram032001" });
  const { output, error } = await run(base);
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.goalRecordId, "");
});

test("an existing wrong or ambiguous goal link fails closed", async () => {
  const wrongBase = buildBase({ existingGoal: [{ id: "recWrongGoal032001" }] });
  const wrong = await run(wrongBase);
  assert.ok(wrong.error);
  const duplicate = new MockRecord("recGoal032002", {
    "Target Label": "Duplicate", "Goal Key": "DUP", "Grade Band": [{ id: IDS.band }],
    "Program Instance": [{ id: IDS.programInstance }],
    "Total Shot Target": 50, "Active?": true,
  });
  const duplicateBase = buildBase({ target: 50, extraGoals: [duplicate] });
  const result = await run(duplicateBase);
  assert.ok(result.error);
  assert.match(String(result.error.message), /Multiple active Target Goal Shots/i);
});
