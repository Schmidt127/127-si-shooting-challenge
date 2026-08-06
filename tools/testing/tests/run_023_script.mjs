/**
 * Loads and executes the REAL Automation 023 script inside the mock environment.
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
  "../../../airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const IDS = {
  SUBMISSION: "recElDBcFvuE6jWwc",
  ATHLETE: "recgqVstObQRzgXJF",
  WEEK_EARLY_BIRD: "recWeVrSabnsYaHc2",
  WEEK_OTHER_PI: "recWeekOtherPI0001",
  PI_CURRENT: "rec5mEM0YPqPqq0hZ",
  PI_OTHER: "recOtherProgramInst1",
  ENROLLMENT_CURRENT: "recCyFEPeATOVNlr9",
  ENROLLMENT_HISTORICAL: "recgP9qZYjAhE7NXm",
  ENROLLMENT_DUP_SAME_PI: "recDupSamePIEnroll1",
  ENROLLMENT_OTHER_PI: "recEnrollOtherPI001",
};

function submissionFields({ includeProgramInstance = false, includeSchoolYear = false } = {}) {
  const fields = [
    { name: "Athlete", type: "multipleRecordLinks" },
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Fillout Enrollment Id", type: "singleLineText" },
    { name: "Enrollment Record ID", type: "singleLineText" },
  ];
  if (includeProgramInstance) {
    fields.push({ name: "Program Instance", type: "multipleRecordLinks" });
  }
  if (includeSchoolYear) {
    fields.push({ name: "School Year", type: "singleLineText" });
  }
  return fields;
}

function enrollmentFields() {
  return [
    { name: "Athlete", type: "multipleRecordLinks" },
    { name: "Active?", type: "checkbox" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Enrollment Key", type: "formula", isComputed: true },
    { name: "School Year", type: "singleLineText" },
  ];
}

function weekFields() {
  return [
    { name: "Week Name", type: "singleLineText" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ];
}

/**
 * @param {object} opts
 * @param {object} [opts.submissionCells]
 * @param {Array<MockRecord>} [opts.extraEnrollments]
 * @param {Array<MockRecord>} [opts.extraWeeks]
 * @param {boolean} [opts.includeProgramInstance]
 * @param {boolean} [opts.includeSchoolYear]
 * @param {boolean} [opts.includeHistoricalActive]
 */
export function build023Base(opts = {}) {
  const {
    submissionCells = {},
    extraEnrollments = [],
    extraWeeks = [],
    includeProgramInstance = false,
    includeSchoolYear = false,
    includeHistoricalActive = true,
  } = opts;

  const enrollments = [
    new MockRecord(IDS.ENROLLMENT_CURRENT, {
      Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
      "Active?": true,
      "Program Instance": [{ id: IDS.PI_CURRENT, name: "Current PI" }],
      "Enrollment Key": "CURRENT|KEY",
      "School Year": "2026-2027",
    }),
  ];

  if (includeHistoricalActive) {
    enrollments.push(
      new MockRecord(IDS.ENROLLMENT_HISTORICAL, {
        Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
        "Active?": true,
        "Program Instance": [{ id: IDS.PI_OTHER, name: "Prior PI" }],
        "Enrollment Key": "HISTORICAL|KEY",
        "School Year": "2025-2026",
      })
    );
  } else {
    enrollments.push(
      new MockRecord(IDS.ENROLLMENT_HISTORICAL, {
        Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
        "Active?": false,
        "Program Instance": [{ id: IDS.PI_OTHER, name: "Prior PI" }],
        "Enrollment Key": "HISTORICAL|KEY",
        "School Year": "2025-2026",
      })
    );
  }

  enrollments.push(...extraEnrollments);

  const weeks = [
    new MockRecord(IDS.WEEK_EARLY_BIRD, {
      "Week Name": "Early Bird",
      "Program Instance": [{ id: IDS.PI_CURRENT, name: "Current PI" }],
    }),
    new MockRecord(IDS.WEEK_OTHER_PI, {
      "Week Name": "Other PI Week",
      "Program Instance": [{ id: IDS.PI_OTHER, name: "Prior PI" }],
    }),
    ...extraWeeks,
  ];

  const submissions = new MockTable(
    "Submissions",
    submissionFields({ includeProgramInstance, includeSchoolYear }),
    [
      new MockRecord(IDS.SUBMISSION, {
        Athlete: [{ id: IDS.ATHLETE, name: "Testing Schmidt" }],
        Enrollment: null,
        Week: [{ id: IDS.WEEK_EARLY_BIRD, name: "Early Bird" }],
        ...submissionCells,
      }),
    ]
  );

  return new MockBase([
    submissions,
    new MockTable("Enrollments", enrollmentFields(), enrollments),
    new MockTable("Weeks", weekFields(), weeks),
  ]);
}

/** Execute the real 023 script. Returns { output, console, error, base }. */
export async function run023({ base, recordId = IDS.SUBMISSION }) {
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
