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
      { name: "2PT Attempted Counted", type: "number" },
      { name: "2PT Made Counted", type: "number" },
      { name: "3PT Attempted Counted", type: "number" },
      { name: "3PT Made Counted", type: "number" },
      { name: "FT Attempted Counted", type: "number" },
      { name: "FT Made Counted", type: "number" },
    ],
    [
      new MockRecord(SUBMISSION_ID, {
        Enrollment: [{ id: "recEnrollment076001", name: "Schmidt Enrollment" }],
        Week: [{ id: "recWeek07600001", name: "Early Bird" }],
        "Weekly Athlete Summary": [{ id: "recWas0760001", name: "Schmidt · Early Bird" }],
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
      { name: "Grade Band", type: "multipleRecordLinks" },
      { name: "Parent Email - Cleaned", type: "email" },
      { name: "Athlete Email - Cleaned", type: "email" },
      { name: "Full Athlete Name", type: "singleLineText" },
      { name: "Current Shooting Streak", type: "number" },
      { name: "Current Level", type: "multipleRecordLinks" },
      { name: "Next Level", type: "multipleRecordLinks" },
      { name: "Public Profile Enabled", type: "checkbox" },
      { name: "Public Profile Slug", type: "singleLineText" },
    ],
    [
      new MockRecord("recEnrollment076001", {
        "Active?": true,
        "Program Instance": [{ id: "recProgram0760001", name: "2026-2027" }],
        "Grade Band": [{ id: "recGrade0760001", name: "5-6" }],
        "Parent Email - Cleaned": "mschmidt@fairfield.k12.mt.us",
        "Athlete Email - Cleaned": "",
        "Full Athlete Name": "Schmidt Test Athlete",
        "Current Shooting Streak": 0,
        "Current Level": [{ id: "recLevelCurrent01", name: "Beginner" }],
        "Next Level": [{ id: "recLevelNext00001", name: "Rookie Shooter" }],
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
        "Start Date": "2026-08-03",
        "End Date": "2026-08-09",
      }),
    ]
  );

  const programInstances = new MockTable(
    "Program Instance - Sync",
    [
      { name: "Name - Program Instance", type: "singleLineText" },
      { name: "Daily Submission URL", type: "url" },
    ],
    [new MockRecord("recProgram0760001", { "Name - Program Instance": "2026-2027" })]
  );

  const weeklySummaries = new MockTable(
    "Weekly Athlete Summary",
    [
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Goal Record", type: "multipleRecordLinks" },
      { name: "Goal Shots Target", type: "number" },
      { name: "Weekly Goal Shots Target", type: "number" },
      { name: "Total Shots This Week", type: "number" },
      { name: "Week - Display", type: "singleLineText" },
    ],
    [
      new MockRecord("recWas0760001", {
        Enrollment: [{ id: "recEnrollment076001", name: "Schmidt Enrollment" }],
        Week: [{ id: "recWeek07600001", name: "Early Bird" }],
        "Goal Record": [{ id: "recGoal0760001", name: "5-6 · 1,000" }],
        "Goal Shots Target": 1000,
        "Weekly Goal Shots Target": 111,
        "Total Shots This Week": 20,
        "Week - Display": "Early Bird",
      }),
    ]
  );

  const targetGoals = new MockTable(
    "Target Goal Shots",
    [
      { name: "Program Instance", type: "multipleRecordLinks" },
      { name: "Grade Band", type: "multipleRecordLinks" },
      { name: "Active?", type: "checkbox" },
      { name: "Total Shot Target", type: "number" },
    ],
    [
      new MockRecord("recGoal0760001", {
        "Program Instance": [{ id: "recProgram0760001", name: "2026-2027" }],
        "Grade Band": [{ id: "recGrade0760001", name: "5-6" }],
        "Active?": true,
        "Total Shot Target": 1000,
      }),
    ]
  );

  const levels = new MockTable(
    "Levels",
    [
      { name: "Level Name", type: "singleLineText" },
      { name: "Cover Image", type: "multipleAttachments" },
    ],
    [
      new MockRecord("recLevelCurrent01", {
        "Level Name": "Beginner",
        "Cover Image": [{ url: "https://v5.airtableusercontent.com/beginner.png" }],
      }),
      new MockRecord("recLevelNext00001", {
        "Level Name": "Rookie Shooter",
        "Cover Image": [{ url: "https://v5.airtableusercontent.com/rookie.png" }],
      }),
    ]
  );

  const queue = new MockTable(
    "Email Handoff Queue",
    [
      { name: "Handoff Key", type: "singleLineText" },
      singleSelect("Status", ["Draft", "Ready", "Needs Review"]),
      { name: "Source Table", type: "singleLineText" },
      singleSelect("Event Type", ["DAILY_SUBMISSION"]),
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
    weeklySummaries,
    targetGoals,
    levels,
    new MockTable("XP Events", []),
    new MockTable(
      "Homework Completions",
      [
        { name: "Enrollment", type: "multipleRecordLinks" },
        { name: "Week", type: "multipleRecordLinks" },
        { name: "Program Homework Assignment", type: "multipleRecordLinks" },
        { name: "Homework", type: "multipleRecordLinks" },
        { name: "Satisfactory?", type: "checkbox" },
        { name: "Completion Status", type: "singleLineText" },
      ],
      []
    ),
    new MockTable(
      "Program Homework Assignments",
      [
        { name: "Homework Assignment", type: "multipleRecordLinks" },
        { name: "Program Instance", type: "multipleRecordLinks" },
        { name: "Week", type: "multipleRecordLinks" },
        { name: "Grade Band", type: "multipleRecordLinks" },
        { name: "Homework Slot", type: "singleLineText" },
        { name: "Active?", type: "checkbox" },
      ],
      []
    ),
    new MockTable(
      "Homework Library",
      [
        { name: "Assignment Title", type: "singleLineText" },
        { name: "Assignment Full Name", type: "singleLineText" },
        { name: "URL", type: "url" },
      ],
      []
    ),
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
  assert.equal(queue.records.values().next().value.cells.Status, "Ready");
  const payload = JSON.parse(queue.records.values().next().value.cells["Payload JSON"]);
  const recipients = JSON.parse(queue.records.values().next().value.cells["Recipients JSON"]);
  assert.equal(payload.shots, 20);
  assert.equal(payload.makes, 10);
  assert.equal(payload.submissionStatMode, "Simple Total");
  assert.equal(payload.currentLevel, "Beginner");
  assert.equal(payload.currentLevelImageUrl, "https://v5.airtableusercontent.com/beginner.png");
  assert.equal(payload.shootingPercentage, 50);
  assert.match(payload.weekDateRange, /–/);
  assert.equal(payload.xpPageUrl, "https://www.fairfieldbasketballclub.com/shoot/dashboard");
  assert.equal(payload.landingPageUrl, "https://www.fairfieldbasketballclub.com");
  assert.equal(payload.dailySubmissionFormUrl, "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions");
  assert.equal(payload.homeworkPageUrl, "https://www.fairfieldbasketballclub.com/shoot/homework");
  assert.deepEqual(recipients, [{
    email: "mschmidt@fairfield.k12.mt.us",
    role: "guardian",
    displayName: "Schmidt Test Athlete",
  }]);
  assert.equal(submission.cells["Build Daily Email Now?"], false);
  assert.equal(result.output.values.actionOut, "created_handoff");
});

test("076 writes Event Type and Status as Airtable-compatible single-select objects", async () => {
  const base = build076Base();
  const queue = base.getTable("Email Handoff Queue");
  const originalCreate = queue.createRecordAsync.bind(queue);
  queue.createRecordAsync = async (payload) => {
    assert.deepEqual(payload["Event Type"], { name: "DAILY_SUBMISSION" });
    assert.deepEqual(payload.Status, { name: "Draft" });
    return originalCreate(payload);
  };

  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  assert.deepEqual(queue.updates.at(-1).fields.Status, { name: "Ready" });
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
    "2PT Attempted Counted": 20,
    "2PT Made Counted": 12,
    "3PT Attempted Counted": 10,
    "3PT Made Counted": 4,
    "FT Attempted Counted": 5,
    "FT Made Counted": 4,
  });
  const result = await run076({ base });

  assert.equal(result.error, null, result.error?.message);
  const queue = base.getTable("Email Handoff Queue");
  const submission = base.getTable("Submissions").records.get(SUBMISSION_ID);
  const payload = JSON.parse(queue.records.values().next().value.cells["Payload JSON"]);
  assert.equal(queue.records.size, 1);
  assert.equal(payload.submissionStatMode, "Detailed Shooting");
  assert.equal(payload.shots, 20);
  assert.equal(payload.makes, 10);
  assert.deepEqual(payload.shootingDetails.twoPoint, { made: 12, missed: 8, percentage: 60 });
  assert.equal(submission.cells["Build Daily Email Now?"], false);
});

test("076 includes PHA rows with blank grade band when enrollment has a grade band", async () => {
  const base = build076Base();
  base.getTable("Program Homework Assignments").records.set(
    "recPha0760001",
    new MockRecord("recPha0760001", {
      "Homework Assignment": [{ id: "recHomeworkLib01", name: "Perfect Testing Week Journal" }],
      "Program Instance": [{ id: "recProgram0760001", name: "2026-2027" }],
      Week: [{ id: "recWeek07600001", name: "Early Bird" }],
      "Grade Band": [],
      "Homework Slot": "HW1",
      "Active?": true,
    })
  );
  base.getTable("Homework Library").records.set(
    "recHomeworkLib01",
    new MockRecord("recHomeworkLib01", {
      "Assignment Title": "Perfect Testing Week Journal",
      "Assignment Full Name": "Perfect Testing Week Journal",
      URL: "https://example.com/hw",
    })
  );

  const result = await run076({ base });
  assert.equal(result.error, null, result.error?.message);
  const payload = JSON.parse(
    base.getTable("Email Handoff Queue").records.values().next().value.cells["Payload JSON"]
  );
  assert.equal(payload.homeworkItems.length, 1);
  assert.equal(payload.homeworkItems[0].name, "Perfect Testing Week Journal");
  assert.equal(payload.homeworkItems[0].status, "Not submitted");
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
