"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getField,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
  normalizeLookupArray,
} = require("../normalize");
const { findDuplicateGroups } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   submissionAssets?: object[],
 *   homeworkCompletions?: object[],
 *   xpEvents?: object[],
 * }} data
 */
function checkHomework(data = {}) {
  const assets = data.submissionAssets || [];
  const completions = data.homeworkCompletions || [];
  const xpEvents = data.xpEvents || [];
  const issues = [];

  const hcByAsset = new Map();
  for (const hc of completions) {
    const f = hc.fields || hc;
    const assetIds = normalizeLookupArray(
      getField(hc, "Submission Assets") || f["Submission Assets"] || f._assetIds
    );
    for (const aid of assetIds) {
      if (!hcByAsset.has(aid)) hcByAsset.set(aid, []);
      hcByAsset.get(aid).push(hc);
    }
  }

  for (const asset of assets) {
    const id = getRecordId(asset);
    const f = asset.fields || asset;
    const ready = getBooleanish(f["Ready for Homework?"] || f._homeworkReady);
    const purpose = getSelectText(f.Purpose || f["Asset Purpose"]);
    const isHw = /homework/i.test(purpose) || getBooleanish(f._isHomework);
    if ((ready || isHw) && !(hcByAsset.get(id) || []).length) {
      issues.push(
        fin({
          workflow: WORKFLOWS.HOMEWORK_COMPLETION,
          sourceTable: "Submission Assets",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "asset_ready_without_homework_completion",
          recommendedAction: "Run 020/067 to link or create Homework Completion.",
          owningAutomation: OWNING_AUTOMATIONS.homeworkCompletion,
          meta: { dataFixRequired: true },
        })
      );
    }
  }

  for (const hc of completions) {
    const id = getRecordId(hc);
    const f = hc.fields || hc;
    const enrollmentId = firstLinkedId(f.Enrollment);
    const homeworkId = firstLinkedId(f.Homework || f["Homework Assignment"]);
    const sourceSub = firstLinkedId(f.Submission);
    const awarded = /awarded|complete/i.test(getSelectText(f["XP Award Status"])) ||
      getBooleanish(f._xpAwarded);
    const assetIds = normalizeLookupArray(f["Submission Assets"] || f._assetIds);

    if (!enrollmentId && !sourceSub && !homeworkId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.HOMEWORK_COMPLETION,
          sourceTable: "Homework Completions",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "homework_completion_no_linked_source",
          recommendedAction: "Link Enrollment + Homework Assignment (and Submission when file path).",
          owningAutomation: OWNING_AUTOMATIONS.homeworkCompletion,
          meta: { dataFixRequired: true },
        })
      );
    }

    if (awarded) {
      const hasXp = xpEvents.some((xp) => {
        const xf = xp.fields || xp;
        return firstLinkedId(xf["Homework Completion"]) === id;
      });
      if (!hasXp) {
        issues.push(
          fin({
            workflow: WORKFLOWS.HOMEWORK_XP,
            sourceTable: "Homework Completions",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            healthStatus: HEALTH_STATUS.RETRYABLE_ERROR,
            code: "homework_awarded_without_xp",
            recommendedAction:
              "Retry 065 only after confirming Source Key HW|… does not already exist.",
            owningAutomation: OWNING_AUTOMATIONS.homeworkXp,
          })
        );
      }
    }

    if (assetIds.length > 1 && getBooleanish(f._expectsSingleAsset)) {
      issues.push(
        fin({
          workflow: WORKFLOWS.HOMEWORK_COMPLETION,
          sourceTable: "Homework Completions",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.NEEDS_MANUAL_REVIEW,
          code: "homework_multiple_assets_linked_incorrectly",
          recommendedAction:
            "Review multi-asset linkage; one HC may own many assets, but slot mapping must be correct.",
          owningAutomation: OWNING_AUTOMATIONS.homeworkCompletion,
          evidence: [`assetCount=${assetIds.length}`],
        })
      );
    }
  }

  // XP without completion
  for (const xp of xpEvents) {
    const f = xp.fields || xp;
    const source = getSelectText(f["XP Source"]);
    if (!/homework/i.test(source)) continue;
    const hcId = firstLinkedId(f["Homework Completion"]);
    if (!hcId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.HOMEWORK_XP,
          sourceTable: "XP Events",
          sourceRecordId: getRecordId(xp),
          sourceKey: normalizeBlank(f["Source Key"]),
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "homework_xp_without_completion",
          recommendedAction: "Link XP Event to Homework Completion or deactivate orphan XP.",
          owningAutomation: OWNING_AUTOMATIONS.homeworkXp,
          meta: { dataFixRequired: true },
        })
      );
    }
  }

  const slotDups = findDuplicateGroups(completions, (r) => {
    const f = r.fields || r;
    const enr = firstLinkedId(f.Enrollment);
    const hw = firstLinkedId(f.Homework || f["Homework Assignment"]);
    const slot = normalizeBlank(f["Item Slot"] || f._itemSlot);
    if (!enr || !hw || !slot) return "";
    return `${enr}|${hw}|${slot}`;
  });
  for (const dup of slotDups) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.HOMEWORK_COMPLETION,
          sourceTable: "Homework Completions",
          sourceRecordId: rid,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_homework_completion_same_asset_slot",
          recommendedAction: "Keep one HC per enrollment+assignment+slot; merge/deactivate extras.",
          owningAutomation: OWNING_AUTOMATIONS.homeworkCompletion,
          evidence: [`key=${dup.key}`, `count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  return issues;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkHomework };
