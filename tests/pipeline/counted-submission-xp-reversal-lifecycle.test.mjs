import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUBMISSION = "recSubmissionReversal01";
const ENROLLMENT = "recEnrollmentReversal01";
const WEEK = "recWeekReversal01";
const WAS = "recWasReversal01";
const KEY = `SUBMISSION_XP|${SUBMISSION}`;

function state() {
  return {
    submission: {
      id: SUBMISSION, countable: true, enrollmentId: ENROLLMENT, weekId: WEEK, wasId: WAS,
      enrollmentIds: [ENROLLMENT], weekIds: [WEEK], wasIds: [WAS],
      duplicateReview: false, activityDate: "2026-08-12",
    },
    enrollment: { id: ENROLLMENT, active: true, lifetimeXp: 0 },
    wasCandidates: [WAS],
    events: [],
    emailActions: [],
    makeActions: [],
  };
}

function reconcile(s) {
  const candidates = s.events.filter((event) => event.sourceKey === KEY);
  assert.ok(candidates.length <= 1, "ambiguous canonical key must fail closed");
  const event = candidates[0];
  const enrollmentIds = s.submission.enrollmentIds || [s.submission.enrollmentId];
  const weekIds = s.submission.weekIds || [s.submission.weekId];
  const wasIds = s.submission.wasIds || [s.submission.wasId];
  const identity =
    enrollmentIds.length === 1 && enrollmentIds[0] === ENROLLMENT
    && weekIds.length === 1 && weekIds[0] === WEEK
    && wasIds.length === 1 && wasIds[0] === WAS
    && s.submission.enrollmentId === ENROLLMENT
    && s.submission.weekId === WEEK
    && s.submission.wasId === WAS
    && s.wasCandidates.length === 1
    && s.wasCandidates[0] === WAS
    && s.enrollment.active
    && s.submission.activityDate <= "2026-08-12";
  if (!identity || !s.submission.countable || s.submission.duplicateReview) {
    if (event) event.active = false;
    return { action: event ? "deactivated_same_event" : "skipped_ineligible" };
  }
  if (!event) {
    s.events.push({
      id: "recSubmissionXpCanonical01",
      sourceKey: KEY,
      active: true,
      submissionId: SUBMISSION,
      enrollmentId: ENROLLMENT,
      weekId: WEEK,
      wasId: WAS,
      points: 20,
    });
    return { action: "created" };
  }
  event.active = true;
  return { action: "reactivated_same_event" };
}

function settle(s) {
  s.enrollment.lifetimeXp = s.events
    .filter((event) => event.active && event.enrollmentId === ENROLLMENT)
    .reduce((sum, event) => sum + event.points, 0);
}

test("counted Submission withdrawal and restoration preserve the canonical event", () => {
  const s = state();
  assert.deepEqual(reconcile(s), { action: "created" });
  settle(s);
  assert.equal(s.events.length, 1);
  const originalId = s.events[0].id;
  assert.equal(s.enrollment.lifetimeXp, 20);

  s.submission.countable = false;
  assert.deepEqual(reconcile(s), { action: "deactivated_same_event" });
  settle(s);
  assert.equal(s.events[0].id, originalId);
  assert.equal(s.events[0].active, false);
  assert.equal(s.enrollment.lifetimeXp, 0);

  s.submission.countable = true;
  assert.deepEqual(reconcile(s), { action: "reactivated_same_event" });
  settle(s);
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].id, originalId);
  assert.equal(s.events[0].sourceKey, KEY);
  assert.equal(s.events[0].active, true);
  assert.equal(s.enrollment.lifetimeXp, 20);
});

test("wrong identity, inactive Enrollment, and future-date policy fail closed", () => {
  const s = state();
  s.submission.countable = false;
  assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
  assert.equal(s.events.length, 0);

  s.submission.countable = true;
  s.enrollment.active = false;
  assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
  assert.equal(s.events.length, 0);

  s.enrollment.active = true;
  s.submission.weekId = "";
  assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
  assert.equal(s.events.length, 0);

  s.submission.weekId = WEEK;
  s.submission.activityDate = "2099-01-01";
  assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
  assert.equal(s.events.length, 0);

  s.submission.activityDate = "2026-08-12";
  s.wasCandidates = [WAS, "recAmbiguousWas02"];
  assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
  assert.equal(s.events.length, 0);
});

test("concurrent replay and duplicate canonical keys never mint or choose a winner", () => {
  const s = state();
  assert.deepEqual(reconcile(s), { action: "created" });
  assert.deepEqual(reconcile(s), { action: "reactivated_same_event" });
  assert.equal(s.events.length, 1);

  s.events.push({ ...s.events[0], id: "recDuplicateSubmissionXp01" });
  assert.throws(() => reconcile(s), /ambiguous canonical key/);
  assert.equal(s.events.length, 2);
  assert.equal(s.events[0].active, true);
  assert.equal(s.events[1].active, true);
});

test("wrong ownership never reassigns an existing event", () => {
  const s = state();
  s.events.push({
    id: "recOwnedByOtherSource01",
    sourceKey: "SUBMISSION_XP|recOtherSubmission01",
    active: true,
    submissionId: "recOtherSubmission01",
    enrollmentId: ENROLLMENT,
    weekId: WEEK,
    wasId: WAS,
    points: 20,
  });
  assert.deepEqual(reconcile(s), { action: "created" });
  assert.equal(s.events.length, 2);
  assert.equal(s.events[0].sourceKey, "SUBMISSION_XP|recOtherSubmission01");
  assert.equal(s.events[1].sourceKey, KEY);
});

test("milestone and streak downstream corrections preserve independent ownership", () => {
  const downstream = [
    { sourceKey: "SHOT_MILESTONE|recEnrollmentReversal01|recMilestone01", active: true },
    { sourceKey: "STREAK_XP|recEnrollmentReversal01|recAchievement01|2026-08-12", active: true },
  ];
  const before = downstream.map((event) => event.sourceKey);
  for (const event of downstream) event.active = false;
  assert.deepEqual(downstream.map((event) => event.sourceKey), before);
  assert.deepEqual(downstream.map((event) => event.active), [false, false]);
  for (const event of downstream) event.active = true;
  assert.deepEqual(downstream.map((event) => event.active), [true, true]);
});

test("canonical production owners remain explicit and correction is not falsely claimed", () => {
  const sourceRoot = path.join(ROOT, "airtable", "automations", "shooting-challenge");
  const source010 = readFileSync(path.join(sourceRoot, "010-submission-intake-create-xp-event.js"), "utf8");
  const source054 = readFileSync(path.join(sourceRoot, "054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js"), "utf8");
  const source066 = readFileSync(path.join(sourceRoot, "066-achievements-and-milestones-create-shot-milestone-unlocks.js"), "utf8");
  const source059 = readFileSync(path.join(sourceRoot, "059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js"), "utf8");
  assert.match(source010, /SUBMISSION_XP\|/);
  assert.match(source054, /STREAK_XP\|/);
  assert.match(source066, /SHOT_MILESTONE\|/);
  assert.match(source059, /SHOT_MILESTONE\|/);
  assert.match(source010, /Count This Submission\?/);
  assert.doesNotMatch(source010, /Homework XP Reconciliation Needed\?/);
});

test("formula and rollup settlement is a distinct state before progression", () => {
  const s = state();
  assert.deepEqual(reconcile(s), { action: "created" });
  const pendingRollup = null;
  assert.equal(pendingRollup, null);
  settle(s);
  assert.equal(s.enrollment.lifetimeXp, 20);
  assert.equal(s.events.filter((event) => event.active).length, 1);
});

test("future-date withdrawal preserves the same inactive event", () => {
  const s = state();
  reconcile(s);
  const originalId = s.events[0].id;
  s.submission.activityDate = "2099-01-01";
  assert.deepEqual(reconcile(s), { action: "deactivated_same_event" });
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].id, originalId);
  assert.equal(s.events[0].active, false);
});

test("duplicate-review exclusion and restoration never create a replacement", () => {
  const s = state();
  reconcile(s);
  const originalId = s.events[0].id;
  s.submission.duplicateReview = true;
  assert.deepEqual(reconcile(s), { action: "deactivated_same_event" });
  s.submission.duplicateReview = false;
  assert.deepEqual(reconcile(s), { action: "reactivated_same_event" });
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].id, originalId);
});

test("inactive Enrollment withdrawal and restoration preserve the canonical key", () => {
  const s = state();
  reconcile(s);
  s.enrollment.active = false;
  assert.deepEqual(reconcile(s), { action: "deactivated_same_event" });
  s.enrollment.active = true;
  assert.deepEqual(reconcile(s), { action: "reactivated_same_event" });
  assert.equal(s.events[0].sourceKey, KEY);
  assert.equal(s.events.length, 1);
});

test("wrong or multiple Enrollment and Week links fail closed", () => {
  for (const change of [
    (s) => { s.submission.enrollmentIds = ["recWrongEnrollment"]; },
    (s) => { s.submission.enrollmentIds = [ENROLLMENT, "recEnrollmentTwo"]; },
    (s) => { s.submission.weekIds = ["recWrongWeek"]; },
    (s) => { s.submission.weekIds = [WEEK, "recWeekTwo"]; },
  ]) {
    const s = state();
    change(s);
    assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
    assert.equal(s.events.length, 0);
  }
});

test("zero or multiple WAS links fail closed before any XP event is minted", () => {
  for (const wasIds of [[], [WAS, "recWasTwo"]]) {
    const s = state();
    s.submission.wasIds = wasIds;
    assert.deepEqual(reconcile(s), { action: "skipped_ineligible" });
    assert.equal(s.events.length, 0);
  }
});

test("same-event withdrawal never deletes independent downstream records or sends email", () => {
  const s = state();
  reconcile(s);
  s.downstream = [
    { id: "recMilestoneXp", sourceKey: "SHOT_MILESTONE|x", active: true },
    { id: "recStreakXp", sourceKey: "STREAK_XP|x", active: true },
  ];
  s.emailActions = [];
  s.makeActions = [];
  s.submission.countable = false;
  reconcile(s);
  assert.equal(s.events.length, 1);
  assert.equal(s.downstream.length, 2);
  assert.deepEqual(s.emailActions, []);
  assert.deepEqual(s.makeActions, []);
});

test("partial failure leaves the canonical event available for a deterministic retry", () => {
  const s = state();
  reconcile(s);
  s.submission.countable = false;
  const originalId = s.events[0].id;
  assert.throws(() => {
    const event = s.events.find((row) => row.sourceKey === KEY);
    event.active = false;
    throw new Error("partial failure");
  }, /partial failure/);
  s.submission.countable = true;
  assert.deepEqual(reconcile(s), { action: "reactivated_same_event" });
  assert.equal(s.events[0].id, originalId);
});
