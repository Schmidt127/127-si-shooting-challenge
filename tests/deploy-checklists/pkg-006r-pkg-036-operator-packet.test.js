#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const packetPath = path.join(
  root,
  "docs/deploy-checklists/PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md"
);
const packet = fs.readFileSync(packetPath, "utf8");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("identifies exact source versions and paths", () => {
  assert.match(packet, /010.*v10\.8/);
  assert.match(packet, /041.*v5\.0/);
  assert.match(packet, /042.*v4\.0/);
  for (const file of [
    "010-submission-intake-create-xp-event.js",
    "041-levels-and-progression-mark-enrollment-for-level-recalculation.js",
    "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
  ]) {
    assert.match(packet, new RegExp(file.replace(/[.?]/g, "\\$&")));
  }
});

test("protects the PKG-006R multi-family controlled records", () => {
  for (const id of [
    "recY0o5tpqMfvlCCa",
    "recacQfNbArf2ygT2",
    "recJGcfipFyKwiSC5",
    "rec58gdymfPKKeVRI",
    "reckjvVwtsjJ9Czyl",
  ]) {
    assert.match(packet, new RegExp(id));
  }
  assert.match(packet, /never delete or clone an XP Event/i);
  assert.match(packet, /same Base XP Event ID/i);
  assert.match(packet, /Reconciliation Needed\?.*numeric `0`/);
});

test("keeps PKG-036 locked and defines safe install order", () => {
  assert.match(packet, /PKG-036 must not begin until/i);
  assert.match(packet, /Turn \*\*041\*\*.*\*\*042\*\*.*\*\*OFF\*\*/s);
  assert.match(packet, /Enable 042 first, then 041/i);
  assert.match(packet, /15-minute/i);
  assert.match(packet, /043 remains absent/i);
  assert.match(packet, /077.*Retired \/ deleted/i);
});

test("contains an evidence worksheet and offline command coverage", () => {
  assert.match(packet, /Evidence worksheet — fill in during execution/);
  for (const token of [
    "actionOut",
    "statusOut",
    "errorOut",
    "Progression Last Queued Signature",
    "Progression Last Reconciled Signature",
    "Audit JSON filename",
    "test_041_recalculation_coverage",
    "source-key-registry",
    "active-automation-unload-compat",
    "node --check airtable/automations/shooting-challenge/010",
  ]) {
    assert.match(packet, new RegExp(token.replace(/[?]/g, "\\$&")));
  }
});

console.log("PKG-006R/PKG-036 operator packet contract tests passed");
