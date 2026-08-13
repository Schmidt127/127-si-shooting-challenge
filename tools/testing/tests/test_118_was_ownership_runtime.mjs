import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MockBase, MockOutput, MockRecord, MockTable, makeConsole, makeInput } from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const IDS = { week: "recWeek11800001", pi: "recPi1180000001", eligible: "recEligible11801", inactive: "recInactive11801", excluded: "recExcluded11801", was: "recWas118000001" };

function priorSaturdayKeyDenver(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
  date.setUTCDate(date.getUTCDate() - (dow === 6 ? 7 : dow + 1));
  return date.toISOString().slice(0, 10);
}

function buildBase() {
  const enrollments = new MockTable("Enrollments", [
    { name: "Active?", type: "checkbox" }, { name: "Enrollment Key", type: "formula", isComputed: true },
    { name: "Parent Email - Cleaned", type: "email" }, { name: "Athlete Email - Cleaned", type: "email" },
    { name: "Program Instance", type: "multipleRecordLinks" },
  ], [
    new MockRecord(IDS.eligible, { "Active?": true, "Enrollment Key": "E-118", "Parent Email - Cleaned": "parent@example.test", "Program Instance": [{ id: IDS.pi }] }),
    new MockRecord(IDS.inactive, { "Active?": false, "Enrollment Key": "I-118", "Parent Email - Cleaned": "inactive@example.test", "Program Instance": [{ id: IDS.pi }] }),
    new MockRecord(IDS.excluded, { "Active?": true, "Enrollment Key": "X-118", "Parent Email - Cleaned": "excluded@example.test", "Program Instance": [{ id: IDS.pi }] }),
  ]);
  const weeks = new MockTable("Weeks", [
    { name: "End Date", type: "dateTime" }, { name: "Week End Key", type: "formula", isComputed: true },
    { name: "Week Key", type: "formula", isComputed: true }, { name: "Week Code", type: "singleLineText" },
    { name: "Active?", type: "checkbox" }, { name: "Active Week?", type: "checkbox" }, { name: "Program Instance", type: "multipleRecordLinks" },
  ], [new MockRecord(IDS.week, { "Week End Key": priorSaturdayKeyDenver(), "Week Key": "W-118", "Active?": true, "Program Instance": [{ id: IDS.pi }] })]);
  const was = new MockTable("Weekly Athlete Summary", [
    { name: "Enrollment", type: "multipleRecordLinks" }, { name: "Week", type: "multipleRecordLinks" },
    { name: "Summary Key", type: "formula", isComputed: true }, { name: "Build Weekly Email Now?", type: "checkbox" },
    { name: "Weekly Email Sent?", type: "checkbox" }, { name: "sendMode", type: "singleSelect", options: { choices: [{ id: "selTest", name: "Test" }, { id: "selLive", name: "Live" }] } },
  ], [new MockRecord(IDS.was, { Enrollment: [{ id: IDS.eligible }], Week: [{ id: IDS.week }], "Summary Key": "E-118|W-118", "Build Weekly Email Now?": false, "Weekly Email Sent?": false })]);
  return new MockBase([enrollments, weeks, was]);
}

async function run(base, config = {}) {
  const fn = new AsyncFunction("base", "input", "output", "console", readFileSync(SCRIPT, "utf8"));
  const output = new MockOutput();
  let error = null;
  try { await fn(base, makeInput({ dryRun: "false", excludedEnrollmentIds: IDS.excluded, ...config }), output, makeConsole()); } catch (caught) { error = caught; }
  return { output, error };
}

test("118 arms one eligible existing WAS but never creates a missing WAS", async () => {
  const base = buildBase();
  const { output, error } = await run(base);
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  const was = base.getTable("Weekly Athlete Summary");
  assert.equal(was.createdPayloads.length, 0);
  assert.equal(was.records.get(IDS.was).getCellValue("Build Weekly Email Now?"), true);
  assert.equal(output.values.createdWasCountOut, "0");
});

test("118 filters inactive and excluded rows before malformed WAS identity can block eligible work", async () => {
  const base = buildBase();
  const was = base.getTable("Weekly Athlete Summary");
  was.records.set("recMalformed11801", new MockRecord("recMalformed11801", {
    Enrollment: [{ id: IDS.inactive }, { id: IDS.excluded }], Week: [{ id: IDS.week }],
  }));
  const { output, error } = await run(base);
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(was.createdPayloads.length, 0);
  assert.equal(was.records.get(IDS.was).getCellValue("Build Weekly Email Now?"), true);
});
