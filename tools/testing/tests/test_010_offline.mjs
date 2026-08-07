/**
 * Offline regression tests for Automation 010 stale Weekly Summary repair.
 * Run: node --test tools/testing/tests/test_010_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build010Base, run010, IDS } from "./run_010_script.mjs";

function submissionWeeklySummary(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Weekly Athlete Summary");
}

function xpEventWeeklySummary(base) {
  return base.getTable("XP Events").records.get(IDS.XP_EVENT).getCellValue("Weekly Athlete Summary");
}

function totalWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0
  );
}

test("repairs a stale Submission summary link to the canonical Enrollment+Week summary", async () => {
  const base = build010Base();

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "updated");
  assert.equal(output.values.actionOut, "updated_existing_xp_event");
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.equal(output.values.weeklySummaryResolution, "source_repaired_to_canonical");
  assert.equal(output.values.repairedSubmissionSummaryLink, true);

  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(xpEventWeeklySummary(base), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("fails closed when a stale source summary exists but no canonical replacement exists", async () => {
  const base = build010Base({
    weeklySummaries: [
      new MockRecord(IDS.SUMMARY_STALE, {
        Enrollment: [{ id: "recWrongEnrollment0001", name: "Wrong Enrollment" }],
        Week: [{ id: "recWrongWeek0000001", name: "Wrong Week" }],
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
      }),
    ],
  });

  const { output, error } = await run010({ base });
  assert.ok(error);
  assert.match(
    String(error.message),
    /expected exactly one valid canonical summary, found 0/i
  );
  assert.equal(output.values.statusOut, "error");
  assert.equal(totalWrites(base), 0);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("XP Award Status"),
    ""
  );
  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
  assert.deepEqual(xpEventWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
});

test("no existing Submission summary link requires one valid replacement", async () => {
  const base = build010Base({
    submissionCells: {
      "Weekly Athlete Summary": [],
    },
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("zero valid candidates fails closed before XP writes", async () => {
  const base = build010Base({
    weeklySummaries: [
      new MockRecord(IDS.SUMMARY_STALE, {
        Enrollment: [{ id: "recOtherEnrollment", name: "Other Enrollment" }],
        Week: [{ id: "recOtherWeek", name: "Other Week" }],
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
      }),
    ],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.equal(totalWrites(base), 0);
  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
});

test("multiple valid candidates fails closed before XP writes", async () => {
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
  assert.match(String(error.message), /exactly one valid canonical/i);
  assert.equal(totalWrites(base), 0);
});

test("correct key with wrong Enrollment, Week, or Program Instance fails closed without writes", async () => {
  const base = build010Base({
    weeklySummaries: [
      new MockRecord(IDS.SUMMARY_CANONICAL, {
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: "recOtherWeek", name: "Early Bird" }],
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
      }),
    ],
  });
  base.getTable("Weeks").records.set(
    "recOtherWeek",
    new MockRecord("recOtherWeek", {
      "Week Key": "WEEK-EARLY-BIRD",
      "Program Instance": [{ id: "recPI2025", name: "2025-2026" }],
    })
  );

  const { error } = await run010({ base });
  assert.ok(error);
  assert.equal(totalWrites(base), 0);
  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
});

test("replay preserves XP Event and summary record counts", async () => {
  const base = build010Base();
  const first = await run010({ base });
  const xpCountAfterFirst = base.getTable("XP Events").records.size;
  const second = await run010({ base });
  const xpCountAfterReplay = base.getTable("XP Events").records.size;

  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(xpCountAfterReplay, xpCountAfterFirst);
  assert.equal(base.getTable("Weekly Athlete Summary").records.size, 2);
});
