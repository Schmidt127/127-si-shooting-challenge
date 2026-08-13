/**
 * Offline PKG-006R orchestration contract.
 *
 * This is deliberately an in-memory model, not Airtable proof. It exercises
 * the approved 010 lifecycle and downstream settlement without changing the
 * existing production writer in this bounded package.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (name) => readFileSync(path.join(ROOT, "airtable/automations/shooting-challenge", name), "utf8");
const auditSource = () => readFileSync(path.join(ROOT, "airtable/extension-scripts/audits/audit-counted-submission-xp-standings-reliability.js"), "utf8");
const E = "recEnrollmentR", W = "recWeekR", WAS = "recWasR";
const submission = (id, date = "2026-08-12") => ({
  id, enrollmentId: E, weekId: W, wasIds: [WAS], countable: true, date, shots: 150,
  duplicateReview: false, multipleEnrollmentLinks: false, multipleWeekLinks: false,
});
const key = (id) => `SUBMISSION_XP|${id}`;

function makeState() {
  return {
    submissions: [submission("recSubmissionR")],
    enrollment: { id: E, active: true, lifetimeXp: 0, level: "Beginner", next: "Rookie Shooter", recalc: false },
    weeks: [{ id: W, enrollmentIds: [E] }],
    was: [{ id: WAS, enrollmentId: E, weekId: W, xp: 0 }],
    events: [],
    milestones: [{ key: `SHOT_MILESTONE|${E}|recMilestoneR`, active: true, support: ["recSubmissionR"] }],
    streaks: [{ key: `STREAK_XP|${E}|recAchievementR|2026-08-12`, active: true, support: ["recSubmissionR"] }],
    emailActions: [], makeActions: [], standingsEligible: false, levelQueue: [], latchAcknowledged: false,
  };
}
function candidates(s, sub) {
  return s.was.filter((row) => row.enrollmentId === sub.enrollmentId && row.weekId === sub.weekId);
}
function eligible(s, sub, now = "2026-08-13") {
  return sub.countable && !sub.duplicateReview && !sub.multipleEnrollmentLinks
    && !sub.multipleWeekLinks && sub.shots > 0 && s.enrollment.active && sub.date <= now
    && sub.enrollmentId === E && sub.weekId === W && sub.wasIds.length === 1
    && sub.wasIds[0] === WAS && candidates(s, sub).length === 1;
}
function assertPostWriteOwnership(s, id) {
  const matches = s.events.filter((event) => event.sourceKey === key(id));
  if (matches.length !== 1) throw new Error("post-write canonical event cardinality changed");
  const [event] = matches;
  if (event.submissionId !== id || event.weekId !== W || event.wasId !== WAS) {
    throw new Error("post-write canonical event ownership changed before acknowledgement");
  }
}
function acknowledge(s, formulaSettled) {
  if (formulaSettled) s.latchAcknowledged = true;
}
function reconcile(s, id, { formulaSettled = true, failAfterDeactivate = false, beforeAcknowledge } = {}) {
  const sub = s.submissions.find((row) => row.id === id);
  assert.ok(sub, "trigger record must exist");
  const exact = s.events.filter((row) => row.sourceKey === key(id));
  if (exact.length > 1) throw new Error("ambiguous canonical key");
  const eventWasIds = exact[0]?.wasIds || (exact[0] ? [exact[0].wasId] : []);
  const owned = exact[0] && exact[0].submissionId === id && exact[0].enrollmentId === sub.enrollmentId
    && exact[0].weekId === sub.weekId && eventWasIds.length === 1 && eventWasIds[0] === sub.wasIds[0];
  if (exact[0] && !owned) throw new Error("event ownership mismatch");
  const shouldBeActive = eligible(s, sub);
  if (!shouldBeActive) {
    if (!exact[0]) return { action: "skipped_ineligible", acknowledged: true };
    exact[0].active = false;
    if (failAfterDeactivate) throw new Error("partial failure");
    beforeAcknowledge?.(s, exact[0]);
    assertPostWriteOwnership(s, id);
    acknowledge(s, formulaSettled);
    if (!formulaSettled) return { action: "deactivated_pending_formula", acknowledged: false };
    return { action: "deactivated_same_event", acknowledged: true };
  }
  if (!exact[0]) {
    s.events.push({ id: `recXp${id}`, sourceKey: key(id), active: true, points: 20, submissionId: id, enrollmentId: E, weekId: W, wasId: WAS });
    beforeAcknowledge?.(s, s.events[s.events.length - 1]);
    assertPostWriteOwnership(s, id);
    acknowledge(s, formulaSettled);
    return { action: "created", acknowledged: formulaSettled };
  }
  exact[0].active = true;
  beforeAcknowledge?.(s, exact[0]);
  assertPostWriteOwnership(s, id);
  acknowledge(s, formulaSettled);
  return { action: "reactivated_same_event", acknowledged: formulaSettled };
}
function settle(s) {
  for (const row of s.was) row.xp = s.events.filter((e) => e.active && e.weekId === row.weekId).reduce((n, e) => n + e.points, 0);
  s.enrollment.lifetimeXp = s.events.filter((e) => e.active && e.enrollmentId === E).reduce((n, e) => n + e.points, 0);
  s.enrollment.recalc = true;
  s.levelQueue.push({ xp: s.enrollment.lifetimeXp, direction: s.enrollment.lifetimeXp === 0 ? "downward" : "upward" });
  s.enrollment.level = s.enrollment.lifetimeXp >= 100 ? "Rookie Shooter" : "Beginner";
  s.enrollment.next = s.enrollment.lifetimeXp >= 100 ? "Developing Shooter" : "Rookie Shooter";
  s.enrollment.recalc = false;
  s.standingsEligible = s.enrollment.active && Boolean(s.enrollment.level);
}
function downstream(s, id, active) {
  for (const row of [...s.milestones, ...s.streaks]) {
    if (row.support.includes(id)) {
      row.support = row.support.filter((supportId) => supportId !== id);
      if (active) row.support.push(id);
      row.active = row.support.length > 0;
    }
  }
}

test("source contracts preserve lifecycle ownership and progression-only 041/042", () => {
  for (const file of [
    "010-submission-intake-create-xp-event.js",
    "041-levels-and-progression-mark-enrollment-for-level-recalculation.js",
    "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
  ]) assert.ok(source(file).length > 1000, file);
  const s010 = source("010-submission-intake-create-xp-event.js");
  assert.match(s010, /SUBMISSION_XP\|/);
  for (const fieldName of [
    "Current Reconciliation Signature",
    "Last Reconciled Signature",
    "Reconciliation Needed?",
  ]) assert.match(s010, new RegExp(fieldName.replace(/[?]/g, "\\$&")));
  assert.match(s010, /findExactEvent/);
  assert.match(s010, /acknowledgeAfterSettlement/);
  assert.match(source("053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js"), /054_ready_for_exact_owned_event/);
  assert.match(source("054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js"), /deactivated_same_event/);
  assert.match(source("066-achievements-and-milestones-create-shot-milestone-unlocks.js"), /active_unlock_lifecycle_reconciled/);
  assert.match(source("059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js"), /deactivated_same_milestone_xp_event/);
  assert.doesNotMatch(source("041-levels-and-progression-mark-enrollment-for-level-recalculation.js"), /XP Events.*create/i);
  assert.doesNotMatch(source("042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js"), /createRecordsAsync/);
});

test("base XP create, replay, withdrawal, restoration, settlement, and no email action", () => {
  const s = makeState();
  assert.deepEqual(reconcile(s, "recSubmissionR"), { action: "created", acknowledged: true });
  const original = s.events[0].id;
  assert.deepEqual(reconcile(s, "recSubmissionR"), { action: "reactivated_same_event", acknowledged: true });
  s.submissions[0].countable = false;
  assert.deepEqual(reconcile(s, "recSubmissionR"), { action: "deactivated_same_event", acknowledged: true });
  downstream(s, "recSubmissionR", false); settle(s);
  assert.equal(s.events.length, 1); assert.equal(s.events[0].id, original); assert.equal(s.enrollment.lifetimeXp, 0);
  s.submissions[0].countable = true;
  assert.deepEqual(reconcile(s, "recSubmissionR"), { action: "reactivated_same_event", acknowledged: true });
  downstream(s, "recSubmissionR", true); settle(s);
  assert.equal(s.events[0].id, original); assert.equal(s.was[0].xp, 20); assert.equal(s.enrollment.lifetimeXp, 20);
  assert.equal(s.standingsEligible, true);
  assert.deepEqual(s.emailActions, []);
  assert.deepEqual(s.makeActions, []);
});

test("future date, exclusion, inactive Enrollment, and missing or multiple links fail closed", () => {
  const cases = [
    (s) => { s.submissions[0].date = "2099-01-01"; },
    (s) => { s.submissions[0].countable = false; },
    (s) => { s.enrollment.active = false; },
    (s) => { s.submissions[0].enrollmentId = ""; },
    (s) => { s.submissions[0].wasIds = [WAS, "recWasOther"]; },
    (s) => { s.was.push({ id: "recWasDuplicate", enrollmentId: E, weekId: W, xp: 0 }); },
  ];
  for (const change of cases) { const s = makeState(); change(s); assert.equal(reconcile(s, "recSubmissionR").action, "skipped_ineligible"); assert.equal(s.events.length, 0); }
});

test("wrong Week, WAS, XP links and duplicate canonical keys never choose a winner", () => {
  const s = makeState(); s.submissions[0].weekId = "recWrongWeek";
  assert.equal(reconcile(s, "recSubmissionR").action, "skipped_ineligible");
  const wrongEnrollment = makeState(); wrongEnrollment.submissions[0].enrollmentId = "recWrongEnrollment";
  assert.equal(reconcile(wrongEnrollment, "recSubmissionR").action, "skipped_ineligible");
  const wrongWas = makeState(); wrongWas.submissions[0].wasIds = ["recWrongWas"];
  assert.equal(reconcile(wrongWas, "recSubmissionR").action, "skipped_ineligible");
  const t = makeState(); t.events.push({ id: "recWrongOwner", sourceKey: key("recSubmissionR"), active: true, submissionId: "recOther", enrollmentId: E, weekId: W, wasId: WAS, points: 20 });
  assert.throws(() => reconcile(t, "recSubmissionR"), /ownership/);
  const wrongLink = makeState(); wrongLink.events.push({ id: "recWrongLink", sourceKey: key("recSubmissionR"), active: true, submissionId: "recSubmissionR", enrollmentId: E, weekId: "recWrongWeek", wasId: WAS, points: 20 });
  assert.throws(() => reconcile(wrongLink, "recSubmissionR"), /ownership/);
  const d = makeState(); reconcile(d, "recSubmissionR"); d.events.push({ ...d.events[0], id: "recDuplicate" });
  assert.throws(() => reconcile(d, "recSubmissionR"), /ambiguous/);
});

test("concurrent exact-key recheck, partial failure, and formula lag are retry-safe", () => {
  const s = makeState();
  const first = reconcile(s, "recSubmissionR"); const second = reconcile(s, "recSubmissionR");
  assert.equal(first.action, "created"); assert.equal(second.action, "reactivated_same_event"); assert.equal(s.events.length, 1);
  const lag = makeState(); assert.deepEqual(reconcile(lag, "recSubmissionR", { formulaSettled: false }), { action: "created", acknowledged: false });
  assert.deepEqual(reconcile(lag, "recSubmissionR"), { action: "reactivated_same_event", acknowledged: true });
  const partial = makeState(); reconcile(partial, "recSubmissionR");
  partial.submissions[0].countable = false;
  assert.throws(() => reconcile(partial, "recSubmissionR", { failAfterDeactivate: true }), /partial/);
  assert.equal(partial.events[0].active, false); assert.equal(partial.events.length, 1);
});

test("milestone and streak support are independent across middle, first, and latest dates", () => {
  const s = makeState();
  s.submissions.push(submission("recFirst", "2026-08-10"), submission("recLatest", "2026-08-13"));
  s.streaks[0].support = ["recFirst", "recSubmissionR", "recLatest"];
  for (const id of ["recFirst", "recSubmissionR", "recLatest"]) reconcile(s, id, { formulaSettled: true });
  downstream(s, "recSubmissionR", false);
  assert.equal(s.milestones[0].active, false);
  assert.deepEqual(s.milestones[0].support, []);
  assert.deepEqual(s.streaks[0].support, ["recFirst", "recLatest"]);
  assert.equal(s.streaks[0].active, true);
  s.submissions.find((row) => row.id === "recSubmissionR").countable = true;
  s.milestones[0].support.push("recSubmissionR");
  s.streaks[0].support.push("recSubmissionR");
  downstream(s, "recSubmissionR", true);
  assert.equal(s.milestones[0].active, true); assert.equal(s.streaks[0].active, true);
  assert.equal(s.events.length, 3);
});

test("duplicate-review exclusion withdraws and restores the same base XP event", () => {
  const s = makeState();
  reconcile(s, "recSubmissionR");
  const eventId = s.events[0].id;
  s.submissions[0].duplicateReview = true;
  assert.equal(reconcile(s, "recSubmissionR").action, "deactivated_same_event");
  assert.equal(s.events[0].active, false);
  s.submissions[0].duplicateReview = false;
  assert.equal(reconcile(s, "recSubmissionR").action, "reactivated_same_event");
  assert.equal(s.events[0].id, eventId);
});

test("inactive Enrollment withdrawal and restoration preserve event identity", () => {
  const s = makeState();
  reconcile(s, "recSubmissionR");
  const eventId = s.events[0].id;
  s.enrollment.active = false;
  assert.equal(reconcile(s, "recSubmissionR").action, "deactivated_same_event");
  s.enrollment.active = true;
  assert.equal(reconcile(s, "recSubmissionR").action, "reactivated_same_event");
  assert.equal(s.events[0].id, eventId);
});

test("wrong and multiple Enrollment or Week links never create XP", () => {
  for (const change of [
    (s) => { s.submissions[0].enrollmentId = "recWrongEnrollment"; },
    (s) => { s.submissions[0].multipleEnrollmentLinks = true; },
    (s) => { s.submissions[0].weekId = "recWrongWeek"; },
    (s) => { s.submissions[0].multipleWeekLinks = true; },
  ]) {
    const s = makeState();
    change(s);
    assert.equal(reconcile(s, "recSubmissionR").action, "skipped_ineligible");
    assert.equal(s.events.length, 0);
  }
});

test("zero and multiple WAS candidates fail closed without changing ledger state", () => {
  for (const wasIds of [[], [WAS, "recWasDuplicate"]]) {
    const s = makeState();
    s.submissions[0].wasIds = wasIds;
    if (wasIds.length > 1) s.was.push({ id: wasIds[1], enrollmentId: E, weekId: W, xp: 0 });
    assert.equal(reconcile(s, "recSubmissionR").action, "skipped_ineligible");
    assert.deepEqual(s.events, []);
  }
});

test("wrong, missing, and multiple XP Event WAS links fail closed", () => {
  for (const eventShape of [
    { wasId: "recWrongWas" },
    { wasIds: [] },
    { wasIds: [WAS, "recWasDuplicate"] },
  ]) {
    const s = makeState();
    s.events.push({
      id: "recExistingXp", sourceKey: key("recSubmissionR"), active: true,
      submissionId: "recSubmissionR", enrollmentId: E, weekId: W, wasId: WAS, points: 20,
      ...eventShape,
    });
    assert.throws(() => reconcile(s, "recSubmissionR"), /ownership/);
    assert.equal(s.events.length, 1);
    assert.equal(s.events[0].active, true);
  }
});

test("source-key-only event with missing backlink cannot be stolen or reused", () => {
  const s = makeState();
  s.events.push({
    id: "recSourceKeyOnly", sourceKey: key("recSubmissionR"), active: true,
    submissionId: "", enrollmentId: E, weekId: W, wasId: WAS, points: 20,
  });
  assert.throws(() => reconcile(s, "recSubmissionR"), /ownership/);
  assert.equal(s.events[0].active, true);
  assert.equal(s.events.length, 1);
});

test("041 queues downward and upward recalculation while 042 settles lower and restored levels", () => {
  const s = makeState();
  reconcile(s, "recSubmissionR");
  settle(s);
  assert.equal(s.enrollment.level, "Beginner");
  s.events[0].points = 120;
  settle(s);
  assert.equal(s.enrollment.level, "Rookie Shooter");
  s.events[0].active = false;
  settle(s);
  assert.equal(s.enrollment.level, "Beginner");
  assert.deepEqual(s.levelQueue.map((row) => row.direction), ["upward", "upward", "downward"]);
});

test("WAS, lifetime XP, and standings values settle down then back up", () => {
  const s = makeState();
  reconcile(s, "recSubmissionR");
  settle(s);
  assert.deepEqual({ was: s.was[0].xp, lifetime: s.enrollment.lifetimeXp, standings: s.standingsEligible }, { was: 20, lifetime: 20, standings: true });
  s.events[0].active = false;
  settle(s);
  assert.deepEqual({ was: s.was[0].xp, lifetime: s.enrollment.lifetimeXp, standings: s.standingsEligible }, { was: 0, lifetime: 0, standings: true });
  s.events[0].active = true;
  settle(s);
  assert.equal(s.enrollment.lifetimeXp, 20);
});

test("partial correction failure preserves one inactive event and retry restores it", () => {
  const s = makeState();
  reconcile(s, "recSubmissionR");
  s.submissions[0].countable = false;
  assert.throws(() => reconcile(s, "recSubmissionR", { failAfterDeactivate: true }), /partial/);
  assert.equal(s.events.length, 1);
  s.submissions[0].countable = true;
  assert.equal(reconcile(s, "recSubmissionR").action, "reactivated_same_event");
  assert.equal(s.events.length, 1);
});

test("post-write Week/WAS/Submission mutation fails closed before latch acknowledgement", () => {
  const mutations = [
    (event) => { event.weekId = "recWrongWeekAfterWrite"; },
    (event) => { event.wasId = "recWrongWasAfterWrite"; },
    (event) => { event.submissionId = "recStolenSubmissionAfterWrite"; },
  ];
  for (const mutate of mutations) {
    const s = makeState();
    assert.throws(
      () => reconcile(s, "recSubmissionR", { beforeAcknowledge: (_state, event) => mutate(event) }),
      /post-write canonical event ownership changed/,
    );
    assert.equal(s.latchAcknowledged, false);
    assert.equal(s.events.length, 1);
    assert.equal(s.events[0].sourceKey, key("recSubmissionR"));
    assert.equal(s.events[0].active, true);
    assert.notEqual(s.events[0].id, "recStolenSubmissionAfterWrite");
  }
});

test("streak first, middle, and latest support restoration keeps independent downstream rows", () => {
  const s = makeState();
  s.submissions.push(submission("recFirstDay", "2026-08-10"), submission("recLatestDay", "2026-08-13"));
  s.streaks[0].support = ["recFirstDay", "recSubmissionR", "recLatestDay"];
  for (const id of ["recFirstDay", "recSubmissionR", "recLatestDay"]) reconcile(s, id);
  downstream(s, "recFirstDay", false);
  assert.equal(s.streaks[0].active, true);
  downstream(s, "recSubmissionR", false);
  assert.equal(s.streaks[0].active, true);
  downstream(s, "recLatestDay", false);
  assert.equal(s.streaks[0].active, false);
  downstream(s, "recMiddleDay", true);
  assert.equal(s.streaks[0].active, false);
  s.streaks[0].support.push("recSubmissionR");
  downstream(s, "recSubmissionR", true);
  assert.equal(s.streaks[0].active, true);
});

test("audit remains read-only and explicitly reports the approved limitations", () => {
  const audit = auditSource();
  assert.match(audit, /readOnly: true/);
  assert.match(audit, /active_xp_for_uncounted_submission/);
  assert.match(audit, /Standings view membership/);
  assert.doesNotMatch(audit, /updateRecordAsync|createRecordAsync|deleteRecordAsync/);
});
