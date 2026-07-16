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
 * - 117a — ZOOM_RECORDING|{meetingId}|{enrollmentId} (repo-ready; live DEV install open)
 * - 009 — Asset Slot HW1 / HW2 / VIDEO mapping + source-attachment dedupe
 * - 020 — infer HW1/HW2 from Asset Slot / Purpose / Label
 * - 067 — HW17 quiz Enrollment+Week+Homework dedupe; assets HW1-only
 *   (Purpose=Homework 1, Slot=HW1, Send to Make Trigger=false; Source Attachment ID)
 * - 072 / 074 / 118 / 119 — weekly email build/send + priorSaturdayKeyDenver
 *   eventId = WEEKLY_EMAIL|{enrollmentId}|{weekId}
 *
 * C-010 (authoritative PR #35):
 * - Progress scripts 010/031/053/065 → Progress Processing Enabled? only
 *   (missing field = enabled; false = skip)
 * - Comms script 072 → Active? + Schmidt hard exclude (not PPE)
 * - PPE rollout: create field → backfill true → then paste guards
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
  weeklyEmail: "WEEKLY_EMAIL|",
  zoomAttendBase: "ZOOM_ATTEND_BASE",
  zoomAttendBonus2: "ZOOM_ATTEND_BONUS_2",
  zoomAttendBonus3: "ZOOM_ATTEND_BONUS_3",
  // C-025 recording family (canonical S16). Do not use ZOOM_RECORDING_CREDIT.
  zoomRecording: "ZOOM_RECORDING",
  zoomLiveCanonical: "ZOOM_LIVE",
});

/** Schmidt sandbox enrollment — excluded from weekly email / 072 comms. */
const SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm";

/**
 * HW17 / 067 v2.0 asset defaults (PR #35).
 * Quiz row itself has no Asset Slot field; assets are created on parent Submission.
 */
