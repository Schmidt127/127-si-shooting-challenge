"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
  decideGoalMetDateMigrationWrite,
  toDenverDateKey,
  sortCountedSubmissions,
  resolveTargetGoalShots,
} = require("./sc-163-goal-met-date.js");

function sub(id, dateIso, shots, createdTime) {
  return {
    id,
    activityDate: new Date(dateIso),
    totalShotsCounted: shots,
    createdTime: createdTime || dateIso,
  };
}

test("1. Goal not met → blank (no stamp decision)", () => {
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-01T18:00:00.000Z", 500), sub("recB", "2026-08-02T18:00:00.000Z", 500)],
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
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-30T18:00:00.000Z", 2500)],
    2000
  );
  assert.ok(crossing);
  assert.equal(crossing.submissionId, "recA");
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "stamped");
  assert.equal(decision.dateKey, crossing.dateKey);
});

test("3. Goal crossed by multiple same-date Submissions (createdTime then id)", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recZ", "2026-08-30T12:00:00.000Z", 1000, "2026-08-30T20:00:00.000Z"),
      sub("recA", "2026-08-30T12:00:00.000Z", 1200, "2026-08-30T19:00:00.000Z"),
    ],
    2000
  );
  assert.ok(crossing);
  // recA is earlier by createdTime; after recA total=1200; recZ pushes to 2200 → recZ crosses
  assert.equal(crossing.submissionId, "recZ");
  assert.equal(crossing.beforeTotal, 1200);
  assert.equal(crossing.afterTotal, 2200);
});

test("4. Backdated Submission changes true crossing date before install", () => {
  // Without backdate: Aug 31 crosses. With earlier backdated row, Aug 29 becomes truth.
  const withoutBackdate = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-28T18:00:00.000Z", 1000),
      sub("recB", "2026-08-31T18:00:00.000Z", 1500),
    ],
    2000
  );
  assert.equal(withoutBackdate.submissionId, "recB");
  assert.equal(
    withoutBackdate.dateKey,
    toDenverDateKey(new Date("2026-08-31T18:00:00.000Z"))
  );

  const withBackdate = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-28T18:00:00.000Z", 1000),
      sub("recBack", "2026-08-29T18:00:00.000Z", 1500),
      sub("recB", "2026-08-31T18:00:00.000Z", 1500),
    ],
    2000
  );
  assert.equal(withBackdate.submissionId, "recBack");
  assert.equal(
    withBackdate.dateKey,
    toDenverDateKey(new Date("2026-08-29T18:00:00.000Z"))
  );
});

test("5. Duplicate/non-counting Submission excluded (caller filters; zero shots skipped)", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-29T18:00:00.000Z", 1000),
      sub("recDup", "2026-08-30T18:00:00.000Z", 0),
      sub("recB", "2026-08-30T18:00:00.000Z", 1500),
    ],
    2000
  );
  assert.equal(crossing.submissionId, "recB");
});

test("6. Future Submission excluded when not in counted list (Count This Submission? = 0)", () => {
  // Future rows are excluded by Count This Submission? before this helper runs.
  const countedOnly = [
    sub("recA", "2026-08-29T18:00:00.000Z", 1000),
    sub("recB", "2026-08-30T18:00:00.000Z", 1500),
  ];
  const crossing = findFirstGoalMetCrossing(countedOnly, 2000);
  assert.equal(crossing.submissionId, "recB");
  assert.notEqual(
    crossing.dateKey,
    toDenverDateKey(new Date("2099-01-01T18:00:00.000Z"))
  );
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
      date: new Date("2026-08-30T18:00:00.000Z"),
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
    existingDate: new Date("2026-08-30T18:00:00.000Z"),
    goalMetNow: true,
    crossing: findFirstGoalMetCrossing(
      [sub("recA", "2026-08-30T18:00:00.000Z", 2500)],
      2000
    ),
    targetStatus: "ok",
    target: 2000,
    calculatedTotal: 2500,
  });
  assert.equal(decision.action, "skipped_already_set");
});

test("migration: preserve existing only when equal to crossing", () => {
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-30T18:00:00.000Z", 2500)],
    2000
  );
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
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-30T18:00:00.000Z", 2500)],
    2000
  );
  const replaced = decideGoalMetDateMigrationWrite({
    existingDate: "2026-09-03",
    goalMetNow: true,
    crossing,
    targetStatus: "ok",
    target: 2000,
    legacyLookupDate: "2026-09-03",
  });
  assert.equal(replaced.action, "replaced_mismatch");
  assert.equal(replaced.dateKey, crossing.dateKey);
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
    sub("recZ", "2026-08-30T12:00:00.000Z", 1000, "2026-08-30T20:00:00.000Z"),
    sub("recA", "2026-08-30T12:00:00.000Z", 1000, "2026-08-30T19:00:00.000Z"),
  ]);
  assert.equal(ordered[0].id, "recA");
  assert.equal(ordered[1].id, "recZ");
});

test("records FIRST provable Activity Date when cumulative crosses target", () => {
  const crossing = findFirstGoalMetCrossing(
    [
      sub("recA", "2026-08-29T18:00:00.000Z", 1000),
      sub("recB", "2026-08-30T18:00:00.000Z", 1500),
      sub("recC", "2026-08-31T18:00:00.000Z", 2000),
    ],
    2000
  );
  assert.ok(crossing);
  assert.equal(crossing.submissionId, "recB");
  assert.equal(crossing.beforeTotal, 1000);
  assert.equal(crossing.afterTotal, 2500);
});
