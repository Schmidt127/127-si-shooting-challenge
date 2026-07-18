/**
 * C-025 Zoom recording credit — pure contract helpers (no Airtable).
 *
 * Aligns with:
 * - docs/deploy-checklists/C-025-zoom-recording-design-stage12.md (S16 approved)
 * - docs/deploy-checklists/C-025-C-027-configuration-catalog-stage16.md
 * - tools/airtable/tests/test_c025_recording_watch_contract.py
 *
 * Live attendance (automation 101) continues to use ZOOM_ATTEND_* Source Keys.
 * Recording credit (automation 117a) uses ZOOM_RECORDING|* and must never collide.
 */

"use strict";

const LIVE_BASE_PREFIX = "ZOOM_ATTEND_BASE";
const LIVE_CANONICAL_PREFIX = "ZOOM_LIVE";
const RECORDING_PREFIX = "ZOOM_RECORDING";
const LIVE_BONUS_2_PREFIX = "ZOOM_ATTEND_BONUS_2";
const LIVE_BONUS_3_PREFIX = "ZOOM_ATTEND_BONUS_3";

const XP_BUCKET_ZOOM = "Zoom";
const XP_SOURCE_RECORDING = "Zoom Recording";
const RULE_KEY_LIVE_BASE = "ZOOM_ATTEND_BASE";
const RULE_KEY_RECORDING_DISPLAY = "ZOOM_ATTEND_RECORDING";

/** Canonical XP Events reason fields (schema snapshots + 010/065/114/054). */
const XP_REASON_PUBLIC_FIELD = "XP Reason Public";
const XP_REASON_DEBUG_FIELD = "XP Reason Debug";

