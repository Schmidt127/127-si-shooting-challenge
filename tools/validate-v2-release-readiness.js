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
    /\* VERSION:\s*/i.test(text) ||
    /const SCRIPT\s*=/.test(text)
  );
}

/** Prefer an explicit semver-ish version string in docblock, SCRIPT, or CONFIG. */
function extractDeclaredVersion(text) {
  const patterns = [
    /\*\s*Version:\s*(v?\d+(?:\.\d+){0,3})/i,
    /\*\s*VERSION:\s*(v?\d+(?:\.\d+){0,3})/i,
    /version(?:Number)?:\s*["'](v?\d+(?:\.\d+){0,3})["']/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function hasStandardScriptMetadata(text) {
  const match = text.match(/const SCRIPT\s*=\s*\{([\s\S]*?)\n\};/);
  if (!match) return false;
  const block = match[1];
  return ["scriptName", "version", "versionDate", "originalWrittenDate"].every((key) =>
    new RegExp(`${key}\\s*:`).test(block),
  );
}

/** Launch-scope automations required for V2 release-readiness offline gate. */
const LAUNCH_SCOPE_SCRIPTS = Object.freeze([
  "009",
  "010",
  "020",
  "031",
  "034",
  "042",
  "053",
  "054",
  "057",
  "058",
  "065",
  "066",
  "070b",
  "070c",
  "101",
  "114",
  "115",
  "116",
  "117a",
  "117b",
  "117c",
  "117d",
  "117e",
  "117f",
]);

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
let missingDeclaredVersion = 0;
for (const filePath of scripts) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!hasVersionHeader(text)) {
    missingVersion += 1;
    fail(`no version header detected: ${rel(filePath)}`);
  }
  const base = path.basename(filePath);
  const num = extractAutomationNumber(filePath);
  if (num && LAUNCH_SCOPE_SCRIPTS.includes(num) && !extractDeclaredVersion(text)) {
    missingDeclaredVersion += 1;
    fail(`launch-scope script missing declared version string: ${rel(filePath)}`);
  }
  if (/^(009|066|117a|117b|117c)-/.test(base) && !hasStandardScriptMetadata(text)) {
    missingStandardMeta += 1;
    fail(`missing standard SCRIPT metadata (scriptName/version/versionDate/originalWrittenDate): ${rel(filePath)}`);
  }
}
if (missingVersion === 0) {
  pass("all automation scripts have a detectable version header");
}
if (missingDeclaredVersion === 0) {
  pass("all launch-scope automation scripts declare an explicit version string");
}
if (missingStandardMeta === 0) {
  pass("critical scripts (009/066/117a/117b/117c) expose standard SCRIPT metadata");
}

// Expected high-value scripts for V2 validation domains (launch scope)
for (const num of LAUNCH_SCOPE_SCRIPTS) {
  if (byNumber.has(num.toLowerCase())) pass(`launch-scope automation ${num} present`);
  else fail(`launch-scope automation ${num} missing`);
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
  "airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.js",
  "airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js",
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
  "tools/airtable/tests/test_c009_hw17_attachment_contract.py",
  "tools/airtable/tests/test_c010_active_guards_contract.py",
  "tools/airtable/tests/test_c011_weekly_email_contract.py",
  "web/lib/data/levels.test.ts",
  "web/lib/data/homework.test.ts",
  "tools/airtable/tests/test_c013_prod_make_smoke_run.py",
];

for (const t of requiredTests) {
  if (exists(t)) pass(t);
  else fail(`missing test/fixture: ${t}`);
}

// Contract coverage keywords required in engine tests (repo-level blocker closure)
const engineTest = exists("airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js")
  ? read("airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js")
  : "";
for (const needle of [
  "Active? processing guard",
  "weekly summary",
  "attachment-slot mapping",
  "HW17 quiz intake",
  "WEEKLY_EMAIL",
  "priorSaturdayKeyDenver",
  "schmidt_excluded",
]) {
  if (engineTest.includes(needle)) pass(`engine contract tests cover: ${needle}`);
  else fail(`engine contract tests missing coverage for: ${needle}`);
}

