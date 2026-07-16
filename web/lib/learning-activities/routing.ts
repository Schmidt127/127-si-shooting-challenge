/**
 * Pure Learning Activities routing helpers (LA-001).
 *
 * Encodes the approved rules for when a Learning Activity Response may
 * touch Homework Completions and how uploads fan out to Submission Assets.
 * Safe for unit tests — no Airtable I/O.
 */

import type {
  HomeworkCompletionRoutingDecision,
  LearningActivityDefinition,
  LearningActivityResponse,
  LearningActivityUploadIntent,
  SubmissionAssetFanoutPlan,
} from "@/types/learning-activities";

function hasHomeworkLink(activity: LearningActivityDefinition): boolean {
  return typeof activity.homeworkId === "string" && activity.homeworkId.startsWith("rec");
}

/**
 * Decide whether a Response for this activity should create/update a
 * Homework Completion using the existing review + XP pipeline.
 *
 * Rules:
 * - Linked Homework + countsAsHomework → create/update HC
 * - Blank Homework → never create HC (stand-alone)
 * - Linked but countsAsHomework false → never create HC
 * - Inactive / missing activity → no HC
 */
export function resolveHomeworkCompletionRouting(
  activity: LearningActivityDefinition | null | undefined,
): HomeworkCompletionRoutingDecision {
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
    homeworkId: activity.homeworkId as string,
    reason: "linked_and_counts_as_homework",
  };
}

/**
 * Convenience: should this activity participate in Homework Completions?
 */
export function shouldCreateOrUpdateHomeworkCompletion(
  activity: LearningActivityDefinition | null | undefined,
): boolean {
  return resolveHomeworkCompletionRouting(activity).action === "create_or_update_homework_completion";
}

/**
 * One Learning Activity Response → N Submission Asset intents.
 * Empty upload list is valid (quiz/assessment with no files).
 */
export function planSubmissionAssetFanout(
  response: Pick<LearningActivityResponse, "id" | "uploadIntents">,
): SubmissionAssetFanoutPlan {
  const assetIntents: LearningActivityUploadIntent[] = Array.isArray(response.uploadIntents)
    ? response.uploadIntents.filter((intent) => Boolean(intent?.filename))
    : [];

  return {
    responseId: response.id,
    processingLayer: "Submission Assets",
    assetIntents,
  };
}

/**
 * Guard used by future writers: stand-alone activities must not create HC
 * unless explicitly configured (link + countsAsHomework).
 */
export function assertStandAloneDoesNotCreateHomeworkCompletion(
  activity: LearningActivityDefinition,
): void {
  if (!hasHomeworkLink(activity) && activity.countsAsHomework) {
    throw new Error(
      "Invalid Learning Activity config: countsAsHomework requires a Homework (curriculum) link.",
    );
  }
}
