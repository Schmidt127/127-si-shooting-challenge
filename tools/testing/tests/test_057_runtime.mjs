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
  weeklyGoal = target,
  fallbackGoal = null,
  enrollmentActive = true,
  extraGoals = [],
  zoomRecords = [],
  zoomAttendanceRecords = [],
  weekStart = "2026-08-02",
  submissionRecords = [],
} = {}) {
  const submissionIds = submissionRecords.map((record) => record.id);
  const weekly = new MockTable("Weekly Athlete Summary", WEEKLY_FIELDS, [
    new MockRecord(IDS.was, {
      Enrollment: linked(IDS.enrollment),
      Week: linked(IDS.week),
      "Grade Band": linked(IDS.gradeBand),
      "Goal Record": linked(IDS.goal),
      "Weekly Goal Shots Target": weeklyGoal,
      "Goal Shots Target": fallbackGoal,
      Submissions: submissionIds.map((id) => ({ id, name: id })),
      Homework: [],
      "Homework Completions Link": [],
    }),
  ]);
  const submissions = new MockTable("Submissions", [
    { name: "Activity Date", type: "date" },
    { name: "Counted Activity Date Key", type: "singleLineText" },
    { name: "Total Shots Counted", type: "number" },
    { name: "Perfect Week Countable Submission?", type: "checkbox" },
  ], submissionRecords);
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
    new MockRecord(IDS.week, { "Start Date": weekStart }),
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
  assert.match(SOURCE, /Version: 1\.10/);
  console.log(`SOURCE_EXECUTED ${SCRIPT_PATH} sha256=${SOURCE_SHA256}`);
});

function makeCountableSubmission(id, dateKey, {
  activityDate = new Date(`${dateKey}T00:00:00.000Z`),
  shots = 100,
} = {}) {
  return new MockRecord(id, {
    "Activity Date": activityDate,
    "Counted Activity Date Key": dateKey,
    "Total Shots Counted": shots,
    "Perfect Week Countable Submission?": 1,
  });
}

function buildSevenDayWeekSubmissions(weekStart, {
  lastDayActivityDate = null,
  lastDayDateKey = null,
  duplicateLastDay = null,
} = {}) {
  const start = new Date(`${weekStart}T12:00:00.000Z`);
  const records = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const dateKey = date.toISOString().slice(0, 10);
    const isLastDay = offset === 6;
    const activityDate = isLastDay && lastDayActivityDate ? lastDayActivityDate : new Date(`${dateKey}T00:00:00.000Z`);
    const canonicalKey = isLastDay && lastDayDateKey ? lastDayDateKey : dateKey;
    records.push(makeCountableSubmission(`recSub057Day${offset}`, canonicalKey, { activityDate }));
  }
  if (duplicateLastDay) {
    records.push(makeCountableSubmission("recSub057DupLast", duplicateLastDay.dateKey, {
      activityDate: duplicateLastDay.activityDate,
      shots: duplicateLastDay.shots,
    }));
  }
  return records;
}

test("positive configured target reaches Ready", async () => {
  const base = buildBase({ target: 700, weeklyGoal: 700 });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Automation Error"], "");
});

test("explicit configured zero is accepted rather than treated as missing", async () => {
  const base = buildBase({ target: 0, weeklyGoal: 0 });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Ready");
  assert.equal(weeklyCells(base)["Perfect Week Daily Check Status"], "Fail");
});

test("missing configured target fails closed", async () => {
  const base = buildBase({ target: null, weeklyGoal: 700 });
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
  const base = buildBase({ target: "", weeklyGoal: 700 });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /not one exact active numeric configuration/);
});

test("unsettled or mismatched weekly lookup writes Needs Review without positive work", async () => {
  const base = buildBase({ target: 700, weeklyGoal: 699 });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");
  assert.match(
    weeklyCells(base)["Perfect Week Automation Error"],
    /has not settled to the linked active goal target/
  );
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
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

test("Fillout midnight-UTC Activity Date stays on canonical Counted Activity Date Key", async () => {
  const base = buildBase({
    target: 700,
    weeklyGoal: 700,
    weekStart: "2026-08-16",
    submissionRecords: buildSevenDayWeekSubmissions("2026-08-16", {
      lastDayActivityDate: new Date("2026-08-22T00:00:00.000Z"),
      lastDayDateKey: "2026-08-22",
    }),
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Daily Requirement Met?"], true);
  assert.match(weeklyCells(base)["Perfect Week Daily Check Detail"], /2026-08-22: 100\/100/);
});

test("August 19 evening remains August 19 using Counted Activity Date Key", async () => {
  const base = buildBase({
    target: 700,
    weeklyGoal: 700,
    weekStart: "2026-08-16",
    submissionRecords: buildSevenDayWeekSubmissions("2026-08-16", {
      lastDayActivityDate: new Date("2026-08-22T00:00:00.000Z"),
      lastDayDateKey: "2026-08-22",
    }).map((record) => {
      if (record.id === "recSub057Day3") {
        record.cells["Activity Date"] = new Date("2026-08-19T23:34:00.000Z");
        record.cells["Counted Activity Date Key"] = "2026-08-19";
      }
      return record;
    }),
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.match(weeklyCells(base)["Perfect Week Daily Check Detail"], /2026-08-19: 100\/100/);
  assert.doesNotMatch(weeklyCells(base)["Perfect Week Daily Check Detail"], /Missing official week days:.*2026-08-19/);
});

test("duplicate same-day submissions aggregate shots for one official day", async () => {
  const base = buildBase({
    target: 700,
    weeklyGoal: 700,
    weekStart: "2026-08-16",
    submissionRecords: buildSevenDayWeekSubmissions("2026-08-16", {
      lastDayActivityDate: new Date("2026-08-22T00:00:00.000Z"),
      lastDayDateKey: "2026-08-22",
      duplicateLastDay: {
        dateKey: "2026-08-22",
        activityDate: new Date("2026-08-22T00:00:00.000Z"),
        shots: 50,
      },
    }),
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Daily Requirement Met?"], true);
  assert.match(weeklyCells(base)["Perfect Week Daily Check Detail"], /Passing official days: 7\/7/);
  assert.match(weeklyCells(base)["Perfect Week Daily Check Detail"], /2026-08-22: 150\/100/);
});

test("blank Counted Activity Date Key fails closed for countable submissions", async () => {
  const submissions = buildSevenDayWeekSubmissions("2026-08-16");
  submissions[0].cells["Counted Activity Date Key"] = "";
  const base = buildBase({
    target: 700,
    weeklyGoal: 700,
    weekStart: "2026-08-16",
    submissionRecords: submissions,
  });
  const { error } = await run057(base);
  assert.match(error?.message ?? "", /blank or malformed Counted Activity Date Key/);
  assert.equal(lastWeeklyUpdate(base)["Perfect Week Automation Status"].name, "Error");
});

test("unsettled weekly goal still fails closed without positive Perfect Week work", async () => {
  const base = buildBase({
    target: 700,
    weeklyGoal: 699,
    weekStart: "2026-08-16",
    submissionRecords: buildSevenDayWeekSubmissions("2026-08-16"),
  });
  const { error } = await run057(base);
  assert.equal(error, null);
  assert.equal(weeklyCells(base)["Perfect Week Automation Status"], "Error");
  assert.match(
    weeklyCells(base)["Perfect Week Automation Error"],
    /has not settled to the linked active goal target/
  );
  assert.equal(base.getTable("Zoom Attendance").updates.length, 0);
});