const requiredC009C011Docs = [
  "docs/v2/C009_C010_C011_MIGRATION_SAFETY.md",
  "docs/v2/C009_HW17_ATTACHMENT_DEV_INSTALL.md",
  "docs/v2/C010_ACTIVE_GUARDS_DEV_INSTALL.md",
  "docs/v2/C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md",
  "docs/v2/PR34_PR35_PR37_RECONCILIATION.md",
];
for (const doc of requiredC009C011Docs) {
  if (exists(doc)) pass(doc);
  else fail(`missing required C-009/C-010/C-011 reconcile doc: ${doc}`);
}

const requiredC025Docs = [
  "docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md",
  "docs/v2/AUTOMATION_070A_LAUNCH_DECISION.md",
  "docs/v2/C025_ARCHITECTURE_RECONCILIATION.md",
  "docs/deploy-checklists/066-dev-omni-confirmation-packet.md",
  "docs/deploy-checklists/C-025-zoom-recording-design-stage12.md",
];
for (const doc of requiredC025Docs) {
  if (exists(doc)) pass(doc);
  else fail(`missing required C-025/launch doc: ${doc}`);
}

// ---------------------------------------------------------------------------
// 3b. DEV testing-view documentation (C-019) — required repo rules
// ---------------------------------------------------------------------------
console.log("\n== DEV testing-view documentation (C-019) ==");
const c019Docs = [
  "docs/deploy-checklists/C-019-testing-views-verification-checklist.md",
  "docs/deploy-checklists/C-019-airtable-ui-work-order.md",
];
for (const doc of c019Docs) {
  if (exists(doc)) pass(doc);
  else fail(`missing required C-019 testing-view doc: ${doc}`);
}

