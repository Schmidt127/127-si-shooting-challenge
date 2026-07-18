/**
 * C-025 Stage 17 Zoom Attendance — pure contracts (no Airtable I/O).
 * Source Key family: ZOOM_CREDIT|{enrollmentId}|{meetingId}
 * Live family remains ZOOM_ATTEND_BASE|{meetingKey}|{enrollmentId} (101).
 */

const SOURCE_PREFIX = "ZOOM_CREDIT";
const LIVE_PREFIX = "ZOOM_ATTEND_BASE";
const XP_BUCKET = "Zoom Attendance";
const XP_SOURCE = "Zoom Meeting Recording Quiz";
const DATE_FIELD = "XP Activity Date";
const REASON_PUBLIC_FIELD = "XP Reason Public";
const REASON_DEBUG_FIELD = "XP Reason Debug";
const REASON_PUBLIC_TEXT = "Zoom recording quiz credit";

function buildZoomCreditSourceKey(enrollmentId, meetingId) {
  return `${SOURCE_PREFIX}|${enrollmentId}|${meetingId}`;
}

function buildLiveAttendBaseSourceKey(meetingKey, enrollmentId) {
  return `${LIVE_PREFIX}|${meetingKey}|${enrollmentId}`;
}

function isZoomCreditKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${SOURCE_PREFIX}|`);
}

function isLiveAttendBaseKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${LIVE_PREFIX}|`);
}

function parseZoomCreditKey(sourceKey) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length !== 3 || parts[0] !== SOURCE_PREFIX) return null;
  return { enrollmentId: parts[1], meetingId: parts[2] };
}

/**
 * Formula layer exclusivity: at most one Approved credit per Enrollment+Meeting.
 * Live 101 XP uses a different Source Key family — never share ZOOM_CREDIT keys.
 */
function canCreateRecordingXpEvent({
  approved,
  conflict,
  amount,
  creditKey,
  existingXpBySourceKey = {},
}) {
  if (!creditKey || !isZoomCreditKey(creditKey)) {
    return { ok: false, action: "error_blank_or_invalid_key" };
  }
  if (conflict || !approved) {
    const existing = existingXpBySourceKey[creditKey];
    if (existing && existing.active) {
      return { ok: true, action: "deactivated_on_conflict", existingId: existing.id };
    }
    return { ok: false, action: "skipped_not_approved" };
  }
  if (!(Number(amount) > 0)) {
    return { ok: false, action: "skipped_zero_amount" };
  }
  const existing = existingXpBySourceKey[creditKey];
  if (existing) {
    return { ok: true, action: "skipped_exists", existingId: existing.id };
  }
  return {
    ok: true,
    action: "created",
    xpEvent: {
      sourceKey: creditKey,
      xpPoints: Number(amount),
      xpBucket: XP_BUCKET,
      xpSource: XP_SOURCE,
      reasonPublic: REASON_PUBLIC_TEXT,
      dateField: DATE_FIELD,
    },
  };
}

function assertNoHomeworkCompletionsDependency(scriptSource) {
  const banned = [
    'homeworkCompletions: "Homework Completions"',
    'tables: {\n    homeworkCompletions',
    "Send Recording Approval Email?",
    'recordingAttendees: "Recording Attendees"',
    "ZOOM_RECORDING|",
  ];
  const hits = banned.filter((b) => String(scriptSource || "").includes(b));
  return { ok: hits.length === 0, hits };
}

function assertCanonicalXpLabels(config = {}) {
  return {
    ok:
      config.xpBucket === XP_BUCKET &&
      config.xpSource === XP_SOURCE &&
      config.dateField === DATE_FIELD &&
      config.reasonPublicField === REASON_PUBLIC_FIELD &&
      config.reasonDebugField === REASON_DEBUG_FIELD,
  };
}

function denverDateKeyFromUtcMs(utcMs, timeZone = "America/Denver") {
  const d = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

module.exports = {
  SOURCE_PREFIX,
  LIVE_PREFIX,
  XP_BUCKET,
  XP_SOURCE,
  DATE_FIELD,
  REASON_PUBLIC_FIELD,
  REASON_DEBUG_FIELD,
  REASON_PUBLIC_TEXT,
  buildZoomCreditSourceKey,
  buildLiveAttendBaseSourceKey,
  isZoomCreditKey,
  isLiveAttendBaseKey,
  parseZoomCreditKey,
  canCreateRecordingXpEvent,
  assertNoHomeworkCompletionsDependency,
  assertCanonicalXpLabels,
  denverDateKeyFromUtcMs,
};