const HW17_ASSET_DEFAULTS = Object.freeze({
  purpose: "Homework 1",
  slot: "HW1",
  sendToMakeTrigger: false,
  uploadStatus: "Pending Link",
  uploadDestination: "Homework Completions",
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

/** Make/072 weekly email eventId — WEEKLY_EMAIL|{enrollmentId}|{weekId} */
function buildWeeklyEmailEventId(enrollmentId, weekId) {
  return `${SOURCE_KEY_PREFIXES.weeklyEmail}${assertValidRecordId(enrollmentId, "enrollmentId")}|${assertValidRecordId(weekId, "weekId")}`;
}

/**
 * Most recently completed Week End (Saturday) date key in America/Denver.
 * Mirrors 118/119 priorSaturdayKeyDenver (PR #35):
 * Sun → prior Sat; Mon–Fri → prior Sat; Sat → previous Sat (−7).
 */
function priorSaturdayKeyDenver(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now instanceof Date ? now : new Date(now));
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(byType.year);
  const m = Number(byType.month);
  const d = Number(byType.day);
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[byType.weekday];
  if (!y || !m || !d || dow === undefined) {
    throw new Error(`Unable to resolve Denver calendar day for prior Saturday: ${byType.weekday}`);
  }
  const daysBack = dow === 6 ? 7 : dow + 1;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysBack);
  const yy = utcNoon.getUTCFullYear();
  const mm = String(utcNoon.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utcNoon.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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

/**
 * Booleanish checkbox semantics used across automations (066/117a pattern).
 * Missing / unknown values use fallback (default true for optional progress gates).
 */
function isBooleanishTrue(value, fallback = false) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (value === null || value === undefined || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (["true", "checked", "yes", "y"].includes(text)) return true;
  if (["false", "unchecked", "no", "n"].includes(text)) return false;
  return fallback;
}

/**
 * C-010 progress guard (010/031/053/065) — PPE only.
 * Missing field → enabled (migration-safe). Present + false → skip.
 * Does NOT check Active? (hidden athletes with PPE=true still earn XP).
 */
function evaluateProgressProcessingGuard({
  progressProcessingEnabled,
  progressFieldExists = false,
} = {}) {
  if (
    progressFieldExists &&
    !isBooleanishTrue(progressProcessingEnabled, true)
  ) {
    return {
      allow: false,
      statusOut: "skipped",
      actionOut: "skipped_progress_disabled",
      reason: "progress_processing_disabled",
    };
  }

  return {
    allow: true,
    statusOut: "success",
    actionOut: "continue",
    reason: "progress_processing_allowed",
  };
}

/**
 * C-010 / C-011 comms guard (072 / 118 / 119) — Active? + Schmidt exclude.
 * Missing Active? field → treat as active. Does NOT check PPE.
 */
function evaluateCommsProcessingGuard({
  enrollmentActive,
  activeFieldExists = true,
  enrollmentId = "",
  schmidtEnrollmentId = SCHMIDT_ENROLLMENT_ID,
} = {}) {
  if (
    enrollmentId &&
    schmidtEnrollmentId &&
    String(enrollmentId) === String(schmidtEnrollmentId)
  ) {
    return {
      allow: false,
      statusOut: "skipped",
      actionOut: "skipped_inactive",
      reason: "schmidt_excluded",
    };
  }

  if (activeFieldExists && !isBooleanishTrue(enrollmentActive, true)) {
    return {
      allow: false,
      statusOut: "skipped",
      actionOut: "skipped_inactive",
      reason: "enrollment_inactive",
    };
  }

  return {
    allow: true,
    statusOut: "success",
    actionOut: "continue",
    reason: "comms_processing_allowed",
  };
}

/**
 * Combined Active? + PPE guard for scripts that intentionally check both (e.g. 117a).
 * Prefer evaluateProgressProcessingGuard / evaluateCommsProcessingGuard for C-010.
 */
function evaluateEnrollmentProcessingGuard({
  enrollmentActive,
  progressProcessingEnabled,
  progressFieldExists = false,
  activeFieldExists = true,
} = {}) {
  if (activeFieldExists && !isBooleanishTrue(enrollmentActive, true)) {
    return {
      allow: false,
      statusOut: "skipped",
      actionOut: "skipped_inactive_enrollment",
      reason: "enrollment_inactive",
    };
  }

  const progress = evaluateProgressProcessingGuard({
    progressProcessingEnabled,
    progressFieldExists,
  });
  if (!progress.allow) return progress;

  return {
    allow: true,
    statusOut: "success",
    actionOut: "continue",
    reason: "enrollment_processing_allowed",
  };
}

/**
 * Live script coverage tracker (C-010 / PR #35).
 * - progressPpe: paste PPE guards after create→backfill true
 * - commsActive: 072 v3.8 repo-ready (Active? + Schmidt)
 * - bothActiveAndPpe: existing scripts that already check both
 */
const ENROLLMENT_ACTIVE_GUARD_COVERAGE = Object.freeze({
  guarded: Object.freeze(["023", "056", "066", "072", "101", "117a"]),
  gaps: Object.freeze(["010", "031", "053", "065", "076"]),
  progressPpe: Object.freeze(["010", "031", "053", "065"]),
  commsActive: Object.freeze(["072"]),
  bothActiveAndPpe: Object.freeze(["117a"]),
});

/**
 * 072 build gate (+ C-011 automatic mode).
 * Manual: requires Build Weekly Email Now? and blocks when already sent.
 * Automatic: skips resend when Weekly Email Sent? is checked; does not require Build Now.
 */
function evaluateWeeklySummaryBuildGate({
  buildNow = false,
  emailSent = false,
  autoMode = false,
} = {}) {
  if (isBooleanishTrue(emailSent, false)) {
    return {
      allow: false,
      action: "skip_already_sent",
      reason: "weekly_email_already_sent",
    };
  }

  if (!autoMode && !isBooleanishTrue(buildNow, false)) {
    return {
      allow: false,
      action: "skip_build_not_armed",
      reason: "build_weekly_email_now_unchecked",
    };
  }

  return {
    allow: true,
    action: autoMode ? "auto_build" : "manual_build",
    reason: "build_allowed",
  };
}

/**
 * 074 send gate — duplicate send blocked when Weekly Email Sent? is checked.
 * Does not itself mark Sent? (Make/writeback owns that).
 */
function evaluateWeeklySummarySendGate({
  emailReady = false,
  emailSent = false,
  sendToMake = false,
} = {}) {
  if (!isBooleanishTrue(emailReady, false)) {
    return {
      allow: false,
      action: "error_not_ready",
      reason: "weekly_email_ready_unchecked",
    };
  }

  if (isBooleanishTrue(emailSent, false)) {
    return {
      allow: false,
      action: "error_duplicate_send_blocked",
      reason: "weekly_email_already_sent",
    };
  }

  if (!isBooleanishTrue(sendToMake, false)) {
    return {
      allow: false,
      action: "error_send_not_armed",
      reason: "send_to_make_unchecked",
    };
  }

  return {
    allow: true,
    action: "send",
    reason: "send_allowed",
  };
}

/**
 * C-011 automatic weekly summary decision (build → send without manual checkboxes).
 * Always refuse resend when Sent? is checked. Comms gate = Active? + Schmidt (not PPE).
 */
function decideAutomaticWeeklySummaryAction({
  emailSent = false,
  emailReady = false,
  hasPackage = false,
  enrollmentActive = true,
  enrollmentId = "",
} = {}) {
  const guard = evaluateCommsProcessingGuard({ enrollmentActive, enrollmentId });
  if (!guard.allow) {
    return {
      action: "skip_inactive_enrollment",
      reason: guard.reason,
    };
  }

  if (isBooleanishTrue(emailSent, false)) {
    return {
      action: "skip_already_sent",
      reason: "weekly_email_already_sent",
    };
  }

  if (isBooleanishTrue(emailReady, false) && hasPackage) {
    return {
      action: "send_existing_package",
      reason: "package_ready_not_sent",
    };
  }

  return {
    action: "build_then_send",
    reason: "needs_package_build",
  };
}

/** 009 attachment → Asset Slot mapping table. */
const ASSET_SLOT_SOURCES = Object.freeze([
  Object.freeze({ purpose: "Homework 1", slot: "HW1", labelPrefix: "HW1", sourceKey: "hw1" }),
  Object.freeze({ purpose: "Homework 2", slot: "HW2", labelPrefix: "HW2", sourceKey: "hw2" }),
  Object.freeze({
    purpose: "Video For Feedback",
    slot: "VIDEO",
    labelPrefix: "VID",
    sourceKey: "video",
  }),
]);

/**
 * Map submission attachment lists to create/skip plans (009 semantics).
 * Duplicate source attachment IDs are skipped; missing IDs are skipped.
 */
function mapAttachmentsToAssetSlotPlans({
  hw1Files = [],
  hw2Files = [],
  videoFiles = [],
  existingSourceAttachmentIds = [],
} = {}) {
  const existing = new Set(
    (existingSourceAttachmentIds || []).map((id) => String(id || "").trim()).filter(Boolean),
  );
  const bySource = {
    hw1: hw1Files || [],
    hw2: hw2Files || [],
    video: videoFiles || [],
  };

  const creates = [];
  const skipped = [];
  const seenInBatch = new Set();

  for (const source of ASSET_SLOT_SOURCES) {
    const files = bySource[source.sourceKey] || [];
    files.forEach((file, index) => {
      // 009 uses Airtable attachment id only — never filename as Source Attachment Id.
      const sourceId = String((file && (file.id || file.sourceAttachmentId)) || "").trim();
      const fileName = String((file && (file.filename || file.name)) || "").trim();

      if (!sourceId) {
        skipped.push({
          reason: "missing_attachment_id",
          slot: source.slot,
          purpose: source.purpose,
          file: fileName,
        });
        return;
      }

      if (existing.has(sourceId) || seenInBatch.has(sourceId)) {
        skipped.push({
          reason: "asset_already_exists",
          slot: source.slot,
          purpose: source.purpose,
          file: fileName,
          sourceAttachmentId: sourceId,
        });
        return;
      }

      seenInBatch.add(sourceId);
      creates.push({
        slot: source.slot,
        purpose: source.purpose,
        label: `${source.labelPrefix}-${index + 1}`,
        sourceAttachmentId: sourceId,
        file: fileName,
        uploadStatus: "Pending Link",
        sendToMakeTrigger: false,
      });
    });
  }

  return { creates, skipped };
}

/** 020 inference: Asset Slot → Purpose → Label prefix. */
function inferHomeworkAssetSlot({
  assetSlot = "",
  assetPurpose = "",
  assetLabel = "",
} = {}) {
  const slot = String(assetSlot || "").trim();
  if (slot === "HW1" || slot === "HW2" || slot === "VIDEO") return slot;

  const purpose = String(assetPurpose || "").trim();
  if (purpose === "Homework 1") return "HW1";
  if (purpose === "Homework 2") return "HW2";
  if (purpose === "Video For Feedback") return "VIDEO";

  const label = String(assetLabel || "").trim();
  if (label.startsWith("HW1")) return "HW1";
  if (label.startsWith("HW2")) return "HW2";
  if (label.startsWith("VID")) return "VIDEO";

  return "";
}

/**
 * HW17 / 067 intake completion dedupe: Enrollment + Week + Homework.
 * Quiz row has no Asset Slot field; 067 v2.0 creates parent Submission + HW1 assets
 * from Quiz Result PDF (HW17_ASSET_DEFAULTS) when attachments exist.
 */
function decideHw17QuizIntakeAction({
  enrollmentId,
  weekId,
  homeworkId,
  existingCompletionIdsForKey = [],
  alreadyLinkedCompletionId = "",
  hasAttachment = false,
} = {}) {
  if (!isValidRecordId(enrollmentId) || !isValidRecordId(weekId) || !isValidRecordId(homeworkId)) {
    return {
      action: "needs_review",
      reason: "missing_enrollment_week_or_homework",
      hasAssetSlot: false,
      assetDefaults: HW17_ASSET_DEFAULTS,
    };
  }

  if (alreadyLinkedCompletionId) {
    return {
      action: "skipped_already_linked",
      reason: "quiz_already_linked",
      completionId: alreadyLinkedCompletionId,
      hasAssetSlot: Boolean(hasAttachment),
      assetDefaults: HW17_ASSET_DEFAULTS,
    };
  }

  const unique = [...new Set((existingCompletionIdsForKey || []).filter(Boolean))];
  if (unique.length > 1) {
    return {
      action: "error",
      reason: "ambiguous_hw17_duplicate_completions",
      completionIds: unique,
      hasAssetSlot: false,
      assetDefaults: HW17_ASSET_DEFAULTS,
    };
  }
  if (unique.length === 1) {
    return {
      action: "linked_existing",
      reason: "hw17_dedupe_key_match",
      completionId: unique[0],
      hasAssetSlot: false,
      // Pending Quiz Result PDF / asset create on parent Submission.
      c009Gap: !hasAttachment,
      assetDefaults: HW17_ASSET_DEFAULTS,
    };
  }

  return {
    action: "created_new",
    reason: "no_existing_hw17_completion",
    hasAssetSlot: Boolean(hasAttachment),
    c009Gap: !hasAttachment,
    assetDefaults: HW17_ASSET_DEFAULTS,
  };
}

module.exports = {
  DEFAULT_TIME_ZONE,
  SOURCE_KEY_PREFIXES,
  SCHMIDT_ENROLLMENT_ID,
  HW17_ASSET_DEFAULTS,
  ENROLLMENT_ACTIVE_GUARD_COVERAGE,
  ASSET_SLOT_SOURCES,
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
  buildWeeklyEmailEventId,
  priorSaturdayKeyDenver,
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
  isBooleanishTrue,
  evaluateProgressProcessingGuard,
  evaluateCommsProcessingGuard,
  evaluateEnrollmentProcessingGuard,
  evaluateWeeklySummaryBuildGate,
  evaluateWeeklySummarySendGate,
  decideAutomaticWeeklySummaryAction,
  mapAttachmentsToAssetSlotPlans,
  inferHomeworkAssetSlot,
  decideHw17QuizIntakeAction,
};
