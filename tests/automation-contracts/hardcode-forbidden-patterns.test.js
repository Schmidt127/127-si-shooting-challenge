#!/usr/bin/env node
"use strict";

/**
 * SC-034 — static guard: active production scripts must not use forbidden config patterns.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const AUTOMATIONS = path.join(ROOT, "airtable/automations/shooting-challenge");

function listActiveScripts() {
  return fs
    .readdirSync(AUTOMATIONS)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"));
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

const FORBIDDEN = [
  {
    name: "configQuery.records[0] first-record Config selection",
    re: /configQuery\.records\[0\]/,
  },
  {
    name: "calendar-year season inference via getFullYear on new Date()",
    re: /new Date\(\)\.getFullYear\(\)/,
  },
  {
    name: "057 legacy Perfect Week video minimum fallback property",
    re: /legacyRequiredVideoCount\s*:/,
    files: (f) => f.startsWith("057-"),
  },
  {
    name: "057 hardcoded requiredVideoCount: 3",
    re: /requiredVideoCount:\s*3\b/,
    files: (f) => f.startsWith("057-"),
  },
];

test("active automations exclude forbidden config-selection patterns", () => {
  const violations = [];
  for (const file of listActiveScripts()) {
    const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
    for (const rule of FORBIDDEN) {
      if (rule.files && !rule.files(file)) continue;
      if (rule.re.test(body)) {
        violations.push(`${file}: ${rule.name}`);
      }
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("_superseded scripts are not in active folder root", () => {
  const active = listActiveScripts();
  assert.ok(!active.some((f) => f.includes("SUPERSEDED")));
});

test("config-selection module rejects first-record fallback flag", () => {
  const mod = require(path.join(ROOT, "lib/config-selection/index.js"));
  const result = mod.resolveConfig({
    configRows: [
      { id: "recA", activeSchoolYear: "2026-2027", fields: {} },
      { id: "recB", activeSchoolYear: "2025-2026", fields: {} },
    ],
    enrollmentSchoolYear: "2026-2027",
  });
  assert.equal(result.ok, true);
  assert.equal(result.debug.firstRecordFallbackUsed, false);
});

test("057 documents Config-driven Perfect Week video minimum without legacy fallback", () => {
  const file = listActiveScripts().find((f) => f.startsWith("057-"));
  const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
  assert.match(body, /Perfect Week Video Minimum/);
  assert.doesNotMatch(body, /Perfect Week Video MInimum/);
  assert.doesNotMatch(body, /legacyRequiredVideoCount\s*:/);
  assert.match(body, /requiredDailyCount:\s*7/);
});

console.log("hardcode-forbidden-patterns tests passed");
