#!/usr/bin/env node
"use strict";

const { writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { verifyIdentity, getIdentitySnapshot, writeIdentityEvidence } = require("./identity");
const { listScenarios, summarizeRegistry, getScenario } = require("./scenario-registry");
const { runScenarioDryRun, runScenarioExecute } = require("./runner");
const { assertExecuteAllowed } = require("./safety");
const { listPresets } = require("./lib/failure-injection");
const { runReadOnlyScan } = require("./lib/readonly-expected-actual");
const { EVIDENCE_DIR } = require("./config");

const ROOT = resolve(__dirname, "../..");

function usage() {
  console.log(`Usage: node cli.js <command> [options]

Commands:
  list [--domain <domain>]
  identity verify | identity show
  scenario <id> [--dry-run|--execute] [--acknowledge-prod] [--confirm-destructive]
  domain <domain> [--dry-run]
  report <runId>
  verify-cleanup <runId>
  failures list
  readonly-scan
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const flags = {
    dryRun: !args.includes("--execute"),
    execute: args.includes("--execute"),
    acknowledgeProd: args.includes("--acknowledge-prod"),
    confirmDestructive: args.includes("--confirm-destructive"),
    domain: null,
    runId: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--domain") flags.domain = args[++i];
    if (args[i] === "report" || args[i] === "verify-cleanup") flags.runId = args[i + 1];
  }
  return { cmd, args, flags };
}

async function main() {
  const { cmd, args, flags } = parseArgs(process.argv);
  if (!cmd || cmd === "help" || cmd === "-h") {
    usage();
    return;
  }

  if (cmd === "list") {
    const rows = listScenarios({ domain: flags.domain || undefined });
    console.log(JSON.stringify({ count: rows.length, scenarios: rows.map((r) => r.scenarioId) }, null, 2));
    return;
  }

  if (cmd === "identity") {
    const sub = args[1];
    if (sub === "show") {
      console.log(JSON.stringify(getIdentitySnapshot(), null, 2));
      return;
    }
    if (sub === "verify") {
      const result = await verifyIdentity();
      const path = writeIdentityEvidence(result);
      console.log(JSON.stringify({ wrote: path, result }, null, 2));
      if (result.result === "FAIL" || result.result === "BLOCKED") process.exitCode = 2;
      return;
    }
    throw new Error("identity subcommand: verify | show");
  }

  if (cmd === "scenario") {
    const id = args[1];
    if (!id) throw new Error("scenario id required");
    const out =
      flags.execute
        ? runScenarioExecute(id, flags)
        : runScenarioDryRun(id, { runId: flags.runId });
    console.log(JSON.stringify(out.result, null, 2));
    if (out.result.result === "FAIL") process.exitCode = 1;
    if (out.result.result === "BLOCKED" && flags.execute) process.exitCode = 2;
    return;
  }

  if (cmd === "domain") {
    const domain = args[1];
    if (!domain) throw new Error("domain required");
    const rows = listScenarios({ domain });
    const results = rows.map((r) => runScenarioDryRun(r.scenarioId).result);
    console.log(JSON.stringify({ domain, results }, null, 2));
    return;
  }

  if (cmd === "report") {
    const summary = summarizeRegistry();
    const outPath = resolve(ROOT, "..", EVIDENCE_DIR, "SCENARIO-REGISTRY-REPORT.json");
    mkdirSync(resolve(outPath, ".."), { recursive: true });
    writeFileSync(outPath, JSON.stringify({ runId: args[1] || "wave-b", summary, generated_at: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ wrote: outPath, summary }, null, 2));
    return;
  }

  if (cmd === "verify-cleanup") {
    console.log(JSON.stringify({ runId: args[1], status: "SKIPPED", note: "Wave C implements cleanup verification" }, null, 2));
    return;
  }

  if (cmd === "failures" && args[1] === "list") {
    console.log(JSON.stringify({ presets: listPresets() }, null, 2));
    return;
  }

  if (cmd === "readonly-scan") {
    const scan = await runReadOnlyScan({});
    console.log(JSON.stringify(scan, null, 2));
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
