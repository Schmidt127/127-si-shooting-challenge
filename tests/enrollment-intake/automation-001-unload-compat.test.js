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

function findExistingEnrollmentForSeason(enrollments, currentRecordId, athleteId, schoolYear) {
  const matches = enrollments.filter((candidate) =>
    candidate.id !== currentRecordId &&
    candidate.athlete_id === athleteId &&
    candidate.school_year === schoolYear
  );

  matches.sort((a, b) => {
    if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
    const createdComparison = String(a.createdTime || "").localeCompare(String(b.createdTime || ""));
    if (createdComparison !== 0) return createdComparison;
    return String(a.id).localeCompare(String(b.id));
  });

  return matches[0] || null;
}

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("001 is version v5.3 with unloadData compatibility retained", () => {
  assert.match(source, /Version:\s*v5\.3/);
  assert.match(source, /unloadData/);
  assert.match(source, /typeof queryResult\?\.unloadData === "function"/);
  assert.match(source, /recQP4N5acTdK40uZ/);
});

test("repeat registration is blocked against the active enrollment in the same school year", () => {
  const existing = findExistingEnrollmentForSeason(
    [
      { id: "recOld", athlete_id: "recAthlete", school_year: "2026-2027", active: true, createdTime: "2026-08-01T00:00:00.000Z" },
      { id: "recCurrent", athlete_id: "recAthlete", school_year: "2026-2027", active: false, createdTime: "2026-08-11T00:00:00.000Z" },
    ],
    "recCurrent",
    "recAthlete",
    "2026-2027"
  );
  assert.strictEqual(existing.id, "recOld");
  assert.match(source, /duplicate-enrollment-blocked/);
  assert.match(source, /duplicateOfEnrollmentId/);
  assert.match(source, /\[CONFIG\.enrollments\.athleteLink\]: \[\]/);
  assert.match(source, /\[CONFIG\.enrollments\.active\]: false/);
});

test("a returning athlete may enroll in a different school year", () => {
  const existing = findExistingEnrollmentForSeason(
    [
      { id: "recPrior", athlete_id: "recAthlete", school_year: "2025-2026", active: true },
      { id: "recCurrent", athlete_id: "recAthlete", school_year: "2026-2027", active: false },
    ],
    "recCurrent",
    "recAthlete",
    "2026-2027"
  );
  assert.strictEqual(existing, null);
});

test("duplicate selection is deterministic and prefers an active canonical enrollment", () => {
  const existing = findExistingEnrollmentForSeason(
    [
      { id: "recInactiveOlder", athlete_id: "recAthlete", school_year: "2026-2027", active: false, createdTime: "2026-07-01T00:00:00.000Z" },
      { id: "recActive", athlete_id: "recAthlete", school_year: "2026-2027", active: true, createdTime: "2026-08-01T00:00:00.000Z" },
      { id: "recCurrent", athlete_id: "recAthlete", school_year: "2026-2027", active: false, createdTime: "2026-08-11T00:00:00.000Z" },
    ],
    "recCurrent",
    "recAthlete",
    "2026-2027"
  );
  assert.strictEqual(existing.id, "recActive");
});

test("enrollment is inactive while uniqueness is checked and activates only after passing", () => {
  const deactivateIndex = source.indexOf("downstream grade-band and welcome-email automations");
  const dedupeIndex = source.indexOf("Enforce One Enrollment Per Athlete and School Year");
  const activateIndex = source.lastIndexOf("[CONFIG.enrollments.active]: true");
  assert.ok(deactivateIndex > 0);
  assert.ok(dedupeIndex > deactivateIndex);
  assert.ok(activateIndex > dedupeIndex);
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
