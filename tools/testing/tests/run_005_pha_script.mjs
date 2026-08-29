/**
 * Offline harness for Automation 005 PHA-direct validation (v5.5+).
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
import { build023Base, IDS as CHAIN_IDS } from "./run_023_script.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const PHA_IDS = {
  PI: "rec5mEM0YPqPqq0hZ",
  WEEK: "recWeVrSabnsYaHc2",
  WEEK_PROD_FAIL: "recBrZ1sV8byWEHZU",
  GB: "reclWDQZzKbVBtdhG",
  PHA_HW1: "recgj8dPk4ouTwCOj",
  PHA_HW2: "recPhaOfficialHw2001",
  PHA_HW1_DUP: "recPhaHw1Duplicate01",
  LIBRARY_HW1: "rechVLOeyEVIqmy2v",
  LIBRARY_HW2: "rec6WmXjpLtIWDERo",
  PHA_INACTIVE: "recPhaInactive0001",
  PHA_WRONG_PI: "recPhaWrongPi00001",
  PHA_WRONG_WEEK: "recPhaWrongWeek001",
  PHA_OFFICIAL_HW2: "recPhaWrongSlot001", // official HW2 (legacy id kept for harness stability)
  PHA_BLANK_SLOT: "recPhaBlankSlot0001",
  PHA_INVALID_SLOT: "recPhaInvalidSlot01",
  PHA_ZERO_LIB: "recPhaZeroLib00001",
  PHA_MULTI_LIB: "recPhaMultiLib0001",
  WRONG_PI: "recWrongProgramPi01",
  WRONG_WEEK: "recWrongWeek000001",
};

function phaFields() {
  return [
    { name: "Homework Assignment", type: "multipleRecordLinks" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Homework Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }, { name: "HW2" }] } },
    { name: "Active?", type: "checkbox" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Due Date", type: "date" },
  ];
}

function goodPhaCells(overrides = {}) {
  return {
    "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }],
    "Program Instance": [{ id: PHA_IDS.PI }],
    Week: [{ id: PHA_IDS.WEEK }],
    "Homework Slot": { name: "HW1" },
    "Active?": true,
    "Grade Band": [{ id: PHA_IDS.GB }],
    ...overrides,
  };
}

export function build005PhaBase({
  submissionCells = {},
  phaRecords = [],
  weekCells = {},
} = {}) {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Week: null,
      "Activity Date": "2026-08-07",
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Homework Name 2": null,
      "Week Assignment Status": "Needs Assignment",
      ...submissionCells,
    },
  });

  const submissions = base.tables.get("Submissions");
  submissions.fields.push(
    { name: "Activity Date", type: "date" },
    { name: "Homework Name 1", type: "multipleRecordLinks" },
    { name: "Homework Name 2", type: "multipleRecordLinks" },
    { name: "Week Assignment Status", type: "formula", isComputed: true }
  );
  const submission = submissions.records.get(CHAIN_IDS.SUBMISSION);
  submission.cells.Enrollment = [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }];

  const weeks = base.tables.get("Weeks");
  weeks.fields.push(
    { name: "Start Date", type: "dateTime" },
    { name: "End Date", type: "dateTime" },
    { name: "Active Week?", type: "checkbox" }
  );
  const earlyBird = weeks.records.get(CHAIN_IDS.WEEK_EARLY_BIRD);
  Object.assign(earlyBird.cells, {
    "Start Date": "2026-08-01",
    "End Date": "2026-08-31",
    "Active Week?": true,
    "Program Instance": [{ id: PHA_IDS.PI, name: "Current PI" }],
    ...weekCells,
  });

  const enrollments = base.tables.get("Enrollments");
  enrollments.fields.push({ name: "Grade Band", type: "multipleRecordLinks" });
  const enrollment = enrollments.records.get(CHAIN_IDS.ENROLLMENT_CURRENT);
  enrollment.cells["Program Instance"] = [{ id: PHA_IDS.PI, name: "Current PI" }];
  enrollment.cells["Grade Band"] = [{ id: PHA_IDS.GB }];

  const defaultPha = [
    new MockRecord(PHA_IDS.PHA_HW1, goodPhaCells()),
    new MockRecord(
      PHA_IDS.PHA_HW2,
      goodPhaCells({
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW2 }],
        "Homework Slot": { name: "HW2" },
      })
    ),
    new MockRecord(
      PHA_IDS.PHA_HW1_DUP,
      goodPhaCells({
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW2 }],
        "Homework Slot": { name: "HW1" },
      })
    ),
    new MockRecord(
      PHA_IDS.PHA_INACTIVE,
      goodPhaCells({ "Active?": false })
    ),
    new MockRecord(
      PHA_IDS.PHA_WRONG_PI,
      goodPhaCells({ "Program Instance": [{ id: PHA_IDS.WRONG_PI }] })
    ),
    new MockRecord(
      PHA_IDS.PHA_WRONG_WEEK,
      goodPhaCells({ Week: [{ id: PHA_IDS.WRONG_WEEK }] })
    ),
    new MockRecord(
      PHA_IDS.PHA_OFFICIAL_HW2,
      goodPhaCells({
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW2 }],
        "Homework Slot": { name: "HW2" },
      })
    ),
    new MockRecord(
      PHA_IDS.PHA_BLANK_SLOT,
      goodPhaCells({ "Homework Slot": null })
    ),
    new MockRecord(
      PHA_IDS.PHA_INVALID_SLOT,
      goodPhaCells({ "Homework Slot": { name: "HW3" } })
    ),
    new MockRecord(
      PHA_IDS.PHA_ZERO_LIB,
      goodPhaCells({ "Homework Assignment": [] })
    ),
    new MockRecord(
      PHA_IDS.PHA_MULTI_LIB,
      goodPhaCells({
        "Homework Assignment": [{ id: PHA_IDS.LIBRARY_HW1 }, { id: PHA_IDS.LIBRARY_HW2 }],
      })
    ),
  ];

  const phaTable = new MockTable("Program Homework Assignments", phaFields(), [
    ...defaultPha,
    ...phaRecords,
  ]);
  base.tables.set("Program Homework Assignments", phaTable);
  return base;
}

export async function run005({ base, recordId = CHAIN_IDS.SUBMISSION }) {
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const input = makeInput({ recordId });
  const code = readFileSync(SCRIPT_PATH, "utf8");
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, input, output, capturedConsole);
  } catch (caught) {
    error = caught;
  }
  return { output, console: capturedConsole, error, base };
}
