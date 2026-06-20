/*
Automation: 114 - Video Review and XP - Create or Update Video XP Event
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
 * 114 - VIDEO REVIEW AND XP
 * Create or Update Video XP Event
 *
 * Version: v5.4
 * Date Written: 2026-05-23
 * Last Updated: 2026-06-17
 *
 * PURPOSE
 * - Runs from one Video Feedback record.
 * - Creates or updates exactly one XP Event for that exact Video Feedback record.
 * - Uses the Video Feedback Airtable record ID as the unique source key.
 * - Prevents two Video Feedback records from stealing the same XP Event.
 * - Supports multiple video feedback records for the same athlete/submission/week.
 * - Writes XP Source correctly as the single-select value "Video Submission".
 * - Writes XP Bucket Key correctly as the single-select value "Video Feedback".
 * - Writes XP Reason Public and XP Reason Debug.
 * - Optionally writes XP Source Date and XP Date Source when those fields exist and are writable.
 * - Links the XP Event back to the Video Feedback record.
 * - Marks the Video Feedback record as Awarded after XP Event creation/update.
 *
 * IMPORTANT DESIGN RULE
 * - One Video Feedback record = one XP Event.
 * - Do NOT dedupe video feedback by Enrollment + Submission + XP Source only.
 * - Source Key must remain: VIDEO_SUBMISSION|recordId
 *
 * FIELD RENAME FIX
 * - Old field removed/renamed: XP Reason
 * - New public field: XP Reason Public
 * - New debug field: XP Reason Debug
 *
 * FOLDER
 * - 11 - Video Review and XP
 *
 * AUTOMATION NAME
 * - 114 - Video Review and XP - Create or Update Video XP Event
 *
 * TRIGGER TABLE
 * - Video Feedback
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Feedback Posted? is checked
 * - Total Video XP Awarded > 0
 * - Enrollment is not empty
 * - Submission is not empty
 * - Do Not Award XP? is unchecked
 * - XP Events is empty
 * - Ready for XP Automation? is checked
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Active? is checked
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Award Status is not Awarded
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Video Feedback record
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

const CONFIG = {
  scriptName: "114 - Video Review and XP - Create or Update Video XP Event",
  version: "v5.4",

  tables: {
    videoFeedback: "Video Feedback",
    submissions: "Submissions",
    xpEvents: "XP Events",
  },

  videoFeedback: {
    submission: "Submission",
    enrollment: "Enrollment",
    videoFeedbackKey: "Video Feedback Key",
    totalVideoXpAwarded: "Total Video XP Awarded",
    doNotAwardXp: "Do Not Award XP?",
    awardStatus: "Award Status",
    feedbackPosted: "Feedback Posted?",
    active: "Active?",
    readyForXpAutomation: "Ready for XP Automation?",
    xpEvents: "XP Events",
  },

  submissions: {
    week: "Week",
    activityDate: "Activity Date",
  },

  xpEvents: {
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    videoFeedback: "Video Feedback",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    xpPoints: "XP Points",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    active: "Active?",
    sourceKey: "Source Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",

    // Optional newer date-normalization fields.
    xpSourceDate: "XP Source Date",
    xpDateSource: "XP Date Source",
  },

  values: {
    xpSource: "Video Submission",
    xpBucketKey: "Video Feedback",
    xpReasonPublic: "Video feedback XP earned.",
    xpDateSource: "Video Submission Activity Date",
    awardStatusAwarded: "Awarded",
  },
};

/* =========================================================
   SECTION 2: RUNTIME CONTEXT
========================================================= */

let recordId = "";
let sourceKey = "";
let videoFeedbackDisplayKey = "";
let xpPoints = 0;
let submissionId = "";
let enrollmentId = "";
let weekId = "";
let xpSourceDateText = "";

let videoTable = null;
let submissionsTable = null;
let xpEventsTable = null;

