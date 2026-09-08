/**
 * Pure readiness gate for 070a/070b — Submission - Linked requirements.
 * Structured Curriculum assets may omit Submission when routed to Homework Completions
 * with HC + Enrollment present. Legacy Daily Submission path still requires Submission.
 *
 * Keep in sync with the gate embedded in 070a / 070b automation scripts.
 * Tests: lib/070a-submission-gate.test.js
 */

/**
 * @param {{
 *   uploadDestination: string,
 *   submissionLinkedCount: number,
 *   enrollmentLinkedCount: number,
 *   homeworkCompletionsLinkedCount?: number,
 *   homeworkCompletionsRid?: string,
 *   targetRecordId?: string,
 * }} input
 * @returns {{
 *   ok: boolean,
 *   allowBlankSubmission: boolean,
 *   actionOut?: string,
 *   uploadError?: string,
 *   message?: string,
 * }}
 */
function evaluateSubmissionLinkedGate(input) {
  const uploadDestination = String(input.uploadDestination || "").trim();
  const submissionLinkedCount = Number(input.submissionLinkedCount) || 0;
  const enrollmentLinkedCount = Number(input.enrollmentLinkedCount) || 0;
  const homeworkCompletionsLinkedCount = Number(input.homeworkCompletionsLinkedCount) || 0;
  const homeworkCompletionsRid = String(input.homeworkCompletionsRid || "").trim();
  const targetRecordId = String(input.targetRecordId || "").trim();

  const hasHc =
    homeworkCompletionsLinkedCount > 0 ||
    Boolean(targetRecordId) ||
    /^rec[a-zA-Z0-9]{14}$/.test(homeworkCompletionsRid);

  if (submissionLinkedCount > 0) {
    return { ok: true, allowBlankSubmission: false };
  }

  // SC-STRUCTURED-HOMEWORK-FILES-001: Curriculum SA may have blank Submission
  // when Upload Destination is Homework Completions and HC + Enrollment exist.
  if (
    uploadDestination === "Homework Completions" &&
    hasHc &&
    enrollmentLinkedCount > 0
  ) {
    return { ok: true, allowBlankSubmission: true };
  }

  return {
    ok: false,
    allowBlankSubmission: false,
    actionOut: "error_missing_submission",
    uploadError: "Submission - Linked is missing.",
    message: "Missing Submission - Linked.",
  };
}

module.exports = {
  evaluateSubmissionLinkedGate,
};