const DEFAULTS = Object.freeze({
  xpPercentOfLive: 50,
  makeupWindowDays: 7,
  deadlineMode: "Later of Both",
  requiresCoachApproval: true,
  givesFullGateCredit: true,
  countsForPerfectWeek: true,
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

function cfgNumber(config, key, fallback) {
  const value = config && Object.prototype.hasOwnProperty.call(config, key) ? config[key] : undefined;
  if (value === undefined || value === null || value === "") return fallback;
  return Number(value);
}

function cfgBool(config, key, fallback) {
  if (!config || !Object.prototype.hasOwnProperty.call(config, key) || config[key] === null || config[key] === undefined) {
    return fallback;
  }
  return Boolean(config[key]);
}

function cfgSelect(config, key, fallback) {
  const value = config && config[key];
  if (!value) return fallback;
  return String(value);
}

function buildZoomLiveSourceKey(meetingId, enrollmentId) {
  return `${LIVE_CANONICAL_PREFIX}|${assertValidRecordId(meetingId, "meetingId")}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomRecordingSourceKey(meetingId, enrollmentId) {
  return `${RECORDING_PREFIX}|${assertValidRecordId(meetingId, "meetingId")}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

/** Legacy live key used by automation 101 today. */
function buildLegacyZoomAttendBaseSourceKey(zoomMeetingKey, enrollmentId) {
  const key = String(zoomMeetingKey || "").trim();
  if (!key) throw new Error("Invalid zoomMeetingKey");
  return `${LIVE_BASE_PREFIX}|${key}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomAttendBonus2SourceKey(enrollmentId) {
  return `${LIVE_BONUS_2_PREFIX}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function buildZoomAttendBonus3SourceKey(enrollmentId) {
  return `${LIVE_BONUS_3_PREFIX}|${assertValidRecordId(enrollmentId, "enrollmentId")}`;
}

function isLiveFamilyKey(sourceKey) {
  const key = String(sourceKey || "");
  return key.startsWith(`${LIVE_CANONICAL_PREFIX}|`) || key.startsWith(`${LIVE_BASE_PREFIX}|`);
}

function isRecordingFamilyKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${RECORDING_PREFIX}|`);
}

function isLiveBonusKey(sourceKey) {
  const key = String(sourceKey || "");
  return key.startsWith(`${LIVE_BONUS_2_PREFIX}|`) || key.startsWith(`${LIVE_BONUS_3_PREFIX}|`);
}

function meetingEnrollmentFromKey(sourceKey, meetingKeyToId = {}) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3) return null;
  const [prefix, mid, enrollmentId] = parts;
  if (prefix === LIVE_CANONICAL_PREFIX || prefix === RECORDING_PREFIX) {
    return { meetingId: mid, enrollmentId };
  }
  if (prefix === LIVE_BASE_PREFIX) {
    // Zoom Meeting Key is often already RECORD_ID(); also support explicit map.
    const meetingId = meetingKeyToId[mid] || (String(mid).startsWith("rec") ? mid : null);
    if (!meetingId) return null;
    return { meetingId, enrollmentId };
  }
  return null;
}

function activeZoomPairs(xpRows = [], meetingKeyToId = {}) {
  const live = new Set();
  const recording = new Set();
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    const key = row.sourceKey || "";
    const pair = meetingEnrollmentFromKey(key, meetingKeyToId);
    if (!pair) continue;
    const token = `${pair.meetingId}|${pair.enrollmentId}`;
    if (isLiveFamilyKey(key)) live.add(token);
    if (isRecordingFamilyKey(key)) recording.add(token);
  }
  return { live, recording };
}

function recordingXpAmount(liveBaseXp, config = {}) {
  const live = Number(liveBaseXp);
  if (!Number.isFinite(live) || live < 0) {
    throw new Error("liveBaseXp must be >= 0");
  }
  const pct = Math.trunc(cfgNumber(config, "Zoom Recording XP Percent of Live", DEFAULTS.xpPercentOfLive));
  if (pct < 0 || pct > 100) {
    throw new Error("Zoom Recording XP Percent of Live out of range");
  }
  return Math.floor((live * pct) / 100);
}

function addCalendarDays(isoDateKey, days) {
  const [y, m, d] = String(isoDateKey).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function computeRecordingDeadline({
  availableOnDateKey,
  weekEndDateKey,
  config = {},
  meetingDaysOverride = null,
  meetingModeOverride = null,
}) {
  const days = meetingDaysOverride !== null && meetingDaysOverride !== undefined && meetingDaysOverride !== ""
    ? Number(meetingDaysOverride)
    : Math.trunc(cfgNumber(config, "Zoom Recording Makeup Window Days", DEFAULTS.makeupWindowDays));
  const mode = meetingModeOverride || cfgSelect(config, "Zoom Recording Deadline Mode", DEFAULTS.deadlineMode);
  const daysDeadline = addCalendarDays(availableOnDateKey, days);
  if (mode === "Days After Recording Available") return daysDeadline;
  if (mode === "End of Program Week") return weekEndDateKey;
  if (mode === "Earlier of Both") return daysDeadline < weekEndDateKey ? daysDeadline : weekEndDateKey;
  return daysDeadline > weekEndDateKey ? daysDeadline : weekEndDateKey;
}

function isWithinMakeupWindow({ activityDateKey, deadlineDateKey }) {
  if (!activityDateKey || !deadlineDateKey) return false;
  return String(activityDateKey) <= String(deadlineDateKey);
}

function canAwardRecordingCredit({
  meetingId,
  enrollmentId,
  xpRows = [],
  progressProcessingEnabled = true,
  config = {},
  quizStatus = "",
  meetingKeyToId = {},
  activityDateKey = "",
  deadlineDateKey = "",
}) {
  if (!isValidRecordId(meetingId) || !isValidRecordId(enrollmentId)) {
    return { ok: false, reason: "error_malformed_record_id" };
  }
  if (!progressProcessingEnabled) {
    return { ok: false, reason: "skipped_progress_disabled" };
  }
  if (cfgBool(config, "Recording Quiz Requires Coach Approval?", DEFAULTS.requiresCoachApproval)
    && String(quizStatus) !== "Satisfactory") {
    return { ok: false, reason: "skipped_awaiting_coach_approval" };
  }
  if (deadlineDateKey && activityDateKey && !isWithinMakeupWindow({ activityDateKey, deadlineDateKey })) {
    return { ok: false, reason: "skipped_past_makeup_deadline" };
  }

  const { live, recording } = activeZoomPairs(xpRows, meetingKeyToId);
  const token = `${meetingId}|${enrollmentId}`;
  if (recording.has(token)) {
    return { ok: false, reason: "skipped_already_awarded" };
  }
  if (live.has(token)) {
    return { ok: false, reason: "skipped_live_exists" };
  }
  return { ok: true, reason: "ok" };
}

/**
 * Idempotent award decision for automation 117a.
 */
function decideRecordingXpAction({
  sourceKey,
  existingKeys = [],
  awardGate,
}) {
  if (!sourceKey) {
    return { action: "error", reason: "missing_source_key" };
  }
  if (awardGate && awardGate.ok === false) {
    if (String(awardGate.reason || "").startsWith("error_")) {
      return { action: "error", reason: awardGate.reason };
    }
    return { action: "skipped", reason: awardGate.reason };
  }
  const existing = existingKeys instanceof Set ? existingKeys : new Set(existingKeys);
  if (existing.has(sourceKey)) {
    return { action: "skipped", reason: "skipped_already_awarded" };
  }
  // Also treat any live family key for same pair as blocking (caller should pass awardGate).
  return { action: "create", reason: "ok" };
}

function shouldSendRecordingApprovalEmail({ config = {}, quizStatus = "" }) {
  if (!Object.prototype.hasOwnProperty.call(config, "Recording Approval Email Enabled?")
    || config["Recording Approval Email Enabled?"] === null
    || config["Recording Approval Email Enabled?"] === undefined) {
    return { send: false, reason: "skipped_config_missing_email_enabled" };
  }
  if (!config["Recording Approval Email Enabled?"]) {
    return { send: false, reason: "skipped_email_disabled" };
  }
  const timing = cfgSelect(config, "Recording Approval Email Timing", "On Satisfactory");
  if (timing !== "On Satisfactory") {
    return { send: false, reason: "skipped_timing_unsupported" };
  }
  if (quizStatus !== "Satisfactory") {
    return { send: false, reason: "skipped_not_satisfactory" };
  }
  const template = String(config["Recording Approval Email Template Key"] || "").trim();
  if (!template) {
    return { send: false, reason: "skipped_missing_template_key" };
  }
  return { send: true, reason: "ok", templateKey: template };
}

function distinctZoomMeetingCredit({ liveMeetingIds = [], recordingMeetingIds = [], config = {} }) {
  const live = new Set(liveMeetingIds);
  if (!cfgBool(config, "Recording Gives Full Zoom Gate Credit?", DEFAULTS.givesFullGateCredit)) {
    return live.size;
  }
  const all = new Set([...live, ...recordingMeetingIds]);
  return all.size;
}

function buildRecordingXpEventFields({
  enrollmentId,
  meetingId,
  weekId,
  xpAmount,
  activityDateKey,
  homeworkCompletionId,
  scriptVersion = "v1.1",
}) {
  const sourceKey = buildZoomRecordingSourceKey(meetingId, enrollmentId);
  return {
    sourceKey,
    xpPoints: xpAmount,
    xpBucket: XP_BUCKET_ZOOM,
    xpSource: XP_SOURCE_RECORDING,
    enrollmentId,
    meetingId,
    weekId: weekId || "",
    activityDateKey: activityDateKey || "",
    homeworkCompletionId: homeworkCompletionId || "",
    reasonPublicField: XP_REASON_PUBLIC_FIELD,
    reasonDebugField: XP_REASON_DEBUG_FIELD,
    reasonPublic: "Zoom recording quiz credit",
    reasonDebug: `C-025 ${scriptVersion} ${sourceKey}`,
  };
}

/**
 * Perfect Week Zoom attendance count under S16.
 * Today automation 057 only reads live `Attendees`. Recording credit must be
 * unioned from `Recording Attendees` when Config allows — otherwise PW gap remains.
 */
function perfectWeekZoomAttendanceCount({
  enrollmentId,
  weekMeetingIds = [],
  liveAttendeesByMeeting = {},
  recordingAttendeesByMeeting = {},
  config = {},
}) {
  assertValidRecordId(enrollmentId, "enrollmentId");
  const includeRecording = cfgBool(
    config,
    "Recording Makeup Counts for Perfect Week?",
    DEFAULTS.countsForPerfectWeek,
  );
  let count = 0;
  for (const meetingId of weekMeetingIds) {
    const live = liveAttendeesByMeeting[meetingId] || [];
    const recording = recordingAttendeesByMeeting[meetingId] || [];
    const onLive = live.includes(enrollmentId);
    const onRecording = includeRecording && recording.includes(enrollmentId);
    if (onLive || onRecording) count += 1;
  }
  return count;
}

/**
 * Post-award conflict: if live credit appears after recording (or vice versa),
 * S16 award-time skip is insufficient. Soft-void the recording XP Event.
 * Returns which Source Keys should be deactivated — does not invent deletes.
 */
function decideConflictSoftVoid({
  meetingId,
  enrollmentId,
  xpRows = [],
  meetingKeyToId = {},
}) {
  assertValidRecordId(meetingId, "meetingId");
  assertValidRecordId(enrollmentId, "enrollmentId");
  const token = `${meetingId}|${enrollmentId}`;
  const { live, recording } = activeZoomPairs(xpRows, meetingKeyToId);
  if (!(live.has(token) && recording.has(token))) {
    return { conflict: false, deactivateSourceKeys: [] };
  }
  const deactivateSourceKeys = [];
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    if (!isRecordingFamilyKey(row.sourceKey)) continue;
    const pair = meetingEnrollmentFromKey(row.sourceKey, meetingKeyToId);
    if (pair && `${pair.meetingId}|${pair.enrollmentId}` === token) {
      deactivateSourceKeys.push(row.sourceKey);
    }
  }
  return { conflict: true, deactivateSourceKeys };
}

/**
 * Responsibility ownership under S16 (PR #26). Used by contract tests so claims
 * cannot silently drift from docs/v2/C025_ARCHITECTURE_RECONCILIATION.md.
 */
const S16_RESPONSIBILITY_OWNERS = Object.freeze({
  recordingApproval: "Homework Completions Satisfactory (coach) — no Stage17-117b required",
  recordingXpAward: "117a",
  awardTimeExclusivity: "117a + canAwardRecordingCredit",
  postAwardConflictSoftVoid: "OPEN_GAP — decideConflictSoftVoid helper; not wired in 101/117a yet",
  levelGateRoster: "117a → Zoom Meetings.Recording Attendees",
  levelGateCount: "OPEN_GAP — Enrollments.Total Zoom Attendances must union live∪recording",
  perfectWeekRosterCount: "OPEN_GAP — 057 Attendees-only; use perfectWeekZoomAttendanceCount when wired",
  approvalEmail: "117b",
  liveAttendanceXp: "101",
  stage17NormalizeZa: "NOT_REQUIRED_UNDER_S16_HC_PATH",
  stage17CoachReviewZa: "NOT_REQUIRED_UNDER_S16_HC_PATH",
  stage17CreateXp: "FOLDED_INTO_117a",
  stage17Gate: "FOLDED_INTO_117a_PLUS_FORMULA",
  stage17PerfectWeek: "OPEN_GAP",
  stage17Email: "FOLDED_INTO_117b",
});

function assertLiveAttendanceDoesNotOwnRecordingXp() {
  return {
    livePrefixes: [LIVE_BASE_PREFIX, LIVE_CANONICAL_PREFIX, LIVE_BONUS_2_PREFIX, LIVE_BONUS_3_PREFIX],
    recordingPrefix: RECORDING_PREFIX,
    liveOwnsRecording: false,
  };
}

module.exports = {
  LIVE_BASE_PREFIX,
  LIVE_CANONICAL_PREFIX,
  RECORDING_PREFIX,
  LIVE_BONUS_2_PREFIX,
  LIVE_BONUS_3_PREFIX,
  XP_BUCKET_ZOOM,
  XP_SOURCE_RECORDING,
  RULE_KEY_LIVE_BASE,
  RULE_KEY_RECORDING_DISPLAY,
  XP_REASON_PUBLIC_FIELD,
  XP_REASON_DEBUG_FIELD,
  DEFAULTS,
  S16_RESPONSIBILITY_OWNERS,
  isValidRecordId,
  assertValidRecordId,
  buildZoomLiveSourceKey,
  buildZoomRecordingSourceKey,
  buildLegacyZoomAttendBaseSourceKey,
  buildZoomAttendBonus2SourceKey,
  buildZoomAttendBonus3SourceKey,
  isLiveFamilyKey,
  isRecordingFamilyKey,
  isLiveBonusKey,
  meetingEnrollmentFromKey,
  activeZoomPairs,
  recordingXpAmount,
  addCalendarDays,
  computeRecordingDeadline,
  isWithinMakeupWindow,
  canAwardRecordingCredit,
  decideRecordingXpAction,
  shouldSendRecordingApprovalEmail,
  distinctZoomMeetingCredit,
  buildRecordingXpEventFields,
  perfectWeekZoomAttendanceCount,
  decideConflictSoftVoid,
  assertLiveAttendanceDoesNotOwnRecordingXp,
};
