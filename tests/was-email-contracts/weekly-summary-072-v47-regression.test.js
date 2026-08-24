#!/usr/bin/env node
"use strict";

/**
 * Regression: 072 v4.7 weekly email payload contracts (shooting vs PW days, goal display, videos).
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  formatGoalCompletionDisplayForEmail,
  goalCompletionRatioFromShotsAndGoal,
  goalCompletionPercentFromShotsAndGoal,
  buildWeeklyVideoSubmissionPayload,
  buildVideoSubmissionLines,
  isSafeHttpUrl,
  countDistinctQualifyingDays,
} = require("../../lib/was-email-contracts/weekly-summary-email-content");

const s072 = fs.readFileSync(
  path.join(
    __dirname,
    "../../airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
  ),
  "utf8"
);

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("072 source fixes days.size bug — uses shootingDayKeys.size", () => {
  assert.match(s072, /const shootingDayKeys = new Set\(/);
  assert.match(s072, /const shootingDaysLogged = shootingDayKeys\.size/);
  assert.doesNotMatch(s072, /const shootingDaysLogged = days\.size/);
});

test("072 v4.8 writes canonical shooting day payload fields", () => {
  assert.match(s072, /Version:\s*v4\.8/);
  assert.match(s072, /canonicalShootingDaysLogged: shootingDaysLogged/);
  assert.match(s072, /goalCompletionDisplay/);
  assert.match(s072, /secureUrl/);
  assert.match(s072, /videoFeedbackMatchesWeek/);
});

test("general shooting days 7 vs Perfect Week qualifying days 4", () => {
  const generalSubs = [
    { activityDateKey: "2026-08-16", countable: true },
    { activityDateKey: "2026-08-17", countable: true },
    { activityDateKey: "2026-08-18", countable: true },
    { activityDateKey: "2026-08-19", countable: true },
    { activityDateKey: "2026-08-20", countable: true },
    { activityDateKey: "2026-08-21", countable: true },
    { activityDateKey: "2026-08-22", countable: true },
  ];
  const pwSubs = generalSubs.filter((row) =>
    ["2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"].includes(row.activityDateKey)
  );
  assert.equal(countDistinctQualifyingDays(generalSubs), 7);
  assert.equal(countDistinctQualifyingDays(pwSubs), 4);
});

test("email HTML must not fall back to Perfect Week days for general shooting line", () => {
  assert.doesNotMatch(
    s072.slice(s072.indexOf("function fullHtml"), s072.indexOf("function shortHtml")),
    /shootingDaysLogged \|\| data\.days/
  );
});

test("Schmidt test week goal display is 150%+ not 3605%", () => {
  const ratio = goalCompletionRatioFromShotsAndGoal(48066, 1333, null);
  assert.ok(ratio > 1.5);
  assert.equal(formatGoalCompletionDisplayForEmail(ratio), "150%+");
  assert.notEqual(formatGoalCompletionDisplayForEmail(ratio), "3605%");
  assert.ok(goalCompletionPercentFromShotsAndGoal(48066, 1333, null) >= 3600);
});

test("normal goal completion tiers remain readable", () => {
  assert.equal(formatGoalCompletionDisplayForEmail(0.837), "84%");
  assert.equal(formatGoalCompletionDisplayForEmail(1.0), "100%");
  assert.equal(formatGoalCompletionDisplayForEmail(1.25), "125%");
  assert.equal(formatGoalCompletionDisplayForEmail(1.49), "125%");
});

test("eight weekly videos with date, name, and secure URL", () => {
  const entries = Array.from({ length: 8 }, (_, index) => ({
    label: `Testing clip ${index + 1}`,
    reviewedAt: `Aug ${19 + (index % 4)}, 2026`,
    secureUrl: `https://example.lambda-url.us-east-2.on.aws/file/recaXBfjeeu3bcm0t?token=safe${index}`,
  }));
  const payload = buildWeeklyVideoSubmissionPayload(entries);
  assert.equal(payload.length, 8);
  assert.equal(payload[0].secureUrl.includes("token="), true);
  assert.equal(payload[0].label, "Testing clip 1");
  const lines = buildVideoSubmissionLines(entries);
  assert.equal(lines.length, 8);
  assert.match(lines[0], /Testing clip 1/);
  assert.match(lines[0], /token=safe0/);
});

test("unsafe or missing video URLs are omitted safely", () => {
  const { isSafeParentVideoUrl } = require("../../lib/was-email-contracts/weekly-summary-email-content");
  assert.equal(isSafeParentVideoUrl("javascript:alert(1)"), false);
  assert.equal(isSafeParentVideoUrl(""), false);
  const payload = buildWeeklyVideoSubmissionPayload([
    { label: "Clip A", reviewedAt: "Aug 19, 2026", secureUrl: "not-a-url" },
    {
      label: "Clip B",
      reviewedAt: "Aug 20, 2026",
      secureUrl: "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recaXBfjeeu3bcm0t?token=abc",
    },
    {
      label: "Clip C",
      reviewedAt: "Aug 21, 2026",
      secureUrl: "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/private.mp4",
    },
  ]);
  assert.equal(payload[0].secureUrl, "");
  assert.match(payload[1].secureUrl, /token=abc/);
  assert.equal(payload[2].secureUrl, "");
  const lines = buildVideoSubmissionLines(payload);
  assert.doesNotMatch(lines[0], /not-a-url/);
  assert.match(lines[1], /token=abc/);
  assert.doesNotMatch(lines[2], /amazonaws\.com/);
});

console.log("weekly-summary-072-v47-regression tests passed");
