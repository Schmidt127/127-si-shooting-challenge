#!/usr/bin/env node
/**
 * Agent 4 §4 — Level / gate behavior matrix (pure helpers).
 * Complements overnight-level-gate-boundaries with enrollment-isolation cases.
 * Run: node airtable/automations/shooting-challenge/lib/agent4-level-gate-matrix.test.js
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

const LEVELS = [
  { id: "recLvl1", name: "Beginner", rank: 1, xpRequired: 0 },
  { id: "recLvl2", name: "Rookie", rank: 2, xpRequired: 200 },
  { id: "recLvl3", name: "Deadeye", rank: 3, xpRequired: 400 },
];

const GATES = buildGateRuleMap([
  {
    id: "recGate1",
    name: "L1",
    levelId: "recLvl1",
    gateEnabled: false,
    minimumSubmissions: 0,
    minimumHomework: 0,
    minimumVideos: 0,
    minimumZoomMeetings: 0,
    minimumStreakDays: 0,
  },
  {
    id: "recGate2",
    name: "L2",
    levelId: "recLvl2",
    gateEnabled: false,
    minimumSubmissions: 0,
    minimumHomework: 0,
    minimumVideos: 0,
    minimumZoomMeetings: 0,
    minimumStreakDays: 0,
  },
  {
    id: "recGate3",
    name: "L3",
    levelId: "recLvl3",
    gateEnabled: true,
    minimumSubmissions: 10,
    minimumHomework: 2,
    minimumVideos: 2,
    minimumZoomMeetings: 0,
    minimumStreakDays: 0,
  },
]);

const ZERO = {
  totalSubmissions: 0,
  totalHomeworkCompletions: 0,
  totalVideoSubmissions: 0,
  totalZoomAttendances: 0,
  longestStreakDays: 0,
};

test("XP below next level stays on current", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 100, ZERO);
  assert.strictEqual(result.currentLevel.id, "recLvl1");
  assert.strictEqual(result.nextLevel.id, "recLvl2");
  assert.strictEqual(result.gateBlocked, false);
});

test("XP reaches next ungated level", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 200, ZERO);
  assert.strictEqual(result.currentLevel.id, "recLvl2");
  assert.strictEqual(result.gateBlocked, false);
});

test("gate requirement missing blocks advance", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 400, ZERO);
  assert.strictEqual(result.gateBlocked, true);
  assert.strictEqual(result.currentLevel.id, "recLvl2");
  assert.strictEqual(result.nextLevel.id, "recLvl3");
});

test("gate requirement satisfied advances", () => {
  const stats = {
    totalSubmissions: 10,
    totalHomeworkCompletions: 2,
    totalVideoSubmissions: 2,
    totalZoomAttendances: 0,
    longestStreakDays: 0,
  };
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 400, stats);
  assert.strictEqual(result.gateBlocked, false);
  assert.strictEqual(result.currentLevel.id, "recLvl3");
});

test("gate blocked does not roll back below last passed level", () => {
  const result = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 500, ZERO);
  assert.strictEqual(result.currentLevel.id, "recLvl2");
  assert.ok(result.currentLevel.xpRequired <= 200);
});

test("missing gate rule passes (no silent block)", () => {
  const emptyMap = buildGateRuleMap([]);
  const result = determineAllowedLevelWithGateBlocking(LEVELS, emptyMap, 400, ZERO);
  assert.strictEqual(result.gateBlocked, false);
  assert.strictEqual(result.currentLevel.id, "recLvl3");
  assert.strictEqual(evaluateGate(null, ZERO).passes, true);
});

test("multiple enrollments are independent XP ledgers (caller isolation)", () => {
  // Engine is per-call; different enrollment stats must be supplied separately.
  const enrA = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 400, ZERO);
  const enrB = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 400, {
    totalSubmissions: 10,
    totalHomeworkCompletions: 2,
    totalVideoSubmissions: 2,
    totalZoomAttendances: 0,
    longestStreakDays: 0,
  });
  assert.strictEqual(enrA.gateBlocked, true);
  assert.strictEqual(enrB.gateBlocked, false);
  assert.notStrictEqual(enrA.currentLevel.id, enrB.currentLevel.id);
});

test("historical low XP enrollment cannot inherit another enrollment level", () => {
  const historical = determineAllowedLevelWithGateBlocking(LEVELS, GATES, 0, ZERO);
  assert.strictEqual(historical.currentLevel.id, "recLvl1");
});

console.log("agent4-level-gate-matrix: all tests passed");
