#!/usr/bin/env node
/**
 * Automation 003 — Grade Band refresh after Grade correction (offline contracts).
 *
 * Coverage boundary:
 * - Offline code coverage of matching, skip/error paths, and intended writes.
 * - Does NOT prove Airtable Run History or live Automation UI state.
 * - Production verification is documented separately under SC-023 evidence.
 *
 * Run: node tests/enrollment-intake/automation-003-grade-change-refresh.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.join(
  __dirname,
  "../../airtable/automations/shooting-challenge/003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js"
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

/** Mirrors Automation 003 normalizeGradeToNumber. */
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
 * Mirrors findMatchingGradeBands (Active? + inclusive Min/Max).
 * Synthetic band IDs only — no Production record IDs.
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

const STATUSES = {
  processing: "Processing",
  assigned: "Assigned",
  skipped: "Skipped",
  error: "Error",
};

const INTENDED_ENROLLMENT_WRITE_FIELDS = [
  "Grade Band",
  "Grade Band (Auto Assign)",
  "Last Grade Used for Grade Band",
  "Grade Band Status",
  "Grade Band Assignment Status",
];

/**
 * Models 003 main-path decisions after a Grade correction sets refreshNeeded=1.
 * Pure offline planner — not an Airtable runtime.
 */
function planGradeBandRefresh({
  recordId,
  gradeValue,
  athleteId,
  oldGradeBandId,
  refreshNeeded,
  gradeBands,
}) {
  const writes = [];
  const noteWrite = (fields) => {
    for (const fieldName of Object.keys(fields || {})) {
      writes.push(fieldName);
    }
  };

  if (!recordId || !String(recordId).trim()) {
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: "Missing required input: recordId",
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
    };
  }

  if (!String(recordId).startsWith("rec")) {
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: `Invalid Enrollment recordId input: ${recordId}`,
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
    };
  }

  if (!gradeValue) {
    noteWrite({
      "Grade Band Status": STATUSES.skipped,
      "Grade Band Assignment Status": STATUSES.skipped,
    });
    return {
      outcome: "skip",
      statusOut: STATUSES.skipped,
      errorOut: "Skipped because Grade is blank.",
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      oldGradeBandId: oldGradeBandId || "",
    };
  }

  const gradeNumeric = normalizeGradeToNumber(gradeValue);
  if (gradeNumeric === null) {
    noteWrite({
      "Grade Band Status": STATUSES.error,
      "Grade Band Assignment Status": STATUSES.error,
    });
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: `Cannot refresh Grade Band because Grade "${gradeValue}" could not be converted to a numeric value.`,
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      gradeNumeric,
    };
  }

  if (!athleteId) {
    noteWrite({
      "Grade Band Status": STATUSES.error,
      "Grade Band Assignment Status": STATUSES.error,
    });
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: "Cannot refresh Grade Band because Athlete is not linked.",
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      gradeNumeric,
    };
  }

  if (!oldGradeBandId) {
    noteWrite({
      "Grade Band Status": STATUSES.skipped,
      "Grade Band Assignment Status": STATUSES.skipped,
    });
    return {
      outcome: "skip",
      statusOut: STATUSES.skipped,
      errorOut:
        "Skipped because Grade Band is blank. Run the initial Grade Band assignment automation instead.",
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      gradeNumeric,
      initialAssignmentElsewhere: true,
    };
  }

  if (!refreshNeeded) {
    noteWrite({
      "Grade Band Status": STATUSES.assigned,
      "Grade Band Assignment Status": STATUSES.assigned,
    });
    return {
      outcome: "no-refresh",
      statusOut: STATUSES.assigned,
      errorOut: "",
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: oldGradeBandId,
      gradeBandName: "No refresh needed",
      gradeNumeric,
      refreshNeededOut: false,
    };
  }

  // Trigger model: Grade correction → formula Grade Band Refresh Needed = 1 → 003 runs.
  noteWrite({
    "Grade Band Status": STATUSES.processing,
    "Grade Band Assignment Status": STATUSES.processing,
  });

  const candidates = findMatchingGradeBands(gradeBands, gradeNumeric);

  if (candidates.length === 0) {
    noteWrite({
      "Grade Band Status": STATUSES.error,
      "Grade Band Assignment Status": STATUSES.error,
    });
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: `No active Grade Band match found for Grade "${gradeValue}" (numeric ${gradeNumeric}).`,
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      gradeNumeric,
      refreshNeededOut: true,
    };
  }

  if (candidates.length > 1) {
    noteWrite({
      "Grade Band Status": STATUSES.error,
      "Grade Band Assignment Status": STATUSES.error,
    });
    return {
      outcome: "error",
      statusOut: STATUSES.error,
      errorOut: `Multiple active Grade Bands matched Grade "${gradeValue}" (numeric ${gradeNumeric}). Review Grade Band ranges.`,
      writes,
      preservesExistingGradeBand: true,
      gradeBandId: "",
      gradeNumeric,
      refreshNeededOut: true,
    };
  }

  const chosen = candidates[0];
  noteWrite({
    "Grade Band": [{ id: chosen.id }],
    "Grade Band (Auto Assign)": chosen.gradeBandName,
    "Last Grade Used for Grade Band": gradeValue,
    "Grade Band Status": STATUSES.assigned,
    "Grade Band Assignment Status": STATUSES.assigned,
  });

  return {
    outcome: "assigned",
    statusOut: STATUSES.assigned,
    errorOut: "",
    writes,
    preservesExistingGradeBand: false,
    gradeBandId: chosen.id,
    gradeBandName: chosen.gradeBandName,
    oldGradeBandId,
    gradeValue,
    gradeNumeric,
    refreshNeededOut: true,
  };
}

/** Active + one inactive legacy band (synthetic IDs). */
const GRADE_BANDS = [
  { id: "recBandSynthK20001", gradeBandName: "K-2", minGrade: 0, maxGrade: 2, sortOrder: 1, isActive: true },
  { id: "recBandSynth340002", gradeBandName: "3-4", minGrade: 3, maxGrade: 4, sortOrder: 2, isActive: true },
  { id: "recBandSynth560003", gradeBandName: "5-6", minGrade: 5, maxGrade: 6, sortOrder: 3, isActive: true },
  { id: "recBandSynth780004", gradeBandName: "7-8", minGrade: 7, maxGrade: 8, sortOrder: 4, isActive: true },
  { id: "recBandSynth912005", gradeBandName: "9-12", minGrade: 9, maxGrade: 12, sortOrder: 5, isActive: true },
  {
    id: "recBandSynthLeg006",
    gradeBandName: "Grades 1–2",
    minGrade: 1,
    maxGrade: 2,
    sortOrder: 99,
    isActive: false,
  },
];

const source = fs.readFileSync(SCRIPT_PATH, "utf8");

test("003 is version v2.0 grade-change refresh automation", () => {
  assert.match(source, /Version:\s*v2\.0/);
  assert.match(source, /If Grade Changes/);
  assert.match(source, /Grade Band Refresh Needed/);
  assert.match(source, /findMatchingGradeBands/);
});

