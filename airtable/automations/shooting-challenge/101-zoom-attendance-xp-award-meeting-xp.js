/*
Automation: 101 - Zoom Attendance XP - Award Meeting XP
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-22
Last GitHub Update: 2026-07-18

Purpose:
Awards Zoom attendance XP to all linked attendees for one completed meeting.

Trigger:
Zoom Meetings when Create XP Events is checked and meeting is ready to award.

Important Tables:
Zoom Meetings, Enrollments, XP Reward Rules, XP Events, Weekly Athlete Summary

Important Fields:
Create XP Events, Attendees, Week, XP Award Status, Weekly Athlete Summary

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 101 - Zoom Attendance XP - Award Meeting XP
 * Version: v5.5
 * Date Written: 2026-05-28
 * Last Updated: 2026-07-18
 *
 * PURPOSE
 * - Runs from one Zoom Meetings record.
 * - Awards Zoom attendance XP to all linked Attendees.
 * - Creates or updates XP Events using stable Source Keys.
 * - Awards base attendance XP for each qualifying attendee.
 * - Awards one-time bonus XP when an attendee reaches meeting #2.
 * - Awards one-time bonus XP when an attendee reaches meeting #3.
 * - Writes XP Activity Date / Activity Date from meeting start (America/Denver)
 *   when those fields exist and are writable.
 * - Supports supplemental re-runs when Create XP Events is checked again after
 *   XP Award Status is already Awarded (for example, add recording watchers).
 * - Supplemental re-runs only create XP for attendees who do not already have
 *   base attendance XP for this exact Zoom Meeting.
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
 * FOLDER
 * - 10 - Zoom Attendance XP
 *
 * AUTOMATION NAME
 * - 101 - Zoom Attendance XP - Award Meeting XP
 *
 * TRIGGER TABLE
 * - Zoom Meetings
 *
 * TRIGGER TYPE
 * - When record matches conditions
 *
 * CORRECT TRIGGER SETUP
 * Table: Zoom Meetings
 * Trigger: When record matches conditions
 *
 * Recommended Conditions:
 * - Create XP Events is checked
 * - Attendees is not empty
 * - Week is not empty
 * - Zoom Meeting Key is not empty
 * - Meeting Status is Completed
 *
 * REQUIRED INPUT VARIABLE
 * - recordId = Airtable record ID from the triggering Zoom Meetings record
 *
 * REQUIRED OUTPUTS
 * - statusOut = created | updated | skipped | error
 * - actionOut
 * - errorOut
 * - debugStep
 *
 * WRITES
 * - Creates Weekly Athlete Summary when none exists for attendee Enrollment + Week
 * - XP Events records linked to Weekly Athlete Summary when resolvable by Enrollment + Week
 * - Zoom Meetings.XP Award Status = Awarded
 * - Zoom Meetings.Create XP Events = unchecked
 * - Zoom Meetings.XP Awarded At, if field exists
 * - Zoom Meetings.XP Award Error, if field exists
 *
 * SUPPLEMENTAL RE-RUN (recording watchers)
 * - Leave XP Award Status = Awarded
 * - Add new Attendees links
 * - Check Create XP Events again
 * - Script awards only attendees missing base XP for this meeting
 ************************************************************/

// @ts-nocheck


/* =========================================================
   SECTION 1 — CONFIGURATION
========================================================= */

const CONFIG = {
  scriptName: "101 - Zoom Attendance XP - Award Meeting XP",
  version: "v5.5",

  timeZone: "America/Denver",

  tables: {
    zoomMeetings: "Zoom Meetings",
    enrollments: "Enrollments",
    xpRewardRules: "XP Reward Rules",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
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
    weeklySummary: "Weekly Athlete Summary",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    xpPoints: "XP Points",
    xpReason: "XP Reason Public",
    active: "Active?",
    sourceKey: "Source Key",
    awardMode: "Award Mode",
    awardedBy: "Awarded By",
    processed: "Processed",
    error: "Error",
    zoomMeeting: "Zoom Meeting",
    activityDate: "Activity Date",
    xpActivityDate: "XP Activity Date",
    xpSourceDate: "XP Source Date",
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
  },

  outputStatuses: {
    created: "created",
    updated: "updated",
    skipped: "skipped",
    error: "error",
  },

  debug: {
    logToConsole: true,
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
    summaryCalculationStatus: "Summary Calculation Status",
  },

  summaryStatusValues: {
    complete: "Complete",
  },
};


