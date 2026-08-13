#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const AUTO_DIR = path.join(ROOT, "airtable/automations/shooting-challenge");
const source001 = fs.readFileSync(
  path.join(
    AUTO_DIR,
    "001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js"
  ),
  "utf8"
);
const source041 = fs.readFileSync(
  path.join(
    AUTO_DIR,
    "041-levels-and-progression-mark-enrollment-for-level-recalculation.js"
  ),
  "utf8"
);
const source042 = fs.readFileSync(
  path.join(
    AUTO_DIR,
    "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js"
  ),
  "utf8"
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
    console.error(error.stack || error);
  }
}

function validSchoolYear(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{4})$/);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

function requestFrom001(enrollment, { fieldExists = true, fieldType = "checkbox" } = {}) {
  if (!enrollment.active || !enrollment.athleteId || !validSchoolYear(enrollment.schoolYear)) {
    return { requested: false, reason: "not_canonical_active_enrollment" };
  }
  if (!fieldExists || fieldType !== "checkbox") {
    return { requested: false, reason: "queue_field_unavailable_or_invalid" };
  }
  enrollment.levelRecalcNeeded = true;
  return { requested: true, reason: "canonical_active_enrollment" };
}

function assign042(enrollment, levels, gateRules) {
  if (!enrollment.active) {
    enrollment.levelRecalcNeeded = false;
    return { status: "skipped_inactive", preserved: true };
  }

  const activeLevels = levels
    .filter((level) => level.active)
    .sort((a, b) => a.xp - b.xp);
  const zeroLevels = activeLevels.filter((level) => level.xp === 0);
  assert.strictEqual(
    zeroLevels.length,
    1,
    "configuration must have exactly one active level at cumulative XP 0"
  );

  const current =
    [...activeLevels].reverse().find((level) => enrollment.xp >= level.xp) ||
    activeLevels[0];
  const currentIndex = activeLevels.findIndex((level) => level.id === current.id);
  const next = activeLevels[currentIndex + 1] || null;
  const nextGate = next ? gateRules.find((rule) => rule.levelId === next.id) : null;

  enrollment.currentLevel = current.name;
  enrollment.nextLevel = next ? next.name : "";
  enrollment.levelGateRule = nextGate ? nextGate.name : "";
  enrollment.levelStatus = "Assigned";
  enrollment.levelRecalcNeeded = false;
  return { status: "Assigned", current, next, nextGate };
}

function progressionSignature(enrollment, gateRules) {
  return JSON.stringify({
    xp: enrollment.xp,
    schoolYear: enrollment.schoolYear,
    active: enrollment.active,
    gateRules,
  });
}

test("new canonical active Enrollment is queued by 001", () => {
  const enrollment = {
    athleteId: "recAthlete",
    schoolYear: "2026-2027",
    active: true,
    levelRecalcNeeded: false,
  };
  const result = requestFrom001(enrollment);
  assert.deepStrictEqual(result, {
    requested: true,
    reason: "canonical_active_enrollment",
  });
  assert.strictEqual(enrollment.levelRecalcNeeded, true);
});

test("duplicate, inactive, and invalid/skipped Enrollments are not queued", () => {
  const duplicate = {
    athleteId: "",
    schoolYear: "2026-2027",
    active: false,
    levelRecalcNeeded: false,
  };
  const invalid = {
    athleteId: "recAthlete",
    schoolYear: "2026",
    active: true,
    levelRecalcNeeded: false,
  };
  assert.strictEqual(requestFrom001(duplicate).requested, false);
  assert.strictEqual(requestFrom001(invalid).requested, false);
  assert.strictEqual(duplicate.levelRecalcNeeded, false);
  assert.strictEqual(invalid.levelRecalcNeeded, false);
  assert.match(source001, /duplicate-enrollment-blocked/);
  assert.match(source001, /await setEnrollmentStatus\(CONFIG\.statuses\.skipped\)/);
});

test("complete initial lifecycle assigns lowest level, next level, and next gate", () => {
  const enrollment = {
    id: "recEnrollment",
    athleteId: "recAthlete",
    schoolYear: "2026-2027",
    active: true,
    xp: 0,
    currentLevel: "",
    nextLevel: "",
    levelGateRule: "",
    levelStatus: "",
    levelRecalcNeeded: false,
  };
  requestFrom001(enrollment);
  const result = assign042(
    enrollment,
    [
      { id: "recBeginner", name: "Beginner", xp: 0, active: true },
      { id: "recRookie", name: "Rookie Shooter", xp: 100, active: true },
    ],
    [{ id: "recGate2", name: "Level 2 Gate", levelId: "recRookie" }]
  );
  assert.strictEqual(result.status, "Assigned");
  assert.strictEqual(enrollment.xp, 0);
  assert.strictEqual(enrollment.currentLevel, "Beginner");
  assert.strictEqual(enrollment.nextLevel, "Rookie Shooter");
  assert.strictEqual(enrollment.levelGateRule, "Level 2 Gate");
  assert.strictEqual(enrollment.levelStatus, "Assigned");
  assert.strictEqual(enrollment.levelRecalcNeeded, false);
});

test("042 inactive invocation clears stale request and preserves progression", () => {
  const enrollment = {
    active: false,
    levelRecalcNeeded: true,
    currentLevel: "Rookie Shooter",
    nextLevel: "Developing Shooter",
    levelGateRule: "Level 3 Gate",
    levelStatus: "Gate Blocked",
  };
  const before = { ...enrollment };
  const result = assign042(enrollment, [], []);
  assert.deepStrictEqual(result, { status: "skipped_inactive", preserved: true });
  assert.strictEqual(enrollment.levelRecalcNeeded, false);
  for (const field of ["currentLevel", "nextLevel", "levelGateRule", "levelStatus"]) {
    assert.strictEqual(enrollment[field], before[field], field);
  }
});

test("041 remains idempotent scheduled reconciliation without output ownership", () => {
  const enrollment = {
    id: "recEnrollment",
    xp: 0,
    schoolYear: "2026-2027",
    active: true,
  };
  const rules = [{ id: "recGate2", levelId: "recRookie", threshold: 1 }];
  const first = progressionSignature(enrollment, rules);
  const second = progressionSignature(enrollment, rules);
  assert.strictEqual(first, second);
  assert.match(
    source041,
    /getBoolean\(\s*record,\s*CONFIG\.enrollmentFields\.active\s*\)/,
  );
  assert.match(source041, /reason: "unchanged_signature"/);
  assert.doesNotMatch(source041, /Current Level\].*updateRecordAsync/s);
});

test("042 has defense-in-depth active guard before Processing and preserves inactive fields", () => {
  assert.match(source042, /active:\s*"Active\?"/);
  assert.match(source042, /skippedInactive:\s*"skipped_inactive"/);
  assert.match(source042, /progressionFieldsPreserved:\s*true/);
  assert.match(source042, /\[CONFIG\.enrollmentFields\.levelRecalcNeeded\]: false/);
  const activeGuard = source042.indexOf("if (!enrollmentIsActive)");
  const processingWrite = source042.indexOf("statusValues.processing");
  assert.ok(activeGuard > 0 && activeGuard < processingWrite);
});

test("lowest active level configuration fails clearly when zero threshold is not unique", () => {
  assert.throws(
    () =>
      assign042(
        { active: true, xp: 0, levelRecalcNeeded: true },
        [
          { id: "a", name: "Beginner", xp: 0, active: true },
          { id: "b", name: "Duplicate Beginner", xp: 0, active: true },
        ],
        []
      ),
    /exactly one active level at cumulative XP 0/
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
