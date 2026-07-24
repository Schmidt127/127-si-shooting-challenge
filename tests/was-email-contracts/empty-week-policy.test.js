#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  normalizeEmptyWeekPolicy,
  isEmptyWeekActivity,
  resolveEmptyWeekBuildPlan,
  buildShortNoActivityEmail,
  resolveEmptyWeekEmailPolicy,
} = require("../../lib/was-email-contracts/empty-week-policy");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const EMPTY = {
  countedSubmissionCount: 0,
  totalShots: 0,
  daysLogged: 0,
  homeworkSatisfactoryCount: 0,
  zoomAttendedCount: 0,
  videoFeedbackCount: 0,
  weeklyXp: 0,
};

test("normalize defaults blank/unknown to send_short (SC-035)", () => {
  assert.strictEqual(normalizeEmptyWeekPolicy(""), "send_short");
  assert.strictEqual(normalizeEmptyWeekPolicy("nope"), "send_short");
  assert.strictEqual(normalizeEmptyWeekPolicy("SEND_SHORT"), "send_short");
  assert.strictEqual(normalizeEmptyWeekPolicy("send_normal"), "send_normal");
  assert.strictEqual(normalizeEmptyWeekPolicy("suppress"), "suppress");
});

test("isEmptyWeekActivity true only when all activity counters are zero", () => {
  assert.strictEqual(isEmptyWeekActivity(EMPTY), true);
  assert.strictEqual(isEmptyWeekActivity({ ...EMPTY, totalShots: 1 }), false);
  assert.strictEqual(isEmptyWeekActivity({ ...EMPTY, zoomAttendedCount: 1 }), false);
  assert.strictEqual(isEmptyWeekActivity({ ...EMPTY, videoFeedbackCount: 1 }), false);
  assert.strictEqual(isEmptyWeekActivity({ ...EMPTY, weeklyXp: 20 }), false);
});

test("send_short + empty → short reminder package plan", () => {
  const plan = resolveEmptyWeekBuildPlan({ policy: "send_short", isEmpty: true });
  assert.strictEqual(plan.buildMode, "short");
  assert.strictEqual(plan.sendReady, true);
  assert.strictEqual(plan.actionOut, "built_short_empty_week");
  assert.strictEqual(plan.enforced, true);
});

test("send_normal + empty → full empty-week report plan", () => {
  const plan = resolveEmptyWeekBuildPlan({ policy: "send_normal", isEmpty: true });
  assert.strictEqual(plan.buildMode, "full");
  assert.strictEqual(plan.sendReady, true);
  assert.strictEqual(plan.actionOut, "built_full_empty_week");
});

test("suppress + empty → no send-ready package", () => {
  const plan = resolveEmptyWeekBuildPlan({ policy: "suppress", isEmpty: true });
  assert.strictEqual(plan.buildMode, "suppress");
  assert.strictEqual(plan.sendReady, false);
  assert.strictEqual(plan.actionOut, "skipped_empty_week_suppress");
});

test("non-empty week always full regardless of policy", () => {
  for (const policy of ["send_short", "send_normal", "suppress"]) {
    const plan = resolveEmptyWeekBuildPlan({ policy, isEmpty: false });
    assert.strictEqual(plan.buildMode, "full", policy);
    assert.strictEqual(plan.sendReady, true, policy);
    assert.strictEqual(plan.actionOut, "built_full", policy);
  }
});

test("short package is concise reminder (not full zero report)", () => {
  const pkg = buildShortNoActivityEmail({
    athleteName: "Schmidt Test",
    weekLabel: "Week ending Jul 18, 2026",
    weeklyGoalTarget: 500,
    escapeHtml: (v) =>
      String(v == null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
  });
  assert.match(pkg.subject, /Weekly Check-In/);
  assert.match(pkg.subject, /Schmidt Test/);
  assert.doesNotMatch(pkg.subject, /Weekly Summary \|/);
  assert.match(pkg.html, /No activity logged this week/i);
  assert.match(pkg.html, /short reminder/i);
  assert.doesNotMatch(pkg.html, /Weekly Shooting Summary/);
  assert.doesNotMatch(pkg.html, /XP Event Detail/);
  assert.match(pkg.text, /No activity logged this week/);
  assert.strictEqual(pkg.packageKind, "short_no_activity");
});

test("resolveEmptyWeekEmailPolicy is enforced", () => {
  const p = resolveEmptyWeekEmailPolicy("suppress");
  assert.strictEqual(p.policy, "suppress");
  assert.strictEqual(p.enforced, true);
});

console.log("empty-week-policy tests passed");
