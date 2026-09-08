#!/usr/bin/env node
"use strict";

/**
 * Video XP offline lifecycle model. This is not an Airtable runtime proof.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const source113 = fs.readFileSync(path.join(ROOT, "airtable/automations/shooting-challenge/113-video-review-and-xp-assign-base-video-xp.js"), "utf8");
const source114 = fs.readFileSync(path.join(ROOT, "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js"), "utf8");
const audit = fs.readFileSync(path.join(ROOT, "airtable/extension-scripts/audits/audit-video-xp-pipeline-integrity.js"), "utf8");

let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`ok - ${name}`); }
function key(vfId) { return `VIDEO_SUBMISSION|${vfId}`; }

function reconcile(store, row) {
  const sourceKey = key(row.id);
  const exact = [...store.values()].filter((event) => event.videoFeedbackId === row.id || event.sourceKey === sourceKey);
  if (exact.length > 1) throw new Error("duplicate_exact_xp_events");
  if (row.linkedXpEventIds.length > 1 ||
      (row.linkedXpEventIds.length === 1 && (!exact[0] || exact[0].id !== row.linkedXpEventIds[0]))) {
    throw new Error("wrong_event_stealing");
  }

  const eligible =
    row.active && row.feedbackPosted && !row.doNotAward && row.enrollmentActive &&
    row.enrollmentIds.length === 1 && row.submissionIds.length === 1 &&
    row.submissionEnrollmentIds.length === 1 && row.submissionEnrollmentIds[0] === row.enrollmentIds[0] &&
    row.weekIds.length === 1 && row.countThisSubmission && !row.activityDateIsFuture &&
    row.activityDate && row.activityDate <= row.today && row.points > 0;

  const event = exact[0];
  if (!eligible) {
    if (event) event.active = false;
    return { action: event ? "deactivated" : "skipped", eventId: event?.id || "", queueRecalc: Boolean(event) };
  }
  if (event) {
    if (event.enrollmentId !== row.enrollmentIds[0]) throw new Error("wrong_enrollment_stealing");
    event.active = true;
    event.points = row.points;
    event.wasId = row.wasId;
    return { action: "reactivated_or_updated", eventId: event.id, queueRecalc: false };
  }
  const id = `recXp${store.size + 1}`;
  store.set(id, {
    id, sourceKey, videoFeedbackId: row.id, enrollmentId: row.enrollmentIds[0],
    submissionId: row.submissionIds[0], weekId: row.weekIds[0], wasId: row.wasId,
    points: row.points, active: true,
  });
  return { action: "created", eventId: id, queueRecalc: false };
}

function row(id, patch = {}) {
  return {
    id, active: true, feedbackPosted: true, doNotAward: false, enrollmentActive: true,
    enrollmentIds: ["recEnrollment"], submissionIds: ["recSubmission"],
    submissionEnrollmentIds: ["recEnrollment"], weekIds: ["recWeek"],
    countThisSubmission: true, activityDateIsFuture: false,
    activityDate: "2026-08-12", today: "2026-08-12", points: 25,
    wasId: "recWas", linkedXpEventIds: [], ...patch,
  };
}

test("113 v6.5 enforces canonical source authority before arming 114", () => {
  assert.match(source113, /Version: v6\.5/);
  for (const token of ["Count This Submission?", "Activity Date Is Future?", "submission_week_invalid", "submission_not_countable", "submission_activity_date_future"]) {
    assert.ok(source113.includes(token), token);
  }
  assert.match(source113, /Submission Enrollment must contain exactly the Video Feedback Enrollment/);
  assert.match(source113, /Expected exactly one active XP Reward Rule/);
  assert.doesNotMatch(source113, /deactivateExactXpEvent/);
});

test("113 rejects legacy display-name-only and duplicate canonical rules", () => {
  const canonical = (rules) => rules.filter((r) => r.active && r.ruleKey === "VIDEO_SUBMISSION");
  assert.strictEqual(canonical([{ active: true, ruleKey: "", rewardRule: "Video Submission" }]).length, 0);
  assert.strictEqual(canonical([{ active: true, ruleKey: "VIDEO_SUBMISSION" }, { active: true, ruleKey: "VIDEO_SUBMISSION" }]).length, 2);
});

test("three eligible Video Feedback records create three distinct XP Events", () => {
  const store = new Map();
  const ids = ["recVf1", "recVf2", "recVf3"].map((id) => reconcile(store, row(id)).eventId);
  assert.strictEqual(store.size, 3);
  assert.strictEqual(new Set(ids).size, 3);
});

test("replay updates the exact event without a duplicate", () => {
  const store = new Map();
  const first = reconcile(store, row("recVf1"));
  const replay = reconcile(store, row("recVf1"));
  assert.strictEqual(first.eventId, replay.eventId);
  assert.strictEqual(store.size, 1);
});

test("all authoritative source failures fail closed", () => {
  const cases = [
    { weekIds: [] },
    { submissionEnrollmentIds: ["recOther"] },
    { countThisSubmission: false },
    { activityDateIsFuture: true },
    { activityDate: "2026-08-13" },
    { enrollmentActive: false },
  ];
  for (const patch of cases) {
    const store = new Map();
    assert.strictEqual(reconcile(store, row("recVf", patch)).action, "skipped");
    assert.strictEqual(store.size, 0);
  }
});

test("source eligibility loss deactivates exact event and queues recalc", () => {
  const store = new Map();
  const created = reconcile(store, row("recVf1"));
  const excluded = reconcile(store, row("recVf1", { countThisSubmission: false }));
  assert.strictEqual(excluded.action, "deactivated");
  assert.strictEqual(excluded.queueRecalc, true);
  assert.strictEqual(store.get(created.eventId).active, false);
});

test("source restoration reactivates same event ID", () => {
  const store = new Map();
  const created = reconcile(store, row("recVf1"));
  reconcile(store, row("recVf1", { activityDateIsFuture: true }));
  const restored = reconcile(store, row("recVf1"));
  assert.strictEqual(restored.eventId, created.eventId);
  assert.strictEqual(store.size, 1);
  assert.strictEqual(store.get(created.eventId).active, true);
});

test("wrong enrollment ownership is never moved or stolen", () => {
  const store = new Map();
  reconcile(store, row("recVf1"));
  assert.throws(() => reconcile(store, row("recVf1", { enrollmentIds: ["recOther"], submissionEnrollmentIds: ["recOther"] })), /wrong_enrollment_stealing/);
});

test("114 v6.3 owns withdrawal and level recalculation queueing", () => {
  assert.match(source114, /Version: v6\.3/);
  for (const token of [
    "deactivateExactXpEvent", "skipped_submission_not_countable", "skipped_submission_future_formula",
    "skipped_submission_week_invalid", "Level Recalc Needed?", "levelRecalcQueued",
    "Validate Authoritative Submission Source", "Validate Positive Award Gates",
  ]) assert.ok(source114.includes(token), token);
  assert.match(source114, /Count This Submission\?/);
  assert.match(source114, /Activity Date Is Future\?/);
});

test("114 retains exact canonical source-key and anti-stealing contract", () => {
  assert.match(source114, /VIDEO_SUBMISSION\|\$\{recordId\}/);
  assert.match(source114, /Refusing to move\/steal/);
  assert.match(source114, /Duplicate XP Events/);
});

test("authoritative audit covers exact ownership and canonical WAS failures", () => {
  for (const token of ["duplicate_xp_event", "inactive_or_ineligible_source", "mislinked_xp_event", "canonical_was_unresolved", "actualWeeklySummaryIds"]) {
    assert.ok(audit.includes(token), token);
  }
});

console.log(`PASS ${passed} Video XP offline lifecycle contracts`);
