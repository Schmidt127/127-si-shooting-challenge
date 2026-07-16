#!/usr/bin/env node
/**
 * Safe V2 release-readiness validation (repository + config consistency).
 *
 * Does NOT:
 * - connect to Airtable / Make / AWS
 * - read or print secret values from .env files
 * - modify any files
 *
 * Usage (from repo root):
 *   node tools/validate-v2-release-readiness.js
 *
 * Exit codes: 0 = pass, 1 = fail
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
let warnings = 0;

function rel(p) {
  return path.relative(ROOT, p);
}

function pass(msg) {
  console.log(`PASS  ${msg}`);
}

function fail(msg) {
  failures += 1;
  console.error(`FAIL  ${msg}`);
}

function warn(msg) {
  warnings += 1;
  console.warn(`WARN  ${msg}`);
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function listAutomationScripts() {
  const dir = path.join(ROOT, "airtable/automations/shooting-challenge");
  return fs
    .readdirSync(dir)
    .filter((name) => /^\d+[a-z]?-.*\.js$/i.test(name))
    .map((name) => path.join(dir, name));
}

function extractAutomationNumber(filePath) {
  const base = path.basename(filePath);
  const match = base.match(/^(\d+[a-z]?)/i);
  return match ? match[1].toLowerCase() : null;
}

function hasVersionHeader(text) {
  return (
    /\bversion\s*[:=]/i.test(text) ||
    /\* Version:\s*/i.test(text) ||
    /const SCRIPT\s*=/.test(text)
  );
}

function hasStandardScriptMetadata(text) {
  const match = text.match(/const SCRIPT\s*=\s*\{([\s\S]*?)\n\};/);
  if (!match) return false;
  const block = match[1];
  return ["scriptName", "version", "versionDate", "originalWrittenDate"].every((key) =>
    new RegExp(`${key}\\s*:`).test(block),
  );
}

function parseEnvExampleKeys(relPath) {
  if (!exists(relPath)) return [];
  return read(relPath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean);
}

console.log("V2 release-readiness validation");
console.log(`Root: ${ROOT}`);
console.log("");

// ---------------------------------------------------------------------------
// 1. Required documentation
// ---------------------------------------------------------------------------
console.log("== Required documentation ==");
const requiredDocs = [
  "docs/V2_RELEASE_CHECKLIST.md",
  "docs/AUTOMATION_VERSION_INVENTORY.md",
  "docs/V2_END_TO_END_TEST_MATRIX.md",
  "docs/v2/V2_DEV_EXECUTION_RUNBOOK.md",
  "docs/v2/V2_LAUNCH_SMOKE_TESTS.md",
  "docs/known-issues.md",
  "docs/automation-index.md",
  "docs/deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md",
  "docs/v2/08-testing-standards.md",
  "docs/PROJECT_STATE.md",
  "AGENTS.md",
  "BRAND_STANDARDS.md",
  "APP_CONTEXT.md",
];

for (const doc of requiredDocs) {
  if (exists(doc)) pass(doc);
  else fail(`missing required doc: ${doc}`);
}

// ---------------------------------------------------------------------------
// 2. Automation files + duplicate numbers + version headers
// ---------------------------------------------------------------------------
console.log("\n== Automation scripts ==");
const scripts = listAutomationScripts();
if (scripts.length === 0) {
  fail("no automation scripts found under airtable/automations/shooting-challenge/");
} else {
  pass(`found ${scripts.length} numbered automation scripts`);
}

const byNumber = new Map();
for (const filePath of scripts) {
  const num = extractAutomationNumber(filePath);
  if (!num) {
    fail(`could not parse automation number from ${rel(filePath)}`);
    continue;
  }
  if (!byNumber.has(num)) byNumber.set(num, []);
  byNumber.get(num).push(filePath);
}

for (const [num, files] of [...byNumber.entries()].sort()) {
  if (files.length > 1) {
    fail(`duplicate automation number ${num}: ${files.map(rel).join(", ")}`);
  }
}

let missingVersion = 0;
let missingStandardMeta = 0;
for (const filePath of scripts) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!hasVersionHeader(text)) {
    missingVersion += 1;
    fail(`no version header detected: ${rel(filePath)}`);
  }
  const base = path.basename(filePath);
  if (/^(009|066|117a|117b)-/.test(base) && !hasStandardScriptMetadata(text)) {
    missingStandardMeta += 1;
    fail(`missing standard SCRIPT metadata (scriptName/version/versionDate/originalWrittenDate): ${rel(filePath)}`);
  }
}
if (missingVersion === 0) {
  pass("all automation scripts have a detectable version header");
}
if (missingStandardMeta === 0) {
  pass("critical scripts (009/066/117a/117b) expose standard SCRIPT metadata");
}

// Expected high-value scripts for V2 validation domains
const expectedScripts = [
  "010", "020", "031", "034", "042", "053", "054", "057", "058",
  "065", "066", "070b", "070c", "101", "114", "115", "116", "117a", "117b",
];
for (const num of expectedScripts) {
  if (byNumber.has(num.toLowerCase())) pass(`expected automation ${num} present`);
  else fail(`expected automation ${num} missing`);
}

// 009 must be present and version-detectable (release blocker closed in repo)
if (byNumber.has("009")) {
  const file009 = byNumber.get("009")[0];
  const text009 = fs.readFileSync(file009, "utf8");
  if (hasStandardScriptMetadata(text009)) pass("009 standard SCRIPT metadata present");
  else fail("009 missing standard SCRIPT metadata");
} else {
  fail("expected automation 009 missing");
}

