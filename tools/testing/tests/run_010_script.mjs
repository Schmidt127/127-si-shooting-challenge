/**
 * Loads and executes the REAL Automation 010 script inside the mock environment.
 * Updated for v10.12 formula/link settlement grace.
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
  HOMEWORK_XP_EVENT: "recHomeworkXp010001",
  XP_RULE: "recXpRule01000001",
};

export const CURRENT_SIGNATURE = "SIG-010-OFFLINE-CURRENT";

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
    { name: "Current Reconciliation Signature", type: "formula", isComputed: true },
    { name: "Last Reconciled Signature", type: "singleLineText" },
    { name: "Reconciliation Needed?", type: "formula", isComputed: true },
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
      options: {
        choices: [
          { id: "selZw4nOkwMJCgGyR", name: "Submission Base" },
          { name: "Homework" },
        ],
      },
    },
    {
      name: "XP Bucket",
      type: "singleSelect",
      options: { choices: [{ name: "Shooting Base" }, { name: "Homework" }] },
    },
    { name: "XP Points", type: "number" },
    { name: "XP Reason Public", type: "singleLineText" },
    { name: "XP Reason Debug", type: "multilineText" },
    { name: "Active?", type: "checkbox" },
    { name: "Source Key", type: "singleLineText" },
    { name: "XP Activity Date", type: "dateTime" },
    {
      name: "XP Activity Date Source",
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
  return [
    { name: "Active?", type: "checkbox" },
    { name: "Run Shot Milestone Check?", type: "checkbox" },
    { name: "Enrollment Key", type: "formula", isComputed: true },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ];
}

function weeksFields() {
  return [
    { name: "Week Key", type: "formula", isComputed: true },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Start Date", type: "dateTime" },
    { name: "End Date", type: "dateTime" },
  ];
}

function weeklySummaryFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Summary Key", type: "formula", isComputed: true },
  ];
}

function applyReconciliationLatch(record) {
  const last = String(record.cells["Last Reconciled Signature"] || "").trim();
  record.cells["Current Reconciliation Signature"] = CURRENT_SIGNATURE;
  record.cells["Reconciliation Needed?"] = CURRENT_SIGNATURE && CURRENT_SIGNATURE !== last ? 1 : 0;
}

class ReconciliationSubmissionsTable extends MockTable {
  async selectRecordAsync(recordId, opts) {
    const record = await super.selectRecordAsync(recordId, opts);
    if (record) applyReconciliationLatch(record);
    return record;
  }

  async updateRecordAsync(recordId, fields) {
    await super.updateRecordAsync(recordId, fields);
    const record = this.records.get(recordId);
    if (record) applyReconciliationLatch(record);
  }
}

export function build010Base(opts = {}) {
  const {
    submissionCells = {},
    xpEventCells = {},
    xpEventActive = true,
    xpEvents = null,
    weeklySummaries = [],
  } = opts;

  const defaultSubmissionXpLinks = xpEvents === null
    ? [{ id: IDS.XP_EVENT, name: "Submission XP" }]
    : [];

  const submissions = new ReconciliationSubmissionsTable("Submissions", submissionsFields(), [
    new MockRecord(IDS.SUBMISSION, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [],
      "Submission Key": "SUBMISSION-010-KEY",
      "Activity Date": "2026-08-07",
      "Total Shots Counted": 150,
      "Count This Submission?": true,
      "XP Award Status": "",
      "XP Events": defaultSubmissionXpLinks,
      "Last Reconciled Signature": "",
      ...submissionCells,
    }),
  ]);

  const defaultXpEvents = [
    new MockRecord(IDS.XP_EVENT, {
      Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
      Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
      Week: [{ id: IDS.WEEK, name: "Early Bird" }],
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Source": { id: "selZw4nOkwMJCgGyR", name: "Submission Base" },
      "XP Bucket": { name: "Shooting Base" },
      "XP Points": 20,
      "XP Reason Public": "",
      "XP Reason Debug": "",
      "Active?": xpEventActive,
      "Source Key": `SUBMISSION_XP|${IDS.SUBMISSION}`,
      "XP Activity Date": "2026-08-07",
      "XP Activity Date Source": { name: "Submission Activity Date" },
      "XP Dedupe Key": `${IDS.ENROLLMENT}|${IDS.SUBMISSION}|Submission Base`,
      "XP Dedupe Key Normalized": `${IDS.ENROLLMENT.toLowerCase()}|${IDS.SUBMISSION.toLowerCase()}|submission base`,
      "Weekly Summary Key": "",
      "Streak Occurrence Key": "",
      ...xpEventCells,
    }),
  ];

  const xpEventRecords = xpEvents === null
    ? defaultXpEvents
    : xpEvents;

  const xpEventsTable = new MockTable("XP Events", xpEventsFields(), xpEventRecords);

  const xpRules = new MockTable("XP Reward Rules", xpRulesFields(), [
    new MockRecord(IDS.XP_RULE, {
      "Rule Key": "SHOOTING_BASE",
      "XP Amount": 20,
      "Active?": true,
    }),
  ]);

  const enrollments = new MockTable("Enrollments", enrollmentsFields(), [
    new MockRecord(IDS.ENROLLMENT, {
      "Active?": true,
      "Run Shot Milestone Check?": false,
      "Enrollment Key": "ENR-2026-2027",
      "Program Instance": [{ id: "recPI2026", name: "2026-2027" }],
    }),
  ]);

  const weeks = new MockTable("Weeks", weeksFields(), [
    new MockRecord(IDS.WEEK, {
      "Week Key": "WEEK-EARLY-BIRD",
      "Program Instance": [{ id: "recPI2026", name: "2026-2027" }],
      "Start Date": "2026-08-01",
      "End Date": "2026-08-31",
    }),
  ]);

  const summaryRecords = weeklySummaries.length
    ? weeklySummaries
    : [
        new MockRecord(IDS.SUMMARY_CANONICAL, {
          Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
          Week: [{ id: IDS.WEEK, name: "Early Bird" }],
          "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
        }),
      ];

  const weeklySummary = new MockTable(
    "Weekly Athlete Summary",
    weeklySummaryFields(),
    summaryRecords
  );

  return new MockBase([
    submissions,
    xpEventsTable,
    xpRules,
    enrollments,
    weeks,
    weeklySummary,
  ]);
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
