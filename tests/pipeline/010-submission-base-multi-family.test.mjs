/**
 * PKG-006R-HF-001 offline regression for Automation 010 v10.8.
 * Run: node --test tests/pipeline/010-submission-base-multi-family.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "../../tools/testing/tests/airtable_mock.mjs";
import { build010Base, run010, IDS } from "../../tools/testing/tests/run_010_script.mjs";

const SECOND_SUBMISSION_XP = "recXpEvent01000002";
const VIDEO_XP = "recVideoXp01000001";
const LEGACY_SUBMISSION_XP = "recLegacySubmissionXp1";

function submissionXpRecord(id, overrides = {}) {
  return new MockRecord(id, {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    "XP Source": { id: "selZw4nOkwMJCgGyR", name: "Submission Base" },
    "XP Bucket": { name: "Shooting Base" },
    "XP Points": 20,
    "XP Reason Public": "",
    "XP Reason Debug": "",
    "Active?": true,
    "Source Key": `SUBMISSION_XP|${IDS.SUBMISSION}`,
    "XP Activity Date": "2026-08-07",
    "XP Activity Date Source": { name: "Submission Activity Date" },
    "XP Dedupe Key": "",
    "XP Dedupe Key Normalized": "",
    "Weekly Summary Key": "",
    "Streak Occurrence Key": "",
    ...overrides,
  });
}

function homeworkXpRecord(id = IDS.HOMEWORK_XP_EVENT) {
  return new MockRecord(id, {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    "XP Source": { name: "Homework" },
    "XP Bucket": { name: "Homework" },
    "XP Points": 5,
    "XP Reason Public": "Homework complete",
    "XP Reason Debug": "",
    "Active?": true,
    "Source Key": "HOMEWORK_XP|recHomeworkTarget01001",
    "XP Activity Date": "2026-08-07",
    "XP Activity Date Source": { name: "Submission Activity Date" },
    "XP Dedupe Key": "",
    "XP Dedupe Key Normalized": "",
    "Weekly Summary Key": "",
    "Streak Occurrence Key": "",
  });
}

function videoXpRecord() {
  return new MockRecord(VIDEO_XP, {
    Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
    Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
    Week: [{ id: IDS.WEEK, name: "Early Bird" }],
    "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    "XP Source": { name: "Homework" },
    "XP Bucket": { name: "Homework" },
    "XP Points": 10,
    "XP Reason Public": "Video submission",
    "XP Reason Debug": "",
    "Active?": true,
    "Source Key": "VIDEO_SUBMISSION|recVideoFeedback0101",
    "XP Activity Date": "2026-08-07",
    "XP Activity Date Source": { name: "Submission Activity Date" },
    "XP Dedupe Key": "",
    "XP Dedupe Key Normalized": "",
    "Weekly Summary Key": "",
    "Streak Occurrence Key": "",
  });
}

function linkedXpIds(base) {
  return (base.getTable("Submissions").records.get(IDS.SUBMISSION).getCellValue("XP Events") || [])
    .map((item) => item.id);
}

test("reuses Submission Base XP when Homework XP is also linked to the same Submission", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP" },
        { id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" },
      ],
    },
    xpEvents: [submissionXpRecord(IDS.XP_EVENT), homeworkXpRecord()],
  });

  const homeworkBefore = { ...base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).cells };
  const { output, error } = await run010({ base });

  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.xpEventId, IDS.XP_EVENT);
  assert.equal(base.getTable("XP Events").records.size, 2);
  assert.deepEqual(
    base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).cells,
    homeworkBefore,
  );
  assert.ok(linkedXpIds(base).includes(IDS.XP_EVENT));
  assert.ok(linkedXpIds(base).includes(IDS.HOMEWORK_XP_EVENT));
});

test("ignores multiple unrelated XP families while reconciling Submission Base XP", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP" },
        { id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" },
        { id: VIDEO_XP, name: "Video XP" },
      ],
    },
    xpEvents: [submissionXpRecord(IDS.XP_EVENT), homeworkXpRecord(), videoXpRecord()],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.xpEventId, IDS.XP_EVENT);
  assert.equal(base.getTable("XP Events").records.size, 3);
});

test("fails closed when two exact Submission Base XP events exist", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP A" },
        { id: SECOND_SUBMISSION_XP, name: "Submission XP B" },
      ],
    },
    xpEvents: [
      submissionXpRecord(IDS.XP_EVENT),
      submissionXpRecord(SECOND_SUBMISSION_XP),
    ],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /Duplicate canonical Source Key/i);
});

test("fails closed when canonical Submission Base XP has wrong ownership", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
    },
    xpEvents: [
      submissionXpRecord(IDS.XP_EVENT, {
        "Weekly Athlete Summary": [{ id: IDS.SUMMARY_STALE, name: "Stale Summary" }],
      }),
    ],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /ownership mismatch/i);
});

test("fails closed when canonical and legacy Submission Base XP both exist", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Canonical Submission XP" },
        { id: LEGACY_SUBMISSION_XP, name: "Legacy Submission XP" },
      ],
    },
    xpEvents: [
      submissionXpRecord(IDS.XP_EVENT),
      submissionXpRecord(LEGACY_SUBMISSION_XP, {
        "Source Key": "",
        "XP Reason Debug": "legacy row",
      }),
    ],
  });

  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /conflicting canonical and legacy Submission Base XP Events/i);
});

test("creates canonical Submission Base XP when only unrelated Homework XP is linked", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [{ id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" }],
      "Last Reconciled Signature": "",
    },
    xpEvents: [homeworkXpRecord()],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  assert.equal(base.getTable("XP Events").records.size, 2);
  const created = [...base.getTable("XP Events").records.values()]
    .find((row) => row.id !== IDS.HOMEWORK_XP_EVENT);
  assert.equal(created.getCellValue("Source Key"), `SUBMISSION_XP|${IDS.SUBMISSION}`);
  assert.deepEqual(
    base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).getCellValue("Source Key"),
    "HOMEWORK_XP|recHomeworkTarget01001",
  );
});

test("deactivates a legacy Submission Base XP event on ineligible correction", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Events": [
        { id: LEGACY_SUBMISSION_XP, name: "Legacy Submission XP" },
        { id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" },
      ],
    },
    xpEvents: [
      submissionXpRecord(LEGACY_SUBMISSION_XP, {
        "Source Key": "",
        "XP Reason Debug": "legacy row",
      }),
      homeworkXpRecord(),
    ],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "deactivated_same_event");
  assert.equal(output.values.xpEventId, LEGACY_SUBMISSION_XP);
  assert.equal(
    base.getTable("XP Events").records.get(LEGACY_SUBMISSION_XP).getCellValue("Active?"),
    false,
  );
  assert.equal(
    base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).getCellValue("Active?"),
    true,
  );
});

test("withdrawal and restoration preserve Submission Base XP and ignore unrelated events", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP" },
        { id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" },
      ],
    },
    xpEvents: [submissionXpRecord(IDS.XP_EVENT), homeworkXpRecord()],
  });

  const first = await run010({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  const homeworkSnapshot = { ...base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).cells };

  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Count This Submission?"] = false;
  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Last Reconciled Signature"] = "";
  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Reconciliation Needed?"] = 1;
  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Weekly Athlete Summary"] = [
    { id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" },
  ];

  const deactivated = await run010({ base });
  assert.equal(deactivated.error, null, deactivated.error && deactivated.error.message);
  assert.equal(deactivated.output.values.actionOut, "deactivated_same_event");
  assert.equal(base.getTable("XP Events").records.get(IDS.XP_EVENT).getCellValue("Active?"), false);
  assert.deepEqual(
    base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT).cells,
    homeworkSnapshot,
  );

  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Count This Submission?"] = true;
  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Last Reconciled Signature"] = "";
  base.getTable("Submissions").records.get(IDS.SUBMISSION).cells["Reconciliation Needed?"] = 1;

  const restored = await run010({ base });
  assert.equal(restored.error, null, restored.error && restored.error.message);
  assert.equal(restored.output.values.xpEventId, IDS.XP_EVENT);
  assert.match(restored.output.values.actionOut, /reactivated_same_event|repaired_same_event/);
  assert.equal(base.getTable("XP Events").records.size, 2);
  assert.equal(base.getTable("XP Events").records.get(IDS.XP_EVENT).getCellValue("Active?"), true);
});
