/**
 * Loads and executes the REAL Automation 031 script inside the mock environment.
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
  "../../../airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const IDS = {
  SUBMISSION: "recSubmission031001",
  ENROLLMENT: "recCyFEPeATOVNlr9",
  WEEK: "recWeVrSabnsYaHc2",
  SUMMARY_CANONICAL: "recSummary031Canon",
  SUMMARY_STALE: "recSummary031Stale",
  SUMMARY_DUPLICATE: "recSummary031Dup01",
  XP_ORPHAN: "recXp031Orphan001",
  XP_STALE: "recXp031Stale0001",
};

const TARGET_SUMMARY_KEY = "ENR-2026-2027|WEEK-EARLY-BIRD";
export const XP_SOURCE_IDS = {
  submissionBase: "selZw4nOkwMJCgGyR",
  homeworkCompletion: "selJO9UFSgtwmjbqU",
  shotMilestone: "selzPfBbqh18UvK3Y",
};

function submissionsFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Activity Date", type: "date" },
    { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
    { name: "Count This Submission?", type: "formula", isComputed: true },
    { name: "Submission Stat Mode", type: "formula", isComputed: true },
    { name: "Build Daily Email Now?", type: "checkbox" },
  ];
}

function enrollmentsFields() {
  return [
    { name: "Enrollment Key", type: "formula", isComputed: true },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ];
}

function weeksFields() {
  return [
    { name: "Week Key", type: "formula", isComputed: true },
    { name: "Week Name", type: "singleLineText" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ];
}

function summariesFields() {
  return [
    { name: "Summary Key", type: "formula", isComputed: true },
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Submissions", type: "multipleRecordLinks" },
    {
      name: "Summary Calculation Status",
      type: "singleSelect",
      options: { choices: [{ id: "selComplete", name: "Complete" }] },
    },
    { name: "Created", type: "formula", isComputed: true },
  ];
}

function xpEventsFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
    {
      name: "XP Source",
      type: "singleSelect",
      options: {
        choices: [
          { id: XP_SOURCE_IDS.submissionBase, name: "Submission Base" },
          { id: XP_SOURCE_IDS.homeworkCompletion, name: "Homework Completion" },
          { id: XP_SOURCE_IDS.shotMilestone, name: "Shot Milestone" },
        ],
      },
    },
  ];
}

function defaultSummaries() {
  return [
    new MockRecord(IDS.SUMMARY_CANONICAL, {
      "Summary Key": TARGET_SUMMARY_KEY,
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      Submissions: [],
      "Summary Calculation Status": "",
      Created: "2026-08-07T00:00:00.000Z",
    }),
    new MockRecord(IDS.SUMMARY_STALE, {
      "Summary Key": "ENR-OLD|WEEK-OLD",
      Enrollment: [{ id: "recWrongEnrollment031", name: "Wrong Enrollment" }],
      Week: [{ id: "recWrongWeek031", name: "Wrong Week" }],
      Submissions: [{ id: IDS.SUBMISSION, name: "Submission" }],
      "Summary Calculation Status": "",
      Created: "2026-08-06T00:00:00.000Z",
    }),
  ];
}

function defaultXpEvents() {
  return [
    new MockRecord(IDS.XP_ORPHAN, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [],
      "XP Source": {
        id: XP_SOURCE_IDS.homeworkCompletion,
        name: "Homework Completion",
      },
    }),
    new MockRecord(IDS.XP_STALE, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
      "XP Source": {
        id: XP_SOURCE_IDS.shotMilestone,
        name: "Shot Milestone",
      },
    }),
  ];
}

export function build031Base(opts = {}) {
  const {
    submissionCells = {},
    summaries = defaultSummaries(),
    xpEvents = defaultXpEvents(),
  } = opts;

  const submissions = new MockTable("Submissions", submissionsFields(), [
    new MockRecord(IDS.SUBMISSION, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Activity Date": "2026-08-07",
      "Weekly Athlete Summary": [],
      // Formula results; v3.8 must read evaluated values rather than require
      // physical readiness-input field types.
      "Count This Submission?": "1",
      "Submission Stat Mode": "Counted",
      "Build Daily Email Now?": false,
      ...submissionCells,
    }),
  ]);

  const enrollments = new MockTable("Enrollments", enrollmentsFields(), [
    new MockRecord(IDS.ENROLLMENT, {
      "Enrollment Key": "ENR-2026-2027",
      "Program Instance": [{ id: "recPI2026", name: "2026-2027" }],
    }),
  ]);

  const weeks = new MockTable("Weeks", weeksFields(), [
    new MockRecord(IDS.WEEK, {
      "Week Key": "WEEK-EARLY-BIRD",
      "Week Name": "Early Bird",
      "Program Instance": [{ id: "recPI2026", name: "2026-2027" }],
    }),
  ]);

  const summariesTable = new MockTable("Weekly Athlete Summary", summariesFields(), summaries);
  const xpEventsTable = new MockTable("XP Events", xpEventsFields(), xpEvents);

  return new MockBase([
    submissions,
    enrollments,
    weeks,
    summariesTable,
    xpEventsTable,
  ]);
}

export async function run031({ base, recordId = IDS.SUBMISSION }) {
  const code = readFileSync(SCRIPT_PATH, "utf-8");
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const input = makeInput({ recordId });
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, input, output, capturedConsole);
  } catch (e) {
    error = e;
  }
  return { output, console: capturedConsole, error, base };
}
