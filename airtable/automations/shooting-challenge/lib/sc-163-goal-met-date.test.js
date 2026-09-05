"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
  decideGoalMetDateMigrationWrite,
  toDenverDateKey,
  toDateKeyFromText,
  preserveActivityDateKey,
  sortCountedSubmissions,
  resolveTargetGoalShots,
} = require("./sc-163-goal-met-date.js");

function sub(id, dateKey, shots, createdTime) {
  return {
    id,
    activityDateKey: dateKey,
    // Simulate Airtable date-only UTC midnight (the trap that caused the live shift).
    activityDate: new Date(`${dateKey}T00:00:00.000Z`),
    totalShotsCounted: shots,
    createdTime: createdTime || `${dateKey}T12:00:00.000Z`,
  };
}

test("1. Goal not met → blank (no stamp decision)", () => {
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-01", 500), sub("recB", "2026-08-02", 500)],
    2000
  );
  assert.equal(crossing, null);
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: false,
    crossing: null,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 1000,
  });
  assert.equal(decision.action, "skipped_not_met");
});

test("2. Goal crossed by one ordinary Submission", () => {
  const crossing = findFirstGoalMetCrossing([sub("recA", "2026-08-30", 2500)], 2000);
  assert.ok(crossing);
  assert.equal(crossing.submissionId, "recA");
  assert.equal(crossing.dateKey, "2026-08-30");
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "stamped");
  assert.equal(decision.dateKey, "2026-08-30");
});

test("3. Goal crossed by multiple same-date Submissions (createdTime then id)", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recZ", "2026-08-30", 1000, "2026-08-30T20:00:00.000Z"),
      sub("recA", "2026-08-30", 1200, "2026-08-30T19:00:00.000Z"),
    ],
    2000
  );
  assert.ok(crossing);
  // recA is earlier by createdTime; after recA total=1200; recZ pushes to 2200 → recZ crosses
  assert.equal(crossing.submissionId, "recZ");
  assert.equal(crossing.beforeTotal, 1200);
  assert.equal(crossing.afterTotal, 2200);
  assert.equal(crossing.dateKey, "2026-08-30");
});

test("4. Backdated Submission changes true crossing date before install", () => {
  const withoutBackdate = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-28", 1000), sub("recB", "2026-08-31", 1500)],
    2000
  );
  assert.equal(withoutBackdate.submissionId, "recB");
  assert.equal(withoutBackdate.dateKey, "2026-08-31");

  const withBackdate = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-28", 1000),
      sub("recBack", "2026-08-29", 1500),
      sub("recB", "2026-08-31", 1500),
    ],
    2000
  );
  assert.equal(withBackdate.submissionId, "recBack");
  assert.equal(withBackdate.dateKey, "2026-08-29");
});

test("5. Duplicate/non-counting Submission excluded (caller filters; zero shots skipped)", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-29", 1000),
      sub("recDup", "2026-08-30", 0),
      sub("recB", "2026-08-30", 1500),
    ],
    2000
  );
  assert.equal(crossing.submissionId, "recB");
  assert.equal(crossing.dateKey, "2026-08-30");
});

test("6. Future Submission excluded when not in counted list (Count This Submission? = 0)", () => {
  const countedOnly = [
    sub("recA", "2026-08-29", 1000),
    sub("recB", "2026-08-30", 1500),
  ];
  const crossing = findFirstGoalMetCrossing(countedOnly, 2000);
  assert.equal(crossing.submissionId, "recB");
  assert.equal(crossing.dateKey, "2026-08-30");
});

test("7. Missing target → safe skip", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing: null,
    targetStatus: "missing",
  });
  assert.equal(decision.action, "skipped_no_target");
  assert.equal(resolveTargetGoalShots(null).status, "missing");
  assert.equal(resolveTargetGoalShots(0).status, "missing");
});

test("8. Formula says met but no crossing date can be proven → fail closed", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing: null,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "error_unprovable");
});

test("8b. Formula says met but counted submissions below target → error_ambiguous", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing: null,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 500,
  });
  assert.equal(decision.action, "error_ambiguous");
});

test("8c. Ambiguous target lookup values → error_ambiguous", () => {
  assert.equal(resolveTargetGoalShots([2000, 3000]).status, "ambiguous");
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing: null,
    targetStatus: "ambiguous",
  });
  assert.equal(decision.action, "error_ambiguous");
});

test("9. Goal Met Date already populated → unchanged", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: "2026-08-15",
    goalMetNow: true,
    crossing: {
      dateKey: "2026-08-30",
      submissionId: "recB",
      beforeTotal: 1000,
      afterTotal: 2500,
      submissionShots: 1500,
    },
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "skipped_already_set");
  assert.equal(decision.dateKey, "2026-08-15");
});

test("10. Retry → unchanged (same as already set)", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: "2026-08-30",
    goalMetNow: true,
    crossing: findFirstGoalMetCrossing([sub("recA", "2026-08-30", 2500)], 2000),
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "skipped_already_set");
  assert.equal(decision.dateKey, "2026-08-30");
});

test("migration: preserve existing only when equal to crossing", () => {
  const crossing = findFirstGoalMetCrossing([sub("recA", "2026-08-30", 2500)], 2000);
  const keep = decideGoalMetDateMigrationWrite({
    existingDate: "2026-08-30",
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
  });
  assert.equal(keep.action, "skipped_already_set");
});

