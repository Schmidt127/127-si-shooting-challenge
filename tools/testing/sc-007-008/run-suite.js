#!/usr/bin/env node
/**
 * Run SC-007 + SC-008 offline proof packs and related regression tests.
 *
 *   node tools/testing/sc-007-008/run-suite.js
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "../../..");

const COMMANDS = [
  {
    name: "sc-007-idempotency-proof-pack",
    args: ["tools/testing/sc-007-008/idempotency-proof-pack.test.js"],
  },
  {
    name: "sc-008-failure-path-pack",
    args: ["tools/testing/sc-007-008/failure-path-pack.test.js"],
  },
  {
    name: "upload-make-lambda-response",
    args: [
      "airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js",
    ],
  },
  {
    name: "agent4-xp-dedupe-matrix",
    args: [
      "airtable/automations/shooting-challenge/lib/agent4-xp-dedupe-matrix.test.js",
    ],
  },
  {
    name: "072-074-email-helpers",
    args: [
      "airtable/automations/shooting-challenge/lib/072-074-email-helpers.test.js",
    ],
  },
  {
    name: "072-weekly-xp-reconciliation",
    cmd: process.execPath,
    args: ["tools/testing/tests/test_072_weekly_xp_reconciliation.mjs"],
  },
  {
    name: "paste-bundle-integrity",
    cmd: process.execPath,
    args: ["tools/testing/tests/test_paste_bundle_integrity.mjs"],
  },
  {
    name: "expected-actual-offline",
    cmd: process.execPath,
    args: ["--test", "tools/testing/tests/test_expected_actual.mjs"],
  },
];

let failed = 0;
const results = [];

for (const entry of COMMANDS) {
  const started = Date.now();
  const run = spawnSync(entry.cmd || process.execPath, entry.args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const ok = run.status === 0;
  if (!ok) failed += 1;
  results.push({ name: entry.name, ok, ms: Date.now() - started });
  console.log(`${ok ? "PASS" : "FAIL"}  ${entry.name} (${Date.now() - started}ms)`);
  if (!ok) {
    if (run.stdout) console.log(run.stdout.slice(-2000));
    if (run.stderr) console.error(run.stderr.slice(-2000));
  }
}

console.log("");
console.log(
  `SC-007/008 suite: ${results.length - failed} passed, ${failed} failed, ${results.length} total`
);
if (failed > 0) process.exit(1);
