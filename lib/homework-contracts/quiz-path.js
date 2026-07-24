/**
 * HW17 / Final Reflection Quiz path decision helpers (plain Node).
 * Product choice remains Mike's; helpers encode Option A vs B contracts.
 */

"use strict";

const QUIZ_ATTACHMENT_FIELD = "Quiz Result PDF";
const QUIZ_ATTACHMENT_TYPE = "multipleAttachments";
const QUIZ_TABLE = "Final Reflection Quiz Submissions";

/**
 * Option A — require Quiz Result PDF field + Fillout mapping + asset fan-out.
 */
function quizOptionAPacket() {
  return {
    id: "option_a_quiz_result_pdf",
    title: "Option A — Quiz Result PDF",
    airtableField: {
      table: QUIZ_TABLE,
      name: QUIZ_ATTACHMENT_FIELD,
      type: QUIZ_ATTACHMENT_TYPE,
    },
    filloutMapping: {
      form: "HW17 Final Reflection Quiz (Fillout)",
      mapFileUploadOrPdfExportTo: QUIZ_ATTACHMENT_FIELD,
      notes:
        "Fillout must write a file into Quiz Result PDF on create/update of the quiz row.",
    },
    automation067: {
      behavior:
        "When field present and non-empty: find/create parent Submission, create Submission Assets (dedupe Source Attachment ID), link to HC, leave Pending Link for 020/070a.",
      actionOutSuccess: ["created_new", "linked_existing", "assets_created", "assets_linked"],
      softSkipWithoutFile: false,
      stillCreatesCompletionWithoutFile: true,
      noAttachmentActionOut: ["no_attachment_yet"],
    },
    assetCreation: true,
    upload: { automations: ["020", "070a", "022"], required: true },
    review: {
      coachSees: "Drive/file via Submission Assets writeback on Homework Completion",
      scoreFields: ["Score", "Target Score Met?"],
    },
    xp: { owner: "065", prepare: "064", neverFrom067: true },
    testing: [
      "Install Quiz Result PDF on DEV quiz table",
      "Map Fillout file → field",
      "Run 067 → expect assets_created",
      "Run 020/070a path (or Pending Link arm)",
      "Coach review → 064/065 XP once",
      "Re-run 067 → skipped_already_linked / assets_linked only",
    ],
  };
}

/**
 * Option B — attachment-less completion (current schema reality).
 */
function quizOptionBPacket() {
  return {
    id: "option_b_attachment_less",
    title: "Option B — Attachment-less completion",
    airtableField: {
      table: QUIZ_TABLE,
      name: null,
      type: null,
      notes: "Current PROD has no attachment field on Final Reflection Quiz Submissions.",
    },
    filloutMapping: {
      form: "HW17 Final Reflection Quiz (Fillout)",
      mapFileUploadOrPdfExportTo: null,
      notes: "No file required. Score/result fields remain on the quiz row.",
    },
    automation067: {
      behavior:
        "Existing v2.0 path: create/link HC from Enrollment+Week+Homework; actionOut includes no_attachment_field; no fake assets.",
      actionOutSuccess: ["created_new", "linked_existing", "no_attachment_field"],
      softSkipWithoutFile: true,
      stillCreatesCompletionWithoutFile: true,
      noAttachmentActionOut: ["no_attachment_field", "no_attachment_yet"],
    },
    assetCreation: false,
    upload: { automations: [], required: false, forbidFakeAttachment: true },
    review: {
      coachSees: "Quiz row Score / Target Score Met? + HC Ready for Review (071 Fillout-aware)",
      scoreFields: ["Score", "Target Score Met?"],
      displayRequirement:
        "Coach review Interface/view must show quiz score/result without requiring Drive URL.",
    },
    xp: { owner: "065", prepare: "064", neverFrom067: true },
    testing: [
      "Confirm quiz table has no attachment field (PROD fact)",
      "Run 067 → HC created, actionOut no_attachment_field",
      "Assert zero Submission Assets created",
      "Coach marks Satisfactory + Review Complete",
      "064/065 award one XP Event",
      "071 parent feedback without asset requirement",
    ],
  };
}

/**
 * Recommend one option from current pipeline facts (product decision still Mike's).
 */
function recommendQuizPath({
  quizTableHasAttachmentField = false,
  homeworkUpload070aOn = false,
  preferUploadParity = false,
} = {}) {
  if (quizTableHasAttachmentField && preferUploadParity) {
    return {
      recommendation: "option_a_quiz_result_pdf",
      rationale:
        "Field exists and upload parity with file homework is desired; use Option A end-to-end.",
      productDecisionRequired: true,
    };
  }
  if (!quizTableHasAttachmentField) {
    return {
      recommendation: "option_b_attachment_less",
      rationale:
        "PROD Final Reflection Quiz Submissions currently has no attachment field; 067 v2.0 already supports attachment-less completion. Option A requires schema + Fillout work before it is real. Prefer Option B now; revisit A only if Mike wants Drive/file review parity for HW17.",
      productDecisionRequired: true,
      notes: {
        homeworkUpload070aOn,
        optionABlockedBy: "missing_Quiz_Result_PDF_field",
      },
    };
  }
  return {
    recommendation: "option_b_attachment_less",
    rationale:
      "Attachment field exists but upload parity is not required; keep attachment-less unless product asks for PDF review artifacts.",
    productDecisionRequired: true,
  };
}

module.exports = {
  QUIZ_ATTACHMENT_FIELD,
  QUIZ_ATTACHMENT_TYPE,
  QUIZ_TABLE,
  quizOptionAPacket,
  quizOptionBPacket,
  recommendQuizPath,
};