// ---------------------------------------------------------------------------
// 3. Test fixtures / contract tests
// ---------------------------------------------------------------------------
console.log("\n== Test fixtures and contract tests ==");
const requiredTests = [
  "airtable/automations/shooting-challenge/lib/v2-engine-contracts.js",
  "airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js",
  "airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.js",
  "airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js",
  "airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js",
  "airtable/automations/shooting-challenge/lib/script-header-contract.test.js",
  "airtable/automations/shooting-challenge/lib/upload-make-lambda-response.js",
  "airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js",
  "tools/airtable/v2_dev_runbook/matrix-classification.json",
  "tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js",
  "tools/airtable/v2_dev_runbook/cli.js",
  "tools/airtable/v2_dev_runbook/cli.test.js",
  "tools/airtable/v2_dev_runbook/scenarios.test.js",
  "tools/airtable/v2_dev_runbook/lib/safety.js",
  "tools/airtable/v2_dev_runbook/lib/scenarios.js",
  "tools/airtable/v2_dev_runbook/fixtures/milestones.json",
  "tools/airtable/tests/test_c025_recording_watch_contract.py",
  "web/lib/data/levels.test.ts",
  "web/lib/data/homework.test.ts",
  "tools/airtable/tests/test_c013_prod_make_smoke_run.py",
];

for (const t of requiredTests) {
  if (exists(t)) pass(t);
  else fail(`missing test/fixture: ${t}`);
}

const requiredC025Docs = [
  "docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md",
  "docs/v2/AUTOMATION_070A_LAUNCH_DECISION.md",
  "docs/deploy-checklists/066-dev-omni-confirmation-packet.md",
  "docs/deploy-checklists/C-025-zoom-recording-design-stage12.md",
];
for (const doc of requiredC025Docs) {
  if (exists(doc)) pass(doc);
  else fail(`missing required C-025/launch doc: ${doc}`);
}

// ---------------------------------------------------------------------------
// 4. Environment variable names documented (names only — never print secrets)
// ---------------------------------------------------------------------------
console.log("\n== Environment variable documentation (names only) ==");
const webEnvKeys = parseEnvExampleKeys("web/.env.example");
const rootEnvKeys = parseEnvExampleKeys(".env.example");
const toolsEnvKeys = parseEnvExampleKeys("tools/airtable/.env.example");

const requiredWebEnvNames = [
  "AIRTABLE_API_TOKEN",
  "AIRTABLE_BASE_ID",
  "NEXT_PUBLIC_BASE_PATH",
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_SITE_URL",
];

for (const key of requiredWebEnvNames) {
  if (webEnvKeys.includes(key) || rootEnvKeys.includes(key)) {
    pass(`env name documented: ${key}`);
  } else {
    fail(`env name not documented in web/.env.example or .env.example: ${key}`);
  }
}

if (toolsEnvKeys.includes("AIRTABLE_TOKEN") || toolsEnvKeys.includes("AIRTABLE_API_TOKEN")) {
  pass("tools/airtable/.env.example documents Airtable token name");
} else {
  warn("tools/airtable/.env.example missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN name");
}

// Ensure we never accidentally dump env file contents with values in this script.
pass("validation script does not print env file values");

// ---------------------------------------------------------------------------
// 5. Build / test / lint commands available
// ---------------------------------------------------------------------------
console.log("\n== Build and test commands ==");
if (!exists("web/package.json")) {
  fail("web/package.json missing");
} else {
  const pkg = JSON.parse(read("web/package.json"));
  const scriptsMap = pkg.scripts || {};
  for (const name of ["lint", "typecheck", "test", "build"]) {
    if (scriptsMap[name]) pass(`web npm script available: ${name} -> ${scriptsMap[name]}`);
    else fail(`web npm script missing: ${name}`);
  }
}

if (exists(".github/workflows/web.yml")) {
  pass(".github/workflows/web.yml present");
} else {
  warn(".github/workflows/web.yml missing");
}

// ---------------------------------------------------------------------------
// 6. Inventory / checklist cross-links sanity
// ---------------------------------------------------------------------------
console.log("\n== Doc cross-link sanity ==");
const checklist = exists("docs/V2_RELEASE_CHECKLIST.md") ? read("docs/V2_RELEASE_CHECKLIST.md") : "";
for (const needle of [
  "pre-promotion",
  "rollback",
  "smoke",
  "sign-off",
  "AUTOMATION_VERSION_INVENTORY",
  "V2_END_TO_END_TEST_MATRIX",
]) {
  if (checklist.toLowerCase().includes(needle.toLowerCase())) {
    pass(`release checklist mentions: ${needle}`);
  } else {
    fail(`release checklist missing section/keyword: ${needle}`);
  }
}

const inventory = exists("docs/AUTOMATION_VERSION_INVENTORY.md")
  ? read("docs/AUTOMATION_VERSION_INVENTORY.md")
  : "";
if (inventory.includes("| # |") || inventory.includes("| Automation")) {
  pass("automation version inventory has a table");
} else if (inventory) {
  fail("automation version inventory missing expected table markup");
}

const matrix = exists("docs/V2_END_TO_END_TEST_MATRIX.md")
  ? read("docs/V2_END_TO_END_TEST_MATRIX.md")
  : "";
for (const scenario of [
  "XP",
  "Homework",
  "Streak",
  "Perfect Week",
  "Zoom",
  "Level",
]) {
  if (matrix.toLowerCase().includes(scenario.toLowerCase())) {
    pass(`E2E matrix mentions: ${scenario}`);
  } else if (matrix) {
    fail(`E2E matrix missing scenario keyword: ${scenario}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n== Summary ==");
console.log(`Failures: ${failures}`);
console.log(`Warnings: ${warnings}`);

if (failures > 0) {
  console.error("RESULT: FAIL");
  process.exit(1);
}

console.log("RESULT: PASS");
process.exit(0);