let zoomTable = null;
let enrollmentsTable = null;
let rulesTable = null;
let xpEventsTable = null;
let weeklySummaryTable = null;
let weeklySummaryQueryCache = null;
let zoomStartField = "";

/************************************************************************************************
 * SECTION 2 — HELPERS
 ************************************************************************************************/

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
  debugStep = "",
  zoomMeetingId = "",
  meetingName = "",
  zoomMeetingKey = "",
  weekId = "",
  attendeeCount = 0,
  attendeesProcessed = 0,
  attendeesSkipped = 0,
  baseEventsCreated = 0,
  baseEventsUpdated = 0,
  baseEventsSkippedExisting = 0,
  bonusEventsCreated = 0,
  bonusEventsUpdated = 0,
  supplementalAwardMode = false,
}) {
  setOutputSafe("ok", ok);
  setOutputSafe("actionOut", actionOut || "");
  setOutputSafe("statusOut", statusOut || "");
  setOutputSafe("errorOut", errorOut || "");
  if (debugStep) {
    setOutputSafe("debugStep", debugStep);
  }
  setOutputSafe("zoomMeetingId", zoomMeetingId || "");
  setOutputSafe("meetingNameOut", meetingName || "");
  setOutputSafe("zoomMeetingKeyOut", zoomMeetingKey || "");
  setOutputSafe("weekIdOut", weekId || "");
  setOutputSafe("attendeeCount", attendeeCount || 0);
  setOutputSafe("attendeesProcessed", attendeesProcessed || 0);
  setOutputSafe("attendeesSkipped", attendeesSkipped || 0);
  setOutputSafe("baseEventsCreated", baseEventsCreated || 0);
  setOutputSafe("baseEventsUpdated", baseEventsUpdated || 0);
  setOutputSafe("baseEventsSkippedExisting", baseEventsSkippedExisting || 0);
  setOutputSafe("bonusEventsCreated", bonusEventsCreated || 0);
  setOutputSafe("bonusEventsUpdated", bonusEventsUpdated || 0);
  setOutputSafe("supplementalAwardMode", supplementalAwardMode ? "yes" : "no");
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

async function loadWeeklySummaryQuery() {
  if (weeklySummaryQueryCache) {
    return weeklySummaryQueryCache;
  }

  weeklySummaryQueryCache = await weeklySummaryTable.selectRecordsAsync({
    fields: [
      CONFIG.weeklySummary.enrollment,
      CONFIG.weeklySummary.week,
    ],
  });

  return weeklySummaryQueryCache;
}

async function findWeeklySummaryId(enrollmentId, weekId) {
  const cleanEnrollmentId = String(enrollmentId || "").trim();
  const cleanWeekId = String(weekId || "").trim();

  if (!cleanEnrollmentId || !cleanWeekId) {
    return "";
  }

  const query = await loadWeeklySummaryQuery();

  const matches = query.records.filter((record) => {
    const summaryEnrollmentId = getFirstLinkedRecordId(
      record,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );
    const summaryWeekId = getFirstLinkedRecordId(
      record,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    return (
      summaryEnrollmentId === cleanEnrollmentId &&
      summaryWeekId === cleanWeekId
    );
  });

  if (matches.length > 1) {
    throw new Error(
      `Multiple Weekly Athlete Summary records for Enrollment ${cleanEnrollmentId} + Week ${cleanWeekId}: ${matches.map((record) => record.id).join(", ")}`
    );
  }

  return matches.length === 1 ? matches[0].id : "";
}

async function resolveWeeklySummaryId({
  sourceWeeklySummaryIds = [],
  enrollmentId = "",
  weekId = "",
}) {
  const fromSource = [...new Set((sourceWeeklySummaryIds || []).filter(Boolean))];

  if (fromSource.length === 1) {
    return fromSource[0];
  }

  if (fromSource.length > 1) {
    throw new Error(
      `Source record has multiple Weekly Athlete Summary links: ${fromSource.join(", ")}`
    );
  }

  return findWeeklySummaryId(enrollmentId, weekId);
}

function buildSingleSelectValue(table, fieldName, optionName) {
  if (!fieldExists(table, fieldName)) return undefined;

  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return optionName;

  const cleanOptionName = String(optionName || "").trim();
  const choices = field?.options?.choices || [];
  const match = choices.find(
    choice => String(choice.name || "").trim().toLowerCase() === cleanOptionName.toLowerCase()
  );

  return match ? { id: match.id } : undefined;
}

function buildSummaryCreateFields(enrollmentId, weekId) {
  const fields = {
    [CONFIG.weeklySummary.enrollment]: linkedCell([enrollmentId]),
    [CONFIG.weeklySummary.week]: linkedCell([weekId]),
  };

  const statusValue = buildSingleSelectValue(
    weeklySummaryTable,
    CONFIG.weeklySummary.summaryCalculationStatus,
    CONFIG.summaryStatusValues.complete
  );

  if (statusValue !== undefined) {
    fields[CONFIG.weeklySummary.summaryCalculationStatus] = statusValue;
  }

  return safeUpdatePayload(weeklySummaryTable, fields);
}

async function findOrCreateWeeklySummaryId({ enrollmentId = "", weekId = "" }) {
  const existingId = await findWeeklySummaryId(enrollmentId, weekId);
  if (existingId) {
    return existingId;
  }

  const createFields = buildSummaryCreateFields(enrollmentId, weekId);

  if (Object.keys(createFields).length === 0) {
    throw new Error(
      `No writable fields available to create Weekly Athlete Summary for Enrollment ${enrollmentId} + Week ${weekId}.`
    );
  }

  const createdId = await weeklySummaryTable.createRecordAsync(createFields);
  weeklySummaryQueryCache = null;

  return createdId;
}

async function ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId) {
  if (!xpEventId || !weeklySummaryId) {
    return false;
  }

  const payload = safeUpdatePayload(xpEventsTable, {
    [CONFIG.xpEvents.weeklySummary]: linkedCell([weeklySummaryId]),
  });

  if (Object.keys(payload).length === 0) {
    return false;
  }

  await xpEventsTable.updateRecordAsync(xpEventId, payload);
  return true;
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

function buildMeetingEnrollmentIndexKey(zoomMeetingId, enrollmentId) {
  return `${String(zoomMeetingId || "").trim()}|${String(enrollmentId || "").trim()}`;
}

function buildXpEventIndexes(xpRecords) {
  const sourceKeyIndex = new Map();
  const meetingEnrollmentIndex = new Map();

  for (const xpRecord of xpRecords) {
    const existingSourceKey = getText(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.sourceKey
    );

    if (existingSourceKey) {
      sourceKeyIndex.set(normalizeKey(existingSourceKey), xpRecord);
    }

    const linkedZoomMeetingId = getFirstLinkedRecordId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.zoomMeeting
    );
    const linkedEnrollmentId = getFirstLinkedRecordId(
      xpRecord,
      xpEventsTable,
      CONFIG.xpEvents.enrollment
    );

    if (linkedZoomMeetingId && linkedEnrollmentId) {
      meetingEnrollmentIndex.set(
        buildMeetingEnrollmentIndexKey(linkedZoomMeetingId, linkedEnrollmentId),
        xpRecord
      );
    }
  }

  return {
    sourceKeyIndex,
    meetingEnrollmentIndex,
  };
}

function findExistingXpEventForSourceKey({
  sourceKey,
  sourceKeyIndex,
  meetingEnrollmentIndex,
  zoomMeetingId = "",
  enrollmentId = "",
  allowMeetingEnrollmentFallback = false,
}) {
  const normalizedSourceKey = normalizeKey(sourceKey);
  const bySourceKey = sourceKeyIndex.get(normalizedSourceKey) || null;

  if (bySourceKey) {
    return bySourceKey;
  }

  if (!allowMeetingEnrollmentFallback || !zoomMeetingId || !enrollmentId) {
    return null;
  }

  return meetingEnrollmentIndex.get(
    buildMeetingEnrollmentIndexKey(zoomMeetingId, enrollmentId)
  ) || null;
}

function attendeeAlreadyHasBaseXpForMeeting({
  enrollmentId,
  zoomMeetingId,
  zoomMeetingKey,
  sourceKeyIndex,
  meetingEnrollmentIndex,
}) {
  const baseSourceKey = buildBaseSourceKey(zoomMeetingKey, enrollmentId);

  return Boolean(findExistingXpEventForSourceKey({
    sourceKey: baseSourceKey,
    sourceKeyIndex,
    meetingEnrollmentIndex,
    zoomMeetingId,
    enrollmentId,
    allowMeetingEnrollmentFallback: true,
  }));
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
  weeklySummaryId,
  source,
  bucketKey,
  points,
  reason,
  sourceKey,
  zoomMeetingId,
  activityDateKey,
}) {
  const payload = {
    [CONFIG.xpEvents.enrollment]: linkedCell([enrollmentId]),
    [CONFIG.xpEvents.week]: weekId ? linkedCell([weekId]) : undefined,
    [CONFIG.xpEvents.weeklySummary]: weeklySummaryId
      ? linkedCell([weeklySummaryId])
      : undefined,
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

  if (activityDateKey && /^\d{4}-\d{2}-\d{2}$/.test(String(activityDateKey))) {
    const [y, m, d] = String(activityDateKey).split("-").map(Number);
    const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    for (const fieldName of [
      CONFIG.xpEvents.activityDate,
      CONFIG.xpEvents.xpActivityDate,
      CONFIG.xpEvents.xpSourceDate,
    ]) {
      if (fieldExists(xpEventsTable, fieldName)) {
        payload[fieldName] = noonUtc;
      }
    }
  }

  return safeUpdatePayload(xpEventsTable, payload);
}

async function createOrUpdateXpEvent({
  sourceKeyIndex,
  meetingEnrollmentIndex,
  sourceKey,
  enrollmentId,
  weekId,
  source,
  bucketKey,
  points,
  reason,
  zoomMeetingId,
  activityDateKey,
  allowMeetingEnrollmentFallback = false,
  skipIfExists = false,
}) {
  const weeklySummaryId = await findOrCreateWeeklySummaryId({
    enrollmentId,
    weekId,
  });

  const existingRecord = findExistingXpEventForSourceKey({
    sourceKey,
    sourceKeyIndex,
    meetingEnrollmentIndex,
    zoomMeetingId,
    enrollmentId,
    allowMeetingEnrollmentFallback,
  });

  if (existingRecord && skipIfExists) {
    return {
      action: "skipped_existing",
      recordId: existingRecord.id,
      weeklySummaryId,
    };
  }

  const payload = buildXpEventPayload({
    enrollmentId,
    weekId,
    weeklySummaryId,
    source,
    bucketKey,
    points,
    reason,
    sourceKey,
    zoomMeetingId,
    activityDateKey,
  });

  if (Object.keys(payload).length === 0) {
    throw new Error(`No writable XP Event fields available for Source Key: ${sourceKey}`);
  }

  if (existingRecord) {
    await xpEventsTable.updateRecordAsync(existingRecord.id, payload);
    await ensureXpEventWeeklySummaryLink(existingRecord.id, weeklySummaryId);

    sourceKeyIndex.set(normalizeKey(sourceKey), existingRecord);
    meetingEnrollmentIndex.set(
      buildMeetingEnrollmentIndexKey(zoomMeetingId, enrollmentId),
      existingRecord
    );

    return {
      action: "updated",
      recordId: existingRecord.id,
      weeklySummaryId,
    };
  }

  const createdRecordId = await xpEventsTable.createRecordAsync(payload);
  await ensureXpEventWeeklySummaryLink(createdRecordId, weeklySummaryId);

  const createdRecordStub = {
    id: createdRecordId,
    getCellValue: () => null,
    getCellValueAsString: () => "",
  };

  sourceKeyIndex.set(normalizeKey(sourceKey), createdRecordStub);
  meetingEnrollmentIndex.set(
    buildMeetingEnrollmentIndexKey(zoomMeetingId, enrollmentId),
    createdRecordStub
  );

  return {
    action: "created",
    recordId: createdRecordId,
    weeklySummaryId,
  };
}


function assertRequiredSchema() {
  zoomStartField = firstExistingField(
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
  requireWritableField(xpEventsTable, CONFIG.xpEvents.week, "XP Events -> Week");
  requireWritableField(xpEventsTable, CONFIG.xpEvents.weeklySummary, "XP Events -> Weekly Athlete Summary");
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpPoints, "XP Events -> XP Points");
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpReason, "XP Events -> XP Reason Public");
  requireWritableField(xpEventsTable, CONFIG.xpEvents.active, "XP Events -> Active?");
  requireWritableField(xpEventsTable, CONFIG.xpEvents.sourceKey, "XP Events -> Source Key");
}


