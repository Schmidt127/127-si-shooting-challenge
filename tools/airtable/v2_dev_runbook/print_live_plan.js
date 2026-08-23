#!/usr/bin/env node
/**
 * Print a safe live DEV execution plan from matrix classification + fixtures.
 *
 * Default: dry plan only (no Airtable calls).
 * With --check-credentials: reports whether DEV API token is present (never prints secrets).
 * Never writes records. Never targets PROD.
 *
 * Usage:
 *   node tools/airtable/v2_dev_runbook/print_live_plan.js
 *   node tools/airtable/v2_dev_runbook/print_live_plan.js --mode airtable_api
 *   node tools/airtable/v2_dev_runbook/print_live_plan.js --smoke-only
 *   node tools/airtable/v2_dev_runbook/print_live_plan.js --check-credentials
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { loadJson, buildDomainSourceKeys, loadIds } = require("./fixture_builders");

const ROOT = path.resolve(__dirname);
const classification = JSON.parse(
  fs.readFileSync(path.join(ROOT, "matrix-classification.json"), "utf8"),
);

const args = new Set(process.argv.slice(2));
const modeFilter = (() => {
  const idx = process.argv.indexOf("--mode");
  return idx >= 0 ? process.argv[idx + 1] : "";
})();
const smokeOnly = args.has("--smoke-only");
const checkCreds = args.has("--check-credentials");

function hasToken() {
  return Boolean(
    process.env.AIRTABLE_TOKEN ||
      process.env.AIRTABLE_API_TOKEN ||
      process.env.AIRTABLE_PAT,
  );
}

function baseIdFromEnv() {
  return String(process.env.AIRTABLE_BASE_ID || process.env.BASE_ID || "").trim();
}

let rows = classification.tests.slice();
if (smokeOnly) rows = rows.filter((t) => t.launch_smoke);
if (modeFilter) rows = rows.filter((t) => (t.modes || []).includes(modeFilter));

console.log("V2 DEV live execution plan (DRY — no writes)");
console.log(`DEV base expected: ${classification.dev_base_id}`);
console.log(`PROD base forbidden: ${classification.prod_base_id}`);
console.log(`Filter: smokeOnly=${smokeOnly} mode=${modeFilter || "all"}`);
console.log("");

if (checkCreds) {
  const tokenPresent = hasToken();
  const baseId = baseIdFromEnv();
  console.log("== Credential check (names/presence only) ==");
  console.log(`AIRTABLE_TOKEN|API_TOKEN|PAT present: ${tokenPresent ? "YES" : "NO"}`);
  console.log(`AIRTABLE_BASE_ID|BASE_ID set: ${baseId ? "YES" : "NO"}`);
  if (baseId) {
    if (baseId === classification.dev_base_id) {
      console.log("Base ID matches DEV — OK for authorized DEV runs");
    } else if (baseId === classification.prod_base_id) {
      console.log("Base ID matches PROD — BLOCKED by this runbook (refuse writes)");
    } else {
      console.log("Base ID does not match known DEV — BLOCKED until confirmed");
    }
  }
  if (!tokenPresent) {
    console.log(
      "Blocked for airtable_api: need PAT in tools/airtable/.env as AIRTABLE_TOKEN (DEV scope) + Mike named DEV authorization.",
    );
  }
  console.log("");
}

const ids = loadIds().ids;
const keys = buildDomainSourceKeys(ids);
console.log("== Synthetic Source Keys (offline fixtures; replace IDs for live) ==");
for (const [name, value] of Object.entries(keys)) {
  if (name === "enrollment") continue;
  console.log(`  ${name}: ${value}`);
}
console.log("");

const byMode = {};
for (const mode of classification.execution_modes) byMode[mode] = [];

console.log("== Tests ==");
for (const row of rows) {
  for (const mode of row.modes || []) {
    if (!byMode[mode]) byMode[mode] = [];
    byMode[mode].push(row.id);
  }
  const fixture = row.fixture ? loadJson(`${row.fixture}.json`) : null;
  console.log(
    [
      row.id.padEnd(4),
      (row.launch_smoke ? "SMOKE" : "full ").padEnd(5),
      (row.domain || "-").padEnd(22),
      (row.modes || []).join(","),
      row.offline_command ? `| offline: ${row.offline_command}` : "",
      fixture ? `| cleanup steps: ${fixture.cleanup.length}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

console.log("");
console.log("== Counts by execution mode ==");
for (const mode of classification.execution_modes) {
  console.log(`  ${mode}: ${byMode[mode].length} (${[...new Set(byMode[mode])].join(", ")})`);
}

console.log("");
console.log("Hard stops: DEV only · no PROD · no writes from this script · Mike approval for live.");
