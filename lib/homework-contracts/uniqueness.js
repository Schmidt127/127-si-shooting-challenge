/**
 * Homework Completion uniqueness / identity contract (plain Node).
 * Agent 11 — docs/next-wave/homework-pipeline/
 *
 * Canonical identity dimensions:
 *   Enrollment + Homework assignment + item/asset slot + applicable Submission
 *
 * Live writers use slightly different search keys:
 *   020 file path: Submission + Homework + slot (Enrollment carried on HC)
 *   067 quiz path: Enrollment + Week + Homework (slot stamped HW1)
 */

"use strict";

const VALID_SLOTS = new Set(["HW1", "HW2", "QUIZ", "WRITTEN", "LA"]);

function isRecId(value) {
  return typeof value === "string" && /^rec[a-zA-Z0-9]{14}$/.test(value);
}

/**
 * @typedef {object} HomeworkCompletionIdentity
 * @property {string} enrollmentId
 * @property {string} homeworkAssignmentId
 * @property {string} itemSlot
 * @property {string|null|undefined} submissionId
 * @property {"file"|"written"|"quiz"|"learning_activity"} [responseKind]
 * @property {string|null|undefined} [weekId]
 */

/**
 * Build the canonical identity key string used by contracts/tests.
 * Missing required parts throw — callers must validate intake first.
 *
 * @param {HomeworkCompletionIdentity} identity
 * @returns {string}
 */
function buildHomeworkCompletionIdentityKey(identity) {
  const enrollmentId = String(identity?.enrollmentId || "").trim();
  const homeworkAssignmentId = String(identity?.homeworkAssignmentId || "").trim();
  const itemSlot = String(identity?.itemSlot || "").trim().toUpperCase();
  const submissionId = identity?.submissionId
    ? String(identity.submissionId).trim()
    : "";
  const responseKind = String(identity?.responseKind || "file").trim();

  if (!isRecId(enrollmentId)) {
    throw new Error("buildHomeworkCompletionIdentityKey: invalid enrollmentId");
  }
  if (!isRecId(homeworkAssignmentId)) {
    throw new Error("buildHomeworkCompletionIdentityKey: invalid homeworkAssignmentId");
  }
  if (!VALID_SLOTS.has(itemSlot) && !/^HW\d+$/.test(itemSlot)) {
    throw new Error(`buildHomeworkCompletionIdentityKey: invalid itemSlot ${itemSlot}`);
  }

  // File path: Submission is part of identity (matches 020 search dimensions).
  if (responseKind === "file") {
    if (!isRecId(submissionId)) {
      throw new Error("buildHomeworkCompletionIdentityKey: file path requires submissionId");
    }
    return `HC|file|${enrollmentId}|${homeworkAssignmentId}|${itemSlot}|${submissionId}`;
  }

  // Written-only / quiz / LA: Submission may be absent; identity is enrollment+assignment+slot.
  const subPart = isRecId(submissionId) ? submissionId : "NONE";
  return `HC|${responseKind}|${enrollmentId}|${homeworkAssignmentId}|${itemSlot}|${subPart}`;
}

/**
 * 020 live search key (not Enrollment-scoped in the query itself).
 * @param {{ submissionId: string, homeworkAssignmentId: string, itemSlot: string }} parts
 */
function build020MatchKey(parts) {
  const submissionId = String(parts?.submissionId || "").trim();
  const homeworkAssignmentId = String(parts?.homeworkAssignmentId || "").trim();
  const itemSlot = String(parts?.itemSlot || "").trim().toUpperCase();
  if (!isRecId(submissionId) || !isRecId(homeworkAssignmentId)) {
    throw new Error("build020MatchKey: invalid submissionId or homeworkAssignmentId");
  }
  if (!(itemSlot === "HW1" || itemSlot === "HW2")) {
    throw new Error("build020MatchKey: itemSlot must be HW1 or HW2");
  }
  return `020|${submissionId}|${homeworkAssignmentId}|${itemSlot}`;
}

/**
 * 067 live search key.
 * @param {{ enrollmentId: string, weekId: string, homeworkAssignmentId: string }} parts
 */
function build067MatchKey(parts) {
  const enrollmentId = String(parts?.enrollmentId || "").trim();
  const weekId = String(parts?.weekId || "").trim();
  const homeworkAssignmentId = String(parts?.homeworkAssignmentId || "").trim();
  if (!isRecId(enrollmentId) || !isRecId(weekId) || !isRecId(homeworkAssignmentId)) {
    throw new Error("build067MatchKey: invalid enrollmentId, weekId, or homeworkAssignmentId");
  }
  return `067|${enrollmentId}|${weekId}|${homeworkAssignmentId}`;
}

/**
 * Assess whether the canonical key is sufficient for a scenario.
 * @param {string} scenario
 * @returns {{ sufficient: boolean, notes: string, recommendedKey: string }}
 */
function assessCanonicalKeySufficiency(scenario) {
  const map = {
    multiple_attachments: {
      sufficient: true,
      notes:
        "Many Submission Assets may link to one HC. Identity is Enrollment+Homework+slot+Submission — not per-file.",
      recommendedKey: "canonical_file",
    },
    written_only_response: {
      sufficient: true,
      notes:
        "Use responseKind=written with submissionId optional. Slot should be WRITTEN or HW1 when curriculum maps a slot.",
      recommendedKey: "canonical_written",
    },
    quiz: {
      sufficient: false,
      notes:
        "Canonical key alone does not include Week; 067 dedupes Enrollment+Week+Homework. Align quiz writers to canonical + weekId side-channel, or extend key.",
      recommendedKey: "067_enrollment_week_homework",
    },
    resubmission: {
      sufficient: false,
      notes:
        "Same Enrollment+Homework+slot+Submission collapses to one HC (correct for multi-file). A true resubmit that must create a new HC needs a new Submission or an explicit attempt index (not in current schema).",
      recommendedKey: "canonical_file_or_new_submission",
    },
    correction: {
      sufficient: true,
      notes:
        "Coach correction updates the same HC; uniqueness must not mint a second row. Key sufficiency = good.",
      recommendedKey: "canonical_file",
    },
    duplicate_fillout_submission: {
      sufficient: false,
      notes:
        "Duplicate Fillout rows can create parallel Submissions → parallel HCs under 020 keys. Need 007 Duplicate Key / Fillout submission id guard upstream.",
      recommendedKey: "upstream_submission_dedupe",
    },
  };

  const hit = map[scenario];
  if (!hit) {
    throw new Error(`assessCanonicalKeySufficiency: unknown scenario ${scenario}`);
  }
  return hit;
}

/**
 * Decide link vs create given existing match ids for one identity.
 * @param {{ existingCompletionIds?: string[] }} input
 */
function decideCompletionLinkOrCreate({ existingCompletionIds = [] } = {}) {
  const ids = [...new Set((existingCompletionIds || []).filter(Boolean))];
  if (ids.length === 1) {
    return { action: "link_existing", completionId: ids[0], reason: "exact_match" };
  }
  if (ids.length > 1) {
    return {
      action: "link_preferred",
      completionId: ids[0],
      completionIds: ids,
      reason: "multiple_matches_prefer_first",
    };
  }
  return { action: "create", reason: "no_existing_completion" };
}

module.exports = {
  VALID_SLOTS,
  isRecId,
  buildHomeworkCompletionIdentityKey,
  build020MatchKey,
  build067MatchKey,
  assessCanonicalKeySufficiency,
  decideCompletionLinkOrCreate,
};