const c019Checklist = exists(c019Docs[0]) ? read(c019Docs[0]) : "";
const c019WorkOrder = exists(c019Docs[1]) ? read(c019Docs[1]) : "";
const c019Combined = `${c019Checklist}\n${c019WorkOrder}`;
for (const rule of [
  { needle: "Testing", label: "Testing view name" },
  { needle: "recgP9qZYjAhE7NXm", label: "Schmidt enrollment record ID" },
  { needle: "Active?", label: "Active? forbidden-filter guidance" },
  { needle: "Enrollment", label: "Enrollment link filter" },
  { needle: "Submissions", label: "Submissions table" },
  { needle: "Submission Assets", label: "Submission Assets table" },
  { needle: "Homework Completions", label: "Homework Completions table" },
  { needle: "Video Feedback", label: "Video Feedback table" },
  { needle: "XP Events", label: "XP Events table" },
  { needle: "Weekly Athlete Summary", label: "Weekly Athlete Summary table" },
  { needle: "Streak Occurrences", label: "Streak Occurrences table" },
  { needle: "Athlete Achievement Unlocks", label: "Athlete Achievement Unlocks table" },
]) {
  if (c019Combined.includes(rule.needle)) {
    pass(`C-019 docs include: ${rule.label}`);
  } else {
    fail(`C-019 testing-view docs missing required rule: ${rule.label}`);
  }
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
// 7. Contradictory status documentation (repo-level stale claims)
// ---------------------------------------------------------------------------
console.log("\n== Contradictory status documentation ==");
const projectState = exists("docs/PROJECT_STATE.md") ? read("docs/PROJECT_STATE.md") : "";
const automationIndex = exists("docs/automation-index.md") ? read("docs/automation-index.md") : "";
const knownIssues = exists("docs/known-issues.md") ? read("docs/known-issues.md") : "";
const inventoryText = inventory;

// 066: script is v3.2; do not claim paste-not-done or v3.1-as-current in PROJECT_STATE
if (byNumber.has("066")) {
  const text066 = fs.readFileSync(byNumber.get("066")[0], "utf8");
  const ver066 = extractDeclaredVersion(text066) || "";
  if (/v?3\.2/i.test(ver066)) pass("066 script declares v3.2");
  else fail(`066 script expected v3.2, found: ${ver066 || "(none)"}`);

  if (/Airtable paste not done/i.test(projectState) && /H-002.*066/i.test(projectState)) {
    fail("PROJECT_STATE still claims H-002/066 Airtable paste not done (contradicts backlog + automation-index)");
  } else {
    pass("PROJECT_STATE does not claim 066 paste-not-done");
  }

  if (/Automation 066 v3\.1/i.test(projectState) && !/066 v3\.2/i.test(projectState)) {
    fail("PROJECT_STATE references Automation 066 v3.1 without acknowledging v3.2 current");
  } else {
    pass("PROJECT_STATE 066 version wording acknowledges v3.2 (or avoids stale v3.1-only claim)");
  }
}

// 070b / 070c version wording must match scripts
if (byNumber.has("070b") && byNumber.has("070c")) {
  const ver070b = extractDeclaredVersion(fs.readFileSync(byNumber.get("070b")[0], "utf8"));
  const ver070c = extractDeclaredVersion(fs.readFileSync(byNumber.get("070c")[0], "utf8"));
  if (ver070b === "v4.4") pass("070b declared version v4.4");
  else fail(`070b expected v4.4, found ${ver070b || "(none)"}`);
  if (ver070c === "v1.1") pass("070c declared version v1.1");
  else fail(`070c expected v1.1, found ${ver070c || "(none)"}`);

  if (/070b.*v4\.4/i.test(inventoryText) && /070c.*v1\.1/i.test(inventoryText)) {
    pass("inventory documents 070b v4.4 and 070c v1.1");
  } else {
    fail("inventory missing aligned 070b v4.4 / 070c v1.1 wording");
  }
}

// 059: recommended trigger must NOT prefer Ready for 059 XP as the live filter
if (/Ready for 059 XP/i.test(automationIndex) && !/Do NOT filter on Ready for 059 XP/i.test(automationIndex)) {
  // Index may mention the formula field historically; require recommended-trigger correction nearby
  if (!/record is \*\*created\*\*|When a record is created/i.test(automationIndex + inventoryText)) {
    fail("059 docs still imply Ready-for-059-XP matches-conditions trigger without created-record recommendation");
  } else {
    pass("059 trigger docs include created-record recommendation");
  }
} else {
  pass("059 trigger docs do not incorrectly require Ready for 059 XP filter");
}

if (/RECOMMENDED TRIGGER[\s\S]{0,400}created/i.test(
  byNumber.has("059") ? fs.readFileSync(byNumber.get("059")[0], "utf8") : "",
)) {
  pass("059 script documents recommended created trigger");
} else if (byNumber.has("059")) {
  fail("059 script missing RECOMMENDED TRIGGER created guidance");
}

// 043 retirement + 112 OFF must be explicit in index/inventory
if (/043/.test(automationIndex) && /retire|retired|OFF|legacy/i.test(automationIndex)) {
  pass("automation-index mentions 043 retirement/legacy disposition");
} else {
  fail("automation-index missing 043 retirement disposition");
}
if (/112/.test(automationIndex) && /\bOFF\b/.test(automationIndex)) {
  pass("automation-index documents 112 OFF state");
} else {
  fail("automation-index missing 112 OFF state");
}
if (/112/.test(inventoryText) && /\bOFF\b/.test(inventoryText)) {
  pass("inventory documents 112 OFF state");
} else {
  fail("inventory missing 112 OFF state");
}
if (/043/.test(inventoryText) && /retire|retired|legacy|delete/i.test(inventoryText)) {
  pass("inventory documents 043 retirement disposition");
} else {
  fail("inventory missing 043 retirement disposition");
}

// ---------------------------------------------------------------------------
// 8. Launch-test evidence (offline packages — not live Airtable proof)
// ---------------------------------------------------------------------------
console.log("\n== Launch-test evidence (repository packages) ==");
const launchEvidenceDocs = [
  "docs/deploy-checklists/DEV-release-readiness-verification-2026-07-16.md",
  "docs/deploy-checklists/066-dev-omni-confirmation-packet.md",
  "docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md",
  "docs/V2_END_TO_END_TEST_MATRIX.md",
  "docs/deploy-checklists/C-019-testing-views-verification-checklist.md",
];
for (const doc of launchEvidenceDocs) {
  if (exists(doc)) pass(`launch-test evidence present: ${doc}`);
  else fail(`missing launch-test evidence doc: ${doc}`);
}

const verificationPkg = exists(launchEvidenceDocs[0]) ? read(launchEvidenceDocs[0]) : "";
for (const needle of ["PASS", "C-025", "066", "Live DEV install remains", "offline"]) {
  if (verificationPkg.toLowerCase().includes(needle.toLowerCase())) {
    pass(`DEV verification package mentions: ${needle}`);
  } else if (verificationPkg) {
    fail(`DEV verification package missing keyword: ${needle}`);
  }
}

if (/offline harness PASS|harness PASS/i.test(knownIssues) || /066/.test(knownIssues)) {
  pass("known-issues tracks 066/offline launch evidence");
} else {
  warn("known-issues does not mention 066 offline harness evidence");
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
