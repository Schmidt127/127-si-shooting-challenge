/**
 * Loads and executes the REAL Automation 065 script inside the mock environment.
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
  "../../../airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const REFERENCE_HC = "recpuUEXGlVve9tRN";
export const DISPOSABLE_HC = "recHCDisposable01";

const SHARED = {
  ENR: "recENR0650000001",
  WEEK: "recWEEK065000001",
  SUB: "recSUB0650000001",
  WAS: "recWAS0650000001",
  PHA: "recPHA0650000001",
  HW: "recHW06500000001",
  PI: "recPI06500000001",
  GRADE: "recGRADE06500001",
};

function selectChoices(...names) {
  return { choices: names.map((name) => ({ id: `sel${name}`, name })) };
}

function homeworkFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Homework", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary Link", type: "multipleRecordLinks" },
    { name: "Submissions - Linked", type: "multipleRecordLinks" },
    { name: "Program Homework Assignment", type: "multipleRecordLinks" },
    { name: "Item Slot", type: "singleLineText" },
    { name: "Satisfactory?", type: "checkbox" },
    { name: "Review Complete", type: "checkbox" },
    { name: "Coach Feedback", type: "multilineText" },
    { name: "Total Homework XP Awarded", type: "number" },
    {
      name: "Award Status",
      type: "singleSelect",
      options: selectChoices("Pending", "Awarded"),
    },
    { name: "XP Events", type: "multipleRecordLinks" },
    { name: "Homework Completion Key", type: "singleLineText" },
    { name: "Automation Error", type: "singleLineText" },
    { name: "Homework XP Current Signature", type: "singleLineText" },
    { name: "Last Homework XP Reconciled Signature", type: "singleLineText" },
    { name: "Homework XP Reconciliation Needed?", type: "checkbox" },
  ];
}

function xpFields() {
  return [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Weekly Athlete Summary", type: "multipleRecordLinks" },
    { name: "Submission", type: "multipleRecordLinks" },
    { name: "Homework Completion", type: "multipleRecordLinks" },
    {
      name: "XP Bucket",
      type: "singleSelect",
      options: selectChoices("Homework Completion"),
    },
    {
      name: "XP Source",
      type: "singleSelect",
      options: selectChoices("Homework Completion"),
    },
    { name: "XP Points", type: "number" },
    { name: "Source Key", type: "singleLineText" },
    { name: "Active?", type: "checkbox" },
    { name: "Processed", type: "checkbox" },
    { name: "XP Reason Public", type: "singleLineText" },
    { name: "XP Reason Debug", type: "multilineText" },
  ];
}

function syncHomeworkFormulaState(hcId, hcTable, xpTable) {
  const hc = hcTable.records.get(hcId);
  if (!hc) return;
  const key = `HOMEWORK_XP|${hcId}`;
  const linked = hc.getCellValue("XP Events") || [];
  const xpId = linked[0]?.id;
  let current = `HC|KEY=${key}`;
  if (xpId) {
    const xp = xpTable.records.get(xpId);
    const active = xp?.getCellValue("Active?");
    current = `HC|EVENT=${xpId}|${active ? "ACTIVE" : "INACTIVE"}|KEY=${key}`;
  }
  hc.cells["Homework XP Current Signature"] = current;
  const last = String(hc.getCellValue("Last Homework XP Reconciled Signature") || "");
  hc.cells["Homework XP Reconciliation Needed?"] = current !== last ? 1 : 0;
}

function defaultHomeworkCells(hcId) {
  return {
    Enrollment: [{ id: SHARED.ENR }],
    Homework: [{ id: SHARED.HW }],
    Week: [{ id: SHARED.WEEK }],
    "Submissions - Linked": [{ id: SHARED.SUB }],
    "Program Homework Assignment": [{ id: SHARED.PHA }],
    "Item Slot": "HW1",
    "Satisfactory?": true,
    "Review Complete": true,
    "Coach Feedback": "Good work",
    "Total Homework XP Awarded": 35,
    "Award Status": "Pending",
    "XP Events": [],
    "Homework Completion Key": `HC-${hcId}`,
    "Automation Error": "",
    "Homework XP Current Signature": "",
    "Last Homework XP Reconciled Signature": "",
    "Homework XP Reconciliation Needed?": 1,
  };
}

export function build065Base({ homeworkIds = [REFERENCE_HC, DISPOSABLE_HC], xpEvents = [] } = {}) {
  const homeworkRecords = homeworkIds.map(
    (id) => new MockRecord(id, defaultHomeworkCells(id))
  );
  const homeworkTable = new MockTable("Homework Completions", homeworkFields(), homeworkRecords);
  const xpTable = new MockTable("XP Events", xpFields(), xpEvents);

  const originalXpCreate = xpTable.createRecordAsync.bind(xpTable);
  const originalXpUpdate = xpTable.updateRecordAsync.bind(xpTable);
  const originalHcUpdate = homeworkTable.updateRecordAsync.bind(homeworkTable);

  xpTable.createRecordAsync = async (payload) => {
    const id = await originalXpCreate(payload);
    for (const link of payload["Homework Completion"] || []) {
      syncHomeworkFormulaState(link.id, homeworkTable, xpTable);
    }
    return id;
  };
  xpTable.updateRecordAsync = async (recordId, fields) => {
    await originalXpUpdate(recordId, fields);
    const xp = xpTable.records.get(recordId);
    for (const link of xp?.getCellValue("Homework Completion") || []) {
      syncHomeworkFormulaState(link.id, homeworkTable, xpTable);
    }
  };
  homeworkTable.updateRecordAsync = async (recordId, fields) => {
    await originalHcUpdate(recordId, fields);
    syncHomeworkFormulaState(recordId, homeworkTable, xpTable);
  };

  for (const record of homeworkRecords) {
    syncHomeworkFormulaState(record.id, homeworkTable, xpTable);
  }

  const phaTable = new MockTable("Program Homework Assignments", [
    { name: "Active?", type: "checkbox" },
    { name: "Homework Assignment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Homework Slot", type: "singleLineText" },
  ], [
    new MockRecord(SHARED.PHA, {
      "Active?": true,
      "Homework Assignment": [{ id: SHARED.HW }],
      Week: [{ id: SHARED.WEEK }],
      "Program Instance": [{ id: SHARED.PI }],
      "Homework Slot": "HW1",
    }),
  ]);

  const enrollmentsTable = new MockTable("Enrollments", [
    { name: "Program Instance", type: "multipleRecordLinks" },
    { name: "Active?", type: "checkbox" },
  ], [
    new MockRecord(SHARED.ENR, {
      "Program Instance": [{ id: SHARED.PI }],
      "Active?": true,
    }),
  ]);

  const weeklySummaryTable = new MockTable("Weekly Athlete Summary", [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Week", type: "multipleRecordLinks" },
  ], [
    new MockRecord(SHARED.WAS, {
      Enrollment: [{ id: SHARED.ENR }],
      Week: [{ id: SHARED.WEEK }],
    }),
  ]);

  return new MockBase([homeworkTable, xpTable, weeklySummaryTable, phaTable, enrollmentsTable]);
}

export async function run065({ base, recordId = REFERENCE_HC, inputConfig = null }) {
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
