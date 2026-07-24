"use strict";

const { HEALTH_STATUS, PRIORITY } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const { assessStaleProcessing, DEFAULT_THRESHOLDS_HOURS } = require("../stale");
const {
  getBooleanish,
  getField,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
  toDateKey,
} = require("../normalize");
const { findDuplicateGroups, validateSourceKey } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{
 *   submissions?: object[],
 *   xpEvents?: object[],
 *   weeks?: object[],
 *   nowMs?: number,
 * }} data
 */
function checkSubmissions(data = {}) {
  const submissions = data.submissions || [];
  const xpEvents = data.xpEvents || [];
  const weeksById = indexById(data.weeks || []);
  const issues = [];

  const xpBySubmission = new Map();
  for (const xp of xpEvents) {
    const subId = firstLinkedId(getField(xp, "Submission") || (xp.fields || xp).Submission);
    if (!subId) continue;
    if (!xpBySubmission.has(subId)) xpBySubmission.set(subId, []);
    xpBySubmission.get(subId).push(xp);
  }

  for (const row of submissions) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const enrollmentId = firstLinkedId(getField(row, "Enrollment") || f.Enrollment);
    const activityDate = normalizeBlank(getField(row, "Activity Date") || f["Activity Date"]);
    const weekId = firstLinkedId(getField(row, "Week") || f.Week);
    const xpStatus = getSelectText(getField(row, "XP Award Status") || f["XP Award Status"]);
    const awaitingAssets = getBooleanish(
      getField(row, "Awaiting Assets?") || f["Awaiting Assets?"] || f._awaitingAssets
    );
    const assetsUpdatedAt =
      getField(row, "Assets Last Updated At") ||
      f["Assets Last Updated At"] ||
      f._assetsUpdatedAt;
    const sourceKey = normalizeBlank(
      getField(row, "Submission Source Key") || f["Submission Source Key"] || f._sourceKey
    );
    const backdated = getBooleanish(getField(row, "Backdated?") || f.Backdated || f._backdated);

    if (!enrollmentId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION,
          sourceTable: "Submissions",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "submission_missing_enrollment",
          recommendedAction: "Link Enrollment (023 / intake) before XP and assets.",
          owningAutomation: "023",
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!activityDate) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION,
          sourceTable: "Submissions",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "submission_missing_activity_date",
          recommendedAction: "Set Activity Date so 005 can assign Week.",
          owningAutomation: OWNING_AUTOMATIONS.submissionWeek,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!weekId) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION,
          sourceTable: "Submissions",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "submission_missing_week",
          recommendedAction: "Run 005 week assignment (or fix Activity Date boundaries).",
          owningAutomation: OWNING_AUTOMATIONS.submissionWeek,
          meta: { dataFixRequired: true },
        })
      );
    } else if (activityDate && weeksById[weekId]) {
      const week = weeksById[weekId];
      const wf = week.fields || week;
      const start = toDateKey(wf["Week Start Date"] || wf["Start Date"] || wf.startDate);
      const end = toDateKey(wf["Week End Date"] || wf["End Date"] || wf.endDate);
      const act = toDateKey(activityDate);
      if (start && end && act && (act < start || act > end)) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION,
            sourceTable: "Submissions",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            weekRecordId: weekId,
            healthStatus: backdated
              ? HEALTH_STATUS.NEEDS_MANUAL_REVIEW
              : HEALTH_STATUS.BLOCKING_ERROR,
            priority: backdated ? PRIORITY.P1 : PRIORITY.P0,
            code: "submission_week_activity_date_mismatch",
            recommendedAction: backdated
              ? "Backdated submission is valid only with correct week reassignment — verify 005 mapping."
              : "Re-run 005 or relink Week so it matches Activity Date.",
            owningAutomation: OWNING_AUTOMATIONS.submissionWeek,
            evidence: [`activity=${act}`, `week=${start}..${end}`, `backdated=${backdated}`],
            meta: { dataFixRequired: true },
          })
        );
      }
    }

    const processed =
      /awarded|processed|complete/i.test(xpStatus) ||
      getBooleanish(f._xpProcessed);
    const relatedXp = xpBySubmission.get(id) || [];
    if (processed && relatedXp.length === 0) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION_BASE_XP,
          sourceTable: "Submissions",
          sourceRecordId: id,
          enrollmentRecordId: enrollmentId,
          weekRecordId: weekId,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "submission_processed_without_xp_event",
          recommendedAction:
            "Investigate 010 — processed status without XP Event; create only if Source Key absent.",
          owningAutomation: OWNING_AUTOMATIONS.submissionXp,
          evidence: [`XP Award Status=${xpStatus || "processed"}`],
          meta: { duplicateRisk: false, dataFixRequired: true },
        })
      );
    }

    if (awaitingAssets) {
      const stale = assessStaleProcessing({
        isProcessing: true,
        lastAttemptedAt: assetsUpdatedAt || activityDate,
        thresholdHours: DEFAULT_THRESHOLDS_HOURS.awaitingAssets,
        nowMs: data.nowMs,
      });
      if (stale.stale) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION_ASSETS,
            sourceTable: "Submissions",
            sourceRecordId: id,
            enrollmentRecordId: enrollmentId,
            healthStatus: HEALTH_STATUS.STALE,
            code: "submission_awaiting_assets_too_long",
            recommendedAction:
              "Check 009/070b asset pipeline; clear stuck upload errors or re-queue assets.",
            owningAutomation: OWNING_AUTOMATIONS.submissionAssets,
            lastAttemptedAt: String(assetsUpdatedAt || activityDate || ""),
            evidence: [`ageHours=${stale.ageHours}`, stale.reason],
          })
        );
      }
    }

    if (sourceKey) {
      const sk = validateSourceKey(sourceKey, { minParts: 2 });
      if (!sk.ok) {
        issues.push(
          fin({
            workflow: WORKFLOWS.SUBMISSION,
            sourceTable: "Submissions",
            sourceRecordId: id,
            sourceKey,
            healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
            code: "submission_invalid_source_key",
            recommendedAction: `Fix Submission Source Key (${sk.reason}).`,
            meta: { dataFixRequired: true },
          })
        );
      }
    }
  }

  const keyDups = findDuplicateGroups(submissions, (r) => {
    const f = r.fields || r;
    return String(
      normalizeBlank(
        getField(r, "Submission Source Key") || f["Submission Source Key"] || f._sourceKey
      ) || ""
    );
  });
  for (const dup of keyDups) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.SUBMISSION,
          sourceTable: "Submissions",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_submission_source_key",
          recommendedAction:
            "Keep one counted submission per Source Key; mark extras Duplicate - Remove.",
          owningAutomation: "007",
          evidence: [`count=${dup.count}`],
          meta: { duplicateRisk: true },
        })
      );
    }
  }

  return issues;
}

function indexById(rows) {
  const map = {};
  for (const r of rows) {
    const id = getRecordId(r);
    if (id) map[id] = r;
  }
  return map;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkSubmissions };
