/**
 * SC-147 Recorded Zoom half-XP — pure contract helpers (no Airtable I/O).
 *
 * Authority: docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md
 *
 * Distinct from C-025 S16 helpers (c025-zoom-recording-credit.js) which use
 * ZOOM_RECORDING|{meetingId}|{enrollmentId}. SC-147 proposes enrollment-first
 * ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId} per the design brief.
 *
 * Live attendance (101) continues ZOOM_ATTEND_* keys. Email-only 117 must not
 * write XP Events.
 */

"use strict";

const SOURCE_KEY_PREFIX = "ZOOM_RECORDING_CREDIT";
const LIVE_BASE_PREFIX = "ZOOM_ATTEND_BASE";
const LIVE_CANONICAL_PREFIX = "ZOOM_LIVE";
const LIVE_BONUS_2_PREFIX = "ZOOM_ATTEND_BONUS_2";
const LIVE_BONUS_3_PREFIX = "ZOOM_ATTEND_BONUS_3";

/** Expected XP Reward Rules row (SC-022 alignment TBD — Mike confirms amount). */
const RULE_KEY_RECORDING = "ZOOM_RECORDING";
const RULE_KEY_LIVE_BASE = "ZOOM_ATTEND_BASE";

const XP_BUCKET_ZOOM = "Zoom";
const XP_SOURCE_RECORDING = "Zoom Recording";
const XP_REASON_PUBLIC_FIELD = "XP Reason Public";
const XP_REASON_DEBUG_FIELD = "XP Reason Debug";

/** Automation 117 v2.1 is email handoff only — not an XP writer. */
const AUTOMATION_117_SCOPE = Object.freeze({
  slot: "117",
  role: "email_handoff_only",
  writesXpEvents: false,
  writesAttendees: false,
});

