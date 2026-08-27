#!/usr/bin/env node
"use strict";

/**
 * SC-056 — inventory automation input/output variable conventions in active scripts.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const AUTOMATIONS = path.join(ROOT, "airtable/automations/shooting-challenge");

/** V2 scripts expected to emit standard outputs (114/066/054 pattern). */
const V2_OUTPUT_SCRIPTS = [
  "053-",
  "054-",
  "059-",
  "065-",
  "066-",
  "101-",
  "114-",
  "022-",
  "034-",
  "041-",
  "042-",
];

/** Legacy scripts documented in AUTOMATION_SCRIPT_STANDARD — pending V2 output migration. */
const LEGACY_NO_STATUS_OUT = ["058-"];

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

test("V2 scripts declare statusOut and read recordId from input.config()", () => {
  const missing = [];
  for (const prefix of V2_OUTPUT_SCRIPTS) {
    const file = listActiveScripts().find((f) => f.startsWith(prefix));
    assert.ok(file, `expected script with prefix ${prefix}`);
    const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
    if (!/statusOut/.test(body)) missing.push(`${file}: missing statusOut`);
    if (!/input\.config\(\)/.test(body) && !/inputConfig\s*=\s*input\.config\(\)/.test(body)) {
      missing.push(`${file}: missing input.config()`);
    }
    if (!/recordId/.test(body)) missing.push(`${file}: missing recordId handling`);
  }
  assert.deepEqual(missing, [], missing.join("\n"));
});

test("V2 scripts validate recordId starts with rec", () => {
  const REC_PREFIX_SCRIPTS = V2_OUTPUT_SCRIPTS.filter((p) => p !== "053-");
  const missing = [];
  for (const prefix of REC_PREFIX_SCRIPTS) {
    const file = listActiveScripts().find((f) => f.startsWith(prefix));
    const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
    if (!/startsWith\s*\(\s*["']rec["']\s*\)/.test(body)) {
      missing.push(`${file}: missing rec-prefix validation`);
    }
  }
  assert.deepEqual(missing, [], missing.join("\n"));
});

test("053 validates recordId non-empty (rec-prefix migration pending)", () => {
  const file = listActiveScripts().find((f) => f.startsWith("053-"));
  const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
  assert.match(body, /Missing required input variable: recordId/);
});

test("legacy scripts without statusOut are explicitly listed", () => {
  for (const prefix of LEGACY_NO_STATUS_OUT) {
    const file = listActiveScripts().find((f) => f.startsWith(prefix));
    assert.ok(file, `expected legacy script ${prefix}`);
    const body = fs.readFileSync(path.join(AUTOMATIONS, file), "utf8");
    assert.ok(!/statusOut/.test(body), `${file} should remain legacy until migrated`);
  }
});

test("standard documents input variable name recordId", () => {
  const standard = fs.readFileSync(
    path.join(ROOT, "airtable/automations/AUTOMATION_SCRIPT_STANDARD.md"),
    "utf8"
  );
  assert.match(standard, /recordId.*Standard trigger input/i);
  assert.match(standard, /statusOut.*success.*skipped.*error/i);
});

console.log("automation-io-conventions tests passed");
