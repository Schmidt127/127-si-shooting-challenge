/**
 * Runtime tests for the committed Automation 057 source.
 *
 * The production source is evaluated unchanged in an AsyncFunction with the
 * repository's Airtable-runtime mock. This suite deliberately tests the
 * target-goal ownership and inactive-enrollment gates before the broader
 * Perfect Week calculation.
 *
 * Run: node --test tools/testing/tests/test_057_runtime.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockRecord,
  MockTable,
  MockOutput,
  makeConsole,
  makeInput,
} from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
);
const SOURCE = readFileSync(SCRIPT_PATH, "utf8");
const SOURCE_SHA256 = createHash("sha256").update(SOURCE).digest("hex");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const IDS = {
  was: "recWas05700000001",
  enrollment: "recEnrollment05701",
  programInstance: "recProgram05700001",
  otherProgramInstance: "recOtherProg057001",
  gradeBand: "recGradeBand057001",
  otherGradeBand: "recOtherBand057001",
  goal: "recGoal0570000001",
  week: "recWeek0570000001",
  zoom: "recZoom0570000001",
  zoomAttendance: "recZa05700000001",
};

const linked = (id, name = id) => [{ id, name }];

const WEEKLY_FIELDS = [
  "Enrollment", "Week", "Grade Band", "Goal Record", "Weekly Goal Shots Target",
  "Goal Shots Target", "Submissions", "Homework", "Homework Completions Link",
  "Perfect Week Daily Check Status", "Perfect Week Daily Check Detail",
  "Perfect Week Daily Requirement Met?", "Perfect Week Video Count",
  "Perfect Week Zoom Meeting Count", "Perfect Week Zoom Attendance Count",
  "Perfect Week Homework Assigned Count", "Perfect Week Homework Satisfactory Count",
  "Perfect Week Homework Requirement Met?", "Perfect Week Automation Status",
  "Perfect Week Automation Error",
].map((name) => ({ name, type: "singleLineText" }));

function goalRecord({
  id = IDS.goal,
  target = 700,
  active = true,
  programInstance = IDS.programInstance,
  gradeBand = IDS.gradeBand,
} = {}) {
  return new MockRecord(id, {
    "Program Instance": linked(programInstance),
    "Grade Band": linked(gradeBand),
    "Total Shot Target": target,
    "Active?": active,
  });
}

function buildBase({
  target = 700,
  goalActive = true,
  goalProgramInstance = IDS.programInstance,
  goalGradeBand = IDS.gradeBand,
  // Production formula: Weekly Goal Shots Target = Goal Shots Target / 9
  weeklyGoal = target / 9,
  fallbackGoal = target,
  enrollmentActive = true,
  extraGoals = [],
  zoomRecords = [],
  zoomAttendanceRecords = [],
} = {}) {
  const weekly = new MockTable("Weekly Athlete Summary", WEEKLY_FIELDS, [
    new MockRecord(IDS.was, {
      Enrollment: linked(IDS.enrollment),
      Week: linked(IDS.week),
      "Grade Band": linked(IDS.gradeBand),
      "Goal Record": linked(IDS.goal),
      "Weekly Goal Shots Target": weeklyGoal,
      "Goal Shots Target": fallbackGoal,
      Submissions: [],
      Homework: [],
      "Homework Completions Link": [],
    }),
  ]);
  const submissions = new MockTable("Submissions", [
    { name: "Activity Date", type: "date" },
    { name: "Total Shots Counted", type: "number" },
    { name: "Perfect Week Countable Submission?", type: "checkbox" },
  ]);
  const homeworkCompletions = new MockTable("Homework Completions", [
    { name: "Homework", type: "multipleRecordLinks" },
    { name: "Satisfactory?", type: "checkbox" },
    { name: "Completion Status", type: "singleSelect" },
  ]);
  const video = new MockTable("Video Feedback", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Submission", type: "multipleRecordLinks" },
  ]);
  const zoom = new MockTable("Zoom Meetings", [
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Attendees", type: "multipleRecordLinks" },
  ], zoomRecords);
  const zoomAttendance = new MockTable("Zoom Attendance", [
    { name: "Attendance Method", type: "singleSelect" },
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Zoom Meeting", type: "multipleRecordLinks" },
    { name: "Zoom Credit Approved?", type: "checkbox" },
    { name: "Zoom Credit Conflict?", type: "checkbox" },
    { name: "Effective Recording Counts for Perfect Week?", type: "checkbox" },
    { name: "Perfect Week Credit Applied?", type: "checkbox" },
    { name: "Recording Quiz Review Status", type: "singleSelect" },
  ], zoomAttendanceRecords);
  const weeks = new MockTable("Weeks", [{ name: "Start Date", type: "date" }], [
    new MockRecord(IDS.week, { "Start Date": "2026-08-02" }),
  ]);
  const enrollments = new MockTable("Enrollments", [
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Active?", type: "checkbox" },
  ], [
    new MockRecord(IDS.enrollment, {
      "Program Instance": linked(IDS.programInstance),
      "Active?": enrollmentActive,
    }),
  ]);
  const goals = new MockTable("Target Goal Shots", [
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Total Shot Target", type: "number" },
    { name: "Active?", type: "checkbox" },
  ], [
    goalRecord({
      target,
      active: goalActive,
      programInstance: goalProgramInstance,
      gradeBand: goalGradeBand,
    }),
    ...extraGoals,
  ]);

  return new MockBase([
    weekly, submissions, homeworkCompletions, video, zoom, zoomAttendance, weeks, enrollments, goals,
  ]);
}

async function run057(base) {
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const fn = new AsyncFunction("base", "input", "output", "console", SOURCE);
  let error = null;
  try {
    await fn(base, makeInput({ recordId: IDS.was }), output, capturedConsole);
  } catch (caught) {
    error = caught;
  }
  return { output, console: capturedConsole, error };
}

function weeklyCells(base) {
  return base.getTable("Weekly Athlete Summary").records.get(IDS.was).cells;
}

function lastWeeklyUpdate(base) {
  const updates = base.getTable("Weekly Athlete Summary").updates;
  return updates.at(-1)?.fields;
}

test("executes the committed Automation 057 source", () => {
  assert.match(SOURCE, /057 - Achievements and Milestones - Calculate Perfect Week Eligibility/);
  assert.match(SOURCE, /Version: 1\.9/);
  console.log(`SOURCE_EXECUTED ${SCRIPT_PATH} sha256=${SOURCE_SHA256}`);
});

test("positive configured target reaches Ready", async () => {
  const base = buildBase({ target: 700 });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Automation Error"], "");
});

test("settled season lookup with fractional weekly goal reaches Ready", async () => {
  const base = buildBase({
    target: 12000,
    fallbackGoal: 12000,
    weeklyGoal: 12000 / 9,
  });
  const { error, console: captured } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Daily Check Status"], "Fail");
  assert.ok(
    captured.lines.some((line) => /"version":"1\.9"/.test(line) && /"action":"ready"/.test(line)),
    "success path must emit versioned console JSON"
  );
});

test("explicit configured zero is accepted rather than treated as missing", async () => {
  const base = buildBase({ target: 0, weeklyGoal: 0, fallbackGoal: 0 });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Daily Check Status"], "Fail");
});

test("missing configured target fails closed", async () => {
  const base = buildBase({ target: null, weeklyGoal: 700, fallbackGoal: 700 });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
  assert.equal(lastWeeklyUpdate(base)["Perfect Week Automation Status"].name, "Error");
});

test("inactive configured target fails closed", async () => {
  const base = buildBase({ goalActive: false });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
  assert.equal(lastWeeklyUpdate(base)["Perfect Week Automation Status"].name, "Error");
});

test("wrong Program Instance target fails closed", async () => {
  const base = buildBase({ goalProgramInstance: IDS.otherProgramInstance });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
});

test("wrong Grade Band target fails closed", async () => {
  const base = buildBase({ goalGradeBand: IDS.otherGradeBand });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
});

test("multiple active matching target configurations fail closed", async () => {
  const base = buildBase({
    extraGoals: [goalRecord({ id: "recGoal0570000002", target: 700 })],
  });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /exactly one active Program Instance \+ Grade Band record; found 2/);
});

test("blank configured target fails closed", async () => {
  const base = buildBase({ target: "", weeklyGoal: 700, fallbackGoal: 700 });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
});

test("unsettled or mismatched season Goal Shots Target writes Needs Review without positive work", async () => {
  const base = buildBase({
    target: 700,
    fallbackGoal: 699,
    weeklyGoal: 700 / 9,
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");
  assert.match(
    weeklyCells(base)["Perfect Week Automation Error"],
    /has not settled to the linked active goal target/
  );
  assert.equal(weeklyCells(base)["Perfect Week Daily Check Status"], "Needs Review");
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
});

test("fractional weekly goal alone does not falsely fail settlement", async () => {
  const base = buildBase({
    target: 12000,
    fallbackGoal: 12000,
    weeklyGoal: 1333.3333333333333,
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.notEqual(
    weeklyCells(base)["Perfect Week Automation Error"],
    "Weekly goal formula/lookup has not settled to the linked active goal target."
  );
});

test("missing Weekly Goal Shots Target writes Needs Review without positive work", async () => {
  const base = buildBase({
    target: 12000,
    fallbackGoal: 12000,
    weeklyGoal: null,
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");
  assert.match(
    weeklyCells(base)["Perfect Week Automation Error"],
    /Weekly Goal Shots Target is unsettled/
  );
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
});

test("missing recordId fails before Perfect Week writes", async () => {
  const base = buildBase();
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const fn = new AsyncFunction("base", "input", "output", "console", SOURCE);
  let error = null;
  try {
    await fn(base, makeInput({}), output, capturedConsole);
  } catch (caught) {
    error = caught;
  }
  assert.match(error?.message ?? "", /Missing input variable: recordId/);
  assert.equal(base.getTable("Weekly Athlete Summary").updates.length, 0);
});

test("inactive enrollment blocks positive Perfect Week work", async () => {
  const base = buildBase({ enrollmentActive: false });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");
  assert.match(weeklyCells(base)["Perfect Week Automation Error"], /Enrollment is inactive/);
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
});

test("restoring a withdrawn enrollment permits calculation on replay", async () => {
  const base = buildBase({ enrollmentActive: false });
  const first = await run057(base);
  assert.equal(first.error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");

  base.getTable("Enrollments").records.get(IDS.enrollment).cells["Active?"] = true;
  const restored = await run057(base);
  assert.equal(restored.error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
});

test("recording-credit replay does not reapply an already applied attendance row", async () => {
  const base = buildBase({
    zoomRecords: [new MockRecord(IDS.zoom, {
      Week: linked(IDS.week),
      Attendees: [],
    })],
    zoomAttendanceRecords: [new MockRecord(IDS.zoomAttendance, {
      "Attendance Method": "Recording Quiz",
      Enrollment: linked(IDS.enrollment),
      "Zoom Meeting": linked(IDS.zoom),
      "Zoom Credit Approved?": true,
      "Zoom Credit Conflict?": false,
      "Effective Recording Counts for Perfect Week?": true,
      "Perfect Week Credit Applied?": true,
      "Recording Quiz Review Status": "Satisfactory",
    })],
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Zoom Attendance Count"], 1);
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
});
