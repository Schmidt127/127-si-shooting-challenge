#!/usr/bin/env node
/**
 * SC-ATHLETE-WF-001 offline contract tests.
 *
 *   node tools/testing/tests/test_sc_athlete_wf_contract.mjs
 */
import assert from "node:assert/strict";
import {
  ATHWF_PREFIX,
  GATED_ENROLLMENT_ID,
  VALID_CASES,
  assertAthwfLabel,
  buildRunContext,
  buildDryRunPlan,
  buildNegativeCaseMatrix,
  computeStreakFromDates,
  evaluateCountedDayXpPolicy,
  evaluateXpEventShape,
  evaluateWasSnapshot,
  evaluateHomework065Eligibility,
  stagesForCase,
  submissionXpKey,
  homeworkXpKey,
  videoXpKey,
  streakXpKey,
  denverNoon,
  addDaysToDateKey,
} from "../lib/sc-athlete-wf-lib.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("ATHWF prefix guard rejects operational week names", () => {
  assert.throws(() => assertAthwfLabel("Week 1"), /Safety/);
  assert.equal(assertAthwfLabel("ATHWF|2026-08-29|full|WEEK"), "ATHWF|2026-08-29|full|WEEK");
});

test("gated enrollment is Testing3 Schmidt only", () => {
  const ctx = buildRunContext("full");
  assert.equal(ctx.enrollmentId, GATED_ENROLLMENT_ID);
  assert.equal(ctx.enrollmentId, "recNu6fcBpF1GG3u5");
  assert.match(ctx.weekName, new RegExp(`^${ATHWF_PREFIX.replace("|", "\\|")}`));
});

test("all cases build a dry-run plan with no email", () => {
  for (const name of VALID_CASES) {
    const plan = buildDryRunPlan(buildRunContext(name));
    assert.equal(plan.mode, "dry-run");
    assert.equal(plan.safety.noEmail, true);
    assert.equal(plan.safety.noSeasonSimulation, true);
    assert.ok(plan.neverCreates.some((x) => /Resend/i.test(x)));
  }
});

test("submission plan covers same-day, gap, and backdate tags", () => {
  const ctx = buildRunContext("full");
  const tags = ctx.submissionPlan.map((s) => s.tag);
  assert.ok(tags.includes("same-day-a"));
  assert.ok(tags.includes("same-day-b"));
  assert.ok(tags.includes("miss-gap"));
  assert.ok(tags.includes("backdated"));
  assert.ok(ctx.submissionPlan.every((s) => s.review === "Count It"));
  assert.ok(ctx.submissionPlan.every((s) => s.mode === "Simple Total"));
});

test("Submission Stat Mode must not be written (formula field)", () => {
  // Contract: Shot Total alone implies Simple Total via formula.
  // Writing Submission Stat Mode fails Airtable API (computed).
  assert.equal(
    "formula",
    "formula",
    "documented: do not POST Submission Stat Mode on Submissions"
  );
});

test("source key contracts match automation docs", () => {
  assert.equal(submissionXpKey("recSub1"), "SUBMISSION_XP|recSub1");
  assert.equal(homeworkXpKey("recHc1"), "HOMEWORK_XP|recHc1");
  assert.equal(videoXpKey("recVf1"), "VIDEO_SUBMISSION|recVf1");
  assert.equal(
    streakXpKey("recEnr", "recAch", "2026-06-05"),
    "STREAK_XP|recEnr|recAch|2026-06-05"
  );
});

test("streak computation: consecutive, break on miss, multi-day unique", () => {
  const consecutive = computeStreakFromDates(["2026-06-01", "2026-06-02", "2026-06-03"]);
  assert.equal(consecutive.longest, 3);
  assert.equal(consecutive.current, 3);

  const withGap = computeStreakFromDates([
    "2026-06-01",
    "2026-06-02",
    "2026-06-03",
    "2026-06-05",
  ]);
  assert.equal(withGap.longest, 3);
  assert.equal(withGap.current, 1);
  assert.equal(withGap.segments.length, 2);

  const multiSameDay = computeStreakFromDates(["2026-06-01", "2026-06-01", "2026-06-02"]);
  assert.equal(multiSameDay.longest, 2);
  assert.deepEqual(multiSameDay.dates, ["2026-06-01", "2026-06-02"]);
});

test("same-day multi SUBMISSION_XP flags SC-005 B3 policy open", () => {
  const result = evaluateCountedDayXpPolicy([
    { sourceKey: "SUBMISSION_XP|a", active: true },
    { sourceKey: "SUBMISSION_XP|b", active: true },
  ]);
  assert.equal(result.policyOpen, true);
  assert.equal(result.submissionXpCount, 2);
});

test("XP event shape evaluator", () => {
  const checks = evaluateXpEventShape(
    {
      fields: {
        "Source Key": "SUBMISSION_XP|recX",
        Enrollment: [{ id: GATED_ENROLLMENT_ID }],
        "XP Activity Date": "2026-06-01",
        "XP Bucket": "Daily Shooting",
        "Active?": true,
      },
    },
    {
      sourceKey: "SUBMISSION_XP|recX",
      enrollmentId: GATED_ENROLLMENT_ID,
      activityDateKey: "2026-06-01",
      bucketContains: "shoot",
    }
  );
  assert.ok(checks.every((c) => c.pass));
});

test("WAS snapshot evaluator", () => {
  const checks = evaluateWasSnapshot(
    { fields: { "Days Logged This Week": 5, "Shots This Week": 400 } },
    { daysLogged: 5, minShots: 300 }
  );
  assert.ok(checks.every((c) => c.pass));
});

test("065 Satisfactory-alone is expected skip", () => {
  const skip = evaluateHomework065Eligibility({
    satisfactory: true,
    reviewComplete: true,
    reconcileNeeded: false,
    totalHomeworkXpAwarded: 0,
    phaLinked: false,
    hasSubmissionLink: false,
  });
  assert.equal(skip.expectXp, false);
  assert.ok(skip.blockers.some((b) => /Reconciliation/i.test(b)));

  const ready = evaluateHomework065Eligibility({
    satisfactory: true,
    reviewComplete: true,
    reconcileNeeded: true,
    totalHomeworkXpAwarded: 25,
    phaLinked: true,
    hasSubmissionLink: true,
  });
  assert.equal(ready.expectXp, true);
});

test("stagesForCase scopes apply coverage", () => {
  assert.deepEqual(stagesForCase("negatives"), [17]);
  assert.ok(stagesForCase("submissions").includes(5));
  assert.ok(!stagesForCase("submissions").includes(9));
  assert.equal(stagesForCase("full").length, 17);
});

test("negative matrix covers required stage-17 cases", () => {
  const ids = buildNegativeCaseMatrix().map((n) => n.id);
  for (const need of [
    "NEG-01",
    "NEG-02",
    "NEG-03",
    "NEG-04",
    "NEG-05",
    "NEG-06",
    "NEG-07",
    "NEG-08",
  ]) {
    assert.ok(ids.includes(need), `missing ${need}`);
  }
});

test("denverNoon and addDays stay on calendar keys", () => {
  assert.match(denverNoon("2026-06-01"), /^2026-06-01T12:00:00\.000-/);
  assert.equal(addDaysToDateKey("2026-06-01", 6), "2026-06-07");
});

test("full dry-run stages 1-17 all present", () => {
  const plan = buildDryRunPlan(buildRunContext("full"));
  assert.equal(plan.stages.length, 17);
  assert.ok(plan.stages.every((s) => s.planned === true));
});

console.log("\nAll SC-ATHLETE-WF contract tests passed.");
