/*
GitHub header
Automation: 121 - Zoom Recording Credit - Award Half XP
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — NOT Live until DEV disposable proof + Mike Production paste

Purpose:
Award half Zoom XP for approved recording credit distinct from live 101 attendance.

Trigger:
Zoom Attendance when recording approval satisfied and exclusivity guards pass.

Important Tables:
Zoom Attendance, Zoom Meetings, Enrollments, XP Reward Rules, XP Events, Config

Important Fields:
Recording Quiz Satisfactory?, Zoom Credit Conflict?, Enrollment, Zoom Meeting, Source Key

Notes:
GitHub is the source-of-truth copy. Automation slot **121** assigned 2026-09-02 (backlog SC-147).
Does NOT replace or extend automation 117 (email handoff only).
Never writes Zoom Meetings.Attendees.
Authority: docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md (SC-147 / MRW-H10)
*/

/************************************************************
 * 121 - ZOOM RECORDING CREDIT - AWARD HALF XP
 * Award Half XP from Approved Recording Credit (SC-147)
 *
 * Version: v1.0
 * Date Written: 2026-08-30
 * Last Updated: 2026-09-02
 *
 * PURPOSE
 * - Runs from one Zoom Attendance record on the recording-credit path.
 * - Creates exactly one XP Event with Source Key
 *   ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}.
 * - Awards floor(live/2) XP from XP Reward Rules row ZOOM_RECORDING when present,
 *   else floor(ZOOM_ATTEND_BASE / 2) with optional Config percent override.
 * - Skips when live 101 credit already exists for the same meeting+enrollment.
 * - Skips when Zoom Credit Conflict? rollup equals 1.
 * - Idempotent: rerun skips when Source Key already exists on an active XP Event.
 *
 * IMPORTANT DESIGN RULES
 * - Live attendance remains automation 101 (ZOOM_ATTEND_* / ZOOM_LIVE keys only).
 * - Automation 117 is email-only — this script must not create Email Handoff Queue rows.
 * - Never write Zoom Meetings.Attendees (gate may use Recording Attendees separately).
 * - Recording-only credit must NOT count toward Perfect Week (057 reads live Attendees).
 * - One source meeting+enrollment pair → at most one of live or recording active XP.
 * - Do not write formula/rollup/lookup/count fields.
 * - XP Events reason fields: XP Reason Public / XP Reason Debug.
 * - Source Key: ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}
 *
 * THIS IS NOT
 * - Live Zoom attendance award (101).
 * - Parent approval email send (117).
 * - Perfect Week eligibility calculation (057).
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 *
 * AUTOMATION NAME
 * - 121 - Zoom Recording Credit - Award Half XP (SC-147)
 *
 * TRIGGER TABLE
 * - Zoom Attendance
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Attendance Method is Recording Quiz (or equivalent catalog value)
 * - Recording Quiz Satisfactory? is checked
 * - Zoom Credit Conflict? is not 1
 *
 * DO NOT USE THIS TRIGGER ON
 * - Automation 117 email handoff path (different responsibility)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Zoom Attendance record ID
 *
 * REQUIRED OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created | skipped_* | error
 * - errorOut
 * - debugStep
 * - sourceKeyOut
 * - xpEventIdOut
 * - xpAmountOut
 *
 * OPTIONAL OUTPUTS
 * - awardReasonOut
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "121 - Zoom Recording Credit - Award Half XP (SC-147)",
  version: "v1.0",
  versionDate: "2026-09-02",
  originalWrittenDate: "2026-08-30",
  lastUpdated: "2026-09-02",
  folder: "17 - Zoom Recording Credit",
  automationName: "121 - Zoom Recording Credit - Award Half XP (SC-147)",
};

const CONFIG = {
  timeZone: "America/Denver",

  tables: {
    zoomAttendance: "Zoom Attendance",
    zoomMeetings: "Zoom Meetings",
    enrollments: "Enrollments",
    xpRewardRules: "XP Reward Rules",
    xpEvents: "XP Events",
    config: "Config",
  },

  zoomAttendance: {
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    satisfactory: "Recording Quiz Satisfactory?",
    conflict: "Zoom Credit Conflict?",
    week: "Week",
    xpEvent: "XP Event",
  },

  zoom: {
    attendees: "Attendees",
    week: "Week",
    startTime: "Start Time",
  },

  enrollments: {
    active: "Active?",
    progressProcessingEnabled: "Progress Processing Enabled?",
    schoolYear: "School Year",
  },

  xpRewardRules: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
  },

  xpEvents: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    week: "Week",
    activityDate: "Activity Date",
    xpActivityDate: "XP Activity Date",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    active: "Active?",
    zoomMeeting: "Zoom Meeting",
    zoomAttendance: "Zoom Attendance",
    awardedBy: "Awarded By",
  },

  configFields: {
    activeSchoolYear: "Active School Year",
    xpPercent: "Zoom Recording XP Percent of Live",
  },

  values: {
    sourceKeyPrefix: "ZOOM_RECORDING_CREDIT",
    ruleKeyLiveBase: "ZOOM_ATTEND_BASE",
    ruleKeyRecording: "ZOOM_RECORDING",
    liveLegacyPrefix: "ZOOM_ATTEND_BASE",
    liveCanonicalPrefix: "ZOOM_LIVE",
    xpBucket: "Zoom",
    xpSource: "Zoom Recording",
    reasonPublic: "Zoom recording credit (half XP)",
  },
};

/* =========================================================
   SECTION 1 — SCHEMA + I/O HELPERS
========================================================= */

