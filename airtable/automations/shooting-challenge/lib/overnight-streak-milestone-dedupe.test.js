#!/usr/bin/env node
/**
 * Overnight Agent 2 — streak calculation, shot milestone crossing, and
 * XP/unlock dedupe coverage against production shared helpers.
 * Milestone fixtures mirror the live PROD K-2 band captured 2026-07-23
 * (docs/overnight/config-xp/prod-config-snapshot.json).
 * Run: node airtable/automations/shooting-challenge/lib/overnight-streak-milestone-dedupe.test.js
 */

"use strict";

const assert = require("assert");
const {
  buildStreakBlocks,
  unlockStreaksFromBlocks,
  buildStreakXpSourceKey,
  buildShotMilestoneSourceKey,
  detectShotMilestoneCrossings,
  decideXpEventAction,
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

const ENR = "recEnrollment0001";
const ACH3 = "recAchStreak3Day1";
const ACH5 = "recAchStreak5Day1";

// 053 contract: callers dedupe + sort date keys before building blocks.
function toSortedUniqueKeys(dateKeys) {
  return [...new Set(dateKeys)].sort();
}

// PROD K-2 active milestones (500..4000), synthetic ids.
const K2_MILESTONES = [
  { id: "recMsK2000000500a", threshold: 500 },
  { id: "recMsK2000001000a", threshold: 1000 },
  { id: "recMsK2000001500a", threshold: 1500 },
  { id: "recMsK2000002000a", threshold: 2000 },
  { id: "recMsK2000002400a", threshold: 2400 },
  { id: "recMsK2000003000a", threshold: 3000 },
  { id: "recMsK2000003500a", threshold: 3500 },
  { id: "recMsK2000004000a", threshold: 4000 },
];
// PROD 3-4 band starts at 1250.
const BAND34_MILESTONES = [
  { id: "recMs3400001250a1", threshold: 1250 },
  { id: "recMs3400002500a1", threshold: 2500 },
];

// --- streak block construction ---

test("consecutive dates form one block", () => {
  const blocks = buildStreakBlocks(["2026-07-01", "2026-07-02", "2026-07-03"]);
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].length, 3);
});

test("duplicate same-day submissions must be deduped by the caller", () => {
  // Raw duplicate keys would split blocks (daysBetween === 0), which is why
  // 053 dedupes to distinct date keys first. Verify both sides of the contract.
  const raw = ["2026-07-01", "2026-07-02", "2026-07-02", "2026-07-03"];
  const rawBlocks = buildStreakBlocks(raw);
  assert.notStrictEqual(rawBlocks.length, 1); // undeduped input breaks the run
  const blocks = buildStreakBlocks(toSortedUniqueKeys(raw));
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].length, 3);
});

test("gap in dates splits into two blocks", () => {
  const blocks = buildStreakBlocks(["2026-07-01", "2026-07-02", "2026-07-05", "2026-07-06"]);
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.length), [2, 2]);
});

test("backdated insertion repairs a broken streak", () => {
  const before = buildStreakBlocks(["2026-07-01", "2026-07-02", "2026-07-04", "2026-07-05"]);
  assert.strictEqual(before.length, 2);
  const after = buildStreakBlocks(
    toSortedUniqueKeys(["2026-07-01", "2026-07-02", "2026-07-04", "2026-07-05", "2026-07-03"])
  );
  assert.strictEqual(after.length, 1);
  assert.strictEqual(after[0].length, 5);
});

test("backdated insertion extends a streak backwards", () => {
  const after = buildStreakBlocks(
    toSortedUniqueKeys(["2026-07-02", "2026-07-03", "2026-07-01"])
  );
  assert.strictEqual(after.length, 1);
  assert.deepStrictEqual(after[0], ["2026-07-01", "2026-07-02", "2026-07-03"]);
});

test("month boundary is still consecutive", () => {
  const blocks = buildStreakBlocks(["2026-06-29", "2026-06-30", "2026-07-01"]);
  assert.strictEqual(blocks.length, 1);
});

// --- unlock thresholds ---

test("multiple thresholds unlock in one run (3 and 5 within a 6-day block)", () => {
  const blocks = buildStreakBlocks([
    "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06",
  ]);
  const unlocks = unlockStreaksFromBlocks(blocks, [3, 5, 7]);
  assert.deepStrictEqual(
    unlocks.map((u) => u.streakDays).sort((a, b) => a - b),
    [3, 5]
  );
  const three = unlocks.find((u) => u.streakDays === 3);
  assert.strictEqual(three.streakStartDate, "2026-07-01");
  assert.strictEqual(three.streakEndDate, "2026-07-03"); // block[threshold-1]
});

test("PROD threshold ladder 3/5/7/10/20/30 on a 10-day block", () => {
  const dates = [];
  for (let day = 1; day <= 10; day += 1) {
    dates.push(`2026-07-${String(day).padStart(2, "0")}`);
  }
  const unlocks = unlockStreaksFromBlocks(buildStreakBlocks(dates), [3, 5, 7, 10, 20, 30]);
  assert.deepStrictEqual(
    unlocks.map((u) => u.streakDays).sort((a, b) => a - b),
    [3, 5, 7, 10]
  );
});

test("repeat streak after break produces distinct end dates (repeat policy = Mike decision)", () => {
  // Two separate 3-day blocks. Current helpers emit one unlock per block; the
  // product decision on whether a repeat is awarded again lives in 053/054.
  const blocks = buildStreakBlocks([
    "2026-07-01", "2026-07-02", "2026-07-03",
    "2026-07-10", "2026-07-11", "2026-07-12",
  ]);
  const unlocks = unlockStreaksFromBlocks(blocks, [3]);
  assert.strictEqual(unlocks.length, 2);
  const keys = unlocks.map((u) => buildStreakXpSourceKey(ENR, ACH3, u.streakEndDate));
  assert.notStrictEqual(keys[0], keys[1]);
});

