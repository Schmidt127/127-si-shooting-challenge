/**
 * Offline regression tests for Automation 031 stale Weekly Summary repair.
 * Run: node --test tools/testing/tests/test_031_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build031Base, run031, IDS } from "./run_031_script.mjs";

function submissionSummaryIds(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Weekly Athlete Summary");
}

function summarySubmissionIds(base, summaryId) {
  return base.getTable("Weekly Athlete Summary").records.get(summaryId).getCellValue("Submissions");
}

function xpSummaryIds(base, xpId) {
  return base.getTable("XP Events").records.get(xpId).getCellValue("Weekly Athlete Summary");
}

test("valid existing link stays canonical and repairs missing back-links", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    },
    xpEvents: [
      new MockRecord(IDS.XP_ORPHAN, {
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        "Weekly Athlete Summary": [],
      }),
    ],
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "found_existing_valid_summary");
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_CANONICAL), [{ id: IDS.SUBMISSION }]);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_ORPHAN), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("stale existing link repairs to the canonical summary and moves matching XP", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "repaired_stale_summary_link");
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_CANONICAL), [{ id: IDS.SUBMISSION }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_ORPHAN), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_STALE), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("stale existing link fails closed when no canonical replacement exists", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      new MockRecord(IDS.SUMMARY_STALE, {
        "Summary Key": "ENR-OLD|WEEK-OLD",
        Enrollment: [{ id: "recWrongEnrollment031", name: "Wrong Enrollment" }],
        Week: [{ id: "recWrongWeek031", name: "Wrong Week" }],
        Submissions: [{ id: IDS.SUBMISSION, name: "Submission" }],
        "Summary Calculation Status": "",
        Created: "2026-08-06T00:00:00.000Z",
      }),
    ],
  });

  const { output, error } = await run031({ base });
  assert.ok(error);
  assert.match(String(error.message), /no canonical summary can be resolved safely/i);
  assert.equal(output.values.statusOut, "error");
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }]);
});

test("replay after repair is idempotent", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
  });

  const first = await run031({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(first.output.values.actionTaken, "repaired_stale_summary_link");

  const second = await run031({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(second.output.values.actionTaken, "found_existing_valid_summary");
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_CANONICAL), [{ id: IDS.SUBMISSION }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_STALE), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("ambiguous canonical matches fail closed", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      new MockRecord(IDS.SUMMARY_CANONICAL, {
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        Submissions: [],
        "Summary Calculation Status": "",
        Created: "2026-08-07T00:00:00.000Z",
      }),
      new MockRecord(IDS.SUMMARY_DUPLICATE, {
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        Submissions: [],
        "Summary Calculation Status": "",
        Created: "2026-08-07T00:01:00.000Z",
      }),
      new MockRecord(IDS.SUMMARY_STALE, {
        "Summary Key": "ENR-OLD|WEEK-OLD",
        Enrollment: [{ id: "recWrongEnrollment031", name: "Wrong Enrollment" }],
        Week: [{ id: "recWrongWeek031", name: "Wrong Week" }],
        Submissions: [{ id: IDS.SUBMISSION, name: "Submission" }],
        "Summary Calculation Status": "",
        Created: "2026-08-06T00:00:00.000Z",
      }),
    ],
  });

  const { error } = await run031({ base });
  assert.ok(error);
  assert.match(String(error.message), /Duplicate Weekly Athlete Summary records found/i);
});
