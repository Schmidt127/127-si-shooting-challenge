"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getRunStateDir, DEV_BASE_ID } = require("./constants");
const { SafetyError } = require("./safety");

function ensureRunStateDir(dir = getRunStateDir()) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runStatePath(testId, runId, dir = getRunStateDir()) {
  return path.join(dir, `${String(testId).toUpperCase()}__${runId}.json`);
}

function createRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${stamp}_${crypto.randomBytes(3).toString("hex")}`;
}

function createRunState({
  testId,
  operator = "",
  enrollmentId = "",
  dryRun = true,
  dir = getRunStateDir(),
}) {
  ensureRunStateDir(dir);
  const runId = createRunId();
  const state = {
    schema_version: 1,
    runId,
    testId: String(testId).toUpperCase(),
    baseId: DEV_BASE_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    operator,
    enrollmentId,
    dryRun: Boolean(dryRun),
    ownershipToken: crypto.randomBytes(16).toString("hex"),
    recordsCreated: [],
    preTestState: {},
    status: dryRun ? "dry_run" : "started",
    cleanup: null,
    notes: "",
  };
  const filePath = runStatePath(testId, runId, dir);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  return { state, filePath };
}

function readRunState(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new SafetyError("run_state_missing", `Run-state file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeRunState(filePath, state) {
  const next = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

function addOwnedRecord(state, record) {
  const entry = {
    table: record.table,
    id: record.id,
    createdAt: new Date().toISOString(),
    owned: true,
    kind: record.kind || "created",
  };
  if (!entry.table || !entry.id) {
    throw new SafetyError("invalid_owned_record", "Owned record requires table + id");
  }
  return {
    ...state,
    recordsCreated: [...(state.recordsCreated || []), entry],
  };
}

function listRunStates(dir = getRunStateDir()) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const filePath = path.join(dir, name);
      try {
        const state = readRunState(filePath);
        return { filePath, state };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.state.createdAt).localeCompare(String(a.state.createdAt)));
}

function latestRunStateForTest(testId, dir = getRunStateDir()) {
  const id = String(testId).toUpperCase();
  return listRunStates(dir).find((row) => row.state.testId === id) || null;
}

/**
 * Prove cleanup ownership: run-state must exist, match testId + DEV base,
 * and include ownershipToken + owned record list.
 */
function assertCleanupOwnership({ testId, runState, rollbackOnly = false }) {
  if (!runState) {
    throw new SafetyError(
      "cleanup_ownership_unproven",
      `Cleanup refused for ${testId}: no run-state file. Cannot prove ownership.`,
    );
  }
  if (runState.testId !== String(testId).toUpperCase()) {
    throw new SafetyError(
      "cleanup_ownership_unproven",
      `Cleanup refused: run-state testId ${runState.testId} != ${testId}`,
    );
  }
  if (runState.baseId !== DEV_BASE_ID) {
    throw new SafetyError(
      "cleanup_ownership_unproven",
      `Cleanup refused: run-state baseId is not DEV (${runState.baseId})`,
    );
  }
  if (!runState.ownershipToken) {
    throw new SafetyError(
      "cleanup_ownership_unproven",
      "Cleanup refused: run-state missing ownershipToken",
    );
  }
  const owned = (runState.recordsCreated || []).filter((r) => r.owned && r.id);
  if (!owned.length && !rollbackOnly) {
    throw new SafetyError(
      "cleanup_nothing_owned",
      "Cleanup refused: no owned records in run-state (shared fixtures are never deleted).",
    );
  }
  return owned;
}

function markCleanup(state, result) {
  return {
    ...state,
    status: result.status || state.status,
    cleanup: {
      at: new Date().toISOString(),
      mode: result.mode || "owned_only",
      deleted: result.deleted || [],
      skipped: result.skipped || [],
      notes: result.notes || "",
    },
  };
}

module.exports = {
  ensureRunStateDir,
  runStatePath,
  createRunId,
  createRunState,
  readRunState,
  writeRunState,
  addOwnedRecord,
  listRunStates,
  latestRunStateForTest,
  assertCleanupOwnership,
  markCleanup,
};
