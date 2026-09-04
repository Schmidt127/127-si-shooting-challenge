#!/usr/bin/env node
"use strict";

/**
 * Narrow offline contract for SC-057/SC-058 workflow reliability attestation (2026-09-04).
 * Does not call Airtable. Guards doc/script contracts that prevent silent duplicate writers
 * and documents the known 058 positive-only trigger hazard.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const attestationPath = path.join(
  ROOT,
  "docs/audits/SC-057-058-LIVE-ATTESTATION-20260904.md"
);
const inventoryPath = path.join(
  ROOT,
  "docs/audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md"
);
const remediationPath = path.join(
  ROOT,
  "docs/audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md"
);
const script058 = path.join(
  ROOT,
  "airtable/automations/shooting-challenge/058-achievements-and-milestones-create-perfect-week-unlock.js"
);

test("live attestation doc exists and lists 50 automations", () => {
  const text = fs.readFileSync(attestationPath, "utf8");
  assert.match(text, /\*\*50\*\*/);
  assert.match(text, /112 absent/i);
  assert.match(text, /043 absent/i);
  assert.match(text, /wflVRPhgunsosFjWS/); // 057
  assert.match(text, /wflDinFz6FBIGEOMg/); // 058
});

test("inventory and remediation docs exist with required sections", () => {
  const inv = fs.readFileSync(inventoryPath, "utf8");
  const rem = fs.readFileSync(remediationPath, "utf8");
  for (const domain of [
    "Enrollment",
    "Submissions",
    "Homework",
    "Perfect Week",
    "Zoom",
    "authentication",
  ]) {
    assert.match(inv, new RegExp(domain, "i"));
  }
  assert.match(rem, /SF-01/);
  assert.match(rem, /SF-02/);
  assert.match(rem, /positive-only/i);
});

test("058 script warns against positive-only eligibility triggers", () => {
  const text = fs.readFileSync(script058, "utf8");
  assert.match(text, /Do not use positive-only eligibility/i);
  assert.match(text, /PERFECT_WEEK\|/);
  assert.match(text, /Version:\s*1\.5/);
});

test("retired duplicate-writer slots remain non-production disposition in attestation", () => {
  const text = fs.readFileSync(attestationPath, "utf8");
  for (const slot of ["043", "063", "068", "075", "077", "111", "112"]) {
    assert.match(text, new RegExp(slot));
  }
  assert.doesNotMatch(text, /112 deployed/i);
});

console.log("All SC-057/058 reliability contract checks passed.");
