/**
 * Offline harness for Automation 067 PHA-first HW17 path (v3.4+).
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
import { PHA_IDS } from "./run_005_pha_script.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const QUIZ_ID = "recQuizHw1700001";
export const ENROLLMENT_ID = "recCyFEPeATOVNlr9";
export const HW17_LIBRARY = "rechVLOeyEVIqmy2v";
export const HW17_PHA = "recgj8dPk4ouTwCOj";
export const HW17_WEEK = PHA_IDS.WEEK;
export const PI = PHA_IDS.PI;
export const HC_GOOD = "recHcGood067001";
export const ENROLLMENT_OTHER = "recEnrollOther06701";
export const WEEK_OTHER = PHA_IDS.WRONG_WEEK;
export const PHA_OTHER = "recWrongPha0670001";

function phaFields() {
  return [
    { name: "Homework Assignment", type: "multipleRecordLinks" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Homework Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }, { name: "HW2" }] } },
    { name: "Active?", type: "checkbox" },
  ];
}

export function goodHw17Pha(id, overrides = {}) {
  return new MockRecord(id, {
    "Homework Assignment": [{ id: HW17_LIBRARY }],
    "Program Instance": [{ id: PI }],
    Week: [{ id: HW17_WEEK }],
    "Homework Slot": { name: "HW1" },
    "Active?": true,
    ...overrides,
  });
}

export function goodHc(id, overrides = {}) {
  return new MockRecord(id, {
    Enrollment: [{ id: ENROLLMENT_ID }],
    Homework: [{ id: HW17_LIBRARY }],
    "Program Homework Assignment": [{ id: HW17_PHA }],
    Week: [{ id: HW17_WEEK }],
    "Final Reflection Quiz Submissions": [],
    ...overrides,
  });
}

export function build067PhaBase({ phaRecords = [], quizCells = {}, homeworkCompletions = [] } = {}) {
  const quiz = new MockTable(
    "Final Reflection Quiz Submissions",
    [
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Homework Completion", type: "multipleRecordLinks" },
      { name: "Submitted At", type: "dateTime" },
      { name: "Processing Status", type: "singleSelect", options: { choices: [{ name: "Processed" }, { name: "Error" }] } },
      { name: "Processing Error", type: "singleLineText" },
      { name: "Quiz Result PDF", type: "multipleAttachments" },
    ],
    [
      new MockRecord(QUIZ_ID, {
        Enrollment: [{ id: ENROLLMENT_ID }],
        "Homework Completion": [],
        "Submitted At": "2026-08-07",
        "Processing Status": { name: "Pending" },
        ...quizCells,
      }),
    ]
  );

  const homework = new MockTable(
    "Homework Completions",
    [
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Homework", type: "multipleRecordLinks" },
      { name: "Program Homework Assignment", type: "multipleRecordLinks" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Final Reflection Quiz Submissions", type: "multipleRecordLinks" },
      { name: "Source System", type: "singleSelect", options: { choices: [{ name: "Fillout" }] } },
      { name: "Item Type", type: "singleSelect", options: { choices: [{ name: "Homework" }] } },
      { name: "Completion Status", type: "singleSelect", options: { choices: [{ name: "Submitted" }] } },
      { name: "Review Status", type: "singleSelect", options: { choices: [{ name: "Ready for Review" }] } },
      { name: "Item Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }] } },
      { name: "Asset Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }] } },
      { name: "Submission Date", type: "date" },
      { name: "Submission Assets", type: "multipleRecordLinks" },
      { name: "Submissions - Linked", type: "multipleRecordLinks" },
      { name: "Weekly Athlete Summary Link", type: "multipleRecordLinks" },
    ],
    homeworkCompletions
  );

  const library = new MockTable(
    "Homework Library",
    [
      { name: "Homework Number", type: "singleSelect", options: { choices: [{ name: "HW 17" }, { name: "HW 1" }] } },
      { name: "Active?", type: "checkbox" },
    ],
    [
      new MockRecord(HW17_LIBRARY, { "Homework Number": { name: "HW 17" }, "Active?": true }),
      new MockRecord("recOtherLibrary001", { "Homework Number": { name: "HW 1" }, "Active?": true }),
    ]
  );

  const pha = new MockTable("Program Homework Assignments", phaFields(), [
    goodHw17Pha(HW17_PHA),
    ...phaRecords,
  ]);

  const enrollments = new MockTable("Enrollments", [
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
  ], [
    new MockRecord(ENROLLMENT_ID, {
      "Program Instance": [{ id: PI }],
      "Grade Band": [{ id: PHA_IDS.GB }],
    }),
  ]);

  const submissions = new MockTable("Submissions", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Homework Name 1", type: "multipleRecordLinks" },
    { name: "HW Sub 1", type: "multipleAttachments" },
    { name: "Submission Assets", type: "multipleRecordLinks" },
  ]);

  const assets = new MockTable("Submission Assets", [
    { name: "Enrollment - Linked", type: "multipleRecordLinks" },
    { name: "Submission - Linked", type: "multipleRecordLinks" },
    { name: "Airtable Attachment", type: "multipleAttachments" },
    { name: "Source Attachment ID", type: "singleLineText" },
    { name: "Original File Name", type: "singleLineText" },
    { name: "Asset Label", type: "singleLineText" },
    { name: "Asset Purpose", type: "singleSelect", options: { choices: [{ name: "Homework 1" }] } },
    { name: "Asset Type", type: "singleSelect", options: { choices: [{ name: "Homework PDF" }] } },
    { name: "Asset Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }] } },
    { name: "Upload Status", type: "singleSelect", options: { choices: [{ name: "Pending Link" }] } },
    { name: "Send to Make Trigger", type: "checkbox" },
    { name: "Homework Completions", type: "multipleRecordLinks" },
  ]);

  const weekly = new MockTable("Weekly Athlete Summary", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
  ]);

  return new MockBase([quiz, homework, library, pha, enrollments, submissions, assets, weekly]);
}

export async function run067({ base, recordId = QUIZ_ID }) {
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
