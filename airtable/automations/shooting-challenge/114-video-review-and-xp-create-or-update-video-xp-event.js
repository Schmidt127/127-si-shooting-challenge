/*
Automation: 114 - Video Review and XP - Create or Update Video XP Event
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-09-07

Purpose:
Creates, updates, reactivates, or retires the exact Video Submission XP Event
for one Video Feedback record after validating the authoritative Submission.

Trigger:
Video Feedback lifecycle reconciliation; the native trigger must reach both
positive award/reactivation and withdrawal/deactivation updates.

Important Tables:
Video Feedback, Submissions, Enrollments, XP Events, Weekly Athlete Summary

Important Fields:
Total Video XP Awarded, Submission, Enrollment, XP Events, Award Status,
Count This Submission?, Activity Date Is Future?, Week, Level Recalc Needed?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
*/

/************************************************************
 * 114 - VIDEO REVIEW AND XP
 * Create or Update Video XP Event
 *
 * Version: v6.3
 * Date Written: 2026-05-23
 * Last Updated: 2026-09-07
 *
 * VERSION HISTORY
 * - v6.3 (2026-09-07 / #101): Require authoritative Submission countability,
 *   non-future state, one Week, and matching Enrollment before positive award.
 *   Source loss retires the exact canonical XP Event, resets Video Feedback
 *   readiness/status, and queues Enrollment level recalculation. Source
 *   validation runs before positive readiness/XP gates so a disarmed invalid
 *   source cannot leave old XP active.
 * - v6.2 (2026-09-02): SC-SEASON-SIM-002 dual-gated Season Sim Clock Now for
 *   direct future Activity Date checks on disposable sim Submissions only.
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
 * - Links the XP Event back to the Video Feedback record.
 * - Links the XP Event to Weekly Athlete Summary when resolvable.
 * - Retires the exact XP Event when Video Feedback or Submission eligibility is lost.
 * - Queues Level Recalc Needed? only after an active Enrollment-owned XP Event
 *   is actually retired; Automation 042 remains the sole progression writer.
 *
 * SOURCE AUTHORITY CONTRACT (#101)
 * - Submission Enrollment must exactly equal Video Feedback Enrollment.
 * - Count This Submission? must equal 1/true.
 * - Activity Date Is Future? must equal 0/false.
 * - Submission must link exactly one Week.
 * - Activity Date must exist and must not be future under the direct Denver
 *   defense-in-depth check (Season Sim dual gate preserved).
 * - Any invalid source retires only the exact canonical Video Feedback XP Event.
 *
 * IMPORTANT DESIGN RULE
 * - One Video Feedback record = one XP Event.
 * - Do NOT dedupe video feedback by Enrollment or Enrollment + XP Source only.
 * - Source Key must remain: VIDEO_SUBMISSION|recordId
 * - Never move or steal an XP Event to another Enrollment/Submission/Video Feedback.
 * - This is not an email automation.
 *
 * XP EVENT MATCH ORDER (safest first)
 * 1. XP Event already linked to this exact Video Feedback record ID.
 * 2. XP Event Source Key / XP Dedupe Key Normalized for this exact Video Feedback record ID.
 * - Never match by Enrollment + Submission + Week alone.
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
 * REQUIRED LIFECYCLE TRIGGER CONTRACT
 * - Trigger table: Video Feedback; type: When record updated.
 * - Watch Active?, Feedback Posted?, Do Not Award XP?,
 *   Ready for XP Automation?, Total Video XP Awarded, Enrollment, Submission,
 *   and XP Events.
 * - Input recordId must dynamically map to the triggering Video Feedback ID.
 * - The trigger must reach both positive and withdrawal updates.
 *
 * DO NOT USE POSITIVE-ONLY TRIGGER CONDITIONS
 * - Feedback Posted? is checked, Active? is checked, Do Not Award XP? is
 *   unchecked, XP Events is empty, Award Status is not Awarded, or a
 *   positive-XP condition. Any of them can suppress required deactivation.
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Airtable record ID from the triggering Video Feedback record
 ************************************************************/

// @ts-nocheck

const CONFIG = {
  scriptName: "114 - Video Review and XP - Create or Update Video XP Event",
  version: "v6.3",
  versionDate: "2026-09-07",
  lastUpdated: "2026-09-07",

  tables: {
    videoFeedback: "Video Feedback",
    submissions: "Submissions",
    enrollments: "Enrollments",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
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
    enrollment: "Enrollment",
    week: "Week",
    activityDate: "Activity Date",
    countThisSubmission: "Count This Submission?",
    activityDateIsFuture: "Activity Date Is Future?",
    weeklySummary: "Weekly Athlete Summary",
    seasonSimTestRecord: "Season Sim Test Record?",
    seasonSimClockNow: "Season Sim Clock Now",
    videoUploadNote: "Video Upload Note",
  },

  enrollments: {
    active: "Active?",
    levelRecalcNeeded: "Level Recalc Needed?",
  },

  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },

  xpEvents: {
    enrollment: "Enrollment",
    submission: "Submission",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    videoFeedback: "Video Feedback",
    xpSource: "XP Source",
    xpBucketKey: "XP Bucket",
    xpPoints: "XP Points",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    active: "Active?",
    sourceKey: "Source Key",
    xpDedupeKeyNormalized: "XP Dedupe Key Normalized",
    xpSourceDate: "XP Source Date",
    xpDateSource: "XP Date Source",
  },

  values: {
    xpSource: "Video Submission",
    xpBucketKey: "Video Feedback",
    xpReasonPublic: "Video feedback XP earned.",
    xpDateSource: "Video Submission Activity Date",
    awardStatusPending: "Pending",
    awardStatusAwarded: "Awarded",
    awardStatusDoNotAward: "Do Not Award",
  },
};

