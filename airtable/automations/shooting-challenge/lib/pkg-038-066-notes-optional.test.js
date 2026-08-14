#!/usr/bin/env node
/**
 * PKG-038 regression coverage for an Athlete Achievement Unlocks table
 * without a Notes field.
 *
 * Run:
 *   node airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const AUTOMATIONS_DIR = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(
  path.join(
    AUTOMATIONS_DIR,
    "066-achievements-and-milestones-create-shot-milestone-unlocks.js",
  ),
  "utf8",
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const unlocksWithoutNotes = {
  name: "Athlete Achievement Unlocks",
  fields: [
    { name: "Enrollment", type: "multipleRecordLinks" },
    { name: "Achievement", type: "multipleRecordLinks" },
    { name: "Milestone Source Key", type: "singleLineText" },
    { name: "Active?", type: "checkbox" },
    { name: "XP Award Status", type: "singleSelect" },
  ],
};

function fieldExists(table, fieldName) {
  return table.fields.some((field) => field.name === fieldName);
}

function getOptionalText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function addIfWritable(table, payload, fieldName, value) {
  if (!fieldExists(table, fieldName)) return;
  payload[fieldName] = value;
}

test("066 v3.8 documents optional Notes compatibility", () => {
  assert.match(SOURCE, /Version:\s*v3\.8/);
  assert.match(SOURCE, /version:\s*"v3\.8"/);
  assert.match(SOURCE, /function getOptionalText\(record, table, fieldName\)/);
  assert.match(
    SOURCE,
    /if \(!fieldExists\(table, fieldName\)\) return "";\s*return getText\(record, fieldName\);/s,
  );
});

test("missing Notes is never read or written", () => {
  const accessedFields = [];
  const unlock = {
    getCellValueAsString(fieldName) {
      accessedFields.push(fieldName);
      if (fieldName === "Notes") {
        throw new Error("Notes must not be read when the field is absent");
      }
      return "fixture";
    },
  };
  const updatePayload = {};

  assert.strictEqual(
    getOptionalText(unlock, unlocksWithoutNotes, "Notes"),
    "",
  );
  addIfWritable(unlocksWithoutNotes, updatePayload, "Notes", "should skip");

  assert.deepStrictEqual(accessedFields, []);
  assert.deepStrictEqual(updatePayload, {});
  assert.doesNotMatch(
    SOURCE,
    /getText\([^)]*CONFIG\.unlockFields\.notes/,
  );
  assert.doesNotMatch(
    SOURCE,
    /getCellValue(?:AsString)?\([^)]*CONFIG\.unlockFields\.notes/,
  );
});

test("milestone lifecycle and XP ownership contracts remain present", () => {
  assert.match(SOURCE, /SHOT_MILESTONE\|/);
  assert.match(SOURCE, /existingUnlockBySourceKey/);
  assert.match(SOURCE, /withdrawalUpdates/);
  assert.match(SOURCE, /createRecordsInBatches/);
  assert.match(SOURCE, /XP Award Status/);
  assert.match(SOURCE, /Run Shot Milestone Check\?/);
  assert.match(SOURCE, /059/);
});

console.log("pkg-038-066-notes-optional: all tests passed");
