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

function build076Base(
  queueRecords = [],
  submissionCells = {},
  includeProgramInstanceTable = true,
  enrollmentCells = {}
) {
  const submissions = new MockTable(
    "Submissions",
    [
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
      { name: "Activity Date", type: "date" },
      { name: "Build Daily Email Now?", type: "checkbox" },
      { name: "Count This Submission?", type: "formula", isComputed: true },
      { name: "Submission Stat Mode", type: "formula", isComputed: true },
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
        "Submission Stat Mode": "Simple Total",
        "Total Shots Counted": 20,
        "Total Makes Counted": 10,
        ...submissionCells,
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
        ...enrollmentCells,
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
    "Program Instance - Sync",
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
    ...(includeProgramInstanceTable ? [programInstances] : []),
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

test("076 uses the exact Production Program Instance table name", async () => {
  const source = readFileSync(SCRIPT_PATH, "utf8");
  const base = build076Base();

  assert.match(source, /pi:\s*"Program Instance - Sync"/);
  assert.doesNotMatch(source, /getTable\(\s*"Program Instance - Synced"\s*\)/);
  assert.equal(base.tables.has("Program Instance - Sync"), true);
  assert.equal(base.tables.has("Program Instance - Synced"), false);
});

test("076 fails before queue creation when the required Program Instance table is missing", async () => {
  const base = build076Base([], {}, false);
  const result = await run076({ base });

  assert.ok(result.error);
  assert.equal(result.output.values.statusOut, "error");
  assert.equal(base.getTable("Email Handoff Queue").records.size, 0);
  assert.equal(
    base.getTable("Submissions").records.get(SUBMISSION_ID).cells["Build Daily Email Now?"],
    true
  );
});

test("076 creates one deterministic queue row from a valid cleaned parent email", async () => {
  const base = build076Base();
  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  const queue = base.getTable("Email Handoff Queue");
  const submission = base.getTable("Submissions").records.get(SUBMISSION_ID);
  assert.equal(queue.records.size, 1);
  assert.equal(queue.records.values().next().value.cells["Handoff Key"], `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION_ID}`);
  assert.equal(queue.records.values().next().value.cells.Status.id, "Ready");
  const payload = JSON.parse(queue.records.values().next().value.cells["Payload JSON"]);
  const recipients = JSON.parse(queue.records.values().next().value.cells["Recipients JSON"]);
  assert.equal(payload.shots, 20);
  assert.equal(payload.makes, 10);
  assert.deepEqual(recipients, [{
    email: "mschmidt@fairfield.k12.mt.us",
    role: "guardian",
    displayName: "Schmidt Test Athlete",
  }]);
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

test("076 does not use raw Parent Email when the cleaned parent field is blank", async () => {
  const base = build076Base([], {}, true, {
    "Parent Email - Cleaned": "",
    "Parent Email": "raw-parent@example.com",
  });
  const result = await run076({ base });

  assert.ok(result.error);
  assert.match(result.error.message, /cleaned parent recipient/);
  assert.equal(base.getTable("Email Handoff Queue").records.size, 0);
  assert.equal(
    base.getTable("Submissions").records.get(SUBMISSION_ID).cells["Build Daily Email Now?"],
    true
  );
});

test("076 deduplicates identical cleaned parent and athlete emails case-insensitively", async () => {
  const base = build076Base([], {}, true, {
    "Parent Email - Cleaned": "Mike@Example.com",
    "Athlete Email - Cleaned": " mike@example.com ",
  });
  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  const recipients = JSON.parse(
    base.getTable("Email Handoff Queue").records.values().next().value.cells["Recipients JSON"]
  );
  assert.deepEqual(recipients, [{
    email: "mike@example.com",
    role: "guardian",
    displayName: "Schmidt Test Athlete",
  }]);
});

test("076 rejects missing or invalid cleaned parent email before queue creation", async () => {
  for (const parent of ["", "not-an-email", "one@example.com, two@example.com"]) {
    const base = build076Base([], {}, true, {
      "Parent Email - Cleaned": parent,
    });
    const result = await run076({ base });

    assert.ok(result.error);
    assert.match(result.error.message, /cleaned parent recipient/);
    assert.equal(base.getTable("Email Handoff Queue").records.size, 0);
    assert.equal(
      base.getTable("Submissions").records.get(SUBMISSION_ID).cells["Build Daily Email Now?"],
      true
    );
  }
});

test("076 accepts Detailed Shooting mode and preserves payload numbers", async () => {
  const base = build076Base([], {
    "Submission Stat Mode": "  dEtAiLeD sHoOtInG  ",
  });
  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  const queue = base.getTable("Email Handoff Queue");
  const submission = base.getTable("Submissions").records.get(SUBMISSION_ID);
  const payload = JSON.parse(queue.records.values().next().value.cells["Payload JSON"]);
  assert.equal(queue.records.size, 1);
  assert.equal(payload.shots, 20);
  assert.equal(payload.makes, 10);
  assert.equal(submission.cells["Build Daily Email Now?"], false);
});

test("076 skips count formula 0 without creating a queue row", async () => {
  const base = build076Base([], {
    "Count This Submission?": "0",
  });
  const result = await run076({ base });

  assert.equal(result.error, null);
  assert.equal(result.output.values.actionOut, "skipped_not_ready");
  assert.equal(base.getTable("Email Handoff Queue").records.size, 0);
  assert.equal(
    base.getTable("Submissions").records.get(SUBMISSION_ID).cells["Build Daily Email Now?"],
    true
  );
});

test("076 skips blank and unknown stat modes without creating a queue row", async () => {
  for (const mode of ["", "Pending"]) {
    const base = build076Base([], {
      "Submission Stat Mode": mode,
    });
    const result = await run076({ base });

    assert.equal(result.error, null);
    assert.equal(result.output.values.actionOut, "skipped_not_ready");
    assert.equal(base.getTable("Email Handoff Queue").records.size, 0);
    assert.equal(
      base.getTable("Submissions").records.get(SUBMISSION_ID).cells["Build Daily Email Now?"],
      true
    );
  }
});

test("076 contains no direct Make, Gmail, Resend, Hub, or network call", () => {
  const source = readFileSync(SCRIPT_PATH, "utf8");
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /remoteFetchAsync/);
  assert.doesNotMatch(source, /(?:Make\.com|Gmail|Resend|Communications Hub)\s*\.(?:send|call|post)/i);
});
