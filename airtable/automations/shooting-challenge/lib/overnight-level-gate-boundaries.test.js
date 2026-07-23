#!/usr/bin/env node
/**
 * Overnight Agent 2 — level threshold + gate blocking boundary coverage.
 * Fixtures mirror the live PROD configuration captured 2026-07-23
 * (docs/overnight/config-xp/prod-config-snapshot.json):
 *   12 active levels, XP 0..2200 step 200, gates enabled for ranks 7-12.
 * Run: node airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js
 */

"use strict";

const assert = require("assert");
const {
  evaluateGate,
  buildGateRuleMap,
  determineAllowedLevelWithGateBlocking,
} = require("./v2-engine-contracts");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

// PROD-shaped levels (rank, name, cumulative XP). Ids are synthetic.
const LEVEL_NAMES = [
  "Beginner", "Rookie Shooter", "Developing Shooter", "Consistent Shooter",
  "Dangerous Shooter", "Hot Hand", "Deadeye", "Sharpshooter",
  "Pro", "All-Star", "Legend", "G.O.A.T.",
];
const LEVELS = LEVEL_NAMES.map((name, i) => ({
  id: `recLevel${String(i + 1).padStart(9, "0")}`,
  name,
  rank: i + 1,
  xpRequired: i * 200,
}));

// PROD-shaped gate rules: ranks 1-6 disabled/zero, ranks 7-12 enabled.
const GATE_VALUES = {
  7: { minimumSubmissions: 30, minimumHomework: 6, minimumVideos: 6, minimumZoomMeetings: 0, minimumStreakDays: 0 },
  8: { minimumSubmissions: 34, minimumHomework: 8, minimumVideos: 8, minimumZoomMeetings: 1, minimumStreakDays: 0 },
  9: { minimumSubmissions: 38, minimumHomework: 10, minimumVideos: 10, minimumZoomMeetings: 1, minimumStreakDays: 10 },
  10: { minimumSubmissions: 42, minimumHomework: 12, minimumVideos: 12, minimumZoomMeetings: 1, minimumStreakDays: 20 },
  11: { minimumSubmissions: 50, minimumHomework: 13, minimumVideos: 16, minimumZoomMeetings: 2, minimumStreakDays: 20 },
  12: { minimumSubmissions: 58, minimumHomework: 18, minimumVideos: 20, minimumZoomMeetings: 2, minimumStreakDays: 30 },
};

function buildGateRules() {
  return LEVELS.map((level) => {
    const values = GATE_VALUES[level.rank] || {
      minimumSubmissions: 0, minimumHomework: 0, minimumVideos: 0,
      minimumZoomMeetings: 0, minimumStreakDays: 0,
    };
    return {
      id: `recGate${level.rank.toString().padStart(10, "0")}`,
      name: `Level ${level.rank} Gate`,
      levelId: level.id,
      gateEnabled: Boolean(GATE_VALUES[level.rank]),
      ...values,
    };
  });
}

const GATE_MAP = buildGateRuleMap(buildGateRules());

// Stats generous enough to clear every gate through rank 12.
const MAX_STATS = {
  totalSubmissions: 60,
  totalHomeworkCompletions: 20,
  totalVideoSubmissions: 22,
  totalZoomAttendances: 3,
  longestStreakDays: 31,
};
const ZERO_STATS = {
  totalSubmissions: 0,
  totalHomeworkCompletions: 0,
  totalVideoSubmissions: 0,
  totalZoomAttendances: 0,
  longestStreakDays: 0,
};

// Stats that exactly satisfy the rank-7 (Deadeye) gate, nothing more.
const DEADEYE_EXACT = {
  totalSubmissions: 30,
  totalHomeworkCompletions: 6,
  totalVideoSubmissions: 6,
  totalZoomAttendances: 0,
  longestStreakDays: 0,
};

function levelByRank(rank) {
  return LEVELS[rank - 1];
}

// --- XP thresholds (ungated ranks 1-6) ---

test("no XP: current Beginner, next Rookie Shooter", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 0, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Beginner");
  assert.strictEqual(result.nextLevel.name, "Rookie Shooter");
  assert.strictEqual(result.status, "Assigned");
  assert.strictEqual(result.gateBlocked, false);
});

