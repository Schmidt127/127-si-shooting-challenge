"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const { assessStaleProcessing, DEFAULT_THRESHOLDS_HOURS } = require("../stale");
const { detectLevelConflicts } = require("../conflicts");
const {
  getBooleanish,
  getRecordId,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{ enrollments?: object[], nowMs?: number }} data
 */
function checkLevels(data = {}) {
  const enrollments = data.enrollments || [];
  const issues = [];

  for (const row of enrollments) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const recalc = getBooleanish(
      f["Recalculate Level?"] || f["Needs Level Recalculation?"] || f._recalc
    );
    const recalcAt = f["Level Recalc Requested At"] || f._recalcAt;
    const current = firstLinkedId(f["Current Level"]) || normalizeBlank(f["Current Level"]);
    const next = firstLinkedId(f["Next Level"]) || normalizeBlank(f["Next Level"]);

    if (recalc) {
      const stale = assessStaleProcessing({
        isProcessing: true,
        lastAttemptedAt: recalcAt,
        thresholdHours: DEFAULT_THRESHOLDS_HOURS.levelRecalc,
        nowMs: data.nowMs,
      });
      if (stale.stale) {
        issues.push(
          fin({
            workflow: WORKFLOWS.LEVEL_RECALC,
            sourceTable: "Enrollments",
            sourceRecordId: id,
            healthStatus: HEALTH_STATUS.STALE,
            code: "level_recalc_flag_stuck",
            recommendedAction: "Re-trigger 041→042 after confirming gate/level rules exist.",
            owningAutomation: OWNING_AUTOMATIONS.levelRecalc,
            lastAttemptedAt: String(recalcAt || ""),
            evidence: [stale.reason, `ageHours=${stale.ageHours}`],
          })
        );
      }
    }

    const conflicts = detectLevelConflicts({
      "Current Level": current,
      "Next Level": next,
      "Level Gate Blocked?": f["Level Gate Blocked?"] || f["Gate Blocked?"],
      "Recalculate Level?": recalc,
      "Lifetime XP Total": f["Lifetime XP Total"] || f["Lifetime XP"],
      "Current Level Min XP": f["Current Level Min XP"] || f._currentLevelMinXp,
      _gateShouldRollback: f._gateShouldRollback,
      _rolledBack: f._rolledBack,
      _missingLevelRule: f._missingLevelRule,
      _missingGateRule: f._missingGateRule,
    });

    for (const c of conflicts) {
      let workflow = WORKFLOWS.LEVEL_ASSIGNMENT;
      if (c.code.includes("gate")) workflow = WORKFLOWS.LEVEL_GATES;
      if (c.code.includes("level_rule") || c.code.includes("recalc")) {
        workflow = WORKFLOWS.LEVEL_RECALC;
      }
      issues.push(
        fin({
          workflow,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus:
            c.severity === "P0"
              ? HEALTH_STATUS.BLOCKING_ERROR
              : HEALTH_STATUS.NEEDS_MANUAL_REVIEW,
          priority: c.severity,
          code: c.code,
          recommendedAction: c.message + " — run 042 after data fix if safe.",
          owningAutomation: OWNING_AUTOMATIONS.levelAssign,
          errorMessage: c.message,
          meta: { dataFixRequired: true },
        })
      );
    }

    if (
      getBooleanish(f["Level Gate Blocked?"]) &&
      getSelectTextSafe(f["Level Status"]) &&
      getSelectTextSafe(f["Gate Result"]) &&
      getSelectTextSafe(f["Level Status"]) !== getSelectTextSafe(f["Gate Result"])
    ) {
      issues.push(
        fin({
          workflow: WORKFLOWS.LEVEL_GATES,
          sourceTable: "Enrollments",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.NEEDS_MANUAL_REVIEW,
          code: "level_status_inconsistent_with_gate",
          recommendedAction: "Reconcile Level Status with Gate Result via 042.",
          owningAutomation: OWNING_AUTOMATIONS.levelAssign,
        })
      );
    }
  }

  return issues;
}

function getSelectTextSafe(v) {
  if (v == null) return "";
  return String(v).trim();
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkLevels };
