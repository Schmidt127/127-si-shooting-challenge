#!/usr/bin/env node
/**
 * Automation 002 — unloadData runtime compatibility + Grade Band match contracts.
 * Run: node tests/enrollment-intake/automation-002-unload-compat.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js"
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

/** Mirrors Automation 002 unloadQuerySafe (Airtable script cannot import Node modules). */
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

function normalizeGradeToNumber(gradeText) {
  const value = String(gradeText || "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  const lower = value.toLowerCase();
  if (["pre k", "pre-k", "prek", "pk", "preschool"].includes(lower)) return -1;
  if (["k", "kindergarten", "kindergarden"].includes(lower)) return 0;
  const ordinal = value.match(/^(\d+)(?:st|nd|rd|th)?$/i);
  if (ordinal) {
    const n = Number(ordinal[1]);
    return Number.isFinite(n) ? n : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Mirrors findMatchingGradeBands range logic with plain objects
 * (schema: Active? + Min Grade / Max Grade / Sort Order / Grade Band Name).
 */
function findMatchingGradeBands(gradeBands, gradeNumeric) {
  return gradeBands
    .map((record) => ({
      id: record.id,
      gradeBandName: record.gradeBandName,
      minGrade: record.minGrade,
      maxGrade: record.maxGrade,
      sortOrder: record.sortOrder ?? 999999,
      isActive: record.isActive !== false,
    }))
    .filter(
      (item) =>
        item.isActive &&
        item.minGrade !== null &&
        item.maxGrade !== null &&
        gradeNumeric >= item.minGrade &&
        gradeNumeric <= item.maxGrade
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.minGrade !== b.minGrade) return a.minGrade - b.minGrade;
      if (a.maxGrade !== b.maxGrade) return a.maxGrade - b.maxGrade;
      return String(a.gradeBandName || "").localeCompare(String(b.gradeBandName || ""));
    });
}

/** Canonical PROD active bands (names + typical min/max; IDs from grade-band audit). */
const LIVE_GRADE_BANDS = [
  { id: "recK7BDVSpHy2ipCS", gradeBandName: "K-2", minGrade: 0, maxGrade: 2, sortOrder: 1, isActive: true },
  { id: "reclWDQZzKbVBtdhG", gradeBandName: "3-4", minGrade: 3, maxGrade: 4, sortOrder: 2, isActive: true },
  { id: "recv9aWnHanY2sRgk", gradeBandName: "5-6", minGrade: 5, maxGrade: 6, sortOrder: 3, isActive: true },
  { id: "rec2VQFfGJa1ofA06", gradeBandName: "7-8", minGrade: 7, maxGrade: 8, sortOrder: 4, isActive: true },
  { id: "rec75ruo3XT5nSvaK", gradeBandName: "9-12", minGrade: 9, maxGrade: 12, sortOrder: 5, isActive: true },
  {
    id: "recg6zvMxWsFSn7sf",
    gradeBandName: "Grades 1–2",
    minGrade: 1,
    maxGrade: 2,
    sortOrder: 99,
    isActive: false,
  },
];

/**
 * Contract for 002 assignment path: reuse existing link; otherwise assign chosen once.
 * Does not invent a second assignment path.
 */
function planGradeBandAssignment({ existingGradeBandId, chosen, gradeValue }) {
  if (existingGradeBandId) {
    return {
      action: "reuse-existing",
      gradeBandId: existingGradeBandId,
      lastGradeUsed: gradeValue,
      writesLink: false,
    };
  }
  return {
    action: "assign",
    gradeBandId: chosen.id,
    gradeBandName: chosen.gradeBandName,
    lastGradeUsed: gradeValue,
    writesLink: true,
  };
}

/**
 * Cleanup must not replace a real matching error (finally + unloadQuerySafe contract).
 */
function matchThenCleanup(queryResult, matchFn) {
  let matchError = null;
  let chosen = null;
  try {
    chosen = matchFn();
  } catch (error) {
    matchError = error;
  } finally {
    unloadQuerySafe(queryResult);
  }
  if (matchError) throw matchError;
  return chosen;
}

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("002 is version v8.2 with unloadData compatibility note", () => {
  assert.match(source, /Version:\s*v8\.2/);
  assert.match(source, /Date Updated:\s*2026-08-05/);
  assert.match(source, /unloadData/);
  assert.match(source, /typeof queryResult\?\.unloadData === "function"/);
  assert.match(source, /recCyFEPeATOVNlr9/);
});

test("002 has no bare query.unloadData() calls outside unloadQuerySafe", () => {
  const withoutHelper = source.replace(
    /function unloadQuerySafe\([\s\S]*?\n\}/,
    "/* unloadQuerySafe omitted for bare-call scan */"
  );
  const bare = withoutHelper.match(/^\s*[A-Za-z0-9_]+\.unloadData\(\);/gm) || [];
  assert.deepStrictEqual(bare, [], `Unexpected bare unloadData calls: ${bare.join(", ")}`);
  assert.match(source, /function unloadQuerySafe\(/);
  assert.match(source, /finally\s*\{[\s\S]*?unloadQuerySafe\(gradeBandQuery\)/);
});

test("Grade 3 resolves to the 3-4 Grade Band by min/max (not hardcoded assignment path)", () => {
  const gradeNumeric = normalizeGradeToNumber("3");
  assert.strictEqual(gradeNumeric, 3);
  const matches = findMatchingGradeBands(LIVE_GRADE_BANDS, gradeNumeric);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].gradeBandName, "3-4");
  assert.strictEqual(matches[0].id, "reclWDQZzKbVBtdhG");
  assert.match(source, /findMatchingGradeBands/);
  assert.doesNotMatch(source, /gradeBandId:\s*"reclWDQZzKbVBtdhG"/);
});

test("empty Grade Band link is assigned from match", () => {
  const chosen = findMatchingGradeBands(LIVE_GRADE_BANDS, 3)[0];
  const plan = planGradeBandAssignment({
    existingGradeBandId: "",
    chosen,
    gradeValue: "3",
  });
  assert.strictEqual(plan.action, "assign");
  assert.strictEqual(plan.writesLink, true);
  assert.strictEqual(plan.gradeBandId, "reclWDQZzKbVBtdhG");
  assert.strictEqual(plan.lastGradeUsed, "3");
});

test("existing Grade Band link is reused when already correct", () => {
  const chosen = findMatchingGradeBands(LIVE_GRADE_BANDS, 3)[0];
  const plan = planGradeBandAssignment({
    existingGradeBandId: chosen.id,
    chosen,
    gradeValue: "3",
  });
  assert.strictEqual(plan.action, "reuse-existing");
  assert.strictEqual(plan.writesLink, false);
  assert.strictEqual(plan.gradeBandId, chosen.id);
  assert.strictEqual(plan.lastGradeUsed, "3");
  assert.match(source, /Already Assigned/);
  assert.match(source, /existingGradeBandId/);
});

test("Last Grade Used for Grade Band is updated on reuse and assign", () => {
  const chosen = findMatchingGradeBands(LIVE_GRADE_BANDS, 3)[0];
  const reuse = planGradeBandAssignment({
    existingGradeBandId: chosen.id,
    chosen,
    gradeValue: "3",
  });
  const assign = planGradeBandAssignment({
    existingGradeBandId: "",
    chosen,
    gradeValue: "3",
  });
  assert.strictEqual(reuse.lastGradeUsed, "3");
  assert.strictEqual(assign.lastGradeUsed, "3");
  assert.match(source, /Last Grade Used for Grade Band/);
  assert.match(source, /buildLastGradeUsedValue/);
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

test("unloadQuerySafe swallows unloadData throw as non-fatal", () => {
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

test("cleanup cannot mask a real grade-band matching error", () => {
  let unloadCalls = 0;
  assert.throws(
    () =>
      matchThenCleanup(
        {
          unloadData: () => {
            unloadCalls += 1;
            throw new Error("cleanup boom");
          },
        },
        () => {
          throw new Error('No active Grade Band match found for Grade "99" (numeric 99).');
        }
      ),
    /No active Grade Band match found/
  );
  assert.strictEqual(unloadCalls, 1);
});

test("partial prior execution can be safely rerun (already-linked path)", () => {
  // Contract: when Enrollment.Grade Band is already set, 002 must not write a conflicting link.
  const enrollment = {
    recordId: "recCyFEPeATOVNlr9",
    gradeValue: "3",
    existingGradeBandId: "reclWDQZzKbVBtdhG",
  };
  const chosen = findMatchingGradeBands(LIVE_GRADE_BANDS, normalizeGradeToNumber(enrollment.gradeValue))[0];
  const plan = planGradeBandAssignment({
    existingGradeBandId: enrollment.existingGradeBandId,
    chosen,
    gradeValue: enrollment.gradeValue,
  });
  assert.strictEqual(plan.writesLink, false);
  assert.strictEqual(plan.gradeBandId, enrollment.existingGradeBandId);
  assert.match(source, /already assigned before final write/i);
  assert.match(source, /Done - already assigned/);
});

test("no duplicate or conflicting Grade Band link is created", () => {
  const chosen = findMatchingGradeBands(LIVE_GRADE_BANDS, 3)[0];
  const first = planGradeBandAssignment({
    existingGradeBandId: "",
    chosen,
    gradeValue: "3",
  });
  const second = planGradeBandAssignment({
    existingGradeBandId: first.gradeBandId,
    chosen,
    gradeValue: "3",
  });
  assert.strictEqual(first.writesLink, true);
  assert.strictEqual(second.writesLink, false);
  assert.strictEqual(second.gradeBandId, first.gradeBandId);
  assert.match(source, /writeRequiredGradeBandLink/);
  assert.ok((source.match(/\[\{\s*id:\s*gradeBandId\s*\}\]/g) || []).length >= 1);
});

test("field/table/output contracts unchanged", () => {
  assert.match(source, /enrollments:\s*"Enrollments"/);
  assert.match(source, /gradeBands:\s*"Grade Bands"/);
  assert.match(source, /setOutputSafe\("enrollmentId"/);
  assert.match(source, /setOutputSafe\("gradeOut"/);
  assert.match(source, /setOutputSafe\("gradeNumericOut"/);
  assert.match(source, /setOutputSafe\("gradeBandId"/);
  assert.match(source, /setOutputSafe\("gradeBandName"/);
  assert.match(source, /setOutputSafe\("statusOut"/);
  assert.match(source, /setOutputSafe\("errorOut"/);
  assert.match(source, /setOutputSafe\("debugStep"/);
  assert.match(source, /"Grade Band \(Auto Assign\)"/);
  assert.match(source, /"Grade Band Status"/);
  assert.match(source, /"Grade Band Assignment Status"/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
