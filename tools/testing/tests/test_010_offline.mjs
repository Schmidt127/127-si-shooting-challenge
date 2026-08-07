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
      }),
    ],
  });

  const { output, error } = await run010({ base });
  assert.ok(error);
  assert.match(
    String(error.message),
    /no canonical Weekly Athlete Summary exists for repair/i
  );
  assert.equal(output.values.statusOut, "error");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("XP Award Status"),
    "Error"
  );
  assert.deepEqual(submissionWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
  assert.deepEqual(xpEventWeeklySummary(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
});
