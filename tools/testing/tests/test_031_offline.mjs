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

test("no existing link selects one fully valid canonical replacement", async () => {
  const base = build031Base();

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "found_existing_summary");
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
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

test("stale existing link fails closed on zero valid candidates without writes", async () => {
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
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), [
    { id: IDS.SUBMISSION, name: "Submission" },
  ]);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_STALE), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
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
  assert.match(String(error.message), /Multiple fully valid Weekly Athlete Summary records found/i);
});

test("correct Summary Key with wrong Enrollment fails closed without writes", async () => {
  const wrongContext = new MockRecord("recSummaryWrongEnrollment", {
    "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
    Enrollment: [{ id: "recOtherEnrollment", name: "Other Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      wrongContext,
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
  assert.deepEqual(submissionSummaryIds(base), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), [
    { id: IDS.SUBMISSION, name: "Submission" },
  ]);
});

test("correct Summary Key with wrong Week fails closed without writes", async () => {
  const wrongContext = new MockRecord("recSummaryWrongWeek", {
    "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: "recOtherWeek", name: "Other Week" }],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      wrongContext,
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
  assert.deepEqual(submissionSummaryIds(base), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), [
    { id: IDS.SUBMISSION, name: "Submission" },
  ]);
});

test("correct Summary Key with wrong Program Instance fails closed without writes", async () => {
  const wrongProgramInstanceWeek = new MockRecord("recOtherWeek", {
    "Week Key": "WEEK-EARLY-BIRD",
    "Week Name": "Early Bird",
    "Program Instance": [{ id: "recPI2025", name: "2025-2026" }],
  });
  const wrongContext = new MockRecord("recSummaryWrongProgram", {
    "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: wrongProgramInstanceWeek.id, name: "Early Bird" }],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      wrongContext,
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
  base.getTable("Weeks").records.set(
    wrongProgramInstanceWeek.id,
    wrongProgramInstanceWeek
  );

  const { error } = await run031({ base });
  assert.ok(error);
  assert.deepEqual(submissionSummaryIds(base), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), [
    { id: IDS.SUBMISSION, name: "Submission" },
  ]);
});

test("same athlete and week in another Program Instance is not a valid candidate", async () => {
  const otherWeek = new MockRecord("recOtherWeek", {
    "Week Key": "WEEK-EARLY-BIRD",
    "Week Name": "Early Bird",
    "Program Instance": [{ id: "recPI2025", name: "2025-2026" }],
  });
  const otherSummary = new MockRecord("recSummaryOtherProgram", {
    "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: otherWeek.id, name: "Early Bird" }],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    summaries: [
      otherSummary,
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
  base.getTable("Weeks").records.set(otherWeek.id, otherWeek);

  const { error } = await run031({ base });
  assert.ok(error);
  assert.deepEqual(submissionSummaryIds(base), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), [
    { id: IDS.SUBMISSION, name: "Submission" },
  ]);
});

test("missing or ambiguous Program Instance fails before any writes", async () => {
  const missingPiBase = build031Base();
  missingPiBase.getTable("Enrollments").records.get(IDS.ENROLLMENT).cells[
    "Program Instance"
  ] = [];
  const missing = await run031({ base: missingPiBase });
  assert.ok(missing.error);
  assert.equal(missingBaseWrites(missingPiBase), 0);

  const ambiguousPiBase = build031Base();
  ambiguousPiBase.getTable("Weeks").records.get(IDS.WEEK).cells[
    "Program Instance"
  ] = [{ id: "recPI2026" }, { id: "recPI2025" }];
  const ambiguous = await run031({ base: ambiguousPiBase });
  assert.ok(ambiguous.error);
  assert.equal(missingBaseWrites(ambiguousPiBase), 0);
});

function missingBaseWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0
  );
}
