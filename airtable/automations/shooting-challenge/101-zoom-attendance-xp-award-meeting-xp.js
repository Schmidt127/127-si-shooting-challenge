/*
Automation: 101 - Zoom Attendance XP - Award Meeting XP
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: 2026-06-20

Purpose:
To be confirmed from production script.

Trigger:
To be confirmed from Airtable automation.

Important Tables:
To be confirmed from production script.

Important Fields:
To be confirmed from production script.

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/

/************************************************************
 * 101 - Zoom Attendance XP - Award Meeting XP
 * Version: v5.0
 * Date Revised: 2026-05-28
 *
 * PURPOSE
 * - Runs from one Zoom Meetings record.
 * - Awards Zoom attendance XP to all linked Attendees.
 * - Creates or updates XP Events using stable Source Keys.
 * - Awards base attendance XP for each qualifying attendee.
 * - Awards one-time bonus XP when an attendee reaches meeting #2.
 * - Awards one-time bonus XP when an attendee reaches meeting #3.
 *
 * IMPORTANT DESIGN RULES
 * - Uses shared XP Reward Rules only:
 *      ZOOM_ATTEND_BASE
 *      ZOOM_ATTEND_BONUS_2
 *      ZOOM_ATTEND_BONUS_3
 *
 * - Does NOT require grade-band-specific rule keys such as:
 *      ZOOM_ATTEND_BASE_34
 *
 * - This fixes the prior error:
 *      Base Zoom XP rule not found for Grade Band "3-4".
 *      Expected Rule Key: ZOOM_ATTEND_BASE_34
 *
 * CORRECT TRIGGER SETUP
 * Table: Zoom Meetings
 * Trigger: When record matches conditions
 *
 * Recommended Conditions:
 * - Create XP Events is checked
 * - XP Award Status is not Awarded
 * - Attendees is not empty
 * - Week is not empty
 * - Zoom Meeting Key is not empty
 * - Meeting Status is Completed
 *
 * REQUIRED INPUT VARIABLE
 * - recordId = Airtable record ID from the triggering Zoom Meetings record
 *
 * WRITES
 * - XP Events records
 * - Zoom Meetings.XP Award Status = Awarded
 * - Zoom Meetings.Create XP Events = unchecked
 * - Zoom Meetings.XP Awarded At, if field exists
 * - Zoom Meetings.XP Award Error, if field exists
 ************************************************************/

// @ts-nocheck


/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "101 - Zoom Attendance XP - Award Meeting XP",
  version: "v5.0",

  timeZone: "America/Denver",

  tables: {
    zoomMeetings: "Zoom Meetings",
    enrollments: "Enrollments",
    xpRewardRules: "XP Reward Rules",
    xpEvents: "XP Events",
  },

  zoom: {
    meetingName: "Meeting Name",
    startFieldCandidates: [
      "Start Time",
      "Start Date",
      "Meeting Date",
      "Date",
    ],
    week: "Week",
    attendees: "Attendees",
    createXpEvents: "Create XP Events",
    xpAwardStatus: "XP Award Status",
    zoomMeetingKey: "Zoom Meeting Key",
    meetingStatus: "Meeting Status",
    xpAwardedAt: "XP Awarded At",
    xpAwardError: "XP Award Error",
  },

  enrollments: {
    active: "Active?",
    fullName: "Full Athlete Name",
  },

  xpRewardRules: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    xpSourceLabel: "XP Source Label",
    active: "Active?",
  },

  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket Key",
    xpPoints: "XP Points",
    xpReason: "XP Reason Public",
    active: "Active?",
    sourceKey: "Source Key",
    awardMode: "Award Mode",
    awardedBy: "Awarded By",
    processed: "Processed",
    error: "Error",
    zoomMeeting: "Zoom Meeting",
  },

  ruleKeys: {
    base: "ZOOM_ATTEND_BASE",
    bonus2: "ZOOM_ATTEND_BONUS_2",
    bonus3: "ZOOM_ATTEND_BONUS_3",
  },

  sourceKeys: {
    basePrefix: "ZOOM_ATTEND_BASE",
    bonus2Prefix: "ZOOM_ATTEND_BONUS_2",
    bonus3Prefix: "ZOOM_ATTEND_BONUS_3",
  },

  xpLabels: {
    bucketKey: "Zoom Attendance",
    baseSourceFallback: "Zoom Attendance: Base",
    bonus2SourceFallback: "Zoom Attendance: Bonus 2",
    bonus3SourceFallback: "Zoom Attendance: Bonus 3",
  },

  bonusMeetingCounts: {
    bonus2: 2,
    bonus3: 3,
  },

  statuses: {
    awarded: "Awarded",
    error: "Error",
    completed: "Completed",
    cancelled: "Cancelled",
  },

  values: {
    awardModeAutomatic: "Automatic",
    awardedBy: "Airtable Automation 101",
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  debug: {
    logToConsole: true,
  },
};


