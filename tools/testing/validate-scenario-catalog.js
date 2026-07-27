#!/usr/bin/env node
/**
 * Rebuild + validate Testing Scenario catalog from scn-*.json fixtures.
 * Does not invent scenarios — only indexes and checks integrity.
 *
 * Usage:
 *   node tools/testing/validate-scenario-catalog.js
 *   node tools/testing/validate-scenario-catalog.js --write
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const DIR = path.join(ROOT, "docs/testing/scenarios");
const CATALOG_PATH = path.join(DIR, "catalog.json");

const REQUIRED_KEYS = [
  "scenario_id",
  "name",
  "type",
  "description",
  "input_fields",
  "prohibited_side_effects",
  "cleanup_instructions",
  "test_status",
];

function main() {
  const write = process.argv.includes("--write");
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^scn-\d{3}-.+\.json$/i.test(f))
    .sort();

  const scenarios = [];
  const errors = [];
  const seenIds = new Map();

  for (const file of files) {
    const full = path.join(DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      errors.push(`${file}: invalid JSON (${e.message})`);
      continue;
    }

    for (const key of REQUIRED_KEYS) {
      if (data[key] == null || data[key] === "") {
        errors.push(`${file}: missing required key "${key}"`);
      }
    }

    const id = String(data.scenario_id || "").trim();
    if (!/^SCN-\d{3}$/.test(id)) {
      errors.push(`${file}: scenario_id must match SCN-NNN (got ${id || "(empty)"})`);
    }
    if (seenIds.has(id)) {
      errors.push(`${file}: duplicate scenario_id ${id} (also ${seenIds.get(id)})`);
    } else {
      seenIds.set(id, file);
    }

    const expectedFile = `${id.toLowerCase()}-${data.name}.json`;
    if (file !== expectedFile) {
      errors.push(`${file}: filename should be ${expectedFile}`);
    }

    const offlineOnly =
      data.offline_only === true ||
      String(data.test_status || "").includes("repository") ||
      data.requires_schmidt_live_proof === false;
    const requiresLive =
      data.requires_schmidt_live_proof === true ||
      (Array.isArray(data.manual_requirements) && data.manual_requirements.length > 0);

    scenarios.push({
      scenario_id: id,
      name: data.name,
      type: data.type,
      test_status: data.test_status,
      file,
      offline_only: Boolean(offlineOnly),
      requires_schmidt_live_proof: Boolean(requiresLive),
    });
  }

  scenarios.sort((a, b) => a.scenario_id.localeCompare(b.scenario_id));

  // Sequential ID gaps are warnings only (legacy gaps allowed).
  const nums = scenarios.map((s) => Number(s.scenario_id.slice(4)));
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] !== nums[i - 1] + 1 && nums[i] !== nums[i - 1]) {
      // gap ok
    }
  }

  if (write) {
    let prior = {};
    if (fs.existsSync(CATALOG_PATH)) {
      prior = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    }
    const catalog = {
      catalog_version: prior.catalog_version || "1.2.0",
      generated_at: new Date().toISOString().slice(0, 10),
      base_id: prior.base_id || "appn84sqPw03zEbTT",
      controlling_doc: "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
      field_name_policy:
        prior.field_name_policy ||
        "Do not invent field names; confirmed from PROD schema snapshot + scripts",
      shared: prior.shared || {
        safe_environment: "PROD",
        enrollment: {
          enrollment_id: "recgP9qZYjAhE7NXm",
          athlete_id: "recgqVstObQRzgXJF",
          must_remain_active: true,
          must_remain_visible_public: true,
        },
      },
      scenarios: scenarios.map((s) => ({
        scenario_id: s.scenario_id,
        name: s.name,
        type: s.type,
        test_status: s.test_status,
        file: s.file,
      })),
    };
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
    console.log(`Wrote catalog.json with ${scenarios.length} scenarios`);
  } else if (fs.existsSync(CATALOG_PATH)) {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    const catalogIds = new Set((catalog.scenarios || []).map((s) => s.scenario_id));
    for (const s of scenarios) {
      if (!catalogIds.has(s.scenario_id)) {
        errors.push(`catalog.json missing ${s.scenario_id} (run with --write)`);
      }
    }
    for (const entry of catalog.scenarios || []) {
      if (!seenIds.has(entry.scenario_id)) {
        errors.push(`catalog.json lists ${entry.scenario_id} but fixture file missing`);
      }
    }
  }

  console.log(`Scenarios scanned: ${scenarios.length}`);
  if (errors.length) {
    console.error("Scenario catalog validation FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Scenario catalog validation PASS");
}

main();
