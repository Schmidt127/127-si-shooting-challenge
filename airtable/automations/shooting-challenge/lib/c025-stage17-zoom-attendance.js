/**
 * C-025 Stage 17 Zoom Attendance — pure contracts (no Airtable I/O).
 * Source Key family: ZOOM_CREDIT|{enrollmentId}|{meetingId}
 * Live family remains ZOOM_ATTEND_BASE|{meetingKey}|{enrollmentId} (101).
 *
 * Hard rule (2026-07-18): recording credit must NEVER write Zoom Meetings.Attendees.
 * That field is reserved for live attendance and can re-trigger Automation 101.
 */

const SOURCE_PREFIX = "ZOOM_CREDIT";
const LIVE_PREFIX = "ZOOM_ATTEND_BASE";
const XP_BUCKET = "Zoom Attendance";
const XP_SOURCE = "Zoom Meeting Recording Quiz";
const DATE_FIELD = "XP Activity Date";
const REASON_PUBLIC_FIELD = "XP Reason Public";
const REASON_DEBUG_FIELD = "XP Reason Debug";
const REASON_PUBLIC_TEXT = "Zoom recording quiz credit";
const LIVE_ATTENDEES_FIELD = "Attendees";

/** Documented downstream status — recording never writes live Attendees. */
const DOWNSTREAM_GAPS = {
  perfectWeek: {
    recordingFlag: "Effective Recording Counts for Perfect Week?",
    appliedFlag: "Perfect Week Credit Applied?",
    consumer: "057 v1.3 counts live Attendees ∪ qualifying recording credits",
    status: "REPO_READY — paste 057 v1.3; Applied? set only when 057 counts the credit",
  },
  levelGate: {
    recordingFlag: "Zoom Gate Credit Earned?",
    appliedFlag: "Gate Credit Applied?",
    consumer: "042 v3.1 counts live meetings ∪ qualifying recording gate credits",
    status: "REPO_READY — paste 042 v3.1; Applied? set only when 042 counts the credit",
  },
  automation101: {
    triggerFields: [
      "Create XP Events",
      "XP Award Status",
      "Attendees",
      "Week",
      "Zoom Meeting Key",
      "Meeting Status",
    ],
    status: "Recording path must leave all 101 trigger prerequisites unchanged",
  },
};

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
      writesLiveAttendees: false,
    },
  };
}

/**
 * Build XP Event field plan for Stage 17 recording credit.
 * Never includes Zoom Meetings.Attendees mutations.
 */
function buildRecordingXpEventFields({
  sourceKey,
  amount,
  enrollmentId,
  meetingId,
  activityDate,
  reasonDebug,
  weekId,
  zoomAttendanceId,
  linkZoomAttendance = false,
}) {
  const fields = {
    sourceKey,
    xpPoints: Number(amount),
    xpBucket: XP_BUCKET,
    xpSource: XP_SOURCE,
    reasonPublic: REASON_PUBLIC_TEXT,
    reasonDebug: reasonDebug || `C-025 ZOOM_CREDIT ${sourceKey}`,
    dateField: DATE_FIELD,
    activityDate: activityDate || null,
    enrollmentId,
    meetingId,
    weekId: weekId || null,
    active: true,
  };
  if (linkZoomAttendance && zoomAttendanceId) {
    fields.zoomAttendanceId = zoomAttendanceId;
  }
  return {
    fields,
    forbiddenWrites: { [LIVE_ATTENDEES_FIELD]: false },
    writesLiveAttendees: false,
  };
}

/**
 * Gate: eligibility only. Applied? is owned by Automation 042 after counting.
 */
function planGateCreditApplication({
  gateEarned,
  conflict,
  alreadyApplied,
}) {
  if (conflict) {
    return {
      ok: false,
      action: "skipped_conflict",
      writesLiveAttendees: false,
      gap: DOWNSTREAM_GAPS.levelGate,
    };
  }
  if (!gateEarned) {
    return {
      ok: false,
      action: "skipped_no_gate_credit",
      writesLiveAttendees: false,
      gap: DOWNSTREAM_GAPS.levelGate,
    };
  }
  if (alreadyApplied) {
    return {
      ok: true,
      action: "already_applied_by_downstream",
      writesLiveAttendees: false,
      setGateAppliedFlag: false,
      gap: DOWNSTREAM_GAPS.levelGate,
    };
  }
  return {
    ok: true,
    action: "eligible_awaiting_042",
    writesLiveAttendees: false,
    setGateAppliedFlag: false,
    gap: DOWNSTREAM_GAPS.levelGate,
  };
}

