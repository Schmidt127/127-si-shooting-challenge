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
 * - 117a — ZOOM_RECORDING|{meetingId}|{enrollmentId} (repo-ready; live Production install open)
 * - 009 — Asset Slot HW1 / HW2 / VIDEO mapping + source-attachment dedupe
 * - 020 — infer HW1/HW2 from Asset Slot / Purpose / Label; FUT-001 assignment identity + deadline
 * - 067 — HW17 quiz Enrollment+Week+Homework dedupe; assets HW1-only
 *   (Purpose=Homework 1, Slot=HW1, Send to Make Trigger=false; Source Attachment ID)
 * - 072 / 074 / 118 / 119 — weekly email build/send + priorSaturdayKeyDenver
 *   eventId = WEEKLY_EMAIL|{enrollmentId}|{weekId}
 * - 035 — WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}
 *   (reconstructed SC-049 / XP-D1; one XP Event per met 100/125/150 tier)
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
  weeklyThreshold: "WEEKLY_THRESHOLD|",
  zoomAttendBase: "ZOOM_ATTEND_BASE",
  zoomAttendBonus2: "ZOOM_ATTEND_BONUS_2",
  zoomAttendBonus3: "ZOOM_ATTEND_BONUS_3",
  // C-025 recording family (canonical S16). Do not use ZOOM_RECORDING_CREDIT.
  zoomRecording: "ZOOM_RECORDING",
  zoomLiveCanonical: "ZOOM_LIVE",
});

/** Weekly Threshold XP tiers (percent of weekly shot goal). */
const WEEKLY_THRESHOLD_PERCENTS = Object.freeze([100, 125, 150]);

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

  // Airtable date-only values are stored as midnight UTC for the entered calendar
  // day. Do not shift that into the previous America/Denver day.
  if (
    dateValue.getUTCHours() === 0 &&
    dateValue.getUTCMinutes() === 0 &&
    dateValue.getUTCSeconds() === 0 &&
    dateValue.getUTCMilliseconds() === 0
  ) {
    const year = dateValue.getUTCFullYear();
    const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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

/**
 * Weekly Threshold Source Key (SC-049 rebuild):
 * WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}
 * One event per enrollment × week × met percent tier (100 / 125 / 150).
 */
function buildWeeklyThresholdSourceKey(enrollmentId, weekId, percent) {
  const tier = Number(percent);
  if (!WEEKLY_THRESHOLD_PERCENTS.includes(tier)) {
    throw new Error(`Invalid weekly threshold percent: ${percent}`);
  }
  return [
    SOURCE_KEY_PREFIXES.weeklyThreshold.slice(0, -1),
    assertValidRecordId(enrollmentId, "enrollmentId"),
    assertValidRecordId(weekId, "weekId"),
    String(tier),
  ].join("|");
}

/**
 * Map Grade Band display labels to XP Reward Rule suffix codes used by
 * WEEKLY_THRESHOLD_{100|125|150}_{K2|34|56|78|912}.
 */
function normalizeThresholdGradeBandCode(label) {
  const original = String(label || "").trim();
  if (!original) return "";
  const compact = original.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.includes("K2") || original.includes("K-2")) return "K2";
  if (compact.includes("34") || original.includes("3-4")) return "34";
  if (compact.includes("56") || original.includes("5-6")) return "56";
  if (compact.includes("78") || original.includes("7-8")) return "78";
  if (compact.includes("912") || original.includes("9-12")) return "912";
  return "";
}

function buildWeeklyThresholdRuleKey(percent, bandCode) {
  const tier = Number(percent);
  const code = String(bandCode || "").trim();
  if (!WEEKLY_THRESHOLD_PERCENTS.includes(tier)) {
    throw new Error(`Invalid weekly threshold percent: ${percent}`);
  }
  if (!code) {
    throw new Error("Missing grade band code for weekly threshold rule key");
  }
  return `WEEKLY_THRESHOLD_${tier}_${code}`;
}

/**
 * Airtable percent fields return ratios: 1 = 100%, 1.25 = 125%, 83.7 = 8370%.
 * Compare the raw numeric ratio directly against percent/100.
 * Do not treat values > 3 as whole percents (v1.1 heuristic incorrectly skipped 83.7).
 */
function goalCompletionMeetsThreshold(goalCompletionValue, percent) {
  const tier = Number(percent);
  if (!WEEKLY_THRESHOLD_PERCENTS.includes(tier)) return false;
  const raw = Number(goalCompletionValue);
  if (!Number.isFinite(raw)) return false;
  return raw + 1e-9 >= tier / 100;
}

