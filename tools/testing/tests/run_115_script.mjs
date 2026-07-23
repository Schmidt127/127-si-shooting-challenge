/**
 * Loads and executes the REAL Automation 115 script inside the mock
 * environment. No alternative implementation — the production .js file is
 * evaluated as-is (its top-level `await main()` is legal inside an
 * AsyncFunction body).
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
  "../../../airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm";
const SCHMIDT_ATHLETE = "recgqVstObQRzgXJF";

export const IDS = { SCHMIDT_ENROLLMENT, SCHMIDT_ATHLETE };

/** Build the standard PROD-shaped mock tables (field names from the
 *  2026-07-23 post-TS PROD schema snapshot). */
export function buildStandardBase({ scenarioCells = {}, scenarioId = "recSCENARIO000001" } = {}) {
  const lastRunChoices = ["Not Run", "Pass", "Fail", "Blocked", "Error"].map((name) => ({ name }));
  const scenarioTypeChoices = [
    "Daily Submission",
    "Homework",
    "Homework + Video",
    "Three Video Upload",
    "Milestone Crossing",
    "Perfect Week",
    "Backdated Submission",
    "Parent Feedback",
    "Weekly Summary",
    "Award Generation",
    "Other",
    "Video",
  ].map((name) => ({ name }));

  const testingScenarios = new MockTable(
    "Testing Scenarios",
    [
      { name: "Test Intake Name", type: "singleLineText" },
      { name: "Run Test?", type: "checkbox" },
      { name: "Dry Run?", type: "checkbox" },
      { name: "Scenario Type", type: "singleSelect", options: { choices: scenarioTypeChoices } },
      { name: "Last Run Status", type: "singleSelect", options: { choices: lastRunChoices } },
      { name: "Expected Result", type: "multilineText" },
      { name: "Actual Result", type: "multilineText" },
      { name: "Pass/Fail Notes", type: "multilineText" },
      { name: "Scenario Requirements", type: "multilineText" },
      { name: "Submission Date", type: "date" },
      { name: "Shot Total", type: "number" },
      { name: "Last Run At", type: "dateTime" },
      { name: "Video Feedback Focus", type: "singleSelect", options: { choices: [{ name: "Form" }] } },
      { name: "Video Feedback Question", type: "multilineText" },
      { name: "Intake Attachments", type: "multipleAttachments" },
      { name: "Related Enrollment", type: "multipleRecordLinks" },
      { name: "Linked Submission", type: "multipleRecordLinks" },
      { name: "Homework Assignment", type: "multipleRecordLinks" },
    ],
    [
      new MockRecord(scenarioId, {
        "Test Intake Name": "OFFLINE-TEST",
        "Scenario Type": "Daily Submission",
        "Related Enrollment": [{ id: SCHMIDT_ENROLLMENT, name: "Schmidt, Testing" }],
        "Submission Date": "2026-07-23",
        "Shot Total": 25,
        "Run Test?": true,
        "Dry Run?": false,
        ...scenarioCells,
      }),
    ]
  );

  const enrollments = new MockTable(
    "Enrollments",
    [
      { name: "Athlete", type: "multipleRecordLinks" },
      { name: "Level Recalc Needed?", type: "checkbox" },
      { name: "Current Level", type: "multipleRecordLinks" },
      { name: "Next Level", type: "multipleRecordLinks" },
      { name: "Level Status", type: "singleLineText" },
      { name: "Level Gate Rule", type: "multipleRecordLinks" },
      { name: "Total Zoom Attendances", type: "rollup", isComputed: true },
    ],
    [
      new MockRecord(SCHMIDT_ENROLLMENT, {
        Athlete: [{ id: SCHMIDT_ATHLETE, name: "Testing Schmidt" }],
      }),
    ]
  );

  const submissions = new MockTable("Submissions", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Athlete", type: "multipleRecordLinks" },
    { name: "Activity Date", type: "date" },
    { name: "Shot Total", type: "number" },
    { name: "Homework Name 1", type: "multipleRecordLinks" },
    { name: "HW Sub 1", type: "multipleAttachments" },
    { name: "Video Feedback Focus", type: "singleSelect", options: { choices: [{ name: "Form" }] } },
    { name: "Video Feedback Note", type: "multilineText" },
    { name: "Video Upload", type: "multipleAttachments" },
    {
      name: "Duplicate Review Status",
      type: "singleSelect",
      options: { choices: [{ name: "Count It" }, { name: "Needs Review" }, { name: "Do Not Count" }] },
    },
  ]);

  return new MockBase([testingScenarios, enrollments, submissions]);
}

/** Execute the real 115 script. Returns { output, console, error, base }. */
export async function run115({ base, recordId }) {
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
