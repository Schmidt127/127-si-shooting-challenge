"use strict";

const { HEALTH_STATUS } = require("../health-status");
const { buildIssue } = require("../issue");
const { withRetryClassification } = require("../retry");
const {
  getBooleanish,
  getRecordId,
  getSelectText,
  firstLinkedId,
  normalizeBlank,
} = require("../normalize");
const { findDuplicateGroups } = require("../validate");
const { WORKFLOWS, OWNING_AUTOMATIONS } = require("../field-maps");

/**
 * @param {{ videoFeedback?: object[], xpEvents?: object[] }} data
 */
function checkVideoFeedback(data = {}) {
  const rows = data.videoFeedback || [];
  const xpEvents = data.xpEvents || [];
  const issues = [];

  for (const row of rows) {
    const id = getRecordId(row);
    const f = row.fields || row;
    const activityDate = normalizeBlank(f["Activity Date"] || f._activityDate);
    const gradeBand =
      firstLinkedId(f["Grade Band"]) || getSelectText(f["Grade Band"]);
    const status = getSelectText(f.Status || f["Feedback Status"]);
    const feedbackText = normalizeBlank(f.Feedback || f["Coach Feedback"] || f._feedback);
    const xpAwarded =
      /awarded/i.test(getSelectText(f["XP Award Status"])) || getBooleanish(f._xpAwarded);

    if (!activityDate) {
      issues.push(
        fin({
          workflow: WORKFLOWS.VIDEO_FEEDBACK,
          sourceTable: "Video Feedback",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "video_feedback_missing_activity_date",
          recommendedAction: "Set Activity Date on Video Feedback.",
          owningAutomation: OWNING_AUTOMATIONS.videoFeedback,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (!gradeBand) {
      issues.push(
        fin({
          workflow: WORKFLOWS.VIDEO_FEEDBACK,
          sourceTable: "Video Feedback",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.MISSING_DEPENDENCY,
          code: "video_feedback_missing_grade_band",
          recommendedAction: "Copy Enrollment Grade Band (063/111 pattern) onto Video Feedback.",
          owningAutomation: OWNING_AUTOMATIONS.videoFeedback,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (/graded|complete/i.test(status) && !feedbackText) {
      issues.push(
        fin({
          workflow: WORKFLOWS.VIDEO_FEEDBACK,
          sourceTable: "Video Feedback",
          sourceRecordId: id,
          healthStatus: HEALTH_STATUS.BLOCKING_ERROR,
          code: "video_graded_without_feedback",
          recommendedAction: "Add coach feedback text before treating as graded.",
          owningAutomation: OWNING_AUTOMATIONS.videoFeedback,
          meta: { dataFixRequired: true },
        })
      );
    }
    if (xpAwarded) {
      const hasXp = xpEvents.some((xp) => {
        const xf = xp.fields || xp;
        return firstLinkedId(xf["Video Feedback"]) === id;
      });
      if (!hasXp || !feedbackText) {
        issues.push(
          fin({
            workflow: WORKFLOWS.VIDEO_FEEDBACK_XP,
            sourceTable: "Video Feedback",
            sourceRecordId: id,
            healthStatus: hasXp
              ? HEALTH_STATUS.BLOCKING_ERROR
              : HEALTH_STATUS.RETRYABLE_ERROR,
            code: hasXp
              ? "video_xp_without_valid_feedback_source"
              : "video_xp_marked_without_event",
            recommendedAction: hasXp
              ? "XP exists but feedback source invalid — review before any retry."
              : "Retry 114 only after Source Key check; require valid feedback source.",
            owningAutomation: OWNING_AUTOMATIONS.videoFeedbackXp,
            meta: { dataFixRequired: !feedbackText },
          })
        );
      }
    }
  }

  const videoXp = xpEvents.filter((xp) =>
    /video/i.test(getSelectText((xp.fields || xp)["XP Source"]))
  );
  const dups = findDuplicateGroups(videoXp, (r) =>
    String(normalizeBlank((r.fields || r)["Source Key"]) || "")
  );
  for (const dup of dups) {
    for (const rid of dup.recordIds) {
      issues.push(
        fin({
          workflow: WORKFLOWS.VIDEO_FEEDBACK_XP,
          sourceTable: "XP Events",
          sourceRecordId: rid,
          sourceKey: dup.key,
          healthStatus: HEALTH_STATUS.DUPLICATE_RISK,
          code: "duplicate_video_feedback_xp",
          recommendedAction: "Deactivate duplicate Video Feedback XP Events for same Source Key.",
          owningAutomation: OWNING_AUTOMATIONS.videoFeedbackXp,
          meta: { duplicateRisk: true },
          evidence: [`count=${dup.count}`],
        })
      );
    }
  }

  return issues;
}

function fin(partial) {
  return withRetryClassification(buildIssue(partial));
}

module.exports = { checkVideoFeedback };
