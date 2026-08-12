/**
 * Offline regression tests for Automation 076 queue handoff and readiness clear.
 * Run: node --test tests/email/automation-076-offline.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockOutput,
  MockRecord,
  MockTable,
  makeConsole,
  makeInput,
} from "../../tools/testing/tests/airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const SUBMISSION_ID = "rec12345678901234";

function singleSelect(name, choices) {
  return {
    name,
    type: "singleSelect",
    options: { choices: choices.map((choice) => ({ id: choice, name: choice })) },
  };
}

function build076Base(queueRecords = []) {
  const submissions = new MockTable(
    "Submissions",
    [
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
      { name: "Activity Date", type: "date" },
      { name: "Build Daily Email Now?", type: "checkbox" },
      { name: "Count This Submission?", type: "checkbox" },
      singleSelect("Submission Stat Mode", ["Counted"]),
      { name: "Total Shots Counted", type: "number" },
      { name: "Total Makes Counted", type: "number" },
    ],
    [
      new MockRecord(SUBMISSION_ID, {
        Enrollment: [{ id: "recEnrollment076001", name: "Schmidt Enrollment" }],
        Week: [{ id: "recWeek07600001", name: "Early Bird" }],
        "Weekly Athlete Summary": [],
        "Activity Date": "2026-08-07",
        "Build Daily Email Now?": true,
        "Count This Submission?": true,
        "Submission Stat Mode": { id: "Counted", name: "Counted" },
        "Total Shots Counted": 20,
        "Total Makes Counted": 10,
      }),
    ]
  );

  const enrollments = new MockTable(
    "Enrollments",
    [
      { name: "Active?", type: "checkbox" },
      { name: "Program Instance", type: "multipleRecordLinks" },
      { name: "Parent Email - Cleaned", type: "email" },
      { name: "Athlete Email - Cleaned", type: "email" },
      { name: "Full Athlete Name", type: "singleLineText" },
      { name: "Current Shooting Streak", type: "number" },
      { name: "Current Level", type: "singleLineText" },
      { name: "Next Level", type: "singleLineText" },
    ],
    [
      new MockRecord("recEnrollment076001", {
        "Active?": true,
        "Program Instance": [{ id: "recProgram0760001", name: "2026-2027" }],
        "Parent Email - Cleaned": "mschmidt@fairfield.k12.mt.us",
        "Athlete Email - Cleaned": "",
        "Full Athlete Name": "Schmidt Test Athlete",
        "Current Shooting Streak": 0,
        "Current Level": "Beginner",
        "Next Level": "Rookie Shooter",
      }),
    ]
  );

  const weeks = new MockTable(
    "Weeks",
    [
      { name: "Week Name", type: "singleLineText" },
      { name: "Program Instance", type: "multipleRecordLinks" },
      { name: "Start Date", type: "date" },
      { name: "End Date", type: "date" },
    ],
    [
      new MockRecord("recWeek07600001", {
        "Week Name": "Early Bird",
        "Program Instance": [{ id: "recProgram0760001", name: "2026-2027" }],
      }),
    ]
  );

  const programInstances = new MockTable(
    "Program Instance - Synced",
    [{ name: "Name - Program Instance", type: "singleLineText" }],
    [new MockRecord("recProgram0760001", { "Name - Program Instance": "2026-2027" })]
  );

  const queue = new MockTable(
    "Email Handoff Queue",
    [
      { name: "Handoff Key", type: "singleLineText" },
      singleSelect("Status", ["Draft", "Ready", "Needs Review"]),
      { name: "Source Table", type: "singleLineText" },
      { name: "Event Type", type: "singleLineText" },
      { name: "Payload JSON", type: "multilineText" },
      { name: "Attempt Count", type: "number" },
      { name: "Program Instance Record ID", type: "singleLineText" },
      { name: "Source Record ID", type: "singleLineText" },
      { name: "Enrollment Record ID", type: "singleLineText" },
      { name: "Recipients JSON", type: "multilineText" },
      { name: "Template Key", type: "singleLineText" },
      { name: "Test Mode?", type: "checkbox" },
    ],
    queueRecords
  );

  return new MockBase([
    submissions,
    enrollments,
    weeks,
    new MockTable("Weekly Athlete Summary", []),
    new MockTable("XP Events", []),
    new MockTable("Homework Completions", []),
    new MockTable("Program Homework Assignments", []),
    new MockTable("Homework Library", []),
    programInstances,
    queue,
  ]);
}

async function run076({ base }) {
  const code = readFileSync(SCRIPT_PATH, "utf8");
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, makeInput({ recordId: SUBMISSION_ID, testMode: true }), output, capturedConsole);
  } catch (caught) {
    error = caught;
  }
  return { output, error, console: capturedConsole };
}

test("076 creates one deterministic queue row and clears the readiness checkbox", async () => {
  const base = build076Base();
  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  const queue = base.getTable("Email Handoff Queue");
  const submission = base.getTable("Submissions").records.get(SUBMISSION_ID);
  assert.equal(queue.records.size, 1);
  assert.equal(queue.records.values().next().value.cells["Handoff Key"], `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`);
  assert.equal(queue.records.values().next().value.cells.Status.id, "Ready");
  assert.equal(submission.cells["Build Daily Email Now?"], false);
  assert.equal(result.output.values.actionOut, "created_handoff");
});

test("076 reuses the deterministic queue row and clears the readiness checkbox on replay", async () => {
  const base = build076Base();
  const first = await run076({ base });
  assert.equal(first.error, null, first.error?.message);

  const submission = base.getTable("Submissions").records.get(SUBMISSION_ID);
  submission.cells["Build Daily Email Now?"] = true;
  const second = await run076({ base });

  assert.equal(second.error, null, second.error?.message);
  assert.equal(base.getTable("Email Handoff Queue").records.size, 1);
  assert.equal(submission.cells["Build Daily Email Now?"], false);
  assert.equal(second.output.values.actionOut, "existing_handoff");
});

test("076 contains no direct Make, Gmail, Resend, Hub, or network call", () => {
  const source = readFileSync(SCRIPT_PATH, "utf8");
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /remoteFetchAsync/);
  assert.doesNotMatch(source, /(?:Make\.com|Gmail|Resend|Communications Hub)\s*\.(?:send|call|post)/i);
});