/* =========================================================
   SECTION 3: FIELD CACHE
========================================================= */

const fieldCache = new Map();

/* =========================================================
   SECTION 4: HELPER FUNCTIONS
========================================================= */

function log(message, data = null) {
  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  const tableName = table.name || "unknown-table";
  const cacheKey = `${tableName}:${fieldName}`;

  if (fieldCache.has(cacheKey)) {
    return fieldCache.get(cacheKey);
  }

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

function fieldHasType(table, fieldName, allowedTypes) {
  const field = getFieldSafe(table, fieldName);
  return !!field && allowedTypes.includes(field.type);
}

function requireFieldType(table, fieldName, allowedTypes) {
  requireField(table, fieldName);

  const field = getFieldSafe(table, fieldName);

  if (!allowedTypes.includes(field.type)) {
    throw new Error(
      `Field ${table.name}.${fieldName} has type "${field.type}" but expected one of: ${allowedTypes.join(", ")}`
    );
  }
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;

  if (field.isComputed === true) {
    return false;
  }

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

  if (!field || field.type !== "singleSelect") {
    return true;
  }

  return field.options?.choices?.some(
    choice => normalizeText(choice?.name) === normalizeText(optionName)
  ) === true;
}

function requireSingleSelectOption(table, fieldName, optionName) {
  requireFieldType(table, fieldName, ["singleSelect"]);

  if (!singleSelectOptionExists(table, fieldName, optionName)) {
    const field = getFieldSafe(table, fieldName);
    const available = field?.options?.choices?.map(choice => choice.name).join(", ") || "";

    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available options: ${available}`
    );
  }
}

function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);

  if (!field || field.type !== "singleSelect") {
    return optionName;
  }

  const choices = field?.options?.choices || [];

  const match = choices.find(choice =>
    normalizeText(choice?.name) === normalizeText(optionName)
  );

  if (!match) {
    const available = choices.map(choice => choice.name).join(", ");
    throw new Error(
      `Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available options: ${available}`
    );
  }

  return { id: match.id };
}

function buildOptionalFieldValue(table, fieldName, value) {
  const field = getFieldSafe(table, fieldName);

  if (!field) return undefined;

  if (field.type === "singleSelect") {
    if (!singleSelectOptionExists(table, fieldName, value)) {
      log(`Optional single-select write skipped. Missing option: ${table.name}.${fieldName} = ${value}`);
      return undefined;
    }

    return buildSingleSelectValue(table, fieldName, value);
  }

  return value;
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

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "")
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  if (!text) return fallback;

  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function getCheckbox(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (raw === true) return true;
  if (raw === false) return false;
  if (raw === 1) return true;
  if (raw === 0) return false;

  if (raw && typeof raw === "object" && raw.name) {
    const name = String(raw.name).trim().toLowerCase();
    return ["true", "yes", "checked", "1", "active"].includes(name);
  }

  const text = String(raw ?? "").trim().toLowerCase();
  return ["true", "yes", "checked", "1", "active"].includes(text);
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => item?.id)
    .filter(Boolean);
}

function getFirstLinkedId(record, table, fieldName) {
  const ids = getLinkedIds(record, table, fieldName);
  return ids[0] || "";
}

function addIfWritable(payload, table, fieldName, value) {
  if (!fieldExists(table, fieldName)) {
    log(`Skipped missing field: ${table?.name || "unknown"}.${fieldName}`);
    return;
  }

  if (!isWritableField(table, fieldName)) {
    log(`Skipped non-writable field: ${table.name}.${fieldName}`);
    return;
  }

  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;

  payload[fieldName] = value;
}

async function updateRecordSafe(table, recordIdToUpdate, updates) {
  const safeUpdates = {};

  for (const [fieldName, value] of Object.entries(updates || {})) {
    addIfWritable(safeUpdates, table, fieldName, value);
  }

  if (Object.keys(safeUpdates).length === 0) {
    return false;
  }

  await table.updateRecordAsync(recordIdToUpdate, safeUpdates);
  return true;
}

async function updateRecordBestEffort(table, recordIdToUpdate, updates) {
  try {
    return await updateRecordSafe(table, recordIdToUpdate, updates);
  } catch (error) {
    log("Best-effort update failed", {
      table: table?.name || "",
      recordId: recordIdToUpdate,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function setSkippedOutputs(actionOut, errorOut, details = {}) {
  setOutputSafe("statusOut", "skipped");
  setOutputSafe("actionOut", actionOut || "skipped");
  setOutputSafe("xpEventIdOut", "");
  setOutputSafe("sourceKeyOut", details.sourceKey || sourceKey || "");
  setOutputSafe("videoFeedbackDisplayKeyOut", details.videoFeedbackDisplayKey || videoFeedbackDisplayKey || "");
  setOutputSafe("xpPointsOut", details.xpPoints || xpPoints || 0);
  setOutputSafe("submissionIdOut", details.submissionId || submissionId || "");
  setOutputSafe("enrollmentIdOut", details.enrollmentId || enrollmentId || "");
  setOutputSafe("weekIdOut", details.weekId || weekId || "");
  setOutputSafe("weekWrittenOut", details.weekId || weekId ? "yes" : "no");
  setOutputSafe("xpSourceDateOut", details.xpSourceDate || xpSourceDateText || "");
  setOutputSafe("errorOut", errorOut || "");

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "skipped",
    actionOut,
    errorOut,
    ...details,
  }, null, 2));
}

function buildXpReasonDebug({
  existingXpEvent,
  recordId,
  videoFeedbackDisplayKey,
  submissionId,
  enrollmentId,
  weekId,
  xpSourceDateText,
  sourceKey,
  xpPoints,
}) {
  return [
    "Video Feedback XP awarded from Automation 114.",
    `Automation: ${CONFIG.scriptName}`,
    `Version: ${CONFIG.version}`,
    `Video Feedback Record ID: ${recordId}`,
    `Video Feedback Display Key: ${videoFeedbackDisplayKey || "blank"}`,
    `Submission Record ID: ${submissionId}`,
    `Enrollment Record ID: ${enrollmentId}`,
    `Week Record ID: ${weekId || "none"}`,
    `XP Source Date: ${xpSourceDateText || "none"}`,
    `Source Key: ${sourceKey}`,
    `XP Source: ${CONFIG.values.xpSource}`,
    `XP Bucket Key: ${CONFIG.values.xpBucketKey}`,
    `XP Points: ${xpPoints}`,
    `Existing XP Event Found: ${existingXpEvent ? "yes" : "no"}`,
  ].join("\n");
}

function buildXpMatchFieldsToLoad() {
  return [
    CONFIG.xpEvents.sourceKey,
    CONFIG.xpEvents.videoFeedback,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));
}

function findMatchingXpEvents(xpRecords, currentRecordId, currentSourceKey, linkedXpEventIds = []) {
  const matchesById = new Map();

  for (const linkedXpEventId of linkedXpEventIds) {
    const linkedRecord = xpRecords.find(record => record.id === linkedXpEventId);
    if (!linkedRecord) continue;

    const linkedVideoFeedbackIds = getLinkedIds(
      linkedRecord,
      xpEventsTable,
      CONFIG.xpEvents.videoFeedback
    );

    if (linkedVideoFeedbackIds.includes(currentRecordId)) {
      matchesById.set(linkedRecord.id, linkedRecord);
    }
  }

  for (const record of xpRecords) {
    const existingSourceKey = getText(
      record,
      xpEventsTable,
      CONFIG.xpEvents.sourceKey
    );

    const linkedVideoFeedbackIds = getLinkedIds(
      record,
      xpEventsTable,
      CONFIG.xpEvents.videoFeedback
    );

    if (
      normalizeText(existingSourceKey) === normalizeText(currentSourceKey) ||
      linkedVideoFeedbackIds.includes(currentRecordId)
    ) {
      matchesById.set(record.id, record);
    }
  }

  return Array.from(matchesById.values());
}

function guardAgainstXpEventStealing(existingXpEvent, currentRecordId) {
  if (!existingXpEvent) return;

  const linkedVideoFeedbackIds = getLinkedIds(
    existingXpEvent,
    xpEventsTable,
    CONFIG.xpEvents.videoFeedback
  );

  if (
    linkedVideoFeedbackIds.length > 0 &&
    !linkedVideoFeedbackIds.includes(currentRecordId)
  ) {
    throw new Error(
      `XP Event ${existingXpEvent.id} is already linked to another Video Feedback record: ${linkedVideoFeedbackIds.join(", ")}. Refusing to overwrite.`
    );
  }
}

async function findExistingXpEventOrThrow(linkedXpEventIds = []) {
  const xpQuery = await xpEventsTable.selectRecordsAsync({
    fields: buildXpMatchFieldsToLoad(),
  });

  try {
    const matches = findMatchingXpEvents(
      xpQuery.records,
      recordId,
      sourceKey,
      linkedXpEventIds
    );

    if (matches.length > 1) {
      throw new Error(
        `Duplicate XP Events found for Video Feedback ${recordId} / Source Key ${sourceKey}: ${matches.map(record => record.id).join(", ")}. One Video Feedback record must have exactly one XP Event.`
      );
    }

    const existingXpEvent = matches[0] || null;

    guardAgainstXpEventStealing(existingXpEvent, recordId);

    return existingXpEvent;
  } finally {
    if (xpQuery && typeof xpQuery.unloadData === "function") {
  xpQuery.unloadData();
}
  }
}

function validateRequiredSchema() {
  const requiredVideoFields = [
    CONFIG.videoFeedback.submission,
    CONFIG.videoFeedback.enrollment,
    CONFIG.videoFeedback.totalVideoXpAwarded,
    CONFIG.videoFeedback.doNotAwardXp,
    CONFIG.videoFeedback.awardStatus,
    CONFIG.videoFeedback.feedbackPosted,
  ];

  for (const fieldName of requiredVideoFields) {
    requireField(videoTable, fieldName);
  }

  const requiredXpFields = [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.submission,
    CONFIG.xpEvents.videoFeedback,
    CONFIG.xpEvents.xpSource,
    CONFIG.xpEvents.xpBucketKey,
    CONFIG.xpEvents.xpPoints,
    CONFIG.xpEvents.xpReasonPublic,
    CONFIG.xpEvents.xpReasonDebug,
    CONFIG.xpEvents.active,
    CONFIG.xpEvents.sourceKey,
  ];

  for (const fieldName of requiredXpFields) {
    requireField(xpEventsTable, fieldName);
  }

  requireFieldType(videoTable, CONFIG.videoFeedback.submission, ["multipleRecordLinks"]);
  requireFieldType(videoTable, CONFIG.videoFeedback.enrollment, ["multipleRecordLinks"]);
  requireFieldType(videoTable, CONFIG.videoFeedback.awardStatus, ["singleSelect"]);

  if (fieldExists(videoTable, CONFIG.videoFeedback.xpEvents)) {
    requireFieldType(videoTable, CONFIG.videoFeedback.xpEvents, ["multipleRecordLinks"]);
  }

  requireFieldType(xpEventsTable, CONFIG.xpEvents.enrollment, ["multipleRecordLinks"]);
  requireFieldType(xpEventsTable, CONFIG.xpEvents.submission, ["multipleRecordLinks"]);
  requireFieldType(xpEventsTable, CONFIG.xpEvents.videoFeedback, ["multipleRecordLinks"]);
  requireFieldType(xpEventsTable, CONFIG.xpEvents.xpSource, ["singleSelect"]);
  requireFieldType(xpEventsTable, CONFIG.xpEvents.xpBucketKey, ["singleSelect"]);

  requireWritableField(xpEventsTable, CONFIG.xpEvents.enrollment);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.submission);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.videoFeedback);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpSource);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpBucketKey);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpPoints);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpReasonPublic);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.xpReasonDebug);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.active);
  requireWritableField(xpEventsTable, CONFIG.xpEvents.sourceKey);
  requireWritableField(videoTable, CONFIG.videoFeedback.awardStatus);

  requireSingleSelectOption(
    xpEventsTable,
    CONFIG.xpEvents.xpSource,
    CONFIG.values.xpSource
  );

  requireSingleSelectOption(
    xpEventsTable,
    CONFIG.xpEvents.xpBucketKey,
    CONFIG.values.xpBucketKey
  );

  requireSingleSelectOption(
    videoTable,
    CONFIG.videoFeedback.awardStatus,
    CONFIG.values.awardStatusAwarded
  );
}

function buildXpPayload({
  existingXpEvent,
  xpSourceDate,
}) {
  const xpReasonPublic = CONFIG.values.xpReasonPublic;

  const xpReasonDebug = buildXpReasonDebug({
    existingXpEvent,
    recordId,
    videoFeedbackDisplayKey,
    submissionId,
    enrollmentId,
    weekId,
    xpSourceDateText,
    sourceKey,
    xpPoints,
  });

  const xpPayload = {};

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.enrollment,
    [{ id: enrollmentId }]
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.submission,
    [{ id: submissionId }]
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.videoFeedback,
    [{ id: recordId }]
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.xpSource,
    buildSingleSelectValue(
      xpEventsTable,
      CONFIG.xpEvents.xpSource,
      CONFIG.values.xpSource
    )
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.xpBucketKey,
    buildSingleSelectValue(
      xpEventsTable,
      CONFIG.xpEvents.xpBucketKey,
      CONFIG.values.xpBucketKey
    )
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.xpPoints,
    xpPoints
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.xpReasonPublic,
    xpReasonPublic
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.xpReasonDebug,
    xpReasonDebug
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.active,
    true
  );

  addIfWritable(
    xpPayload,
    xpEventsTable,
    CONFIG.xpEvents.sourceKey,
    sourceKey
  );

  if (weekId) {
    addIfWritable(
      xpPayload,
      xpEventsTable,
      CONFIG.xpEvents.week,
      [{ id: weekId }]
    );
  }

  if (xpSourceDate) {
    addIfWritable(
      xpPayload,
      xpEventsTable,
      CONFIG.xpEvents.xpSourceDate,
      xpSourceDate
    );

    const optionalXpDateSourceValue = buildOptionalFieldValue(
      xpEventsTable,
      CONFIG.xpEvents.xpDateSource,
      CONFIG.values.xpDateSource
    );

    if (optionalXpDateSourceValue !== undefined) {
      addIfWritable(
        xpPayload,
        xpEventsTable,
        CONFIG.xpEvents.xpDateSource,
        optionalXpDateSourceValue
      );
    }
  }

  if (Object.keys(xpPayload).length === 0) {
    throw new Error("No writable fields were found for XP Event payload.");
  }

  return {
    xpPayload,
    xpReasonPublic,
    xpReasonDebug,
  };
}

/* =========================================================
   SECTION 5: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";
  setOutputSafe("debugStep", debugStep);

  /* ---------------------------------------------------------
     5.1 Inputs
  --------------------------------------------------------- */

  debugStep = "1 - Read Input";
  setOutputSafe("debugStep", debugStep);

  const cfg =
    typeof input !== "undefined" && input && typeof input.config === "function"
      ? input.config()
      : {};

  recordId = String(cfg.recordId || "").trim();

  if (!recordId) {
    throw new Error("Missing required input: recordId");
  }

  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Video Feedback recordId input: ${recordId}`);
  }

  sourceKey = `VIDEO_SUBMISSION|${recordId}`;

  /* ---------------------------------------------------------
     5.2 Table References
  --------------------------------------------------------- */

  debugStep = "2 - Load Table References";
  setOutputSafe("debugStep", debugStep);

  videoTable = base.getTable(CONFIG.tables.videoFeedback);
  submissionsTable = base.getTable(CONFIG.tables.submissions);
  xpEventsTable = base.getTable(CONFIG.tables.xpEvents);

  /* ---------------------------------------------------------
     5.3 Validate Required Fields / Field Types / Select Options
  --------------------------------------------------------- */

  debugStep = "3 - Validate Required Schema";
  setOutputSafe("debugStep", debugStep);

  validateRequiredSchema();

  /* ---------------------------------------------------------
     5.4 Load Video Feedback Record
  --------------------------------------------------------- */

  debugStep = "4 - Load Video Feedback";
  setOutputSafe("debugStep", debugStep);

  const videoRecord = await videoTable.selectRecordAsync(recordId);

  if (!videoRecord) {
    throw new Error(`Video Feedback record not found: ${recordId}`);
  }

  /* ---------------------------------------------------------
     5.5 Read Video Feedback Values
  --------------------------------------------------------- */

  debugStep = "5 - Read Video Feedback Values";
  setOutputSafe("debugStep", debugStep);

  const feedbackPosted = getCheckbox(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.feedbackPosted
  );

  const videoActive = fieldExists(videoTable, CONFIG.videoFeedback.active)
    ? getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.active)
    : true;

  submissionId = getFirstLinkedId(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.submission
  );

  enrollmentId = getFirstLinkedId(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.enrollment
  );

  videoFeedbackDisplayKey = fieldExists(videoTable, CONFIG.videoFeedback.videoFeedbackKey)
    ? getText(videoRecord, videoTable, CONFIG.videoFeedback.videoFeedbackKey)
    : "";

  xpPoints = getNumber(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.totalVideoXpAwarded,
    0
  );

  const doNotAward = getCheckbox(
    videoRecord,
    videoTable,
    CONFIG.videoFeedback.doNotAwardXp
  );

  const readyForXpAutomation = fieldExists(videoTable, CONFIG.videoFeedback.readyForXpAutomation)
    ? getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.readyForXpAutomation)
    : true;

  const existingLinkedXpEventIds = fieldExists(videoTable, CONFIG.videoFeedback.xpEvents)
    ? getLinkedIds(videoRecord, videoTable, CONFIG.videoFeedback.xpEvents)
    : [];

  setOutputSafe("sourceKeyOut", sourceKey);
  setOutputSafe("videoFeedbackDisplayKeyOut", videoFeedbackDisplayKey);
  setOutputSafe("xpPointsOut", xpPoints);
  setOutputSafe("submissionIdOut", submissionId);
  setOutputSafe("enrollmentIdOut", enrollmentId);

  /* ---------------------------------------------------------
     5.6 Validation / Skip Logic
  --------------------------------------------------------- */

  debugStep = "6 - Validate Skip Conditions";
  setOutputSafe("debugStep", debugStep);

  if (!videoActive) {
    setSkippedOutputs("skipped_inactive", "Active? is unchecked.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
      enrollmentId,
    });
    return;
  }

  if (!feedbackPosted) {
    setSkippedOutputs("skipped_feedback_not_posted", "Feedback Posted? is not checked.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
      enrollmentId,
    });
    return;
  }

  if (doNotAward) {
    setSkippedOutputs("skipped_do_not_award", "Do Not Award XP? is checked.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
      enrollmentId,
    });
    return;
  }

  if (!readyForXpAutomation) {
    setSkippedOutputs("skipped_not_ready_for_xp_automation", "Ready for XP Automation? is not checked.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
      enrollmentId,
    });
    return;
  }

  if (!(xpPoints > 0)) {
    setSkippedOutputs("skipped_zero_xp", "Total Video XP Awarded is blank or 0.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
      enrollmentId,
    });
    return;
  }

  if (!submissionId) {
    setSkippedOutputs("skipped_missing_submission", "Submission is blank.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      enrollmentId,
    });
    return;
  }

  if (!enrollmentId) {
    setSkippedOutputs("skipped_missing_enrollment", "Enrollment is blank.", {
      sourceKey,
      videoFeedbackDisplayKey,
      xpPoints,
      submissionId,
    });
    return;
  }

  /* ---------------------------------------------------------
     5.7 Load Submission / Find Week and XP Source Date
  --------------------------------------------------------- */

  debugStep = "7 - Load Submission";
  setOutputSafe("debugStep", debugStep);

  let xpSourceDate = null;

  const submissionRecord = await submissionsTable.selectRecordAsync(submissionId);

  if (!submissionRecord) {
    throw new Error(`Linked Submission record not found: ${submissionId}`);
  }

  if (fieldExists(submissionsTable, CONFIG.submissions.week)) {
    weekId = getFirstLinkedId(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.week
    );
  }

  if (fieldExists(submissionsTable, CONFIG.submissions.activityDate)) {
    xpSourceDate = getRaw(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.activityDate
    );

    xpSourceDateText = getText(
      submissionRecord,
      submissionsTable,
      CONFIG.submissions.activityDate
    );
  }

  setOutputSafe("weekIdOut", weekId || "");
  setOutputSafe("weekWrittenOut", weekId ? "yes" : "no");
  setOutputSafe("xpSourceDateOut", xpSourceDateText || "");

  /* ---------------------------------------------------------
     5.8 Find Existing XP Event
     Important:
     - Match only this exact Video Feedback record.
     - Do not match only by Enrollment + Submission + XP Source.
  --------------------------------------------------------- */

  debugStep = "8 - Find Existing XP Event";
  setOutputSafe("debugStep", debugStep);

  let existingXpEvent = await findExistingXpEventOrThrow(existingLinkedXpEventIds);

  /* ---------------------------------------------------------
     5.9 Build XP Event Payload
  --------------------------------------------------------- */

  debugStep = "9 - Build XP Event Payload";
  setOutputSafe("debugStep", debugStep);

  const {
    xpPayload,
    xpReasonPublic,
    xpReasonDebug,
  } = buildXpPayload({
    existingXpEvent,
    xpSourceDate,
  });

  /* ---------------------------------------------------------
     5.10 Create or Update XP Event
  --------------------------------------------------------- */

  debugStep = "10 - Create or Update XP Event";
  setOutputSafe("debugStep", debugStep);

  let xpEventId = "";
  let actionOut = "";

  if (existingXpEvent) {
    guardAgainstXpEventStealing(existingXpEvent, recordId);

    await xpEventsTable.updateRecordAsync(existingXpEvent.id, xpPayload);
    xpEventId = existingXpEvent.id;
    actionOut = "updated";
  } else {
    debugStep = "10a - Last-Chance XP Event Recheck Before Create";
    setOutputSafe("debugStep", debugStep);

    existingXpEvent = await findExistingXpEventOrThrow(existingLinkedXpEventIds);

    if (existingXpEvent) {
      guardAgainstXpEventStealing(existingXpEvent, recordId);

      await xpEventsTable.updateRecordAsync(existingXpEvent.id, xpPayload);
      xpEventId = existingXpEvent.id;
      actionOut = "updated-after-recheck";
    } else {
      debugStep = "10b - Create XP Event";
      setOutputSafe("debugStep", debugStep);

      xpEventId = await xpEventsTable.createRecordAsync(xpPayload);
      actionOut = "created";
    }
  }

  /* ---------------------------------------------------------
     5.11 Writeback to Video Feedback
  --------------------------------------------------------- */

  debugStep = "11 - Writeback to Video Feedback";
  setOutputSafe("debugStep", debugStep);

  const videoUpdateFields = {};

  videoUpdateFields[CONFIG.videoFeedback.awardStatus] = buildSingleSelectValue(
    videoTable,
    CONFIG.videoFeedback.awardStatus,
    CONFIG.values.awardStatusAwarded
  );

  if (fieldExists(videoTable, CONFIG.videoFeedback.readyForXpAutomation)) {
    if (isWritableField(videoTable, CONFIG.videoFeedback.readyForXpAutomation)) {
      videoUpdateFields[CONFIG.videoFeedback.readyForXpAutomation] = false;
    } else {
      log(
        `Skipped writeback for non-writable field: ${videoTable.name}.${CONFIG.videoFeedback.readyForXpAutomation}`
      );
    }
  }

  await updateRecordBestEffort(videoTable, recordId, videoUpdateFields);

  /* ---------------------------------------------------------
     5.12 Outputs
  --------------------------------------------------------- */

  debugStep = "12 - Outputs";
  setOutputSafe("debugStep", debugStep);

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("xpEventIdOut", xpEventId);
  setOutputSafe("sourceKeyOut", sourceKey);
  setOutputSafe("videoFeedbackDisplayKeyOut", videoFeedbackDisplayKey);
  setOutputSafe("xpPointsOut", xpPoints);
  setOutputSafe("submissionIdOut", submissionId);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("weekIdOut", weekId || "");
  setOutputSafe("weekWrittenOut", weekId ? "yes" : "no");
  setOutputSafe("xpSourceDateOut", xpSourceDateText || "");
  setOutputSafe("errorOut", "");

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "success",
    actionOut,
    xpEventIdOut: xpEventId,
    sourceKeyOut: sourceKey,
    videoFeedbackDisplayKeyOut: videoFeedbackDisplayKey,
    xpPointsOut: xpPoints,
    xpSourceWritten: CONFIG.values.xpSource,
    xpBucketKeyWritten: CONFIG.values.xpBucketKey,
    xpReasonPublicWritten: xpReasonPublic,
    xpReasonDebugWritten: xpReasonDebug ? "yes" : "no",
    submissionIdOut: submissionId,
    enrollmentIdOut: enrollmentId,
    weekIdOut: weekId || "",
    weekWrittenOut: weekId ? "yes" : "no",
    xpSourceDateOut: xpSourceDateText || "",
    xpSourceDateWritten: xpSourceDate ? "yes" : "no",
    xpDateSourceWritten: xpSourceDate ? CONFIG.values.xpDateSource : "",
    videoUpdateFieldsWritten: Object.keys(videoUpdateFields),
  }, null, 2));
}

/* =========================================================
   SECTION 6: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("xpEventIdOut", "");
  setOutputSafe("sourceKeyOut", sourceKey || "");
  setOutputSafe("videoFeedbackDisplayKeyOut", videoFeedbackDisplayKey || "");
  setOutputSafe("xpPointsOut", xpPoints || 0);
  setOutputSafe("submissionIdOut", submissionId || "");
  setOutputSafe("enrollmentIdOut", enrollmentId || "");
  setOutputSafe("weekIdOut", weekId || "");
  setOutputSafe("weekWrittenOut", weekId ? "yes" : "no");
  setOutputSafe("xpSourceDateOut", xpSourceDateText || "");
  setOutputSafe("errorOut", message);

  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "error",
    actionOut: "error",
    sourceKeyOut: sourceKey || "",
    videoFeedbackDisplayKeyOut: videoFeedbackDisplayKey || "",
    xpPointsOut: xpPoints || 0,
    submissionIdOut: submissionId || "",
    enrollmentIdOut: enrollmentId || "",
    weekIdOut: weekId || "",
    xpSourceDateOut: xpSourceDateText || "",
    errorOut: message,
  }, null, 2));

  throw error;
}

