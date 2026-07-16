#!/usr/bin/env node
/**
 * Offline 066 milestone-crossing harness tests (no Airtable).
 * Run: node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
 */

"use strict";

const assert = require("assert");
const {
  buildMilestoneSourceKey,
  detectCrossings,
} = require("./066-milestone-crossing-harness");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recEnrollment0001";

test("Source Key shape matches 066 contract", () => {
  assert.strictEqual(
    buildMilestoneSourceKey(ENR, "recMs100"),
    `SHOT_MILESTONE|${ENR}|recMs100`,
  );
});

test("single and multi threshold crossings", () => {
  const milestones = [
    { id: "recMs100", threshold: 100, name: "100" },
    { id: "recMs250", threshold: 250, name: "250" },
    { id: "recMs500", threshold: 500, name: "500" },
  ];
  const crossings = detectCrossings({
    enrollmentId: ENR,
    previousShotTotal: 90,
    currentShotTotal: 260,
    milestones,
  });
  assert.strictEqual(crossings.length, 2);
  assert.strictEqual(crossings[0].sourceKey, buildMilestoneSourceKey(ENR, "recMs100"));
  assert.strictEqual(crossings[1].sourceKey, buildMilestoneSourceKey(ENR, "recMs250"));
});

test("rerun is idempotent when Source Keys already unlocked", () => {
  const milestones = [
    { id: "recMs100", threshold: 100 },
    { id: "recMs250", threshold: 250 },
  ];
  const first = detectCrossings({
    enrollmentId: ENR,
    previousShotTotal: 90,
    currentShotTotal: 260,
    milestones,
  });
  const second = detectCrossings({
    enrollmentId: ENR,
    previousShotTotal: 90,
    currentShotTotal: 260,
    milestones,
    unlockedSourceKeys: first.map((c) => c.sourceKey),
  });
  assert.strictEqual(second.length, 0);
});

test("no crossing when already above thresholds before run", () => {
  const crossings = detectCrossings({
    enrollmentId: ENR,
    previousShotTotal: 300,
    currentShotTotal: 320,
    milestones: [{ id: "recMs250", threshold: 250 }],
  });
  assert.strictEqual(crossings.length, 0);
});

console.log("\nAll 066-milestone-crossing-harness tests passed.");
console.log("NOTE: Live OMNI Schmidt confirmation remains pending — see docs/deploy-checklists/066-dev-omni-confirmation-packet.md");
