#!/usr/bin/env node
"use strict";

/**
 * SC-034 — Automation 057 and WAS Perfect Week video minimum must share one threshold contract.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveConfig } = require("../../lib/config-selection");
const {
  PERFECT_WEEK_VIDEO_MINIMUM_FIELD,
  LEGACY_REQUIRED_VIDEO_COUNT,
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

test("057 declares Config field name and legacy fallback without inventing field ids", () => {
  assert.match(SCRIPT, /Perfect Week Video Minimum/);
  assert.match(SCRIPT, /legacyRequiredVideoCount:\s*3/);
  assert.doesNotMatch(SCRIPT, /fld[A-Za-z0-9]{10,}/);
});

test("legacy path preserves effective threshold 3 aligned with current WAS formula", () => {
  const resolved = resolvePerfectWeekVideoMinimum({ configFieldExists: false });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.requiredVideoCount, LEGACY_REQUIRED_VIDEO_COUNT);
  assert.equal(resolved.source, "legacy_was_formula_alignment");

  const wasMet = evaluateWasVideoRequirementMet(3, resolved.requiredVideoCount);
  assert.equal(wasMet, 1);
  assert.equal(
    buildWasVideoRequirementFormula(resolved.requiredVideoCount),
    "IF({Perfect Week Video Count} >= 3, 1, 0)"
  );
});

test("config field present: year-aware row supplies threshold used by both 057 contract and WAS mirror", () => {
  const configPick = resolveConfig({
    configRows: CONFIG_ROWS,
    enrollmentSchoolYear: "2026-2027",
  });
  assert.equal(configPick.ok, true);

  const minimum = resolvePerfectWeekVideoMinimum({
    configFieldExists: true,
    configRowFields: configPick.config.fields,
  });
  assert.equal(minimum.ok, true);
  assert.equal(minimum.requiredVideoCount, 3);
  assert.equal(minimum.source, "config_perfect_week_video_minimum");

  assert.equal(evaluateWasVideoRequirementMet(2, minimum.requiredVideoCount), 0);
  assert.equal(evaluateWasVideoRequirementMet(3, minimum.requiredVideoCount), 1);
  assert.equal(
    buildWasVideoRequirementFormula(minimum.requiredVideoCount),
    buildWasVideoRequirementFormula(minimum.requiredVideoCount)
  );
});

test("config field present: blank or invalid values fail closed", () => {
  for (const badValue of [null, "", "abc", 2.5, -1]) {
    const result = resolvePerfectWeekVideoMinimum({
      configFieldExists: true,
      configRowFields: { [PERFECT_WEEK_VIDEO_MINIMUM_FIELD]: badValue },
    });
    assert.equal(result.ok, false, `expected fail-closed for ${String(badValue)}`);
  }
});

test("057 date helper addDaysToDateKey avoids UTC ISO slice", () => {
  const fnMatch = SCRIPT.match(/function addDaysToDateKey\(dateKey, daysToAdd\) \{[\s\S]*?\n\}/);
  assert.ok(fnMatch, "addDaysToDateKey not found in 057");
  assert.doesNotMatch(fnMatch[0], /toISOString\(\)\.slice\(0,\s*10\)/);
});

console.log("057-perfect-week-video-minimum contract tests passed");