function weeklyThresholdXpSourceLabel(percent) {
  return `Weekly Threshold ${Number(percent)}`;
}

/**
 * Historical Weekly Threshold Source Key shapes are unknown in-repo after the
 * empty-base reset (no surviving writer + no orphan Source Key samples).
 * Semantic dedupe (Enrollment + Week + XP Source label) is the compatibility
 * bridge until PROD inspection confirms whether older keys exist.
 */
function listWeeklyThresholdLegacyKeyRiskNotes() {
  return [
    "No historical WEEKLY_THRESHOLD Source Key samples found in repo dumps after foundation reset.",
    "Canonical rebuild key: WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}",
    "Semantic duplicate guard: Enrollment + Week + XP Source in {Weekly Threshold 100|125|150}",
    "Mike PROD inspection: filter XP Events where XP Bucket=Weekly Threshold OR XP Source contains 'Weekly Threshold'; compare Source Key shapes before mass requeue.",
  ];
}

/**
 * True when a tier is already awarded either by canonical Source Key or by
 * semantic Enrollment+Week+XP Source label (legacy-key compatibility).
 */
function weeklyThresholdTierAlreadyAwarded({
  sourceKey,
  xpSourceLabel,
  existingSourceKeys = [],
  existingXpSourceLabels = [],
} = {}) {
  const keys = existingSourceKeys instanceof Set
    ? existingSourceKeys
    : new Set(existingSourceKeys);
  const labels = existingXpSourceLabels instanceof Set
    ? existingXpSourceLabels
    : new Set(existingXpSourceLabels);
  if (sourceKey && keys.has(sourceKey)) return { awarded: true, via: "source_key" };
  if (xpSourceLabel && labels.has(xpSourceLabel)) {
    return { awarded: true, via: "xp_source_label" };
  }
  return { awarded: false, via: "" };
}

/**
 * Plan Weekly Threshold XP creates/skips for one Weekly Athlete Summary.
 * Does not invent amounts — xpAmount comes from active XP Reward Rules.
 */