const PERFECT_WEEK_CONTRACT = Object.freeze({
  recordingOnlyCountsForPerfectWeek: false,
  authority: "Mike decision 2026-08-27 — recorded meetings do not count toward Perfect Week",
  formulaField: "Effective Recording Counts for Perfect Week?",
  automation057ReadsLiveAttendees: true,
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

/**
 * SC-147 canonical Source Key: ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}
 */
function buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId) {
  return `${SOURCE_KEY_PREFIX}|${assertValidRecordId(enrollmentId, "enrollmentId")}|${assertValidRecordId(zoomMeetingId, "zoomMeetingId")}`;
}

function isSc147RecordingCreditKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${SOURCE_KEY_PREFIX}|`);
}

function is101LiveCreditKey(sourceKey) {
  const key = String(sourceKey || "");
  return (
    key.startsWith(`${LIVE_BASE_PREFIX}|`)
    || key.startsWith(`${LIVE_CANONICAL_PREFIX}|`)
  );
}

function isLiveBonusKey(sourceKey) {
  const key = String(sourceKey || "");
  return key.startsWith(`${LIVE_BONUS_2_PREFIX}|`) || key.startsWith(`${LIVE_BONUS_3_PREFIX}|`);
}

function pairTokenFromSc147Key(sourceKey) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3 || parts[0] !== SOURCE_KEY_PREFIX) return null;
  return `${parts[2]}|${parts[1]}`; // meetingId|enrollmentId for cross-family compare
}

function pairTokenFrom101Key(sourceKey, meetingKeyToId = {}) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3) return null;
  const [prefix, mid, enrollmentId] = parts;
  if (prefix === LIVE_CANONICAL_PREFIX) {
    return `${mid}|${enrollmentId}`;
  }
  if (prefix === LIVE_BASE_PREFIX) {
    const meetingId = meetingKeyToId[mid] || (String(mid).startsWith("rec") ? mid : null);
    if (!meetingId) return null;
    return `${meetingId}|${enrollmentId}`;
  }
  return null;
}

function activeLivePairs(xpRows = [], meetingKeyToId = {}) {
  const live = new Set();
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    const key = row.sourceKey || "";
    if (!is101LiveCreditKey(key)) continue;
    const token = pairTokenFrom101Key(key, meetingKeyToId);
    if (token) live.add(token);
  }
  return live;
}

function activeRecordingCreditKeys(xpRows = []) {
  const keys = new Set();
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    if (isSc147RecordingCreditKey(row.sourceKey)) {
      keys.add(row.sourceKey);
    }
  }
  return keys;
}

/**
 * Half-XP amount: prefer explicit ZOOM_RECORDING rule row; else floor(live/2).
 * Optional Config percent override matches C-025 when Mike keeps percent-driven half.
 */
function computeSc147HalfXpAmount({ liveRuleAmount, recordingRuleAmount, config = {} }) {
  const live = Number(liveRuleAmount);
  if (Number.isFinite(recordingRuleAmount) && recordingRuleAmount >= 0) {
    return Math.floor(Number(recordingRuleAmount));
  }
  if (!Number.isFinite(live) || live < 0) {
    throw new Error("liveRuleAmount must be >= 0 when recordingRuleAmount is absent");
  }
  const pct = config["Zoom Recording XP Percent of Live"];
  if (pct !== undefined && pct !== null && pct !== "") {
    const n = Math.trunc(Number(pct));
    if (n >= 0 && n <= 100) {
      return Math.floor((live * n) / 100);
    }
  }
  return Math.floor(live / 2);
}

/**
 * XP Reward Rules contract — expected Rule Key ZOOM_RECORDING (SC-022 TBD).
 */
function selectSc147XpRewardRules(rules = []) {
  const liveMatches = rules.filter(
    (r) => r && r.active !== false && String(r.ruleKey) === RULE_KEY_LIVE_BASE,
  );
  const recordingMatches = rules.filter(
    (r) => r && r.active !== false && String(r.ruleKey) === RULE_KEY_RECORDING,
  );
  return {
    ruleKeyLiveBase: RULE_KEY_LIVE_BASE,
    ruleKeyRecording: RULE_KEY_RECORDING,
    live: liveMatches.length === 1 ? liveMatches[0] : null,
    recording: recordingMatches.length === 1 ? recordingMatches[0] : null,
    liveStatus: liveMatches.length === 0 ? "missing" : liveMatches.length > 1 ? "duplicate" : "ok",
    recordingStatus:
      recordingMatches.length === 0 ? "missing" : recordingMatches.length > 1 ? "duplicate" : "ok",
  };
}

function resolveSc147XpAmountFromRules(rules = [], config = {}) {
  const selected = selectSc147XpRewardRules(rules);
  if (selected.liveStatus !== "ok") {
    return { ok: false, reason: `live_rule_${selected.liveStatus}`, selected, xpAmount: null };
  }
  const liveAmount = Number(selected.live.xpAmount);
  let recordingAmount = null;
  if (selected.recordingStatus === "ok") {
    recordingAmount = Number(selected.recording.xpAmount);
  }
  const xpAmount = computeSc147HalfXpAmount({
    liveRuleAmount: liveAmount,
    recordingRuleAmount: recordingAmount,
    config,
  });
  return { ok: true, reason: "ok", selected, xpAmount };
}

/**
 * Conflict matrix gate — live 101 credit blocks recording for same meeting+enrollment.
 */
function canAwardSc147RecordingCredit({
  enrollmentId,
  zoomMeetingId,
  xpRows = [],
  meetingKeyToId = {},
  conflictRollup = 0,
  progressProcessingEnabled = true,
  quizApproved = true,
}) {
  if (!isValidRecordId(enrollmentId) || !isValidRecordId(zoomMeetingId)) {
    return { ok: false, reason: "error_malformed_record_id" };
  }
  if (!progressProcessingEnabled) {
    return { ok: false, reason: "skipped_progress_disabled" };
  }
  if (!quizApproved) {
    return { ok: false, reason: "skipped_not_approved" };
  }
  if (Number(conflictRollup) === 1) {
    return { ok: false, reason: "skipped_conflict_rollup" };
  }

  const sourceKey = buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId);
  const existingRecording = activeRecordingCreditKeys(xpRows);
  if (existingRecording.has(sourceKey)) {
    return { ok: false, reason: "skipped_already_awarded", sourceKey };
  }

  const token = `${zoomMeetingId}|${enrollmentId}`;
  const livePairs = activeLivePairs(xpRows, meetingKeyToId);
  if (livePairs.has(token)) {
    return { ok: false, reason: "skipped_live_101_exists", sourceKey };
  }

  return { ok: true, reason: "ok", sourceKey };
}

function decideSc147RecordingXpAction({ sourceKey, awardGate, existingKeys = [] }) {
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
  return { action: "create", reason: "ok" };
}

function buildSc147RecordingXpEventFields({
  enrollmentId,
  zoomMeetingId,
  weekId,
  xpAmount,
  activityDateKey,
  zoomAttendanceId,
  scriptVersion = "v1.0",
}) {
  const sourceKey = buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId);
  return {
    sourceKey,
    xpPoints: xpAmount,
    xpBucket: XP_BUCKET_ZOOM,
    xpSource: XP_SOURCE_RECORDING,
    enrollmentId,
    zoomMeetingId,
    weekId: weekId || "",
    activityDateKey: activityDateKey || "",
    zoomAttendanceId: zoomAttendanceId || "",
    reasonPublicField: XP_REASON_PUBLIC_FIELD,
    reasonDebugField: XP_REASON_DEBUG_FIELD,
    reasonPublic: "Zoom recording credit (half XP)",
    reasonDebug: `SC-147 ${scriptVersion} ${sourceKey}`,
    ruleKeyRecording: RULE_KEY_RECORDING,
    ruleKeyLiveBase: RULE_KEY_LIVE_BASE,
  };
}

/**
 * Perfect Week contract — recording-only credit must not increment PW Zoom counts.
 * Live Attendees path counts; recording-only XP / Recording Attendees without live do not.
 */
function sc147PerfectWeekZoomAttendanceCount({
  enrollmentId,
  weekMeetingIds = [],
  liveAttendeesByMeeting = {},
  recordingOnlyMeetingIds = [],
}) {
  assertValidRecordId(enrollmentId, "enrollmentId");
  let count = 0;
  for (const meetingId of weekMeetingIds) {
    const live = liveAttendeesByMeeting[meetingId] || [];
    if (live.includes(enrollmentId)) {
      count += 1;
      continue;
    }
    // Recording-only path explicitly excluded from Perfect Week per SC-147 policy.
    if (recordingOnlyMeetingIds.includes(meetingId)) {
      continue;
    }
  }
  return count;
}

function recordingOnlyDoesNotCountForPerfectWeek({ enrollmentId, meetingId, liveAttendees = [], hasRecordingCredit = true }) {
  const onLive = liveAttendees.includes(enrollmentId);
  if (onLive) {
    return { countsForPerfectWeek: true, reason: "live_attendance" };
  }
  if (hasRecordingCredit) {
    return {
      countsForPerfectWeek: PERFECT_WEEK_CONTRACT.recordingOnlyCountsForPerfectWeek,
      reason: "recording_only_excluded",
    };
  }
  return { countsForPerfectWeek: false, reason: "no_credit" };
}

module.exports = {
  SOURCE_KEY_PREFIX,
  RULE_KEY_RECORDING,
  RULE_KEY_LIVE_BASE,
  XP_BUCKET_ZOOM,
  XP_SOURCE_RECORDING,
  XP_REASON_PUBLIC_FIELD,
  XP_REASON_DEBUG_FIELD,
  AUTOMATION_117_SCOPE,
  PERFECT_WEEK_CONTRACT,
  isValidRecordId,
  assertValidRecordId,
  buildSc147RecordingCreditSourceKey,
  isSc147RecordingCreditKey,
  is101LiveCreditKey,
  isLiveBonusKey,
  pairTokenFromSc147Key,
  pairTokenFrom101Key,
  activeLivePairs,
  activeRecordingCreditKeys,
  computeSc147HalfXpAmount,
  selectSc147XpRewardRules,
  resolveSc147XpAmountFromRules,
  canAwardSc147RecordingCredit,
  decideSc147RecordingXpAction,
  buildSc147RecordingXpEventFields,
  sc147PerfectWeekZoomAttendanceCount,
  recordingOnlyDoesNotCountForPerfectWeek,
};