test("migration: replace mismatched legacy award date with provable crossing", () => {
  const crossing = findFirstGoalMetCrossing([sub("recA", "2026-08-30", 2500)], 2000);
  const replaced = decideGoalMetDateMigrationWrite({
    existingDate: "2026-09-03",
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    legacyLookupDate: "2026-09-03",
  });
  assert.equal(replaced.action, "replaced_mismatch");
  assert.equal(replaced.dateKey, "2026-08-30");
});

test("migration: clear unprovable legacy date — never invent", () => {
  const cleared = decideGoalMetDateMigrationWrite({
    existingDate: "2026-09-03",
    goalMetNow: true,
    crossing: null,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(cleared.action, "clear_unprovable_legacy");
});

test("stable sort: same Activity Date uses createdTime then id", () => {
  const ordered = sortCountedSubmissions([
    sub("recZ", "2026-08-30", 1000, "2026-08-30T20:00:00.000Z"),
    sub("recA", "2026-08-30", 1000, "2026-08-30T19:00:00.000Z"),
  ]);
  assert.equal(ordered[0].id, "recA");
  assert.equal(ordered[1].id, "recZ");
});

test("records FIRST provable Activity Date when cumulative crosses target", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-29", 1000),
      sub("recB", "2026-08-30", 1500),
      sub("recC", "2026-08-31", 2000),
    ],
    2000
  );
  assert.ok(crossing);
  assert.equal(crossing.submissionId, "recB");
  assert.equal(crossing.beforeTotal, 1000);
  assert.equal(crossing.afterTotal, 2500);
  assert.equal(crossing.dateKey, "2026-08-30");
});

/* =========================================================
   LIVE REGRESSION — Athlete1 Schmidt (Production 066 v4.0 failure)
========================================================= */

test("REGRESSION: UTC midnight 2026-08-30 must NOT become 2026-08-29 via Denver TZ", () => {
  const utcMidnight = new Date("2026-08-30T00:00:00.000Z");
  // Document the trap that Production hit:
  assert.equal(
    toDenverDateKey(utcMidnight),
    "2026-08-29",
    "Denver conversion of UTC midnight is the bug path"
  );
  // Correct paths preserve the literal calendar day:
  assert.equal(toDateKeyFromText("2026-08-30"), "2026-08-30");
  assert.equal(toDateKeyFromText("8/30/2026"), "2026-08-30");
  assert.equal(preserveActivityDateKey(utcMidnight, "8/30/2026"), "2026-08-30");
  assert.equal(preserveActivityDateKey(utcMidnight, "2026-08-30"), "2026-08-30");
  // Text missing: UTC components of date-only Date (not Denver):
  assert.equal(preserveActivityDateKey(utcMidnight, ""), "2026-08-30");
});

test("REGRESSION: Athlete1 1000+1500 vs target 2000 stamps 2026-08-30 (no previous-day shift)", () => {
  // Live evidence: Activity Date 2026-08-30 as Airtable date-only UTC midnight.
  const submissions = [
    {
      id: "rec1000",
      activityDateKey: preserveActivityDateKey(
        new Date("2026-08-30T00:00:00.000Z"),
        "8/30/2026"
      ),
      activityDate: new Date("2026-08-30T00:00:00.000Z"),
      totalShotsCounted: 1000,
      createdTime: "2026-08-30T15:00:00.000Z",
    },
    {
      id: "rec1500",
      activityDateKey: preserveActivityDateKey(
        new Date("2026-08-30T00:00:00.000Z"),
        "8/30/2026"
      ),
      activityDate: new Date("2026-08-30T00:00:00.000Z"),
      totalShotsCounted: 1500,
      createdTime: "2026-08-30T16:00:00.000Z",
    },
  ];

  assert.equal(submissions[0].activityDateKey, "2026-08-30");
  assert.equal(submissions[1].activityDateKey, "2026-08-30");

  const crossing = findFirstGoalMetCrossing(submissions, 2000);
  assert.ok(crossing);
  assert.equal(crossing.dateKey, "2026-08-30");
  assert.equal(crossing.submissionId, "rec1500");
  assert.equal(crossing.beforeTotal, 1000);
  assert.equal(crossing.afterTotal, 2500);
  assert.notEqual(crossing.dateKey, "2026-08-29");
  assert.notEqual(crossing.dateKey, "2026-08-28");

  const stamp = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(stamp.action, "stamped");
  assert.equal(stamp.dateKey, "2026-08-30");

  // Simulate writing YYYY-MM-DD into a dateTime field (second shift in Production):
  // "2026-08-29" → 2026-08-29T00:00:00.000Z → Denver display 8/28 6:00 PM.
  // Correct stamp key must remain 2026-08-30 so date-only field displays 8/30/2026.
  const wrongKeyWouldDisplayAs = toDenverDateKey(new Date("2026-08-29T00:00:00.000Z"));
  assert.equal(wrongKeyWouldDisplayAs, "2026-08-28");
  assert.notEqual(stamp.dateKey, wrongKeyWouldDisplayAs);

  // Retry must not overwrite.
  const retry = decideGoalMetDateWrite({
    existingDate: "2026-08-30",
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(retry.action, "skipped_already_set");
  assert.equal(retry.dateKey, "2026-08-30");
});

test("REGRESSION: YYYY-MM-DD string is never timezone-converted", () => {
  assert.equal(toDateKeyFromText("2026-08-30"), "2026-08-30");
  assert.equal(toDenverDateKey("2026-08-30"), "2026-08-30");
  assert.equal(preserveActivityDateKey("2026-08-30", null), "2026-08-30");
});