test("one point below threshold (199) stays Beginner", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 199, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Beginner");
});

test("exact threshold (200) advances to Rookie Shooter", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 200, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Rookie Shooter");
  assert.strictEqual(result.nextLevel.name, "Developing Shooter");
});

test("one point above threshold (201) stays Rookie Shooter", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 201, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Rookie Shooter");
});

test("Schmidt live shape: 61 XP -> Beginner, next Rookie, next gate rule exposed", () => {
  // Mirrors live enrollment recgP9qZYjAhE7NXm (61 XP) verified 2026-07-23.
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 61, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Beginner");
  assert.strictEqual(result.nextLevel.name, "Rookie Shooter");
  // 042 writes the next level's gate rule when not blocked.
  assert.strictEqual(result.levelGateRule.name, "Level 2 Gate");
});

// --- first gated level (rank 7 Deadeye at 1200 XP) ---

test("gate unmet: XP for Deadeye but zero stats blocks at Hot Hand", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, ZERO_STATS);
  assert.strictEqual(result.status, "Gate Blocked");
  assert.strictEqual(result.gateBlocked, true);
  assert.strictEqual(result.currentLevel.name, "Hot Hand");
  assert.strictEqual(result.nextLevel.name, "Deadeye");
  assert.strictEqual(result.levelGateRule.name, "Level 7 Gate");
  assert.match(result.gateReason, /Submissions 0\/30/);
});

test("gate exactly met: Deadeye assigned at exact minimums", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, DEADEYE_EXACT);
  assert.strictEqual(result.status, "Assigned");
  assert.strictEqual(result.currentLevel.name, "Deadeye");
  assert.strictEqual(result.nextLevel.name, "Sharpshooter");
});

test("gate exceeded: Deadeye assigned with surplus stats", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, MAX_STATS);
  assert.strictEqual(result.currentLevel.name, "Deadeye");
});

test("one stat short of gate blocks (29/30 submissions)", () => {
  const stats = { ...DEADEYE_EXACT, totalSubmissions: 29 };
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, stats);
  assert.strictEqual(result.gateBlocked, true);
  assert.match(result.gateReason, /Submissions 29\/30/);
});

// --- XP cannot bypass an unmet gate ---

test("high XP cannot advance past unmet Deadeye gate", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 2200, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Hot Hand");
  assert.strictEqual(result.nextLevel.name, "Deadeye");
  assert.strictEqual(result.gateBlocked, true);
});

test("requirements drop mid-season: previously assigned level rolls back on recalc", () => {
  // Athlete once cleared Deadeye; stats later recount lower (e.g. deleted subs).
  const before = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, DEADEYE_EXACT);
  assert.strictEqual(before.currentLevel.name, "Deadeye");
  const after = determineAllowedLevelWithGateBlocking(
    LEVELS, GATE_MAP, 1200, { ...DEADEYE_EXACT, totalSubmissions: 25 }
  );
  assert.strictEqual(after.currentLevel.name, "Hot Hand");
  assert.strictEqual(after.gateBlocked, true);
});

// --- stat-change transitions (Zoom / homework / video / streak) ---

test("changed Zoom count clears rank-8 gate", () => {
  const stats = {
    totalSubmissions: 34, totalHomeworkCompletions: 8, totalVideoSubmissions: 8,
    totalZoomAttendances: 0, longestStreakDays: 0,
  };
  const blocked = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1400, stats);
  assert.strictEqual(blocked.gateBlocked, true);
  assert.match(blocked.gateReason, /Zoom 0\/1/);
  const cleared = determineAllowedLevelWithGateBlocking(
    LEVELS, GATE_MAP, 1400, { ...stats, totalZoomAttendances: 1 }
  );
  assert.strictEqual(cleared.currentLevel.name, "Sharpshooter");
});