function planWeeklyThresholdAwards({
  goalCompletionValue,
  enrollmentId,
  weekId,
  bandCode = "",
  existingSourceKeys = [],
  existingXpSourceLabels = [],
  rulesByKey = {},
  enrollmentActive = true,
} = {}) {
  if (enrollmentActive === false) {
    return {
      anyMet: false,
      plans: [],
      toCreate: [],
      errors: [],
      createCount: 0,
      skipExistingCount: 0,
      notMetCount: 0,
      action: "skipped_inactive_enrollment",
    };
  }

  const plans = [];

  for (const percent of WEEKLY_THRESHOLD_PERCENTS) {
    const xpSourceLabel = weeklyThresholdXpSourceLabel(percent);
    const met = goalCompletionMeetsThreshold(goalCompletionValue, percent);
    if (!met) {
      plans.push({
        percent,
        met: false,
        action: "skip_not_met",
        sourceKey: "",
        ruleKey: "",
        xpAmount: 0,
        xpSourceLabel,
      });
      continue;
    }

    const sourceKey = buildWeeklyThresholdSourceKey(enrollmentId, weekId, percent);
    const ruleKey = bandCode ? buildWeeklyThresholdRuleKey(percent, bandCode) : "";
    const rule = ruleKey ? rulesByKey[ruleKey] : null;
    const xpAmount = rule && Number.isFinite(Number(rule.xpAmount))
      ? Number(rule.xpAmount)
      : null;

    const already = weeklyThresholdTierAlreadyAwarded({
      sourceKey,
      xpSourceLabel,
      existingSourceKeys,
      existingXpSourceLabels,
    });
    if (already.awarded) {
      plans.push({
        percent,
        met: true,
        action: "skip_existing",
        skipVia: already.via,
        sourceKey,
        ruleKey,
        xpAmount: xpAmount == null ? 0 : xpAmount,
        xpSourceLabel,
      });
      continue;
    }

    if (!ruleKey || xpAmount == null || xpAmount <= 0) {
      plans.push({
        percent,
        met: true,
        action: "error_missing_rule",
        sourceKey,
        ruleKey,
        xpAmount: 0,
        xpSourceLabel,
      });
      continue;
    }

    plans.push({
      percent,
      met: true,
      action: "create",
      sourceKey,
      ruleKey,
      xpAmount,
      xpSourceLabel,
    });
  }

  const toCreate = plans.filter((p) => p.action === "create");
  const errors = plans.filter((p) => p.action === "error_missing_rule");
  const anyMet = plans.some((p) => p.met);

  return {
    anyMet,
    plans,
    toCreate,
    errors,
    createCount: toCreate.length,
    skipExistingCount: plans.filter((p) => p.action === "skip_existing").length,
    notMetCount: plans.filter((p) => p.action === "skip_not_met").length,
    action: "planned",
  };
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

/**
 * Build a level-id → gate-rule map from active gate rule rows (042-style).
 * Throws when two active rules point at the same Level, mirroring the 042
 * duplicate-active-rule guard so offline fixtures fail the same way PROD does.
 */
function buildGateRuleMap(gateRules = []) {
  const map = new Map();
  for (const rule of gateRules) {
    if (!rule || !rule.levelId) {
      throw new Error(`Gate rule ${rule && rule.name ? rule.name : "(unnamed)"} has no Level link.`);
    }
    if (map.has(rule.levelId)) {
      const existing = map.get(rule.levelId);
      throw new Error(
        `Duplicate active gate rules for level ${rule.levelId}: "${existing.name}" and "${rule.name}".`
      );
    }
    map.set(rule.levelId, rule);
  }
  return map;
}

/**
 * Select active 042 gate rules for one enrollment school year.
 * Exact year wins; blank/Shared/Default/All Years is the only fallback.
 * Prior-year-only rules and duplicate applicable rules fail closed.
 */
function selectYearAwareGateRules(gateRules = [], enrollmentSchoolYear = "") {
  const normalizeYear = (value) => {
    const normalized = String(value || "").trim().replace(/[–—−]/g, "-");
    if (!normalized) return "";
    const match = normalized.match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      throw new Error(`Malformed school year / rule set: "${value}".`);
    }
    return `${match[1]}-${match[2]}`;
  };
  const targetYear = normalizeYear(enrollmentSchoolYear);
  if (!targetYear) throw new Error("Enrollment School Year is required.");
  const isShared = (value) =>
    ["", "shared", "default", "all years"].includes(String(value || "").trim().toLowerCase());
  const byLevel = new Map();

  for (const rule of gateRules || []) {
    if (!rule || rule.active === false) continue;
    if (!rule.levelId) throw new Error(`Gate rule ${rule.name || "(unnamed)"} has no Level link.`);
    const year = String(rule.schoolYear || "").trim();
    if (year && !isShared(year)) normalizeYear(year);
    if (!byLevel.has(rule.levelId)) byLevel.set(rule.levelId, []);
    byLevel.get(rule.levelId).push(rule);
  }

  const selected = new Map();
  for (const [levelId, candidates] of byLevel.entries()) {
    const exact = candidates.filter(
      (rule) => !isShared(rule.schoolYear) && normalizeYear(rule.schoolYear) === targetYear
    );
    const shared = candidates.filter((rule) => isShared(rule.schoolYear));
    const applicable = exact.length > 0 ? exact : shared;
    if (applicable.length > 1) {
      throw new Error(`Multiple active gate rules for level ${levelId} and school year ${targetYear}.`);
    }
    if (applicable.length === 0) {
      throw new Error(`No active gate rule for level ${levelId} and school year ${targetYear}.`);
    }
    selected.set(levelId, applicable[0]);
  }
  return selected;
}

/**
 * PKG-036 configuration contract. The live 042 script performs the same
 * fail-closed checks against Airtable records; this pure form is used by the
 * executable offline harness.
 */
function validateProgressionLevels(levels = []) {
  const active = (levels || [])
    .filter((level) => level && level.active !== false)
    .map((level) => ({
      ...level,
      name: String(level.name || "").trim(),
      xpRequired: Number(level.xpRequired),
    }))
    .sort((a, b) => a.xpRequired - b.xpRequired);

  if (active.length === 0) {
    throw new Error("No active Levels found.");
  }

  const thresholds = new Map();
  for (const level of active) {
    if (!level.name) throw new Error(`Active Level ${level.id || "(unknown)"} is missing Level Name.`);
    if (!Number.isFinite(level.xpRequired) || level.xpRequired < 0) {
      throw new Error(`Invalid active level threshold for "${level.name}".`);
    }
    if (thresholds.has(level.xpRequired)) {
      throw new Error(`Duplicate active level threshold found: ${level.xpRequired}.`);
    }
    thresholds.set(level.xpRequired, level.id);
  }

  if (active.filter((level) => level.xpRequired === 0).length !== 1) {
    throw new Error("Expected exactly one active initial Level at 0 XP.");
  }

  return active;
}