test("script never writes the formula field Grade Band Refresh Needed", () => {
  assert.match(source, /gradeBandRefreshNeededFormula:\s*"Grade Band Refresh Needed"/);
  assert.match(source, /must NOT be written by script/i);
  // updateRecordSafe skips non-writable; CONFIG lists the formula for read-only getRefreshNeeded.
  assert.doesNotMatch(
    source,
    /updates\[[^\]]*gradeBandRefreshNeededFormula/
  );
  assert.doesNotMatch(
    source,
    /\[["']Grade Band Refresh Needed["']\]\s*=/
  );
  assert.match(source, /function getRefreshNeeded/);
});

test("script writes only intended Enrollment fields on refresh", () => {
  for (const fieldName of INTENDED_ENROLLMENT_WRITE_FIELDS) {
    assert.match(source, new RegExp(fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /isWritableField/);
  assert.match(source, /updateRecordSafe/);
  // Must not attempt formula/checkbox refresh writes.
  assert.doesNotMatch(source, /updates\[CONFIG\.enrollments\.gradeBandRefreshNeeded/);
});

test("valid Grade change selects the correct active Grade Band (Assigned)", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0001",
    gradeValue: "5",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynth340002",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "assigned");
  assert.strictEqual(plan.statusOut, "Assigned");
  assert.strictEqual(plan.gradeBandName, "5-6");
  assert.strictEqual(plan.gradeBandId, "recBandSynth560003");
  assert.strictEqual(plan.gradeValue, "5");
  assert.ok(plan.writes.includes("Grade Band"));
  assert.ok(plan.writes.includes("Grade Band (Auto Assign)"));
  assert.ok(plan.writes.includes("Last Grade Used for Grade Band"));
});

test("Grade-band matching uses inclusive Min Grade and Max Grade", () => {
  assert.strictEqual(findMatchingGradeBands(GRADE_BANDS, 3)[0].gradeBandName, "3-4");
  assert.strictEqual(findMatchingGradeBands(GRADE_BANDS, 4)[0].gradeBandName, "3-4");
  assert.strictEqual(findMatchingGradeBands(GRADE_BANDS, 0)[0].gradeBandName, "K-2");
  assert.strictEqual(findMatchingGradeBands(GRADE_BANDS, 12)[0].gradeBandName, "9-12");
  assert.match(source, /gradeNumeric >= item\.minGrade/);
  assert.match(source, /gradeNumeric <= item\.maxGrade/);
});

test("inactive Grade Bands are ignored", () => {
  const matches = findMatchingGradeBands(GRADE_BANDS, 1);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].gradeBandName, "K-2");
  assert.ok(!matches.some((m) => m.gradeBandName === "Grades 1–2"));
});

test("multiple matching active bands fail safely", () => {
  const overlapping = [
    ...GRADE_BANDS,
    {
      id: "recBandSynthDup007",
      gradeBandName: "4-5 Overlap",
      minGrade: 4,
      maxGrade: 5,
      sortOrder: 10,
      isActive: true,
    },
  ];
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0002",
    gradeValue: "4",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynthK20001",
    refreshNeeded: true,
    gradeBands: overlapping,
  });
  assert.strictEqual(plan.outcome, "error");
  assert.strictEqual(plan.statusOut, "Error");
  assert.match(plan.errorOut, /Multiple active Grade Bands matched/);
  assert.strictEqual(plan.gradeBandId, "");
  assert.match(source, /Multiple active Grade Bands matched/);
});

test("no matching Grade Band fails safely", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0003",
    gradeValue: "99",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynthK20001",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "error");
  assert.strictEqual(plan.statusOut, "Error");
  assert.match(plan.errorOut, /No active Grade Band match found/);
  assert.match(source, /No active Grade Band match found/);
});

test("missing Grade skips safely", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0004",
    gradeValue: "",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynthK20001",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "skip");
  assert.strictEqual(plan.statusOut, "Skipped");
  assert.match(plan.errorOut, /Grade is blank/);
  assert.strictEqual(plan.preservesExistingGradeBand, true);
});

test("missing Athlete fails safely", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0005",
    gradeValue: "3",
    athleteId: "",
    oldGradeBandId: "recBandSynthK20001",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "error");
  assert.strictEqual(plan.statusOut, "Error");
  assert.match(plan.errorOut, /Athlete is not linked/);
  assert.match(source, /Athlete is not linked/);
});

test("missing current Grade Band skips (initial assignment handled elsewhere)", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0006",
    gradeValue: "3",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "skip");
  assert.strictEqual(plan.statusOut, "Skipped");
  assert.strictEqual(plan.initialAssignmentElsewhere, true);
  assert.match(plan.errorOut, /initial Grade Band assignment/);
  assert.match(source, /Run the initial Grade Band assignment automation instead/);
});