const fieldCache = new Map();

function log(message, data = null) {
  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch (error) {
    log(`output.set failed for ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }
}

function unloadQuerySafe(queryResult) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      log("Query unloadData skipped/failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;
  const cacheKey = `${table.name || "unknown"}:${fieldName}`;
  if (fieldCache.has(cacheKey)) return fieldCache.get(cacheKey);
  try {
    const field = table.getField(fieldName);
    fieldCache.set(cacheKey, field);
    return field;
  } catch {
    fieldCache.set(cacheKey, null);
    return null;
  }
}

function fieldExists(table, fieldName) {
  return !!getFieldSafe(table, fieldName);
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
  }
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.isComputed === true) return false;
  const nonWritable = new Set([
    "formula", "rollup", "count", "lookup", "multipleLookupValues",
    "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
    "autoNumber", "button", "aiText", "externalSyncSource",
  ]);
  return !nonWritable.has(field.type);
}

function requireWritableField(table, fieldName) {
  requireField(table, fieldName);
  if (!isWritableField(table, fieldName)) {
    throw new Error(`Field ${table.name}.${fieldName} exists but is not writable.`);
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function singleSelectOptionExists(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return true;
  return field.options?.choices?.some(
    (choice) => normalizeText(choice?.name) === normalizeText(optionName),
  ) === true;
}

function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return optionName;
  const match = (field.options?.choices || []).find(
    (choice) => normalizeText(choice?.name) === normalizeText(optionName),
  );
  if (!match) {
    const available = (field.options?.choices || []).map((c) => c.name).join(", ");
    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available: ${available}`,
    );
  }
  return { id: match.id };
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = 0) {
  const raw = getRaw(record, table, fieldName);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw ?? "").replace(/[$,%]/g, "").replace(/,/g, "").trim();
  if (!text) return fallback;
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function getCheckbox(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const text = String(raw ?? "").trim().toLowerCase();
  return ["true", "yes", "checked", "1", "active"].includes(text);
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => item?.id).filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  const ids = getLinkedIds(record, table, fieldName);
  return ids[0] || "";
}

function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function denverDateKey(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addIfWritable(table, payload, fieldName, value) {
  if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) return;
  if (value === undefined) return;
  payload[fieldName] = value;
}

/* =========================================================
   SECTION 2 — SC-147 LIB HELPERS
   Synced from lib/sc-147-zoom-recording-credit.js (offline tests)
========================================================= */

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

function buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId) {
  return `${CONFIG.values.sourceKeyPrefix}|${assertValidRecordId(enrollmentId, "enrollmentId")}|${assertValidRecordId(zoomMeetingId, "zoomMeetingId")}`;
}

