#!/usr/bin/env node
/**
 * Agent 9 — automation ownership contract tests.
 * Plain Node assert suite (no Airtable mocks).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runHarness } from "../../tools/testing/automation-ownership/run-contract-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, "../../docs/next-wave/automation-ownership");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
    return true;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
    return false;
  }
}

let passed = 0;
let failed = 0;

function check(name, fn) {
  if (test(name, fn)) passed += 1;
  else failed += 1;
}

check("deliverable docs exist", () => {
  for (const name of [
    "AUTOMATION-WRITER-INVENTORY.md",
    "SINGLE-WRITER-OWNERSHIP-MATRIX.md",
    "xp-source-key-registry.json",
    "WAS-UNIQUENESS-CONTRACT.md",
    "AUTOMATION-ATTESTATION-PACKET.md",
    "writer-inventory.json",
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, name)), `missing ${name}`);
  }
});

check("registry parses and flags ZOOM_CREDIT duplicate_risk", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(DOCS, "xp-source-key-registry.json"), "utf8"));
  const zoom = registry.prefixes.find((p) => p.prefix === "ZOOM_CREDIT|");
  assert.equal(zoom.status, "duplicate_risk");
  assert.ok(zoom.authoritative_writer_candidates.includes("117"));
  assert.ok(zoom.authoritative_writer_candidates.includes("117c"));
});

check("inventory marks 112 legacy_off and 013 authoritative", () => {
  const inventory = JSON.parse(fs.readFileSync(path.join(DOCS, "writer-inventory.json"), "utf8"));
  const vf112 = inventory.writers.find((w) => w.automation_number === "112");
  const vf013 = inventory.writers.find((w) => w.automation_number === "013");
  assert.equal(vf112.classification, "legacy_off");
  assert.equal(vf013.classification, "authoritative_writer");
});

check("inventory marks 063 legacy_off and 020 authoritative", () => {
  const inventory = JSON.parse(fs.readFileSync(path.join(DOCS, "writer-inventory.json"), "utf8"));
  assert.equal(inventory.writers.find((w) => w.automation_number === "063").classification, "legacy_off");
  assert.equal(inventory.writers.find((w) => w.automation_number === "020").classification, "authoritative_writer");
});

check("WAS identity contract doc states Enrollment + Week", () => {
  const text = fs.readFileSync(path.join(DOCS, "WAS-UNIQUENESS-CONTRACT.md"), "utf8");
  assert.match(text, /Enrollment \+ Week/);
  assert.match(text, /Never write/);
});

check("harness reports ok with zero fails", () => {
  const result = runHarness();
  const fails = result.findings.filter((f) => f.severity === "fail");
  assert.equal(fails.length, 0, JSON.stringify(fails, null, 2));
  assert.equal(result.ok, true);
  assert.ok(result.counts.pass > 0);
});

check("harness warns on ZOOM_CREDIT dual ownership and 065 legacy ignore", () => {
  const result = runHarness();
  const warns = result.findings.filter((f) => f.severity === "warn");
  assert.ok(
    warns.some((w) => w.code === "duplicate_prefix_flagged" || w.code === "065_ignores_legacy_keys"),
    "expected warn findings"
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
