/**
 * PKG-037 offline core-certification orchestration contract.
 *
 * This deliberately models ledger invariants in memory. It proves neither
 * Airtable trigger configuration nor formula/rollup timing in Production.
 */
import assert from "node:assert/strict";
import test from "node:test";

const ENROLLMENT = "recCertificationEnrollment";
const WEEK = "recCertificationWeek";
const WAS = "recCertificationWas";
const SUBMISSION = "recCertificationSubmission";
const HOMEWORK = "recCertificationHomework";
const VIDEO = "recCertificationVideo";
const MEETING = "recCertificationMeeting";

const keys = {
  submission: `SUBMISSION_XP|${SUBMISSION}`,
  homework: `HOMEWORK_XP|${HOMEWORK}`,
  video: `VIDEO_SUBMISSION|${VIDEO}`,
  zoomBase: `ZOOM_ATTEND_BASE|${MEETING}|${ENROLLMENT}`,
  zoomBonus2: `ZOOM_ATTEND_BONUS_2|${ENROLLMENT}`,
  zoomBonus3: `ZOOM_ATTEND_BONUS_3|${ENROLLMENT}`,
};

function state() {
  return {
    enrollment: { active: true, currentLevel: "Beginner", nextLevel: "Rookie Shooter", levelStatus: "Assigned" },
    week: { id: WEEK },
    was: { id: WAS, enrollmentId: ENROLLMENT, weekId: WEEK, xp: 0 },
    events: [],
    queue: [],
    emailHandoffs: [],
  };
}

function eventFor(s, sourceKey) {
  return s.events.filter((event) => event.sourceKey === sourceKey);
}

function reconcile(s, { sourceKey, sourceId, points, eligible = true, family }) {
  const candidates = eventFor(s, sourceKey);
  assert.ok(candidates.length <= 1, `duplicate canonical Source Key: ${sourceKey}`);
  const existing = candidates[0];

  if (!eligible || !s.enrollment.active) {
    if (existing) existing.active = false;
    return existing ? { action: "deactivated_same_event", id: existing.id } : { action: "skipped_ineligible" };
  }

  if (existing) {
    existing.active = true;
    existing.points = points;
    return { action: "reused_or_reactivated_same_event", id: existing.id };
  }

  const created = {
    id: `recXp${s.events.length + 1}`,
    sourceKey,
    sourceId,
    family,
    points,
    active: true,
    enrollmentId: ENROLLMENT,
    weekId: WEEK,
    wasId: WAS,
  };
  s.events.push(created);
  return { action: "created", id: created.id };
}

function settleAndProgress(s) {
  const active = s.events.filter((event) => event.active);
  s.was.xp = active.filter((event) => event.wasId === WAS).reduce((sum, event) => sum + event.points, 0);
  s.enrollment.lifetimeXp = active.filter((event) => event.enrollmentId === ENROLLMENT).reduce((sum, event) => sum + event.points, 0);
  s.queue.push({ enrollmentId: ENROLLMENT, lifetimeXp: s.enrollment.lifetimeXp });
  s.enrollment.currentLevel = s.enrollment.lifetimeXp >= 100 ? "Rookie Shooter" : "Beginner";
  s.enrollment.nextLevel = s.enrollment.lifetimeXp >= 200 ? "Developing Shooter" : "Rookie Shooter";
  s.enrollment.levelStatus = "Assigned";
}

function assertCanonicalRelationships(s) {
  assert.equal(s.was.enrollmentId, ENROLLMENT);
  assert.equal(s.was.weekId, WEEK);
  for (const event of s.events) {
    assert.deepEqual(
      { enrollmentId: event.enrollmentId, weekId: event.weekId, wasId: event.wasId },
      { enrollmentId: ENROLLMENT, weekId: WEEK, wasId: WAS },
      event.sourceKey,
    );
  }
  assert.equal(new Set(s.events.map((event) => event.sourceKey)).size, s.events.length);
}

