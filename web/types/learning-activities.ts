/**
 * Learning Activities contract types (LA-001).
 *
 * These types prepare the routing / completion-method layer that will sit
 * beside the existing Homework catalog (`FBC Curriculum - SYNC`, linked as
 * `Homework` on Homework Completions). They do not imply Airtable schema
 * exists yet — see docs/learning-activities/LA-000-current-state-handoff.md.
 */

/** How an athlete completes a Learning Activity. */
export type LearningActivityCompletionMethod =
  | "fillout_questions"
  | "file_upload"
  | "video_upload"
  | "quiz"
  | "assessment"
  | "reflection"
  | "special_assignment"
  | "mixed";

/** Payload kinds that may appear on one Learning Activity Response. */
export type LearningActivityResponseKind =
  | "fillout_questions"
  | "files"
  | "videos"
  | "quiz"
  | "assessment"
  | "reflection"
  | "special_assignment";

/**
 * Configurable routing row (future Airtable: Learning Activities).
 * Optional Homework link points at the existing curriculum catalog record.
 */
export type LearningActivityDefinition = {
  id: string;
  name: string;
  completionMethod: LearningActivityCompletionMethod;
  /** Airtable record id of `FBC Curriculum - SYNC` when this activity is homework-linked. */
  homeworkId: string | null;
  /**
   * When true AND homeworkId is set, a Response must create/update the
   * existing Homework Completion process (review + XP unchanged).
   */
  countsAsHomework: boolean;
  active: boolean;
};

/** Intake / submission record (future Airtable: Learning Activity Responses). */
export type LearningActivityResponse = {
  id: string;
  learningActivityId: string;
  enrollmentId: string;
  weekId: string | null;
  kinds: LearningActivityResponseKind[];
  /** Normalized upload descriptors before Submission Asset creation. */
  uploadIntents: LearningActivityUploadIntent[];
  submittedAt: string | null;
};

/**
 * One Response may fan out to multiple Submission Assets.
 * Submission Assets remain the canonical upload / file-processing layer.
 */
export type LearningActivityUploadIntent = {
  filename: string;
  contentType: string | null;
  sourceAttachmentId: string | null;
  purpose: "homework_file" | "video" | "quiz_artifact" | "other";
};

export type HomeworkCompletionRoutingDecision =
  | {
      action: "create_or_update_homework_completion";
      homeworkId: string;
      reason: "linked_and_counts_as_homework";
    }
  | {
      action: "no_homework_completion";
      reason:
        | "stand_alone_no_homework_link"
        | "homework_linked_but_not_configured_to_count"
        | "activity_inactive"
        | "missing_activity";
    };

export type SubmissionAssetFanoutPlan = {
  responseId: string;
  /** Canonical processing layer name — do not invent a parallel upload store. */
  processingLayer: "Submission Assets";
  assetIntents: LearningActivityUploadIntent[];
};
