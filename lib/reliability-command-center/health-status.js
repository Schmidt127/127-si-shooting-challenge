/**
 * Unified workflow-health model for the Shooting Challenge Reliability Command Center.
 * Maps workflow-specific Airtable statuses into a normalized repository contract.
 *
 * Status: Built / Tested (repository). Not installed as an Airtable Interface.
 */

"use strict";

/** @typedef {keyof typeof HEALTH_STATUS} HealthStatus */

const HEALTH_STATUS = Object.freeze({
  HEALTHY: "Healthy",
  WAITING: "Waiting",
  READY: "Ready",
  PROCESSING: "Processing",
  SENT_OR_COMPLETED: "Sent or Completed",
  RETRYABLE_ERROR: "Retryable Error",
  BLOCKING_ERROR: "Blocking Error",
  DUPLICATE_RISK: "Duplicate Risk",
  MISSING_DEPENDENCY: "Missing Dependency",
  STALE: "Stale",
  HISTORICAL: "Historical",
  TEST_ONLY: "Test Only",
  NEEDS_MANUAL_REVIEW: "Needs Manual Review",
});

const HEALTH_STATUS_SET = new Set(Object.values(HEALTH_STATUS));

/** Priority bands for findings (P0 highest). */
const PRIORITY = Object.freeze({
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
});

/**
 * Default priority for each health status when a check does not override.
 * @type {Record<string, string>}
 */
const DEFAULT_PRIORITY_BY_HEALTH = Object.freeze({
  [HEALTH_STATUS.BLOCKING_ERROR]: PRIORITY.P0,
  [HEALTH_STATUS.DUPLICATE_RISK]: PRIORITY.P0,
  [HEALTH_STATUS.RETRYABLE_ERROR]: PRIORITY.P1,
  [HEALTH_STATUS.MISSING_DEPENDENCY]: PRIORITY.P1,
  [HEALTH_STATUS.STALE]: PRIORITY.P1,
  [HEALTH_STATUS.NEEDS_MANUAL_REVIEW]: PRIORITY.P1,
  [HEALTH_STATUS.TEST_ONLY]: PRIORITY.P2,
  [HEALTH_STATUS.HISTORICAL]: PRIORITY.P3,
  [HEALTH_STATUS.WAITING]: PRIORITY.P3,
  [HEALTH_STATUS.READY]: PRIORITY.P3,
  [HEALTH_STATUS.PROCESSING]: PRIORITY.P3,
  [HEALTH_STATUS.SENT_OR_COMPLETED]: PRIORITY.P3,
  [HEALTH_STATUS.HEALTHY]: PRIORITY.P3,
});

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isHealthStatus(value) {
  return typeof value === "string" && HEALTH_STATUS_SET.has(value);
}

/**
 * @param {string} status
 * @returns {string}
 */
function priorityForHealth(status) {
  return DEFAULT_PRIORITY_BY_HEALTH[status] || PRIORITY.P2;
}

/**
 * Normalize a raw workflow status string into a health bucket when possible.
 * Workflow checkers should prefer explicit mapping; this is a fallback.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
function guessHealthFromRawStatus(raw) {
  const s = String(raw == null ? "" : raw)
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (/(sent|completed|awarded|done|success)/.test(s)) {
    return HEALTH_STATUS.SENT_OR_COMPLETED;
  }
  if (/(ready|armed)/.test(s)) return HEALTH_STATUS.READY;
  if (/(pending|waiting|queued)/.test(s)) return HEALTH_STATUS.WAITING;
  if (/(processing|in progress|running)/.test(s)) return HEALTH_STATUS.PROCESSING;
  if (/(error|failed|fail)/.test(s)) return HEALTH_STATUS.RETRYABLE_ERROR;
  if (/(duplicate|dup)/.test(s)) return HEALTH_STATUS.DUPLICATE_RISK;
  if (/(stale|stuck)/.test(s)) return HEALTH_STATUS.STALE;
  if (/(test)/.test(s)) return HEALTH_STATUS.TEST_ONLY;
  if (/(historical|archived|inactive)/.test(s)) return HEALTH_STATUS.HISTORICAL;
  return null;
}

module.exports = {
  HEALTH_STATUS,
  HEALTH_STATUS_SET,
  PRIORITY,
  DEFAULT_PRIORITY_BY_HEALTH,
  isHealthStatus,
  priorityForHealth,
  guessHealthFromRawStatus,
};
