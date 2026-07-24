/**
 * Machine-readable issue objects + human-readable summaries.
 */

"use strict";

const { HEALTH_STATUS, PRIORITY, priorityForHealth, isHealthStatus } = require("./health-status");
const { RETRY_CLASS } = require("./retry");

/**
 * @typedef {object} WorkflowIssue
 * @property {string} id
 * @property {string} workflow
 * @property {string} sourceTable
 * @property {string} sourceRecordId
 * @property {string} [enrollmentRecordId]
 * @property {string} [weekRecordId]
 * @property {string} [sourceKey]
 * @property {string} [dedupeKey]
 * @property {string} [currentStatus]
 * @property {string} healthStatus
 * @property {string} priority
 * @property {string} [lastAttemptedAt]
 * @property {string} [completedAt]
 * @property {string} [errorMessage]
 * @property {string} retryEligibility
 * @property {string} recommendedAction
 * @property {string[]} [evidence]
 * @property {string} [owningAutomation]
 * @property {string} [downstreamDependency]
 * @property {string} [code]
 * @property {object} [meta]
 */

let _seq = 0;

function resetIssueSequence() {
  _seq = 0;
}

/**
 * Build a normalized workflow health / issue record.
 * @param {Partial<WorkflowIssue> & { workflow: string, healthStatus: string, recommendedAction: string }} input
 * @returns {WorkflowIssue}
 */
function buildIssue(input = {}) {
  const health = isHealthStatus(input.healthStatus)
    ? input.healthStatus
    : HEALTH_STATUS.NEEDS_MANUAL_REVIEW;
  _seq += 1;
  const id =
    input.id ||
    `${String(input.workflow || "wf").replace(/\s+/g, "_")}_${String(
      input.sourceRecordId || "unknown"
    )}_${_seq}`;

  return {
    id,
    workflow: String(input.workflow || ""),
    sourceTable: String(input.sourceTable || ""),
    sourceRecordId: String(input.sourceRecordId || ""),
    enrollmentRecordId: input.enrollmentRecordId
      ? String(input.enrollmentRecordId)
      : "",
    weekRecordId: input.weekRecordId ? String(input.weekRecordId) : "",
    sourceKey: input.sourceKey ? String(input.sourceKey) : "",
    dedupeKey: input.dedupeKey ? String(input.dedupeKey) : "",
    currentStatus: input.currentStatus != null ? String(input.currentStatus) : "",
    healthStatus: health,
    priority: input.priority || priorityForHealth(health),
    lastAttemptedAt: input.lastAttemptedAt ? String(input.lastAttemptedAt) : "",
    completedAt: input.completedAt ? String(input.completedAt) : "",
    errorMessage: input.errorMessage ? String(input.errorMessage) : "",
    retryEligibility: input.retryEligibility || RETRY_CLASS.MANUAL_REVIEW,
    recommendedAction: String(input.recommendedAction || ""),
    evidence: Array.isArray(input.evidence)
      ? input.evidence.map((e) => String(e))
      : [],
    owningAutomation: input.owningAutomation ? String(input.owningAutomation) : "",
    downstreamDependency: input.downstreamDependency
      ? String(input.downstreamDependency)
      : "",
    code: input.code ? String(input.code) : "",
    meta: input.meta && typeof input.meta === "object" ? input.meta : {},
  };
}

/**
 * Human-readable one-line summary.
 * @param {WorkflowIssue} issue
 */
function summarizeIssue(issue) {
  if (!issue) return "";
  const parts = [
    `[${issue.priority || "?"}]`,
    issue.workflow || "workflow",
    issue.healthStatus || "?",
    issue.sourceRecordId ? `(${issue.sourceRecordId})` : "",
    "—",
    issue.recommendedAction || issue.errorMessage || "review required",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * @param {WorkflowIssue[]} issues
 */
function summarizeIssues(issues = []) {
  return issues.map(summarizeIssue);
}

/**
 * Aggregate counts by priority and health.
 * @param {WorkflowIssue[]} issues
 */
function countIssues(issues = []) {
  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byHealth = {};
  const byWorkflow = {};
  for (const issue of issues) {
    const p = issue.priority || PRIORITY.P2;
    if (byPriority[p] != null) byPriority[p] += 1;
    byHealth[issue.healthStatus] = (byHealth[issue.healthStatus] || 0) + 1;
    byWorkflow[issue.workflow] = (byWorkflow[issue.workflow] || 0) + 1;
  }
  return {
    total: issues.length,
    byPriority,
    byHealth,
    byWorkflow,
  };
}

module.exports = {
  buildIssue,
  summarizeIssue,
  summarizeIssues,
  countIssues,
  resetIssueSequence,
};
