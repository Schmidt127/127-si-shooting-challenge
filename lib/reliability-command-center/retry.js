/**
 * Safe retry classification — recommendations only.
 * Never performs live writes. Repair tooling that applies changes must default
 * to dry-run and require explicit record IDs.
 */

"use strict";

const { HEALTH_STATUS } = require("./health-status");

const RETRY_CLASS = Object.freeze({
  AUTOMATICALLY_RETRYABLE: "automatically_retryable",
  RETRYABLE_AFTER_DATA_FIX: "retryable_after_correcting_data",
  MANUAL_REVIEW: "manual_review_required",
  NEVER_RETRY_COMPLETED: "never_retry_already_completed",
  DUPLICATE_RISK: "possible_duplicate_risk",
  PROD_ACTION_PROHIBITED: "production_action_prohibited_without_verification",
});

/**
 * Classify retry eligibility from health + context flags.
 *
 * @param {{
 *   healthStatus: string,
 *   alreadyCompleted?: boolean,
 *   duplicateRisk?: boolean,
 *   missingDependency?: boolean,
 *   dataFixRequired?: boolean,
 *   testOnly?: boolean,
 *   historical?: boolean,
 *   productionWriteProposed?: boolean,
 * }} input
 */
function classifyRetry(input = {}) {
  const health = input.healthStatus || "";

  if (input.alreadyCompleted || health === HEALTH_STATUS.SENT_OR_COMPLETED) {
    return {
      retryEligibility: RETRY_CLASS.NEVER_RETRY_COMPLETED,
      reason: "Record already completed or sent; retry would risk duplicates.",
      allowRetry: false,
    };
  }

  if (input.duplicateRisk || health === HEALTH_STATUS.DUPLICATE_RISK) {
    return {
      retryEligibility: RETRY_CLASS.DUPLICATE_RISK,
      reason: "Duplicate risk detected; do not retry until uniqueness is verified.",
      allowRetry: false,
    };
  }

  if (input.historical || health === HEALTH_STATUS.HISTORICAL) {
    return {
      retryEligibility: RETRY_CLASS.PROD_ACTION_PROHIBITED,
      reason: "Historical / prior challenge-year record; verify year isolation first.",
      allowRetry: false,
    };
  }

  if (input.testOnly || health === HEALTH_STATUS.TEST_ONLY) {
    return {
      retryEligibility: RETRY_CLASS.PROD_ACTION_PROHIBITED,
      reason: "Test-only path; do not treat as Live production traffic.",
      allowRetry: false,
    };
  }

  if (input.productionWriteProposed) {
    return {
      retryEligibility: RETRY_CLASS.PROD_ACTION_PROHIBITED,
      reason: "Production write proposed — require explicit verification before any change.",
      allowRetry: false,
    };
  }

  if (
    input.missingDependency ||
    health === HEALTH_STATUS.MISSING_DEPENDENCY ||
    input.dataFixRequired
  ) {
    return {
      retryEligibility: RETRY_CLASS.RETRYABLE_AFTER_DATA_FIX,
      reason: "Fix missing/conflicting data first, then re-trigger owning automation.",
      allowRetry: false,
    };
  }

  if (
    health === HEALTH_STATUS.RETRYABLE_ERROR ||
    health === HEALTH_STATUS.STALE ||
    health === HEALTH_STATUS.READY ||
    health === HEALTH_STATUS.WAITING
  ) {
    return {
      retryEligibility: RETRY_CLASS.AUTOMATICALLY_RETRYABLE,
      reason:
        "Safe to re-arm / re-run owning automation after confirming not completed and no duplicate key.",
      allowRetry: true,
    };
  }

  if (health === HEALTH_STATUS.BLOCKING_ERROR || health === HEALTH_STATUS.NEEDS_MANUAL_REVIEW) {
    return {
      retryEligibility: RETRY_CLASS.MANUAL_REVIEW,
      reason: "Blocking or ambiguous state — operator review required.",
      allowRetry: false,
    };
  }

  return {
    retryEligibility: RETRY_CLASS.MANUAL_REVIEW,
    reason: "Default: manual review before any retry.",
    allowRetry: false,
  };
}

/**
 * Attach retry classification onto an issue-shaped object.
 * @param {object} issue
 */
function withRetryClassification(issue) {
  const classified = classifyRetry({
    healthStatus: issue.healthStatus,
    alreadyCompleted: issue.meta?.alreadyCompleted,
    duplicateRisk:
      issue.healthStatus === HEALTH_STATUS.DUPLICATE_RISK || issue.meta?.duplicateRisk,
    missingDependency: issue.healthStatus === HEALTH_STATUS.MISSING_DEPENDENCY,
    dataFixRequired: issue.meta?.dataFixRequired,
    testOnly: issue.healthStatus === HEALTH_STATUS.TEST_ONLY || issue.meta?.testOnly,
    historical: issue.healthStatus === HEALTH_STATUS.HISTORICAL || issue.meta?.historical,
    productionWriteProposed: issue.meta?.productionWriteProposed,
  });
  return {
    ...issue,
    retryEligibility: classified.retryEligibility,
    meta: {
      ...(issue.meta || {}),
      retryReason: classified.reason,
      allowRetry: classified.allowRetry,
    },
  };
}

module.exports = {
  RETRY_CLASS,
  classifyRetry,
  withRetryClassification,
};
