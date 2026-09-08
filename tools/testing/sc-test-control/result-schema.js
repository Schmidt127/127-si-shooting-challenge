"use strict";

const CLASSIFICATIONS = Object.freeze([
  "OFFLINE_UNIT",
  "CONTRACT",
  "READ_ONLY_PROD",
  "CONTROLLED_PROD_WRITE",
  "FAILURE_INJECTION",
  "REPLAY",
  "CLEANUP",
  "OPERATOR_UI_REQUIRED",
]);

const RESULTS = Object.freeze(["PASS", "FAIL", "BLOCKED", "WARN", "SKIPPED", "UNKNOWN"]);

const MODES = Object.freeze(["dry-run", "execute", "readonly"]);

function createResult(partial = {}) {
  const now = new Date().toISOString();
  return {
    scenarioId: partial.scenarioId ?? "",
    domain: partial.domain ?? "",
    classification: partial.classification ?? "READ_ONLY_PROD",
    mode: partial.mode ?? "dry-run",
    timestamp: partial.timestamp ?? now,
    identity: partial.identity ?? {},
    preconditions: partial.preconditions ?? {},
    expected: partial.expected ?? {},
    actual: partial.actual ?? {},
    recordIds: partial.recordIds ?? [],
    dedupeKeys: partial.dedupeKeys ?? [],
    mutations: partial.mutations ?? [],
    cleanup: partial.cleanup ?? {},
    result: partial.result ?? "UNKNOWN",
    notes: Array.isArray(partial.notes) ? partial.notes : partial.notes ? [String(partial.notes)] : [],
    runId: partial.runId ?? null,
  };
}

function validateResult(record) {
  const errors = [];
  if (!record.scenarioId) errors.push("scenarioId required");
  if (!CLASSIFICATIONS.includes(record.classification)) {
    errors.push(`invalid classification: ${record.classification}`);
  }
  if (!RESULTS.includes(record.result)) errors.push(`invalid result: ${record.result}`);
  if (!MODES.includes(record.mode)) errors.push(`invalid mode: ${record.mode}`);
  return { valid: errors.length === 0, errors };
}

module.exports = {
  CLASSIFICATIONS,
  RESULTS,
  MODES,
  createResult,
  validateResult,
};