/**
 * Perfect Week: eligibility only. Applied? is owned by Automation 057 after counting.
 */
function planPerfectWeekCreditApplication({
  approved,
  pwFlag,
  conflict,
  alreadyApplied,
}) {
  if (conflict) {
    return {
      ok: false,
      action: "skipped_conflict",
      writesLiveAttendees: false,
      gap: DOWNSTREAM_GAPS.perfectWeek,
    };
  }
  if (!approved || !pwFlag) {
    return {
      ok: false,
      action: "skipped_flag_off",
      writesLiveAttendees: false,
      gap: DOWNSTREAM_GAPS.perfectWeek,
    };
  }
  if (alreadyApplied) {
    return {
      ok: true,
      action: "already_applied_by_downstream",
      writesLiveAttendees: false,
      setPwAppliedFlag: false,
      gap: DOWNSTREAM_GAPS.perfectWeek,
    };
  }
  return {
    ok: true,
    action: "eligible_awaiting_057",
    writesLiveAttendees: false,
    setPwAppliedFlag: false,
    gap: DOWNSTREAM_GAPS.perfectWeek,
  };
}

/**
 * Snapshot of Automation 101 trigger prerequisites on a Zoom Meeting.
 * 117 must leave these unchanged.
 */
function snapshotAutomation101Prereqs(meeting = {}) {
  return {
    createXpEvents: Boolean(meeting.createXpEvents),
    xpAwardStatus: meeting.xpAwardStatus == null ? "" : String(meeting.xpAwardStatus),
    attendees: [...(meeting.attendees || [])].map(String).sort(),
    week: [...(meeting.week || [])].map(String).sort(),
    zoomMeetingKey: meeting.zoomMeetingKey == null ? "" : String(meeting.zoomMeetingKey),
    meetingStatus: meeting.meetingStatus == null ? "" : String(meeting.meetingStatus),
  };
}

function assertAutomation101PrereqsUnchanged(before, after) {
  const b = snapshotAutomation101Prereqs(before);
  const a = snapshotAutomation101Prereqs(after);
  const same =
    b.createXpEvents === a.createXpEvents &&
    b.xpAwardStatus === a.xpAwardStatus &&
    b.attendees.join("|") === a.attendees.join("|") &&
    b.week.join("|") === a.week.join("|") &&
    b.zoomMeetingKey === a.zoomMeetingKey &&
    b.meetingStatus === a.meetingStatus;
  return { ok: same, before: b, after: a };
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

/**
 * Reject Stage 17 scripts that mutate live Zoom Meetings.Attendees.
 */
function assertNeverWritesLiveAttendees(scriptSource) {
  const src = String(scriptSource || "");
  const bannedPatterns = [
    /linked_attendee_for_gate/,
    /linked_attendee_for_perfect_week/,
    /attendees\.concat\s*\(/,
    /CONFIG\.fields\.attendees\]:\s*attendees/,
    /\[CONFIG\.zoom\.attendees\]/,
    /fields\.attendees\]:\s*.*map\(\(id\)\s*=>\s*\(\{\s*id\s*\}\)/,
  ];
  const hits = bannedPatterns
    .filter((re) => re.test(src))
    .map((re) => re.toString());
  // Also ban assigning Attendees on Zoom Meetings updates
  if (/updateRecordSafe\(\s*zmTable[\s\S]{0,200}Attendees/.test(src)) {
    hits.push("updateRecordSafe(zmTable…Attendees)");
  }
  if (/zmTable\.updateRecordAsync[\s\S]{0,200}Attendees/.test(src)) {
    hits.push("zmTable.updateRecordAsync…Attendees");
  }
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
  LIVE_ATTENDEES_FIELD,
  DOWNSTREAM_GAPS,
  buildZoomCreditSourceKey,
  buildLiveAttendBaseSourceKey,
  isZoomCreditKey,
  isLiveAttendBaseKey,
  parseZoomCreditKey,
  canCreateRecordingXpEvent,
  buildRecordingXpEventFields,
  planGateCreditApplication,
  planPerfectWeekCreditApplication,
  snapshotAutomation101Prereqs,
  assertAutomation101PrereqsUnchanged,
  assertNoHomeworkCompletionsDependency,
  assertNeverWritesLiveAttendees,
  assertCanonicalXpLabels,
  denverDateKeyFromUtcMs,
};
