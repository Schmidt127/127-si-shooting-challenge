/**
 * Learning Activity routing contract (plain Node).
 * Mirrors web/lib/learning-activities/routing.ts for repo-root contract tests.
 * XP ownership: never create XP Events here — only route into Homework Completions
 * so existing 064 → 065 remain the sole homework XP path.
 */

"use strict";

function hasHomeworkLink(activity) {
  return typeof activity?.homeworkId === "string" && activity.homeworkId.startsWith("rec");
}

/**
 * @param {object|null|undefined} activity
 * @returns {{ action: string, reason: string, homeworkId?: string }}
 */
function resolveHomeworkCompletionRouting(activity) {
  if (!activity) {
    return { action: "no_homework_completion", reason: "missing_activity" };
  }
  if (!activity.active) {
    return { action: "no_homework_completion", reason: "activity_inactive" };
  }
  if (!hasHomeworkLink(activity)) {
    return {
      action: "no_homework_completion",
      reason: "stand_alone_no_homework_link",
    };
  }
  if (!activity.countsAsHomework) {
    return {
      action: "no_homework_completion",
      reason: "homework_linked_but_not_configured_to_count",
    };
  }
  return {
    action: "create_or_update_homework_completion",
    homeworkId: activity.homeworkId,
    reason: "linked_and_counts_as_homework",
  };
}

function shouldCreateOrUpdateHomeworkCompletion(activity) {
  return resolveHomeworkCompletionRouting(activity).action === "create_or_update_homework_completion";
}

/**
 * One response → N Submission Asset intents. Empty list is valid (quiz/written).
 * @param {{ id: string, uploadIntents?: Array<{ filename?: string }> }} response
 */
function planSubmissionAssetFanout(response) {
  const assetIntents = Array.isArray(response?.uploadIntents)
    ? response.uploadIntents.filter((intent) => Boolean(intent?.filename))
    : [];
  return {
    responseId: response.id,
    processingLayer: "Submission Assets",
    assetIntents,
  };
}

/**
 * Stand-alone activities must not create HC unless homework link + countsAsHomework.
 * @param {object} activity
 */
function assertStandAloneDoesNotCreateHomeworkCompletion(activity) {
  if (!hasHomeworkLink(activity) && activity.countsAsHomework) {
    throw new Error(
      "Invalid Learning Activity config: countsAsHomework requires a Homework (curriculum) link."
    );
  }
}

/**
 * XP ownership guard — Learning Activities must never invent a parallel XP writer.
 * @returns {{ xpOwnerAutomation: string, forbidden: string[] }}
 */
function resolveLearningActivityXpOwnership() {
  return {
    xpOwnerAutomation: "065",
    prepareAutomation: "064",
    path: "Learning Activity Response → (optional) Homework Completion → coach review → 064 → 065",
    forbidden: [
      "direct_xp_from_learning_activity_response",
      "quiz_table_xp_writer",
      "parallel_learning_activity_xp_event",
    ],
  };
}

/**
 * Asset routing for response methods.
 * @param {string} responseMethod
 */
function resolveAssetRoutingForMethod(responseMethod) {
  const method = String(responseMethod || "").trim();
  const map = {
    file_upload: { createAssets: true, via: "009_or_LA_fanout", requiresAttachment: true },
    video_upload: { createAssets: true, via: "009_or_LA_fanout", requiresAttachment: true },
    quiz: { createAssets: "optional_quiz_pdf", via: "067_style", requiresAttachment: false },
    fillout_questions: { createAssets: false, via: "none", requiresAttachment: false },
    reflection: { createAssets: "optional", via: "009_or_none", requiresAttachment: false },
    assessment: { createAssets: "optional", via: "009_or_none", requiresAttachment: false },
    special_assignment: { createAssets: "optional", via: "009_or_LA_fanout", requiresAttachment: false },
    mixed: { createAssets: "per_intent", via: "planSubmissionAssetFanout", requiresAttachment: false },
  };
  return map[method] || { createAssets: false, via: "unknown", requiresAttachment: false };
}

module.exports = {
  hasHomeworkLink,
  resolveHomeworkCompletionRouting,
  shouldCreateOrUpdateHomeworkCompletion,
  planSubmissionAssetFanout,
  assertStandAloneDoesNotCreateHomeworkCompletion,
  resolveLearningActivityXpOwnership,
  resolveAssetRoutingForMethod,
};
