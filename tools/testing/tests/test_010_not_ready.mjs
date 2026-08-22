/**
 * Regression tests for Automation 010 v10.12 formula/link not-ready handling.
 * Run: node --test tools/testing/tests/test_010_not_ready.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build010Base, run010, IDS } from "./run_010_script.mjs";

function submissionRecord(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION);
}

function totalWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0,
  );
}

test("missing Enrollment link returns skipped_not_ready without throwing", async () => {
  const base = build010Base({
    submissionCells: {
      Enrollment: [],
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.equal(output.values.reconciliationAcknowledged, false);
  assert.equal(submissionRecord(base).getCellValue("Reconciliation Needed?"), 1);
  assert.equal(base.getTable("XP Events").records.size, 0);
  assert.equal(totalWrites(base), 0);
});

test("missing Week link returns skipped_not_ready without throwing", async () => {
  const base = build010Base({
    submissionCells: {
      Week: [],
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.equal(output.values.reconciliationAcknowledged, false);
  assert.equal(totalWrites(base), 0);
});

test("formula/link delay with unsettled counted fields returns skipped_not_ready", async () => {
  const base = build010Base({
    submissionCells: {
      Enrollment: [],
      Week: [],
      "Count This Submission?": false,
      "Total Shots Counted": 0,
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    weeklySummaries: [],
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.match(String(output.values.notReadyReason || ""), /Enrollment/i);
  assert.equal(totalWrites(base), 0);
});

test("fully settled record creates one XP event", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  assert.equal(base.getTable("XP Events").records.size, 1);
  assert.equal(
    base.getTable("XP Events").records.values().next().value.getCellValue("Source Key"),
    `SUBMISSION_XP|${IDS.SUBMISSION}`,
  );
});

test("replay reuses the same XP event without duplication", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const first = await run010({ base });
  const xpEventId = first.output.values.xpEventId;
  assert.equal(first.error, null, first.error && first.error.message);

  submissionRecord(base).cells["Last Reconciled Signature"] = "";
  submissionRecord(base).cells["Reconciliation Needed?"] = 1;

  const second = await run010({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(base.getTable("XP Events").records.size, 1);
  assert.equal(second.output.values.xpEventId, xpEventId);
});

test("Count This Submission? false does not create XP when structurally ready", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_ineligible");
  assert.equal(base.getTable("XP Events").records.size, 0);
});

test("zero Total Shots Counted does not create XP when structurally ready", async () => {
  const base = build010Base({
    submissionCells: {
      "Total Shots Counted": 0,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_ineligible");
  assert.equal(base.getTable("XP Events").records.size, 0);
});

test("dynamic recordId from input is preserved", async () => {
  const customId = "recCustomSubmission99";
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const submissionsTable = base.getTable("Submissions");
  const customRecord = new MockRecord(customId, {
  ...submissionsTable.records.get(IDS.SUBMISSION).cells,
  });
  submissionsTable.records.set(customId, customRecord);

  const { output, error } = await run010({ base, recordId: customId });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.submissionId, customId);
  assert.equal(output.values.sourceKey, `SUBMISSION_XP|${customId}`);
});

test("existing XP event is never duplicated on eligible replay", async () => {
  const base = build010Base();
  const first = await run010({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  const countAfterFirst = base.getTable("XP Events").records.size;

  submissionRecord(base).cells["Last Reconciled Signature"] = "";
  submissionRecord(base).cells["Reconciliation Needed?"] = 1;

  const second = await run010({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(base.getTable("XP Events").records.size, countAfterFirst);
});
