#!/usr/bin/env node
"use strict";

/**
 * Offline regression for the 041 -> 042 reconciliation-signature handshake.
 * It executes the signature helpers from the production sources with mocked
 * Airtable records; it never contacts an Airtable base.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const AUTOMATIONS_DIR = path.resolve(__dirname, "..");

function loadSignatureHelper(fileName, helperName) {
  const source = fs.readFileSync(path.join(AUTOMATIONS_DIR, fileName), "utf8");
  const transformed = source.replace(
    /\nawait main\(\);\s*$/,
    `\nmodule.exports = { ${helperName} };\n`
  );
  const sandbox = {
    module: { exports: {} },
    console,
  };
  vm.runInNewContext(transformed, sandbox, { filename: fileName });
  return sandbox.module.exports[helperName];
}

function record(id, values) {
  return {
    id,
    getCellValue(fieldName) {
      return values[fieldName] ?? null;
    },
    getCellValueAsString(fieldName) {
      const value = values[fieldName];
      if (Array.isArray(value)) return value.map((item) => item.name || item.id || item).join(", ");
      return value == null ? "" : String(value);
    },
  };
}

function link(id) {
  return [{ id }];
}

function fixture({ futureLevelName = "Level 12", priorYearRule = false } = {}) {
  const levels = Array.from({ length: 12 }, (_, index) => {
    const position = index + 1;
    return record(`recL${position}`, {
      "Level Name": position === 12 ? futureLevelName : `Level ${position}`,
      "XP Required (Cumulative)": (position - 1) * 100,
      "Active?": true,
      "Sort Order": position,
    });
  });

  const gates = levels.map((level, index) =>
    record(`recG${index + 1}`, {
      "Level Gate Rule Name": `Gate ${index + 1}`,
      Level: link(level.id),
      "School Year / Rule Set": priorYearRule && index === 11 ? "2025-2026" : "2026-2027",
      "Version Active?": true,
      "Gate Enabled?": false,
      "Minimum Submissions": 0,
      "Minimum Homework": 0,
      "Minimum Videos": 0,
      "Minimum Zoom Meetings": 0,
      "Minimum Streak Days": 0,
    })
  );

  const enrollment = record("recEnrollment", {
    "Lifetime XP Total": 25,
    "Lifetime XP Manual Adjustments": 0,
    "Total Submissions": 0,
    "Total Homework Completions": 0,
    "Total Video Submissions": 0,
    "Total Zoom Attendances": 0,
    "Longest Streak Days": 0,
    "School Year": "2026-2027",
    "Program Instance": link("recProgram"),
    "Active?": true,
    "Current Level": link("recL1"),
    "Next Level": link("recL2"),
    "Level Gate Rule": link("recG2"),
    "Level Status": "Assigned",
  });

  return { enrollment, levels, gates };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const build041Signature = loadSignatureHelper(
  "041-levels-and-progression-mark-enrollment-for-level-recalculation.js",
  "buildProgressionSignature"
);
const build042Signature = loadSignatureHelper(
  "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
  "buildReconciledSignature"
);

test("lower-level enrollment has identical 041 queue and 042 acknowledgement signatures with 12 active rules", () => {
  const { enrollment, levels, gates } = fixture();
  assert.strictEqual(
    build041Signature(enrollment, gates, levels),
    build042Signature(enrollment, levels, gates)
  );
});

test("a future-level configuration edit does not requeue a settled lower-level enrollment", () => {
  const baseline = fixture();
  const changed = fixture({ futureLevelName: "Level 12 Renamed" });

  assert.strictEqual(
    build041Signature(baseline.enrollment, baseline.gates, baseline.levels),
    build042Signature(baseline.enrollment, baseline.levels, baseline.gates)
  );
  assert.strictEqual(
    build041Signature(baseline.enrollment, baseline.gates, baseline.levels),
    build041Signature(changed.enrollment, changed.gates, changed.levels)
  );
  assert.strictEqual(
    build042Signature(baseline.enrollment, baseline.levels, baseline.gates),
    build042Signature(changed.enrollment, changed.levels, changed.gates)
  );
});

test("a different-school-year future gate remains outside the lower-level signature", () => {
  const baseline = fixture();
  const otherYear = fixture({ priorYearRule: true });

  assert.strictEqual(
    build042Signature(baseline.enrollment, baseline.levels, baseline.gates),
    build042Signature(otherYear.enrollment, otherYear.levels, otherYear.gates)
  );
});

console.log("041-042-reconciled-signature-contract: all tests passed");
