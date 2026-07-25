#!/usr/bin/env node
/**
 * Agent 4 — run repository contract / regression suite (no live Airtable, no email).
 *
 * Usage: node tools/testing/run-agent4-suite.js
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "../..");

const COMMANDS = [
  { name: "was-email-contracts", args: ["tests/was-email-contracts/run-all.js"] },
  { name: "homework-contracts", args: ["tests/homework-contracts/run-all.js"] },
  { name: "config-selection", args: ["tests/config-selection/resolve-config.test.js"] },
  {
    name: "v2-engine-contracts",
    args: ["airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js"],
  },
  {
    name: "072-074-email-helpers",
    args: ["airtable/automations/shooting-challenge/lib/072-074-email-helpers.test.js"],
  },
  {
    name: "118-119-week-key",
    args: ["airtable/automations/shooting-challenge/lib/118-119-week-key.test.js"],
  },
  {
    name: "c011-weekly-email-schedule",
    args: ["airtable/automations/shooting-challenge/lib/c011-weekly-email-schedule.test.js"],
  },
  {
    name: "overnight-perfect-week",
    args: ["airtable/automations/shooting-challenge/lib/overnight-perfect-week.test.js"],
  },
  {
    name: "agent4-perfect-week-edges",
    args: ["airtable/automations/shooting-challenge/lib/agent4-perfect-week-edges.test.js"],
  },
  {
    name: "overnight-streak-milestone-dedupe",
    args: ["airtable/automations/shooting-challenge/lib/overnight-streak-milestone-dedupe.test.js"],
  },
  {
    name: "overnight-level-gate-boundaries",
    args: ["airtable/automations/shooting-challenge/lib/overnight-level-gate-boundaries.test.js"],
  },
  {
    name: "overnight-xp-rules-and-unlocks",
    args: ["airtable/automations/shooting-challenge/lib/overnight-xp-rules-and-unlocks.test.js"],
  },
  {
    name: "overnight-xp-date-source",
    args: ["airtable/automations/shooting-challenge/lib/overnight-xp-date-source.test.js"],
  },
  {
    name: "agent4-xp-dedupe-matrix",
    args: ["airtable/automations/shooting-challenge/lib/agent4-xp-dedupe-matrix.test.js"],
  },
  {
    name: "066-milestone-crossing",
    args: ["airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js"],
  },
  {
    name: "script-header-contract",
    args: ["airtable/automations/shooting-challenge/lib/script-header-contract.test.js"],
  },
  {
    name: "upload-make-lambda-response",
    args: ["airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js"],
  },
  {
    name: "c025-zoom-recording-credit",
    args: ["airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js"],
  },
  {
    name: "tools/testing node --test (115/117/verifier)",
    cmd: process.execPath,
    args: [
      "--test",
      "tools/testing/tests/test_115_offline.mjs",
      "tools/testing/tests/test_117_offline.mjs",
      "tools/testing/tests/test_expected_actual.mjs",
    ],
  },
  { name: "validate-v2-release-readiness", args: ["tools/validate-v2-release-readiness.js"] },
];

const results = [];
let failed = 0;

for (const entry of COMMANDS) {
  const cmd = entry.cmd || process.execPath;
  const args = entry.args;
  const started = Date.now();
  const run = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const ok = run.status === 0;
  if (!ok) failed += 1;
  results.push({
    name: entry.name,
    ok,
    status: run.status,
    ms: Date.now() - started,
  });
  console.log(`${ok ? "PASS" : "FAIL"}  ${entry.name} (${Date.now() - started}ms)`);
  if (!ok) {
    if (run.stdout) console.log(run.stdout.slice(-2000));
    if (run.stderr) console.error(run.stderr.slice(-2000));
  }
}

console.log("");
console.log(`Agent 4 suite: ${results.length - failed} passed, ${failed} failed, ${results.length} total`);
if (failed > 0) process.exit(1);
