/**
 * Offline tests for Automation 115 (real production script, mocked base).
 * Run: node --test tools/testing/tests/
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildStandardBase, run115, IDS } from "./run_115_script.mjs";

const SCENARIO = "recSCENARIO000001";

function scenarioRecord(base) {
  return base.getTable("Testing Scenarios").records.get(SCENARIO);
}

test("dry run: no Submission created, scenario marked Pass, Run Test? cleared", async () => {
  const base = buildStandardBase({ scenarioCells: { "Dry Run?": true } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "dry_run");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
  const scen = scenarioRecord(base);
  assert.equal(scen.getCellValue("Run Test?"), false);
  assert.equal(scen.getCellValueAsString("Last Run Status"), "Pass");
  assert.match(scen.getCellValueAsString("Actual Result"), /dry_run/);
});

test("live create: one production-shaped Submission, linked back, Count It preset", async () => {
  const base = buildStandardBase();
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  const created = base.getTable("Submissions").createdPayloads;
  assert.equal(created.length, 1);
  const payload = created[0].payload;
  assert.deepEqual(payload["Enrollment"], [{ id: IDS.SCHMIDT_ENROLLMENT }]);
  assert.deepEqual(payload["Athlete"], [{ id: IDS.SCHMIDT_ATHLETE }]);
  assert.equal(payload["Shot Total"], 25);
  assert.deepEqual(payload["Duplicate Review Status"], { name: "Count It" });
  assert.ok(payload["Activity Date"] instanceof Date);
  const scen = scenarioRecord(base);
  assert.deepEqual(scen.getCellValue("Linked Submission"), [{ id: created[0].id }]);
  assert.equal(output.values.createdSubmissionIdOut, created[0].id);
});

test("live create never touches XP Events / WAS / Weeks tables (daily path)", async () => {
  const base = buildStandardBase();
  await run115({ base, recordId: SCENARIO });
  const touched = new Set(base.getTableCalls);
  assert.ok(!touched.has("XP Events"));
  assert.ok(!touched.has("Weekly Athlete Summary"));
  assert.ok(!touched.has("Weeks"));
});

test("rerun: second live run creates a second Submission and repoints Linked Submission", async () => {
  const base = buildStandardBase();
  const first = await run115({ base, recordId: SCENARIO });
  assert.equal(first.output.values.actionOut, "created");
  // Operator re-checks Run Test? and reruns the same scenario.
  scenarioRecord(base).cells["Run Test?"] = true;
  const second = await run115({ base, recordId: SCENARIO });
  assert.equal(second.output.values.actionOut, "created");
  const created = base.getTable("Submissions").createdPayloads;
  assert.equal(created.length, 2, "rerun is expected to create a new Submission (documented behavior)");
  const scen = scenarioRecord(base);
  assert.deepEqual(scen.getCellValue("Linked Submission"), [{ id: created[1].id }]);
});

test("invalid scenario type: skipped_wrong_scenario, no version-stale message", async () => {
  const base = buildStandardBase({ scenarioCells: { "Scenario Type": "Award Generation" } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_wrong_scenario");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
  assert.doesNotMatch(String(output.values.errorOut), /v1\.4/, "stale version string in skip message");
  const scen = scenarioRecord(base);
  assert.equal(scen.getCellValueAsString("Last Run Status"), "Blocked");
  assert.equal(scen.getCellValue("Run Test?"), false);
});

test("missing recordId input: hard error", async () => {
  const base = buildStandardBase();
  const { output, error } = await run115({ base, recordId: "" });
  assert.ok(error, "expected throw");
  assert.equal(output.values.statusOut, "error");
  assert.match(String(error.message), /recordId/);
});

test("malformed recordId input: hard error", async () => {
  const base = buildStandardBase();
  const { output, error } = await run115({ base, recordId: "tblNotARecord" });
  assert.ok(error);
  assert.equal(output.values.statusOut, "error");
});

test("missing Related Enrollment: skipped_missing_input, no Submission", async () => {
  const base = buildStandardBase({ scenarioCells: { "Related Enrollment": null } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "skipped_missing_input");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
});

test("non-allowlisted enrollment: skipped_invalid_enrollment (Schmidt-only MVP)", async () => {
  const base = buildStandardBase({
    scenarioCells: { "Related Enrollment": [{ id: "recSOMEOTHERKID99", name: "Other Kid" }] },
  });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "skipped_invalid_enrollment");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
});

test("missing Submission Date: skipped_missing_input", async () => {
  const base = buildStandardBase({ scenarioCells: { "Submission Date": null } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "skipped_missing_input");
});

test("zero Shot Total: skipped_missing_input, scenario Blocked", async () => {
  const base = buildStandardBase({ scenarioCells: { "Shot Total": 0 } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "skipped_missing_input");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
  assert.equal(scenarioRecord(base).getCellValueAsString("Last Run Status"), "Blocked");
});

test("negative Shot Total: skipped_missing_input", async () => {
  const base = buildStandardBase({ scenarioCells: { "Shot Total": -5 } });
  const { output } = await run115({ base, recordId: SCENARIO });
  assert.equal(output.values.actionOut, "skipped_missing_input");
});

test("nonexistent scenario record: hard error with record id in message", async () => {
  const base = buildStandardBase();
  const { output, error } = await run115({ base, recordId: "recDOESNOTEXIST01" });
  assert.ok(error);
  assert.equal(output.values.statusOut, "error");
  assert.match(String(error.message), /recDOESNOTEXIST01/);
});

test("structured console output includes automation identity JSON", async () => {
  const base = buildStandardBase();
  const { console: cap } = await run115({ base, recordId: SCENARIO });
  const jsonLines = cap.lines.filter((l) => l.trim().startsWith("{"));
  assert.ok(jsonLines.length >= 1);
  const parsed = JSON.parse(jsonLines[jsonLines.length - 1]);
  assert.match(parsed.automation, /^115 /);
  assert.equal(parsed.statusOut, "success");
});

test("null Shot Total: skipped_missing_input", async () => {
  const base = buildStandardBase({ scenarioCells: { "Shot Total": null } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "skipped_missing_input");
  assert.equal(base.getTable("Submissions").createdPayloads.length, 0);
});

test("high shot boundary still creates production-shaped Submission", async () => {
  const base = buildStandardBase({ scenarioCells: { "Shot Total": 500 } });
  const { output, error } = await run115({ base, recordId: SCENARIO });
  assert.equal(error, null);
  assert.equal(output.values.actionOut, "created");
  assert.equal(base.getTable("Submissions").createdPayloads[0].payload["Shot Total"], 500);
});

test("stale Linked Submission overwritten on successful live create", async () => {
  const base = buildStandardBase({
    scenarioCells: {
      "Linked Submission": [{ id: "recOLDSubmission01", name: "old" }],
      "Actual Result": "STALE",
      "Last Run Status": "Pass",
    },
  });
  const { output } = await run115({ base, recordId: SCENARIO });
  assert.equal(output.values.actionOut, "created");
  const created = base.getTable("Submissions").createdPayloads[0].id;
  assert.deepEqual(scenarioRecord(base).getCellValue("Linked Submission"), [{ id: created }]);
  assert.notEqual(scenarioRecord(base).getCellValueAsString("Actual Result"), "STALE");
});
