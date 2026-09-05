/**
 * Offline regression tests for Automation 010 v10.12 reconciliation writer.
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

test("formula/link delay returns skipped_not_ready without throwing", async () => {
  const base = build010Base({
    submissionCells: {
      Enrollment: [],
      Week: [],
      "Weekly Athlete Summary": [],
      "Count This Submission?": null,
      "Total Shots Counted": null,
      "XP Events": [],
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.equal(output.values.errorOut, "");
  assert.equal(output.values.reconciliationAcknowledged, false);
  assert.ok(output.values.notReadyFields.includes("Enrollment"));
  assert.ok(output.values.notReadyFields.includes("Week"));
  assert.ok(output.values.notReadyFields.includes("Count This Submission?"));
  assert.ok(output.values.notReadyFields.includes("Total Shots Counted"));
});

test("formula/link delay does not acknowledge the latch", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": null,
      "Total Shots Counted": null,
      "XP Events": [],
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.equal(output.values.reconciliationAcknowledged, false);
  assert.equal(submissionRecord(base).getCellValue("Last Reconciled Signature"), "");
  assert.equal(totalWrites(base), 0);
});

test("missing Enrollment/Week/WAS while formulas are unsettled returns skipped_not_ready", async () => {
  const base = build010Base({
    submissionCells: {
      Enrollment: [],
      Week: [],
      "Weekly Athlete Summary": [],
      "Count This Submission?": true,
      "Total Shots Counted": 150,
      "XP Events": [],
    },
    xpEvents: [],
    weeklySummaries: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.ok(output.values.notReadyFields.includes("Enrollment"));
  assert.ok(output.values.notReadyFields.includes("Week"));
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

test("Count This Submission? false returns skipped_ineligible", async () => {
  const base = build010Base({
    submissionCells: {
      "Count This Submission?": false,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Events": [],
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_ineligible");
  assert.equal(output.values.reconciliationAcknowledged, true);
});

test("zero shots returns skipped_ineligible", async () => {
  const base = build010Base({
    submissionCells: {
      "Total Shots Counted": 0,
      "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
      "XP Events": [],
    },
    xpEvents: [],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_ineligible");
  assert.equal(output.values.reconciliationAcknowledged, true);
});

test("unsettled canonical WAS returns skipped_not_ready", async () => {
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

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "skipped_not_ready");
  assert.ok(output.values.notReadyFields.includes("Weekly Athlete Summary"));
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
  assert.match(String(error.message), /multiple Weekly Athlete Summary candidates/i);
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

test("dynamic recordId is preserved", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });
  const customId = "recCustomSubmission01";
  base.getTable("Submissions").records.set(
    customId,
    new MockRecord(customId, {
      ...submissionRecord(build010Base()).cells,
      "XP Events": [],
      "Last Reconciled Signature": "",
    })
  );

  const { output, error } = await run010({ base, recordId: customId });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.submissionId, customId);
  const created = [...base.getTable("XP Events").records.values()].find(
    (row) => row.getCellValue("Source Key") === `SUBMISSION_XP|${customId}`
  );
  assert.ok(created);
});

test("no duplicate Submission XP events can be created", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });

  const first = await run010({ base });
  assert.equal(first.error, null);
  assert.equal(first.output.values.actionOut, "created");

  submissionRecord(base).cells["Last Reconciled Signature"] = "";
  submissionRecord(base).cells["Reconciliation Needed?"] = 1;

  const second = await run010({ base });
  assert.equal(second.error, null);
  assert.equal(base.getTable("XP Events").records.size, 1);
  assert.match(second.output.values.actionOut, /reactivated_same_event|repaired_same_event/);
});

test("Homework XP linked to the same Submission does not interfere with Submission Base ownership", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.HOMEWORK_XP_EVENT, name: "Homework XP" },
      ],
      "Last Reconciled Signature": "",
    },
    xpEvents: [
      new MockRecord(IDS.HOMEWORK_XP_EVENT, {
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
        Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
        Week: [{ id: IDS.WEEK, name: "Early Bird" }],
        "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
        "XP Source": { name: "Homework" },
        "XP Bucket": { name: "Homework" },
        "XP Points": 15,
        "XP Reason Public": "Homework complete",
        "XP Reason Debug": "HOMEWORK_XP test",
        "Active?": true,
        "Source Key": `HOMEWORK_XP|${IDS.SUBMISSION}`,
        "XP Activity Date": "2026-08-07",
        "XP Activity Date Source": { name: "Submission Activity Date" },
      }),
    ],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  const submissionBase = [...base.getTable("XP Events").records.values()].filter(
    (row) => row.getCellValue("Source Key") === `SUBMISSION_XP|${IDS.SUBMISSION}`
  );
  assert.equal(submissionBase.length, 1);
  const homework = base.getTable("XP Events").records.get(IDS.HOMEWORK_XP_EVENT);
  assert.equal(homework.getCellValue("Source Key"), `HOMEWORK_XP|${IDS.SUBMISSION}`);
});

test("SC-167 concurrent create race consolidates to one active award", async () => {
  const base = build010Base({
    submissionCells: {
      "XP Events": [],
      "Last Reconciled Signature": "",
    },
    xpEvents: [],
  });
  const xpTable = base.getTable("XP Events");
  const originalCreate = xpTable.createRecordAsync.bind(xpTable);
  xpTable.createRecordAsync = async (payload) => {
    const id = await originalCreate(payload);
    // Inject a peer create that won the race (earlier createdTime).
    const peerId = "recPeerRaceXp00001";
    xpTable.records.set(
      peerId,
      new MockRecord(
        peerId,
        {
          ...Object.fromEntries(
            Object.entries(payload).map(([k, v]) => [
              k,
              v && typeof v === "object" && v.name !== undefined && !Array.isArray(v) ? v.name : v,
            ])
          ),
          "Active?": true,
        },
        "2026-09-05T11:59:59.000Z"
      )
    );
    return id;
  };

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "consolidated_duplicate_canonical");
  const rows = [...xpTable.records.values()].filter(
    (row) => row.getCellValue("Source Key") === `SUBMISSION_XP|${IDS.SUBMISSION}`
  );
  assert.equal(rows.length, 2);
  const actives = rows.filter((row) => row.getCellValue("Active?") === true);
  assert.equal(actives.length, 1);
  assert.equal(actives[0].id, "recPeerRaceXp00001");
  assert.equal(output.values.xpEventId, "recPeerRaceXp00001");
});

test("SC-167 pre-existing duplicate canonical keys consolidate on reconcile", async () => {
  const peerId = "recDupCanonXp00002";
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP" },
        { id: peerId, name: "Duplicate XP" },
      ],
      "Last Reconciled Signature": "",
    },
    xpEvents: [
      new MockRecord(
        IDS.XP_EVENT,
        {
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
        },
        "2026-09-05T12:00:00.000Z"
      ),
      new MockRecord(
        peerId,
        {
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
        },
        "2026-09-05T12:00:05.000Z"
      ),
    ],
  });

  const { output, error } = await run010({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.actionOut, "consolidated_duplicate_canonical");
  assert.equal(output.values.xpEventId, IDS.XP_EVENT);
  assert.equal(base.getTable("XP Events").records.get(IDS.XP_EVENT).getCellValue("Active?"), true);
  assert.equal(base.getTable("XP Events").records.get(peerId).getCellValue("Active?"), false);
});

test("SC-167 ambiguous ownership on duplicate keys fails closed", async () => {
  const peerId = "recDupAmbiguous0001";
  const base = build010Base({
    submissionCells: {
      "XP Events": [
        { id: IDS.XP_EVENT, name: "Submission XP" },
        { id: peerId, name: "Ambiguous XP" },
      ],
      "Last Reconciled Signature": "",
    },
    xpEvents: [
      new MockRecord(
        IDS.XP_EVENT,
        {
          Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt Enrollment" }],
          Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
          Week: [{ id: IDS.WEEK, name: "Early Bird" }],
          "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
          "XP Source": { id: "selZw4nOkwMJCgGyR", name: "Submission Base" },
          "XP Bucket": { name: "Shooting Base" },
          "XP Points": 20,
          "Active?": true,
          "Source Key": `SUBMISSION_XP|${IDS.SUBMISSION}`,
        },
        "2026-09-05T12:00:00.000Z"
      ),
      new MockRecord(
        peerId,
        {
          Enrollment: [{ id: "recWrongEnrollment1", name: "Wrong" }],
          Submission: [{ id: IDS.SUBMISSION, name: "Submission" }],
          Week: [{ id: IDS.WEEK, name: "Early Bird" }],
          "Weekly Athlete Summary": [{ id: IDS.SUMMARY_CANONICAL, name: "Canonical Summary" }],
          "XP Source": { id: "selZw4nOkwMJCgGyR", name: "Submission Base" },
          "XP Bucket": { name: "Shooting Base" },
          "XP Points": 20,
          "Active?": true,
          "Source Key": `SUBMISSION_XP|${IDS.SUBMISSION}`,
        },
        "2026-09-05T12:00:05.000Z"
      ),
    ],
  });

  const before = totalWrites(base);
  const { error } = await run010({ base });
  assert.ok(error);
  assert.match(String(error.message), /ambiguous ownership|ownership mismatch/i);
  assert.equal(totalWrites(base), before);
  assert.equal(base.getTable("XP Events").records.get(peerId).getCellValue("Active?"), true);
});