test("changed homework count clears rank-7 gate", () => {
  const stats = { ...DEADEYE_EXACT, totalHomeworkCompletions: 5 };
  const blocked = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, stats);
  assert.match(blocked.gateReason, /Homework 5\/6/);
  const cleared = determineAllowedLevelWithGateBlocking(
    LEVELS, GATE_MAP, 1200, { ...stats, totalHomeworkCompletions: 6 }
  );
  assert.strictEqual(cleared.currentLevel.name, "Deadeye");
});

test("changed video count clears rank-7 gate", () => {
  const stats = { ...DEADEYE_EXACT, totalVideoSubmissions: 5 };
  const blocked = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1200, stats);
  assert.match(blocked.gateReason, /Videos 5\/6/);
  const cleared = determineAllowedLevelWithGateBlocking(
    LEVELS, GATE_MAP, 1200, { ...stats, totalVideoSubmissions: 6 }
  );
  assert.strictEqual(cleared.currentLevel.name, "Deadeye");
});

test("changed streak count clears rank-9 gate", () => {
  const stats = {
    totalSubmissions: 38, totalHomeworkCompletions: 10, totalVideoSubmissions: 10,
    totalZoomAttendances: 1, longestStreakDays: 9,
  };
  const blocked = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1600, stats);
  assert.strictEqual(blocked.gateBlocked, true);
  assert.match(blocked.gateReason, /Streak 9\/10/);
  const cleared = determineAllowedLevelWithGateBlocking(
    LEVELS, GATE_MAP, 1600, { ...stats, longestStreakDays: 10 }
  );
  assert.strictEqual(cleared.currentLevel.name, "Pro");
});

// --- missing / duplicate rules ---

test("missing gate rule defaults to passing (level ungated)", () => {
  const partialMap = new Map(GATE_MAP);
  partialMap.delete(levelByRank(7).id);
  const result = determineAllowedLevelWithGateBlocking(LEVELS, partialMap, 1200, ZERO_STATS);
  assert.strictEqual(result.currentLevel.name, "Deadeye");
});

test("duplicate active gate rules for one level throw during map build", () => {
  const rules = buildGateRules();
  rules.push({ ...rules[6], id: "recGateDuplicate1", name: "Level 7 Gate (dup)" });
  assert.throws(() => buildGateRuleMap(rules), /Duplicate active gate rules/);
});

test("gate rule with no Level link throws during map build", () => {
  assert.throws(
    () => buildGateRuleMap([{ id: "recGateOrphan0001", name: "Orphan Gate", levelId: "" }]),
    /no Level link/
  );
});

// --- maximum level ---

test("maximum level: G.O.A.T. reached, next level null", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 2200, MAX_STATS);
  assert.strictEqual(result.currentLevel.name, "G.O.A.T.");
  assert.strictEqual(result.nextLevel, null);
  assert.strictEqual(result.levelGateRule, null);
  assert.strictEqual(result.status, "Assigned");
});

// --- rerun determinism (no recalc loop) ---

test("rerun with identical inputs yields identical result", () => {
  const first = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1400, MAX_STATS);
  const second = determineAllowedLevelWithGateBlocking(LEVELS, GATE_MAP, 1400, MAX_STATS);
  assert.deepStrictEqual(first, second);
});

// --- evaluateGate unit boundaries ---

test("evaluateGate: disabled gate always passes", () => {
  const result = evaluateGate({ name: "Level 2 Gate", gateEnabled: false, minimumSubmissions: 99 }, ZERO_STATS);
  assert.strictEqual(result.passes, true);
  assert.strictEqual(result.enabled, false);
});

test("evaluateGate: null rule passes with explicit reason", () => {
  const result = evaluateGate(null, ZERO_STATS);
  assert.strictEqual(result.passes, true);
  assert.match(result.reason, /No gate rule/);
});

test("evaluateGate: reports every failing dimension", () => {
  const rule = {
    name: "Level 12 Gate - GOAT", gateEnabled: true,
    minimumSubmissions: 58, minimumHomework: 18, minimumVideos: 20,
    minimumZoomMeetings: 2, minimumStreakDays: 30,
  };
  const result = evaluateGate(rule, ZERO_STATS);
  assert.strictEqual(result.passes, false);
  assert.strictEqual(result.failures.length, 5);
});

console.log("overnight-level-gate-boundaries: all tests passed");