test("Grade Band Refresh Needed = 0 skips refresh and preserves existing Grade Band", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0007",
    gradeValue: "3",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynth340002",
    refreshNeeded: false,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.outcome, "no-refresh");
  assert.strictEqual(plan.statusOut, "Assigned");
  assert.strictEqual(plan.preservesExistingGradeBand, true);
  assert.strictEqual(plan.gradeBandId, "recBandSynth340002");
  assert.ok(!plan.writes.includes("Grade Band"));
  assert.match(source, /Done - no refresh needed/);
});

test("malformed or missing recordId fails safely", () => {
  const missing = planGradeBandRefresh({
    recordId: "",
    gradeValue: "3",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynth340002",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(missing.outcome, "error");
  assert.match(missing.errorOut, /Missing required input: recordId/);

  const malformed = planGradeBandRefresh({
    recordId: "not-a-record-id",
    gradeValue: "3",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynth340002",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(malformed.outcome, "error");
  assert.match(malformed.errorOut, /Invalid Enrollment recordId/);
  assert.match(source, /Invalid Enrollment recordId input/);
  assert.match(source, /Missing required input: recordId/);
});

test("models real trigger: Grade correction → refresh flag 1 → process Enrollment", () => {
  // Pre-correction: Grade 3, band 3-4, refresh formula 0.
  const before = {
    gradeValue: "3",
    gradeBandId: "recBandSynth340002",
    refreshNeeded: false,
  };
  const noOp = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0008",
    gradeValue: before.gradeValue,
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: before.gradeBandId,
    refreshNeeded: before.refreshNeeded,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(noOp.outcome, "no-refresh");

  // Post-correction: Grade changed to 7 → formula becomes 1 → 003 refreshes to 7-8.
  const afterCorrection = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0008",
    gradeValue: "7",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: before.gradeBandId,
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(afterCorrection.outcome, "assigned");
  assert.strictEqual(afterCorrection.statusOut, "Assigned");
  assert.strictEqual(afterCorrection.gradeBandName, "7-8");
  assert.strictEqual(afterCorrection.gradeBandId, "recBandSynth780004");
  assert.strictEqual(afterCorrection.oldGradeBandId, before.gradeBandId);
  assert.notStrictEqual(afterCorrection.gradeBandId, before.gradeBandId);
});

test("expected final status is Assigned and band matches corrected Grade", () => {
  const plan = planGradeBandRefresh({
    recordId: "recEnrollVERIFY0009",
    gradeValue: "10",
    athleteId: "recAthleteVERIFY01",
    oldGradeBandId: "recBandSynth560003",
    refreshNeeded: true,
    gradeBands: GRADE_BANDS,
  });
  assert.strictEqual(plan.statusOut, "Assigned");
  assert.strictEqual(plan.gradeBandName, "9-12");
  assert.strictEqual(normalizeGradeToNumber(plan.gradeValue), 10);
  assert.ok(10 >= 9 && 10 <= 12);
  assert.match(source, /statuses:\s*\{[\s\S]*assigned:\s*"Assigned"/);
});

test("docblock trigger conditions match Production refresh view", () => {
  assert.match(source, /Grade is not empty/);
  assert.match(source, /Athlete is not empty/);
  assert.match(source, /Grade Band is not empty/);
  assert.match(source, /Grade Band Refresh Needed = 1/);
  assert.match(source, /recordId:\s*Airtable record ID from Enrollments/);
});

test("field/table/output contracts present", () => {
  assert.match(source, /enrollments:\s*"Enrollments"/);
  assert.match(source, /gradeBands:\s*"Grade Bands"/);
  assert.match(source, /setOutputSafe\("enrollmentId"/);
  assert.match(source, /setOutputSafe\("gradeOut"/);
  assert.match(source, /setOutputSafe\("gradeNumericOut"/);
  assert.match(source, /setOutputSafe\("oldGradeBandId"/);
  assert.match(source, /setOutputSafe\("gradeBandId"/);
  assert.match(source, /setOutputSafe\("gradeBandName"/);
  assert.match(source, /setOutputSafe\("refreshNeededOut"/);
  assert.match(source, /setOutputSafe\("statusOut"/);
  assert.match(source, /setOutputSafe\("errorOut"/);
  assert.match(source, /setOutputSafe\("debugStep"/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