test("one certification athlete supports mixed XP families without cross-family collision", () => {
  const s = state();
  const created = [
    reconcile(s, { sourceKey: keys.submission, sourceId: SUBMISSION, points: 20, family: "submission" }),
    reconcile(s, { sourceKey: keys.homework, sourceId: HOMEWORK, points: 35, family: "homework" }),
    reconcile(s, { sourceKey: keys.video, sourceId: VIDEO, points: 25, family: "video" }),
    reconcile(s, { sourceKey: keys.zoomBase, sourceId: MEETING, points: 60, family: "zoom" }),
    reconcile(s, { sourceKey: keys.zoomBonus2, sourceId: MEETING, points: 30, family: "zoom" }),
  ];
  assert.deepEqual(created.map((result) => result.action), Array(5).fill("created"));
  assertCanonicalRelationships(s);
  settleAndProgress(s);
  assert.equal(s.events.length, 5);
  assert.equal(s.was.xp, 170);
  assert.equal(s.enrollment.lifetimeXp, 170);
  assert.equal(s.enrollment.currentLevel, "Rookie Shooter");
  assert.equal(s.enrollment.nextLevel, "Rookie Shooter");
});

test("full-path replay keeps exact event IDs, source keys, totals, and no duplicate handoff", () => {
  const s = state();
  for (const [sourceKey, sourceId, points, family] of [
    [keys.submission, SUBMISSION, 20, "submission"],
    [keys.homework, HOMEWORK, 35, "homework"],
    [keys.video, VIDEO, 25, "video"],
    [keys.zoomBase, MEETING, 60, "zoom"],
  ]) reconcile(s, { sourceKey, sourceId, points, family });
  const before = Object.fromEntries(s.events.map((event) => [event.sourceKey, event.id]));
  s.emailHandoffs.push({ key: `DAILY_SUBMISSION|SUBMISSIONS|${SUBMISSION}`, status: "Ready" });

  for (const event of [...s.events]) {
    const replay = reconcile(s, event);
    assert.equal(replay.action, "reused_or_reactivated_same_event");
    assert.equal(replay.id, before[event.sourceKey]);
  }
  settleAndProgress(s);
  assert.equal(s.events.length, 4);
  assertCanonicalRelationships(s);
  assert.equal(s.emailHandoffs.length, 1, "daily handoff is a secondary, idempotent record");
  assert.equal(s.enrollment.lifetimeXp, 140);
});

test("submission, homework, video, and Zoom withdrawal/restoration reactivate the same event", () => {
  const s = state();
  const cases = [
    [keys.submission, SUBMISSION, 20, "submission"],
    [keys.homework, HOMEWORK, 35, "homework"],
    [keys.video, VIDEO, 25, "video"],
    [keys.zoomBase, MEETING, 60, "zoom"],
  ];
  for (const [sourceKey, sourceId, points, family] of cases) reconcile(s, { sourceKey, sourceId, points, family });
  const ids = Object.fromEntries(s.events.map((event) => [event.sourceKey, event.id]));

  for (const [sourceKey, sourceId, points, family] of cases) {
    const withdrawn = reconcile(s, { sourceKey, sourceId, points, family, eligible: false });
    assert.equal(withdrawn.action, "deactivated_same_event");
    assert.equal(withdrawn.id, ids[sourceKey]);
    const restored = reconcile(s, { sourceKey, sourceId, points, family, eligible: true });
    assert.equal(restored.action, "reused_or_reactivated_same_event");
    assert.equal(restored.id, ids[sourceKey]);
  }
  settleAndProgress(s);
  assert.equal(s.events.length, 4);
  assert.equal(s.enrollment.lifetimeXp, 140);
  assertCanonicalRelationships(s);
});

test("negative cases fail closed without creating or replacing ledger events", () => {
  const s = state();
  const first = reconcile(s, { sourceKey: keys.submission, sourceId: SUBMISSION, points: 20, family: "submission" });
  const id = first.id;
  s.enrollment.active = false;
  assert.deepEqual(
    reconcile(s, { sourceKey: keys.submission, sourceId: SUBMISSION, points: 20, family: "submission" }),
    { action: "deactivated_same_event", id },
  );
  assert.deepEqual(
    reconcile(s, { sourceKey: keys.video, sourceId: VIDEO, points: 25, family: "video" }),
    { action: "skipped_ineligible" },
  );
  assert.equal(s.events.length, 1);

  s.enrollment.active = true;
  s.events.push({ ...s.events[0], id: "recDuplicate", active: true });
  assert.throws(
    () => reconcile(s, { sourceKey: keys.submission, sourceId: SUBMISSION, points: 20, family: "submission" }),
    /duplicate canonical Source Key/,
  );
  assert.equal(s.events.length, 2, "a failure never selects, deletes, or replaces a duplicate");
});