// --- streak source keys ---

test("streak XP source key format STREAK_XP|enr|ach|endDate is deterministic", () => {
  const key = buildStreakXpSourceKey(ENR, ACH3, "2026-07-03");
  assert.strictEqual(key, `STREAK_XP|${ENR}|${ACH3}|2026-07-03`);
  assert.strictEqual(key, buildStreakXpSourceKey(ENR, ACH3, "2026-07-03"));
  assert.notStrictEqual(key, buildStreakXpSourceKey(ENR, ACH5, "2026-07-03"));
});

test("streak XP source key rejects malformed end dates", () => {
  assert.throws(() => buildStreakXpSourceKey(ENR, ACH3, "7/3/2026"), /Invalid streakEndDateKey/);
  assert.throws(() => buildStreakXpSourceKey(ENR, ACH3, ""), /Invalid streakEndDateKey/);
});

// --- shot milestone crossings ---

test("one shot below threshold: no crossing", () => {
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 0, currentShotTotal: 499, milestones: K2_MILESTONES,
  });
  assert.strictEqual(crossings.length, 0);
});

test("exact threshold crosses", () => {
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 499, currentShotTotal: 500, milestones: K2_MILESTONES,
  });
  assert.strictEqual(crossings.length, 1);
  assert.strictEqual(crossings[0].threshold, 500);
});

test("one shot above threshold crosses once", () => {
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 480, currentShotTotal: 501, milestones: K2_MILESTONES,
  });
  assert.strictEqual(crossings.length, 1);
});

test("multiple thresholds crossed at once (backfill scenario)", () => {
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 400, currentShotTotal: 1600, milestones: K2_MILESTONES,
  });
  assert.deepStrictEqual(crossings.map((c) => c.threshold), [500, 1000, 1500]);
});

test("rerun with already-unlocked source keys is a no-op", () => {
  const first = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 400, currentShotTotal: 600, milestones: K2_MILESTONES,
  });
  assert.strictEqual(first.length, 1);
  const rerun = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 400, currentShotTotal: 600,
    milestones: K2_MILESTONES, unlockedSourceKeys: first.map((c) => c.sourceKey),
  });
  assert.strictEqual(rerun.length, 0);
});

test("changed Grade Band swaps the milestone ladder", () => {
  const k2 = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 0, currentShotTotal: 1300, milestones: K2_MILESTONES,
  });
  assert.deepStrictEqual(k2.map((c) => c.threshold), [500, 1000]);
  const band34 = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 0, currentShotTotal: 1300, milestones: BAND34_MILESTONES,
  });
  assert.deepStrictEqual(band34.map((c) => c.threshold), [1250]);
});

test("missing rule set (no active milestones) yields no crossings", () => {
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 0, currentShotTotal: 99999, milestones: [],
  });
  assert.strictEqual(crossings.length, 0);
});

test("duplicate active milestone records produce duplicate crossings (must be caught upstream)", () => {
  // Documents why 066 validates for one active rule per threshold: the pure
  // helper treats each record independently.
  const dup = [...K2_MILESTONES, { id: "recMsK2Dup000500b", threshold: 500 }];
  const crossings = detectShotMilestoneCrossings({
    enrollmentId: ENR, previousShotTotal: 0, currentShotTotal: 500, milestones: dup,
  });
  assert.strictEqual(crossings.length, 2);
});

test("milestone source key format SHOT_MILESTONE|enr|milestone", () => {
  const key = buildShotMilestoneSourceKey(ENR, K2_MILESTONES[0].id);
  assert.strictEqual(key, `SHOT_MILESTONE|${ENR}|${K2_MILESTONES[0].id}`);
});

// --- XP event dedupe decisions (010/054/059/066 rerun safety) ---

test("dedupe: create when source key unseen", () => {
  const decision = decideXpEventAction({ sourceKey: "STREAK_XP|a|b|2026-07-03", existingKeys: [] });
  assert.strictEqual(decision.action, "create");
});

test("dedupe: skip when source key already exists (rerun after unlock)", () => {
  const key = buildStreakXpSourceKey(ENR, ACH3, "2026-07-03");
  const decision = decideXpEventAction({ sourceKey: key, existingKeys: [key] });
  assert.strictEqual(decision.action, "skip_existing");
});

test("dedupe: repair link when unlock points at XP event with missing key", () => {
  const key = buildShotMilestoneSourceKey(ENR, K2_MILESTONES[0].id);
  const decision = decideXpEventAction({
    sourceKey: key, existingKeys: [], linkedXpEventId: "recXpEvent0000001", linkedSourceKey: "",
  });
  assert.strictEqual(decision.action, "repair_link");
});

test("dedupe: error when linked XP event belongs to another source (no stealing)", () => {
  const decision = decideXpEventAction({
    sourceKey: buildShotMilestoneSourceKey(ENR, K2_MILESTONES[0].id),
    existingKeys: [],
    linkedXpEventId: "recXpEvent0000001",
    linkedSourceKey: buildShotMilestoneSourceKey(ENR, K2_MILESTONES[1].id),
  });
  assert.strictEqual(decision.action, "error");
  assert.strictEqual(decision.reason, "linked_xp_belongs_to_other_source");
});

test("dedupe: blank source key is an error, never a silent create", () => {
  const decision = decideXpEventAction({ sourceKey: "", existingKeys: [] });
  assert.strictEqual(decision.action, "error");
});

console.log("overnight-streak-milestone-dedupe: all tests passed");
