#!/usr/bin/env node
/**
 * V2 DEV Runbook Operator CLI
 *
 * Safe defaults: dry-run, DEV base only, no token printing, no PROD.
 *
 * Usage:
 *   node tools/airtable/v2_dev_runbook/cli.js help
 *   node tools/airtable/v2_dev_runbook/cli.js list
 *   node tools/airtable/v2_dev_runbook/cli.js plan --smoke-only
 *   node tools/airtable/v2_dev_runbook/cli.js verify-env --dev-confirm
 *   node tools/airtable/v2_dev_runbook/cli.js run-offline
 *   node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm
 *   node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --execute --enrollment rec...
 *   node tools/airtable/v2_dev_runbook/cli.js collect-evidence A3 --dev-confirm
 *   node tools/airtable/v2_dev_runbook/cli.js cleanup A3 --dev-confirm --rollback-only
 *   node tools/airtable/v2_dev_runbook/cli.js status
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const {
  DEV_BASE_ID,
  PROD_BASE_ID,
  CLASSIFICATION_PATH,
  SUPPORTED_LIVE_TESTS,
  PACKAGE_ROOT,
  REPO_ROOT,
  getEvidenceRoot,
  getRunStateDir,
} = require("./lib/constants");
const { parseArgs, printHelp } = require("./lib/args");
const {
  SafetyError,
  loadCliEnv,
  assertDevConfirm,
  assertExecuteForWrites,
  assertSupportedLiveTest,
  assertValidTestId,
  assertDevBaseId,
  assertNoProdIdentifiers,
  isWriteAllowed,
  buildPreflightSummary,
  formatPreflight,
  tokenPresent,
  getBaseId,
} = require("./lib/safety");
const { verifyEnv, formatVerifyEnv } = require("./lib/env_verify");
const {
  createRunState,
  writeRunState,
  latestRunStateForTest,
  listRunStates,
  assertCleanupOwnership,
  markCleanup,
} = require("./lib/run_state");
const { writeEvidence } = require("./lib/evidence");
const { createAirtableClient } = require("./lib/airtable_client");
const { getScenario, loadFixture } = require("./lib/scenarios");

function loadClassification() {
  return JSON.parse(fs.readFileSync(CLASSIFICATION_PATH, "utf8"));
}

function print(msg) {
  console.log(msg);
}

function printErr(msg) {
  console.error(msg);
}

async function cmdList(parsed) {
  const classification = loadClassification();
  const smokeOnly = parsed.has("smoke-only");
  let rows = classification.tests;
  if (smokeOnly) rows = rows.filter((t) => t.launch_smoke);
  print("ID   SMOKE  LIVE_CLI  DOMAIN                 MODES");
  for (const row of rows) {
    const live = SUPPORTED_LIVE_TESTS.includes(row.id) ? "yes" : "no";
    print(
      `${row.id.padEnd(4)} ${(row.launch_smoke ? "yes" : "no").padEnd(6)} ${live.padEnd(8)} ${(row.domain || "-").padEnd(22)} ${(row.modes || []).join(",")}`,
    );
  }
  print("");
  print(`Live CLI supported: ${SUPPORTED_LIVE_TESTS.join(", ")}`);
  print(`DEV ${DEV_BASE_ID} · PROD refused ${PROD_BASE_ID}`);
  return { ok: true };
}

async function cmdPlan(parsed) {
  const classification = loadClassification();
  const smokeOnly = parsed.has("smoke-only");
  let rows = classification.tests;
  if (smokeOnly) rows = rows.filter((t) => t.launch_smoke);
  print("V2 DEV execution plan (CLI)");
  print(`Filter smoke-only=${smokeOnly}`);
  print("");
  for (const row of rows) {
    const live = SUPPORTED_LIVE_TESTS.includes(row.id) ? "LIVE_CLI" : "doc_only";
    print(
      `${row.id} [${live}] ${row.domain} :: ${(row.modes || []).join(",")} :: autos ${(row.automations || []).join("/")}`,
    );
  }
  print("");
  print("Mike / Desktop Lead quickstart:");
  print("  node tools/airtable/v2_dev_runbook/cli.js verify-env --dev-confirm");
  print("  node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm");
  print("  node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --execute --enrollment recXXXX");
  return { ok: true };
}

async function cmdVerifyEnv(parsed, env) {
  assertDevConfirm(parsed);
  const summary = buildPreflightSummary({
    command: "verify-env",
    parsed,
    env,
    writeIntent: false,
  });
  print(formatPreflight(summary));
  print("");

  if (getBaseId(env)) {
    assertDevBaseId(getBaseId(env));
  }
  assertNoProdIdentifiers(env);

  const result = await verifyEnv(env, {
    probeLive: parsed.has("execute") && tokenPresent(env) && getBaseId(env) === DEV_BASE_ID,
    enrollmentId: parsed.get("enrollment", ""),
    requireEnrollment: parsed.has("execute"),
    fetchImpl: global.fetch,
  });
  print(formatVerifyEnv(result));
  return { ok: result.ok, result };
}

async function cmdRunOffline() {
  const script = path.join(PACKAGE_ROOT, "run_offline_fixture_suite.js");
  const res = spawnSync(process.execPath, [script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return { ok: res.status === 0, status: res.status };
}

async function cmdRunTest(parsed, env) {
  const testId = assertSupportedLiveTest(parsed.positionals[0]);
  assertDevConfirm(parsed);

  const writeIntent = true; // scenario may write when --execute
  const summary = buildPreflightSummary({
    command: "run-test",
    testId,
    parsed,
    env,
    writeIntent,
  });
  print(formatPreflight(summary));
  print("");

  // Live path always requires DEV base + no PROD identifiers when confirming
  assertNoProdIdentifiers(env);
  if (parsed.has("execute")) {
    assertExecuteForWrites(parsed, true);
    assertDevBaseId(getBaseId(env));
    if (!tokenPresent(env)) {
      throw new SafetyError("missing_token", "AIRTABLE_TOKEN required for --execute");
    }
  }

  const scenario = getScenario(testId);
  const enrollmentId = parsed.get("enrollment", env.DEV_TEST_ENROLLMENT_ID || "");
  const assignmentId = parsed.get("assignment", env.DEV_HOMEWORK_ASSIGNMENT_ID || "");
  const meetingId = parsed.get("meeting", env.DEV_ZOOM_MEETING_ID || "");
  const weekId = parsed.get("week", env.DEV_TEST_WEEK_ID || "");
  const plan = await scenario.plan({
    enrollmentId,
    assignmentId,
    meetingId,
    weekId,
    submissionId: parsed.get("submission", ""),
  });
  print("== Scenario plan ==");
  print(JSON.stringify({ id: scenario.id, title: scenario.title, plan }, null, 2));
  print("");

  const dryRun = !isWriteAllowed(parsed);
  const { state, filePath } = createRunState({
    testId,
    operator: parsed.get("operator", ""),
    enrollmentId,
    dryRun,
  });

  let client = {
    dryRun: true,
    async createRecord() {
      return { dryRun: true };
    },
    async updateRecord(table, id) {
      return { dryRun: true, id: id || "(dry-run)" };
    },
    async deleteRecord() {
      return { dryRun: true };
    },
  };

  if (!dryRun) {
    client = createAirtableClient({ env, dryRun: false, fetchImpl: global.fetch });
  }

  const execResult = await scenario.execute({ client, plan, state });
  const nextState = writeRunState(filePath, {
    ...execResult.state,
    status: dryRun ? "dry_run_complete" : "executed_pending_confirm",
    notes: parsed.get("notes", ""),
  });

  const evidence = writeEvidence({
    testId,
    timestamp: new Date().toISOString(),
    baseId: DEV_BASE_ID,
    operator: parsed.get("operator", ""),
    dryRun,
    runId: nextState.runId,
    preTestState: nextState.preTestState || plan.preTestState,
    recordsCreated: nextState.recordsCreated || [],
    expectedResult: scenario.expectedResult,
    actualResult: execResult.actualResult,
    automationEvidence: execResult.automationEvidence,
    cleanupResult: {},
    result: execResult.result || (dryRun ? "blocked" : "pass_pending_operator_confirm"),
    notes: parsed.get("notes", ""),
  });

  print("== Result ==");
  print(`dry-run: ${dryRun ? "YES" : "NO"}`);
  print(`run-state: ${filePath}`);
  print(`evidence: ${evidence.filePath}`);
  print(`result: ${execResult.result}`);
  print(execResult.actualResult);

  if (dryRun) {
    print("");
    print("No Airtable writes performed (dry-run default).");
    print("After Mike authorization:");
    print(
      `  node tools/airtable/v2_dev_runbook/cli.js run-test ${testId} --dev-confirm --execute --enrollment <recDEV>`,
    );
  }

  return { ok: true, dryRun, filePath, evidencePath: evidence.filePath, state: nextState };
}

async function cmdCollectEvidence(parsed, env) {
  const testId = assertSupportedLiveTest(parsed.positionals[0]);
  assertDevConfirm(parsed);
  const summary = buildPreflightSummary({
    command: "collect-evidence",
    testId,
    parsed,
    env,
    writeIntent: false,
  });
  print(formatPreflight(summary));

  const latest = latestRunStateForTest(testId);
  const scenario = getScenario(testId);
  const fixture = loadFixture(scenario.fixture);

  const payload = {
    testId,
    timestamp: new Date().toISOString(),
    baseId: DEV_BASE_ID,
    operator: parsed.get("operator", (latest && latest.state.operator) || ""),
    dryRun: latest ? latest.state.dryRun : true,
    runId: latest ? latest.state.runId : "",
    preTestState: (latest && latest.state.preTestState) || fixture.pre_test_state || {},
    recordsCreated: (latest && latest.state.recordsCreated) || [],
    expectedResult: scenario.expectedResult,
    actualResult: parsed.get("actual", (latest && latest.state.actualResult) || "_pending_"),
    automationEvidence: parsed.get("automation", "_pending_"),
    cleanupResult: (latest && latest.state.cleanup) || {},
    result: parsed.get("result", latest ? (latest.state.dryRun ? "blocked" : "pass_pending_operator_confirm") : "blocked"),
    notes: parsed.get("notes", ""),
  };

  const evidence = writeEvidence(payload);
  print(`evidence written: ${evidence.filePath}`);
  return { ok: true, evidencePath: evidence.filePath };
}

async function cmdCleanup(parsed, env) {
  const testId = assertSupportedLiveTest(parsed.positionals[0]);
  assertDevConfirm(parsed);

  const writeIntent = true;
  const summary = buildPreflightSummary({
    command: "cleanup",
    testId,
    parsed,
    env,
    writeIntent,
  });
  print(formatPreflight(summary));
  print("");

  const latest = latestRunStateForTest(testId);
  // Cleanup is always owned-records/patches only. Never broad delete.
  const ownership = assertCleanupOwnership({
    testId,
    runState: latest && latest.state,
    rollbackOnly: false,
  });
  const owned = ownership.ownedRecords || [];
  const patches = ownership.rollbackPatches || [];

  // Shared synthetic fixture IDs never deleted — only owned IDs from run-state
  const sharedForbidden = new Set(
    Object.values(require("./lib/scenarios").loadIds()),
  );

  if (!isWriteAllowed(parsed)) {
    print("DRY-RUN cleanup plan (owned records/patches only; no writes):");
    for (const rec of owned) {
      const shared = sharedForbidden.has(rec.id);
      print(`  would ${shared ? "SKIP_SHARED" : "DELETE"} ${rec.table} ${rec.id}`);
    }
    for (const patch of patches) {
      print(
        `  would ROLLBACK ${patch.table} ${patch.id} fields=${Object.keys(patch.previousFields || {}).join(",") || "(none)"}`,
      );
    }
    print("Pass --execute to apply owned cleanup after Mike authorization.");
    print("--rollback-only is implied: shared fixtures are never deleted.");
    return {
      ok: true,
      dryRun: true,
      ownedCount: owned.length,
      patchCount: patches.length,
    };
  }

  assertExecuteForWrites(parsed, true);
  assertDevBaseId(getBaseId(env));
  assertNoProdIdentifiers(env);
  if (!tokenPresent(env)) {
    throw new SafetyError("missing_token", "AIRTABLE_TOKEN required for cleanup --execute");
  }

  const client = createAirtableClient({ env, dryRun: false, fetchImpl: global.fetch });
  const deleted = [];
  const rolledBack = [];
  const skipped = [];

  // Apply rollback patches first (restore prior field values)
  for (const patch of patches) {
    if (sharedForbidden.has(patch.id) || patch.id === "(dry-run)") {
      skipped.push({ ...patch, reason: "shared_or_dry_run" });
      continue;
    }
    if (patch.previousFields && Object.keys(patch.previousFields).length) {
      await client.updateRecord(patch.table, patch.id, patch.previousFields);
      rolledBack.push(patch);
    } else {
      skipped.push({ ...patch, reason: "empty_previous_fields" });
    }
  }

  for (const rec of owned) {
    if (sharedForbidden.has(rec.id) || rec.id === "(dry-run)") {
      skipped.push({ ...rec, reason: "shared_or_dry_run" });
      continue;
    }
    await client.deleteRecord(rec.table, rec.id);
    deleted.push(rec);
  }

  const next = markCleanup(latest.state, {
    status: "cleaned",
    mode: parsed.has("rollback-only") ? "rollback_only" : "owned_only",
    deleted,
    rolledBack,
    skipped,
    notes: parsed.get("notes", ""),
  });
  writeRunState(latest.filePath, next);

  writeEvidence({
    testId,
    timestamp: new Date().toISOString(),
    baseId: DEV_BASE_ID,
    operator: parsed.get("operator", next.operator || ""),
    dryRun: false,
    runId: next.runId,
    preTestState: next.preTestState || {},
    recordsCreated: next.recordsCreated || [],
    expectedResult: "Owned records removed / patches rolled back; shared fixtures untouched",
    actualResult: `Deleted ${deleted.length}; rolledBack ${rolledBack.length}; skipped ${skipped.length}`,
    automationEvidence: "n/a cleanup",
    cleanupResult: next.cleanup,
    result: "pass",
    notes: parsed.get("notes", ""),
  });

  print(
    `Cleanup complete: deleted=${deleted.length} rolledBack=${rolledBack.length} skipped=${skipped.length}`,
  );
  return { ok: true, deleted, rolledBack, skipped };
}

async function cmdStatus() {
  const stateDir = getRunStateDir();
  const evidenceRoot = getEvidenceRoot();
  const runs = listRunStates(stateDir);
  print(`== Run state (${stateDir}) ==`);
  if (!runs.length) {
    print("(empty)");
  } else {
    for (const row of runs.slice(0, 20)) {
      const s = row.state;
      print(
        `${s.testId} ${s.runId} dryRun=${s.dryRun} status=${s.status} owned=${(s.recordsCreated || []).length}`,
      );
    }
  }
  print("");
  print(`== Evidence root (${evidenceRoot}) ==`);
  if (!fs.existsSync(evidenceRoot)) {
    print("(no evidence yet)");
  } else {
    const dates = fs.readdirSync(evidenceRoot).sort().reverse();
    for (const date of dates.slice(0, 5)) {
      const dir = path.join(evidenceRoot, date);
      if (!fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      print(`${date}: ${files.join(", ") || "(empty)"}`);
    }
  }
  print("");
  print(`Supported live tests: ${SUPPORTED_LIVE_TESTS.join(", ")}`);
  return { ok: true };
}

async function main(argv = process.argv.slice(2), options = {}) {
  const parsed = parseArgs(argv);
  const env = options.env || loadCliEnv(process.env, { loadDotenv: options.loadDotenv !== false });

  if (!parsed.command || parsed.command === "help" || parsed.has("help")) {
    print(printHelp());
    return { ok: true };
  }

  try {
    switch (parsed.command) {
      case "list":
        return await cmdList(parsed);
      case "plan":
        return await cmdPlan(parsed);
      case "verify-env":
        return await cmdVerifyEnv(parsed, env);
      case "run-offline":
        return await cmdRunOffline();
      case "run-test":
        return await cmdRunTest(parsed, env);
      case "collect-evidence":
        return await cmdCollectEvidence(parsed, env);
      case "cleanup":
        return await cmdCleanup(parsed, env);
      case "status":
        return await cmdStatus();
      default:
        throw new SafetyError(
          "unknown_command",
          `Unknown command "${parsed.command}". Run: node tools/airtable/v2_dev_runbook/cli.js help`,
        );
    }
  } catch (error) {
    if (error instanceof SafetyError) {
      printErr(`BLOCKED [${error.code}]: ${error.message}`);
      return { ok: false, code: error.code, error };
    }
    throw error;
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      process.exit(result && result.ok === false ? 2 : 0);
    })
    .catch((error) => {
      printErr(error && error.stack ? error.stack : String(error));
      process.exit(1);
    });
}

module.exports = {
  main,
  parseArgs,
};
