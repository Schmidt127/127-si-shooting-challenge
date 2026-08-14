#!/usr/bin/env node
"use strict";

/**
 * PKG-036 executable offline harness.
 * It exercises the pure progression contract plus the queue/replay rules that
 * surround the Airtable 041 → 042 handoff. It does not claim Production proof.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  determineAllowedLevelWithGateBlocking,
  progressionAssignmentFingerprint,
  selectRelevantProgressionConfiguration,
  selectCompleteProgressionGateRules,
  validateProgressionLevels,
} = require("./v2-engine-contracts");

const LEVELS = [
  { id: "recL1", name: "Beginner", xpRequired: 0, active: true, sortOrder: 1 },
  { id: "recL2", name: "Rookie", xpRequired: 100, active: true, sortOrder: 2 },
  { id: "recL3", name: "Pro", xpRequired: 200, active: true, sortOrder: 3 },
  { id: "recL4", name: "Retired", xpRequired: 300, active: false, sortOrder: 4 },
];
const GATES = [
  { id: "recG1", name: "Beginner Gate", levelId: "recL1", schoolYear: "2026-2027", active: true, gateEnabled: false, minimumSubmissions: 0, minimumHomework: 0, minimumVideos: 0, minimumZoomMeetings: 0, minimumStreakDays: 0 },
  { id: "recG2", name: "Rookie Gate", levelId: "recL2", schoolYear: "2026-2027", active: true, gateEnabled: true, minimumSubmissions: 2, minimumHomework: 0, minimumVideos: 0, minimumZoomMeetings: 0, minimumStreakDays: 0 },
  { id: "recG3", name: "Pro Gate", levelId: "recL3", schoolYear: "2026-2027", active: true, gateEnabled: true, minimumSubmissions: 3, minimumHomework: 0, minimumVideos: 0, minimumZoomMeetings: 0, minimumStreakDays: 0 },
];
const ZERO = {
  totalSubmissions: 0,
  totalHomeworkCompletions: 0,
  totalVideoSubmissions: 0,
  totalZoomAttendances: 0,
  longestStreakDays: 0,
};
const PASS = { ...ZERO, totalSubmissions: 3 };

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function gateMapFor(stats = ZERO) {
  const selected = selectCompleteProgressionGateRules({
    levels: LEVELS,
    gateRules: GATES,
    schoolYear: "2026–2027",
  });
  return new Map([...selected.entries()].map(([id, rule]) => [id, rule]));
}

function assignment(xp, stats = ZERO) {
  return determineAllowedLevelWithGateBlocking(
    validateProgressionLevels(LEVELS),
    gateMapFor(stats),
    xp,
    stats
  );
}

test("initial zero XP assigns Beginner and deterministic Next Level", () => {
  const result = assignment(0);
  assert.strictEqual(result.currentLevel.id, "recL1");
  assert.strictEqual(result.nextLevel.id, "recL2");
  assert.strictEqual(result.status, "Assigned");
});

test("exact initial threshold and intermediate threshold are inclusive", () => {
  assert.strictEqual(assignment(0).currentLevel.id, "recL1");
  assert.strictEqual(assignment(100, PASS).currentLevel.id, "recL2");
});

test("XP increase within a level does not churn assignment", () => {
  assert.strictEqual(assignment(1).currentLevel.id, assignment(99).currentLevel.id);
});

test("XP increase crosses one threshold", () => {
  assert.strictEqual(assignment(100, PASS).currentLevel.id, "recL2");
});

test("XP increase crosses multiple thresholds", () => {
  assert.strictEqual(assignment(200, PASS).currentLevel.id, "recL3");
  assert.strictEqual(assignment(200, PASS).nextLevel, null);
});

test("XP decrease crosses one threshold downward", () => {
  assert.strictEqual(assignment(200, PASS).currentLevel.id, "recL3");
  assert.strictEqual(assignment(99, PASS).currentLevel.id, "recL1");
});

test("XP decrease crosses multiple thresholds and returns to zero", () => {
  assert.strictEqual(assignment(200, PASS).currentLevel.id, "recL3");
  assert.strictEqual(assignment(0, PASS).currentLevel.id, "recL1");
});

test("gate blocks and later clears without assuming upward-only progress", () => {
  const blocked = assignment(100, ZERO);
  assert.strictEqual(blocked.status, "Gate Blocked");
  assert.strictEqual(blocked.currentLevel.id, "recL1");
  assert.strictEqual(blocked.nextLevel.id, "recL2");
  const cleared = assignment(100, PASS);
  assert.strictEqual(cleared.currentLevel.id, "recL2");
});

test("maximum level clears Next Level and Gate Rule", () => {
  const result = assignment(200, PASS);
  assert.strictEqual(result.currentLevel.id, "recL3");
  assert.strictEqual(result.nextLevel, null);
  assert.strictEqual(result.levelGateRule, null);
});

test("inactive levels are excluded from the ladder", () => {
  assert.deepStrictEqual(validateProgressionLevels(LEVELS).map((level) => level.id), ["recL1", "recL2", "recL3"]);
});

test("duplicate active thresholds fail closed", () => {
  assert.throws(
    () => validateProgressionLevels([...LEVELS, { id: "recDup", name: "Duplicate", xpRequired: 100, active: true }]),
    /Duplicate active level threshold/
  );
});

test("negative, nonfinite, and missing thresholds fail closed", () => {
  assert.throws(() => validateProgressionLevels([{ id: "recBad", name: "Bad", xpRequired: -1, active: true }]), /Invalid active level threshold/);
  assert.throws(() => validateProgressionLevels([{ id: "recBad", name: "Bad", xpRequired: NaN, active: true }]), /Invalid active level threshold/);
  assert.throws(() => validateProgressionLevels([{ id: "recBad", xpRequired: 0, active: true }]), /missing Level Name/);
});

test("missing or duplicate initial levels fail closed", () => {
  assert.throws(() => validateProgressionLevels(LEVELS.filter((level) => level.id !== "recL1")), /initial Level/);
  assert.throws(() => validateProgressionLevels([
    ...LEVELS,
    { id: "recZero2", name: "Second Initial", xpRequired: 0, active: true },
  ]), /initial Level|Duplicate active level threshold/);
});

test("missing and duplicate applicable gate rules fail closed", () => {
  assert.throws(
    () => selectCompleteProgressionGateRules({ levels: LEVELS, gateRules: GATES.filter((rule) => rule.levelId !== "recL3"), schoolYear: "2026-2027" }),
    /No active gate rule/
  );
  assert.throws(
    () => selectCompleteProgressionGateRules({ levels: LEVELS, gateRules: [...GATES, { ...GATES[1], id: "recG2dup" }], schoolYear: "2026-2027" }),
    /Multiple active gate rules/
  );
});

test("wrong school year is never silently selected", () => {
  assert.throws(
    () => selectCompleteProgressionGateRules({ levels: LEVELS, gateRules: GATES.map((rule) => ({ ...rule, schoolYear: "2025-2026" })), schoolYear: "2026-2027" }),
    /No active gate rule/
  );
});

test("malformed gate numerics fail closed", () => {
  assert.throws(
    () => selectCompleteProgressionGateRules({
      levels: LEVELS,
      gateRules: GATES.map((rule) => rule.id === "recG2" ? { ...rule, minimumSubmissions: NaN } : rule),
      schoolYear: "2026-2027",
    }),
    /Invalid numeric configuration/
  );
  assert.throws(
    () => selectCompleteProgressionGateRules({
      levels: LEVELS,
      gateRules: GATES.map((rule) => rule.id === "recG2" ? { ...rule, minimumSubmissions: true } : rule),
      schoolYear: "2026-2027",
    }),
    /Invalid numeric configuration/
  );
});

test("gate rules pointing outside the active ladder fail closed", () => {
  assert.throws(
    () => selectCompleteProgressionGateRules({
      levels: LEVELS,
      gateRules: [...GATES, { ...GATES[0], id: "recG-orphan", levelId: "recMissing" }],
      schoolYear: "2026-2027",
    }),
    /inactive or unknown Level/
  );
});

test("shared gate rules are explicit fallback only", () => {
  const shared = GATES.map((rule) => ({ ...rule, schoolYear: "Shared" }));
  assert.strictEqual(selectCompleteProgressionGateRules({ levels: LEVELS, gateRules: shared, schoolYear: "2026-2027" }).size, 3);
});

test("identical assignment is deterministic on replay", () => {
  assert.deepStrictEqual(assignment(100, PASS), assignment(100, PASS));
});

test("progression signature changes for XP increases and decreases", () => {
  const base = { enrollmentId: "recE1", lifetimeXp: 100, stats: PASS, schoolYear: "2026-2027", levels: LEVELS, gateRules: GATES, outputs: { currentLevelId: "recL2" } };
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, lifetimeXp: 99 }));
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, lifetimeXp: 200 }));
});

test("progression signature observes manual XP adjustments", () => {
  const base = { enrollmentId: "recE1", lifetimeXp: 100, lifetimeXpManualAdjustments: 0, stats: PASS, schoolYear: "2026-2027", levels: LEVELS, gateRules: GATES };
  assert.notStrictEqual(
    progressionAssignmentFingerprint(base),
    progressionAssignmentFingerprint({ ...base, lifetimeXpManualAdjustments: 25 })
  );
});

test("progression signature observes level and gate configuration changes", () => {
  const base = { enrollmentId: "recE1", lifetimeXp: 100, stats: PASS, schoolYear: "2026-2027", levels: LEVELS, gateRules: GATES, outputs: { currentLevelId: "recL2" } };
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, levels: LEVELS.map((level) => level.id === "recL2" ? { ...level, xpRequired: 110 } : level) }));
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, gateRules: GATES.map((rule) => rule.id === "recG2" ? { ...rule, minimumSubmissions: 4 } : rule) }));
});

test("unrelated level configuration does not churn an unaffected Enrollment", () => {
  const base = {
    enrollmentId: "recE1",
    lifetimeXp: 100,
    stats: PASS,
    schoolYear: "2026-2027",
    levels: LEVELS,
    gateRules: GATES,
    outputs: { currentLevelId: "recL2", nextLevelId: "recL3" },
  };
  const unrelatedLevels = LEVELS.map((level) =>
    level.id === "recL4"
      ? { ...level, xpRequired: 350, name: "Unrelated Future Level" }
      : level
  );
  assert.strictEqual(
    progressionAssignmentFingerprint(base),
    progressionAssignmentFingerprint({ ...base, levels: unrelatedLevels })
  );
  assert.strictEqual(
    progressionAssignmentFingerprint(base),
    progressionAssignmentFingerprint({
      ...base,
      gateRules: [
        ...GATES,
        { ...GATES[1], id: "recFutureGate", schoolYear: "2027-2028", minimumSubmissions: 999 },
      ],
    })
  );
});

test("configuration reachability includes the current and next ladder rows", () => {
  const relevant = selectRelevantProgressionConfiguration({
    lifetimeXp: 100,
    currentLevelIds: ["recL2"],
    nextLevelIds: ["recL3"],
    levels: LEVELS,
    gateRules: GATES,
  });
  assert.deepStrictEqual(
    relevant.levels.map((level) => level.id),
    ["recL1", "recL2", "recL3"]
  );
  assert.ok(relevant.gateRules.every((rule) => ["recL1", "recL2", "recL3"].includes(rule.levelId)));
});

test("progression signature observes Program Instance, enrollment lifecycle, and output repair state", () => {
  const base = { enrollmentId: "recE1", lifetimeXp: 0, stats: ZERO, schoolYear: "2026-2027", programInstanceIds: ["recPI1"], levels: LEVELS, gateRules: GATES, outputs: { currentLevelId: "recL1", levelStatus: "Assigned" } };
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, programInstanceIds: ["recPI2"] }));
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, active: false }));
  assert.notStrictEqual(progressionAssignmentFingerprint(base), progressionAssignmentFingerprint({ ...base, outputs: { currentLevelId: "recL2", levelStatus: "Assigned" } }));
});

test("source ownership contract keeps 041 queue-only, 042 assignment-only, and 043 retired", () => {
  const source041 = fs.readFileSync(path.join(__dirname, "..", "041-levels-and-progression-mark-enrollment-for-level-recalculation.js"), "utf8");
  const source042 = fs.readFileSync(path.join(__dirname, "..", "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js"), "utf8");
  const source043 = fs.readFileSync(path.join(__dirname, "..", "043-levels-and-progression-set-level-gate-rule-from-next-level.js"), "utf8");
  assert.ok(source041.includes("This is a queue/request mechanism only"));
  assert.ok(source041.includes("buildRelevantConfiguration"));
  assert.ok(!source041.includes("Current Level]: linkedRecordValue"));
  assert.ok(source042.includes("Progression Last Reconciled Signature"));
  assert.ok(source042.includes("sortOrder"));
  assert.ok(source042.includes("getRequiredNonnegativeNumber"));
  assert.ok(source042.includes("configuration changed during calculation"));
  assert.ok(source042.includes("Post-write progression verification failed"));
  assert.ok(source042.includes("levelRecalcNeeded]: false"));
  assert.ok(source043.includes("043 - Levels and Progression"));
});

test("042 v4.1.2 uses bounded immediate settlement reads without timers", () => {
  const source042 = fs.readFileSync(path.join(__dirname, "..", "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js"), "utf8");
  assert.match(source042, /Version: 4\.1\.2/);
  assert.match(source042, /version:\s*"4\.1\.2"/);
  assert.ok(source042.includes("function getFieldSafe"));
  assert.ok(source042.includes("function isWritableField"));
  assert.ok(source042.includes("function requireField"));
  assert.ok(source042.includes("function requireWritableField"));
  assert.ok(source042.includes("if (stableReads >= 2)"));
  assert.ok(source042.includes("Formula/rollup values did not settle"));
  assert.ok(source042.includes("levelRecalcNeeded]: false"));
  assert.ok(!/\b(?:setTimeout|setInterval|clearTimeout|clearInterval)\b/.test(source042));
  assert.ok(!/new Promise\s*\(\s*\(\s*resolve\s*\)\s*=>/.test(source042));
  assert.ok(!/Date\.now\(\)[\s\S]{0,200}while\s*\(/.test(source042));
});

console.log("pkg-036-progression-reliability: all tests passed");
