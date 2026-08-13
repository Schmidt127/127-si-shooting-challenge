#!/usr/bin/env node
/**
 * Agent 9 — automation ownership contract tests.
 * Plain Node assert suite (no Airtable mocks).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateWasOwnership,
  runHarness,
} from "../../tools/testing/automation-ownership/run-contract-harness.mjs";

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

check("registry marks ZOOM_CREDIT as design_alternative_not_deployed", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(DOCS, "xp-source-key-registry.json"), "utf8"));
  const zoom = registry.prefixes.find((p) => p.prefix === "ZOOM_CREDIT|");
  assert.equal(zoom.status, "design_alternative_not_deployed");
  assert.equal(zoom.authoritative_writer, null);
  assert.ok(
    (zoom.script_paths || []).some((p) => p.includes("_design-alternatives/")),
    "ZOOM_CREDIT scripts must live under design-alternatives"
  );
});

check("registry marks ZOOM_REC_EMAIL writer as Automation 117", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(DOCS, "xp-source-key-registry.json"), "utf8"));
  const email = registry.prefixes.find((p) => p.prefix === "ZOOM_REC_EMAIL|");
  assert.equal(email.authoritative_writer, "117");
  assert.equal(email.make_workflow_id, "117f");
  assert.ok(String(email.script_path).includes("117-zoom-send-recording-approval-email-to-make.js"));
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

for (const [name, input, expectedPass] of [
  ["031 owner with lookup and WAS create", { automation: "031", text: "findValidCanonicalSummaries(); summariesTable.createRecordAsync({});" }, true],
  ["031 owner missing lookup", { automation: "031", text: "summariesTable.createRecordAsync({});" }, false],
  ["031 owner missing WAS create", { automation: "031", text: "findValidCanonicalSummaries();" }, false],
  ["101 find-only consumer", { automation: "101", text: "findWeeklySummaryId();" }, true],
  ["118 find-only consumer", { automation: "118", text: "wasBySummaryKey.get(expectedSummaryKey);" }, true],
  ["101 cannot create WAS", { automation: "101", text: "findWeeklySummaryId(); weeklySummaryTable.createRecordAsync({});" }, false],
  ["118 cannot create WAS", { automation: "118", text: "wasBySummaryKey.get(); wasTable.createRecordAsync({});" }, false],
  ["101 requires lookup", { automation: "101", text: "" }, false],
  ["118 requires lookup", { automation: "118", text: "" }, false],
]) {
  check(`WAS ownership: ${name}`, () => {
    const result = evaluateWasOwnership(input);
    assert.equal(result.findings.some((finding) => finding.severity === "fail"), !expectedPass);
    assert.equal(result.role, input.automation === "031" ? "create_capable_owner" : "find_only_consumer");
    assert.equal(typeof result.findOnly, "boolean");
  });
}

check("harness reports ok with zero fails", () => {
  const result = runHarness();
  const fails = result.findings.filter((f) => f.severity === "fail");
  assert.equal(fails.length, 0, JSON.stringify(fails, null, 2));
  assert.equal(result.ok, true);
  assert.ok(result.counts.pass > 0);
});

check("harness warns on 065 legacy ignore (ZOOM_CREDIT dual-ownership warn retired)", () => {
  const result = runHarness();
  const warns = result.findings.filter((f) => f.severity === "warn");
  assert.ok(
    warns.some((w) => w.code === "065_ignores_legacy_keys"),
    "expected 065 legacy-key warn"
  );
  assert.ok(
    !result.findings.some((f) => f.code === "zoom_credit_not_resolved" && f.severity === "fail"),
    "ZOOM_CREDIT must be resolved as design alternative"
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
