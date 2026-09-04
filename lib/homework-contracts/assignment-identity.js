/**
 * FUT-001 / SC-160 — Homework assignment identity + timing contracts (plain Node).
 *
 * Authoritative identity: Enrollment + Program Homework Assignment (PHA record id).
 * Upload slot (HW1/HW2) is routing metadata only — not assignment identity.
 *
 * Assigned Week (SC-160): PHA.Week is authoritative for Homework Completion Week.
 * Submission.Week / Activity Date Week are not required for HC ownership.
 *
 * Due date: PHA Due Date when present, else Week End Date (Saturday),
 * inclusive through 11:59:59.999 p.m. America/Denver on that calendar day.
 *
 * Timing statuses:
 * - early: qualifying timestamp before assigned Week Start Date
 * - on_time: on/after week start and on/before due deadline
 * - late: after due deadline
 *
 * Late-credit / Perfect Week policy:
 * - Late satisfactory homework receives full XP / credit.
 * - Early and on_time satisfactory homework count toward Perfect Week for the assigned Week.
 * - Late homework does NOT count toward Perfect Week.
 * - Coach review timing must not change athlete timeliness (use asset upload / Submission Date).
 * - Placeholder before deadline + satisfactory replacement after → late for Perfect Week
 *   (qualifying timestamp = latest linked asset Uploaded At when present).
 * - Perfect Week award must wait until the assigned Week's evaluation time
 *   (after Week End Saturday 11:59:59.999pm America/Denver).
 */

"use strict";

const { isRecId } = require("./uniqueness");

const DENVER_TZ = "America/Denver";

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
 * Parse a date/datetime into epoch ms. Date-only values are treated as
 * local Denver calendar midnights for ordering; ISO datetimes keep instant.
 */
function toEpochMs(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();

  const text = String(value).trim();
  if (!text) return null;

  const dateOnly = toDateKeyFromText(text);
  if (dateOnly && !/[T\s]\d{1,2}:\d{2}/.test(text) && !text.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(text)) {
    // Stable UTC noon stand-in for date-only calendar compares (avoids DST edge flips).
    return Date.parse(`${dateOnly}T12:00:00.000Z`);
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * End of calendar day in America/Denver as epoch ms (11:59:59.999pm local).
 * Uses Intl offset sampling — no external tz dependency.
 */
function denverEndOfDayMs(dateKey) {
  const key = toDateKeyFromText(dateKey);
  if (!key) return null;

  const [y, m, d] = key.split("-").map(Number);
  // Candidate: treat as UTC midnight then walk to Denver local end-of-day.
  // Binary-search the UTC instant whose Denver calendar day is `key` and local time is 23:59:59.999.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  function denverParts(ms) {
    const parts = formatter.formatToParts(new Date(ms));
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      hour: Number(get("hour")),
      minute: Number(get("minute")),
      second: Number(get("second")),
    };
  }

  // Start near UTC noon of that calendar day and find last ms still on that Denver date.
  let lo = Date.UTC(y, m - 1, d, 0, 0, 0) - 12 * 3600 * 1000;
  let hi = Date.UTC(y, m - 1, d, 23, 59, 59) + 18 * 3600 * 1000;
  let best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const parts = denverParts(mid);
    if (parts.dateKey < key) {
      lo = mid + 1;
    } else if (parts.dateKey > key) {
      hi = mid - 1;
    } else {
      best = mid;
      lo = mid + 1;
    }
  }
  return best;
}

function denverStartOfDayMs(dateKey) {
  const end = denverEndOfDayMs(dateKey);
  if (end == null) return null;
  // Walk backward within the same Denver calendar day to 00:00:00.000 local.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  function denverParts(ms) {
    const parts = formatter.formatToParts(new Date(ms));
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      hour: Number(get("hour")),
      minute: Number(get("minute")),
      second: Number(get("second")),
    };
  }
  let lo = end - 36 * 3600 * 1000;
  let hi = end;
  let best = end;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const parts = denverParts(mid);
    if (parts.dateKey < dateKey) {
      lo = mid + 1;
    } else if (parts.dateKey > dateKey) {
      hi = mid - 1;
    } else {
      best = mid;
      hi = mid - 1;
    }
  }
  return best;
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
 * SC-160: HC Week comes from PHA.Week, not Submission.Week / Activity Date Week.
 */