let videoTable = null;
let submissionsTable = null;
let enrollmentsTable = null;
let xpEventsTable = null;
let weeklySummaryTable = null;
let weeklySummaryQueryCache = null;
const fieldCache = new Map();

function log(message, data = null) {
  if (data === null || data === undefined) console.log(message);
  else console.log(message, JSON.stringify(data, null, 2));
}

function unloadQuerySafe(queryResult) {
  if (typeof queryResult?.unloadData === "function") {
    try { queryResult.unloadData(); }
    catch (error) {
      log("Query unloadData skipped/failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function setOutputSafe(name, value) {
  try { output.set(name, value); } catch { /* optional output */ }
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;
  const key = `${table.name || "unknown-table"}:${fieldName}`;
  if (fieldCache.has(key)) return fieldCache.get(key);
  try {
    const field = table.getField(fieldName);
    fieldCache.set(key, field);
    return field;
  } catch {
    fieldCache.set(key, null);
    return null;
  }
}

function fieldExists(table, fieldName) { return !!getFieldSafe(table, fieldName); }
function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) throw new Error(`Missing required field on ${table.name}: ${fieldName}`);
}
function requireFieldType(table, fieldName, allowedTypes) {
  requireField(table, fieldName);
  const field = getFieldSafe(table, fieldName);
  if (!allowedTypes.includes(field.type)) {
    throw new Error(`Field ${table.name}.${fieldName} has type "${field.type}" but expected one of: ${allowedTypes.join(", ")}`);
  }
}
function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.isComputed === true) return false;
  return !new Set([
    "formula", "rollup", "count", "lookup", "multipleLookupValues",
    "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
    "autoNumber", "button", "aiText", "externalSyncSource",
  ]).has(field.type);
}
function requireWritableField(table, fieldName) {
  requireField(table, fieldName);
  if (!isWritableField(table, fieldName)) throw new Error(`Field ${table.name}.${fieldName} exists but is not writable.`);
}
function normalizeText(value) { return String(value || "").trim().toLowerCase(); }
function singleSelectOptionExists(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return true;
  return field.options?.choices?.some(choice => normalizeText(choice?.name) === normalizeText(optionName)) === true;
}
function requireSingleSelectOption(table, fieldName, optionName) {
  requireFieldType(table, fieldName, ["singleSelect"]);
  if (!singleSelectOptionExists(table, fieldName, optionName)) {
    const available = getFieldSafe(table, fieldName)?.options?.choices?.map(c => c.name).join(", ") || "";
    throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}. Available options: ${available}`);
  }
}
function buildSingleSelectValue(table, fieldName, optionName) {
  const field = getFieldSafe(table, fieldName);
  if (!field || field.type !== "singleSelect") return optionName;
  const match = (field.options?.choices || []).find(c => normalizeText(c?.name) === normalizeText(optionName));
  if (!match) throw new Error(`Missing single-select option "${optionName}" in ${table.name}.${fieldName}.`);
  return { id: match.id };
}
function buildOptionalFieldValue(table, fieldName, value) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return undefined;
  if (field.type === "singleSelect") {
    if (!singleSelectOptionExists(table, fieldName, value)) return undefined;
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
  if (raw && typeof raw === "object" && raw.name) {
    return ["true", "yes", "checked", "1", "active"].includes(String(raw.name).trim().toLowerCase());
  }
  return ["true", "yes", "checked", "1", "active"].includes(String(raw ?? "").trim().toLowerCase());
}
function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}
function getFirstLinkedId(record, table, fieldName) { return getLinkedIds(record, table, fieldName)[0] || ""; }
function uniqueIds(ids) { return [...new Set((ids || []).filter(Boolean))]; }
function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function denverDateKey(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
function isSeasonSimRecord(submission) {
  if (!fieldExists(submissionsTable, CONFIG.submissions.seasonSimTestRecord)) return false;
  if (!getCheckbox(submission, submissionsTable, CONFIG.submissions.seasonSimTestRecord)) return false;
  if (!fieldExists(submissionsTable, CONFIG.submissions.videoUploadNote)) return false;
  return getText(submission, submissionsTable, CONFIG.submissions.videoUploadNote).includes("SEASON-SIM|");
}
function effectiveTodayDenverKey(submission) {
  if (!isSeasonSimRecord(submission)) return denverDateKey(new Date());
  const clockKey = fieldExists(submissionsTable, CONFIG.submissions.seasonSimClockNow)
    ? denverDateKey(getRaw(submission, submissionsTable, CONFIG.submissions.seasonSimClockNow))
    : "";
  return clockKey || denverDateKey(new Date());
}

async function loadWeeklySummaryQuery() {
  if (!weeklySummaryQueryCache) {
    weeklySummaryQueryCache = await weeklySummaryTable.selectRecordsAsync({
      fields: [CONFIG.weeklySummary.enrollment, CONFIG.weeklySummary.week],
    });
  }
  return weeklySummaryQueryCache;
}
async function findWeeklySummaryId(enrollmentId, weekId) {
  if (!enrollmentId || !weekId) return "";
  const query = await loadWeeklySummaryQuery();
  const matches = query.records.filter(record =>
    getFirstLinkedId(record, weeklySummaryTable, CONFIG.weeklySummary.enrollment) === enrollmentId &&
    getFirstLinkedId(record, weeklySummaryTable, CONFIG.weeklySummary.week) === weekId
  );
  if (matches.length > 1) throw new Error(`Multiple Weekly Athlete Summary records for Enrollment ${enrollmentId} + Week ${weekId}: ${matches.map(r => r.id).join(", ")}`);
  return matches[0]?.id || "";
}
async function resolveWeeklySummaryId({ sourceWeeklySummaryIds = [], enrollmentId = "", weekId = "" }) {
  const fromSource = uniqueIds(sourceWeeklySummaryIds);
  if (fromSource.length === 1) return fromSource[0];
  if (fromSource.length > 1) throw new Error(`Source record has multiple Weekly Athlete Summary links: ${fromSource.join(", ")}`);
  return findWeeklySummaryId(enrollmentId, weekId);
}

function addIfWritable(payload, table, fieldName, value) {
  if (!fieldExists(table, fieldName) || !isWritableField(table, fieldName)) return;
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return;
  payload[fieldName] = value;
}
async function updateRecordSafe(table, recordId, updates) {
  const safe = {};
  for (const [fieldName, value] of Object.entries(updates || {})) addIfWritable(safe, table, fieldName, value);
  if (!Object.keys(safe).length) return false;
  await table.updateRecordAsync(recordId, safe);
  return true;
}
async function ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId) {
  if (!xpEventId || !weeklySummaryId) return false;
  return updateRecordSafe(xpEventsTable, xpEventId, { [CONFIG.xpEvents.weeklySummary]: [{ id: weeklySummaryId }] });
}

async function deactivateExactXpEvent({ existingXpEvent, recordId, reason, awardStatus }) {
  let xpDeactivated = false;
  let levelRecalcQueued = false;
  let videoFeedbackWritebackWarning = "";
  let enrollmentRecalcWarning = "";

  let ownedEnrollmentId = "";
  if (existingXpEvent) {
    const eventEnrollmentIds = uniqueIds(getLinkedIds(existingXpEvent, xpEventsTable, CONFIG.xpEvents.enrollment));
    if (eventEnrollmentIds.length > 1) {
      throw new Error(`XP Event ${existingXpEvent.id} has multiple Enrollment links; refusing automatic retirement.`);
    }
    ownedEnrollmentId = eventEnrollmentIds[0] || "";
  }

  if (existingXpEvent && getCheckbox(existingXpEvent, xpEventsTable, CONFIG.xpEvents.active)) {
    await updateRecordSafe(xpEventsTable, existingXpEvent.id, { [CONFIG.xpEvents.active]: false });
    xpDeactivated = true;
  }

  if (xpDeactivated && ownedEnrollmentId) {
    try {
      const owner = await enrollmentsTable.selectRecordAsync(ownedEnrollmentId);
      if (owner && getCheckbox(owner, enrollmentsTable, CONFIG.enrollments.active)) {
        await updateRecordSafe(enrollmentsTable, ownedEnrollmentId, {
          [CONFIG.enrollments.levelRecalcNeeded]: true,
        });
        levelRecalcQueued = true;
      }
    } catch (error) {
      enrollmentRecalcWarning = error instanceof Error ? error.message : String(error);
    }
  }

  const videoUpdates = {};
  if (fieldExists(videoTable, CONFIG.videoFeedback.readyForXpAutomation)) {
    videoUpdates[CONFIG.videoFeedback.readyForXpAutomation] = false;
  }
  if (awardStatus) {
    videoUpdates[CONFIG.videoFeedback.awardStatus] = buildSingleSelectValue(
      videoTable, CONFIG.videoFeedback.awardStatus, awardStatus
    );
  }
  try { await updateRecordSafe(videoTable, recordId, videoUpdates); }
  catch (error) { videoFeedbackWritebackWarning = error instanceof Error ? error.message : String(error); }

  return { xpDeactivated, levelRecalcQueued, videoFeedbackWritebackWarning, enrollmentRecalcWarning, reason };
}

function setSkippedOutputs(actionOut, errorOut, details = {}) {
  setOutputSafe("statusOut", "skipped");
  setOutputSafe("actionOut", actionOut || "skipped");
  setOutputSafe("xpEventIdOut", details.existingXpEventId || "");
  setOutputSafe("sourceKeyOut", details.sourceKey || "");
  setOutputSafe("videoFeedbackDisplayKeyOut", details.videoFeedbackDisplayKey || "");
  setOutputSafe("xpPointsOut", details.xpPoints ?? "");
  setOutputSafe("submissionIdOut", details.submissionId || "");
  setOutputSafe("enrollmentIdOut", details.enrollmentId || "");
  setOutputSafe("weekIdOut", details.weekId || "");
  setOutputSafe("weeklySummaryIdOut", details.weeklySummaryId || "");
  setOutputSafe("xpSourceDateOut", details.xpSourceDate || "");
  setOutputSafe("deactivatedOut", details.xpDeactivated ? "yes" : "no");
  setOutputSafe("levelRecalcQueuedOut", details.levelRecalcQueued ? "yes" : "no");
  setOutputSafe("errorOut", errorOut || "");
  if (details.debugStep) setOutputSafe("debugStep", details.debugStep);
  console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, statusOut: "skipped", actionOut, errorOut, ...details }, null, 2));
}

function buildXpMatchFieldsToLoad() {
  return [
    CONFIG.xpEvents.sourceKey, CONFIG.xpEvents.xpDedupeKeyNormalized,
    CONFIG.xpEvents.videoFeedback, CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.submission, CONFIG.xpEvents.week,
    CONFIG.xpEvents.xpBucketKey, CONFIG.xpEvents.active,
  ].filter(fieldName => fieldExists(xpEventsTable, fieldName));
}
function extractVideoFeedbackIdFromSourceKey(sourceKey) {
  const raw = String(sourceKey || "").trim();
  if (!normalizeText(raw).startsWith("video_submission|")) return "";
  return raw.slice(raw.indexOf("|") + 1).trim();
}
function xpEventLinksVideoFeedback(record, videoFeedbackId) {
  return getLinkedIds(record, xpEventsTable, CONFIG.xpEvents.videoFeedback).includes(videoFeedbackId);
}
function sourceKeyMatchesCurrentVideoFeedback(record, currentRecordId, currentSourceKey) {
  const source = getText(record, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const dedupe = fieldExists(xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized)
    ? getText(record, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized) : "";
  if (normalizeText(source) === normalizeText(currentSourceKey)) return true;
  if (dedupe && normalizeText(dedupe) === normalizeText(currentSourceKey)) return true;
  return extractVideoFeedbackIdFromSourceKey(source) === currentRecordId ||
    extractVideoFeedbackIdFromSourceKey(dedupe) === currentRecordId;
}
function assertXpEventCompatibleOrThrow(existingXpEvent, matchContext) {
  if (!existingXpEvent) return;
  const { currentRecordId, enrollmentId, submissionId, weekId, currentSourceKey } = matchContext;
  const vfIds = uniqueIds(getLinkedIds(existingXpEvent, xpEventsTable, CONFIG.xpEvents.videoFeedback));
  if (vfIds.length > 0 && !vfIds.includes(currentRecordId)) {
    throw new Error(`XP Event ${existingXpEvent.id} is linked to another Video Feedback record: ${vfIds.join(", ")}.`);
  }
  const xpEnrollmentIds = uniqueIds(getLinkedIds(existingXpEvent, xpEventsTable, CONFIG.xpEvents.enrollment));
  if (xpEnrollmentIds.length > 1) throw new Error(`XP Event ${existingXpEvent.id} has multiple Enrollment links.`);
  if (enrollmentId && xpEnrollmentIds[0] && xpEnrollmentIds[0] !== enrollmentId) {
    throw new Error(`XP Event ${existingXpEvent.id} belongs to Enrollment ${xpEnrollmentIds[0]}, not current Enrollment ${enrollmentId}. Refusing to move/steal.`);
  }
  const xpSubmissionId = getFirstLinkedId(existingXpEvent, xpEventsTable, CONFIG.xpEvents.submission);
  if (submissionId && xpSubmissionId && xpSubmissionId !== submissionId) {
    throw new Error(`XP Event ${existingXpEvent.id} belongs to Submission ${xpSubmissionId}, not ${submissionId}.`);
  }
  const xpWeekId = getFirstLinkedId(existingXpEvent, xpEventsTable, CONFIG.xpEvents.week);
  if (weekId && xpWeekId && xpWeekId !== weekId) {
    throw new Error(`XP Event ${existingXpEvent.id} belongs to Week ${xpWeekId}, not ${weekId}.`);
  }
  const source = getText(existingXpEvent, xpEventsTable, CONFIG.xpEvents.sourceKey);
  const sourceVf = extractVideoFeedbackIdFromSourceKey(source);
  if (sourceVf && sourceVf !== currentRecordId) throw new Error(`XP Event ${existingXpEvent.id} Source Key references Video Feedback ${sourceVf}.`);
  const dedupe = fieldExists(xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized)
    ? getText(existingXpEvent, xpEventsTable, CONFIG.xpEvents.xpDedupeKeyNormalized) : "";
  const dedupeVf = extractVideoFeedbackIdFromSourceKey(dedupe);
  if (dedupeVf && dedupeVf !== currentRecordId) throw new Error(`XP Event ${existingXpEvent.id} dedupe key references Video Feedback ${dedupeVf}.`);
  if (source && !sourceKeyMatchesCurrentVideoFeedback(existingXpEvent, currentRecordId, currentSourceKey) && vfIds.length === 0) {
    throw new Error(`XP Event ${existingXpEvent.id} does not belong to current Video Feedback ${currentRecordId}.`);
  }
}
function findMatchingXpEvents(xpRecords, matchContext) {
  const seen = new Map();
  for (const record of xpRecords) {
    if (xpEventLinksVideoFeedback(record, matchContext.currentRecordId) ||
        sourceKeyMatchesCurrentVideoFeedback(record, matchContext.currentRecordId, matchContext.currentSourceKey) ||
        (matchContext.linkedXpEventIds || []).includes(record.id)) {
      assertXpEventCompatibleOrThrow(record, matchContext);
      seen.set(record.id, record);
    }
  }
  return [...seen.values()];
}
async function findExistingXpEventOrThrow(matchContext) {
  const query = await xpEventsTable.selectRecordsAsync({ fields: buildXpMatchFieldsToLoad() });
  try {
    const matches = findMatchingXpEvents(query.records, matchContext);
    if (matches.length > 1) {
      throw new Error(`Duplicate XP Events found for Video Feedback ${matchContext.currentRecordId}: ${matches.map(r => r.id).join(", ")}.`);
    }
    return matches[0] || null;
  } finally { unloadQuerySafe(query); }
}

function assertRequiredSchema() {
  [
    CONFIG.videoFeedback.submission, CONFIG.videoFeedback.enrollment,
    CONFIG.videoFeedback.totalVideoXpAwarded, CONFIG.videoFeedback.doNotAwardXp,
    CONFIG.videoFeedback.awardStatus, CONFIG.videoFeedback.feedbackPosted,
  ].forEach(f => requireField(videoTable, f));
  [
    CONFIG.submissions.enrollment, CONFIG.submissions.week,
    CONFIG.submissions.activityDate, CONFIG.submissions.countThisSubmission,
    CONFIG.submissions.activityDateIsFuture,
  ].forEach(f => requireField(submissionsTable, f));
  [CONFIG.enrollments.active, CONFIG.enrollments.levelRecalcNeeded].forEach(f => requireField(enrollmentsTable, f));
  [
    CONFIG.xpEvents.enrollment, CONFIG.xpEvents.submission, CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary, CONFIG.xpEvents.videoFeedback, CONFIG.xpEvents.xpSource,
    CONFIG.xpEvents.xpBucketKey, CONFIG.xpEvents.xpPoints, CONFIG.xpEvents.xpReasonPublic,
    CONFIG.xpEvents.xpReasonDebug, CONFIG.xpEvents.active, CONFIG.xpEvents.sourceKey,
  ].forEach(f => requireField(xpEventsTable, f));

  requireFieldType(videoTable, CONFIG.videoFeedback.submission, ["multipleRecordLinks"]);
  requireFieldType(videoTable, CONFIG.videoFeedback.enrollment, ["multipleRecordLinks"]);
  requireFieldType(videoTable, CONFIG.videoFeedback.awardStatus, ["singleSelect"]);
  requireFieldType(submissionsTable, CONFIG.submissions.enrollment, ["multipleRecordLinks"]);
  requireFieldType(submissionsTable, CONFIG.submissions.week, ["multipleRecordLinks"]);
  requireFieldType(enrollmentsTable, CONFIG.enrollments.active, ["checkbox"]);
  requireFieldType(enrollmentsTable, CONFIG.enrollments.levelRecalcNeeded, ["checkbox"]);

  [
    CONFIG.xpEvents.enrollment, CONFIG.xpEvents.submission, CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary, CONFIG.xpEvents.videoFeedback,
  ].forEach(f => requireFieldType(xpEventsTable, f, ["multipleRecordLinks"]));
  requireFieldType(xpEventsTable, CONFIG.xpEvents.xpSource, ["singleSelect"]);
  requireFieldType(xpEventsTable, CONFIG.xpEvents.xpBucketKey, ["singleSelect"]);

  [
    CONFIG.xpEvents.enrollment, CONFIG.xpEvents.submission, CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary, CONFIG.xpEvents.videoFeedback, CONFIG.xpEvents.xpSource,
    CONFIG.xpEvents.xpBucketKey, CONFIG.xpEvents.xpPoints, CONFIG.xpEvents.xpReasonPublic,
    CONFIG.xpEvents.xpReasonDebug, CONFIG.xpEvents.active, CONFIG.xpEvents.sourceKey,
  ].forEach(f => requireWritableField(xpEventsTable, f));
  requireWritableField(videoTable, CONFIG.videoFeedback.awardStatus);
  requireWritableField(enrollmentsTable, CONFIG.enrollments.levelRecalcNeeded);
  requireSingleSelectOption(xpEventsTable, CONFIG.xpEvents.xpSource, CONFIG.values.xpSource);
  requireSingleSelectOption(xpEventsTable, CONFIG.xpEvents.xpBucketKey, CONFIG.values.xpBucketKey);
  requireSingleSelectOption(videoTable, CONFIG.videoFeedback.awardStatus, CONFIG.values.awardStatusAwarded);
  requireSingleSelectOption(videoTable, CONFIG.videoFeedback.awardStatus, CONFIG.values.awardStatusPending);
}

function buildXpPayload({ existingXpEvent, xpSourceDate, weeklySummaryId, recordId, videoFeedbackDisplayKey, submissionId, enrollmentId, weekId, xpSourceDateText, sourceKey, xpPoints }) {
  const xpReasonDebug = [
    "Video Feedback XP awarded from Automation 114.",
    `Automation: ${CONFIG.scriptName}`,
    `Version: ${CONFIG.version}`,
    `Video Feedback Record ID: ${recordId}`,
    `Video Feedback Display Key: ${videoFeedbackDisplayKey || "blank"}`,
    `Submission Record ID: ${submissionId}`,
    `Enrollment Record ID: ${enrollmentId}`,
    `Week Record ID: ${weekId}`,
    `XP Source Date: ${xpSourceDateText || "none"}`,
    `Source Key: ${sourceKey}`,
    `XP Points: ${xpPoints}`,
    `Existing XP Event Found: ${existingXpEvent ? "yes" : "no"}`,
  ].join("\n");
  const payload = {};
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.enrollment, [{ id: enrollmentId }]);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.submission, [{ id: submissionId }]);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.videoFeedback, [{ id: recordId }]);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpSource, buildSingleSelectValue(xpEventsTable, CONFIG.xpEvents.xpSource, CONFIG.values.xpSource));
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpBucketKey, buildSingleSelectValue(xpEventsTable, CONFIG.xpEvents.xpBucketKey, CONFIG.values.xpBucketKey));
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpPoints, xpPoints);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpReasonPublic, CONFIG.values.xpReasonPublic);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpReasonDebug, xpReasonDebug);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.active, true);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.sourceKey, sourceKey);
  addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.week, [{ id: weekId }]);
  if (xpSourceDate) {
    addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpSourceDate, xpSourceDate);
    const dateSource = buildOptionalFieldValue(xpEventsTable, CONFIG.xpEvents.xpDateSource, CONFIG.values.xpDateSource);
    if (dateSource !== undefined) addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.xpDateSource, dateSource);
  }
  if (weeklySummaryId) addIfWritable(payload, xpEventsTable, CONFIG.xpEvents.weeklySummary, [{ id: weeklySummaryId }]);
  return { xpPayload: payload, xpReasonDebug };
}

async function main() {
  let debugStep = "1 - Start";
  let recordId = "";
  let sourceKey = "";
  let videoFeedbackDisplayKey = "";
  let xpPoints = 0;
  let submissionId = "";
  let enrollmentId = "";
  let weekId = "";
  let xpSourceDateText = "";

  try {
    const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
    recordId = String(cfg.recordId || "").trim();
    if (!recordId || !recordId.startsWith("rec")) throw new Error(`Invalid or missing Video Feedback recordId: ${recordId}`);
    sourceKey = `VIDEO_SUBMISSION|${recordId}`;

    debugStep = "2 - Load Table References";
    videoTable = base.getTable(CONFIG.tables.videoFeedback);
    submissionsTable = base.getTable(CONFIG.tables.submissions);
    enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
    weeklySummaryQueryCache = null;
    assertRequiredSchema();

    debugStep = "4 - Load Video Feedback";
    const videoRecord = await videoTable.selectRecordAsync(recordId);
    if (!videoRecord) throw new Error(`Video Feedback record not found: ${recordId}`);

    const feedbackPosted = getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.feedbackPosted);
    const videoActive = fieldExists(videoTable, CONFIG.videoFeedback.active)
      ? getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.active) : true;
    const doNotAward = getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.doNotAwardXp);
    const readyForXpAutomation = fieldExists(videoTable, CONFIG.videoFeedback.readyForXpAutomation)
      ? getCheckbox(videoRecord, videoTable, CONFIG.videoFeedback.readyForXpAutomation) : true;
    const submissionIds = uniqueIds(getLinkedIds(videoRecord, videoTable, CONFIG.videoFeedback.submission));
    const enrollmentIds = uniqueIds(getLinkedIds(videoRecord, videoTable, CONFIG.videoFeedback.enrollment));
    const existingLinkedXpEventIds = fieldExists(videoTable, CONFIG.videoFeedback.xpEvents)
      ? uniqueIds(getLinkedIds(videoRecord, videoTable, CONFIG.videoFeedback.xpEvents)) : [];
    submissionId = submissionIds[0] || "";
    enrollmentId = enrollmentIds[0] || "";
    xpPoints = getNumber(videoRecord, videoTable, CONFIG.videoFeedback.totalVideoXpAwarded, 0);
    videoFeedbackDisplayKey = fieldExists(videoTable, CONFIG.videoFeedback.videoFeedbackKey)
      ? getText(videoRecord, videoTable, CONFIG.videoFeedback.videoFeedbackKey) : "";

    let existingXpEvent = await findExistingXpEventOrThrow({
      currentRecordId: recordId,
      currentSourceKey: sourceKey,
      linkedXpEventIds: existingLinkedXpEventIds,
      enrollmentId,
      submissionId,
      weekId: "",
    });

    const retire = async (action, error, extra = {}) => {
      const lifecycle = await deactivateExactXpEvent({
        existingXpEvent, recordId, reason: action, awardStatus: CONFIG.values.awardStatusPending,
      });
      setSkippedOutputs(action, error, {
        debugStep, sourceKey, videoFeedbackDisplayKey, xpPoints, submissionId,
        enrollmentId, weekId, existingXpEventId: existingXpEvent?.id || "", ...extra, ...lifecycle,
      });
    };

    debugStep = "6 - Validate Video Feedback Lifecycle";
    if (!videoActive) { await retire("skipped_inactive", "Active? is unchecked."); return; }
    if (!feedbackPosted) { await retire("skipped_feedback_not_posted", "Feedback Posted? is not checked."); return; }
    if (doNotAward) {
      const lifecycle = await deactivateExactXpEvent({ existingXpEvent, recordId, reason: "do_not_award", awardStatus: CONFIG.values.awardStatusDoNotAward });
      setSkippedOutputs("skipped_do_not_award", "Do Not Award XP? is checked.", {
        debugStep, sourceKey, videoFeedbackDisplayKey, xpPoints, submissionId, enrollmentId,
        existingXpEventId: existingXpEvent?.id || "", ...lifecycle,
      });
      return;
    }

    // Source identity/countability is intentionally validated before positive-only
    // Ready/XP gates. This allows source loss to retire old XP even after 113 disarms.
    debugStep = "7 - Validate Authoritative Submission Source";
    if (submissionIds.length !== 1) { await retire("skipped_invalid_submission_link", `Submission must contain exactly one linked record; found ${submissionIds.length}.`); return; }
    if (enrollmentIds.length !== 1) { await retire("skipped_invalid_enrollment_link", `Enrollment must contain exactly one linked record; found ${enrollmentIds.length}.`); return; }

    const [enrollmentRecord, submissionRecord] = await Promise.all([
      enrollmentsTable.selectRecordAsync(enrollmentId),
      submissionsTable.selectRecordAsync(submissionId),
    ]);
    if (!enrollmentRecord) throw new Error(`Linked Enrollment record not found: ${enrollmentId}`);
    if (!submissionRecord) throw new Error(`Linked Submission record not found: ${submissionId}`);

    if (!getCheckbox(enrollmentRecord, enrollmentsTable, CONFIG.enrollments.active)) {
      await retire("skipped_inactive_enrollment", "Linked Enrollment Active? is unchecked."); return;
    }

    const submissionEnrollmentIds = uniqueIds(getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.enrollment));
    if (submissionEnrollmentIds.length !== 1 || submissionEnrollmentIds[0] !== enrollmentId) {
      await retire(
        "skipped_submission_enrollment_mismatch",
        `Submission Enrollment ${submissionEnrollmentIds.join(",") || "blank"} does not exactly match Video Feedback Enrollment ${enrollmentId}.`
      );
      return;
    }

    const weekIds = uniqueIds(getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.week));
    if (weekIds.length !== 1) {
      await retire("skipped_submission_week_invalid", `Submission Week must contain exactly one linked record; found ${weekIds.length}.`);
      return;
    }
    weekId = weekIds[0];

    if (!getCheckbox(submissionRecord, submissionsTable, CONFIG.submissions.countThisSubmission)) {
      await retire("skipped_submission_not_countable", "Count This Submission? is not 1/true.");
      return;
    }

    if (getCheckbox(submissionRecord, submissionsTable, CONFIG.submissions.activityDateIsFuture)) {
      await retire("skipped_submission_future_formula", "Activity Date Is Future? is 1/true.");
      return;
    }

    const xpSourceDate = getRaw(submissionRecord, submissionsTable, CONFIG.submissions.activityDate);
    xpSourceDateText = getText(submissionRecord, submissionsTable, CONFIG.submissions.activityDate);
    const sourceDateKey = denverDateKey(xpSourceDate);
    const todayDenverKey = effectiveTodayDenverKey(submissionRecord);
    if (!sourceDateKey) {
      await retire("skipped_submission_activity_date_missing", "Linked Submission Activity Date is blank or invalid.");
      return;
    }
    if (sourceDateKey > todayDenverKey) {
      await retire("skipped_submission_activity_date_future", "Linked Submission Activity Date is in the future.", { xpSourceDate: xpSourceDateText });
      return;
    }

    // Re-resolve with complete Week context and fail closed on any ownership conflict.
    existingXpEvent = await findExistingXpEventOrThrow({
      currentRecordId: recordId, currentSourceKey: sourceKey,
      linkedXpEventIds: existingLinkedXpEventIds, enrollmentId, submissionId, weekId,
    });

    debugStep = "8 - Validate Positive Award Gates";
    if (!readyForXpAutomation) {
      setSkippedOutputs("skipped_not_ready_for_xp_automation", "Ready for XP Automation? is not checked.", {
        debugStep, sourceKey, videoFeedbackDisplayKey, xpPoints, submissionId, enrollmentId, weekId,
        existingXpEventId: existingXpEvent?.id || "",
      });
      return;
    }
    if (!(xpPoints > 0)) {
      setSkippedOutputs("skipped_zero_xp", "Total Video XP Awarded is blank or 0.", {
        debugStep, sourceKey, videoFeedbackDisplayKey, xpPoints, submissionId, enrollmentId, weekId,
        existingXpEventId: existingXpEvent?.id || "",
      });
      return;
    }

    debugStep = "9 - Resolve Weekly Summary";
    const submissionWasIds = fieldExists(submissionsTable, CONFIG.submissions.weeklySummary)
      ? getLinkedIds(submissionRecord, submissionsTable, CONFIG.submissions.weeklySummary) : [];
    const weeklySummaryId = await resolveWeeklySummaryId({ sourceWeeklySummaryIds: submissionWasIds, enrollmentId, weekId });

    debugStep = "10 - Build/Create/Update XP Event";
    const matchContext = {
      currentRecordId: recordId, currentSourceKey: sourceKey,
      linkedXpEventIds: existingLinkedXpEventIds, enrollmentId, submissionId, weekId,
    };
    const { xpPayload, xpReasonDebug } = buildXpPayload({
      existingXpEvent, xpSourceDate, weeklySummaryId, recordId, videoFeedbackDisplayKey,
      submissionId, enrollmentId, weekId, xpSourceDateText, sourceKey, xpPoints,
    });

    let xpEventId = "";
    let actionOut = "";
    if (existingXpEvent) {
      assertXpEventCompatibleOrThrow(existingXpEvent, matchContext);
      await xpEventsTable.updateRecordAsync(existingXpEvent.id, xpPayload);
      xpEventId = existingXpEvent.id;
      actionOut = "updated";
    } else {
      existingXpEvent = await findExistingXpEventOrThrow(matchContext);
      if (existingXpEvent) {
        assertXpEventCompatibleOrThrow(existingXpEvent, matchContext);
        await xpEventsTable.updateRecordAsync(existingXpEvent.id, xpPayload);
        xpEventId = existingXpEvent.id;
        actionOut = "updated-after-recheck";
      } else {
        xpEventId = await xpEventsTable.createRecordAsync(xpPayload);
        actionOut = "created";
      }
    }
    await ensureXpEventWeeklySummaryLink(xpEventId, weeklySummaryId);

    debugStep = "11 - Writeback";
    const videoUpdates = {
      [CONFIG.videoFeedback.awardStatus]: buildSingleSelectValue(videoTable, CONFIG.videoFeedback.awardStatus, CONFIG.values.awardStatusAwarded),
    };
    if (fieldExists(videoTable, CONFIG.videoFeedback.readyForXpAutomation) && isWritableField(videoTable, CONFIG.videoFeedback.readyForXpAutomation)) {
      videoUpdates[CONFIG.videoFeedback.readyForXpAutomation] = false;
    }
    await updateRecordSafe(videoTable, recordId, videoUpdates);

    setOutputSafe("statusOut", actionOut === "created" ? "created" : "updated");
    setOutputSafe("actionOut", actionOut);
    setOutputSafe("xpEventIdOut", xpEventId);
    setOutputSafe("weeklySummaryIdOut", weeklySummaryId || "");
    setOutputSafe("sourceKeyOut", sourceKey);
    setOutputSafe("submissionIdOut", submissionId);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("weekIdOut", weekId);
    setOutputSafe("xpSourceDateOut", xpSourceDateText);
    setOutputSafe("deactivatedOut", "no");
    setOutputSafe("levelRecalcQueuedOut", "no");
    setOutputSafe("errorOut", "");
    log("114 complete", {
      version: CONFIG.version, actionOut, xpEventId, sourceKey, submissionId,
      enrollmentId, weekId, weeklySummaryId, xpPoints,
      xpReasonDebugWritten: xpReasonDebug ? "yes" : "no",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", debugStep);
    log("Automation 114 error", { recordId, debugStep, error: message });
    throw error;
  }
}

await main();
