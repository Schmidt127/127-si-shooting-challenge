const test = require("node:test");
const assert = require("node:assert/strict");
const {
  activityDateToDateKey,
  calculateStreakEndingAt,
  computeCurrentShootingStreakForEmail,
  subtractOneDayFromDateKey,
} = require("./shooting-streak-from-submissions.js");

test("first qualifying day yields streak 1", () => {
  const streak = computeCurrentShootingStreakForEmail({
    countedActivityDateKeys: ["2026-08-07"],
    todayDateKey: "2026-08-07",
    yesterdayDateKey: "2026-08-06",
  });
  assert.equal(streak, 1);
});

test("second consecutive day yields streak 2", () => {
  const streak = computeCurrentShootingStreakForEmail({
    countedActivityDateKeys: ["2026-08-06", "2026-08-07"],
    todayDateKey: "2026-08-07",
    yesterdayDateKey: "2026-08-06",
  });
  assert.equal(streak, 2);
});

test("11th through 13th consecutive days show 11, 12, 13 respectively", () => {
  const keys = Array.from({ length: 11 }, (_, index) => {
    const day = 1 + index;
    return `2026-08-${String(day).padStart(2, "0")}`;
  });

  assert.equal(
    computeCurrentShootingStreakForEmail({
      countedActivityDateKeys: keys,
      todayDateKey: "2026-08-11",
      yesterdayDateKey: "2026-08-10",
    }),
    11,
  );

  assert.equal(
    computeCurrentShootingStreakForEmail({
      countedActivityDateKeys: [...keys, "2026-08-12"],
      todayDateKey: "2026-08-12",
      yesterdayDateKey: "2026-08-11",
    }),
    12,
  );

  assert.equal(
    computeCurrentShootingStreakForEmail({
      countedActivityDateKeys: [...keys, "2026-08-12", "2026-08-13"],
      todayDateKey: "2026-08-13",
      yesterdayDateKey: "2026-08-12",
    }),
    13,
  );
});

test("missed day resets streak when anchor is older than yesterday", () => {
  const streak = computeCurrentShootingStreakForEmail({
    countedActivityDateKeys: ["2026-08-01", "2026-08-02", "2026-08-05"],
    todayDateKey: "2026-08-07",
    yesterdayDateKey: "2026-08-06",
  });
  assert.equal(streak, 0);
});

test("longest streak history does not overwrite current streak", () => {
  const streak = computeCurrentShootingStreakForEmail({
    countedActivityDateKeys: ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-07"],
    todayDateKey: "2026-08-07",
    yesterdayDateKey: "2026-08-06",
  });
  assert.equal(streak, 1);
});

test("duplicate activity dates count once and replays do not inflate streak", () => {
  const streak = computeCurrentShootingStreakForEmail({
    countedActivityDateKeys: ["2026-08-06", "2026-08-06", "2026-08-07", "2026-08-07"],
    todayDateKey: "2026-08-07",
    yesterdayDateKey: "2026-08-06",
  });
  assert.equal(streak, 2);
});

test("calculateStreakEndingAt walks backward one calendar day at a time", () => {
  const keys = new Set(["2026-08-05", "2026-08-06", "2026-08-07"]);
  assert.equal(calculateStreakEndingAt(keys, "2026-08-07"), 3);
  assert.equal(calculateStreakEndingAt(keys, "2026-08-06"), 2);
  assert.equal(calculateStreakEndingAt(keys, "2026-08-04"), 0);
});

test("activityDateToDateKey parses slash and ISO formats", () => {
  assert.equal(activityDateToDateKey("8/7/2026"), "2026-08-07");
  assert.equal(activityDateToDateKey("2026-08-07"), "2026-08-07");
  assert.equal(subtractOneDayFromDateKey("2026-08-07"), "2026-08-06");
});
