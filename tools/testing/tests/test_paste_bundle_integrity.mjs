#!/usr/bin/env node
/**
 * Validates production QA paste bundles match GitHub source scripts.
 * Run: node tools/testing/tests/test_paste_bundle_integrity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const BUNDLES = [
  {
    id: "010",
    version: "v10.12",
    source:
      "airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js",
    paste: "docs/deploy-checklists/010-v10.12-PASTE.txt",
    start: "/************************************************************\n * 010 - SUBMISSION INTAKE",
    mustInclude: [
      'version: "v10.12"',
      "skipped_not_ready",
      "formulaSettlementAttempts",
      "SUBMISSION_XP|",
      "America/Denver",
    ],
  },
  {
    id: "057",
    version: "1.9",
    source:
      "airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js",
    paste: "docs/deploy-checklists/057-v1.9-PASTE.txt",
    start:
      "/***************************************************************************************************\n * 057 - Achievements",
    mustInclude: [
      "Version: 1.9",
      "Goal Shots Target",
      "Weekly Goal Shots Target",
      "America/Denver",
      "Perfect Week Automation Status",
    ],
  },
  {
    id: "072",
    version: "v4.3",
    source:
      "airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js",
    paste: "docs/deploy-checklists/072-v4.3-PASTE.txt",
    start: "/************************************************************\n * 072 - EMAIL",
    mustInclude: [
      'version: "v4.3"',
      "Unlinked canonical XP",
      "WAS-linked active XP",
      "orphanXp",
      "America/Denver",
    ],
    mustExclude: ["fetch(", "makeWebhookUrl"],
  },
];

function extractBody(text, start) {
  const idx = text.indexOf(start);
  assert.ok(idx >= 0, `start marker missing`);
  return text.slice(idx);
}

for (const spec of BUNDLES) {
  const sourceText = readFileSync(resolve(ROOT, spec.source), "utf8");
  const pasteText = readFileSync(resolve(ROOT, spec.paste), "utf8");
  const expected = extractBody(sourceText, spec.start);
  assert.equal(pasteText, expected, `${spec.id} paste bundle drift from source`);
  assert.ok(!/\bimport\s+/.test(pasteText), `${spec.id} must not use ES imports`);
  assert.ok(!/\brequire\s*\(/.test(pasteText), `${spec.id} must not use require()`);
  for (const needle of spec.mustInclude) {
    assert.ok(pasteText.includes(needle), `${spec.id} missing ${needle}`);
  }
  for (const bad of spec.mustExclude || []) {
    assert.ok(!pasteText.includes(bad), `${spec.id} must not include ${bad}`);
  }
  const hash = createHash("sha256").update(pasteText).digest("hex").slice(0, 12);
  console.log(`OK ${spec.id} ${spec.version} paste bundle sha256:${hash}`);
}

console.log("PASS test_paste_bundle_integrity.mjs");
