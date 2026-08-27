#!/usr/bin/env node
"use strict";

/**
 * SC-034 — Automation 057 and WAS Perfect Week video minimum share one Config threshold contract.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveConfig } = require("../../lib/config-selection");
const {
  PERFECT_WEEK_VIDEO_MINIMUM_FIELD,
  WAS_CONFIG_VIDEO_MINIMUM_LOOKUP_FIELD,
  resolvePerfectWeekVideoMinimum,
  evaluateWasVideoRequirementMet,
  buildWasVideoRequirementFormula,
} = require("../../lib/config-selection/perfect-week-video-minimum");

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"
);
const SCRIPT = fs.readFileSync(SCRIPT_PATH, "utf8");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const CONFIG_ROWS = [
  {
    id: "recCfg20262027",
    activeSchoolYear: "2026-2027",
    fields: { [PERFECT_WEEK_VIDEO_MINIMUM_FIELD]: 3 },
  },
  {
    id: "recCfg20252026",
    activeSchoolYear: "2025-2026",
    fields: { [PERFECT_WEEK_VIDEO_MINIMUM_FIELD]: 4 },
  },
];

test("057 uses live Config field name and has no legacy video minimum hardcode", () => {
  assert.match(SCRIPT, /Perfect Week Video Minimum/);
  assert.doesNotMatch(SCRIPT, /Perfect Week Video MInimum/);
  assert.doesNotMatch(SCRIPT, /legacyRequiredVideoCount\s*:/);
  assert.doesNotMatch(SCRIPT, /requiredVideoCount:\s*3\b/);
  assert.doesNotMatch(SCRIPT, /fld[A-Za-z0-9]{10,}/);
});

test("057 resolveRequiredVideoCount fails closed when Config table or field is missing", () => {
  assert.match(SCRIPT, /Config table is unavailable/);
  assert.match(SCRIPT, /Config field "\$\{configFieldName\}" is missing/);
});

test("year-aware Config row supplies threshold for 057 contract and WAS mirror", () => {
  const configPick = resolveConfig({
    configRows: CONFIG_ROWS,
    enrollmentSchoolYear: "2026-2027",
  });
  assert.equal(configPick.ok, true);

  const minimum = resolvePerfectWeekVideoMinimum({
    configRowFields: configPick.config.fields,
  });
  assert.equal(minimum.ok, true);
  assert.equal(minimum.requiredVideoCount, 3);
  assert.equal(minimum.source, "config_perfect_week_video_minimum");

  assert.equal(evaluateWasVideoRequirementMet(2, minimum.requiredVideoCount), 0);
  assert.equal(evaluateWasVideoRequirementMet(3, minimum.requiredVideoCount), 1);
  assert.equal(
    buildWasVideoRequirementFormula(),
    `IF({Perfect Week Video Count} >= {${WAS_CONFIG_VIDEO_MINIMUM_LOOKUP_FIELD}}, 1, 0)`
  );
});

test("blank, invalid, or ambiguous Config values fail closed", () => {
  for (const badValue of [null, "", "abc", 2.5, 0, -1, [3, 4]]) {
    const result = resolvePerfectWeekVideoMinimum({
      configRowFields: { [PERFECT_WEEK_VIDEO_MINIMUM_FIELD]: badValue },
    });
    assert.equal(result.ok, false, `expected fail-closed for ${String(badValue)}`);
  }
});

test("ambiguous Config rows for one school year fail closed", () => {
  const result = resolveConfig({
    configRows: [
      { id: "recA", activeSchoolYear: "2026-2027", fields: {} },
      { id: "recB", activeSchoolYear: "2026-2027", fields: {} },
    ],
    enrollmentSchoolYear: "2026-2027",
  });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /Duplicate Config rows/);
});

test("missing Config row for enrollment school year fails closed", () => {
  const result = resolveConfig({
    configRows: [{ id: "recA", activeSchoolYear: "2025-2026", fields: {} }],
    enrollmentSchoolYear: "2026-2027",
  });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /No Config row/);
});

test("057 addDaysToDateKey avoids UTC ISO slice", () => {
  const fnMatch = SCRIPT.match(/function addDaysToDateKey\(dateKey, daysToAdd\) \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, "addDaysToDateKey not found in 057");
  assert.doesNotMatch(fnMatch[0], /toISOString\(\)\.slice\(0,\s*10\)/);
});

console.log("057-perfect-week-video-minimum contract tests passed");
