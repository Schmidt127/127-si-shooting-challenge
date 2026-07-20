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

const EMAIL_SEND_PREFIX = "ZOOM_REC_APPROVAL";
const REVIEW_STATUSES = Object.freeze([
  "Not Submitted",
  "Needs Review",
  "Satisfactory",
  "Needs Correction",
]);

/**
 * Blank-safe boolean normalization for checkbox / formula / lookup shapes.
 * Accepts: true|false|blank|1|0|"1"|"0"|"yes"|"no"|lookup arrays|Yes/No text.
 */
function normalizeBoolean(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) return normalizeBoolean(value[0]);
    return null;
  }
  if (typeof value === "object" && value && "name" in value) {
    return normalizeBoolean(value.name);
  }
  const s = String(value).trim().toLowerCase();
  if (s === "yes" || s === "true" || s === "checked") return true;
  if (s === "no" || s === "false" || s === "unchecked") return false;
  return null;
}

/**
 * Checkbox + Yes/No companion precedence.
 * Explicit No overrides Yes. Blank falls through to checkbox / null.
 */
function resolveCheckboxYesNoPrecedence({ checkbox, ynText } = {}) {
  const yn = normalizeBoolean(ynText);
  if (yn === false) return { value: false, source: "yn_explicit_no" };
  if (yn === true) return { value: true, source: "yn_explicit_yes" };
  const cb = normalizeBoolean(checkbox);
  if (cb === true) return { value: true, source: "checkbox_true" };
  if (cb === false) return { value: false, source: "checkbox_false" };
  return { value: null, source: "blank" };
}

/**
 * Effective config resolution: Meeting override → Program Config → Global Config.
 * Blank / null override falls through. Explicit No overrides Yes at each layer.
 */
function resolveEffectiveConfigValue({
  globalValue = null,
  programValue = null,
  meetingOverride = null,
} = {}) {
  const layers = [
    { name: "meeting", value: meetingOverride },
    { name: "program", value: programValue },
    { name: "global", value: globalValue },
  ];
  for (const layer of layers) {
    const n = normalizeBoolean(layer.value);
    if (n === null && layer.value != null && String(layer.value).trim() !== "") {
      // Non-boolean scalar (number/string select) — first non-blank wins
      return { value: layer.value, source: layer.name, blankFallthrough: false };
    }
    if (n !== null) {
      return { value: n, source: layer.name, blankFallthrough: false };
    }
  }
  return { value: null, source: "missing_config", blankFallthrough: true };
}

/**
 * Recording XP = live base × (percent / 100), rounded half-up to nearest integer.
 * Confirmed Stage 17 target: 60 × 50% → 30.
 */
function calculateRecordingXp({ liveBaseXp, recordingPercent } = {}) {
  if (liveBaseXp == null || liveBaseXp === "" || recordingPercent == null || recordingPercent === "") {
    return { ok: false, xp: null, error: "missing_base_or_percent" };
  }
  const base = Number(liveBaseXp);
  const pct = Number(recordingPercent);
  if (!Number.isFinite(base) || !Number.isFinite(pct)) {
    return { ok: false, xp: null, error: "missing_base_or_percent" };
  }
  if (base < 0 || pct < 0) {
    return { ok: false, xp: null, error: "negative_input" };
  }
  const raw = (base * pct) / 100;
  const xp = Math.round(raw);
  return { ok: true, xp, raw, liveBaseXp: base, recordingPercent: pct };
}

function buildApprovalEmailSendKey(enrollmentId, meetingId) {
  if (!enrollmentId || !meetingId) return null;
  return `${EMAIL_SEND_PREFIX}|${enrollmentId}|${meetingId}`;
}

/** Normalize link / lookup / collaborator arrays to record id strings. */
function normalizeLookupIds(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((x) => {
        if (x == null) return null;
        if (typeof x === "string") return x;
        if (typeof x === "object" && x.id) return String(x.id);
        return null;
      })
      .filter(Boolean);
  }
  if (typeof value === "object" && value.id) return [String(value.id)];
  if (typeof value === "string" && value) return [value];
  return [];
}

/** First scalar from lookup array / string / number; blank → "". */
function normalizeLookupScalar(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (!value.length) return "";
    return normalizeLookupScalar(value[0]);
  }
  if (typeof value === "object") {
    if (value.name != null) return String(value.name).trim();
    if (value.id != null) return String(value.id).trim();
    return "";
  }
  return String(value).trim();
}