function selectCompleteProgressionGateRules({
  levels = [],
  gateRules = [],
  schoolYear = "",
} = {}) {
  const activeLevels = validateProgressionLevels(levels);
  const numericGateFields = [
    "minimumSubmissions",
    "minimumHomework",
    "minimumVideos",
    "minimumZoomMeetings",
    "minimumStreakDays",
  ];
  const activeLevelIds = new Set(activeLevels.map((level) => level.id));
  for (const rule of gateRules || []) {
    if (!rule || rule.active === false) continue;
    if (!activeLevelIds.has(rule.levelId)) {
      throw new Error(`Active gate rule ${rule.name || rule.id || "(unnamed)"} points to an inactive or unknown Level.`);
    }
    for (const field of numericGateFields) {
      const raw = rule[field];
      const isNumericPrimitive =
        (typeof raw === "number" && Number.isFinite(raw)) ||
        (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw)));
      const value = Number(raw);
      if (!isNumericPrimitive || value < 0) {
        throw new Error(`Invalid numeric configuration "${rule.name || rule.id || "(unnamed)"}.${field}".`);
      }
    }
  }
  const selected = selectYearAwareGateRules(gateRules, schoolYear);
  for (const level of activeLevels) {
    if (!selected.has(level.id)) {
      throw new Error(`No active gate rule for level ${level.id} and school year ${schoolYear}.`);
    }
  }
  return selected;
}

function selectRelevantProgressionConfiguration({
  lifetimeXp = 0,
  currentLevelIds = [],
  nextLevelIds = [],
  schoolYear = "",
  levels = [],
  gateRules = [],
} = {}) {
  const relevantLevelIds = new Set([
    ...(currentLevelIds || []),
    ...(nextLevelIds || []),
  ]);
  const activeLevels = (levels || [])
    .filter((level) => level && level.active !== false)
    .map((level) => ({ ...level, xpRequired: Number(level.xpRequired) }))
    .filter((level) => Number.isFinite(level.xpRequired))
    .sort((a, b) => a.xpRequired - b.xpRequired);

  for (const level of activeLevels) {
    relevantLevelIds.add(level.id);
    if (level.xpRequired > Number(lifetimeXp || 0)) break;
  }

  return {
    levels: (levels || []).filter((level) => relevantLevelIds.has(level.id)),
    gateRules: (gateRules || []).filter((rule) => {
      const year = String(rule.schoolYear || "").trim().replace(/[–—−]/g, "-").toLowerCase();
      const targetYear = String(schoolYear || "").trim().replace(/[–—−]/g, "-").toLowerCase();
      const shared = ["", "shared", "default", "all years"].includes(year);
      return (
        (rule.levelId ? [rule.levelId] : rule.levelIds || []).some((id) =>
          relevantLevelIds.has(id)
        ) &&
        (shared || year === targetYear)
      );
    }),
  };
}

