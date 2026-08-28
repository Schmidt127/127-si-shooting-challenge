/**
 * Offline harness for Automation 020 PHA-direct intake (v3.5+).
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
import { PHA_IDS, build005PhaBase } from "./run_005_pha_script.mjs";
import { IDS as CHAIN_IDS } from "./run_023_script.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const ASSET_ID = "recAssetHw100001";
export const EXISTING_HC_ID = "recExistingHc0001";

const uploadStatusChoices = [
  { name: "Pending Link" },
  { name: "Processing" },
  { name: "Uploaded" },
  { name: "Error" },
];

function assetFields() {
  return [
    { name: "Submission - Linked", type: "multipleRecordLinks" },
    { name: "Enrollment - Linked", type: "multipleRecordLinks" },
    { name: "Asset Label", type: "singleLineText" },
    { name: "Upload Destination", type: "singleLineText" },
    { name: "Asset Purpose", type: "singleSelect", options: { choices: [{ name: "Homework 1" }, { name: "Homework 2" }] } },
    { name: "Airtable Attachment", type: "multipleAttachments" },
    { name: "Homework Completions", type: "multipleRecordLinks" },
    { name: "Original File Name", type: "singleLineText" },
    { name: "Asset Type", type: "singleSelect", options: { choices: [{ name: "Image" }] } },
    { name: "Upload Status", type: "singleSelect", options: { choices: uploadStatusChoices } },
    { name: "Upload Error", type: "singleLineText" },
    { name: "Uploaded At", type: "dateTime" },
    { name: "Asset Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }, { name: "HW2" }] } },
    { name: "Google Drive File URL", type: "url" },
    { name: "Google Drive File ID", type: "singleLineText" },
    { name: "Google Drive Folder ID", type: "singleLineText" },
    { name: "Google Drive Folder URL", type: "url" },
    { name: "Send to Make Trigger", type: "checkbox" },
  ];
}

function homeworkCompletionFields() {
  return [
    { name: "Homework", type: "multipleRecordLinks" },
    { name: "Program Homework Assignment", type: "multipleRecordLinks" },
    { name: "Submissions - Linked", type: "multipleRecordLinks" },
    { name: "Upload Status", type: "singleSelect", options: { choices: uploadStatusChoices } },
    { name: "Submission Assets", type: "multipleRecordLinks" },
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Grade Band", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary Link", type: "multipleRecordLinks" },
    { name: "Submission Date", type: "date" },
    { name: "Completion Status", type: "singleSelect", options: { choices: [{ name: "Submitted" }] } },
    { name: "Asset Label", type: "singleLineText" },
    { name: "Original File Name", type: "singleLineText" },
    { name: "Asset Type", type: "singleSelect", options: { choices: [{ name: "Image" }] } },
    { name: "Asset Purpose", type: "singleSelect", options: { choices: [{ name: "Homework Turn-In" }] } },
    { name: "Source System", type: "singleSelect", options: { choices: [{ name: "Fillout" }] } },
    { name: "Google Drive File ID", type: "singleLineText" },
    { name: "Google Drive File URL", type: "url" },
    { name: "Google Drive Folder ID", type: "singleLineText" },
    { name: "Google Drive Folder URL", type: "url" },
    { name: "Upload Error", type: "singleLineText" },
    { name: "Uploaded At", type: "dateTime" },
    { name: "Asset Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }, { name: "HW2" }] } },
    { name: "Item Type", type: "singleSelect", options: { choices: [{ name: "Homework" }] } },
    { name: "Item Slot", type: "singleSelect", options: { choices: [{ name: "HW1" }, { name: "HW2" }] } },
    { name: "Review Status", type: "singleSelect", options: { choices: [{ name: "Ready for Review" }] } },
    { name: "Writeback Complete?", type: "checkbox" },
    { name: "Satisfactory?", type: "checkbox" },
    { name: "Notes", type: "multilineText" },
    { name: "Submission Date", type: "date" },
  ];
}

export function build020PhaBase({
  submissionCells = {},
  existingHomeworkCompletions = [],
  assetCells = {},
  phaRecords = [],
} = {}) {
  const base = build005PhaBase({
    submissionCells: {
      Week: [{ id: PHA_IDS.WEEK }],
      Enrollment: [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }],
      "Homework Name 1": [{ id: PHA_IDS.PHA_HW1 }],
      "Activity Date": "2026-08-07",
      ...submissionCells,
    },
    phaRecords,
  });

  const submissions = base.tables.get("Submissions");
  submissions.records.get(CHAIN_IDS.SUBMISSION).cells.Week = [{ id: PHA_IDS.WEEK }];
  submissions.records.get(CHAIN_IDS.SUBMISSION).cells.Enrollment = [
    { id: CHAIN_IDS.ENROLLMENT_CURRENT },
  ];

  const assets = new MockTable("Submission Assets", assetFields(), [
    new MockRecord(ASSET_ID, {
      "Submission - Linked": [{ id: CHAIN_IDS.SUBMISSION }],
      "Enrollment - Linked": [{ id: CHAIN_IDS.ENROLLMENT_CURRENT }],
      "Asset Label": "HW1 Test",
      "Upload Destination": "Homework Completions",
      "Asset Purpose": { name: "Homework 1" },
      "Airtable Attachment": [{ url: "https://example.com/hw1.png" }],
      "Homework Completions": [],
      "Original File Name": "hw1.png",
      "Asset Type": { name: "Image" },
      "Upload Status": { name: "Pending Link" },
      "Asset Slot": { name: "HW1" },
      "Send to Make Trigger": false,
      ...assetCells,
    }),
  ]);

  const homework = new MockTable("Homework Completions", homeworkCompletionFields(), [
    ...existingHomeworkCompletions,
  ]);

  base.tables.set("Submission Assets", assets);
  base.tables.set("Homework Completions", homework);
  return base;
}

export async function run020({ base, recordId = ASSET_ID }) {
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
