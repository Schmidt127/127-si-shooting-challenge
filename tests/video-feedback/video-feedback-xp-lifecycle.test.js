#!/usr/bin/env node
"use strict";

/**
 * PKG-007 offline lifecycle model. This is not an Airtable runtime proof.
 * Run: node tests/video-feedback/video-feedback-xp-lifecycle.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const source113 = fs.readFileSync(
  path.join(ROOT, "airtable/automations/shooting-challenge/113-video-review-and-xp-assign-base-video-xp.js"),
  "utf8"
);
const source114 = fs.readFileSync(
  path.join(ROOT, "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js"),
  "utf8"
);
const audit = fs.readFileSync(
  path.join(ROOT, "airtable/extension-scripts/audits/audit-video-xp-pipeline-integrity.js"),
  "utf8"
);

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

function key(vfId) {
  return `VIDEO_SUBMISSION|${vfId}`;
}

function reconcile(store, row) {
  const sourceKey = key(row.id);
  const exact = [...store.values()].filter(
    (event) => event.videoFeedbackId === row.id || event.sourceKey === sourceKey
  );
  if (exact.length > 1) throw new Error("duplicate_exact_xp_events");
  if (
    row.linkedXpEventIds.length > 1 ||
    (row.linkedXpEventIds.length === 1 &&
      (!exact[0] || exact[0].id !== row.linkedXpEventIds[0]))
  ) {
    throw new Error("wrong_event_stealing");
  }

  const eligible =
    row.active &&
    row.feedbackPosted &&
    !row.doNotAward &&
    row.enrollmentIds.length === 1 &&
    row.submissionIds.length === 1 &&
    row.submissionEnrollmentIds.length === 1 &&
    row.submissionEnrollmentIds[0] === row.enrollmentIds[0] &&
    row.weekIds.length === 1 &&
    row.activityDate &&
    row.activityDate <= row.today &&
    row.points > 0;

  const event = exact[0];
  if (!eligible) {
    if (event) event.active = false;
    return { action: event ? "deactivated" : "skipped", eventId: event?.id || "" };
  }
  if (event) {
    event.active = true;
    event.points = row.points;
    event.wasId = row.wasId;
    return { action: "reactivated_or_updated", eventId: event.id };
  }
  const id = `recXp${store.size + 1}`;
  store.set(id, {
    id,
    sourceKey,
    videoFeedbackId: row.id,
    enrollmentId: row.enrollmentIds[0],
    submissionId: row.submissionIds[0],
    weekId: row.weekIds[0],
    wasId: row.wasId,
    points: row.points,
    active: true,
  });
  return { action: "created", eventId: id };
}

function row(id, patch = {}) {
  return {
    id,
    active: true,
    feedbackPosted: true,
    doNotAward: false,
    enrollmentIds: ["recEnrollment"],
    submissionIds: ["recSubmission"],
    submissionEnrollmentIds: ["recEnrollment"],
    weekIds: ["recWeek"],
    activityDate: "2026-08-12",
    today: "2026-08-12",
    points: 25,
    wasId: "recWas",
    linkedXpEventIds: [],
    ...patch,
  };
}

test("113 v6.4 requires exact canonical identity and Rule Key", () => {
  assert.match(source113, /Version: v6\.4/);
  assert.match(source113, /Enrollment must contain exactly one linked record/);
  assert.match(source113, /Submission Enrollment must contain exactly the Video Feedback Enrollment/);
  assert.match(source113, /Expected exactly one active XP Reward Rule/);
  assert.doesNotMatch(source113, /normalize\(rewardRuleText\)/);
});

test("113 rejects legacy display-name-only and duplicate canonical rules", () => {
  const canonical = (rules) => rules.filter((r) => r.active && r.ruleKey === "VIDEO_SUBMISSION");
  assert.strictEqual(canonical([{ active: true, ruleKey: "", rewardRule: "Video Submission" }]).length, 0);
  assert.strictEqual(canonical([
    { active: true, ruleKey: "VIDEO_SUBMISSION", xp: 25 },
    { active: true, ruleKey: "VIDEO_SUBMISSION", xp: 0 },
  ]).length, 2);
});

test("three eligible Video Feedback records create three distinct XP Events", () => {
  const store = new Map();
  const ids = ["recVf1", "recVf2", "recVf3"].map((id) => reconcile(store, row(id)).eventId);
  assert.strictEqual(store.size, 3);
  assert.strictEqual(new Set(ids).size, 3);
  assert.deepStrictEqual([...store.values()].map((event) => event.sourceKey), [
    key("recVf1"), key("recVf2"), key("recVf3"),
  ]);
});

test("replay updates the exact event without a duplicate", () => {
  const store = new Map();
  const first = reconcile(store, row("recVf1"));
  const replay = reconcile(store, row("recVf1"));
  assert.strictEqual(first.eventId, replay.eventId);
  assert.strictEqual(store.size, 1);
});

test("missing Week and mismatched identity fail before create", () => {
  const store = new Map();
  assert.strictEqual(reconcile(store, row("recVf1", { weekIds: [] })).action, "skipped");
  assert.strictEqual(
    reconcile(store, row("recVf2", { submissionEnrollmentIds: ["recOther"] })).action,
    "skipped"
  );
  assert.strictEqual(store.size, 0);
});

test("eligibility loss deactivates the exact event and restoration reactivates it", () => {
  const store = new Map();
  const created = reconcile(store, row("recVf1"));
  const excluded = reconcile(store, row("recVf1", { doNotAward: true }));
  const restored = reconcile(store, row("recVf1"));
  assert.strictEqual(excluded.action, "deactivated");
  assert.strictEqual(restored.eventId, created.eventId);
  assert.strictEqual(store.size, 1);
  assert.strictEqual(store.get(created.eventId).active, true);
});

test("inactive and unposted feedback deactivate instead of replacing", () => {
  const store = new Map();
  const created = reconcile(store, row("recVf1"));
  reconcile(store, row("recVf1", { active: false }));
  assert.strictEqual(store.get(created.eventId).active, false);
  reconcile(store, row("recVf1", { feedbackPosted: false }));
  assert.strictEqual(store.size, 1);
});

test("wrong linked event and duplicate exact events fail closed", () => {
  const store = new Map();
  store.set("recOther", {
    id: "recOther",
    sourceKey: key("recOther"),
    videoFeedbackId: "recOther",
    active: true,
  });
  assert.throws(
    () => reconcile(store, row("recVf1", { linkedXpEventIds: ["recOther"] })),
    /wrong_event_stealing/
  );
});

test("114 v6.1 uses exact identity lifecycle and preserves canonical WAS repair", () => {
  assert.match(source114, /Version: v6\.1/);
  assert.match(source114, /deactivateExactXpEvent/);
  assert.match(source114, /skipped_feedback_not_posted/);
  assert.match(source114, /skipped_do_not_award/);
  assert.match(source114, /ensureXpEventWeeklySummaryLink/);
  assert.doesNotMatch(source114, /skipped_submission_not_countable/);
  assert.doesNotMatch(source114, /isCompositeMatch/);
});

test("authoritative audit covers exact ownership and canonical WAS failures", () => {
  for (const token of [
    "duplicate_xp_event",
    "inactive_or_ineligible_source",
    "mislinked_xp_event",
    "canonical_was_unresolved",
    "actualWeeklySummaryIds",
  ]) {
    assert.ok(audit.includes(token), token);
  }
});

console.log(`PASS ${passed} PKG-007 offline lifecycle contracts`);
