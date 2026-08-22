#!/usr/bin/env node
/**
 * Executes the committed Automation 076 source in a mocked Airtable runtime.
 *
 * Run: node tools/testing/tests/test_076_email_handoff_runtime.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  MockBase,
  MockOutput,
  MockRecord,
  MockTable,
  makeConsole,
  makeInput,
} from "./airtable_mock.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE_PATH = resolve(
  ROOT,
  "airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js"
);
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const IDS = {
  submission: "recSUBMISSION0001",
  enrollment: "recENROLLMENT001",
  week: "recWEEKRECORD0001",
  was: "recWASSUMMARY0001",
  goal: "recGOALRECORD0001",
  program: "recPROGRAMINST001",
  grade: "recGRADEBAND00001",
};
const key = `DAILY_SUBMISSION|SUBMISSIONS|${IDS.submission}`;
const linked = (id, name = id) => [{ id, name }];
const field = (name, type = "text", options) => ({ name, type, options });
const select = (name, choices) =>
  field(name, "singleSelect", { choices: choices.map((choice) => ({ name: choice })) });

function makeTables(overrides = {}) {
  const submission = new MockRecord(IDS.submission, {
    Enrollment: linked(IDS.enrollment),
    Week: linked(IDS.week),
    "Weekly Athlete Summary": linked(IDS.was),
    "Activity Date": "2026-08-13T12:00:00.000Z",
    "Build Daily Email Now?": true,
    "Count This Submission?": true,
    "Submission Stat Mode": "Simple Total",
    "Total Shots Counted": 50,
    "Total Makes Counted": 25,
    ...(overrides.submission || {}),
  });
  const enrollment = new MockRecord(IDS.enrollment, {
    "Active?": true,
    "Program Instance": linked(IDS.program),
    "Grade Band": linked(IDS.grade),
    "Parent Email - Cleaned": "guardian@example.com",
    "Athlete Email - Cleaned": "athlete@example.com",
    "Full Athlete Name": "Test Athlete",
    "Athlete First Name": "Test",
    "Current Shooting Streak": 2,
    "Current Level": "Level 1",
    "Next Level": "Level 2",
    ...(overrides.enrollment || {}),
  });
  const week = new MockRecord(IDS.week, {
    "Week Name": "Week 1",
    "Start Date": "2026-08-10",
    "End Date": "2026-08-16",
    "Program Instance": linked(IDS.program),
    ...(overrides.week || {}),
  });
  const was = new MockRecord(IDS.was, {
    Enrollment: linked(IDS.enrollment),
    Week: linked(IDS.week),
    "Goal Record": linked(IDS.goal),
    "Homework Completions Link": [],
    "XP Events": [],
    "Total Shots This Week": 50,
    "Goal Shots Target": 250,
    "Weekly Goal Shots Target": 28,
    "Week - Display": "Week 1",
    ...(overrides.was || {}),
  });
  const goal = new MockRecord(IDS.goal, {
    "Active?": true,
    "Program Instance": linked(IDS.program),
    "Grade Band": linked(IDS.grade),
    "Total Shot Target": 250,
    ...(overrides.goal || {}),
  });
  const program = new MockRecord(IDS.program, {
    "Name - Program Instance": "Summer 2026",
    ...(overrides.program || {}),
  });

  return [
    new MockTable(
      "Submissions",
      [
        field("Enrollment"),
        field("Week"),
        field("Weekly Athlete Summary"),
        field("Activity Date"),
        field("Build Daily Email Now?", "checkbox"),
        field("Count This Submission?", "checkbox"),
        field("Submission Stat Mode"),
        field("Total Shots Counted"),
        field("Total Makes Counted"),
        field("HW Sub 1"),
        field("HW Sub 2"),
        field("Video Upload"),
        field("Homework Completions"),
      ],
      [submission]
    ),
    new MockTable(
      "Enrollments",
      [
        field("Active?", "checkbox"),
        field("Program Instance"),
        field("Grade Band"),
        field("Parent Email - Cleaned"),
        field("Athlete Email - Cleaned"),
        field("Full Athlete Name"),
        field("Athlete First Name"),
        field("Current Shooting Streak"),
        field("Current Level"),
        field("Next Level"),
      ],
      [enrollment]
    ),
    new MockTable(
      "Weekly Athlete Summary",
      [
        field("Enrollment"),
        field("Week"),
        field("Goal Record"),
        field("Homework Completions Link"),
        field("XP Events"),
        field("Total Shots This Week"),
        field("Goal Shots Target"),
        field("Weekly Goal Shots Target"),
        field("Week - Display"),
      ],
      [was]
    ),
    new MockTable(
      "Target Goal Shots",
      [field("Active?", "checkbox"), field("Program Instance"), field("Grade Band"), field("Total Shot Target")],
      overrides.goalMissing ? [] : [goal]
    ),
    new MockTable(
      "Weeks",
      [field("Week Name"), field("Start Date"), field("End Date"), field("Program Instance")],
      [week]
    ),
    new MockTable("Program Instance - Sync", [field("Name - Program Instance")], [program]),
    new MockTable(
      "XP Events",
      [field("Active?", "checkbox"), field("XP Points"), field("Enrollment"), field("Week"), field("Submission")],
      overrides.xpEvents || []
    ),
    new MockTable(
      "Homework Completions",
      [field("Enrollment"), field("Week"), field("Program Homework Assignment"), field("Homework Assignment")],
      []
    ),
    new MockTable(
      "Program Homework Assignments",
      [field("Homework Assignment"), field("Program Instance"), field("Week"), field("Grade Band"), field("Homework Slot"), field("Active?", "checkbox")],
      []
    ),
    new MockTable(
      "Homework Library",
      [field("Assignment Title"), field("Assignment Full Name"), field("Week"), field("Grade Band"), field("Active?", "checkbox"), field("Published?", "checkbox"), field("Order"), field("URL")],
      overrides.homeworkLibrary || []
    ),
    new MockTable(
      "Levels",
      [field("Level Name"), field("Cover Image")],
      overrides.levels || []
    ),
    new MockTable(
      "Email Handoff Queue",
      [
        field("Handoff Key"),
        select("Status", ["Draft", "Ready", "Needs Review"]),
        field("Source Table"),
        select("Event Type", ["DAILY_SUBMISSION"]),
        field("Payload JSON"),
        field("Attempt Count"),
        field("Program Instance Record ID"),
        field("Source Record ID"),
        field("Enrollment Record ID"),
        field("Recipients JSON"),
        field("Template Key"),
        field("Test Mode?", "checkbox"),
      ],
      overrides.queueRecords || []
    ),
  ];
}

async function run076(tables, inputs = {}) {
  const output = new MockOutput();
  const console = makeConsole();
  const context = {
    base: new MockBase(tables),
    input: makeInput({ recordId: IDS.submission, testMode: true, ...inputs }),
    output,
    console,
    Intl,
    Date,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Promise,
    Error,
    RegExp,
  };
  vm.createContext(context);
  let threw = null;
  try {
    await vm.runInContext(`(async () => {\n${SOURCE}\n})()`, context, {
      filename: "076-email-handoff.js",
      timeout: 5_000,
    });
  } catch (error) {
    threw = error;
  }
  return { output, console, threw, base: context.base };
}

function table(tables, name) {
  return tables.find((candidate) => candidate.name === name);
}

async function expectInvalidGoal(name, overrides, expectedMessage) {
  const tables = makeTables(overrides);
  const result = await run076(tables);
  const queue = table(tables, "Email Handoff Queue");
  const submission = table(tables, "Submissions").records.get(IDS.submission);

  assert.ok(result.threw, `${name}: expected the source to fail closed`);
  assert.match(String(result.threw.message), expectedMessage);
  assert.equal(queue.createdPayloads.length, 0, `${name}: must not create a queue row`);
  assert.equal(submission.getCellValue("Build Daily Email Now?"), true, `${name}: must preserve readiness`);
  assert.equal(result.output.values.statusOut, "error");
  assert.equal(result.output.values.actionOut, "error");
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (error) {
    results.push({ name, pass: false, error: error?.message || String(error) });
  }
}

await test("positive settled goal creates one Ready queue handoff and clears readiness", async () => {
  const tables = makeTables();
  const result = await run076(tables);
  const queue = table(tables, "Email Handoff Queue");
  const submission = table(tables, "Submissions").records.get(IDS.submission);

  assert.equal(result.threw, null);
  assert.equal(queue.createdPayloads.length, 1);
  assert.equal(queue.records.size, 1);
  assert.equal(queue.createdPayloads[0].payload["Handoff Key"], key);
  assert.equal(queue.createdPayloads[0].payload.Status.name, "Draft");
  assert.equal(queue.createdPayloads[0].payload["Event Type"].name, "DAILY_SUBMISSION");
  assert.equal(queue.records.values().next().value.getCellValue("Status"), "Ready");
  assert.equal(submission.getCellValue("Build Daily Email Now?"), false);
  assert.equal(result.output.values.statusOut, "success");
  assert.equal(result.output.values.actionOut, "created_handoff");
  assert.ok(result.console.lines.some((line) => line.includes('"actionOut":"created_handoff"')));
});

await test("explicit configured zero goal creates a queue handoff", async () => {
  const tables = makeTables({
    goal: { "Total Shot Target": 0 },
    was: { "Goal Shots Target": 0, "Weekly Goal Shots Target": 0 },
  });
  const result = await run076(tables);
  const queue = table(tables, "Email Handoff Queue");
  const payload = JSON.parse(queue.createdPayloads[0].payload["Payload JSON"]);

  assert.equal(result.threw, null);
  assert.equal(queue.createdPayloads.length, 1);
  assert.equal(payload.weeklyGoal, 0);
  assert.equal(payload.weeklyGoalPercentage, 0);
  assert.equal(result.output.values.actionOut, "created_handoff");
});

await test("settled season lookup with fractional weekly target creates a queue handoff", async () => {
  const tables = makeTables({
    goal: { "Total Shot Target": 10000 },
    was: {
      "Goal Shots Target": 10000,
      "Weekly Goal Shots Target": 1111.111111111111,
    },
  });
  const result = await run076(tables);
  const queue = table(tables, "Email Handoff Queue");

  assert.equal(result.threw, null);
  assert.equal(queue.createdPayloads.length, 1);
  const payload = JSON.parse(queue.createdPayloads[0].payload["Payload JSON"]);
  assert.equal(payload.weeklyGoal, 1111.111111111111);
  assert.equal(result.output.values.actionOut, "created_handoff");
});

const invalidGoalCases = [
  ["no linked goal", { was: { "Goal Record": [] } }, /exactly one Goal Record/],
  ["multiple linked goals", { was: { "Goal Record": linked(IDS.goal).concat(linked("recGOALRECORD0002")) } }, /exactly one Goal Record/],
  ["missing linked goal record", { goalMissing: true }, /Linked Target Goal Shots record was not found/],
  ["inactive goal", { goal: { "Active?": false } }, /Weekly goal configuration/],
  ["wrong program goal", { goal: { "Program Instance": linked("recOTHERPROGRAM01") } }, /Weekly goal configuration/],
  ["missing enrollment grade", { enrollment: { "Grade Band": [] } }, /Weekly goal configuration/],
  ["ambiguous enrollment grade", { enrollment: { "Grade Band": linked(IDS.grade).concat(linked("recGRADEBAND00002")) } }, /Weekly goal configuration/],
  ["wrong goal grade", { goal: { "Grade Band": linked("recGRADEBAND00002") } }, /Weekly goal configuration/],
  ["blank configured target", { goal: { "Total Shot Target": null } }, /Total Shot Target must be a settled nonnegative numeric value/],
  ["negative configured target", { goal: { "Total Shot Target": -1 } }, /Total Shot Target must be a settled nonnegative numeric value/],
  ["blank season goal lookup", { was: { "Goal Shots Target": null } }, /Goal Shots Target must be a settled nonnegative numeric value/],
  ["negative season goal lookup", { was: { "Goal Shots Target": -1 } }, /Goal Shots Target must be a settled nonnegative numeric value/],
  ["blank settled weekly target", { was: { "Weekly Goal Shots Target": null } }, /Weekly Goal Shots Target must be a settled nonnegative numeric value/],
  ["negative settled weekly target", { was: { "Weekly Goal Shots Target": -1 } }, /Weekly Goal Shots Target must be a settled nonnegative numeric value/],
  ["lagged season goal lookup", { was: { "Goal Shots Target": 249 } }, /Weekly goal configuration/],
];

for (const [name, overrides, expectedMessage] of invalidGoalCases) {
  await test(`invalid goal state: ${name} creates no queue and no delivery handoff`, () =>
    expectInvalidGoal(name, overrides, expectedMessage));
}

await test("idempotent replay reuses matching queue without another create", async () => {
  const tables = makeTables();
  const first = await run076(tables);
  const queue = table(tables, "Email Handoff Queue");
  const submission = table(tables, "Submissions").records.get(IDS.submission);

  assert.equal(first.threw, null);
  submission.cells["Build Daily Email Now?"] = true;
  const replay = await run076(tables);

  assert.equal(replay.threw, null);
  assert.equal(queue.createdPayloads.length, 1);
  assert.equal(queue.records.size, 1);
  assert.equal(replay.output.values.statusOut, "success");
  assert.equal(replay.output.values.actionOut, "existing_handoff");
  assert.equal(submission.getCellValue("Build Daily Email Now?"), false);
});

await test("goal validation failure preserves readiness for upstream repair", async () => {
  const tables = makeTables({ was: { "Weekly Goal Shots Target": null } });
  const result = await run076(tables);
  const submission = table(tables, "Submissions").records.get(IDS.submission);
  const queue = table(tables, "Email Handoff Queue");

  assert.ok(result.threw);
  assert.equal(queue.createdPayloads.length, 0);
  assert.equal(submission.getCellValue("Build Daily Email Now?"), true);
  assert.equal(result.output.values.statusOut, "error");
});

const failed = results.filter((result) => !result.pass);
console.log(
  JSON.stringify(
    {
      suite: "076-email-handoff-runtime",
      source: "airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js",
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    },
    null,
    2
  )
);
process.exit(failed.length ? 1 : 0);
