#!/usr/bin/env node
/**
 * Automation 001 — unloadData runtime compatibility + match-key contracts.
 * Run: node tests/enrollment-intake/automation-001-unload-compat.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js"
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL - ${name}`);
    console.error(`  ${error && error.stack ? error.stack : error}`);
  }
}

/** Mirrors Automation 001 unloadQuerySafe (Airtable script cannot import Node modules). */
function unloadQuerySafe(queryResult, logFn = () => {}) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      logFn("Query unloadData skipped/failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildAthleteMatchKey(parentEmail, firstName, lastName) {
  return [normalizeEmail(parentEmail), normalizeText(firstName), normalizeText(lastName)].join("|");
}

function findMatchingAthleteByIdentity(athletes, athleteMatchKey, firstName, lastName, parentEmail) {
  const byKey = athletes.find((a) => a.athlete_match_key === athleteMatchKey);
  if (byKey) return { record: byKey, matchMethod: "formula-match-key" };

  const byFields = athletes.find(
    (a) =>
      normalizeText(a.first_name) === normalizeText(firstName) &&
      normalizeText(a.last_name) === normalizeText(lastName) &&
      normalizeEmail(a.parent_email) === normalizeEmail(parentEmail)
  );
  if (byFields) return { record: byFields, matchMethod: "first-last-parent-email" };
  return { record: null, matchMethod: "none" };
}

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("001 is version v5.2 with unloadData compatibility note", () => {
  assert.match(source, /Version:\s*v5\.2/);
  assert.match(source, /unloadData/);
  assert.match(source, /typeof queryResult\?\.unloadData === "function"/);
  assert.match(source, /recQP4N5acTdK40uZ/);
});

test("001 has no bare query.unloadData() calls outside unloadQuerySafe", () => {
  const withoutHelper = source.replace(
    /function unloadQuerySafe\([\s\S]*?\n\}/,
    "/* unloadQuerySafe omitted for bare-call scan */"
  );
  const bare = withoutHelper.match(/^\s*[A-Za-z0-9_]+\.unloadData\(\);/gm) || [];
  assert.deepStrictEqual(bare, [], `Unexpected bare unloadData calls: ${bare.join(", ")}`);
  assert.match(source, /function unloadQuerySafe\(/);
  assert.ok((source.match(/unloadQuerySafe\(/g) || []).length >= 3);
});

test("unloadQuerySafe calls unloadData when present", () => {
  let calls = 0;
  unloadQuerySafe({ unloadData: () => { calls += 1; } });
  assert.strictEqual(calls, 1);
});

test("unloadQuerySafe no-ops when unloadData missing", () => {
  assert.doesNotThrow(() => unloadQuerySafe({ records: [] }));
  assert.doesNotThrow(() => unloadQuerySafe(null));
  assert.doesNotThrow(() => unloadQuerySafe(undefined));
});

test("unloadQuerySafe swallows unloadData throw without masking caller", () => {
  const logs = [];
  assert.doesNotThrow(() =>
    unloadQuerySafe(
      {
        unloadData: () => {
          throw new Error("boom");
        },
      },
      (msg) => logs.push(msg)
    )
  );
  assert.ok(logs.length >= 1);
});

test("Testing Schmidt match key uses parent email + first + last", () => {
  const key = buildAthleteMatchKey(
    "mschmidt@fairfield.k12.mt.us",
    "Testing",
    "Schmidt"
  );
  assert.strictEqual(key, "mschmidt@fairfield.k12.mt.us|testing|schmidt");
});

test("existing Testing Schmidt athlete is reused (no create)", () => {
  const athletes = [
    {
      athlete_id: "recAthSchmidtExisting",
      first_name: "Testing",
      last_name: "Schmidt",
      parent_email: "mschmidt@fairfield.k12.mt.us",
      athlete_match_key: "mschmidt@fairfield.k12.mt.us|testing|schmidt",
    },
  ];
  const key = buildAthleteMatchKey(
    "mschmidt@fairfield.k12.mt.us",
    "Testing",
    "Schmidt"
  );
  const match = findMatchingAthleteByIdentity(
    athletes,
    key,
    "Testing",
    "Schmidt",
    "mschmidt@fairfield.k12.mt.us"
  );
  assert.ok(match.record);
  assert.strictEqual(match.record.athlete_id, "recAthSchmidtExisting");
  assert.notStrictEqual(match.matchMethod, "none");
});

test("partial rerun with existing link prefers already-linked path contract", () => {
  // Contract: when Enrollment.Athlete is already set, 001 must not create another Athlete.
  const existingLinkedAthleteId = "recAthSchmidtExisting";
  const enrollmentInput = {
    recordId: "recQP4N5acTdK40uZ",
    existingLinkedAthleteId,
    athleteMatchKey: "mschmidt@fairfield.k12.mt.us|testing|schmidt",
  };
  assert.ok(enrollmentInput.existingLinkedAthleteId.startsWith("rec"));
  assert.match(source, /existingLinkedAthleteId/);
  assert.match(source, /already-linked/);
  assert.match(source, /matched-existing-and-linked/);
});

test("missing required enrollment data still has skipped path", () => {
  assert.match(source, /Missing required Enrollment data/);
  assert.match(source, /CONFIG\.statuses\.skipped/);
});

test("field/table/output contracts unchanged", () => {
  assert.match(source, /enrollments:\s*"Enrollments"/);
  assert.match(source, /athletes:\s*"Athletes"/);
  assert.match(source, /setOutputSafe\("athleteId"/);
  assert.match(source, /setOutputSafe\("athleteMatchKey"/);
  assert.match(source, /setOutputSafe\("actionTaken"/);
  assert.match(source, /setOutputSafe\("statusOut"/);
  assert.match(source, /setOutputSafe\("errorOut"/);
  assert.match(source, /setOutputSafe\("debugStep"/);
  assert.match(source, /"Parent Email - Cleaned"/);
  assert.match(source, /"Athlete Match Status"/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
