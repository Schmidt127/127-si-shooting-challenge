/**
 * Offline regression tests for Automation 031 stale Weekly Summary repair.
 * Run: node --test tools/testing/tests/test_031_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import {
  build031Base,
  run031,
  IDS,
  XP_SOURCE_IDS,
} from "./run_031_script.mjs";

function submissionSummaryIds(base) {
  return base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Weekly Athlete Summary");
}

function summarySubmissionIds(base, summaryId) {
  return base.getTable("Weekly Athlete Summary").records.get(summaryId).getCellValue("Submissions");
}

function xpSummaryIds(base, xpId) {
  return base.getTable("XP Events").records.get(xpId).getCellValue("Weekly Athlete Summary");
}

function totalWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0
  );
}

function baseCanonicalSummary() {
  return new MockRecord(IDS.SUMMARY_CANONICAL, {
    "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
}

test("unrelated malformed summary with no Week is ignored", async () => {
  const malformed = new MockRecord("recSummary031MalformedNoWeek", {
    "Summary Key": "",
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [],
    Submissions: [],
    "Summary Calculation Status": "",
    Created: "2026-08-07T00:00:00.000Z",
  });
  const base = build031Base({
    summaries: [
      baseCanonicalSummary(),
      malformed,
    ],
    xpEvents: [],
  });

  const { output, error, console: cap } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.weeklySummaryId, IDS.SUMMARY_CANONICAL);
  assert.deepEqual(summarySubmissionIds(base, malformed.id), []);
  assert.match(cap.lines.join("\n"), /Ignored malformed Weekly Athlete Summary candidate/);
});

test("malformed existing Submission summary link repairs to the valid canonical summary", async () => {
  const malformedId = "recSummary031MalformedLinked";
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: malformedId, name: "Malformed Summary" }],
    },
    summaries: [
      baseCanonicalSummary(),
      new MockRecord(malformedId, {
        "Summary Key": "",
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [],
        Submissions: [{ id: IDS.SUBMISSION, name: "Submission" }],
        "Summary Calculation Status": "",
        Created: "2026-08-07T00:00:00.000Z",
      }),
    ],
    xpEvents: [],
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "repaired_stale_summary_link");
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(summarySubmissionIds(base, malformedId), []);
});

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
  assert.equal(output.values.actionTaken, "found_existing_summary");
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
  assert.equal(output.values.readinessOut, "set");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
});

test("formula Count This Submission? returning 1 passes readiness validation", async () => {
  const base = build031Base({
    submissionCells: {
      "Count This Submission?": "1",
      "Submission Stat Mode": "Simple Total",
      "Build Daily Email Now?": false,
    },
  });

  const countField = base.getTable("Submissions").getField("Count This Submission?");
  const statModeField = base.getTable("Submissions").getField("Submission Stat Mode");
  const emailField = base.getTable("Submissions").getField("Build Daily Email Now?");
  assert.equal(countField.type, "formula");
  assert.equal(countField.isComputed, true);
  assert.equal(statModeField.type, "formula");
  assert.equal(statModeField.isComputed, true);
  assert.equal(emailField.type, "checkbox");
  assert.equal(emailField.isComputed, false);

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.readinessOut, "set");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("formula readiness values normalize ordinary whitespace and case", async () => {
  const base = build031Base({
    submissionCells: {
      "Count This Submission?": " 1 ",
      "Submission Stat Mode": "  dEtAiLeD sHoOtInG  ",
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.readinessOut, "set");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("formula Count This Submission? returning 0 skips without setting email readiness", async () => {
  const base = build031Base({
    submissionCells: {
      "Count This Submission?": "0",
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_uncounted_submission");
  assert.equal(output.values.readinessOut, "unchanged");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
  assert.equal(totalWrites(base), 0);
});

test("uncounted Submission skips without changing email readiness", async () => {
  const base = build031Base({
    submissionCells: {
      "Count This Submission?": false,
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_uncounted_submission");
  assert.equal(output.values.readinessOut, "unchanged");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
  assert.equal(totalWrites(base), 0);
});

test("unknown Submission Stat Mode skips without changing email readiness", async () => {
  const base = build031Base({
    submissionCells: {
      "Submission Stat Mode": "Pending",
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_unsupported_stat_mode");
  assert.equal(output.values.readinessOut, "unchanged");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
  assert.equal(totalWrites(base), 0);
});

test("blank Submission Stat Mode skips without changing email readiness", async () => {
  const base = build031Base({
    submissionCells: {
      "Submission Stat Mode": "  ",
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_unsupported_stat_mode");
  assert.equal(output.values.readinessOut, "unchanged");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
  assert.equal(totalWrites(base), 0);
});

test("formula Detailed Shooting mode passes readiness validation", async () => {
  const base = build031Base({
    submissionCells: {
      "Count This Submission?": "1",
      "Submission Stat Mode": "Detailed Shooting",
      "Build Daily Email Now?": false,
    },
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.readinessOut, "set");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("missing Enrollment or Week fails before readiness is armed", async () => {
  for (const fieldName of ["Enrollment", "Week"]) {
    const base = build031Base({
      submissionCells: {
        [fieldName]: [],
        "Build Daily Email Now?": false,
      },
    });

    const { output, error } = await run031({ base });
    assert.ok(error);
    assert.equal(output.values.statusOut, "error");
    assert.equal(output.values.readinessOut, "error");
    assert.equal(
      base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
      false
    );
    assert.equal(base.getTable("Weekly Athlete Summary").createdPayloads.length, 0);
    assert.equal(totalWrites(base), 0);
  }
});

test("multiple Submission Enrollment or Week links fail closed before creation", async () => {
  for (const fieldName of ["Enrollment", "Week"]) {
    const base = build031Base({
      submissionCells: {
        [fieldName]: [
          { id: fieldName === "Enrollment" ? IDS.ENROLLMENT : IDS.WEEK },
          { id: "recAmbiguous031Identity" },
        ],
        "Build Daily Email Now?": false,
      },
    });
    const result = await run031({ base });
    assert.ok(result.error);
    assert.match(String(result.error.message), /must have exactly one linked/i);
    assert.equal(base.getTable("Weekly Athlete Summary").createdPayloads.length, 0);
    assert.equal(
      base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
      false
    );
  }
});

test("inactive Enrollment skips without summary, backlink, XP, or daily-email writes", async () => {
  const base = build031Base({ summaries: [], xpEvents: [] });
  base.getTable("Enrollments").records.get(IDS.ENROLLMENT).cells["Active?"] = false;

  const { output, error } = await run031({ base });

  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_inactive_enrollment");
  assert.equal(output.values.readinessOut, "unchanged");
  assert.equal(base.getTable("Weekly Athlete Summary").createdPayloads.length, 0);
  assert.equal(totalWrites(base), 0);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
});

test("pending Submission XP does not block readiness", async () => {
  const base = build031Base({ xpEvents: [] });
  const { output, error } = await run031({ base });

  assert.equal(error, null);
  assert.equal(output.values.readinessOut, "set");
  assert.equal(output.values.orphanXpLinkedCount, 0);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("final summary validation failure leaves readiness unchanged", async () => {
  const base = build031Base({
    submissionCells: {
      "Build Daily Email Now?": false,
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
    ],
  });
  const summaries = base.getTable("Weekly Athlete Summary");
  const originalSelect = summaries.selectRecordAsync.bind(summaries);
  summaries.selectRecordAsync = async (recordId) => {
    const record = await originalSelect(recordId);
    if (recordId === IDS.SUMMARY_CANONICAL && summaries.finalRead) {
      record.cells.Enrollment = [{ id: "recWrongEnrollment031" }];
    }
    return record;
  };
  const originalUpdate = summaries.updateRecordAsync.bind(summaries);
  summaries.updateRecordAsync = async (...args) => {
    await originalUpdate(...args);
    summaries.finalRead = true;
  };

  const { output, error } = await run031({ base });
  assert.ok(error);
  assert.equal(output.values.statusOut, "error");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
});

test("first valid Simple Total Submission creates one canonical summary", async () => {
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [],
    },
    summaries: [],
  });

  const { output, error } = await run031({ base });

  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "created");
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.ok(output.values.weeklySummaryId);
  assert.equal(base.getTable("Weekly Athlete Summary").records.size, 1);
  const created = base.getTable("Weekly Athlete Summary").records.get(output.values.weeklySummaryId);
  const payload = base.getTable("Weekly Athlete Summary").createdPayloads[0].payload;
  assert.deepEqual(payload.Enrollment, [{ id: IDS.ENROLLMENT }]);
  assert.deepEqual(payload.Week, [{ id: IDS.WEEK }]);
  assert.equal(payload["Summary Key"], undefined);
  assert.equal(payload["Summary Calculation Status"].id, "selComplete");
  assert.equal(created.cells["Summary Key"], "ENR-2026-2027|WEEK-EARLY-BIRD");
  assert.deepEqual(submissionSummaryIds(base), [{ id: output.values.weeklySummaryId }]);
  assert.deepEqual(summarySubmissionIds(base, output.values.weeklySummaryId), [
    { id: IDS.SUBMISSION },
  ]);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("first valid Detailed Shooting Submission creates one canonical summary", async () => {
  const base = build031Base({
    submissionCells: {
      "Submission Stat Mode": "Detailed Shooting",
      "Weekly Athlete Summary": [],
    },
    summaries: [],
  });

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.equal(base.getTable("Weekly Athlete Summary").records.size, 1);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
});

test("post-create concurrent canonical duplicate fails before readiness", async () => {
  const base = build031Base({ summaries: [] });
  const summaries = base.getTable("Weekly Athlete Summary");
  const originalCreate = summaries.createRecordAsync.bind(summaries);
  summaries.createRecordAsync = async (payload) => {
    const createdId = await originalCreate(payload);
    summaries.records.set(
      IDS.SUMMARY_DUPLICATE,
      new MockRecord(IDS.SUMMARY_DUPLICATE, {
        "Summary Key": "ENR-2026-2027|WEEK-EARLY-BIRD",
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        Submissions: [],
        "Summary Calculation Status": "",
        Created: "2026-08-07T00:01:00.000Z",
      })
    );
    return createdId;
  };

  const { output, error } = await run031({ base });
  assert.ok(error);
  assert.match(String(error.message), /create conflict/i);
  assert.match(String(error.message), new RegExp(IDS.SUMMARY_DUPLICATE));
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.equal(output.values.readinessOut, "error");
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
  assert.equal(base.getTable("Weekly Athlete Summary").createdPayloads.length, 1);
});

test("repairs non-Submission-Base XP Events but leaves Submission Base untouched", async () => {
  const xpBase = new MockRecord("recXp031SubmissionBase", {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    "XP Source": {
      id: XP_SOURCE_IDS.submissionBase,
      name: "Submission Base",
    },
  });
  const xpBlank = new MockRecord("recXp031BlankNonSubmission", {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [],
    "XP Source": {
      id: XP_SOURCE_IDS.homeworkCompletion,
      name: "Homework Completion",
    },
  });
  const xpStale = new MockRecord("recXp031StaleNonSubmission", {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    "XP Source": {
      id: XP_SOURCE_IDS.shotMilestone,
      name: "Shot Milestone",
    },
  });
  const base = build031Base({
    submissionCells: {
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
    },
    xpEvents: [xpBase, xpBlank, xpStale],
  });

  const { error } = await run031({ base });

  assert.equal(error, null, error && error.message);
  assert.deepEqual(xpSummaryIds(base, xpBlank.id), [
    { id: IDS.SUMMARY_CANONICAL },
  ]);
  assert.deepEqual(xpSummaryIds(base, xpStale.id), [
    { id: IDS.SUMMARY_CANONICAL },
  ]);
  assert.deepEqual(xpSummaryIds(base, xpBase.id), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.equal(
    base.getTable("XP Events").updates.some(update => update.recordId === xpBase.id),
    false
  );
});

test("ambiguous or wrong-owner XP summary links are preserved rather than repaired", async () => {
  const ambiguous = new MockRecord("recXp031AmbiguousOwner", {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE }, { id: "recOtherSummary031" }],
    "XP Source": { id: XP_SOURCE_IDS.homeworkCompletion, name: "Homework Completion" },
  });
  const wrongOwner = new MockRecord("recXp031WrongOwner", {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: "recOtherSummary031" }],
    "XP Source": { id: XP_SOURCE_IDS.homeworkCompletion, name: "Homework Completion" },
  });
  const base = build031Base({ xpEvents: [ambiguous, wrongOwner] });

  const { error } = await run031({ base });

  assert.equal(error, null, error && error.message);
  assert.deepEqual(xpSummaryIds(base, ambiguous.id), [
    { id: IDS.SUMMARY_STALE }, { id: "recOtherSummary031" },
  ]);
  assert.deepEqual(xpSummaryIds(base, wrongOwner.id), [{ id: "recOtherSummary031" }]);
  assert.equal(
    base.getTable("XP Events").updates.some(update =>
      update.recordId === ambiguous.id || update.recordId === wrongOwner.id
    ),
    false
  );
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

test("stale existing link creates canonical summary and repairs the stale link", async () => {
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
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.equal(base.getTable("Weekly Athlete Summary").records.size, 2);
  assert.deepEqual(submissionSummaryIds(base), [{ id: output.values.weeklySummaryId }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
  assert.deepEqual(summarySubmissionIds(base, output.values.weeklySummaryId), [
    { id: IDS.SUBMISSION },
  ]);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_STALE), [
    { id: output.values.weeklySummaryId },
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
  assert.equal(second.output.values.actionTaken, "found_existing_summary");
  assert.deepEqual(submissionSummaryIds(base), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_CANONICAL), [{ id: IDS.SUBMISSION }]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
  assert.deepEqual(xpSummaryIds(base, IDS.XP_STALE), [{ id: IDS.SUMMARY_CANONICAL }]);
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    true
  );
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
  assert.equal(
    base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
    false
  );
});

test("wrong-Enrollment candidate is ignored and canonical summary is created", async () => {
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

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.notDeepEqual(submissionSummaryIds(base), [
    { id: IDS.SUMMARY_STALE, name: "Stale Summary" },
  ]);
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
});

test("wrong-Week candidate is ignored and canonical summary is created", async () => {
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

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
});

test("wrong-Program-Instance candidate is ignored and canonical summary is created", async () => {
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

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
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

  const { output, error } = await run031({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionTaken, "created_canonical_summary");
  assert.deepEqual(summarySubmissionIds(base, IDS.SUMMARY_STALE), []);
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

test("invalid Enrollment or Week links create nothing", async () => {
  for (const [fieldName, missingId] of [
    ["Enrollment", "recMissingEnrollment031"],
    ["Week", "recMissingWeek031"],
  ]) {
    const base = build031Base({
      submissionCells: {
        [fieldName]: [{ id: missingId }],
      },
    });
    const result = await run031({ base });
    assert.ok(result.error);
    assert.equal(missingBaseWrites(base), 0);
    assert.equal(
      base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("Build Daily Email Now?"),
      false
    );
  }
});

function missingBaseWrites(base) {
  return [...base.tables.values()].reduce(
    (count, table) => count + table.updates.length + table.createdPayloads.length,
    0
  );
}
