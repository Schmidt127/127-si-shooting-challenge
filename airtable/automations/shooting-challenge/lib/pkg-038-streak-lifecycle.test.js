#!/usr/bin/env node
/**
 * PKG-038 regression coverage for the 053 -> 054 first-create handoff.
 *
 * Run:
 *   node airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const AUTOMATIONS_DIR = path.join(__dirname, "..");
const SOURCE_053 = fs.readFileSync(
  path.join(
    AUTOMATIONS_DIR,
    "053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js",
  ),
  "utf8",
);
const PACKET = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "docs",
    "deploy-checklists",
    "PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md",
  ),
  "utf8",
);

const SOURCE_KEY = "STREAK_XP|recEnrollment|recAchievement|2026-08-01";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

function createLifecycleState() {
  return {
    nextOccurrenceId: 1,
    nextXpEventId: 1,
    occurrences: new Map(),
    xpEvents: new Map(),
    handoffEvents: [],
  };
}

function run053(state, targetExists) {
  const occurrenceId = "recOccurrence";
  let occurrence = state.occurrences.get(occurrenceId);

  if (!targetExists) {
    if (occurrence) {
      occurrence.active = false;
      occurrence.sourceStatus = "Error";
      state.handoffEvents.push({ type: "update", occurrenceId, sourceStatus: "Error" });
    }
    return occurrenceId;
  }

  if (!occurrence) {
    occurrence = {
      id: occurrenceId,
      active: true,
      sourceStatus: "",
    };
    state.occurrences.set(occurrenceId, occurrence);
    state.handoffEvents.push({ type: "create", occurrenceId, sourceStatus: "" });
  }

  occurrence.active = true;
  occurrence.sourceStatus = "Ready for XP";
  state.handoffEvents.push({
    type: "update",
    occurrenceId,
    sourceStatus: "Ready for XP",
  });
  return occurrenceId;
}

function run054(state, occurrenceId) {
  const occurrence = state.occurrences.get(occurrenceId);
  if (!occurrence) throw new Error(`Missing occurrence ${occurrenceId}`);

  if (!occurrence.active) {
    const event = [...state.xpEvents.values()].find(
      (candidate) => candidate.occurrenceId === occurrenceId,
    );
    if (event) event.active = false;
    return event ? event.id : "";
  }

  if (occurrence.sourceStatus !== "Ready for XP") return "";

  let event = [...state.xpEvents.values()].find(
    (candidate) => candidate.sourceKey === SOURCE_KEY,
  );
  if (!event) {
    event = {
      id: `recXpEvent${state.nextXpEventId++}`,
      occurrenceId,
      sourceKey: SOURCE_KEY,
      active: true,
    };
    state.xpEvents.set(event.id, event);
  } else {
    event.active = true;
  }

  occurrence.sourceStatus = "Awarded";
  return event.id;
}

test("053 v5.5 creates before Ready and performs a separate Ready update", () => {
  assert.match(SOURCE_053, /\* Version: 5\.5/);

  const createStart = SOURCE_053.indexOf("const recordsToCreate = [];");
  const createEnd = SOURCE_053.indexOf(
    "if (recordsToCreate.length > 0)",
    createStart,
  );
  const createSection = SOURCE_053.slice(createStart, createEnd);
  const createCall = SOURCE_053.indexOf(
    "await batchCreate(streakOccurrencesTable, recordsToCreate);",
    createEnd,
  );
  const readyUpdate = SOURCE_053.indexOf(
    "addWritable(canonicalFields, streakOccurrencesTable, CONFIG.streakOccurrences.sourceStatus, CONFIG.values.statusReady);",
    createCall,
  );
  const updateCall = SOURCE_053.indexOf(
    "await batchUpdate(streakOccurrencesTable, recordsToUpdate);",
    readyUpdate,
  );

  assert.ok(!createSection.includes("CONFIG.streakOccurrences.sourceStatus"));
  assert.ok(createCall > createEnd);
  assert.ok(readyUpdate > createCall);
  assert.ok(updateCall > readyUpdate);
});

test("first-create reaches 054 through a real record update", () => {
  const state = createLifecycleState();
  const occurrenceId = run053(state, true);

  assert.deepStrictEqual(state.handoffEvents, [
    { type: "create", occurrenceId, sourceStatus: "" },
    { type: "update", occurrenceId, sourceStatus: "Ready for XP" },
  ]);
  assert.strictEqual(run054(state, occurrenceId), "recXpEvent1");
  assert.strictEqual(state.xpEvents.size, 1);
});

test("replay preserves one occurrence and one XP Event", () => {
  const state = createLifecycleState();
  const occurrenceId = run053(state, true);
  const firstXpEventId = run054(state, occurrenceId);

  run053(state, true);
  const replayXpEventId = run054(state, occurrenceId);

  assert.strictEqual(replayXpEventId, firstXpEventId);
  assert.strictEqual(state.occurrences.size, 1);
  assert.strictEqual(state.xpEvents.size, 1);
});

test("withdrawal and restoration preserve occurrence and XP Event IDs", () => {
  const state = createLifecycleState();
  const occurrenceId = run053(state, true);
  const xpEventId = run054(state, occurrenceId);

  run053(state, false);
  assert.strictEqual(run054(state, occurrenceId), xpEventId);
  assert.strictEqual(state.xpEvents.get(xpEventId).active, false);

  run053(state, true);
  assert.strictEqual(run054(state, occurrenceId), xpEventId);
  assert.strictEqual(state.xpEvents.get(xpEventId).active, true);
  assert.strictEqual(state.occurrences.size, 1);
  assert.strictEqual(state.xpEvents.size, 1);
});

test("PKG-038 packet references the corrected 053 version", () => {
  assert.match(PACKET, /Streak occurrence topology \| 053 \*\*v5\.5\*\*/);
  assert.match(PACKET, /Paste \*\*053 v5\.5\*\*, then \*\*054 v5\.8\*\*/);
});

console.log("pkg-038-streak-lifecycle: all tests passed");
