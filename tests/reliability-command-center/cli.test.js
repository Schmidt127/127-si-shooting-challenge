#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { proposeRepair } = require("../../tools/reliability-command-center/repair-preview");
const { RETRY_CLASS, HEALTH_STATUS } = require("../../lib/reliability-command-center");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ROOT = path.join(__dirname, "../..");
const CLI = path.join(ROOT, "tools/reliability-command-center/cli.js");
const FIXTURE = path.join(__dirname, "fixtures/healthy.json");
const MIXED = path.join(__dirname, "fixtures/mixed-health.json");

test("cli --fixture produces summary json", () => {
  const res = spawnSync(process.execPath, [CLI, "--fixture", FIXTURE], {
    encoding: "utf8",
  });
  assert.strictEqual(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.ok, true);
  assert.ok(typeof out.total === "number");
});

test("cli --input --output writes json and markdown", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcc-"));
  const res = spawnSync(
    process.execPath,
    [CLI, "--input", MIXED, "--output", dir, "--json"],
    { encoding: "utf8" }
  );
  assert.strictEqual(res.status, 0, res.stderr);
  assert.ok(fs.existsSync(path.join(dir, "report.json")));
  assert.ok(fs.existsSync(path.join(dir, "report.md")));
  const report = JSON.parse(fs.readFileSync(path.join(dir, "report.json"), "utf8"));
  assert.ok(report.summary.total > 0);
  assert.ok(report.findings.length > 0);
});

test("cli refuses missing fixture", () => {
  const res = spawnSync(process.execPath, [CLI, "--fixture", "/tmp/does-not-exist-rcc.json"], {
    encoding: "utf8",
  });
  assert.strictEqual(res.status, 1);
});

test("repair preview proposes safe dry-run changes only", () => {
  const armed = proposeRepair({
    code: "sent_still_armed",
    retryEligibility: RETRY_CLASS.DUPLICATE_RISK,
    healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
    owningAutomation: "074",
  });
  assert.strictEqual(armed.apply, false);

  const retryable = proposeRepair({
    code: "was_build_flag_stuck",
    retryEligibility: RETRY_CLASS.AUTOMATICALLY_RETRYABLE,
    healthStatus: HEALTH_STATUS.STALE,
    owningAutomation: "072",
  });
  assert.strictEqual(retryable.apply, true);
  assert.ok(retryable.proposedChanges.length >= 1);
});

test("repair-preview cli requires explicit record ids", () => {
  const script = path.join(ROOT, "tools/reliability-command-center/repair-preview.js");
  const res = spawnSync(process.execPath, [script, "--fixture", MIXED], {
    encoding: "utf8",
  });
  assert.strictEqual(res.status, 1);
  assert.ok(/record-ids/i.test(res.stderr));
});

test("repair-preview cli dry-run with record ids", () => {
  const script = path.join(ROOT, "tools/reliability-command-center/repair-preview.js");
  const res = spawnSync(
    process.execPath,
    [
      script,
      "--fixture",
      MIXED,
      "--record-ids",
      "rec00000000000054,rec00000000000053",
    ],
    { encoding: "utf8" }
  );
  assert.strictEqual(res.status, 0, res.stderr);
  const payload = JSON.parse(res.stdout);
  assert.strictEqual(payload.dryRun, true);
  assert.strictEqual(payload.liveWrites, false);
  assert.ok(payload.findingCount >= 1);
});

console.log("cli.test.js passed");
