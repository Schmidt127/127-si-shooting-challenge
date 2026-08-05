#!/usr/bin/env node
/**
 * Offline Perfect Week fixture expectation / isolation / timezone tests.
 * No Airtable writes. No network required.
 *
 *   node tools/testing/tests/test_perfect_week_fixtures.mjs
 */
"use strict";

const assert = require("assert");
const {
  buildPerfectWeekSourceKey,
  getDateKeyAmericaDenver,
  buildRequiredWeekDates,
  dailyMinimumFromGoal,
  evaluateDailyRequirement,
  evaluatePerfectWeekCase,
  STATUSES,
} = require("../lib/perfect_week_fixtures.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recEnrollmentPw01";
const WEEK = "recWeekPw0000001";
const WEEK_START = "2026-08-02";
const DATES = buildRequiredWeekDates(WEEK_START, 7);

test("dedupe key is PERFECT_WEEK|enrollment|week", () => {
  assert.strictEqual(
    buildPerfectWeekSourceKey(ENR, WEEK),
    `PERFECT_WEEK|${ENR}|${WEEK}`
  );
});

test("daily minimum ceil(70/7)=10", () => {
  assert.strictEqual(dailyMinimumFromGoal(70, 7), 10);
});

test("Sunday–Saturday window is seven keys", () => {
  assert.deepStrictEqual(DATES, [
    "2026-08-02",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-08-08",
  ]);
});

function countableSub(dateKey, shots = 10) {
  return {
    fields: {
      "Activity Date": dateKey,
      "Total Shots Counted": shots,
      "Perfect Week Countable Submission?": 1,
    },
  };
}

test("CASE-01 style: seven days meet daily requirement", () => {
  const subs = DATES.map((d) => countableSub(d, 10));
  const result = evaluateDailyRequirement({
    weekStartDateKey: WEEK_START,
    submissions: subs,
    weeklyGoal: 70,
  });
  assert.strictEqual(result.dailyMet, true);
  assert.strictEqual(result.missingDays.length, 0);
});

test("CASE-02: all shots one day fails daily", () => {
  const subs = [countableSub("2026-08-02", 70)];
  const result = evaluateDailyRequirement({
    weekStartDateKey: WEEK_START,
    submissions: subs,
    weeklyGoal: 70,
  });
  assert.strictEqual(result.dailyMet, false);
  assert.strictEqual(result.missingDays.length, 6);
});

test("CASE-03: six of seven fails", () => {
  const subs = DATES.slice(0, 6).map((d) => countableSub(d));
  const result = evaluateDailyRequirement({
    weekStartDateKey: WEEK_START,
    submissions: subs,
    weeklyGoal: 70,
  });
  assert.strictEqual(result.dailyMet, false);
  assert.deepStrictEqual(result.missingDays, ["2026-08-08"]);
});

test("CASE-04: adjacent-week dates do not fill missing day", () => {
  const subs = [
    ...DATES.slice(0, 6).map((d) => countableSub(d)),
    countableSub("2026-08-09", 10),
    countableSub("2026-08-01", 10),
  ];
  const result = evaluateDailyRequirement({
    weekStartDateKey: WEEK_START,
    submissions: subs,
    weeklyGoal: 70,
  });
  assert.strictEqual(result.dailyMet, false);
  assert.strictEqual(result.outside, 2);
  assert.deepStrictEqual(result.missingDays, ["2026-08-08"]);
});

test("CASE-14: duplicate same-day shots aggregate; distinct day counts once", () => {
  const subs = [
    countableSub("2026-08-02", 5),
    countableSub("2026-08-02", 5),
    ...DATES.slice(1).map((d) => countableSub(d)),
  ];
  const result = evaluateDailyRequirement({
    weekStartDateKey: WEEK_START,
    submissions: subs,
    weeklyGoal: 70,
  });
  assert.strictEqual(result.dailyMet, true);
  assert.strictEqual(result.passingDays.length, 7);
});

test("cross-enrollment isolation: evaluatePerfectWeekCase flags B leak", () => {
  const was = {
    id: "recWasA",
    fields: {
      Enrollment: [{ id: ENR }],
      Week: [{ id: WEEK }],
      "Perfect Week Automation Status": "Ready",
      "Perfect Week Daily Requirement Met?": false,
      "Perfect Week Video Requirement Met?": 0,
      "Perfect Week Zoom Requirement Met?": 1,
      "Perfect Week Eligible?": 0,
      "Perfect Week Unlock": [],
      Submissions: [{ id: "recSubA1" }, { id: "recSubB1" }],
    },
  };
  const result = evaluatePerfectWeekCase(
    "CASE-05",
    {
      expectAward: false,
      enrollmentId: ENR,
      weekId: WEEK,
      wasId: "recWasA",
      submissionBIds: ["recSubB1"],
    },
    { was, xpEvents: [], wasSubmissionIds: ["recSubA1", "recSubB1"] }
  );
  assert.strictEqual(result.status, STATUSES.FAIL);
  assert.match(result.reason, /Enrollment B/);
});

test("CASE-06 defect path when Eligible awards on mismatch", () => {
  const was = {
    fields: {
      Enrollment: [{ id: ENR }],
      Week: [{ id: WEEK }],
      "Perfect Week Automation Status": "Ready",
      "Perfect Week Daily Requirement Met?": true,
      "Perfect Week Video Requirement Met?": 1,
      "Perfect Week Zoom Requirement Met?": 1,
      "Perfect Week Eligible?": 1,
      "Perfect Week Unlock": [{ id: "recUnlock1" }],
    },
  };
  const result = evaluatePerfectWeekCase(
    "CASE-06",
    {
      expectAward: false,
      defectIfAwards: true,
      enrollmentId: ENR,
      weekId: WEEK,
      wasId: "recWas",
    },
    {
      was,
      xpEvents: [
        {
          fields: {
            "Source Key": buildPerfectWeekSourceKey(ENR, WEEK),
            "XP Points": 100,
          },
        },
      ],
    }
  );
  assert.strictEqual(result.status, STATUSES.FAIL);
  assert.match(result.reason, /DEFECT/);
});

test("idempotency: duplicate XP fails CASE-15", () => {
  const was = {
    fields: {
      Enrollment: [{ id: ENR }],
      Week: [{ id: WEEK }],
      "Perfect Week Automation Status": "Ready",
      "Perfect Week Daily Requirement Met?": true,
      "Perfect Week Video Requirement Met?": 1,
      "Perfect Week Zoom Requirement Met?": 1,
      "Perfect Week Eligible?": 1,
      "Perfect Week Unlock": [{ id: "recUnlock1" }],
    },
  };
  const key = buildPerfectWeekSourceKey(ENR, WEEK);
  const result = evaluatePerfectWeekCase(
    "CASE-15",
    { expectAward: true, enrollmentId: ENR, weekId: WEEK, wasId: "recWas" },
    {
      was,
      xpEvents: [
        { fields: { "Source Key": key, "XP Points": 100 } },
        { fields: { "Source Key": key, "XP Points": 100 } },
      ],
    }
  );
  assert.strictEqual(result.status, STATUSES.FAIL);
  assert.match(result.reason, /Idempotency|XP count/);
});

test("timezone: Saturday 23:55 Denver stays 2026-08-08 (Date object path)", () => {
  // 2026-08-08 23:55 MDT = 2026-08-09 05:55 UTC — mirrors Airtable Date cell values
  const key = getDateKeyAmericaDenver(new Date("2026-08-09T05:55:00.000Z"));
  assert.strictEqual(key, "2026-08-08");
});

test("timezone: Sunday 00:05 Denver stays 2026-08-09 (Date object path)", () => {
  // 2026-08-09 00:05 MDT = 2026-08-09 06:05 UTC
  const key = getDateKeyAmericaDenver(new Date("2026-08-09T06:05:00.000Z"));
  assert.strictEqual(key, "2026-08-09");
});

test("timezone risk: ISO datetime string is UTC-sliced (same as 057 helper)", () => {
  // Documents current 057 behavior: YYYY-MM-DD… strings take the UTC calendar prefix.
  // Date-only Activity Date values are safe; datetime ISO strings near midnight are not.
  assert.strictEqual(
    getDateKeyAmericaDenver("2026-08-09T05:55:00.000Z"),
    "2026-08-09"
  );
});

test("CASE-16 evaluator PASS when keys correct", () => {
  const result = evaluatePerfectWeekCase(
    "CASE-16",
    {
      endingWeekId: "recWeekEnd",
      newWeekId: "recWeekNew",
    },
    {
      saturdayLateSubmission: {
        fields: {
          "Activity Date": "2026-08-08",
          Week: [{ id: "recWeekEnd" }],
        },
      },
      sundayEarlySubmission: {
        fields: {
          "Activity Date": "2026-08-09",
          Week: [{ id: "recWeekNew" }],
        },
      },
    }
  );
  assert.strictEqual(result.status, STATUSES.PASS);
});

test("missing WAS is BLOCKED not FAIL", () => {
  const result = evaluatePerfectWeekCase("CASE-01", { expectAward: true }, {});
  assert.strictEqual(result.status, STATUSES.BLOCKED);
});

console.log("\nAll Perfect Week fixture offline tests passed.");
