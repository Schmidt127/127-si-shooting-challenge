/**
 * Pure V2 engine contract helpers for repository-level tests.
 *
 * These mirror production automation Source Key / date / gate / streak patterns
 * without importing Airtable Scripting APIs or contacting live bases.
 *
 * Canonical production sources (do not drift silently):
 * - 005 / 034 / 066 — toDateKeyFromText / toDateKeyFromDateObject (America/Denver)
 * - 007 — normalizeDuplicateKey
 * - 010 — SUBMISSION_XP|{submissionId}
 * - 020 — homework completion recheck-before-create semantics
 * - 042 — evaluateGate / determineAllowedLevelWithGateBlocking
 * - 053 — buildStreakBlocks
 * - 054 — STREAK_XP|{enrollmentId}|{achievementId}|{streakEndDate}
 * - 057 — buildRequiredWeekDates (Perfect Week daily window)
 * - 058 — PERFECT_WEEK|{enrollmentId}|{weekId}
 * - 065 — HOMEWORK_XP|{homeworkCompletionId}
 * - 066 — SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}
 * - 101 — ZOOM_ATTEND_BASE|{meetingId}|{enrollmentId} (+ bonuses)
 * - 114 — VIDEO_SUBMISSION|{videoFeedbackId}
 *
 * Zoom recording credit (C-025) is NOT implemented in production scripts yet.
 */

"use strict";

const DEFAULT_TIME_ZONE = "America/Denver";

const SOURCE_KEY_PREFIXES = Object.freeze({
  submissionXp: "SUBMISSION_XP|",
  homeworkXp: "HOMEWORK_XP|",
  videoSubmission: "VIDEO_SUBMISSION|",
  streakXp: "STREAK_XP|",
  shotMilestone: "SHOT_MILESTONE|",
  perfectWeek: "PERFECT_WEEK|",
  zoomAttendBase: "ZOOM_ATTEND_BASE",
  zoomAttendBonus2: "ZOOM_ATTEND_BONUS_2",
  zoomAttendBonus3: "ZOOM_ATTEND_BONUS_3",
  // C-025 recording family (canonical S16). Do not use ZOOM_RECORDING_CREDIT.
  zoomRecording: "ZOOM_RECORDING",
  zoomLiveCanonical: "ZOOM_LIVE",
});

function isValidRecordId(recordId) {
  const value = String(recordId || "").trim();
  return value.length > 0 && value.startsWith("rec");
}

function assertValidRecordId(recordId, label = "recordId") {
  const value = String(recordId || "").trim();
  if (!isValidRecordId(value)) {
    throw new Error(`Invalid ${label}: expected non-empty Airtable record id starting with "rec".`);
  }
  return value;
}

