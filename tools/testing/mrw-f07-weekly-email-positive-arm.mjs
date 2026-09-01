#!/usr/bin/env node
/**
 * MRW-F07 — weekly email positive-arm harness (118→072→119→074→079→Hub writeback).
 *
 *   node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify --was-id recXXX
 *   node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify-writeback --was-id recXXX
 *   node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --plan --was-id recXXX [--arm-build] [--arm-send]
 *   node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --apply --was-id recXXX [--arm-send]
 *
 * Safety: dry-run default; disposable WAS only; never sends email from this CLI.
 * WE-06 writeback verification is read-only — Hub owns field writes (FUT-006).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HARNESS_ID,
  EVIDENCE_DIR,
  MANIFEST_PATH,
  buildDryRunPlan,
  loadWasSnapshot,
  loadWasWritebackSnapshot,
  assertDisposableWas,
  applyBuildArm,
  applySendArm,
  evaluateOfflineContract,
} from "./lib/mrw-f07-weekly-email-lib.mjs";
import { requireToken } from "./lib/airtable-client.mjs";

function parseArgs(argv) {
  const args = {
    verify: false,
    verifyWriteback: false,
    plan: false,
    apply: false,
    wasId: null,
    armBuild: false,
    armSend: false,
    force: false,
    out: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--verify") args.verify = true;
    else if (flag === "--verify-writeback") args.verifyWriteback = true;
    else if (flag === "--plan") args.plan = true;
    else if (flag === "--apply") args.apply = true;
    else if (flag === "--arm-build") args.armBuild = true;
    else if (flag === "--arm-send") args.armSend = true;
    else if (flag === "--force") args.force = true;
    else if (flag === "--was-id") args.wasId = argv[++i];
    else if (flag === "--out") args.out = resolve(argv[++i]);
    else if (flag === "--help" || flag === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  return args;
}

function printHelp() {
  console.log(`MRW-F07 weekly email positive-arm harness

Usage:
  node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify --was-id <rec...>
  node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify-writeback --was-id <rec...>
  node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --plan --was-id <rec...> [--arm-build] [--arm-send]
  node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --apply --was-id <rec...> [--arm-send]

Offline contracts:
  node tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs
  node tools/testing/tests/test_mrw_f07_was_writeback_contract.mjs
`);
}

function writeEvidence(payload, outPath) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const target = outPath || resolve(EVIDENCE_DIR, `${new Date().toISOString().slice(0, 10)}-verify.json`);
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(MANIFEST_PATH, `${JSON.stringify({ lastRun: payload.finishedAt, target, wasId: payload.wasId }, null, 2)}\n`);
  return target;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.verify && !args.verifyWriteback && !args.plan && !args.apply) {
    console.log(JSON.stringify({ harness: HARNESS_ID, offline: evaluateOfflineContract() }, null, 2));
    return;
  }

  if (!args.wasId?.startsWith("rec")) {
    throw new Error("--was-id rec... is required");
  }

  const { token, baseId } = requireToken();
  const startedAt = new Date().toISOString();

  if (args.verifyWriteback) {
    const writebackSnapshot = await loadWasWritebackSnapshot(token, baseId, args.wasId);
    const payload = {
      harness: HARNESS_ID,
      mode: "verify-writeback",
      startedAt,
      finishedAt: new Date().toISOString(),
      wasId: args.wasId,
      ...writebackSnapshot,
    };
    console.log(JSON.stringify(payload, null, 2));
    writeEvidence({ ...payload, snapshot: writebackSnapshot }, args.out);
    if (!writebackSnapshot.skipped && writebackSnapshot.passed === false) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.plan) {
    const plan = buildDryRunPlan({
      wasId: args.wasId,
      armBuild: args.armBuild || args.apply,
      armSend: args.armSend,
    });
    const snapshot = await loadWasSnapshot(token, baseId, args.wasId);
    const payload = { harness: HARNESS_ID, mode: "plan", startedAt, finishedAt: new Date().toISOString(), plan, snapshot };
    console.log(JSON.stringify(payload, null, 2));
    writeEvidence(payload, args.out);
    return;
  }

  if (args.verify) {
    const snapshot = await loadWasSnapshot(token, baseId, args.wasId);
    const payload = {
      harness: HARNESS_ID,
      mode: "verify",
      startedAt,
      finishedAt: new Date().toISOString(),
      wasId: args.wasId,
      snapshot,
      pass: snapshot.passed,
    };
    console.log(JSON.stringify(payload, null, 2));
    writeEvidence(payload, args.out);
    process.exitCode = snapshot.passed ? 0 : 1;
    return;
  }

  if (args.apply) {
    await assertDisposableWas(token, baseId, args.wasId, { force: args.force });
    let snapshot = await applyBuildArm(token, baseId, args.wasId);
    if (args.armSend) {
      snapshot = await applySendArm(token, baseId, args.wasId);
    }
    const payload = {
      harness: HARNESS_ID,
      mode: "apply",
      startedAt,
      finishedAt: new Date().toISOString(),
      wasId: args.wasId,
      armSend: args.armSend,
      snapshot,
      pass: args.armSend ? snapshot.stages.find((s) => s.id === "WE-04")?.pass : snapshot.stages.find((s) => s.id === "WE-02")?.pass,
    };
    console.log(JSON.stringify(payload, null, 2));
    writeEvidence(payload, args.out);
    process.exitCode = payload.pass ? 0 : 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