function isSc147RecordingCreditKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${CONFIG.values.sourceKeyPrefix}|`);
}

function is101LiveCreditKey(sourceKey) {
  const key = String(sourceKey || "");
  return (
    key.startsWith(`${CONFIG.values.liveLegacyPrefix}|`)
    || key.startsWith(`${CONFIG.values.liveCanonicalPrefix}|`)
  );
}

function pairTokenFrom101Key(sourceKey) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3) return null;
  const [prefix, mid, enrollmentId] = parts;
  if (prefix === CONFIG.values.liveCanonicalPrefix) return `${mid}|${enrollmentId}`;
  if (prefix === CONFIG.values.liveLegacyPrefix && String(mid).startsWith("rec")) {
    return `${mid}|${enrollmentId}`;
  }
  return null;
}

function activeLivePairs(xpRows = []) {
  const live = new Set();
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    const key = row.sourceKey || "";
    if (!is101LiveCreditKey(key)) continue;
    const token = pairTokenFrom101Key(key);
    if (token) live.add(token);
  }
  return live;
}

function activeRecordingCreditKeys(xpRows = []) {
  const keys = new Set();
  for (const row of xpRows) {
    if (!row || row.active === false) continue;
    if (isSc147RecordingCreditKey(row.sourceKey)) keys.add(row.sourceKey);
  }
  return keys;
}

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
    if (n >= 0 && n <= 100) return Math.floor((live * n) / 100);
  }
  return Math.floor(live / 2);
}

function selectSc147XpRewardRules(rules = []) {
  const liveMatches = rules.filter(
    (r) => r && r.active !== false && String(r.ruleKey) === CONFIG.values.ruleKeyLiveBase,
  );
  const recordingMatches = rules.filter(
    (r) => r && r.active !== false && String(r.ruleKey) === CONFIG.values.ruleKeyRecording,
  );
  return {
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
  if (selected.recordingStatus === "ok") recordingAmount = Number(selected.recording.xpAmount);
  const xpAmount = computeSc147HalfXpAmount({
    liveRuleAmount: liveAmount,
    recordingRuleAmount: recordingAmount,
    config,
  });
  return { ok: true, reason: "ok", selected, xpAmount };
}

const SCHOOL_YEAR_RE = /^(\d{4})-(\d{4})$/;

function normalizeSchoolYear(raw) {
  if (raw == null) return { ok: false, message: "School year is blank or null." };
  const trimmed = String(raw).trim();
  if (!trimmed) return { ok: false, message: "School year is blank after trim." };
  const dashed = trimmed
    .replace(/[\u2013\u2014\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/\s*-\s*/g, "-");
  const match = SCHOOL_YEAR_RE.exec(dashed);
  if (!match) return { ok: false, message: `School year is malformed: "${trimmed}".` };
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end !== start + 1) {
    return { ok: false, message: `School year years must be consecutive: got ${start}-${end}.` };
  }
  return { ok: true, key: `${start}-${end}` };
}

function indexConfigRowsByYear(configTable, configRows) {
  const byYear = new Map();
  for (let i = 0; i < configRows.length; i += 1) {
    const row = configRows[i];
    const yearRaw = getText(row, configTable, CONFIG.configFields.activeSchoolYear);
    const norm = normalizeSchoolYear(yearRaw);
    if (!norm.ok) {
      return { ok: false, message: `Config row[${i}] (${row.id || "no-id"}): ${norm.message}` };
    }
    if (byYear.has(norm.key)) {
      return { ok: false, message: `Duplicate Config rows for school year ${norm.key}.` };
    }
    byYear.set(norm.key, row);
  }
  return { ok: true, byYear };
}

function resolveConfigRowForSchoolYear(configTable, configRows, enrollmentSchoolYear) {
  const indexed = indexConfigRowsByYear(configTable, configRows);
  if (!indexed.ok) return { ok: false, message: indexed.message };

  const enrNorm = enrollmentSchoolYear
    ? normalizeSchoolYear(enrollmentSchoolYear)
    : { ok: false };

  if (!enrNorm.ok) {
    return {
      ok: false,
      message: "No school year available from Enrollment for Config selection.",
    };
  }

  const match = indexed.byYear.get(enrNorm.key);
  if (!match) {
    return { ok: false, message: `No Config row for school year ${enrNorm.key}.` };
  }

  return { ok: true, configRow: match, schoolYearKey: enrNorm.key };
}

function canAwardSc147RecordingCredit({
  enrollmentId,
  zoomMeetingId,
  xpRows = [],
  conflictRollup = 0,
  progressProcessingEnabled = true,
  quizApproved = true,
}) {
  if (!isValidRecordId(enrollmentId) || !isValidRecordId(zoomMeetingId)) {
    return { ok: false, reason: "error_malformed_record_id" };
  }
  if (!progressProcessingEnabled) return { ok: false, reason: "skipped_progress_disabled" };
  if (!quizApproved) return { ok: false, reason: "skipped_not_approved" };
  if (Number(conflictRollup) === 1) return { ok: false, reason: "skipped_conflict_rollup" };

  const sourceKey = buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId);
  if (activeRecordingCreditKeys(xpRows).has(sourceKey)) {
    return { ok: false, reason: "skipped_already_awarded", sourceKey };
  }

  const token = `${zoomMeetingId}|${enrollmentId}`;
  if (activeLivePairs(xpRows).has(token)) {
    return { ok: false, reason: "skipped_live_101_exists", sourceKey };
  }

  return { ok: true, reason: "ok", sourceKey };
}

function decideSc147RecordingXpAction({ sourceKey, awardGate, existingKeys = [] }) {
  if (!sourceKey) return { action: "error", reason: "missing_source_key" };
  if (awardGate && awardGate.ok === false) {
    if (String(awardGate.reason || "").startsWith("error_")) {
      return { action: "error", reason: awardGate.reason };
    }
    return { action: "skipped", reason: awardGate.reason };
  }
  const existing = existingKeys instanceof Set ? existingKeys : new Set(existingKeys);
  if (existing.has(sourceKey)) return { action: "skipped", reason: "skipped_already_awarded" };
  return { action: "create", reason: "ok" };
}

function buildSc147RecordingXpEventFields({
  enrollmentId,
  zoomMeetingId,
  weekId,
  xpAmount,
  activityDateKey,
  zoomAttendanceId,
  scriptVersion = SCRIPT.version,
}) {
  const sourceKey = buildSc147RecordingCreditSourceKey(enrollmentId, zoomMeetingId);
  return {
    sourceKey,
    xpPoints: xpAmount,
    xpBucket: CONFIG.values.xpBucket,
    xpSource: CONFIG.values.xpSource,
    enrollmentId,
    zoomMeetingId,
    weekId: weekId || "",
    activityDateKey: activityDateKey || "",
    zoomAttendanceId: zoomAttendanceId || "",
    reasonPublic: CONFIG.values.reasonPublic,
    reasonDebug: `SC-147 ${scriptVersion} ${sourceKey}`,
  };
}

function mapXpRowsFromQuery(records, table) {
  return records.map((row) => ({
    sourceKey: getText(row, table, CONFIG.xpEvents.sourceKey),
    active: fieldExists(table, CONFIG.xpEvents.active) ? getCheckbox(row, table, CONFIG.xpEvents.active) : true,
  }));
}

function skipWithOutputs({ actionOut, debugStep, sourceKey = "", awardReason = "" }) {
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("statusOut", "skipped");
  setOutputSafe("debugStep", debugStep);
  if (sourceKey) setOutputSafe("sourceKeyOut", sourceKey);
  if (awardReason) setOutputSafe("awardReasonOut", awardReason);
}

/* =========================================================
   SECTION 3 — MAIN
========================================================= */

async function main() {
  setOutputSafe("debugStep", "01 - start");
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", "");
  setOutputSafe("sourceKeyOut", "");
  setOutputSafe("xpEventIdOut", "");
  setOutputSafe("xpAmountOut", 0);
  setOutputSafe("awardReasonOut", "");

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();
  if (!isValidRecordId(recordId)) {
    setOutputSafe("errorOut", "Missing or invalid recordId");
    setOutputSafe("debugStep", "02 - validate_input");
    throw new Error("Missing or invalid recordId");
  }

  setOutputSafe("debugStep", "03 - validate_schema");
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const rulesTable = base.getTable(CONFIG.tables.xpRewardRules);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  requireField(zaTable, CONFIG.zoomAttendance.enrollment);
  requireField(zaTable, CONFIG.zoomAttendance.zoomMeeting);
  requireField(zaTable, CONFIG.zoomAttendance.satisfactory);
  requireField(zaTable, CONFIG.zoomAttendance.conflict);
  requireWritableField(xpTable, CONFIG.xpEvents.sourceKey);
  requireWritableField(xpTable, CONFIG.xpEvents.enrollment);
  requireWritableField(xpTable, CONFIG.xpEvents.xpPoints);
  requireWritableField(xpTable, CONFIG.xpEvents.active);
  requireWritableField(xpTable, CONFIG.xpEvents.reasonPublic);
  requireWritableField(xpTable, CONFIG.xpEvents.reasonDebug);
  requireField(rulesTable, CONFIG.xpRewardRules.ruleKey);
  requireField(rulesTable, CONFIG.xpRewardRules.xpAmount);
  requireField(rulesTable, CONFIG.xpRewardRules.active);

  if (fieldExists(xpTable, CONFIG.xpEvents.xpBucket)) {
    requireSingleSelectOptionSafe(xpTable, CONFIG.xpEvents.xpBucket, CONFIG.values.xpBucket);
  }
  if (fieldExists(xpTable, CONFIG.xpEvents.xpSource)) {
    requireSingleSelectOptionSafe(xpTable, CONFIG.xpEvents.xpSource, CONFIG.values.xpSource);
  }

  setOutputSafe("debugStep", "04 - load_zoom_attendance");
  const za = await zaTable.selectRecordAsync(recordId);
  if (!za) {
    setOutputSafe("errorOut", "Zoom Attendance record not found");
    throw new Error("Zoom Attendance record not found");
  }

  const enrollmentId = getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.enrollment);
  const meetingId = getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.zoomMeeting);
  if (!isValidRecordId(enrollmentId) || !isValidRecordId(meetingId)) {
    skipWithOutputs({ actionOut: "skipped_missing_links", debugStep: "05 - validate_links" });
    return;
  }

  const quizApproved = getCheckbox(za, zaTable, CONFIG.zoomAttendance.satisfactory);
  const conflictRollup = getNumber(za, zaTable, CONFIG.zoomAttendance.conflict, 0);

  setOutputSafe("debugStep", "06 - load_enrollment");
  let progressProcessingEnabled = true;
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: [
      CONFIG.enrollments.progressProcessingEnabled,
      CONFIG.enrollments.active,
      CONFIG.enrollments.schoolYear,
    ],
  });
  if (enrollment && fieldExists(enrollmentsTable, CONFIG.enrollments.progressProcessingEnabled)) {
    progressProcessingEnabled = getCheckbox(enrollment, enrollmentsTable, CONFIG.enrollments.progressProcessingEnabled);
  }

  setOutputSafe("debugStep", "07 - scan_existing_xp");
  const xpQuery = await xpTable.selectRecordsAsync({
    fields: [CONFIG.xpEvents.sourceKey, CONFIG.xpEvents.active],
  });

  let xpRows = [];
  try {
    xpRows = mapXpRowsFromQuery(xpQuery.records, xpTable);
  } finally {
    unloadQuerySafe(xpQuery);
  }

  const awardGate = canAwardSc147RecordingCredit({
    enrollmentId,
    zoomMeetingId: meetingId,
    xpRows,
    conflictRollup,
    progressProcessingEnabled,
    quizApproved,
  });

  const sourceKey = awardGate.sourceKey || buildSc147RecordingCreditSourceKey(enrollmentId, meetingId);
  setOutputSafe("sourceKeyOut", sourceKey);

  const decision = decideSc147RecordingXpAction({
    sourceKey,
    awardGate,
    existingKeys: activeRecordingCreditKeys(xpRows),
  });

  if (decision.action === "skipped") {
    skipWithOutputs({
      actionOut: decision.reason,
      debugStep: `08 - gate_${decision.reason}`,
      sourceKey,
      awardReason: decision.reason,
    });
    return;
  }
  if (decision.action === "error") {
    setOutputSafe("errorOut", decision.reason);
    setOutputSafe("debugStep", "08 - gate_error");
    throw new Error(decision.reason);
  }

  setOutputSafe("debugStep", "09 - resolve_xp_rules");
  const rulesQuery = await rulesTable.selectRecordsAsync({
    fields: [
      CONFIG.xpRewardRules.ruleKey,
      CONFIG.xpRewardRules.xpAmount,
      CONFIG.xpRewardRules.active,
    ],
  });

  const ruleRows = [];
  try {
    for (const rule of rulesQuery.records) {
      ruleRows.push({
        ruleKey: getText(rule, rulesTable, CONFIG.xpRewardRules.ruleKey),
        xpAmount: getNumber(rule, rulesTable, CONFIG.xpRewardRules.xpAmount, NaN),
        active: getCheckbox(rule, rulesTable, CONFIG.xpRewardRules.active),
      });
    }
  } finally {
    unloadQuerySafe(rulesQuery);
  }

  let configMap = {};
  try {
    const configTable = base.getTable(CONFIG.tables.config);
    const enrollmentSchoolYear =
      enrollment && fieldExists(enrollmentsTable, CONFIG.enrollments.schoolYear)
        ? getText(enrollment, enrollmentsTable, CONFIG.enrollments.schoolYear)
        : "";
    if (
      fieldExists(configTable, CONFIG.configFields.xpPercent) &&
      fieldExists(configTable, CONFIG.configFields.activeSchoolYear) &&
      enrollmentSchoolYear
    ) {
      const configQuery = await configTable.selectRecordsAsync({
        fields: [CONFIG.configFields.activeSchoolYear, CONFIG.configFields.xpPercent],
      });
      try {
        const resolvedConfig = resolveConfigRowForSchoolYear(
          configTable,
          configQuery.records,
          enrollmentSchoolYear,
        );
        if (resolvedConfig.ok) {
          configMap = {
            [CONFIG.configFields.xpPercent]: getRaw(
              resolvedConfig.configRow,
              configTable,
              CONFIG.configFields.xpPercent,
            ),
          };
        }
      } finally {
        unloadQuerySafe(configQuery);
      }
    }
  } catch {
    // Config table optional — floor(live/2) fallback remains.
  }

  const resolved = resolveSc147XpAmountFromRules(ruleRows, configMap);
  if (!resolved.ok) {
    setOutputSafe("errorOut", `XP Reward Rules error: ${resolved.reason}`);
    setOutputSafe("debugStep", "09 - xp_rules_error");
    throw new Error(`XP Reward Rules error: ${resolved.reason}`);
  }

  const xpAmount = resolved.xpAmount;
  setOutputSafe("xpAmountOut", xpAmount);

  setOutputSafe("debugStep", "10 - resolve_week_and_activity_date");
  const zmTable = base.getTable(CONFIG.tables.zoomMeetings);
  const zmFields = [CONFIG.zoom.week];
  if (fieldExists(zmTable, CONFIG.zoom.startTime)) zmFields.push(CONFIG.zoom.startTime);

  const zm = await zmTable.selectRecordAsync(meetingId, { fields: zmFields });
  const weekId = zm
    ? getFirstLinkedId(zm, zmTable, CONFIG.zoom.week)
    : getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.week);

  const startTime = zm ? getRaw(zm, zmTable, CONFIG.zoom.startTime) : null;
  const activityDateKey = denverDateKey(startTime);

  const fieldPlan = buildSc147RecordingXpEventFields({
    enrollmentId,
    zoomMeetingId: meetingId,
    weekId,
    xpAmount,
    activityDateKey,
    zoomAttendanceId: recordId,
    scriptVersion: SCRIPT.version,
  });

  setOutputSafe("debugStep", "11 - recheck_before_create");
  const recheckQuery = await xpTable.selectRecordsAsync({
    fields: [CONFIG.xpEvents.sourceKey, CONFIG.xpEvents.active],
  });
  try {
    const recheckRows = mapXpRowsFromQuery(recheckQuery.records, xpTable);
    const recheckGate = canAwardSc147RecordingCredit({
      enrollmentId,
      zoomMeetingId: meetingId,
      xpRows: recheckRows,
      conflictRollup,
      progressProcessingEnabled,
      quizApproved,
    });
    const recheckDecision = decideSc147RecordingXpAction({
      sourceKey,
      awardGate: recheckGate,
      existingKeys: activeRecordingCreditKeys(recheckRows),
    });
    if (recheckDecision.action === "skipped") {
      skipWithOutputs({
        actionOut: recheckDecision.reason,
        debugStep: "11 - recheck_skip",
        sourceKey,
        awardReason: recheckDecision.reason,
      });
      return;
    }
    if (recheckDecision.action === "error") {
      setOutputSafe("errorOut", recheckDecision.reason);
      throw new Error(recheckDecision.reason);
    }
  } finally {
    unloadQuerySafe(recheckQuery);
  }

  setOutputSafe("debugStep", "12 - create_xp_event");
  const payload = {};
  payload[CONFIG.xpEvents.sourceKey] = fieldPlan.sourceKey;
  payload[CONFIG.xpEvents.enrollment] = [{ id: enrollmentId }];
  payload[CONFIG.xpEvents.xpPoints] = fieldPlan.xpPoints;
  payload[CONFIG.xpEvents.active] = true;
  payload[CONFIG.xpEvents.reasonPublic] = fieldPlan.reasonPublic;
  payload[CONFIG.xpEvents.reasonDebug] = fieldPlan.reasonDebug;

  addIfWritable(
    xpTable,
    payload,
    CONFIG.xpEvents.xpBucket,
    buildSingleSelectValue(xpTable, CONFIG.xpEvents.xpBucket, fieldPlan.xpBucket),
  );
  addIfWritable(
    xpTable,
    payload,
    CONFIG.xpEvents.xpSource,
    buildSingleSelectValue(xpTable, CONFIG.xpEvents.xpSource, fieldPlan.xpSource),
  );
  if (weekId) addIfWritable(xpTable, payload, CONFIG.xpEvents.week, [{ id: weekId }]);
  if (meetingId) addIfWritable(xpTable, payload, CONFIG.xpEvents.zoomMeeting, [{ id: meetingId }]);
  if (recordId) addIfWritable(xpTable, payload, CONFIG.xpEvents.zoomAttendance, [{ id: recordId }]);
  if (activityDateKey) {
    addIfWritable(xpTable, payload, CONFIG.xpEvents.activityDate, activityDateKey);
    addIfWritable(xpTable, payload, CONFIG.xpEvents.xpActivityDate, activityDateKey);
  }
  addIfWritable(xpTable, payload, CONFIG.xpEvents.awardedBy, SCRIPT.automationName);

  const createdId = await xpTable.createRecordAsync(payload);

  setOutputSafe("xpEventIdOut", createdId);
  setOutputSafe("actionOut", "created");
  setOutputSafe("statusOut", "success");
  setOutputSafe("awardReasonOut", "created");
  setOutputSafe("debugStep", "13 - done");

  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      recordId,
      sourceKey: fieldPlan.sourceKey,
      xpAmount,
      xpEventId: createdId,
      enrollmentId,
      meetingId,
      weekId,
      activityDateKey,
    }),
  );
}

function requireSingleSelectOptionSafe(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return;
  if (!singleSelectOptionExists(table, fieldName, optionName)) {
    const available = (field.options?.choices || []).map((c) => c.name).join(", ");
    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available: ${available}`,
    );
  }
}

try {
  await main();
} catch (error) {
  setOutputSafe("errorOut", error && error.message ? error.message : String(error));
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  throw error;
}
