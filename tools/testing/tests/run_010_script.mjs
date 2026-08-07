/**
 * Loads and executes the REAL Automation 010 script inside the mock environment.
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
  "../../../airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const IDS = {
  SUBMISSION: "recSubmission010001",
  ENROLLMENT: "recCyFEPeATOVNlr9",
  WEEK: "recWeVrSabnsYaHc2",
  SUMMARY_CANONICAL: "recSummaryCanonical1",
  SUMMARY_STALE: "recSummaryStale0001",
  XP_EVENT: "recXpEvent01000001",
  XP_RULE: "recXpRule01000001",
};

function submissionsFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
    { name: "Submission Key", type: "singleLineText" },
    { name: "Activity Date", type: "dateTime" },
    { name: "Total Shots Counted", type: "number" },
    { name: "Count This Submission?", type: "checkbox" },
    {
      name: "XP Award Status",
      type: "singleSelect",
      options: { choices: [{ name: "Awarded" }, { name: "Error" }] },
    },
    { name: "XP Events", type: "multipleRecordLinks" },
  ];
}

function xpEventsFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Submission", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
    {
      name: "XP Source",
      type: "singleSelect",
      options: { choices: [{ name: "Submission Base" }] },
    },
    {
      name: "XP Bucket",
      type: "singleSelect",
      options: { choices: [{ name: "Shooting Base" }] },
    },
    { name: "XP Points", type: "number" },
    { name: "XP Reason Public", type: "singleLineText" },
    { name: "XP Reason Debug", type: "multilineText" },
    { name: "Active?", type: "checkbox" },
    { name: "Source Key", type: "singleLineText" },
    { name: "XP Source Date", type: "dateTime" },
    {
      name: "XP Date Source",
      type: "singleSelect",
      options: { choices: [{ name: "Submission Activity Date" }] },
    },
    { name: "XP Dedupe Key", type: "singleLineText" },
    { name: "XP Dedupe Key Normalized", type: "singleLineText" },
    { name: "Weekly Summary Key", type: "singleLineText" },
    { name: "Streak Occurrence Key", type: "singleLineText" },
  ];
}

function xpRulesFields() {
  return [
    { name: "Rule Key", type: "singleLineText" },
    { name: "XP Amount", type: "number" },
    { name: "Active?", type: "checkbox" },
  ];
}

function enrollmentsFields() {
  return [{ name: "Run Shot Milestone Check?", type: "checkbox" }];
}

function weeklySummaryFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
  ];
}

export function build010Base(opts = {}) {
  const {
    submissionCells = {},
    xpEventCells = {},
    weeklySummaries = [],
  } = opts;

  const submissions = new MockTable("Submissions", submissionsFields(), [
    new MockRecord(IDS.SUBMISSION, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
      "Submission Key": "SUBMISSION-010-KEY",
      "Activity Date": "2026-08-07",
      "Total Shots Counted": 150,
      "Count This Submission?": true,
      "XP Award Status": "",
      "XP Events": [{ id: IDS.XP_EVENT, name: "Submission XP" }],
      ...submissionCells,
    }),
  ]);

  const xpEvents = new MockTable("XP Events", xpEventsFields(), [
    new MockRecord(IDS.XP_EVENT, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
      "XP Source": { name: "Submission Base" },
      "XP Bucket": { name: "Shooting Base" },
      "XP Points": 20,
      "XP Reason Public": "",
      "XP Reason Debug": "",
      "Active?": true,
      "Source Key": `SUBMISSION_XP|${IDS.SUBMISSION}`,
      "XP Source Date": "2026-08-07",
      "XP Date Source": { name: "Submission Activity Date" },
      "XP Dedupe Key": `${IDS.ENROLLMENT}|${IDS.SUBMISSION}|Submission Base`,
      "XP Dedupe Key Normalized": `${IDS.ENROLLMENT.toLowerCase()}|${IDS.SUBMISSION.toLowerCase()}|submission base`,
      "Weekly Summary Key": "",
      "Streak Occurrence Key": "",
      ...xpEventCells,
    }),
  ]);

  const xpRules = new MockTable("XP Reward Rules", xpRulesFields(), [
    new MockRecord(IDS.XP_RULE, {
      "Rule Key": "SHOOTING_BASE",
      "XP Amount": 20,
      "Active?": true,
    }),
  ]);

  const enrollments = new MockTable("Enrollments", enrollmentsFields(), [
    new MockRecord(IDS.ENROLLMENT, {
      "Run Shot Milestone Check?": false,
    }),
  ]);

  const summaryRecords = weeklySummaries.length
    ? weeklySummaries
    : [
        new MockRecord(IDS.SUMMARY_CANONICAL, {
          Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
          Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        }),
        new MockRecord(IDS.SUMMARY_STALE, {
          Enrollment: [{ id: "recWrongEnrollment0001", name: "Wrong Enrollment" }],
          Week: [{ id: "recWrongWeek0000001", name: "Wrong Week" }],
        }),
      ];

  const weeklySummary = new MockTable(
    "Weekly Athlete Summary",
    weeklySummaryFields(),
    summaryRecords
  );

  return new MockBase([submissions, xpEvents, xpRules, enrollments, weeklySummary]);
}

export async function run010({ base, recordId = IDS.SUBMISSION }) {
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