function normalizeDuplicateKey(value) {
  return String(value || "").trim();
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

function toDateKeyFromDateObject(value, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function toSafeDateKey(rawValue, textValue, timeZone = DEFAULT_TIME_ZONE) {
  const fromText = toDateKeyFromText(textValue);
  if (fromText) return fromText;
  return toDateKeyFromDateObject(rawValue, timeZone);
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function buildRequiredWeekDates(startDateKey, requiredDailyCount = 5) {
  const dates = [];
  for (let i = 0; i < requiredDailyCount; i += 1) {
    dates.push(addDaysToDateKey(startDateKey, i));
  }
  return dates;
}

function daysBetween(previousDateKey, nextDateKey) {
  const previousDate = new Date(`${previousDateKey}T00:00:00.000Z`);
  const nextDate = new Date(`${nextDateKey}T00:00:00.000Z`);
  return Math.round((nextDate - previousDate) / 86400000);
}

function buildStreakBlocks(dateKeys) {
  const blocks = [];
  if (!dateKeys || dateKeys.length === 0) {
    return blocks;
  }

  let currentBlock = [dateKeys[0]];
  for (let i = 1; i < dateKeys.length; i += 1) {
    const previousDateKey = dateKeys[i - 1];
    const currentDateKey = dateKeys[i];
    if (daysBetween(previousDateKey, currentDateKey) === 1) {
      currentBlock.push(currentDateKey);
    } else {
      blocks.push(currentBlock);
      currentBlock = [currentDateKey];
    }
  }
  blocks.push(currentBlock);
  return blocks;
}

function unlockStreaksFromBlocks(blocks, thresholds) {
  const unlocks = [];
  for (const block of blocks || []) {
    const length = block.length;
    for (const threshold of thresholds || []) {
      if (length >= threshold) {
        unlocks.push({
          streakDays: threshold,
          streakStartDate: block[0],
          streakEndDate: block[threshold - 1],
        });
      }
    }
  }
  return unlocks;
}

function buildSubmissionXpSourceKey(submissionId) {
  return `${SOURCE_KEY_PREFIXES.submissionXp}${assertValidRecordId(submissionId, "submissionId")}`;
}

function buildHomeworkXpSourceKey(homeworkCompletionId) {
  return `${SOURCE_KEY_PREFIXES.homeworkXp}${assertValidRecordId(homeworkCompletionId, "homeworkCompletionId")}`;
}

function buildVideoXpSourceKey(videoFeedbackId) {
  return `${SOURCE_KEY_PREFIXES.videoSubmission}${assertValidRecordId(videoFeedbackId, "videoFeedbackId")}`;
}

function buildStreakXpSourceKey(enrollmentId, achievementId, streakEndDateKey) {
  const endDate = String(streakEndDateKey || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error(`Invalid streakEndDateKey: ${streakEndDateKey}`);
  }
  return [
    SOURCE_KEY_PREFIXES.streakXp.slice(0, -1),
    assertValidRecordId(enrollmentId, "enrollmentId"),
    assertValidRecordId(achievementId, "achievementId"),
    endDate,
  ].join("|");
}

function buildShotMilestoneSourceKey(enrollmentId, shotMilestoneId) {
  return [
    SOURCE_KEY_PREFIXES.shotMilestone.slice(0, -1),
    assertValidRecordId(enrollmentId, "enrollmentId"),
    assertValidRecordId(shotMilestoneId, "shotMilestoneId"),
  ].join("|");
}

function buildPerfectWeekSourceKey(enrollmentId, weekId) {
  return [
    SOURCE_KEY_PREFIXES.perfectWeek.slice(0, -1),
    assertValidRecordId(enrollmentId, "enrollmentId"),
    assertValidRecordId(weekId, "weekId"),
  ].join("|");
}

function buildZoomAttendBaseSourceKey(zoomMeetingId, enrollmentId) {
  return `${SOURCE_KEY_PREFIXES.zoomAttendBase}|${assertValidRecordId(zoomMeetingId, "zoomMeetingId")}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomAttendBonus2SourceKey(enrollmentId) {
  return `${SOURCE_KEY_PREFIXES.zoomAttendBonus2}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomAttendBonus3SourceKey(enrollmentId) {
  return `${SOURCE_KEY_PREFIXES.zoomAttendBonus3}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

/**
 * C-025 recording Source Key (S16): ZOOM_RECORDING|{meetingId}|{enrollmentId}
 */
function buildZoomRecordingCreditSourceKey(zoomMeetingId, enrollmentId) {
  return `${SOURCE_KEY_PREFIXES.zoomRecording}|${assertValidRecordId(zoomMeetingId, "zoomMeetingId")}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomLiveCanonicalSourceKey(zoomMeetingId, enrollmentId) {
  return `${SOURCE_KEY_PREFIXES.zoomLiveCanonical}|${assertValidRecordId(zoomMeetingId, "zoomMeetingId")}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function extractVideoFeedbackIdFromSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  const prefix = SOURCE_KEY_PREFIXES.videoSubmission;
  if (!raw.startsWith(prefix)) return "";
  const id = raw.slice(prefix.length).trim();
  return isValidRecordId(id) ? id : "";
}

/**
 * Idempotent XP create/repair decision used across 010/054/065/114-style reruns.
 * existingKeys: Set or array of Source Key strings already present.
 */
function decideXpEventAction({ sourceKey, existingKeys = [], linkedXpEventId = "", linkedSourceKey = "" }) {
  const key = String(sourceKey || "").trim();
  if (!key) {
    return { action: "error", reason: "missing_source_key" };
  }

  const existing = existingKeys instanceof Set ? existingKeys : new Set(existingKeys);
  if (existing.has(key)) {
    return { action: "skip_existing", reason: "source_key_already_exists" };
  }

  if (linkedXpEventId) {
    if (linkedSourceKey && linkedSourceKey !== key) {
      return { action: "error", reason: "linked_xp_belongs_to_other_source" };
    }
    return { action: "repair_link", reason: "linked_xp_missing_or_mismatched_key_safe_to_repair" };
  }

  return { action: "create", reason: "no_existing_source_key" };
}

/**
 * Homework completion create-or-link decision (020-style).
 * existingCompletionIdsForAsset: completions already linked to this asset/assignment+enrollment.
 */
function decideHomeworkCompletionAction({
  existingCompletionIdsForAsset = [],
  enrollmentId,
  homeworkAssignmentId,
}) {
  if (!isValidRecordId(enrollmentId) || !isValidRecordId(homeworkAssignmentId)) {
    return { action: "error", reason: "malformed_enrollment_or_assignment" };
  }

  const existing = [...new Set((existingCompletionIdsForAsset || []).filter(Boolean))];
  if (existing.length === 1) {
    return { action: "link_existing", reason: "duplicate_resolved", completionId: existing[0] };
  }
  if (existing.length > 1) {
    return { action: "error", reason: "ambiguous_duplicate_completions", completionIds: existing };
  }
  return { action: "create", reason: "no_existing_completion" };
}

/**
 * Submission duplicate checker decision (007-style).
 * matchingRecordIds excludes the current submission when possible.
 */
function decideSubmissionDuplicateStatus({
  duplicateKey,
  matchingRecordIds = [],
  currentRecordId = "",
}) {
  const key = normalizeDuplicateKey(duplicateKey);
  if (!key) {
    return { action: "skip", status: "", reason: "blank_duplicate_key" };
  }

  const matches = (matchingRecordIds || []).filter((id) => id && id !== currentRecordId);
  if (matches.length === 0) {
    return { action: "count_it", status: "Count It", reason: "unique_key", matchCount: 0 };
  }
  return {
    action: "needs_review",
    status: "Needs Review",
    reason: "duplicate_key_collision",
    matchCount: matches.length,
    matchingRecordIds: matches,
  };
}

/**
 * Shot milestone crossing: milestones whose threshold is newly crossed by lifetime shots.
 * unlockedSourceKeys: already awarded Milestone Source Keys.
 */
function detectShotMilestoneCrossings({
  enrollmentId,
  previousShotTotal,
  currentShotTotal,
  milestones = [],
  unlockedSourceKeys = [],
}) {
  const prev = Number(previousShotTotal) || 0;
  const curr = Number(currentShotTotal) || 0;
  const unlocked = unlockedSourceKeys instanceof Set
    ? unlockedSourceKeys
    : new Set(unlockedSourceKeys);

  const crossings = [];
  for (const milestone of milestones) {
    const threshold = Number(milestone.threshold) || 0;
    if (!(prev < threshold && curr >= threshold)) continue;
    const sourceKey = buildShotMilestoneSourceKey(enrollmentId, milestone.id);
    if (unlocked.has(sourceKey)) continue;
    crossings.push({
      milestoneId: milestone.id,
      threshold,
      sourceKey,
    });
  }
  return crossings;
}

/**
 * Perfect Week eligibility (057-style, pure).
 * requiredDailyCount defaults to 5 (Mon–Fri style window from week start).
 */
function evaluatePerfectWeekEligibility({
  weekStartDateKey,
  countedSubmissionDateKeys = [],
  homeworkSatisfactoryCount = 0,
  homeworkRequired = 1,
  videoCount = 0,
  videoRequired = 0,
  zoomAttendanceCount = 0,
  zoomRequired = 0,
  requiredDailyCount = 5,
}) {
  const requiredDates = buildRequiredWeekDates(weekStartDateKey, requiredDailyCount);
  const counted = new Set((countedSubmissionDateKeys || []).map((d) => String(d).trim()).filter(Boolean));
  const missingDays = requiredDates.filter((d) => !counted.has(d));
  const dailyMet = missingDays.length === 0;
  const homeworkMet = Number(homeworkSatisfactoryCount) >= Number(homeworkRequired);
  const videoMet = Number(videoCount) >= Number(videoRequired);
  const zoomMet = Number(zoomAttendanceCount) >= Number(zoomRequired);
  const eligible = dailyMet && homeworkMet && videoMet && zoomMet;

  return {
    eligible,
    dailyMet,
    homeworkMet,
    videoMet,
    zoomMet,
    requiredDates,
    missingDays,
  };
}

/**
 * Weekly summary previous-week helper ordering (034-style): weeks sorted by start date ascending.
 */
function orderWeeksByStartDate(weeks = []) {
  return [...weeks].sort((a, b) => {
    const aKey = toDateKeyFromText(a.startDateKey || a.startDate || "") || String(a.startDateKey || "");
    const bKey = toDateKeyFromText(b.startDateKey || b.startDate || "") || String(b.startDateKey || "");
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });
}

function findPreviousWeek(weeks, currentWeekId) {
  const ordered = orderWeeksByStartDate(weeks);
  const index = ordered.findIndex((w) => w.id === currentWeekId);
  if (index <= 0) return null;
  return ordered[index - 1];
}

function evaluateGate(gateRule, stats) {
  if (!gateRule) {
    return {
      passes: true,
      enabled: false,
      reason: "No gate rule found for this level.",
    };
  }

  if (!gateRule.gateEnabled) {
    return {
      passes: true,
      enabled: false,
      reason: `${gateRule.name || "Gate"} is disabled.`,
    };
  }

  const failures = [];
  const s = stats || {};

  if ((s.totalSubmissions || 0) < (gateRule.minimumSubmissions || 0)) {
    failures.push(`Submissions ${s.totalSubmissions || 0}/${gateRule.minimumSubmissions || 0}`);
  }
  if ((s.totalHomeworkCompletions || 0) < (gateRule.minimumHomework || 0)) {
    failures.push(`Homework ${s.totalHomeworkCompletions || 0}/${gateRule.minimumHomework || 0}`);
  }
  if ((s.totalVideoSubmissions || 0) < (gateRule.minimumVideos || 0)) {
    failures.push(`Videos ${s.totalVideoSubmissions || 0}/${gateRule.minimumVideos || 0}`);
  }
  if ((s.totalZoomAttendances || 0) < (gateRule.minimumZoomMeetings || 0)) {
    failures.push(`Zoom ${s.totalZoomAttendances || 0}/${gateRule.minimumZoomMeetings || 0}`);
  }
  if ((s.longestStreakDays || 0) < (gateRule.minimumStreakDays || 0)) {
    failures.push(`Streak ${s.longestStreakDays || 0}/${gateRule.minimumStreakDays || 0}`);
  }

  if (failures.length > 0) {
    return {
      passes: false,
      enabled: true,
      reason: failures.join("; "),
      failures,
    };
  }

  return {
    passes: true,
    enabled: true,
    reason: "All gate requirements met.",
  };
}

function determineAllowedLevelWithGateBlocking(levels, gateRuleMap, lifetimeXp, stats) {
  if (!levels || levels.length === 0) {
    return {
      currentLevel: null,
      nextLevel: null,
      levelGateRule: null,
      status: "Error",
      gateBlocked: false,
      gateReason: "No active levels.",
    };
  }

  let allowedLevel = levels[0];
  let blockedLevel = null;
  let blockedGateRule = null;
  let blockedGateResult = null;
  const map = gateRuleMap instanceof Map ? gateRuleMap : new Map(Object.entries(gateRuleMap || {}));

  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i];
    if (lifetimeXp < level.xpRequired) {
      break;
    }

    const gateRule = map.get(level.id) || null;
    const gateResult = evaluateGate(gateRule, stats);

    if (!gateResult.passes) {
      blockedLevel = level;
      blockedGateRule = gateRule;
      blockedGateResult = gateResult;
      break;
    }

    allowedLevel = level;
  }

  if (blockedLevel) {
    return {
      currentLevel: allowedLevel,
      nextLevel: blockedLevel,
      levelGateRule: blockedGateRule,
      status: "Gate Blocked",
      gateBlocked: true,
      gateReason: blockedGateResult.reason,
    };
  }

  const allowedIndex = levels.findIndex((level) => level.id === allowedLevel.id);
  const nextLevel = levels[allowedIndex + 1] || null;
  const nextGateRule = nextLevel ? map.get(nextLevel.id) || null : null;

  return {
    currentLevel: allowedLevel,
    nextLevel,
    levelGateRule: nextGateRule,
    status: "Assigned",
    gateBlocked: false,
    gateReason: "",
  };
}

/**
 * Asset upload validation helpers (complement 070b/070c lib).
 * SHA-256 hex fingerprint length check used by writeback verification.
 */
function isValidSha256Hex(value) {
  return /^[a-fA-F0-9]{64}$/.test(String(value || "").trim());
}

function evaluateAssetUploadFields(fields = {}) {
  const failures = [];
  const status = String(fields.uploadStatus || fields["Upload Status"] || "").trim();
  const url = String(fields.canonicalFileUrl || fields["Canonical File URL"] || "").trim();
  const storageKey = String(fields.storageKey || fields["Storage Key"] || "").trim();
  const hash = String(fields.fileContentHash || fields["File Content Hash"] || "").trim();
  const algorithm = String(fields.fileHashAlgorithm || fields["File Hash Algorithm"] || "").trim();

  if (status !== "Uploaded") failures.push("upload_status_not_uploaded");
  if (!url.startsWith("https://")) failures.push("canonical_url_missing_or_insecure");
  if (!storageKey) failures.push("storage_key_missing");
  if (!isValidSha256Hex(hash)) failures.push("file_hash_invalid");
  if (algorithm && algorithm.toUpperCase() !== "SHA-256") failures.push("hash_algorithm_not_sha256");

  return {
    ok: failures.length === 0,
    failures,
  };
}

module.exports = {
  DEFAULT_TIME_ZONE,
  SOURCE_KEY_PREFIXES,
  isValidRecordId,
  assertValidRecordId,
  normalizeDuplicateKey,
  toDateKeyFromText,
  toDateKeyFromDateObject,
  toSafeDateKey,
  addDaysToDateKey,
  buildRequiredWeekDates,
  daysBetween,
  buildStreakBlocks,
  unlockStreaksFromBlocks,
  buildSubmissionXpSourceKey,
  buildHomeworkXpSourceKey,
  buildVideoXpSourceKey,
  buildStreakXpSourceKey,
  buildShotMilestoneSourceKey,
  buildPerfectWeekSourceKey,
  buildZoomAttendBaseSourceKey,
  buildZoomAttendBonus2SourceKey,
  buildZoomAttendBonus3SourceKey,
  buildZoomRecordingCreditSourceKey,
  buildZoomLiveCanonicalSourceKey,
  extractVideoFeedbackIdFromSourceKey,
  decideXpEventAction,
  decideHomeworkCompletionAction,
  decideSubmissionDuplicateStatus,
  detectShotMilestoneCrossings,
  evaluatePerfectWeekEligibility,
  orderWeeksByStartDate,
  findPreviousWeek,
  evaluateGate,
  determineAllowedLevelWithGateBlocking,
  isValidSha256Hex,
  evaluateAssetUploadFields,
};
