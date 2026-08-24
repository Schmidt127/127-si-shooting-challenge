/**
 * Loads and executes the REAL Automation 066 script inside the mock environment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockTable,
  MockRecord,
  MockOutput,
  makeInput,
  makeConsole,
} from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const REFERENCE_ENR = "recCyFEPeATOVNlr9";
export const DISPOSABLE_ENR = "recENR066Dispo01";

const SHARED = {
  PI: "recPI06600000001",
  GRADE: "recGRADE06600001",
  ACH: "recACH066ShotMile1",
  MS10: "recMS06600000010",
  MS20: "recMS06600000020",
  WEEK: "recWEEK066000001",
};

function enrollmentCells(enrollmentId) {
  return {
    "Active?": true,
    "Grade Band": [{ id: SHARED.GRADE, name: "3-4" }],
    "Total Shots Submitted": 20,
    "Run Shot Milestone Check?": true,
    "Program Instance": [{ id: SHARED.PI }],
  };
}

export function build066Base({ enrollmentIds = [REFERENCE_ENR, DISPOSABLE_ENR], unlocks = [] } = {}) {
  const enrollments = new MockTable("Enrollments", [
    { name: "Active?", type: "checkbox" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Total Shots Submitted", type: "number" },
    { name: "Run Shot Milestone Check?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], enrollmentIds.map((id) => new MockRecord(id, enrollmentCells(id))));

  const submissions = new MockTable("Submissions", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Activity Date", type: "dateTime" },
    { name: "Total Shots Counted", type: "number" },
    { name: "Count This Submission?", type: "formula", isComputed: true },
  ], enrollmentIds.flatMap((enrollmentId, index) => [
    new MockRecord(`recSub066A${index}`, {
      Enrollment: [{ id: enrollmentId }],
      "Activity Date": "2026-08-01",
      "Total Shots Counted": 10,
      "Count This Submission?": 1,
    }),
    new MockRecord(`recSub066B${index}`, {
      Enrollment: [{ id: enrollmentId }],
      "Activity Date": "2026-08-02",
      "Total Shots Counted": 10,
      "Count This Submission?": 1,
    }),
  ]));

  const shotMilestones = new MockTable("Shot Milestones", [
    { name: "Milestone Label", type: "singleLineText" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Milestone Percent", type: "number" },
    { name: "Milestone Shot Count", type: "number" },
    { name: "Points Awarded", type: "number" },
    { name: "Active", type: "checkbox" },
    { name: "Milestone Unique Key", type: "singleLineText" },
  ], [
    new MockRecord(SHARED.MS10, {
      "Milestone Label": "10 shots",
      "Grade Band": [{ id: SHARED.GRADE }],
      "Milestone Percent": 10,
      "Milestone Shot Count": 10,
      "Points Awarded": 10,
      Active: true,
      "Milestone Unique Key": "MS-10",
    }),
    new MockRecord(SHARED.MS20, {
      "Milestone Label": "20 shots",
      "Grade Band": [{ id: SHARED.GRADE }],
      "Milestone Percent": 20,
      "Milestone Shot Count": 20,
      "Points Awarded": 20,
      Active: true,
      "Milestone Unique Key": "MS-20",
    }),
  ]);

  const achievements = new MockTable("Achievements", [
    { name: "Achievement Name", type: "singleLineText" },
    { name: "Reward Rule Key", type: "singleLineText" },
    { name: "Active?", type: "checkbox" },
  ], [
    new MockRecord(SHARED.ACH, {
      "Achievement Name": "Shot Milestone",
      "Reward Rule Key": "SHOT_MILESTONE",
      "Active?": true,
    }),
  ]);

  const unlockTable = new MockTable("Athlete Achievement Unlocks", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Achievement", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Shot Milestone", type: "multipleRecordLinks" },
    { name: "Milestone Source Key", type: "singleLineText" },
    { name: "Milestone Activity Date", type: "dateTime" },
    { name: "Active?", type: "checkbox" },
    {
      name: "XP Award Status",
      type: "singleSelect",
      options: { choices: [{ name: "Pending" }, { name: "Awarded" }] },
    },
    { name: "Notes", type: "multilineText" },
  ], unlocks);
  unlockTable.createRecordsAsync = async (records) => {
    for (const record of records) {
      await unlockTable.createRecordAsync(record.fields);
    }
  };

  const weeks = new MockTable("Weeks", [
    { name: "Start Date", type: "date" },
    { name: "End Date", type: "date" },
    { name: "Active Week?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], [
    new MockRecord(SHARED.WEEK, {
      "Start Date": "2026-08-01",
      "End Date": "2026-08-07",
      "Active Week?": true,
      "Program Instance": [{ id: SHARED.PI }],
    }),
  ]);

  return new MockBase([enrollments, submissions, shotMilestones, achievements, unlockTable, weeks]);
}

export async function run066({ base, recordId = REFERENCE_ENR, inputConfig = null }) {
  const code = readFileSync(SCRIPT_PATH, "utf-8");
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const input = makeInput(inputConfig ?? { recordId });
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, input, output, capturedConsole);
  } catch (e) {
    error = e;
  }
  return { output, console: capturedConsole, error, base };
}
