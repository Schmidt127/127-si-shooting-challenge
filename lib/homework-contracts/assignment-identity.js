/**
 * FUT-001 — Homework assignment identity + deadline contracts (plain Node).
 *
 * Authoritative identity: Enrollment + Program Homework Assignment (PHA record id).
 * Upload slot (HW1/HW2) is routing metadata only — not assignment identity.
 *
 * Due date: PHA Due Date when present, else Week End Date.
 */

"use strict";

const { isRecId } = require("./uniqueness");

function normalizeRecId(value) {
  const id = String(value || "").trim();
  return isRecId(id) ? id : "";
}

function toDateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    const month = localMatch[1].padStart(2, "0");
    const day = localMatch[2].padStart(2, "0");
    const year = localMatch[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

/**
 * Resolve which PHA the parent selected regardless of upload slot when unambiguous.
 *
 * @param {{ hw1PhaId?: string, hw2PhaId?: string, assetUploadSlot?: string }} input
 */
function resolveHomeworkAssignmentIdentity({ hw1PhaId = "", hw2PhaId = "", assetUploadSlot = "" } = {}) {
  const hw1 = normalizeRecId(hw1PhaId);
  const hw2 = normalizeRecId(hw2PhaId);
  const slot = String(assetUploadSlot || "").trim().toUpperCase();
  const unique = [...new Set([hw1, hw2].filter(Boolean))];

  if (unique.length === 0) {
    return { ok: false, reason: "missing_pha_selection", phaId: "", method: "" };
  }

  if (unique.length === 1) {
    return {
      ok: true,
      reason: "single_assignment_identity",
      phaId: unique[0],
      method: unique[0] === hw1 && hw1 ? "homework_name_1" : "homework_name_2",
      alternateUploadSlot: slot && slot !== "HW1" && slot !== "HW2" ? false : unique[0] === hw1 ? slot === "HW2" : slot === "HW1",
    };
  }

  const slotFieldPha = slot === "HW1" ? hw1 : slot === "HW2" ? hw2 : "";
  if (slotFieldPha && unique.includes(slotFieldPha)) {
    return {
      ok: true,
      reason: "dual_assignment_slot_field_match",
      phaId: slotFieldPha,
      method: slot === "HW1" ? "homework_name_1" : "homework_name_2",
      alternateUploadSlot: false,
    };
  }

  return {
    ok: false,
    reason: "ambiguous_dual_assignment",
    phaId: "",
    method: "",
    candidatePhaIds: unique,
  };
}

/**
 * FUT-001 canonical Homework Completion dedupe key.
 * @param {{ enrollmentId: string, phaId: string }} parts
 */
function buildHomeworkCompletionIdentityKeyByPha(parts) {
  const enrollmentId = normalizeRecId(parts?.enrollmentId);
  const phaId = normalizeRecId(parts?.phaId);
  if (!enrollmentId || !phaId) {
    throw new Error("buildHomeworkCompletionIdentityKeyByPha: invalid enrollmentId or phaId");
  }
  return `HC|enrollment|${enrollmentId}|pha|${phaId}`;
}

/**
 * Prefer PHA link; fall back to enrollment + week + library (067-aligned) without slot.
 */
function findHomeworkCompletionByAssignmentIdentity(records, {
  enrollmentId,
  phaId,
  weekId = "",
  homeworkLibraryId = "",
  getField = defaultGetField,
} = {}) {
  const enr = normalizeRecId(enrollmentId);
  const pha = normalizeRecId(phaId);
  const week = normalizeRecId(weekId);
  const library = normalizeRecId(homeworkLibraryId);

  if (!enr) {
    return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
  }

  const byPha = (records || []).filter((row) => {
    const rowEnr = normalizeRecId(getField(row, "Enrollment"));
    const rowPha = normalizeRecId(getField(row, "Program Homework Assignment"));
    return rowEnr === enr && pha && rowPha === pha;
  });
  if (byPha.length) {
    return {
      homeworkCompletion: byPha[0],
      matchType: "enrollment_pha_identity",
      candidateCount: byPha.length,
    };
  }

  if (week && library) {
    const byLibrary = (records || []).filter((row) => {
      const rowEnr = normalizeRecId(getField(row, "Enrollment"));
      const rowWeek = normalizeRecId(getField(row, "Week"));
      const rowLibrary = normalizeRecId(getField(row, "Homework"));
      return rowEnr === enr && rowWeek === week && rowLibrary === library;
    });
    if (byLibrary.length) {
      return {
        homeworkCompletion: byLibrary[0],
        matchType: "enrollment_week_homework",
        candidateCount: byLibrary.length,
      };
    }
  }

  return { homeworkCompletion: null, matchType: "", candidateCount: 0 };
}

function defaultGetField(record, fieldName) {
  const raw = record?.fields?.[fieldName];
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && first.id) return String(first.id).trim();
    if (typeof first === "string") return first.trim();
    return "";
  }
  if (raw && typeof raw === "object" && raw.id) return String(raw.id).trim();
  return raw == null ? "" : String(raw).trim();
}

/**
 * PHA Due Date overrides Week End Date when present.
 */
function resolveAssignmentDueDateKey(phaDueDate, weekEndDate) {
  const fromPha = toDateKeyFromText(phaDueDate);
  if (fromPha) return fromPha;
  return toDateKeyFromText(weekEndDate) || "";
}

/**
 * Compare submission calendar day to resolved due date (inclusive on-time through due date).
 */
function evaluateHomeworkSubmissionDeadline({
  submissionDateKey = "",
  phaDueDate = "",
  weekEndDate = "",
} = {}) {
  const submitKey = toDateKeyFromText(submissionDateKey);
  const dueKey = resolveAssignmentDueDateKey(phaDueDate, weekEndDate);

  if (!submitKey) {
    return {
      creditEligible: true,
      timingStatus: "unknown_submission_date",
      dueDateKey: dueKey,
      reason: "Submission date missing; deadline not enforced.",
    };
  }

  if (!dueKey) {
    return {
      creditEligible: true,
      timingStatus: "no_due_date",
      dueDateKey: "",
      reason: "No PHA Due Date or Week End Date; deadline not enforced.",
    };
  }

  if (submitKey > dueKey) {
    return {
      creditEligible: false,
      timingStatus: "late_ineligible",
      dueDateKey: dueKey,
      reason: `Submission date ${submitKey} is after assignment due date ${dueKey}.`,
    };
  }

  return {
    creditEligible: true,
    timingStatus: "on_time",
    dueDateKey: dueKey,
    reason: "",
  };
}

function buildLateSubmissionNote({ timingStatus, dueDateKey, submissionDateKey }) {
  if (timingStatus !== "late_ineligible") return "";
  return `Late submission: activity date ${submissionDateKey} is after due date ${dueDateKey}. Not eligible for homework credit or XP unless an approved exception is recorded.`;
}

module.exports = {
  resolveHomeworkAssignmentIdentity,
  buildHomeworkCompletionIdentityKeyByPha,
  findHomeworkCompletionByAssignmentIdentity,
  resolveAssignmentDueDateKey,
  evaluateHomeworkSubmissionDeadline,
  buildLateSubmissionNote,
  toDateKeyFromText,
};
