"use strict";

const assert = require("node:assert/strict");
const { generateWeekPlan } = require("./week-generator");
const { validateWeekPlan } = require("./week-validator");

function run() {
  const plan = generateWeekPlan({
    challengeYear: "2026-2027",
    weekZeroStart: "2027-04-25",
    regularWeeks: 9,
    challengeEndDate: "2027-06-30",
    includePostChallenge: true,
    postChallengeStartDate: "2027-07-01",
    postChallengeEndDate: "2027-07-07",
    configRecordId: "rechc1f9f4kVM1tHP",
    timezone: "America/Denver",
  });

  assert.equal(plan.ok, true, JSON.stringify(plan.validation?.findings || plan.error, null, 2));
  assert.equal(plan.weeks.length, 11);

  const [earlyBird, week1, ...rest] = plan.weeks;
  const week9 = rest.find((week) => week.displayLabel === "Week 9");
  const post = plan.weeks.at(-1);

  assert.equal(earlyBird.displayLabel, "Early Bird");
  assert.equal(earlyBird.startDate, "2027-04-25");
  assert.equal(earlyBird.endDate, "2027-05-01");

  assert.equal(week1.displayLabel, "Week 1");
  assert.equal(week1.startDate, "2027-05-02");
  assert.equal(week1.endDate, "2027-05-08");

  assert.ok(week9);
  assert.equal(week9.startDate, "2027-06-27");
  assert.equal(week9.endDate, "2027-06-30");
  assert.equal(week9.terminalPartial, true);

  assert.equal(post.displayLabel, "Post-Challenge");
  assert.equal(post.startDate, "2027-07-01");
  assert.equal(post.endDate, "2027-07-07");

  const extraWeek10 = validateWeekPlan(
    [
      ...plan.weeks.slice(0, -1),
      {
        displayLabel: "Week 10",
        weekType: "regular",
        startDate: "2027-07-01",
        endDate: "2027-07-03",
        challengeYear: "2026-2027",
      },
      post,
    ],
    {
      challengeYear: "2026-2027",
      expectedRegularWeeks: 9,
      challengeEndDate: "2027-06-30",
      allowTerminalPartialWeek: true,
      allowFlexiblePostChallenge: true,
    },
  );
  assert.equal(extraWeek10.overall, "FAIL");
  assert.ok(extraWeek10.findings.some((finding) => finding.code === "extra_regular_week"));

  const invalidPost = generateWeekPlan({
    challengeYear: "2026-2027",
    weekZeroStart: "2027-04-25",
    regularWeeks: 9,
    challengeEndDate: "2027-06-30",
    postChallengeStartDate: "2027-07-01",
    postChallengeEndDate: "2027-06-30",
  });
  assert.equal(invalidPost.ok, false);
  assert.equal(invalidPost.error.code, "post_challenge_end_before_start");

  console.log("PASS — May 1 to June 30 calendar policy");
}

if (require.main === module) run();

module.exports = { run };