/* =========================================================
   SECTION 3 — MAIN
========================================================= */

async function main() {
  let debugStep = "1 - Start";
  let recordId = "";

  let meetingName = "";
  let zoomMeetingKey = "";
  let weekId = "";
  let attendeeCount = 0;
  let attendeesProcessed = 0;
  let attendeesSkipped = 0;
  let baseEventsCreated = 0;
  let baseEventsUpdated = 0;
  let baseEventsSkippedExisting = 0;
  let bonusEventsCreated = 0;
  let bonusEventsUpdated = 0;
  let supplementalAwardMode = false;

  try {
    setOutputSafe("debugStep", debugStep);

    debugStep = "2 - Read Input";
    setOutputSafe("debugStep", debugStep);

    const inputConfig = input.config();
    recordId = String(inputConfig.recordId || "").trim();

    if (!recordId) {
      throw new Error("Missing required input variable: recordId");
    }

    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid Zoom Meetings recordId input: ${recordId}`);
    }

    debugStep = "3 - Load Tables";
    setOutputSafe("debugStep", debugStep);

    zoomTable = base.getTable(CONFIG.tables.zoomMeetings);
    enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    rulesTable = base.getTable(CONFIG.tables.xpRewardRules);
    xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
    weeklySummaryQueryCache = null;

    debugStep = "4 - Validate Schema";
    setOutputSafe("debugStep", debugStep);
    assertRequiredSchema();

    debugStep = "5 - Load Zoom Meeting";
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
        statusOut: CONFIG.outputStatuses.skipped,
        debugStep,
        zoomMeetingId: recordId,
        meetingName,
        zoomMeetingKey,
        weekId,
        attendeeCount,
      });
      return;
    }

    if (normalizeText(currentAwardStatus) === normalizeText(CONFIG.statuses.awarded)) {
      supplementalAwardMode = true;
    }

    if (
      fieldExists(zoomTable, CONFIG.zoom.meetingStatus) &&
      normalizeText(meetingStatus) !== normalizeText(CONFIG.statuses.completed)
    ) {
      setFinalOutputs({
        ok: true,
        actionOut: "skipped_meeting_not_completed",
        statusOut: CONFIG.outputStatuses.skipped,
        debugStep,
        zoomMeetingId: recordId,
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
          CONFIG.xpEvents.weeklySummary,
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

    const { sourceKeyIndex, meetingEnrollmentIndex } = buildXpEventIndexes(
      xpEventsQuery.records
    );

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

      if (
        supplementalAwardMode &&
        attendeeAlreadyHasBaseXpForMeeting({
          enrollmentId,
          zoomMeetingId: recordId,
          zoomMeetingKey,
          sourceKeyIndex,
          meetingEnrollmentIndex,
        })
      ) {
        baseEventsSkippedExisting += 1;
        attendeesSkipped += 1;

        log("Supplemental re-run skipped attendee with existing base XP for this meeting", {
          enrollmentId,
          attendeeName,
          zoomMeetingKey,
          zoomMeetingId: recordId,
        });

        continue;
      }

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
        meetingEnrollmentIndex,
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
          xpType: supplementalAwardMode
            ? "Base Attendance (Supplemental)"
            : "Base Attendance",
        }),
        zoomMeetingId: recordId,
        activityDateKey: meetingDateKey,
        allowMeetingEnrollmentFallback: true,
      });

      if (baseResult.action === "created") {
        baseEventsCreated += 1;
      } else if (baseResult.action === "updated") {
        baseEventsUpdated += 1;
      }

      if (attendanceCount === CONFIG.bonusMeetingCounts.bonus2) {
        const bonus2SourceKey = buildBonus2SourceKey(enrollmentId);

        const bonus2Result = await createOrUpdateXpEvent({
          sourceKeyIndex,
          meetingEnrollmentIndex,
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
          activityDateKey: meetingDateKey,
          allowMeetingEnrollmentFallback: false,
          skipIfExists: supplementalAwardMode,
        });

        if (bonus2Result.action === "created") {
          bonusEventsCreated += 1;
        } else if (bonus2Result.action === "updated") {
          bonusEventsUpdated += 1;
        }
      }

      if (attendanceCount === CONFIG.bonusMeetingCounts.bonus3) {
        const bonus3SourceKey = buildBonus3SourceKey(enrollmentId);

        const bonus3Result = await createOrUpdateXpEvent({
          sourceKeyIndex,
          meetingEnrollmentIndex,
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
          activityDateKey: meetingDateKey,
          allowMeetingEnrollmentFallback: false,
          skipIfExists: supplementalAwardMode,
        });

        if (bonus3Result.action === "created") {
          bonusEventsCreated += 1;
        } else if (bonus3Result.action === "updated") {
          bonusEventsUpdated += 1;
        }
      }

      attendeesProcessed += 1;
    }

    if (attendeesProcessed === 0) {
      if (supplementalAwardMode && baseEventsSkippedExisting > 0) {
        setFinalOutputs({
          ok: true,
          actionOut: "skipped_supplemental_no_new_attendees",
          statusOut: CONFIG.outputStatuses.skipped,
          debugStep,
          zoomMeetingId: recordId,
          meetingName,
          zoomMeetingKey,
          weekId,
          attendeeCount,
          attendeesProcessed,
          attendeesSkipped,
          baseEventsSkippedExisting,
          supplementalAwardMode,
        });
        return;
      }

      throw new Error("No attendees were processed. Check Attendees and Enrollment Active? values.");
    }

    debugStep = "12 - Write Zoom Success";
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

    const totalUpdated = baseEventsUpdated + bonusEventsUpdated;
    const totalCreated = baseEventsCreated + bonusEventsCreated;
    const statusOut = totalCreated > 0
      ? CONFIG.outputStatuses.created
      : CONFIG.outputStatuses.updated;

    setFinalOutputs({
      ok: true,
      actionOut: supplementalAwardMode
        ? "awarded_supplemental_zoom_attendance_xp"
        : "awarded_zoom_attendance_xp",
      statusOut,
      errorOut: "",
      debugStep,
      zoomMeetingId: recordId,
      meetingName,
      zoomMeetingKey,
      weekId,
      attendeeCount,
      attendeesProcessed,
      attendeesSkipped,
      baseEventsCreated,
      baseEventsUpdated,
      baseEventsSkippedExisting,
      bonusEventsCreated,
      bonusEventsUpdated,
      supplementalAwardMode,
    });

    console.log(JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut,
      actionOut: supplementalAwardMode
        ? "awarded_supplemental_zoom_attendance_xp"
        : "awarded_zoom_attendance_xp",
      supplementalAwardMode,
      zoomMeetingId: recordId,
      meetingName,
      zoomMeetingKey,
      weekId,
      attendeeCount,
      attendeesProcessed,
      attendeesSkipped,
      baseEventsCreated,
      baseEventsUpdated,
      baseEventsSkippedExisting,
      bonusEventsCreated,
      bonusEventsUpdated,
      debugStep,
    }));

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
      statusOut: CONFIG.outputStatuses.error,
      errorOut: message,
      debugStep,
      zoomMeetingId: recordId,
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

    console.log(JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      statusOut: CONFIG.outputStatuses.error,
      actionOut: "error",
      errorOut: message,
      zoomMeetingId: recordId,
      debugStep,
    }));

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


/************************************************************************************************
 * SECTION 4 — RUN
 ************************************************************************************************/

await main();
