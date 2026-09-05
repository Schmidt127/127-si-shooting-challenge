"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findFirstGoalMetCrossing,
  decideGoalMetDateWrite,
  toDenverDateKey,
  sortCountedSubmissions,
} = require("./sc-163-goal-met-date.js");

function sub(id, dateIso, shots, createdTime) {
  return {
    id,
    activityDate: new Date(dateIso),
    totalShotsCounted: shots,
    createdTime: createdTime || dateIso,
  };
}

test("blank until met — no crossing below target", () => {
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-01T18:00:00.000Z", 500), sub("recB", "2026-08-02T18:00:00.000Z", 500)],
    2000
  );
  assert.equal(crossing, null);
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
  assert.equal(crossing.dateKey, toDenverDateKey(new Date("2026-08-30T18:00:00.000Z")));
});

test("stable sort: same Activity Date uses createdTime then id", () => {
  const ordered = sortCountedSubmissions([
    sub("recZ", "2026-08-30T12:00:00.000Z", 1000, "2026-08-30T20:00:00.000Z"),
    sub("recA", "2026-08-30T12:00:00.000Z", 1000, "2026-08-30T19:00:00.000Z"),
  ]);
  assert.equal(ordered[0].id, "recA");
  assert.equal(ordered[1].id, "recZ");
});

test("never overwrite existing Goal Met Date", () => {
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
  });
  assert.equal(decision.action, "skip_already_set");
  assert.equal(decision.dateKey, "2026-08-15");
});

test("write only when met, blank, and crossing is provable", () => {
  const crossing = findFirstGoalMetCrossing(
    [sub("recA", "2026-08-30T18:00:00.000Z", 2500)],
    2000
  );
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing,
  });
  assert.equal(decision.action, "write");
  assert.equal(decision.dateKey, crossing.dateKey);
});

test("skip_unprovable when met but no crossing can be proven from activity", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: true,
    crossing: null,
  });
  assert.equal(decision.action, "skip_unprovable");
});

test("skip_not_met leaves date blank", () => {
  const decision = decideGoalMetDateWrite({
    existingDate: null,
    goalMetNow: false,
    crossing: findFirstGoalMetCrossing([sub("recA", "2026-08-30T18:00:00.000Z", 100)], 2000),
  });
  assert.equal(decision.action, "skip_not_met");
});