/* =========================================================
   SECTION 2: INPUTS
========================================================= */

const inputConfig = input.config();
const recordId = String(inputConfig.recordId || "").trim();

if (!recordId) {
  throw new Error("Missing required input variable: recordId");
}


/* =========================================================
   SECTION 3: TABLE REFERENCES
========================================================= */

const zoomTable = base.getTable(CONFIG.tables.zoomMeetings);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const rulesTable = base.getTable(CONFIG.tables.xpRewardRules);
const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);


/* =========================================================
   SECTION 4: HELPER FUNCTIONS
========================================================= */

function log(message, data = null) {
  if (!CONFIG.debug.logToConsole) return;

  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function setFinalOutputs({
  ok,
  actionOut,
  statusOut,
  errorOut = "",
  zoomMeetingId = recordId,
  meetingName = "",
  zoomMeetingKey = "",
  weekId = "",
  attendeeCount = 0,
  attendeesProcessed = 0,
  attendeesSkipped = 0,
  baseEventsCreated = 0,
  baseEventsUpdated = 0,
  bonusEventsCreated = 0,
  bonusEventsUpdated = 0,
}) {
  setOutputSafe("ok", ok);
  setOutputSafe("actionOut", actionOut || "");
  setOutputSafe("statusOut", statusOut || "");
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("zoomMeetingId", zoomMeetingId || "");
  setOutputSafe("meetingNameOut", meetingName || "");
  setOutputSafe("zoomMeetingKeyOut", zoomMeetingKey || "");
  setOutputSafe("weekIdOut", weekId || "");
  setOutputSafe("attendeeCount", attendeeCount || 0);
  setOutputSafe("attendeesProcessed", attendeesProcessed || 0);
  setOutputSafe("attendeesSkipped", attendeesSkipped || 0);
  setOutputSafe("baseEventsCreated", baseEventsCreated || 0);
  setOutputSafe("baseEventsUpdated", baseEventsUpdated || 0);
  setOutputSafe("bonusEventsCreated", bonusEventsCreated || 0);
  setOutputSafe("bonusEventsUpdated", bonusEventsUpdated || 0);
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  try {
    return table.getField(fieldName);
  } catch {
    return null;
  }
}

function fieldExists(table, fieldName) {
  return Boolean(getFieldSafe(table, fieldName));
}

function firstExistingField(table, fieldNames) {
  for (const fieldName of fieldNames || []) {
    if (fieldExists(table, fieldName)) return fieldName;
  }

  return "";
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;

  const nonWritableTypes = new Set([
    "formula",
    "rollup",
    "count",
    "lookup",
    "multipleLookupValues",
    "createdTime",
    "lastModifiedTime",
    "createdBy",
    "lastModifiedBy",
    "autoNumber",
    "button",
    "aiText",
    "externalSyncSource",
  ]);

  return !nonWritableTypes.has(field.type);
}

function requireField(table, fieldName, label) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field: ${label} (${table.name} -> ${fieldName})`);
  }
}

function requireWritableField(table, fieldName, label) {
  requireField(table, fieldName, label);

  if (!isWritableField(table, fieldName)) {
    throw new Error(`Required field is not writable: ${label} (${table.name} -> ${fieldName})`);
  }
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumber(record, table, fieldName, fallback = null) {
  const raw = getRaw(record, table, fieldName);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBooleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;
  if (raw === 1) return true;
  if (raw === 0) return false;

  const text = String(raw ?? "").trim().toLowerCase();

  return ["1", "true", "yes", "checked", "active", "completed"].includes(text);
}

function getLinkedRecordIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => item?.id || "")
    .filter(Boolean);
}

function getFirstLinkedRecordId(record, table, fieldName) {
  return getLinkedRecordIds(record, table, fieldName)[0] || "";
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeRuleKey(value) {
  return normalizeKey(value).replace(/\s+/g, "");
}

function dateToDateKey(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return "";

    return formatDateInTimeZone(parsed, CONFIG.timeZone);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";

    return formatDateInTimeZone(value, CONFIG.timeZone);
  }

  return "";
}

function formatDateInTimeZone(dateValue, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const year = parts.find(part => part.type === "year")?.value || "";
  const month = parts.find(part => part.type === "month")?.value || "";
  const day = parts.find(part => part.type === "day")?.value || "";

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function compareDateKeys(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

function buildSingleSelectValueOptional(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return undefined;

  const field = getFieldSafe(table, fieldName);
  const cleanOption = String(optionName || "").trim();

  if (!cleanOption) return undefined;

  if (field.type !== "singleSelect") {
    return cleanOption;
  }

  const choices = field.options?.choices || [];
  const match = choices.find(choice =>
    normalizeText(choice.name) === normalizeText(cleanOption)
  );

  if (!match) {
    log(`Skipped missing single-select option: ${table.name}.${fieldName} -> ${cleanOption}`, {
      availableOptions: choices.map(choice => choice.name),
    });

    return undefined;
  }

  return { id: match.id };
}

function buildFieldsToLoad(table, fieldNames) {
  return [...new Set(fieldNames || [])].filter(fieldName => fieldName && fieldExists(table, fieldName));
}

function safeUpdatePayload(table, updates) {
  const payload = {};

  for (const [fieldName, value] of Object.entries(updates || {})) {
    if (!fieldExists(table, fieldName)) continue;
    if (!isWritableField(table, fieldName)) continue;
    if (value === undefined) continue;

    payload[fieldName] = value;
  }

  return payload;
}

async function updateRecordSafe(table, targetRecordId, updates) {
  const payload = safeUpdatePayload(table, updates);

  if (Object.keys(payload).length === 0) return [];

  await table.updateRecordAsync(targetRecordId, payload);

  return Object.keys(payload);
}

function indexActiveRulesByKey(ruleRecords) {
  const index = new Map();

  for (const ruleRecord of ruleRecords) {
    const ruleKey = normalizeRuleKey(
      getText(ruleRecord, rulesTable, CONFIG.xpRewardRules.ruleKey)
    );

    if (!ruleKey) continue;

    const active = fieldExists(rulesTable, CONFIG.xpRewardRules.active)
      ? getBooleanish(ruleRecord, rulesTable, CONFIG.xpRewardRules.active)
      : true;

    if (!active) continue;

    if (!index.has(ruleKey)) {
      index.set(ruleKey, []);
    }

    index.get(ruleKey).push(ruleRecord);
  }

  return index;
}

function findRequiredRule(ruleIndex, requiredRuleKey, label) {
  const normalizedRuleKey = normalizeRuleKey(requiredRuleKey);
  const matches = ruleIndex.get(normalizedRuleKey) || [];

  if (matches.length === 0) {
    throw new Error(
      `${label} Zoom XP rule not found. Expected active XP Reward Rule with Rule Key: ${requiredRuleKey}`
    );
  }

  if (matches.length > 1) {
    const ids = matches.map(record => record.id).join(", ");

    throw new Error(
      `Multiple active ${label} Zoom XP rules found for Rule Key "${requiredRuleKey}". Record IDs: ${ids}`
    );
  }

  const ruleRecord = matches[0];

  const xpAmount = getNumber(
    ruleRecord,
    rulesTable,
    CONFIG.xpRewardRules.xpAmount,
    null
  );

  if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
    throw new Error(
      `${label} Zoom XP rule "${requiredRuleKey}" has blank, zero, or invalid XP Amount.`
    );
  }

  const xpSourceLabel = getText(
    ruleRecord,
    rulesTable,
    CONFIG.xpRewardRules.xpSourceLabel
  );

  return {
    record: ruleRecord,
    ruleKey: requiredRuleKey,
    xpAmount,
    xpSourceLabel,
  };
}

function buildBaseSourceKey(zoomMeetingKey, enrollmentId) {
  return `${CONFIG.sourceKeys.basePrefix}|${zoomMeetingKey}|${enrollmentId}`;
}

function buildBonus2SourceKey(enrollmentId) {
  return `${CONFIG.sourceKeys.bonus2Prefix}|${enrollmentId}`;
}

function buildBonus3SourceKey(enrollmentId) {
  return `${CONFIG.sourceKeys.bonus3Prefix}|${enrollmentId}`;
}

function buildXpReason({
  meetingName,
  zoomMeetingKey,
  enrollmentId,
  attendeeName,
  attendanceCount,
  ruleKey,
  xpPoints,
  xpType,
}) {
  return [
    `Zoom Attendance XP: ${xpType}`,
    meetingName ? `Meeting: ${meetingName}` : "",
    zoomMeetingKey ? `Zoom Meeting Key: ${zoomMeetingKey}` : "",
    attendeeName ? `Attendee: ${attendeeName}` : "",
    enrollmentId ? `Enrollment ID: ${enrollmentId}` : "",
    Number.isFinite(attendanceCount) ? `Qualifying Meeting Count: ${attendanceCount}` : "",
    ruleKey ? `XP Reward Rule Key: ${ruleKey}` : "",
    Number.isFinite(xpPoints) ? `XP Points: ${xpPoints}` : "",
    `Awarded By: ${CONFIG.values.awardedBy}`,
  ].filter(Boolean).join("\n");
}

function buildXpEventPayload({
  enrollmentId,
  weekId,
  source,
  bucketKey,
  points,
  reason,
  sourceKey,
  zoomMeetingId,
}) {
  const payload = {
    [CONFIG.xpEvents.enrollment]: linkedCell([enrollmentId]),
    [CONFIG.xpEvents.week]: weekId ? linkedCell([weekId]) : undefined,
    [CONFIG.xpEvents.xpSource]: buildSingleSelectValueOptional(
      xpEventsTable,
      CONFIG.xpEvents.xpSource,
      source
    ),
    [CONFIG.xpEvents.xpBucketKey]: buildSingleSelectValueOptional(
      xpEventsTable,
      CONFIG.xpEvents.xpBucketKey,
      bucketKey
    ),
    [CONFIG.xpEvents.xpPoints]: points,
    [CONFIG.xpEvents.xpReason]: reason,
    [CONFIG.xpEvents.active]: true,
    [CONFIG.xpEvents.sourceKey]: sourceKey,
    [CONFIG.xpEvents.awardMode]: buildSingleSelectValueOptional(
      xpEventsTable,
      CONFIG.xpEvents.awardMode,
      CONFIG.values.awardModeAutomatic
    ),
    [CONFIG.xpEvents.awardedBy]: CONFIG.values.awardedBy,
    [CONFIG.xpEvents.processed]: true,
    [CONFIG.xpEvents.error]: "",
    [CONFIG.xpEvents.zoomMeeting]: fieldExists(xpEventsTable, CONFIG.xpEvents.zoomMeeting)
      ? linkedCell([zoomMeetingId])
      : undefined,
  };

  return safeUpdatePayload(xpEventsTable, payload);
}

async function createOrUpdateXpEvent({
  sourceKeyIndex,
  sourceKey,
  enrollmentId,
  weekId,
  source,
  bucketKey,
  points,
  reason,
  zoomMeetingId,
}) {
  const payload = buildXpEventPayload({
    enrollmentId,
    weekId,
    source,
    bucketKey,
    points,
    reason,
    sourceKey,
    zoomMeetingId,
  });

  if (Object.keys(payload).length === 0) {
    throw new Error(`No writable XP Event fields available for Source Key: ${sourceKey}`);
  }

  const normalizedSourceKey = normalizeKey(sourceKey);
  const existingRecord = sourceKeyIndex.get(normalizedSourceKey) || null;

  if (existingRecord) {
    await xpEventsTable.updateRecordAsync(existingRecord.id, payload);

    return {
      action: "updated",
      recordId: existingRecord.id,
    };
  }

  const createdRecordId = await xpEventsTable.createRecordAsync(payload);

  sourceKeyIndex.set(normalizedSourceKey, {
    id: createdRecordId,
    getCellValue: () => null,
    getCellValueAsString: () => "",
  });

  return {
    action: "created",
    recordId: createdRecordId,
  };
}


/* =========================================================
   SECTION 5: SCHEMA VALIDATION
========================================================= */

const zoomStartField = firstExistingField(
  zoomTable,
  CONFIG.zoom.startFieldCandidates
);

if (!zoomStartField) {
  throw new Error(
    `Missing Zoom Meetings date/start field. Expected one of: ${CONFIG.zoom.startFieldCandidates.join(", ")}`
  );
}

requireField(zoomTable, CONFIG.zoom.week, "Zoom Meetings -> Week");
requireField(zoomTable, CONFIG.zoom.attendees, "Zoom Meetings -> Attendees");
requireField(zoomTable, CONFIG.zoom.createXpEvents, "Zoom Meetings -> Create XP Events");
requireField(zoomTable, CONFIG.zoom.xpAwardStatus, "Zoom Meetings -> XP Award Status");
requireField(zoomTable, CONFIG.zoom.zoomMeetingKey, "Zoom Meetings -> Zoom Meeting Key");

requireField(rulesTable, CONFIG.xpRewardRules.ruleKey, "XP Reward Rules -> Rule Key");
requireField(rulesTable, CONFIG.xpRewardRules.xpAmount, "XP Reward Rules -> XP Amount");

requireWritableField(xpEventsTable, CONFIG.xpEvents.enrollment, "XP Events -> Enrollment");
requireWritableField(xpEventsTable, CONFIG.xpEvents.xpPoints, "XP Events -> XP Points");
requireWritableField(xpEventsTable, CONFIG.xpEvents.xpReason, "XP Events -> XP Reason");
requireWritableField(xpEventsTable, CONFIG.xpEvents.active, "XP Events -> Active?");
requireWritableField(xpEventsTable, CONFIG.xpEvents.sourceKey, "XP Events -> Source Key");


/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "start";

  let meetingName = "";
  let zoomMeetingKey = "";
  let weekId = "";
  let attendeeCount = 0;
  let attendeesProcessed = 0;
  let attendeesSkipped = 0;
  let baseEventsCreated = 0;
  let baseEventsUpdated = 0;
  let bonusEventsCreated = 0;
  let bonusEventsUpdated = 0;

  try {
    debugStep = "load_zoom_meeting";
    setOutputSafe("debugStep", debugStep);

    const zoomRecord = await zoomTable.selectRecordAsync(recordId, {
      fields: buildFieldsToLoad(zoomTable, [
        CONFIG.zoom.meetingName,
        zoomStartField,
        CONFIG.zoom.week,
        CONFIG.zoom.attendees,
        CONFIG.zoom.createXpEvents,
        CONFIG.zoom.xpAwardStatus,
        CONFIG.zoom.zoomMeetingKey,
        CONFIG.zoom.meetingStatus,
      ]),
    });

    if (!zoomRecord) {
      throw new Error(`Zoom Meeting record not found: ${recordId}`);
    }

    meetingName = getText(zoomRecord, zoomTable, CONFIG.zoom.meetingName) || zoomRecord.name;
    zoomMeetingKey = getText(zoomRecord, zoomTable, CONFIG.zoom.zoomMeetingKey);
    weekId = getFirstLinkedRecordId(zoomRecord, zoomTable, CONFIG.zoom.week);

    const createXpEvents = getBooleanish(
      zoomRecord,
      zoomTable,
      CONFIG.zoom.createXpEvents
    );

    const currentAwardStatus = getText(
      zoomRecord,
      zoomTable,
      CONFIG.zoom.xpAwardStatus
    );

    const meetingStatus = getText(
      zoomRecord,
      zoomTable,
      CONFIG.zoom.meetingStatus
    );

    const meetingDateKey = dateToDateKey(
      getRaw(zoomRecord, zoomTable, zoomStartField)
    );

    const attendeeIds = [
      ...new Set(getLinkedRecordIds(zoomRecord, zoomTable, CONFIG.zoom.attendees)),
    ];

    attendeeCount = attendeeIds.length;

    if (!createXpEvents) {
      setFinalOutputs({
        ok: true,
        actionOut: "skipped_create_xp_events_not_checked",
        statusOut: CONFIG.values.skipped,
        meetingName,
        zoomMeetingKey,
        weekId,
        attendeeCount,
      });
      return;
    }

    if (normalizeText(currentAwardStatus) === normalizeText(CONFIG.statuses.awarded)) {
      setFinalOutputs({
        ok: true,
        actionOut: "skipped_already_awarded",
        statusOut: CONFIG.values.skipped,
        meetingName,
        zoomMeetingKey,
        weekId,
        attendeeCount,
      });
      return;
    }

    if (
      fieldExists(zoomTable, CONFIG.zoom.meetingStatus) &&
      normalizeText(meetingStatus) !== normalizeText(CONFIG.statuses.completed)
    ) {
      setFinalOutputs({
        ok: true,
        actionOut: "skipped_meeting_not_completed",
        statusOut: CONFIG.values.skipped,
        errorOut: `Skipped: Meeting Status is "${meetingStatus}", not "${CONFIG.statuses.completed}".`,
        meetingName,
        zoomMeetingKey,
        weekId,
        attendeeCount,
      });
      return;
    }

    if (!weekId) {
      throw new Error("Zoom Meeting is missing Week.");
    }

    if (!zoomMeetingKey) {
      throw new Error("Zoom Meeting is missing Zoom Meeting Key.");
    }

    if (!meetingDateKey) {
      throw new Error(`Zoom Meeting is missing a valid date in field "${zoomStartField}".`);
    }

    if (attendeeIds.length === 0) {
      throw new Error("Zoom Meeting has no linked Attendees.");
    }

    debugStep = "load_source_records";
    setOutputSafe("debugStep", debugStep);

    const [enrollmentsQuery, rulesQuery, xpEventsQuery, zoomHistoryQuery] = await Promise.all([
      enrollmentsTable.selectRecordsAsync({
        fields: buildFieldsToLoad(enrollmentsTable, [
          CONFIG.enrollments.active,
          CONFIG.enrollments.fullName,
        ]),
      }),
      rulesTable.selectRecordsAsync({
        fields: buildFieldsToLoad(rulesTable, [
          CONFIG.xpRewardRules.ruleKey,
          CONFIG.xpRewardRules.xpAmount,
          CONFIG.xpRewardRules.xpSourceLabel,
          CONFIG.xpRewardRules.active,
        ]),
      }),
      xpEventsTable.selectRecordsAsync({
        fields: buildFieldsToLoad(xpEventsTable, [
          CONFIG.xpEvents.enrollment,
          CONFIG.xpEvents.week,
          CONFIG.xpEvents.xpSource,
          CONFIG.xpEvents.xpBucketKey,
          CONFIG.xpEvents.xpPoints,
          CONFIG.xpEvents.xpReason,
          CONFIG.xpEvents.active,
          CONFIG.xpEvents.sourceKey,
          CONFIG.xpEvents.awardMode,
          CONFIG.xpEvents.awardedBy,
          CONFIG.xpEvents.processed,
          CONFIG.xpEvents.error,
          CONFIG.xpEvents.zoomMeeting,
        ]),
      }),
      zoomTable.selectRecordsAsync({
        fields: buildFieldsToLoad(zoomTable, [
          CONFIG.zoom.meetingName,
          zoomStartField,
          CONFIG.zoom.week,
          CONFIG.zoom.attendees,
          CONFIG.zoom.xpAwardStatus,
          CONFIG.zoom.zoomMeetingKey,
          CONFIG.zoom.meetingStatus,
        ]),
      }),
    ]);

    const enrollmentById = new Map(
      enrollmentsQuery.records.map(record => [record.id, record])
    );

    const ruleIndex = indexActiveRulesByKey(rulesQuery.records);

    const baseRule = findRequiredRule(
      ruleIndex,
      CONFIG.ruleKeys.base,
      "Base"
    );

    const bonus2Rule = findRequiredRule(
      ruleIndex,
      CONFIG.ruleKeys.bonus2,
      "Bonus 2"
    );

    const bonus3Rule = findRequiredRule(
      ruleIndex,
      CONFIG.ruleKeys.bonus3,
      "Bonus 3"
    );

    const sourceKeyIndex = new Map();

    for (const xpRecord of xpEventsQuery.records) {
      const existingSourceKey = getText(
        xpRecord,
        xpEventsTable,
        CONFIG.xpEvents.sourceKey
      );

      if (!existingSourceKey) continue;

      sourceKeyIndex.set(normalizeKey(existingSourceKey), xpRecord);
    }

    debugStep = "process_attendees";
    setOutputSafe("debugStep", debugStep);

    for (const enrollmentId of attendeeIds) {
      const enrollmentRecord = enrollmentById.get(enrollmentId);

      if (!enrollmentRecord) {
        attendeesSkipped += 1;

        log("Skipped attendee because Enrollment record was not found", {
          enrollmentId,
        });

        continue;
      }

      if (
        fieldExists(enrollmentsTable, CONFIG.enrollments.active) &&
        !getBooleanish(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.active)
      ) {
        attendeesSkipped += 1;

        log("Skipped inactive attendee Enrollment", {
          enrollmentId,
        });

        continue;
      }

      const attendeeName = fieldExists(enrollmentsTable, CONFIG.enrollments.fullName)
        ? getText(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.fullName)
        : enrollmentRecord.name;

      const qualifyingMeetingKeys = new Set();

      for (const meetingRecord of zoomHistoryQuery.records) {
        const historicalMeetingKey = getText(
          meetingRecord,
          zoomTable,
          CONFIG.zoom.zoomMeetingKey
        );

        if (!historicalMeetingKey) continue;

        const historicalWeekId = getFirstLinkedRecordId(
          meetingRecord,
          zoomTable,
          CONFIG.zoom.week
        );

        if (!historicalWeekId) continue;

        const historicalDateKey = dateToDateKey(
          getRaw(meetingRecord, zoomTable, zoomStartField)
        );

        if (!historicalDateKey) continue;

        if (compareDateKeys(historicalDateKey, meetingDateKey) > 0) {
          continue;
        }

        if (
          fieldExists(zoomTable, CONFIG.zoom.meetingStatus) &&
          normalizeText(getText(meetingRecord, zoomTable, CONFIG.zoom.meetingStatus)) !==
            normalizeText(CONFIG.statuses.completed)
        ) {
          continue;
        }

        const historicalAttendeeIds = getLinkedRecordIds(
          meetingRecord,
          zoomTable,
          CONFIG.zoom.attendees
        );

        if (!historicalAttendeeIds.includes(enrollmentId)) continue;

        qualifyingMeetingKeys.add(historicalMeetingKey);
      }

      const attendanceCount = qualifyingMeetingKeys.size;

      const baseSourceKey = buildBaseSourceKey(zoomMeetingKey, enrollmentId);

      const baseResult = await createOrUpdateXpEvent({
        sourceKeyIndex,
        sourceKey: baseSourceKey,
        enrollmentId,
        weekId,
        source: baseRule.xpSourceLabel || CONFIG.xpLabels.baseSourceFallback,
        bucketKey: CONFIG.xpLabels.bucketKey,
        points: baseRule.xpAmount,
        reason: buildXpReason({
          meetingName,
          zoomMeetingKey,
          enrollmentId,
          attendeeName,
          attendanceCount,
          ruleKey: baseRule.ruleKey,
          xpPoints: baseRule.xpAmount,
          xpType: "Base Attendance",
        }),
        zoomMeetingId: recordId,
      });

      if (baseResult.action === "created") {
        baseEventsCreated += 1;
      } else {
        baseEventsUpdated += 1;
      }

      if (attendanceCount === CONFIG.bonusMeetingCounts.bonus2) {
        const bonus2SourceKey = buildBonus2SourceKey(enrollmentId);

        const bonus2Result = await createOrUpdateXpEvent({
          sourceKeyIndex,
          sourceKey: bonus2SourceKey,
          enrollmentId,
          weekId,
          source: bonus2Rule.xpSourceLabel || CONFIG.xpLabels.bonus2SourceFallback,
          bucketKey: CONFIG.xpLabels.bucketKey,
          points: bonus2Rule.xpAmount,
          reason: buildXpReason({
            meetingName,
            zoomMeetingKey,
            enrollmentId,
            attendeeName,
            attendanceCount,
            ruleKey: bonus2Rule.ruleKey,
            xpPoints: bonus2Rule.xpAmount,
            xpType: "Meeting Count 2 Bonus",
          }),
          zoomMeetingId: recordId,
        });

        if (bonus2Result.action === "created") {
          bonusEventsCreated += 1;
        } else {
          bonusEventsUpdated += 1;
        }
      }

      if (attendanceCount === CONFIG.bonusMeetingCounts.bonus3) {
        const bonus3SourceKey = buildBonus3SourceKey(enrollmentId);

        const bonus3Result = await createOrUpdateXpEvent({
          sourceKeyIndex,
          sourceKey: bonus3SourceKey,
          enrollmentId,
          weekId,
          source: bonus3Rule.xpSourceLabel || CONFIG.xpLabels.bonus3SourceFallback,
          bucketKey: CONFIG.xpLabels.bucketKey,
          points: bonus3Rule.xpAmount,
          reason: buildXpReason({
            meetingName,
            zoomMeetingKey,
            enrollmentId,
            attendeeName,
            attendanceCount,
            ruleKey: bonus3Rule.ruleKey,
            xpPoints: bonus3Rule.xpAmount,
            xpType: "Meeting Count 3 Bonus",
          }),
          zoomMeetingId: recordId,
        });

        if (bonus3Result.action === "created") {
          bonusEventsCreated += 1;
        } else {
          bonusEventsUpdated += 1;
        }
      }

      attendeesProcessed += 1;
    }

    if (attendeesProcessed === 0) {
      throw new Error("No attendees were processed. Check Attendees and Enrollment Active? values.");
    }

    debugStep = "write_zoom_success";
    setOutputSafe("debugStep", debugStep);

    await updateRecordSafe(zoomTable, recordId, {
      [CONFIG.zoom.xpAwardStatus]: buildSingleSelectValueOptional(
        zoomTable,
        CONFIG.zoom.xpAwardStatus,
        CONFIG.statuses.awarded
      ),
      [CONFIG.zoom.createXpEvents]: false,
      [CONFIG.zoom.xpAwardedAt]: new Date().toISOString(),
      [CONFIG.zoom.xpAwardError]: "",
    });

    setFinalOutputs({
      ok: true,
      actionOut: "awarded_zoom_attendance_xp",
      statusOut: CONFIG.values.success,
      errorOut: "",
      meetingName,
      zoomMeetingKey,
      weekId,
      attendeeCount,
      attendeesProcessed,
      attendeesSkipped,
      baseEventsCreated,
      baseEventsUpdated,
      bonusEventsCreated,
      bonusEventsUpdated,
    });

    log("Automation 101 complete", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      recordId,
      meetingName,
      zoomMeetingKey,
      weekId,
      attendeeCount,
      attendeesProcessed,
      attendeesSkipped,
      baseEventsCreated,
      baseEventsUpdated,
      bonusEventsCreated,
      bonusEventsUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);

    await updateRecordSafe(zoomTable, recordId, {
      [CONFIG.zoom.xpAwardStatus]: buildSingleSelectValueOptional(
        zoomTable,
        CONFIG.zoom.xpAwardStatus,
        CONFIG.statuses.error
      ),
      [CONFIG.zoom.xpAwardError]: message,
    });

    setFinalOutputs({
      ok: false,
      actionOut: "error",
      statusOut: CONFIG.values.error,
      errorOut: message,
      meetingName,
      zoomMeetingKey,
      weekId,
      attendeeCount,
      attendeesProcessed,
      attendeesSkipped,
      baseEventsCreated,
      baseEventsUpdated,
      bonusEventsCreated,
      bonusEventsUpdated,
    });

    log("Automation 101 failed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      debugStep,
      error: message,
      recordId,
    });

    throw error;
  }
}


/* =========================================================
   SECTION 7: RUN
========================================================= */

await main();