function progressionAssignmentFingerprint({
  enrollmentId,
  lifetimeXp,
  lifetimeXpManualAdjustments = 0,
  stats = {},
  active = true,
  schoolYear = "",
  programInstanceIds = [],
  levels = [],
  gateRules = [],
  outputs = {},
} = {}) {
  const relevant = selectRelevantProgressionConfiguration({
    lifetimeXp,
    schoolYear,
    currentLevelIds: outputs.currentLevelId ? [outputs.currentLevelId] : [],
    nextLevelIds: outputs.nextLevelId ? [outputs.nextLevelId] : [],
    levels,
    gateRules,
  });

  return JSON.stringify({
    version: 2,
    enrollmentId: String(enrollmentId || ""),
    enrollment: {
      lifetimeXp: Number(lifetimeXp) || 0,
          lifetimeXpManualAdjustments: Number(lifetimeXpManualAdjustments) || 0,
      stats: {
        totalSubmissions: Number(stats.totalSubmissions) || 0,
        totalHomeworkCompletions: Number(stats.totalHomeworkCompletions) || 0,
        totalVideoSubmissions: Number(stats.totalVideoSubmissions) || 0,
        totalZoomAttendances: Number(stats.totalZoomAttendances) || 0,
        longestStreakDays: Number(stats.longestStreakDays) || 0,
      },
      active: Boolean(active),
      schoolYear: String(schoolYear || "").trim(),
    },
    programInstanceIds: [...new Set(programInstanceIds)].sort(),
    levels: [...relevant.levels]
      .map((level) => ({
        id: level.id,
        name: String(level.name || "").trim(),
        xpRequired: Number(level.xpRequired),
        active: level.active !== false,
        sortOrder: Number(level.sortOrder) || 0,
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    gateRules: [...relevant.gateRules]
      .map((rule) => ({
        id: rule.id,
        levelId: rule.levelId,
        schoolYear: String(rule.schoolYear || "").trim(),
        active: rule.active !== false,
        gateEnabled: Boolean(rule.gateEnabled),
        minimumSubmissions: Number(rule.minimumSubmissions) || 0,
        minimumHomework: Number(rule.minimumHomework) || 0,
        minimumVideos: Number(rule.minimumVideos) || 0,
        minimumZoomMeetings: Number(rule.minimumZoomMeetings) || 0,
        minimumStreakDays: Number(rule.minimumStreakDays) || 0,
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    outputs: {
      currentLevelId: outputs.currentLevelId || "",
      nextLevelId: outputs.nextLevelId || "",
      levelGateRuleId: outputs.levelGateRuleId || "",
      levelStatus: outputs.levelStatus || "",
    },
  });
}

/**
 * Select exactly one active XP Reward Rule for the given allowed rule keys.
 * Mirrors 059's duplicate-active throw / 054's intended hardening:
 * - missing → { status: "missing", rule: null, matches: [] }
 * - one match → { status: "ok", rule, matches: [rule] }
 * - 2+ matches → { status: "duplicate", rule: null, matches }
 *
 * Amounts are never invented here — callers read rule.xpAmount from Airtable.
 */
function selectActiveXpRewardRule(rules = [], allowedRuleKeys = []) {
  const keys = (allowedRuleKeys || []).filter(Boolean);
  const matches = (rules || []).filter((rule) => {
    if (!rule || rule.active === false) return false;
    return keys.includes(rule.ruleKey);
  });
  if (matches.length === 0) {
    return { status: "missing", rule: null, matches: [] };
  }
  if (matches.length > 1) {
    return { status: "duplicate", rule: null, matches };
  }
  return { status: "ok", rule: matches[0], matches };
}

/**
 * Normalize Grade Band display labels for comparison (K-2, 3-4, …).
 * Prefer linked record IDs in production scripts; use this only as fallback.
 */
function normalizeGradeBandLabel(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  // Collapse whitespace and normalize common dash / en-dash / em-dash variants.
  text = text.replace(/\s+/g, " ");
  text = text.replace(/[–—−]/g, "-");
  // Strip a leading "Grades " / "Grade " prefix used by legacy inactive rows.
  text = text.replace(/^grades?\s+/i, "");
  return text;
}

/**
 * Grade Band match: prefer linked record IDs; fall back to normalized labels.
 * Used by 066-style milestone filtering (config-over-code, rename-safe when IDs present).
 */
function gradeBandsMatch({ enrollmentBandIds = [], milestoneBandIds = [], enrollmentLabel = "", milestoneLabel = "" }) {
  const enrIds = (enrollmentBandIds || []).filter(Boolean);
  const msIds = (milestoneBandIds || []).filter(Boolean);
  if (enrIds.length > 0 && msIds.length > 0) {
    return msIds.some((id) => enrIds.includes(id));
  }
  const a = normalizeGradeBandLabel(enrollmentLabel);
  const b = normalizeGradeBandLabel(milestoneLabel);
  return Boolean(a && b && a === b);
}

/**
 * Read-only integrity check for Athlete Achievement Unlock rows.
 * Detects blank keys, duplicate keys, unlock-without-XP, XP-without-unlock mismatch signals.
 */
function auditAchievementUnlockIntegrity(unlocks = []) {
  const findings = [];
  const byKey = new Map();

  for (const unlock of unlocks) {
    const id = unlock && unlock.id ? unlock.id : "(missing-id)";
    const key = String((unlock && unlock.unlockKey) || "").trim();
    const sourceKey = String((unlock && (unlock.milestoneSourceKey || unlock.sourceKey)) || "").trim();
    const enrollmentId = unlock && unlock.enrollmentId ? unlock.enrollmentId : "";
    const xpEventIds = (unlock && unlock.xpEventIds) || [];
    const awardStatus = String((unlock && unlock.awardStatus) || "").trim();

    if (!key && !sourceKey) {
      findings.push({ severity: "high", code: "blank_unlock_key", unlockId: id, detail: "No Unlock Key or Milestone Source Key." });
    }
    const dedupeKey = key || sourceKey;
    if (dedupeKey) {
      if (!byKey.has(dedupeKey)) byKey.set(dedupeKey, []);
      byKey.get(dedupeKey).push(id);
    }
    if (!enrollmentId) {
      findings.push({ severity: "high", code: "missing_enrollment", unlockId: id, detail: "Unlock has no Enrollment link." });
    }
    if (/awarded/i.test(awardStatus) && (!xpEventIds || xpEventIds.length === 0)) {
      findings.push({ severity: "medium", code: "unlock_without_xp", unlockId: id, detail: `Award Status="${awardStatus}" but no XP Event link.` });
    }
  }

  for (const [dedupeKey, ids] of byKey.entries()) {
    if (ids.length > 1) {
      findings.push({
        severity: "high",
        code: "duplicate_unlock_key",
        unlockId: ids.join(","),
        detail: `Duplicate unlock key "${dedupeKey}" on ${ids.length} records.`,
      });
    }
  }

  return {
    unlockCount: unlocks.length,
    findingCount: findings.length,
    findings,
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

/**
 * SC-041 — 074 Make webhook outcome → WAS field plan.
 * Make owns final Weekly Email Sent? / Sent At writeback.
 * Webhook failure must leave Send to Make? checked so the handoff stays retryable.
 */
function planWeeklyEmailWebhookOutcome({
  webhookOk = false,
  emailSent = false,
  errorMessage = "",
} = {}) {
  if (isBooleanishTrue(emailSent, false)) {
    return {
      action: "never_retry_already_completed",
      retryClass: "never_retry_already_completed",
      allowRetry: false,
      fields: {},
      reason: "weekly_email_already_sent",
    };
  }

  if (webhookOk) {
    return {
      action: "handoff_success",
      retryClass: "waiting_make_writeback",
      allowRetry: false,
      fields: {
        "Send to Make?": false,
        "Weekly Email Error": "",
        "Weekly Email Ready?": true,
      },
      mustNotWrite: [
        "Weekly Email Sent?",
        "Weekly Email Sent At",
        "Weekly Summary Sent At",
      ],
      reason: "clear_send_trigger_after_successful_handoff",
    };
  }

  return {
    action: "handoff_failed_retryable",
    retryClass: "automatically_retryable",
    allowRetry: true,
    fields: {
      "Weekly Email Error": String(errorMessage || "Make webhook failed"),
    },
    mustNotClear: ["Send to Make?"],
    mustNotWrite: [
      "Weekly Email Sent?",
      "Weekly Email Sent At",
      "Weekly Summary Sent At",
    ],
    reason: "keep_send_to_make_checked_for_retry",
  };
}

/**
 * SC-041 — operator retry decision after a failed or incomplete weekly email send.
 */
function decideWeeklyEmailRetryAction({
  emailSent = false,
  sendToMake = false,
  emailReady = false,
  hasErrorMessage = false,
  makeSendStatus = "",
} = {}) {
  if (isBooleanishTrue(emailSent, false)) {
    return {
      action: "do_not_retry",
      retryClass: "never_retry_already_completed",
      reason: "weekly_email_already_sent",
    };
  }

  const status = String(makeSendStatus || "").trim().toLowerCase();
  if (status === "sent") {
    return {
      action: "do_not_retry",
      retryClass: "manual_review_required",
      reason: "make_send_status_sent_but_sent_checkbox_false",
    };
  }

  if (isBooleanishTrue(sendToMake, false) && isBooleanishTrue(emailReady, false)) {
    return {
      action: "rerun_074",
      retryClass: "automatically_retryable",
      reason: hasErrorMessage
        ? "send_armed_with_prior_error_retry_074"
        : "send_armed_not_sent_run_074",
    };
  }

  if (isBooleanishTrue(emailReady, false) && !isBooleanishTrue(sendToMake, false)) {
    return {
      action: "rearm_send_to_make",
      retryClass: "retryable_after_correcting_data",
      reason: "package_ready_but_send_trigger_cleared",
    };
  }

  if (!isBooleanishTrue(emailReady, false)) {
    return {
      action: "rerun_072_then_074",
      retryClass: "retryable_after_correcting_data",
      reason: "package_not_ready",
    };
  }

  return {
    action: "manual_review_required",
    retryClass: "manual_review_required",
    reason: "ambiguous_weekly_email_state",
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

/**
 * Normalize Airtable linked-record / lookup cell values to record id strings.
 * Accepts single objects, arrays, bare ids, nested lookup arrays, and blanks.
 */
function normalizeLinkedRecordIds(rawValue) {
  if (rawValue == null || rawValue === "") return [];
  const queue = Array.isArray(rawValue) ? rawValue : [rawValue];
  const out = [];
  for (const item of queue) {
    if (item == null || item === "") continue;
    if (typeof item === "string") {
      const id = item.trim();
      if (id) out.push(id);
      continue;
    }
    if (Array.isArray(item)) {
      out.push(...normalizeLinkedRecordIds(item));
      continue;
    }
    if (typeof item === "object") {
      const id = item.id || item.recordId || "";
      if (id) out.push(String(id).trim());
    }
  }
  return [...new Set(out.filter(Boolean))];
}

/**
 * Detect duplicate active XP Reward Rule keys (035 throws on this).
 * @param {Array<{ ruleKey: string, active?: boolean, id?: string }>} rules
 */
function detectDuplicateActiveRewardRuleKeys(rules = []) {
  const seen = new Map();
  const duplicates = [];
  for (const rule of rules || []) {
    const active = rule.active !== false;
    if (!active) continue;
    const ruleKey = String(rule.ruleKey || "").trim();
    if (!ruleKey) continue;
    if (seen.has(ruleKey)) {
      duplicates.push({
        ruleKey,
        recordIds: [seen.get(ruleKey), rule.id].filter(Boolean),
      });
    } else {
      seen.set(ruleKey, rule.id || null);
    }
  }
  return {
    ok: duplicates.length === 0,
    duplicates,
    action: duplicates.length ? "error_duplicate_active_rules" : "ok",
  };
}

/**
 * Classify a Make/webhook HTTP-ish response for 074 outcome planning.
 * Does not mutate Airtable — pairs with planWeeklyEmailWebhookOutcome.
 */
function classifyWeeklyEmailWebhookResponse({
  httpStatus = null,
  timedOut = false,
  bodyText = "",
  parseError = false,
} = {}) {
  if (timedOut) {
    return {
      webhookOk: false,
      retryable: true,
      class: "timeout",
      errorMessage: "Make webhook timed out",
    };
  }
  if (parseError) {
    return {
      webhookOk: false,
      retryable: true,
      class: "malformed_response",
      errorMessage: "Make webhook returned a malformed response",
    };
  }
  // null/undefined/"" must not coerce via Number(null)===0 into a fake HTTP status.
  if (httpStatus === null || httpStatus === undefined || httpStatus === "") {
    return {
      webhookOk: false,
      retryable: true,
      class: "unknown_status",
      errorMessage: String(bodyText || "Make webhook failed with unknown status"),
    };
  }
  const status = Number(httpStatus);
  if (!Number.isFinite(status)) {
    return {
      webhookOk: false,
      retryable: true,
      class: "unknown_status",
      errorMessage: String(bodyText || "Make webhook failed with unknown status"),
    };
  }
  if (status >= 200 && status < 300) {
    return {
      webhookOk: true,
      retryable: false,
      class: "success",
      errorMessage: "",
    };
  }
  if (status === 408 || status === 429 || status >= 500) {
    return {
      webhookOk: false,
      retryable: true,
      class: "retryable_http",
      errorMessage: `Webhook failed with status ${status}`,
    };
  }
  return {
    webhookOk: false,
    retryable: status >= 400 && status < 500,
    class: status >= 400 && status < 500 ? "client_error" : "retryable_http",
    errorMessage: `Webhook failed with status ${status}`,
  };
}

/**
 * Decide homework multi-asset → single completion behavior (020/067).
 * Zero assets (Option B quiz) and N assets still map to one Homework Completion.
 */
function planHomeworkMultiAssetCompletion({
  existingCompletionIds = [],
  assetCount = 0,
  gradingStatus = "",
  alreadyProcessed = false,
  enrollmentId = "",
  homeworkAssignmentId = "",
} = {}) {
  if (enrollmentId || homeworkAssignmentId) {
    if (!isValidRecordId(enrollmentId) || !isValidRecordId(homeworkAssignmentId)) {
      return {
        action: "error",
        reason: "malformed_enrollment_or_assignment",
        assetCount: Math.max(0, Number(assetCount) || 0),
        xpAllowed: false,
      };
    }
  }

  const existing = [...new Set((existingCompletionIds || []).filter(Boolean))];
  let action = "create";
  let reason = "no_existing_completion";
  let completionId = null;
  if (existing.length === 1) {
    action = "link_existing";
    reason = alreadyProcessed ? "partial_processing_recovery" : "duplicate_resolved";
    completionId = existing[0];
  } else if (existing.length > 1) {
    return {
      action: "error",
      reason: "ambiguous_duplicate_completions",
      completionIds: existing,
      assetCount: Math.max(0, Number(assetCount) || 0),
      xpAllowed: false,
    };
  }

  const grade = String(gradingStatus || "").trim().toLowerCase();
  const satisfactory = grade === "satisfactory";
  const unsatisfactory = grade === "unsatisfactory";

  return {
    action,
    reason,
    completionId,
    assetCount: Math.max(0, Number(assetCount) || 0),
    allowsZeroAssets: true,
    oneCompletionManyAssets: true,
    xpAllowed: satisfactory,
    statusTransition: unsatisfactory
      ? "unsatisfactory_no_xp"
      : satisfactory
        ? "satisfactory_ready_for_xp"
        : "ready_for_review",
  };
}

/**
 * FUT-001 — resolve selected PHA from Homework Name 1/2 regardless of upload slot when unambiguous.
 */
function resolveHomeworkAssignmentIdentity({ hw1PhaId = "", hw2PhaId = "", assetUploadSlot = "" } = {}) {
  const hw1 = isValidRecordId(hw1PhaId) ? String(hw1PhaId).trim() : "";
  const hw2 = isValidRecordId(hw2PhaId) ? String(hw2PhaId).trim() : "";
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
      method: unique[0] === hw1 ? "homework_name_1" : "homework_name_2",
      alternateUploadSlot:
        slot === "HW1" || slot === "HW2"
          ? (unique[0] === hw1 ? slot === "HW2" : slot === "HW1")
          : false,
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

function buildHomeworkCompletionIdentityKeyByPha({ enrollmentId = "", phaId = "" } = {}) {
  const enrollment = assertValidRecordId(enrollmentId, "enrollmentId");
  const pha = assertValidRecordId(phaId, "phaId");
  return `HC|enrollment|${enrollment}|pha|${pha}`;
}

function resolveHomeworkAssignmentDueDateKey(phaDueDate, weekEndDate) {
  const fromPha = toDateKeyFromText(phaDueDate);
  if (fromPha) return fromPha;
  return toDateKeyFromText(weekEndDate) || "";
}

function evaluateHomeworkSubmissionDeadline({
  submissionDateKey = "",
  phaDueDate = "",
  weekEndDate = "",
} = {}) {
  const submitKey = toDateKeyFromText(submissionDateKey);
  const dueKey = resolveHomeworkAssignmentDueDateKey(phaDueDate, weekEndDate);

  if (!submitKey) {
    return {
      creditEligible: true,
      timingStatus: "unknown_submission_date",
      dueDateKey: dueKey,
      perfectWeekEligible: false,
      reason:
        "Submission date missing; deadline not enforced for XP. Perfect Week requires a known on-time Submission Date.",
    };
  }
  if (!dueKey) {
    return {
      creditEligible: true,
      timingStatus: "no_due_date",
      dueDateKey: "",
      perfectWeekEligible: true,
      reason: "No PHA Due Date or Week End Date; deadline not enforced.",
    };
  }
  if (submitKey > dueKey) {
    return {
      creditEligible: true,
      timingStatus: "late",
      dueDateKey: dueKey,
      perfectWeekEligible: false,
      reason: `Submission date ${submitKey} is after assignment due date ${dueKey}. Full XP credit allowed; does not count toward Perfect Week.`,
    };
  }
  return {
    creditEligible: true,
    timingStatus: "on_time",
    dueDateKey: dueKey,
    perfectWeekEligible: true,
    reason: "",
  };
}

function buildHomeworkLateSubmissionNote({ timingStatus = "", dueDateKey = "", submissionDateKey = "" } = {}) {
  if (timingStatus !== "late" && timingStatus !== "late_ineligible") return "";
  return `Late submission: activity date ${submissionDateKey} is after due date ${dueDateKey}. Full homework XP credit still applies once satisfactory; does not count toward Perfect Week for the original week.`;
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
  buildWeeklyThresholdSourceKey,
  buildWeeklyThresholdRuleKey,
  normalizeThresholdGradeBandCode,
  goalCompletionMeetsThreshold,
  weeklyThresholdXpSourceLabel,
  listWeeklyThresholdLegacyKeyRiskNotes,
  weeklyThresholdTierAlreadyAwarded,
  planWeeklyThresholdAwards,
  WEEKLY_THRESHOLD_PERCENTS,
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
  buildGateRuleMap,
  selectYearAwareGateRules,
  validateProgressionLevels,
  selectCompleteProgressionGateRules,
  selectRelevantProgressionConfiguration,
  progressionAssignmentFingerprint,
  selectActiveXpRewardRule,
  normalizeGradeBandLabel,
  gradeBandsMatch,
  auditAchievementUnlockIntegrity,
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
  planWeeklyEmailWebhookOutcome,
  decideWeeklyEmailRetryAction,
  normalizeLinkedRecordIds,
  detectDuplicateActiveRewardRuleKeys,
  classifyWeeklyEmailWebhookResponse,
  planHomeworkMultiAssetCompletion,
  mapAttachmentsToAssetSlotPlans,
  inferHomeworkAssetSlot,
  decideHw17QuizIntakeAction,
  resolveHomeworkAssignmentIdentity,
  buildHomeworkCompletionIdentityKeyByPha,
  resolveHomeworkAssignmentDueDateKey,
  evaluateHomeworkSubmissionDeadline,
  buildHomeworkLateSubmissionNote,
};
