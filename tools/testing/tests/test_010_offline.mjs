/**
 * Offline regression tests for Automation 010 v10.8 reconciliation writer.
 * Run: node --test tools/testing/tests/test_010_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build010Base, run010, IDS, CURRENT_SIGNATURE } from "./run_010_script.mjs";

function submissionRecord(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION);
}

function xpEventRecord(base) {
  return base.getTable("XP Events").records.get(IDS.XP_EVENT);
}

function totalWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0
  );
}

test("repairs an owned XP Event and acknowledges the reconciliation latch", async () => {
  const base = build010Base();
  const { output, error } = await run010({ base });

  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.match(output.values.actionOut, /reactivated_same_event|repaired_same_event/);
  assert.equal(output.values.reconciliationAcknowledged, true);
  assert.equal(output.values.reconciledSignature, CURRENT_SIGNATURE);
  assert.equal(
    submissionRecord(base).getCellValue("Last Reconciled Signature"),
    CURRENT_SIGNATURE
  );
  assert.equal(submissionRecord(base).getCellValue("Reconciliation Needed?"), 0);
  assert.deepEqual(
    xpEventRecord(base).getCellValue("Weekly Athlete Summary"),
    [{ id: IDS.SUMMARY_CANONICAL }]
  );
});

test("creates a canonical XP Event when none exists", async () => {
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
});

test("deactivates the exact owned XP Event when the Submission becomes ineligible", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    },
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "deactivated_same_event");
  assert.equal(xpEventRecord(base).getCellValue("Active?"), false);
});

test("fails closed when no canonical Weekly Athlete Summary exists", async () => {
  const base = build010Base({
    weeklySummaries: [
      new MockRecord(IDS.SUMMARY_STALE, {
        Enrollment: [{ id: "recWrongEnrollment0001", name: "Wrong Enrollment" }],
        Week: [{ id: "recWrongWeek0000001", name: "Wrong Week" }],
        "Summary Key": "ENR-OLD|WEEK-OLD",
      }),
    ],
    submissionCells: {
      "XP Events": [],
    },
    xpEvents: [],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /incomplete or ambiguous canonical identity/i);
  assert.equal(totalWrites(base), 0);
});

test("multiple valid Weekly Athlete Summary candidates fail closed", async () => {
  const base = build010Base({
    weeklySummaries: [
      new MockRecord(IDS.SUMMARY_CANONICAL, {
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
      }),
      new MockRecord("recSummaryCanonical2", {
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
      }),
    ],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /incomplete or ambiguous canonical identity/i);
  assert.equal(totalWrites(base), 0);
});

test("ambiguous Enrollment links fail closed before any writes", async () => {
  const base = build010Base({
    submissionCells: {
      Enrollment: [
        { id: IDS.ENROLLMENT, name: "Schmidt Enrollment" },
        { id: "recOtherEnrollment", name: "Other Enrollment" },
      ],
    },
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /ambiguous Enrollment, Week, or WAS links/i);
  assert.equal(totalWrites(base), 0);
});

test("replay preserves XP Event count and acknowledges without duplicate creation", async () => {
  const base = build010Base();
  const first = await run010({ base });
  const xpCountAfterFirst = base.getTable("XP Events").records.size;

  submissionRecord(base).cells["Last Reconciled Signature"] = "";
  submissionRecord(base).cells["Reconciliation Needed?"] = 1;

  const second = await run010({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(base.getTable("XP Events").records.size, xpCountAfterFirst);
  assert.match(second.output.values.actionOut, /reactivated_same_event|repaired_same_event/);
});

test("ownership mismatch on an existing canonical XP Event fails closed", async () => {
  const base = build010Base({
    xpEventCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    },
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /ownership mismatch/i);
  assert.equal(totalWrites(base), 0);
});