/**
 * Deadline comparison using date-only or Date objects.
 * "Exactly at deadline" is still allowed (before-or-at).
 */
function compareAgainstDeadline({ asOf, deadline } = {}) {
  if (deadline == null || deadline === "") {
    return { ok: false, status: "missing_deadline" };
  }
  if (asOf == null || asOf === "") {
    return { ok: false, status: "missing_as_of" };
  }
  const a = asOf instanceof Date ? asOf.getTime() : Date.parse(String(asOf));
  const d = deadline instanceof Date ? deadline.getTime() : Date.parse(String(deadline));
  if (!Number.isFinite(a) || !Number.isFinite(d)) {
    return { ok: false, status: "unparseable_date" };
  }
  if (a < d) return { ok: true, status: "before_deadline", allowed: true };
  if (a === d) return { ok: true, status: "exactly_at_deadline", allowed: true };
  return { ok: true, status: "after_deadline", allowed: false };
}

/**
 * Schema preflight: report all missing tables/fields before any write.
 * Performs no writes. fieldTypeHints is optional { table: { field: typeName } }.
 */
function runSchemaPreflight({
  availableTables = {},
  requiredTables = [],
  requiredFieldsByTable = {},
  fieldTypeHints = {},
} = {}) {
  const missingTables = [];
  const missingFields = [];
  const typeMismatches = [];
  for (const tableName of requiredTables) {
    if (!availableTables[tableName]) {
      missingTables.push(tableName);
      continue;
    }
    const table = availableTables[tableName];
    const fields = table.fields || {};
    for (const fieldName of requiredFieldsByTable[tableName] || []) {
      if (!fields[fieldName]) {
        missingFields.push({ table: tableName, field: fieldName });
        continue;
      }
      const expectedType = (fieldTypeHints[tableName] || {})[fieldName];
      if (expectedType && fields[fieldName].type && fields[fieldName].type !== expectedType) {
        typeMismatches.push({
          table: tableName,
          field: fieldName,
          expected: expectedType,
          actual: fields[fieldName].type,
        });
      }
    }
  }
  const ok = missingTables.length === 0 && missingFields.length === 0 && typeMismatches.length === 0;
  return {
    ok,
    canWrite: ok,
    missingTables,
    missingFields,
    typeMismatches,
    action: ok ? "preflight_pass" : "preflight_fail_no_writes",
  };
}

/**
 * Dry-run flag: opt-in only. Absent / blank / false → live mode.
 * Truthy strings: "true"|"1"|"yes"|"dry"|"dry-run"|"dryrun"
 */
function parseDryRunFlag(inputConfig = {}) {
  const raw = inputConfig.dryRun != null ? inputConfig.dryRun : inputConfig.dry_run;
  if (raw == null || raw === "") return false;
  if (raw === true || raw === 1) return true;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "dry" || s === "dry-run" || s === "dryrun";
}

/**
 * Structured dry-run plan — read/calculate only; caller must not write when dryRun.
 */
function buildDryRunPlan({
  dryRun = false,
  intendedWrites = [],
  calculated = {},
  skipped = [],
  errors = [],
} = {}) {
  return {
    dryRun: Boolean(dryRun),
    willWrite: !dryRun && intendedWrites.length > 0 && errors.length === 0,
    intendedWrites: dryRun || !dryRun ? intendedWrites : [],
    calculated,
    skipped,
    errors,
    note: dryRun
      ? "Dry-run: no Airtable writes performed"
      : "Live mode: intendedWrites may be applied by caller",
  };
}

function requireRecordId(recordId) {
  if (!recordId || typeof recordId !== "string" || !String(recordId).startsWith("rec")) {
    return {
      ok: false,
      error: `Missing or invalid automation input variable recordId: ${recordId == null ? "(absent)" : recordId}`,
    };
  }
  return { ok: true, recordId: String(recordId).trim() };
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
  EMAIL_SEND_PREFIX,
  REVIEW_STATUSES,
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
  normalizeBoolean,
  resolveCheckboxYesNoPrecedence,
  resolveEffectiveConfigValue,
  calculateRecordingXp,
  buildApprovalEmailSendKey,
  normalizeLookupIds,
  normalizeLookupScalar,
  compareAgainstDeadline,
  runSchemaPreflight,
  parseDryRunFlag,
  buildDryRunPlan,
  requireRecordId,
};
