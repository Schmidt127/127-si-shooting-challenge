#!/usr/bin/env node
/**
 * Regression: 072 v4.3 weekly XP validation (reczxTIpVI8ZJLex0 class).
 * Offline contract — mirrors production disagreement root cause:
 * rollup matched WAS-linked XP while enrollment+week orphan milestone XP existed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const s072 = fs.readFileSync(
  path.join(
    root,
    "airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
  ),
  "utf8"
);

function simulateXpCheck({ summaryRollup, linkedXp, orphanXp }) {
  const linkedSum = linkedXp.reduce((s, x) => s + x.points, 0);
  const orphanSum = orphanXp.reduce((s, x) => s + x.points, 0);
  const allSum = linkedSum + orphanSum;

  // v4.2 behavior (bug): compared rollup to all enrollment+week XP
  const v42Error =
    summaryRollup !== null && Math.abs(summaryRollup - allSum) > 0.001
      ? `Weekly XP disagreement: summary=${summaryRollup}, active canonical XP=${allSum}.`
      : null;

  // v4.3 behavior: orphan check first, then rollup vs linked only
  let v43Error = null;
  if (orphanXp.length) {
    v43Error = `Unlinked canonical XP: ${orphanXp.length} active XP Event(s) (+${orphanSum} XP)`;
  } else if (summaryRollup !== null && Math.abs(summaryRollup - linkedSum) > 0.001) {
    v43Error = `Weekly XP disagreement: summary rollup=${summaryRollup}, WAS-linked active XP=${linkedSum}.`;
  }

  return { v42Error, v43Error, linkedSum, allSum, orphanSum };
}

// Production scenario at error time: rollup 1025, linked 1025, orphans +235 milestone
const prod = simulateXpCheck({
  summaryRollup: 1025,
  linkedXp: Array.from({ length: 36 }, (_, i) => ({ id: `linked${i}`, points: i === 0 ? 1025 - 35 * 28 : 28 })).slice(0, 36),
  orphanXp: [
    { id: "m1", points: 60 },
    { id: "m2", points: 55 },
    { id: "m3", points: 60 },
    { id: "m4", points: 60 },
  ],
});
// Simpler fixed scenario matching the documented totals
const scenario = simulateXpCheck({
  summaryRollup: 1025,
  linkedXp: [{ id: "a", points: 1025 }],
  orphanXp: [{ id: "m1", points: 235 }],
});

assert.ok(scenario.v42Error, "v4.2 falsely errors when orphans exist");
assert.match(scenario.v42Error, /summary=1025, active canonical XP=1260/);
assert.ok(scenario.v43Error, "v4.3 surfaces orphan XP instead of rollup mismatch");
assert.match(scenario.v43Error, /Unlinked canonical XP/);
assert.match(scenario.v43Error, /\+235 XP/);

const settled = simulateXpCheck({
  summaryRollup: 1260,
  linkedXp: [{ id: "a", points: 1260 }],
  orphanXp: [],
});
assert.equal(settled.v42Error, null);
assert.equal(settled.v43Error, null);

assert.match(s072, /Version: v4\.3/);
assert.match(s072, /orphanXp/);

console.log("PASS test_072_weekly_xp_reconciliation.mjs");
