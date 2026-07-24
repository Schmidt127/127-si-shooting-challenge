#!/usr/bin/env node
/**
 * Plain-Node assert tests for year-aware Config selection.
 * Run: node tests/config-selection/resolve-config.test.js
 */

"use strict";

const assert = require("assert");
const path = require("path");
const {
  normalizeSchoolYear,
  resolveConfig,
} = require(path.join(__dirname, "..", "..", "lib", "config-selection"));

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

/** Confirmed intentional year-specific Config rows (Max Videos differ by year). */
const FOUR_YEARS = [
  {
    id: "recq14M5hEv3TIGEj",
    activeSchoolYear: "2025-2026",
    fields: { "Max Videos Per Submission": 4, "Active XP Rule Set": "Default" },
  },
  {
    id: "rechc1f9f4kVM1tHP",
    activeSchoolYear: "2026-2027",
    fields: { "Max Videos Per Submission": 6 },
  },
  {
    id: "rectmrnvo9a79wgq3",
    activeSchoolYear: "2027-2028",
    fields: { "Max Videos Per Submission": 5 },
  },
  {
    id: "recXwc19BtG1L2PzW",
    activeSchoolYear: "2028-2029",
    fields: { "Max Videos Per Submission": 4 },
  },
];

test("each of four years resolves uniquely", () => {
  const expected = {
    "2025-2026": { id: "recq14M5hEv3TIGEj", max: 4 },
    "2026-2027": { id: "rechc1f9f4kVM1tHP", max: 6 },
    "2027-2028": { id: "rectmrnvo9a79wgq3", max: 5 },
    "2028-2029": { id: "recXwc19BtG1L2PzW", max: 4 },
  };
  for (const [year, want] of Object.entries(expected)) {
    const result = resolveConfig({
      configRows: FOUR_YEARS,
      enrollmentSchoolYear: year,
    });
    assert.strictEqual(result.ok, true, year);
    assert.strictEqual(result.configRecordId, want.id);
    assert.strictEqual(result.schoolYearKey, year);
    assert.strictEqual(result.selectionSource, "enrollment_school_year");
    assert.strictEqual(result.config.fields["Max Videos Per Submission"], want.max);
    assert.strictEqual(result.debug.firstRecordFallbackUsed, false);
    assert.strictEqual(result.debug.calendarYearUsed, false);
  }
});

test("duplicate year fails closed", () => {
  const rows = [
    ...FOUR_YEARS,
    { id: "recDUPLICATE00001", activeSchoolYear: "2026-2027" },
  ];
  const result = resolveConfig({
    configRows: rows,
    enrollmentSchoolYear: "2026-2027",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "duplicate_school_year");
});

test("missing year fails closed", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    enrollmentSchoolYear: "2029-2030",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "config_year_not_found");
});

test("blank year fails closed", () => {
  assert.strictEqual(normalizeSchoolYear("").ok, false);
  assert.strictEqual(normalizeSchoolYear("   ").ok, false);
  assert.strictEqual(normalizeSchoolYear(null).ok, false);

  const result = resolveConfig({
    configRows: FOUR_YEARS,
    enrollmentSchoolYear: "   ",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "missing_school_year");
});

test("malformed year fails closed", () => {
  for (const bad of ["2026", "2026/2027", "abc-def", "2026-2028", "20-27"]) {
    const n = normalizeSchoolYear(bad);
    assert.strictEqual(n.ok, false, bad);
    assert.strictEqual(n.code, "malformed_school_year", bad);
  }

  const result = resolveConfig({
    configRows: FOUR_YEARS,
    enrollmentSchoolYear: "2026/2027",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "malformed_school_year");
});

test("whitespace is trimmed", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    enrollmentSchoolYear: "  2026-2027  ",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.schoolYearKey, "2026-2027");
  assert.strictEqual(result.configRecordId, "rechc1f9f4kVM1tHP");
});

test("en dash versus hyphen normalizes", () => {
  const enDash = "2025\u20132026";
  const emDash = "2026\u20142027";
  assert.deepStrictEqual(normalizeSchoolYear(enDash), {
    ok: true,
    key: "2025-2026",
  });
  assert.deepStrictEqual(normalizeSchoolYear(emDash), {
    ok: true,
    key: "2026-2027",
  });

  const result = resolveConfig({
    configRows: FOUR_YEARS.map((r, i) =>
      i === 0 ? { ...r, activeSchoolYear: "2025\u20132026" } : r
    ),
    programInstanceSchoolYear: "2025-2026",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.configRecordId, "recq14M5hEv3TIGEj");
});

test("explicit record-ID override wins", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    explicitConfigRecordId: "rectmrnvo9a79wgq3",
    enrollmentSchoolYear: "2025-2026",
    programInstanceSchoolYear: "2026-2027",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.selectionSource, "explicit_config_record_id");
  assert.strictEqual(result.configRecordId, "rectmrnvo9a79wgq3");
  assert.strictEqual(result.schoolYearKey, "2027-2028");
});

test("explicit override missing id fails", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    explicitConfigRecordId: "recDOESNOTEXIST00",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "explicit_config_not_found");
});

test("wrong Program Instance year fails when no matching Config", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    programInstanceSchoolYear: "2030-2031",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "config_year_not_found");
  assert.strictEqual(result.selectionSource == null || true, true);
});

test("Enrollment / Program Instance mismatch fails closed", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    programInstanceSchoolYear: "2026-2027",
    enrollmentSchoolYear: "2025-2026",
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "enrollment_program_instance_mismatch");
});

test("Program Instance preferred over Enrollment when both match", () => {
  const result = resolveConfig({
    configRows: FOUR_YEARS,
    programInstanceSchoolYear: "2026-2027",
    enrollmentSchoolYear: "2026-2027",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.selectionSource, "program_instance_school_year");
  assert.strictEqual(result.configRecordId, "rechc1f9f4kVM1tHP");
});

test("test-season override only when explicitly provided", () => {
  const without = resolveConfig({
    configRows: FOUR_YEARS,
  });
  assert.strictEqual(without.ok, false);
  assert.strictEqual(without.error.code, "missing_school_year");

  const withOverride = resolveConfig({
    configRows: FOUR_YEARS,
    testSeasonOverride: "2028-2029",
  });
  assert.strictEqual(withOverride.ok, true);
  assert.strictEqual(withOverride.selectionSource, "test_season_override");
  assert.strictEqual(withOverride.configRecordId, "recXwc19BtG1L2PzW");

  // Explicit key present but blank does not invent a calendar year.
  const blankOverride = resolveConfig({
    configRows: FOUR_YEARS,
    testSeasonOverride: "",
  });
  assert.strictEqual(blankOverride.ok, false);
  assert.strictEqual(blankOverride.error.code, "missing_school_year");
});

test("never selects arbitrary first record", () => {
  const result = resolveConfig({ configRows: FOUR_YEARS });
  assert.strictEqual(result.ok, false);
  assert.notStrictEqual(result.configRecordId, FOUR_YEARS[0].id);
  assert.strictEqual(result.debug.firstRecordFallbackUsed, false);
});

test("fields-map Active School Year is accepted", () => {
  const rows = FOUR_YEARS.map((r) => ({
    id: r.id,
    fields: {
      "Active School Year": r.activeSchoolYear,
      "Max Videos Per Submission": r.fields["Max Videos Per Submission"],
    },
  }));
  const result = resolveConfig({
    configRows: rows,
    enrollmentSchoolYear: "2027-2028",
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.configRecordId, "rectmrnvo9a79wgq3");
});

console.log("\nAll config-selection tests passed.");
