import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockTable,
  MockOutput,
  makeInput,
  makeConsole,
} from "./airtable_mock.mjs";
import { build023Base, run023, IDS } from "./run_023_script.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export async function buildAndRun005After023() {
  const base = build023Base({
    includeHistoricalActive: false,
    submissionCells: {
      Week: null,
      "Activity Date": "2026-08-07",
      "Homework Name 1": null,
      "Homework Name 2": null,
      "Week Assignment Status": "Needs Assignment",
    },
  });

  const submissions = base.tables.get("Submissions");
  submissions.fields.push(
    { name: "Activity Date", type: "date" },
    { name: "Homework Name 1", type: "multipleRecordLinks" },
    { name: "Homework Name 2", type: "multipleRecordLinks" },
    { name: "Week Assignment Status", type: "formula", isComputed: true }
  );

  const weeks = base.tables.get("Weeks");
  weeks.fields.push(
    { name: "Start Date", type: "dateTime" },
    { name: "End Date", type: "dateTime" },
    { name: "Active Week?", type: "checkbox" }
  );
  const earlyBird = weeks.records.get(IDS.WEEK_EARLY_BIRD);
  Object.assign(earlyBird.cells, {
    "Start Date": "2026-08-01",
    "End Date": "2026-08-31",
    "Active Week?": true,
  });

  base.tables.set(
    "FBC Curriculum - SYNC",
    new MockTable("FBC Curriculum - SYNC", [
      { name: "Week", type: "multipleRecordLinks" },
    ])
  );

  const enrollmentRun = await run023({ base });
  if (enrollmentRun.error) throw enrollmentRun.error;

  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const input = makeInput({ recordId: IDS.SUBMISSION });
  const code = readFileSync(SCRIPT_PATH, "utf8");
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, input, output, capturedConsole);
  } catch (caught) {
    error = caught;
  }

  return { base, enrollmentRun, weekRun: { output, console: capturedConsole, error } };
}
