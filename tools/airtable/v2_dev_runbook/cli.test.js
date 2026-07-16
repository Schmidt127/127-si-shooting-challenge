#!/usr/bin/env node
/**
 * Safety tests for V2 DEV Runbook Operator CLI.
 * No live Airtable. No token printing assertions against real secrets.
 *
 *   node tools/airtable/v2_dev_runbook/cli.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { DEV_BASE_ID, PROD_BASE_ID } = require("./lib/constants");
const {
  SafetyError,
  assertDevBaseId,
  assertDevConfirm,
  assertExecuteForWrites,
  assertValidTestId,
  assertSupportedLiveTest,
  assertNoProdIdentifiers,
  isWriteAllowed,
  buildPreflightSummary,
  tokenPresent,
} = require("./lib/safety");
const { parseArgs } = require("./lib/args");
const {
  createRunState,
  assertCleanupOwnership,
  addOwnedRecord,
  writeRunState,
} = require("./lib/run_state");
const { writeEvidence, evidencePathFor, ensureEvidenceDir } = require("./lib/evidence");
const { main } = require("./cli");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.stack ? error.stack : error}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error && error.stack ? error.stack : error}`);
  }
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function withTempPaths(fn) {
  const stateDir = tempDir("v2-runstate-");
  const evidenceDir = tempDir("v2-evidence-");
  const prevState = process.env.V2_DEV_RUNBOOK_STATE_DIR;
  const prevEvidence = process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
  process.env.V2_DEV_RUNBOOK_STATE_DIR = stateDir;
  process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = evidenceDir;
  // Re-require constants-backed modules won't reload — run_state reads RUN_STATE_DIR at call via constants.
  // constants.js captured env at first load. For tests that need overrides, pass dir args explicitly.
  try {
    return fn({ stateDir, evidenceDir });
  } finally {
    if (prevState == null) delete process.env.V2_DEV_RUNBOOK_STATE_DIR;
    else process.env.V2_DEV_RUNBOOK_STATE_DIR = prevState;
    if (prevEvidence == null) delete process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
    else process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = prevEvidence;
    fs.rmSync(stateDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

console.log("V2 DEV Runbook CLI safety tests");
console.log("");

test("PROD base refusal", () => {
  assert.throws(() => assertDevBaseId(PROD_BASE_ID), (err) => {
    assert.ok(err instanceof SafetyError);
    assert.strictEqual(err.code, "prod_base_refused");
    return true;
  });
  assert.throws(() => assertNoProdIdentifiers({ BASE_ID: PROD_BASE_ID }), (err) => {
    assert.strictEqual(err.code, "prod_identifier_present");
    return true;
  });
});

test("missing token detected", () => {
  assert.strictEqual(tokenPresent({}), false);
  assert.strictEqual(tokenPresent({ AIRTABLE_TOKEN: "patXXX" }), true);
});

test("missing --dev-confirm", () => {
  const parsed = parseArgs(["verify-env"]);
  assert.throws(() => assertDevConfirm(parsed), (err) => {
    assert.strictEqual(err.code, "missing_dev_confirm");
    return true;
  });
});

test("dry-run default (writes not allowed without flags)", () => {
  const parsed = parseArgs(["run-test", "A3"]);
  assert.strictEqual(isWriteAllowed(parsed), false);
  const summary = buildPreflightSummary({
    command: "run-test",
    testId: "A3",
    parsed,
    env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patX" },
    writeIntent: true,
  });
  assert.strictEqual(summary.dryRun, true);
  assert.strictEqual(summary.writesAllowed, false);
});

test("write refusal without --execute", () => {
  const parsed = parseArgs(["run-test", "A3", "--dev-confirm"]);
  assert.strictEqual(isWriteAllowed(parsed), false);
  assert.throws(() => assertExecuteForWrites(parsed, true), (err) => {
    assert.strictEqual(err.code, "missing_execute");
    return true;
  });
  const allowed = parseArgs(["run-test", "A3", "--dev-confirm", "--execute"]);
  assert.strictEqual(isWriteAllowed(allowed), true);
});

test("evidence path creation", () => {
  withTempPaths(({ evidenceDir }) => {
    const filePath = ensureEvidenceDir("A3", new Date("2026-07-16T12:00:00Z"), evidenceDir);
    assert.ok(filePath.endsWith(path.join("2026-07-16", "A3.md")));
    assert.ok(fs.existsSync(path.dirname(filePath)));
    const written = writeEvidence(
      {
        testId: "A3",
        timestamp: "2026-07-16T12:00:00.000Z",
        baseId: DEV_BASE_ID,
        dryRun: true,
        preTestState: { ok: true },
        recordsCreated: [],
        expectedResult: "Enrollment+Week",
        actualResult: "dry-run",
        automationEvidence: "n/a",
        cleanupResult: {},
        result: "blocked",
        notes: "unit test",
      },
      { root: evidenceDir, date: new Date("2026-07-16T12:00:00Z") },
    );
    assert.ok(fs.existsSync(written.filePath));
    const body = fs.readFileSync(written.filePath, "utf8");
    assert.ok(body.includes("DEV base ID"));
    assert.ok(body.includes("Pass / Fail / Blocked"));
    assert.ok(body.includes(DEV_BASE_ID));
    assert.strictEqual(
      evidencePathFor("A3", new Date("2026-07-16T12:00:00Z"), evidenceDir),
      written.filePath,
    );
  });
});

test("run-state ownership", () => {
  withTempPaths(({ stateDir }) => {
    const { state, filePath } = createRunState({
      testId: "B1",
      operator: "tester",
      enrollmentId: "recEnrollFixture001",
      dryRun: false,
      dir: stateDir,
    });
    assert.ok(state.ownershipToken);
    assert.strictEqual(state.baseId, DEV_BASE_ID);
    let next = addOwnedRecord(state, {
      table: "Submissions",
      id: "recOwnedSub0000001",
      kind: "create",
    });
    next = writeRunState(filePath, next);
    const ownership = assertCleanupOwnership({
      testId: "B1",
      runState: next,
      rollbackOnly: false,
    });
    assert.strictEqual(ownership.ownedRecords.length, 1);
    assert.strictEqual(ownership.ownedRecords[0].id, "recOwnedSub0000001");
  });
});

test("cleanup refusal without ownership", () => {
  assert.throws(
    () => assertCleanupOwnership({ testId: "A3", runState: null }),
    (err) => {
      assert.strictEqual(err.code, "cleanup_ownership_unproven");
      return true;
    },
  );
  assert.throws(
    () =>
      assertCleanupOwnership({
        testId: "A3",
        runState: {
          testId: "A3",
          baseId: DEV_BASE_ID,
          ownershipToken: "abc",
          recordsCreated: [],
        },
      }),
    (err) => {
      assert.strictEqual(err.code, "cleanup_nothing_owned");
      return true;
    },
  );
  assert.throws(
    () =>
      assertCleanupOwnership({
        testId: "A3",
        runState: {
          testId: "A3",
          baseId: PROD_BASE_ID,
          ownershipToken: "abc",
          recordsCreated: [{ table: "Submissions", id: "recX", owned: true }],
        },
      }),
    (err) => {
      assert.strictEqual(err.code, "cleanup_ownership_unproven");
      return true;
    },
  );
});

test("malformed test ID", () => {
  assert.throws(() => assertValidTestId("not-a-test"), (err) => {
    assert.strictEqual(err.code, "malformed_test_id");
    return true;
  });
  assert.throws(() => assertValidTestId(""), (err) => {
    assert.strictEqual(err.code, "malformed_test_id");
    return true;
  });
  assert.strictEqual(assertValidTestId("a3"), "A3");
});

test("unsupported test ID", () => {
  assert.throws(() => assertSupportedLiveTest("I6"), (err) => {
    assert.strictEqual(err.code, "unsupported_test_id");
    return true;
  });
  assert.throws(() => assertSupportedLiveTest("J6"), (err) => {
    assert.strictEqual(err.code, "unsupported_test_id");
    return true;
  });
  assert.strictEqual(assertSupportedLiveTest("F3"), "F3");
});

(async () => {
  await testAsync("CLI verify-env blocks without --dev-confirm", async () => {
    const result = await main(["verify-env"], {
      env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patTest" },
      loadDotenv: false,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "missing_dev_confirm");
  });

  await testAsync("CLI run-test dry-run default with --dev-confirm", async () => {
    const stateDir = tempDir("v2-cli-state-");
    const evidenceDir = tempDir("v2-cli-evidence-");
    process.env.V2_DEV_RUNBOOK_STATE_DIR = stateDir;
    process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = evidenceDir;
    try {
      const result = await main(["run-test", "A3", "--dev-confirm", "--operator", "unit"], {
        env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patTest" },
        loadDotenv: false,
      });
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.dryRun, true);
      assert.ok(result.evidencePath);
      assert.ok(fs.existsSync(result.evidencePath));
      assert.ok(result.evidencePath.startsWith(evidenceDir));
    } finally {
      delete process.env.V2_DEV_RUNBOOK_STATE_DIR;
      delete process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
      fs.rmSync(stateDir, { recursive: true, force: true });
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }
  });

  await testAsync("CLI run-test refuses PROD base even with flags", async () => {
    const result = await main(
      ["run-test", "B1", "--dev-confirm", "--execute", "--enrollment", "recEnrollFixture001"],
      {
        env: { BASE_ID: PROD_BASE_ID, AIRTABLE_TOKEN: "patTest" },
        loadDotenv: false,
      },
    );
    assert.strictEqual(result.ok, false);
    assert.ok(
      result.code === "prod_base_refused" || result.code === "prod_identifier_present",
    );
  });

  await testAsync("CLI run-test refuses write without --execute", async () => {
    const stateDir = tempDir("v2-cli-f1-");
    const evidenceDir = tempDir("v2-cli-f1-ev-");
    process.env.V2_DEV_RUNBOOK_STATE_DIR = stateDir;
    process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = evidenceDir;
    try {
      // With only --dev-confirm, should dry-run succeed (not throw missing_execute)
      const result = await main(["run-test", "F1", "--dev-confirm"], {
        env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patTest" },
        loadDotenv: false,
      });
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.dryRun, true);
    } finally {
      delete process.env.V2_DEV_RUNBOOK_STATE_DIR;
      delete process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
      fs.rmSync(stateDir, { recursive: true, force: true });
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }
  });

  await testAsync("CLI cleanup refuses without run-state ownership", async () => {
    const stateDir = tempDir("v2-cli-cleanup-");
    const evidenceDir = tempDir("v2-cli-cleanup-ev-");
    process.env.V2_DEV_RUNBOOK_STATE_DIR = stateDir;
    process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT = evidenceDir;
    try {
      const result = await main(["cleanup", "A3", "--dev-confirm"], {
        env: { BASE_ID: DEV_BASE_ID, AIRTABLE_TOKEN: "patTest" },
        loadDotenv: false,
      });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.code, "cleanup_ownership_unproven");
    } finally {
      delete process.env.V2_DEV_RUNBOOK_STATE_DIR;
      delete process.env.V2_DEV_RUNBOOK_EVIDENCE_ROOT;
      fs.rmSync(stateDir, { recursive: true, force: true });
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }
  });

  await testAsync("CLI malformed and unsupported test ids via run-test", async () => {
    const bad = await main(["run-test", "###", "--dev-confirm"], {
      env: { BASE_ID: DEV_BASE_ID },
      loadDotenv: false,
    });
    assert.strictEqual(bad.ok, false);
    assert.strictEqual(bad.code, "malformed_test_id");

    const unsupported = await main(["run-test", "I6", "--dev-confirm"], {
      env: { BASE_ID: DEV_BASE_ID },
      loadDotenv: false,
    });
    assert.strictEqual(unsupported.ok, false);
    assert.strictEqual(unsupported.code, "unsupported_test_id");
  });

  console.log("");
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("OK — CLI safety tests green (no live Airtable, PROD untouched)");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