function resolveHomeworkAssignedWeekId({ phaWeekId = "", submissionWeekId = "" } = {}) {
  const phaWeek = normalizeRecId(phaWeekId);
  const submissionWeek = normalizeRecId(submissionWeekId);
  if (phaWeek) {
    return {
      ok: true,
      weekId: phaWeek,
      source: "pha_week",
      submissionWeekId: submissionWeek,
      submissionWeekIgnored: Boolean(submissionWeek && submissionWeek !== phaWeek),
      reason: submissionWeek && submissionWeek !== phaWeek
        ? "Submission.Week differs from PHA.Week; PHA.Week is authoritative for Homework Completion."
        : "PHA.Week is authoritative for Homework Completion.",
    };
  }
  if (submissionWeek) {
    return {
      ok: true,
      weekId: submissionWeek,
      source: "submission_week_fallback",
      submissionWeekId: submissionWeek,
      submissionWeekIgnored: false,
      reason: "PHA.Week missing; falling back to Submission.Week.",
    };
  }
  return {
    ok: false,
    weekId: "",
    source: "",
    submissionWeekId: "",
    submissionWeekIgnored: false,
    reason: "Neither PHA.Week nor Submission.Week is available.",
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
 * Qualifying athlete-submit timestamp for Perfect Week / timing.
 * Latest asset Uploaded At wins (placeholder early + satisfactory late → late).
 * Falls back to HC Uploaded At, then Submission / Activity Date.
 */
function resolveQualifyingSubmissionTimestamp({
  assetUploadedAts = [],
  uploadedAt = "",
  submissionDate = "",
  activityDate = "",
} = {}) {
  const candidates = [];
  for (const value of assetUploadedAts || []) {
    const ms = toEpochMs(value);
    if (ms != null) candidates.push({ ms, source: "asset_uploaded_at" });
  }
  const uploadedMs = toEpochMs(uploadedAt);
  if (uploadedMs != null) candidates.push({ ms: uploadedMs, source: "uploaded_at" });

  if (candidates.length) {
    candidates.sort((a, b) => a.ms - b.ms);
    const latest = candidates[candidates.length - 1];
    const dateKey = toDateKeyFromText(new Date(latest.ms).toISOString()) || "";
    // Prefer Denver calendar day of the instant when possible.
    const denverKey = denverCalendarDateKey(latest.ms) || dateKey;
    return {
      ok: true,
      epochMs: latest.ms,
      dateKey: denverKey,
      source: latest.source,
      candidateCount: candidates.length,
    };
  }

  const fallbackText = submissionDate || activityDate || "";
  const fallbackKey = toDateKeyFromText(fallbackText);
  if (fallbackKey) {
    return {
      ok: true,
      epochMs: toEpochMs(fallbackKey),
      dateKey: fallbackKey,
      source: submissionDate ? "submission_date" : "activity_date",
      candidateCount: 0,
    };
  }

  return { ok: false, epochMs: null, dateKey: "", source: "", candidateCount: 0 };
}

function denverCalendarDateKey(epochMs) {
  if (epochMs == null || Number.isNaN(epochMs)) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA → YYYY-MM-DD
  return formatter.format(new Date(epochMs));
}

/**
 * Compare qualifying submission to due deadline.
 * Early = before assigned Week Start (when weekStartDate provided).
 * Late remains credit-eligible for XP; Perfect Week uses perfectWeekEligible separately.
 */
function evaluateHomeworkSubmissionDeadline({
  submissionDateKey = "",
  qualifyingEpochMs = null,
  phaDueDate = "",
  weekEndDate = "",
  weekStartDate = "",
} = {}) {
  const dueKey = resolveAssignmentDueDateKey(phaDueDate, weekEndDate);
  const weekStartKey = toDateKeyFromText(weekStartDate);
  const submitKey =
    toDateKeyFromText(submissionDateKey) ||
    (qualifyingEpochMs != null ? denverCalendarDateKey(qualifyingEpochMs) : "");

  const dueEndMs = dueKey ? denverEndOfDayMs(dueKey) : null;
  const weekStartMs = weekStartKey ? denverStartOfDayMs(weekStartKey) : null;
  const submitMs =
    qualifyingEpochMs != null
      ? qualifyingEpochMs
      : submitKey
        ? denverStartOfDayMs(submitKey)
        : null;

  if (!submitKey && submitMs == null) {
    return {
      creditEligible: true,
      timingStatus: "unknown_submission_date",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: false,
      reason:
        "Submission date missing; deadline not enforced for XP. Perfect Week requires a known on-time Submission Date.",
    };
  }

  if (!dueKey) {
    const earlyWithoutDue =
      weekStartMs != null && submitMs != null && submitMs < weekStartMs;
    return {
      creditEligible: true,
      timingStatus: earlyWithoutDue ? "early" : "no_due_date",
      dueDateKey: "",
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: true,
      reason: earlyWithoutDue
        ? `Qualifying submit ${submitKey} is before assigned Week Start ${weekStartKey}; counts for assigned Week Perfect Week after evaluation time.`
        : "No PHA Due Date or Week End Date; deadline not enforced.",
    };
  }

  if (dueEndMs != null && submitMs != null && submitMs > dueEndMs) {
    return {
      creditEligible: true,
      timingStatus: "late",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: false,
      reason: `Qualifying submit ${submitKey} is after assignment due date ${dueKey} 11:59:59pm America/Denver. Full XP credit allowed; does not count toward Perfect Week.`,
    };
  }

  // Date-key fallback when ms unavailable: late if submit day after due day.
  if (submitMs == null && submitKey && submitKey > dueKey) {
    return {
      creditEligible: true,
      timingStatus: "late",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: false,
      reason: `Submission date ${submitKey} is after assignment due date ${dueKey}. Full XP credit allowed; does not count toward Perfect Week.`,
    };
  }

  if (weekStartMs != null && submitMs != null && submitMs < weekStartMs) {
    return {
      creditEligible: true,
      timingStatus: "early",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: true,
      reason: `Qualifying submit ${submitKey} is before assigned Week Start ${weekStartKey}. Counts toward assigned Week; Perfect Week award waits for week evaluation time.`,
    };
  }

  if (weekStartKey && submitKey && submitKey < weekStartKey) {
    return {
      creditEligible: true,
      timingStatus: "early",
      dueDateKey: dueKey,
      weekStartDateKey: weekStartKey,
      perfectWeekEligible: true,
      reason: `Submission date ${submitKey} is before assigned Week Start ${weekStartKey}. Counts toward assigned Week; Perfect Week award waits for week evaluation time.`,
    };
  }

  return {
    creditEligible: true,
    timingStatus: "on_time",
    dueDateKey: dueKey,
    weekStartDateKey: weekStartKey,
    perfectWeekEligible: true,
    reason: "",
  };
}

function buildLateSubmissionNote({ timingStatus, dueDateKey, submissionDateKey }) {
  return buildTimingSubmissionNote({ timingStatus, dueDateKey, submissionDateKey });
}

function buildTimingSubmissionNote({
  timingStatus,
  dueDateKey = "",
  submissionDateKey = "",
  weekStartDateKey = "",
} = {}) {
  if (timingStatus === "late" || timingStatus === "late_ineligible") {
    return `Late submission: activity date ${submissionDateKey} is after due date ${dueDateKey}. Full homework XP credit still applies once satisfactory; does not count toward Perfect Week for the original week.`;
  }
  if (timingStatus === "early") {
    return `Early submission: qualifying date ${submissionDateKey} is before assigned Week Start ${weekStartDateKey || "(unknown)"}. Counts toward assigned Week; Perfect Week award waits until that Week's evaluation time (after Week End 11:59:59pm America/Denver).`;
  }
  return "";
}

/**
 * Perfect Week evaluation may award only after assigned Week End
 * Saturday 11:59:59.999pm America/Denver (or explicit due-date day end when used as week end).
 */
function isPerfectWeekEvaluationTimeReached({
  weekEndDate = "",
  nowMs = Date.now(),
} = {}) {
  const endKey = toDateKeyFromText(weekEndDate);
  if (!endKey) return true;
  const endMs = denverEndOfDayMs(endKey);
  if (endMs == null) return true;
  return nowMs > endMs;
}

/**
 * Canonical Homework XP Source Key — one completion → one XP event.
 */
function homeworkXpSourceKey(homeworkCompletionId) {
  const id = String(homeworkCompletionId || "").trim();
  return id ? `HOMEWORK_XP|${id}` : "";
}

/**
 * Pure XP award decision for 065 contract tests (no Airtable runtime).
 * Early/late + satisfactory remains XP-eligible. Needs Revision / unsatisfactory → no XP.
 * Existing Source Key means update-in-place (no duplicate events).
 */
function evaluateHomeworkXpAwardDecision({
  satisfactory = false,
  reviewComplete = false,
  hasCoachFeedback = false,
  phaOwnershipEligible = true,
  submissionDateKey = "",
  qualifyingEpochMs = null,
  phaDueDate = "",
  weekEndDate = "",
  weekStartDate = "",
  existingXpEventCount = 0,
  homeworkCompletionId = "",
} = {}) {
  const deadline = evaluateHomeworkSubmissionDeadline({
    submissionDateKey,
    qualifyingEpochMs,
    phaDueDate,
    weekEndDate,
    weekStartDate,
  });
  const reviewEligible = Boolean(satisfactory && reviewComplete && hasCoachFeedback);
  const xpEligible = reviewEligible && Boolean(phaOwnershipEligible);
  const sourceKey = homeworkXpSourceKey(homeworkCompletionId);

  let noXpReason = "";
  if (!satisfactory) noXpReason = "needs_revision_or_unsatisfactory";
  else if (!reviewComplete || !hasCoachFeedback) noXpReason = "review_incomplete";
  else if (!phaOwnershipEligible) noXpReason = "pha_ineligible";

  return {
    xpEligible,
    reviewEligible,
    creditEligible: deadline.creditEligible,
    timingStatus: deadline.timingStatus,
    perfectWeekEligible: Boolean(deadline.perfectWeekEligible && satisfactory),
    dueDateKey: deadline.dueDateKey,
    sourceKey,
    duplicateXpForbidden: true,
    existingXpEventCount: Number(existingXpEventCount) || 0,
    xpAction:
      !xpEligible && existingXpEventCount > 0
        ? "deactivate_existing"
        : !xpEligible
          ? "skip_no_xp"
          : existingXpEventCount > 0
            ? "update_existing"
            : "create",
    noXpReason,
    deadlineReason: deadline.reason,
  };
}

/**
 * Perfect Week homework gate: satisfactory alone is not enough when late.
 * Early and on_time both qualify for the assigned Week's Perfect Week homework count.
 */
function countsTowardPerfectWeekHomework({
  satisfactory = false,
  submissionDateKey = "",
  qualifyingEpochMs = null,
  phaDueDate = "",
  weekEndDate = "",
  weekStartDate = "",
} = {}) {
  if (!satisfactory) return false;
  const deadline = evaluateHomeworkSubmissionDeadline({
    submissionDateKey,
    qualifyingEpochMs,
    phaDueDate,
    weekEndDate,
    weekStartDate,
  });
  return deadline.perfectWeekEligible === true;
}

module.exports = {
  resolveHomeworkAssignmentIdentity,
  resolveHomeworkAssignedWeekId,
  buildHomeworkCompletionIdentityKeyByPha,
  findHomeworkCompletionByAssignmentIdentity,
  resolveAssignmentDueDateKey,
  resolveQualifyingSubmissionTimestamp,
  evaluateHomeworkSubmissionDeadline,
  buildLateSubmissionNote,
  buildTimingSubmissionNote,
  isPerfectWeekEvaluationTimeReached,
  homeworkXpSourceKey,
  evaluateHomeworkXpAwardDecision,
  countsTowardPerfectWeekHomework,
  toDateKeyFromText,
  toEpochMs,
  denverEndOfDayMs,
  denverStartOfDayMs,
  denverCalendarDateKey,
  DENVER_TZ,
};
