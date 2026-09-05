/*
Automation: 066 - Achievements and Milestones - Create Shot Milestone Unlocks
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-20
Last GitHub Update: 2026-09-05 (v4.0 SC-163 Goal Met Date)

Purpose:
Creates Athlete Achievement Unlock rows when an Enrollment crosses configured Shot Milestone thresholds.
Also stamps Enrollments.Goal Met Date (SC-163) with the first counted Activity Date crossing.

Trigger:
Enrollments when Run Shot Milestone Check? is checked (confirm conditions in Airtable UI).
Armed by Automation 010 after successful submission reconciliation.

Important Tables:
Enrollments, Submissions, Shot Milestones, Achievements, Athlete Achievement Unlocks, Weeks

Important Fields:
Run Shot Milestone Check?, Grade Band, Milestone Source Key, Milestone Activity Date, Week,
Goal Met?, Goal Met Date, Target Goal Shots, Total Shots Counted

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
First automation upgraded to V2 Automation Standard (2026-07-05).
SC-163 Goal Met Date lives here (capacity-safe). Do not install Automation 122.
*/

/************************************************************
 * 066 - ACHIEVEMENTS AND MILESTONES
 * Create Shot Milestone Unlocks
 *
 * Version: v4.0
 * Date Written: 2026-06-17
 * Last Updated: 2026-09-05
 *
 * VERSION HISTORY
 * - v4.0 (2026-09-05): SC-163 — stamp Enrollments.Goal Met Date with the first
 *   counted Activity Date that crosses Target Goal Shots. Isolated from milestone
 *   writes (never invent; never overwrite; fail closed when unprovable). Supersedes
 *   proposed Automation 122 (capacity full — do not install 122).
 * - v3.9 (2026-08-24): Require triggering Enrollment recordId from input.config()
 *   only — no hardcoded record literals in executable logic; explicit missing/
 *   invalid input errors for safe manual runs.
 * - v3.8 (2026-08-14): Treat Athlete Achievement Unlocks.Notes as optional;
 *   missing Notes must not block milestone eligibility, lifecycle repair, or XP.
 * - v3.6 (2026-08-13): Reconcile inactive/restored canonical unlocks.
 * - v3.5 (2026-08-06): Program Instance isolation — Week date match scoped to
 *   Enrollment.Program Instance; throw on ambiguous overlaps inside one PI.
 * - v3.4 (2026-08-06): Defensive createRecordsInBatches — accept raw field maps or
 *   { fields } objects; always call createRecordsAsync with { fields }. Fixes live error
 *   "records[0] should have a 'fields' property" when creating 2+ unlocks.
 * - v3.3 (2026-07-24): Grade Band match prefers linked record IDs; normalized label is fallback only.
 * - v3.2 (2026-07-06): Week resolution uses 005/034 America/Denver date keys (not UTC ISO slice).
 * - v3.1 (2026-07-05): SCRIPT metadata block separated from CONFIG; batched create/update (50).
 * - v3.0 (2026-07-05): V2 standard rewrite — Week write from Milestone Activity Date;
 *   CONFIG/scriptName/version alignment; required outputs; numbered sections; schema gates.
 * - v2.1 (2026-06-17): Writable-field protection; skip computed Unlock Key writes.
 * - v2.0: Milestone crossing from counted submissions; Milestone Source Key idempotency.
 *
 * PURPOSE
 * - Runs from one Enrollment record when Run Shot Milestone Check? is checked.
 * - Calculates total counted shots from Submissions linked to THIS Enrollment only
 *   (prior-year Athlete submissions on other Enrollments are excluded).
 * - Finds active Shot Milestones for the enrollment Grade Band (config table — not hardcoded).
 * - Determines which milestones were crossed and on which submission date.
 * - Creates one Athlete Achievement Unlock per milestone using Milestone Source Key dedupe.
 * - Writes Milestone Activity Date, Week (from Weeks date ranges within Program Instance), and Pending XP status.
 * - SC-163: when Goal Met? / counted total reaches Target Goal Shots and Goal Met Date
 *   is blank, stamps the first provable counted Activity Date crossing (America/Denver).
 * - Clears Run Shot Milestone Check? when finished (except on error — leave checked for triage).
 *
 * IMPORTANT DESIGN RULES
 * - One Milestone Source Key = one unlock: SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}
 * - Multiple milestones may unlock in the same Week — that is valid (not a duplicate).
 * - Do NOT write Athlete Achievement Unlocks.Unlock Key (computed/formula in this base).
 * - Skip inactive enrollments without error.
 * - Reconciles exact Enrollment + Shot Milestone source-key rows on both total
 *   increases and decreases. Below-threshold rows are deactivated (not deleted);
 *   restoration reactivates that same unlock and re-arms 059 through Pending.
 * - Grade Band and milestone thresholds come from linked config records — config-over-code.
 * - Grade Band matching: linked record IDs first; normalized display label only as fallback.
 * - Week resolution uses Weeks.Start Date / End Date ranges (America/Denver) scoped by
 *   Enrollment.Program Instance — never date-only across years.
 * - Goal Met Date uses the same counted-submission filter and chronology as milestone
 *   crossings (Count This Submission?, Activity Date, Total Shots Counted > 0).
 * - Goal Met Date never overwrites a non-blank value; never uses NOW()/award dates.
 * - Goal Met Date failures are isolated (do not roll back milestone unlock writes).
 *
 * THIS IS NOT
 * - XP award automation (059 / achievement-to-XP chain handles Pending unlocks).
 * - Perfect Week unlocks (058).
 * - Streak unlocks (053–054).
 * - Conquered Goal award fulfillment / Award Recipients.Date Awarded.
 * - Standalone Automation 122 (superseded — do not install).
 *
 * FOLDER
 * - 06 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 066 - Achievements and Milestones - Create Shot Milestone Unlocks
 *
 * TRIGGER TABLE
 * - Enrollments
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Run Shot Milestone Check? is checked
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Active? is checked (script also skips inactive enrollments)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Enrollment record ID (map to the trigger record field
 *   in Airtable — never paste a literal test record ID)
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created | updated | skipped_inactive | skipped_no_submissions | skipped_no_milestones | skipped_zero_total | skipped_existing | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - enrollmentIdOut
 * - createdUnlocksOut
 * - updatedUnlocksOut
 * - skippedExistingUnlocksOut
 * - goalMetDateActionOut = stamped | skipped_not_met | skipped_already_set | skipped_no_target |
 *   skipped_field_not_writable | skipped_field_missing | error_unprovable | error_ambiguous | ""
 * - goalMetDateOut = YYYY-MM-DD (America/Denver) or empty — no athlete names / no submission IDs
 *
 * PRIMARY TABLES USED
 * - Enrollments, Submissions, Shot Milestones, Achievements, Athlete Achievement Unlocks, Weeks
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Athlete Achievement Unlocks → Enrollment, Achievement, Shot Milestone, Milestone Source Key,
 *   Milestone Activity Date, Week, XP Award Status, Notes
 * - Enrollments → Run Shot Milestone Check? (cleared on success/skip paths)
 * - Enrollments → Goal Met Date (once, when blank and crossing is provable; SC-163)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1 — SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "066 - Achievements and Milestones - Create Shot Milestone Unlocks",
  version: "v4.0",
  versionDate: "2026-09-05",
  originalWrittenDate: "2026-06-17",
  lastUpdated: "2026-09-05",
  folder: "06 - Achievements and Milestones",
  automationName: "066 - Achievements and Milestones - Create Shot Milestone Unlocks",
};

/* =========================================================
   SECTION 2 — CONFIGURATION (tables, fields, statuses only)
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",
  batchSize: 50,

  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
    shotMilestones: "Shot Milestones",
    achievements: "Achievements",
    unlocks: "Athlete Achievement Unlocks",
    weeks: "Weeks",
  },

  achievementLookup: {
    name: "Shot Milestone",
    rewardRuleKey: "SHOT_MILESTONE",
  },

  enrollmentFields: {
    active: "Active?",
    gradeBand: "Grade Band",
    totalShots: "Total Shots Submitted",
    totalShotsCounted: "Total Shots Counted",
    runCheck: "Run Shot Milestone Check?",
    programInstance: "Program Instance",
    goalMet: "Goal Met?",
    goalMetDate: "Goal Met Date",
    targetGoalShots: "Target Goal Shots",
  },

  submissionFields: {
    enrollment: "Enrollment",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    countThisSubmission: "Count This Submission?",
  },

  shotMilestoneFields: {
    label: "Milestone Label",
    gradeBand: "Grade Band",
    milestonePercent: "Milestone Percent",
    milestoneShotCount: "Milestone Shot Count",
    pointsAwarded: "Points Awarded",
    active: "Active",
    uniqueKey: "Milestone Unique Key",
  },

  achievementFields: {
    name: "Achievement Name",
    fallbackName: "Name",
    rewardRuleKey: "Reward Rule Key",
    active: "Active?",
  },

  unlockFields: {
    enrollment: "Enrollment",
    achievement: "Achievement",
    week: "Week",
    shotMilestone: "Shot Milestone",
    milestoneSourceKey: "Milestone Source Key",
    milestoneActivityDate: "Milestone Activity Date",
    active: "Active?",
    xpAwardStatus: "XP Award Status",
    unlockKey: "Unlock Key",
    notes: "Notes",
  },

  weekFields: {
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active Week?",
    activeAlt: "Active?",
    programInstance: "Program Instance",
  },

  statuses: {
    pending: "Pending",
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    created: "created",
    updated: "updated",
    reconciled: "reconciled",
    skippedInactive: "skipped_inactive",
    skippedNoSubmissions: "skipped_no_submissions",
    skippedNoMilestones: "skipped_no_milestones",
    skippedZeroTotal: "skipped_zero_total",
    skippedExisting: "skipped_existing",
    error: "error",
  },

  sourceKeyPrefix: "SHOT_MILESTONE|",

  goalMetDateActions: {
    stamped: "stamped",
    skippedNotMet: "skipped_not_met",
    skippedAlreadySet: "skipped_already_set",
    skippedNoTarget: "skipped_no_target",
    skippedFieldNotWritable: "skipped_field_not_writable",
    skippedFieldMissing: "skipped_field_missing",
    errorUnprovable: "error_unprovable",
    errorAmbiguous: "error_ambiguous",
  },
};

const fieldCache = new Map();

/* =========================================================
   SECTION 3 — OUTPUT HELPERS
========================================================= */

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore output mapping errors.
  }
}

function log(message, data = null) {
  if (data === null || data === undefined) {
    console.log(message);
  } else {
    console.log(message, JSON.stringify(data, null, 2));
  }
}

function setSkippedOutputs({ actionOut, errorOut, debugStep, enrollmentId = "" }) {
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
}

function setErrorOutputs({ errorOut, debugStep, enrollmentId = "" }) {
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", errorOut || "Unknown error");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
}

/* =========================================================
   SECTION 4 — FIELD / SCHEMA HELPERS
========================================================= */

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  const cacheKey = `${table.name}:${fieldName}`;
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

function requireFieldType(table, fieldName, allowedTypes) {
  requireField(table, fieldName);
  const field = getFieldSafe(table, fieldName);
  if (!allowedTypes.includes(field.type)) {
    throw new Error(
      `Field ${table.name}.${fieldName} has type "${field.type}" but expected: ${allowedTypes.join(", ")}.`
    );
  }
}

function isWritableField(table, fieldName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;
  if (field.isComputed === true) return false;

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

function getAvailableField(table, preferredName, fallbackName = null) {
  if (fieldExists(table, preferredName)) return preferredName;
  if (fallbackName && fieldExists(table, fallbackName)) return fallbackName;
  return null;
}

function fieldList(table, fieldNames) {
  return fieldNames.filter((fieldName) => fieldName && fieldExists(table, fieldName));
}

function hasSelectChoice(table, fieldName, choiceName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return false;
  if (field.type !== "singleSelect") return true;
  const choices = field.options?.choices || [];
  return choices.some((choice) => choice.name === choiceName);
}

function singleSelectValue(table, fieldName, choiceName) {
  const field = getFieldSafe(table, fieldName);
  if (!field) return undefined;

  if (field.type === "singleSelect") {
    if (!hasSelectChoice(table, fieldName, choiceName)) {
      throw new Error(
        `Missing single-select option "${choiceName}" on ${table.name} -> ${fieldName}.`
      );
    }
    return { name: choiceName };
  }

  return choiceName;
}

function validateRequiredSchema(tables) {
  requireField(tables.enrollments, CONFIG.enrollmentFields.gradeBand);
  requireField(tables.enrollments, CONFIG.enrollmentFields.runCheck);
  requireField(tables.submissions, CONFIG.submissionFields.enrollment);
  requireField(tables.submissions, CONFIG.submissionFields.activityDate);
  requireField(tables.submissions, CONFIG.submissionFields.totalShotsCounted);
  requireFieldType(
    tables.submissions,
    CONFIG.submissionFields.countThisSubmission,
    ["formula"]
  );
  requireField(tables.shotMilestones, CONFIG.shotMilestoneFields.gradeBand);
  requireField(tables.shotMilestones, CONFIG.shotMilestoneFields.milestoneShotCount);
  requireField(tables.unlocks, CONFIG.unlockFields.enrollment);
  requireField(tables.unlocks, CONFIG.unlockFields.achievement);
  requireField(tables.unlocks, CONFIG.unlockFields.shotMilestone);
  requireField(tables.unlocks, CONFIG.unlockFields.milestoneSourceKey);
  requireField(tables.unlocks, CONFIG.unlockFields.milestoneActivityDate);
  requireField(tables.unlocks, CONFIG.unlockFields.active);
  requireField(tables.weeks, CONFIG.weekFields.startDate);
  requireField(tables.weeks, CONFIG.weekFields.endDate);

  if (!isWritableField(tables.unlocks, CONFIG.unlockFields.week)) {
    throw new Error(
      `Field is not writable: ${CONFIG.tables.unlocks}.${CONFIG.unlockFields.week}`
    );
  }
}

/* =========================================================
   SECTION 5 — DATA HELPERS
========================================================= */

function getLinkedIds(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.id).filter(Boolean);
}

function getLinkedNames(record, fieldName) {
  if (!fieldName) return [];
  const value = record.getCellValue(fieldName);
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.name || "").filter(Boolean);
}

function getText(record, fieldName) {
  if (!fieldName) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getOptionalText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return getText(record, fieldName);
}

function getNumber(record, fieldName) {
  if (!fieldName) return 0;
  const value = record.getCellValue(fieldName);
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number") return first;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBooleanish(record, fieldName, fallback = false) {
  if (!fieldName) return fallback;
  const value = record.getCellValue(fieldName);
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  if (value && typeof value === "object" && value.name) {
    const name = String(value.name).trim().toLowerCase();
    return ["1", "true", "yes", "checked", "active"].includes(name);
  }
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function getGradeBandLabel(record, fieldName) {
  const linkedNames = getLinkedNames(record, fieldName);
  if (linkedNames.length > 0) return linkedNames[0];
  return getText(record, fieldName);
}

function normalizeGradeBandLabel(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  text = text.replace(/\s+/g, " ");
  text = text.replace(/[–—−]/g, "-");
  text = text.replace(/^grades?\s+/i, "");
  return text;
}

/**
 * Prefer linked Grade Band record IDs. Fall back to normalized display labels
 * only when one side lacks a usable link (legacy / incomplete rows).
 */
function gradeBandsMatchForMilestone(enrollmentRecord, milestoneRecord) {
  const enrollmentBandIds = getLinkedIds(enrollmentRecord, CONFIG.enrollmentFields.gradeBand);
  const milestoneBandIds = getLinkedIds(milestoneRecord, CONFIG.shotMilestoneFields.gradeBand);
  if (enrollmentBandIds.length > 0 && milestoneBandIds.length > 0) {
    return milestoneBandIds.some((id) => enrollmentBandIds.includes(id));
  }
  const enrollmentLabel = normalizeGradeBandLabel(
    getGradeBandLabel(enrollmentRecord, CONFIG.enrollmentFields.gradeBand)
  );
  const milestoneLabel = normalizeGradeBandLabel(
    getGradeBandLabel(milestoneRecord, CONFIG.shotMilestoneFields.gradeBand)
  );
  return Boolean(enrollmentLabel && milestoneLabel && enrollmentLabel === milestoneLabel);
}

function getDateValue(record, fieldName) {
  if (!fieldName) return null;
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toDateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    const month = localMatch[1].padStart(2, "0");
    const day = localMatch[2].padStart(2, "0");
    const year = localMatch[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

function toDateKeyFromDateObject(value, timeZone = CONFIG.timeZone) {
  if (!value) return "";

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function toSafeDateKey(record, table, fieldName) {
  const raw = record.getCellValue(fieldName);
  const text = getText(record, fieldName);

  const fromText = toDateKeyFromText(text);
  if (fromText) return fromText;

  return toDateKeyFromDateObject(raw, CONFIG.timeZone);
}

function compareDateKeys(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return String(a).localeCompare(String(b));
}

function formatDateForNotes(dateValue) {
  if (!dateValue) return "No date";
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addIfWritable(table, payload, fieldName, value) {
  if (!fieldName || !fieldExists(table, fieldName)) return;
  if (!isWritableField(table, fieldName)) {
    console.log(`Skipped non-writable field: ${table.name} -> ${fieldName}`);
    return;
  }
  if (value === undefined) return;
  payload[fieldName] = value;
}

function buildSafeUpdatePayload(table, fields) {
  const safeFields = {};
  for (const [fieldName, value] of Object.entries(fields || {})) {
    addIfWritable(table, safeFields, fieldName, value);
  }
  return safeFields;
}

async function updateEnrollment(enrollmentsTable, enrollmentRecord, fields) {
  const safeFields = buildSafeUpdatePayload(enrollmentsTable, fields);
  if (Object.keys(safeFields).length > 0) {
    await enrollmentsTable.updateRecordAsync(enrollmentRecord.id, safeFields);
  }
}

function buildMilestoneSourceKey(enrollmentId, shotMilestoneId) {
  return `${CONFIG.sourceKeyPrefix}${enrollmentId}|${shotMilestoneId}`;
}

/* =========================================================
   SECTION 6 — WEEK RESOLUTION
========================================================= */

function findWeekForDate(weekRecords, weeksTable, activityDateKey, programInstanceId) {
  if (!activityDateKey) return null;

  const activeField = fieldExists(weeksTable, CONFIG.weekFields.active)
    ? CONFIG.weekFields.active
    : fieldExists(weeksTable, CONFIG.weekFields.activeAlt)
      ? CONFIG.weekFields.activeAlt
      : "";

  const candidates = weekRecords
    .map((week) => {
      const startKey = toSafeDateKey(week, weeksTable, CONFIG.weekFields.startDate);
      const endKey = toSafeDateKey(week, weeksTable, CONFIG.weekFields.endDate);
      const weekPi = fieldExists(weeksTable, CONFIG.weekFields.programInstance)
        ? getLinkedIds(week, CONFIG.weekFields.programInstance)[0] || ""
        : "";
      const isActive = activeField
        ? getBooleanish(week, activeField, true)
        : true;

      return { week, startKey, endKey, isActive, weekPi };
    })
    .filter((item) => {
      if (programInstanceId && item.weekPi && item.weekPi !== programInstanceId) {
        return false;
      }
      return (
        item.isActive &&
        item.startKey &&
        item.endKey &&
        compareDateKeys(activityDateKey, item.startKey) >= 0 &&
        compareDateKeys(activityDateKey, item.endKey) <= 0
      );
    })
    .sort((a, b) => {
      const startCompare = compareDateKeys(a.startKey, b.startKey);
      if (startCompare !== 0) return startCompare;

      const endCompare = compareDateKeys(a.endKey, b.endKey);
      if (endCompare !== 0) return endCompare;

      return String(a.week.name || "").localeCompare(String(b.week.name || ""));
    });

  if (candidates.length > 1) {
    throw new Error(
      `Multiple active Weeks matched Activity Date ${activityDateKey}` +
        (programInstanceId ? ` inside Program Instance ${programInstanceId}` : "") +
        ` (${candidates.length}): ${candidates.map((c) => c.week.id).join(", ")}`
    );
  }

  return candidates.length > 0 ? candidates[0].week : null;
}

function resolveWeekIdForActivityDate(
  weekRecords,
  weeksTable,
  activityDate,
  programInstanceId
) {
  const dateKey = toDateKeyFromDateObject(activityDate, CONFIG.timeZone);
  if (!dateKey) return { weekId: "", dateKey: "" };
  const weekRecord = findWeekForDate(
    weekRecords,
    weeksTable,
    dateKey,
    programInstanceId
  );
  return {
    weekId: weekRecord ? weekRecord.id : "",
    dateKey,
    weekName: weekRecord ? weekRecord.name : "",
  };
}

/* =========================================================
   SECTION 7 — BATCH WRITE HELPERS
========================================================= */

/**
 * Normalize one create payload to Airtable createRecordsAsync shape.
 * Accepts either a raw field map OR `{ fields: {...} }` (optional unused `id`).
 * Keep in sync with lib/066-create-records-batch.js (offline tests).
 */
function normalizeCreateRecordPayload(payload, index) {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(
      `createRecordsInBatches: payloads[${index}] must be a non-null object ` +
        `(got ${payload == null ? String(payload) : Array.isArray(payload) ? "array" : typeof payload})`
    );
  }

  const keys = Object.keys(payload);
  const hasFieldsProp = Object.prototype.hasOwnProperty.call(payload, "fields");
  const fieldsValue = hasFieldsProp ? payload.fields : undefined;
  const fieldsIsPlainObject =
    fieldsValue != null && typeof fieldsValue === "object" && !Array.isArray(fieldsValue);

  if (hasFieldsProp && fieldsIsPlainObject) {
    const siblingKeys = keys.filter((k) => k !== "fields" && k !== "id");
    if (siblingKeys.length === 0) {
      if (Object.keys(fieldsValue).length === 0) {
        throw new Error(`createRecordsInBatches: payloads[${index}].fields is empty`);
      }
      return { fields: fieldsValue };
    }
  }

  if (keys.length === 0) {
    throw new Error(`createRecordsInBatches: payloads[${index}] has no fields`);
  }

  return { fields: payload };
}

/**
 * Defensive batch create for Athlete Achievement Unlocks.
 * Callers may push raw field maps (historical 066) or `{ fields }` objects.
 * Airtable always receives createRecordsAsync([{ fields: {...} }, ...]).
 */
async function createRecordsInBatches(table, payloads) {
  const batchSize = CONFIG.batchSize || 50;
  if (!payloads.length) return;

  const normalized = payloads.map((payload, index) =>
    normalizeCreateRecordPayload(payload, index)
  );

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      debugStep: "createRecordsInBatches",
      payloadCount: payloads.length,
      normalizedCount: normalized.length,
      batchSize,
      sampleFieldKeys: Object.keys(normalized[0].fields).slice(0, 12),
      inputShape: Object.prototype.hasOwnProperty.call(payloads[0], "fields")
        ? "fields-wrapped-or-ambiguous"
        : "raw-field-map",
    })
  );

  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j += 1) {
      if (!batch[j] || !batch[j].fields || typeof batch[j].fields !== "object") {
        throw new Error(
          `createRecordsInBatches: internal normalize failed at absolute index ${i + j} — missing fields`
        );
      }
    }
    await table.createRecordsAsync(batch);
  }
}

async function updateRecordsInBatches(table, updates) {
  const batchSize = CONFIG.batchSize || 50;
  if (!updates.length) return;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j += 1) {
      const row = batch[j];
      if (!row || !row.id || !row.fields || typeof row.fields !== "object") {
        throw new Error(
          `updateRecordsInBatches: updates[${i + j}] must be { id, fields } ` +
            `(got keys: ${row && typeof row === "object" ? Object.keys(row).join(",") : String(row)})`
        );
      }
    }
    if (batch.length === 1) {
      await table.updateRecordAsync(batch[0].id, batch[0].fields);
    } else {
      await table.updateRecordsAsync(batch);
    }
  }
}

/* =========================================================
   SECTION 7b — SC-163 GOAL MET DATE (isolated; keep in sync with
   lib/sc-163-goal-met-date.js)
========================================================= */

function goalMetTruthy(record, fieldName) {
  const text = getText(record, fieldName);
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower !== "false" && lower !== "0" && lower !== "no";
}

function resolveTargetGoalShotsFromRecord(record, fieldName) {
  if (!fieldName) return { status: "missing", target: 0 };
  const raw = record.getCellValue(fieldName);
  if (raw == null || raw === "") return { status: "missing", target: 0 };
  if (Array.isArray(raw)) {
    const nums = [];
    for (const item of raw) {
      const n = typeof item === "number" ? item : Number(item);
      if (Number.isFinite(n) && n > 0) nums.push(n);
    }
    const unique = [...new Set(nums)];
    if (unique.length === 0) return { status: "missing", target: 0 };
    if (unique.length > 1) return { status: "ambiguous", target: 0 };
    return { status: "ok", target: unique[0] };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { status: "missing", target: 0 };
  return { status: "ok", target: n };
}

function findFirstGoalMetCrossingFromSubmissions(submissions, targetGoalShots) {
  const target = Number(targetGoalShots);
  if (!Number.isFinite(target) || target <= 0) return null;
  let runningTotal = 0;
  for (const submission of submissions) {
    const shots = Number(submission.totalShotsCounted) || 0;
    if (shots <= 0 || !(submission.activityDate instanceof Date)) continue;
    const beforeTotal = runningTotal;
    runningTotal += shots;
    if (beforeTotal < target && runningTotal >= target) {
      return {
        date: submission.activityDate,
        dateKey: toDateKeyFromDateObject(submission.activityDate, CONFIG.timeZone),
        submissionId: submission.record.id,
        beforeTotal,
        afterTotal: runningTotal,
        submissionShots: shots,
      };
    }
  }
  return null;
}

function decideGoalMetDateWriteInline(input) {
  const existing = input.existingDate;
  const existingKey = existing
    ? toDateKeyFromDateObject(existing, CONFIG.timeZone) ||
      String(existing || "").trim().slice(0, 10)
    : "";
  if (existingKey) {
    return { action: CONFIG.goalMetDateActions.skippedAlreadySet, dateKey: existingKey };
  }
  if (input.targetStatus === "ambiguous") {
    return { action: CONFIG.goalMetDateActions.errorAmbiguous };
  }
  if (input.targetStatus === "missing") {
    return { action: CONFIG.goalMetDateActions.skippedNoTarget };
  }
  if (!input.goalMetNow) {
    return { action: CONFIG.goalMetDateActions.skippedNotMet };
  }
  const target = Number(input.target) || 0;
  const calculated = Number(input.calculatedTotal);
  if (Number.isFinite(calculated) && target > 0 && calculated < target && input.goalMetNow) {
    return { action: CONFIG.goalMetDateActions.errorAmbiguous };
  }
  if (!input.crossing || !input.crossing.dateKey) {
    return { action: CONFIG.goalMetDateActions.errorUnprovable };
  }
  return {
    action: CONFIG.goalMetDateActions.stamped,
    dateKey: input.crossing.dateKey,
    crossing: input.crossing,
  };
}

function emitGoalMetDateOutputs(result) {
  setOutputSafe("goalMetDateActionOut", result.action || "");
  setOutputSafe("goalMetDateOut", result.dateKey || "");
}

/**
 * Isolated Goal Met Date stamp. Never throws into milestone flow.
 * Public outputs omit athlete names and submission/enrollment IDs.
 */
async function maybeStampGoalMetDateIsolated({
  enrollmentsTable,
  enrollmentRecord,
  enrollmentSubmissions,
  calculatedTotalShots,
}) {
  const empty = { action: "", dateKey: "" };
  try {
    const goalMetDateField = CONFIG.enrollmentFields.goalMetDate;
    if (!fieldExists(enrollmentsTable, goalMetDateField)) {
      return { action: CONFIG.goalMetDateActions.skippedFieldMissing, dateKey: "" };
    }
    if (!isWritableField(enrollmentsTable, goalMetDateField)) {
      return { action: CONFIG.goalMetDateActions.skippedFieldNotWritable, dateKey: "" };
    }

    const existingDate = getDateValue(enrollmentRecord, goalMetDateField);
    const targetResolved = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.targetGoalShots)
      ? resolveTargetGoalShotsFromRecord(enrollmentRecord, CONFIG.enrollmentFields.targetGoalShots)
      : { status: "missing", target: 0 };

    const reportedTotal = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.totalShotsCounted)
      ? getNumber(enrollmentRecord, CONFIG.enrollmentFields.totalShotsCounted)
      : calculatedTotalShots;

    const goalMetFromFormula = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.goalMet)
      ? goalMetTruthy(enrollmentRecord, CONFIG.enrollmentFields.goalMet)
      : false;
    const goalMetNow =
      goalMetFromFormula ||
      (targetResolved.status === "ok" &&
        (reportedTotal >= targetResolved.target || calculatedTotalShots >= targetResolved.target));

    const crossing =
      targetResolved.status === "ok"
        ? findFirstGoalMetCrossingFromSubmissions(enrollmentSubmissions, targetResolved.target)
        : null;

    const decision = decideGoalMetDateWriteInline({
      existingDate,
      goalMetNow,
      crossing,
      targetStatus: targetResolved.status,
      target: targetResolved.target,
      calculatedTotal: calculatedTotalShots,
      reportedTotal,
    });

    if (decision.action === CONFIG.goalMetDateActions.stamped && decision.crossing) {
      // Date-only stamp: prefer YYYY-MM-DD key for US local date fields.
      await enrollmentsTable.updateRecordAsync(enrollmentRecord.id, {
        [goalMetDateField]: decision.dateKey,
      });
      console.log(
        JSON.stringify({
          automation: SCRIPT.scriptName,
          version: SCRIPT.version,
          debugStep: "goalMetDate_stamped",
          goalMetDateActionOut: decision.action,
          goalMetDateOut: decision.dateKey,
          beforeTotal: decision.crossing.beforeTotal,
          afterTotal: decision.crossing.afterTotal,
          target: targetResolved.target,
        })
      );
      return { action: decision.action, dateKey: decision.dateKey };
    }

    if (
      decision.action === CONFIG.goalMetDateActions.errorUnprovable ||
      decision.action === CONFIG.goalMetDateActions.errorAmbiguous
    ) {
      console.log(
        JSON.stringify({
          automation: SCRIPT.scriptName,
          version: SCRIPT.version,
          debugStep: "goalMetDate_fail_closed",
          goalMetDateActionOut: decision.action,
          calculatedTotalShots,
          reportedTotal,
          targetStatus: targetResolved.status,
        })
      );
    }

    return { action: decision.action, dateKey: decision.dateKey || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        debugStep: "goalMetDate_isolated_error",
        goalMetDateActionOut: CONFIG.goalMetDateActions.errorAmbiguous,
        errorClass: message.slice(0, 120),
      })
    );
    return {
      action: CONFIG.goalMetDateActions.errorAmbiguous,
      dateKey: empty.dateKey,
    };
  }
}

/* =========================================================
   SECTION 8 — MAIN
========================================================= */

function readTriggerRecordId() {
  if (typeof input === "undefined" || !input?.config) {
    throw new Error("Missing input configuration; recordId is required.");
  }
  const recordId = String(input.config().recordId || "").trim();
  if (!recordId) throw new Error("Missing input variable: recordId");
  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Enrollment recordId: ${recordId}`);
  }
  return recordId;
}

async function main() {
  let debugStep = "0 - Start";
  setOutputSafe("debugStep", debugStep);

  debugStep = "1 - Validate recordId";
  setOutputSafe("debugStep", debugStep);

  const recordId = readTriggerRecordId();

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const shotMilestonesTable = base.getTable(CONFIG.tables.shotMilestones);
  const achievementsTable = base.getTable(CONFIG.tables.achievements);
  const unlocksTable = base.getTable(CONFIG.tables.unlocks);
  const weeksTable = base.getTable(CONFIG.tables.weeks);

  debugStep = "2 - Validate schema";
  setOutputSafe("debugStep", debugStep);

  validateRequiredSchema({
    enrollments: enrollmentsTable,
    submissions: submissionsTable,
    shotMilestones: shotMilestonesTable,
    achievements: achievementsTable,
    unlocks: unlocksTable,
    weeks: weeksTable,
  });

  debugStep = "3 - Load Enrollment";
  setOutputSafe("debugStep", debugStep);

  const enrollmentFieldsToLoad = fieldList(enrollmentsTable, [
    CONFIG.enrollmentFields.active,
    CONFIG.enrollmentFields.gradeBand,
    CONFIG.enrollmentFields.totalShots,
    CONFIG.enrollmentFields.totalShotsCounted,
    CONFIG.enrollmentFields.runCheck,
    CONFIG.enrollmentFields.programInstance,
    CONFIG.enrollmentFields.goalMet,
    CONFIG.enrollmentFields.goalMetDate,
    CONFIG.enrollmentFields.targetGoalShots,
  ]);

  const enrollmentRecord = await enrollmentsTable.selectRecordAsync(recordId, {
    fields: enrollmentFieldsToLoad,
  });

  if (!enrollmentRecord) {
    throw new Error(`Enrollment record not found: ${recordId}`);
  }

  const enrollmentId = enrollmentRecord.id;

  debugStep = "4 - Check enrollment active";
  setOutputSafe("debugStep", debugStep);

  const enrollmentActive = fieldExists(enrollmentsTable, CONFIG.enrollmentFields.active)
    ? getBooleanish(enrollmentRecord, CONFIG.enrollmentFields.active, true)
    : true;

  if (!enrollmentActive) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedInactive,
      errorOut: "Skipped: Enrollment is not active.",
      debugStep,
      enrollmentId,
    });
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.skipped,
        actionOut: CONFIG.actions.skippedInactive,
        enrollmentId,
      })
    );
    return;
  }

  const enrollmentGradeBand = getGradeBandLabel(
    enrollmentRecord,
    CONFIG.enrollmentFields.gradeBand
  );
  const enrollmentGradeBandIds = getLinkedIds(
    enrollmentRecord,
    CONFIG.enrollmentFields.gradeBand
  );
  const enrollmentProgramInstanceId = getLinkedIds(
    enrollmentRecord,
    CONFIG.enrollmentFields.programInstance
  )[0] || "";

  if (!enrollmentProgramInstanceId) {
    throw new Error(
      `Enrollment ${enrollmentId} is missing Program Instance. ` +
        "Cannot safely resolve Weeks for shot milestone unlocks across Program Instances."
    );
  }

  if (!enrollmentGradeBand && enrollmentGradeBandIds.length === 0) {
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: CONFIG.actions.skippedInactive,
      errorOut: "Skipped: Enrollment is missing Grade Band.",
      debugStep,
      enrollmentId,
    });
    return;
  }

  debugStep = "5 - Load submissions and weeks";
  setOutputSafe("debugStep", debugStep);

  const [submissionQuery, weekQuery, unlockQuery, achievementQuery, shotMilestoneQuery] =
    await Promise.all([
      submissionsTable.selectRecordsAsync({
        fields: fieldList(submissionsTable, [
          CONFIG.submissionFields.enrollment,
          CONFIG.submissionFields.activityDate,
          CONFIG.submissionFields.totalShotsCounted,
          CONFIG.submissionFields.countThisSubmission,
        ]),
      }),
      weeksTable.selectRecordsAsync({
        fields: fieldList(weeksTable, [
          CONFIG.weekFields.startDate,
          CONFIG.weekFields.endDate,
          CONFIG.weekFields.active,
          CONFIG.weekFields.activeAlt,
          CONFIG.weekFields.programInstance,
        ]),
      }),
      unlocksTable.selectRecordsAsync({
        fields: fieldList(unlocksTable, [
          CONFIG.unlockFields.milestoneSourceKey,
          CONFIG.unlockFields.enrollment,
          CONFIG.unlockFields.shotMilestone,
          CONFIG.unlockFields.milestoneActivityDate,
          CONFIG.unlockFields.week,
          CONFIG.unlockFields.active,
          CONFIG.unlockFields.xpAwardStatus,
        ]),
      }),
      achievementsTable.selectRecordsAsync({
        fields: fieldList(achievementsTable, [
          getAvailableField(
            achievementsTable,
            CONFIG.achievementFields.name,
            CONFIG.achievementFields.fallbackName
          ),
          CONFIG.achievementFields.rewardRuleKey,
          CONFIG.achievementFields.active,
        ].filter(Boolean)),
      }),
      shotMilestonesTable.selectRecordsAsync({
        fields: fieldList(shotMilestonesTable, [
          CONFIG.shotMilestoneFields.label,
          CONFIG.shotMilestoneFields.gradeBand,
          CONFIG.shotMilestoneFields.milestonePercent,
          CONFIG.shotMilestoneFields.milestoneShotCount,
          CONFIG.shotMilestoneFields.pointsAwarded,
          CONFIG.shotMilestoneFields.active,
          CONFIG.shotMilestoneFields.uniqueKey,
        ]),
      }),
    ]);

  const enrollmentSubmissions = submissionQuery.records
    .filter((submission) =>
      getLinkedIds(submission, CONFIG.submissionFields.enrollment).includes(enrollmentId)
    )
    .map((submission) => ({
      record: submission,
      activityDate: getDateValue(submission, CONFIG.submissionFields.activityDate),
      totalShotsCounted: getNumber(submission, CONFIG.submissionFields.totalShotsCounted),
      countThisSubmission: getBooleanish(
        submission,
        CONFIG.submissionFields.countThisSubmission,
        false
      ),
    }))
    .filter((submission) =>
      submission.countThisSubmission &&
      submission.activityDate &&
      submission.totalShotsCounted > 0
    )
    .sort((a, b) => {
      const dateDiff = a.activityDate.getTime() - b.activityDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdA = a.record.createdTime ? new Date(a.record.createdTime).getTime() : 0;
      const createdB = b.record.createdTime ? new Date(b.record.createdTime).getTime() : 0;
      if (createdA !== createdB) return createdA - createdB;
      return a.record.id.localeCompare(b.record.id);
    });

  const calculatedTotalShots = enrollmentSubmissions.reduce(
    (sum, submission) => sum + submission.totalShotsCounted,
    0
  );

  const enrollmentReportedTotalShots = getNumber(
    enrollmentRecord,
    CONFIG.enrollmentFields.totalShots
  );

  debugStep = "5b - SC-163 Goal Met Date (isolated)";
  setOutputSafe("debugStep", debugStep);

  const goalMetDateResult = await maybeStampGoalMetDateIsolated({
    enrollmentsTable,
    enrollmentRecord,
    enrollmentSubmissions,
    calculatedTotalShots,
  });
  emitGoalMetDateOutputs(goalMetDateResult);

  debugStep = "6 - Resolve Shot Milestone achievement";
  setOutputSafe("debugStep", debugStep);

  const achievementNameField = getAvailableField(
    achievementsTable,
    CONFIG.achievementFields.name,
    CONFIG.achievementFields.fallbackName
  );

  if (!achievementNameField) {
    throw new Error("Achievements table is missing Achievement Name or Name field.");
  }

  requireField(achievementsTable, CONFIG.achievementFields.rewardRuleKey);

  const matchingAchievements = achievementQuery.records.filter((achievement) => {
    const achievementName = getText(achievement, achievementNameField);
    const rewardRuleKey = getText(achievement, CONFIG.achievementFields.rewardRuleKey);
    const active = fieldExists(achievementsTable, CONFIG.achievementFields.active)
      ? getBooleanish(achievement, CONFIG.achievementFields.active, true)
      : true;

    return (
      active &&
      (achievementName === CONFIG.achievementLookup.name ||
        rewardRuleKey === CONFIG.achievementLookup.rewardRuleKey)
    );
  });

  if (matchingAchievements.length === 0) {
    throw new Error(
      `No active Achievement found for "${CONFIG.achievementLookup.name}" or Reward Rule Key "${CONFIG.achievementLookup.rewardRuleKey}".`
    );
  }
  if (matchingAchievements.length > 1) {
    throw new Error(
      `Multiple active Shot Milestone achievements found. Keep only one active "${CONFIG.achievementLookup.name}" achievement.`
    );
  }

  const shotMilestoneAchievement = matchingAchievements[0];

  const existingUnlockBySourceKey = new Map();
  for (const unlock of unlockQuery.records) {
    const sourceKey = getText(unlock, CONFIG.unlockFields.milestoneSourceKey);
    if (sourceKey) {
      if (existingUnlockBySourceKey.has(sourceKey)) {
        throw new Error(
          `Duplicate Athlete Achievement Unlock source key ${sourceKey}: ` +
          `${existingUnlockBySourceKey.get(sourceKey).id}, ${unlock.id}.`
        );
      }
      existingUnlockBySourceKey.set(sourceKey, unlock);
    }
  }

  debugStep = "7 - Build eligible milestones";
  setOutputSafe("debugStep", debugStep);

  const eligibleMilestones = [];
  const activeMilestonesBySourceKey = new Map();

  for (const milestone of shotMilestoneQuery.records) {
    const active = fieldExists(shotMilestonesTable, CONFIG.shotMilestoneFields.active)
      ? getBooleanish(milestone, CONFIG.shotMilestoneFields.active, true)
      : true;
    if (!active) continue;

    if (!gradeBandsMatchForMilestone(enrollmentRecord, milestone)) continue;

    const milestoneShotCount = getNumber(
      milestone,
      CONFIG.shotMilestoneFields.milestoneShotCount
    );
    if (!milestoneShotCount || milestoneShotCount <= 0) continue;
    const sourceKey = buildMilestoneSourceKey(enrollmentId, milestone.id);
    activeMilestonesBySourceKey.set(sourceKey, { record: milestone, shotCount: milestoneShotCount });
    if (calculatedTotalShots < milestoneShotCount) continue;

    eligibleMilestones.push({
      record: milestone,
      sourceKey,
      shotCount: milestoneShotCount,
      percent: getNumber(milestone, CONFIG.shotMilestoneFields.milestonePercent),
      label: getText(milestone, CONFIG.shotMilestoneFields.label),
      points: getNumber(milestone, CONFIG.shotMilestoneFields.pointsAwarded),
    });
  }

  eligibleMilestones.sort((a, b) => {
    if (a.shotCount !== b.shotCount) return a.shotCount - b.shotCount;
    return a.percent - b.percent;
  });

  // Reconcile only exact source-key rows owned by this Enrollment and an active,
  // grade-matched milestone. Historical/inactive configuration remains untouched.
  const withdrawalUpdates = [];
  let deactivatedCount = 0;
  for (const [sourceKey, existingUnlock] of existingUnlockBySourceKey.entries()) {
    const milestone = activeMilestonesBySourceKey.get(sourceKey);
    if (!milestone || calculatedTotalShots >= milestone.shotCount) continue;
    const unlockEnrollmentIds = getLinkedIds(existingUnlock, CONFIG.unlockFields.enrollment);
    const unlockMilestoneIds = getLinkedIds(existingUnlock, CONFIG.unlockFields.shotMilestone);
    if (
      unlockEnrollmentIds.length !== 1 ||
      unlockEnrollmentIds[0] !== enrollmentId ||
      unlockMilestoneIds.length !== 1 ||
      unlockMilestoneIds[0] !== milestone.record.id
    ) {
      throw new Error(`Unlock ${existingUnlock.id} failed exact ownership for ${sourceKey}.`);
    }
    const payload = {};
    addIfWritable(unlocksTable, payload, CONFIG.unlockFields.active, false);
    if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
      addIfWritable(
        unlocksTable,
        payload,
        CONFIG.unlockFields.xpAwardStatus,
        singleSelectValue(unlocksTable, CONFIG.unlockFields.xpAwardStatus, CONFIG.statuses.pending)
      );
    }
    addIfWritable(
      unlocksTable,
      payload,
      CONFIG.unlockFields.notes,
      `${getOptionalText(existingUnlock, unlocksTable, CONFIG.unlockFields.notes)}\n066 deactivated below-threshold milestone lifecycle: ${sourceKey}.`
    );
    withdrawalUpdates.push({ id: existingUnlock.id, fields: payload });
    deactivatedCount += 1;
  }

  if (eligibleMilestones.length === 0) {
    await updateRecordsInBatches(unlocksTable, withdrawalUpdates);
    await updateEnrollment(enrollmentsTable, enrollmentRecord, {
      [CONFIG.enrollmentFields.runCheck]: false,
    });
    setSkippedOutputs({
      actionOut: deactivatedCount > 0 ? CONFIG.actions.reconciled : CONFIG.actions.skippedNoMilestones,
      errorOut: "",
      debugStep,
      enrollmentId,
    });
    emitGoalMetDateOutputs(goalMetDateResult);
    return;
  }

  debugStep = "8 - Determine milestone crossings";
  setOutputSafe("debugStep", debugStep);

  const crossingByMilestoneId = new Map();
  let runningTotal = 0;

  for (const submission of enrollmentSubmissions) {
    const beforeTotal = runningTotal;
    runningTotal += submission.totalShotsCounted;

    for (const milestone of eligibleMilestones) {
      if (crossingByMilestoneId.has(milestone.record.id)) continue;

      if (beforeTotal < milestone.shotCount && runningTotal >= milestone.shotCount) {
        crossingByMilestoneId.set(milestone.record.id, {
          activityDate: submission.activityDate,
          submissionRecordId: submission.record.id,
          beforeTotal,
          afterTotal: runningTotal,
          submissionShots: submission.totalShotsCounted,
        });
      }
    }
  }

  debugStep = "9 - Create or update unlocks";
  setOutputSafe("debugStep", debugStep);

  let createdCount = 0;
  let updatedExistingCount = 0;
  let skippedExistingCount = 0;
  let missingCrossingDateCount = 0;
  let weekWriteCount = 0;

  const unlockCreatesPending = [];
  const unlockUpdatesPending = [...withdrawalUpdates];

  for (const milestone of eligibleMilestones) {
    const crossing = crossingByMilestoneId.get(milestone.record.id);

    if (!crossing || !crossing.activityDate) {
      missingCrossingDateCount += 1;
      continue;
    }

    const weekResolved = resolveWeekIdForActivityDate(
      weekQuery.records,
      weeksTable,
      crossing.activityDate,
      enrollmentProgramInstanceId
    );

    const existingUnlock = existingUnlockBySourceKey.get(milestone.sourceKey);

    if (existingUnlock) {
      const updatePayload = {};
      let didUpdate = false;
      const existingActive = getBooleanish(existingUnlock, CONFIG.unlockFields.active, false);

      if (!existingActive) {
        addIfWritable(unlocksTable, updatePayload, CONFIG.unlockFields.active, true);
        if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
          addIfWritable(
            unlocksTable,
            updatePayload,
            CONFIG.unlockFields.xpAwardStatus,
            singleSelectValue(unlocksTable, CONFIG.unlockFields.xpAwardStatus, CONFIG.statuses.pending)
          );
        }
        didUpdate = true;
      }

      const existingActivityDate = getDateValue(
        existingUnlock,
        CONFIG.unlockFields.milestoneActivityDate
      );
      if (!existingActivityDate) {
        addIfWritable(
          unlocksTable,
          updatePayload,
          CONFIG.unlockFields.milestoneActivityDate,
          crossing.activityDate
        );
        didUpdate = true;
      }

      const existingWeekId = getLinkedIds(existingUnlock, CONFIG.unlockFields.week)[0] || "";
      if (!existingWeekId && weekResolved.weekId) {
        addIfWritable(unlocksTable, updatePayload, CONFIG.unlockFields.week, [
          { id: weekResolved.weekId },
        ]);
        didUpdate = true;
        weekWriteCount += 1;
      }

      if (fieldExists(unlocksTable, CONFIG.unlockFields.notes) && didUpdate) {
        addIfWritable(
          unlocksTable,
          updatePayload,
          CONFIG.unlockFields.notes,
          [
            getOptionalText(existingUnlock, unlocksTable, CONFIG.unlockFields.notes),
            `Updated by ${SCRIPT.scriptName} ${SCRIPT.version}. Milestone Activity Date: ${formatDateForNotes(crossing.activityDate)}. Week: ${weekResolved.weekName || weekResolved.weekId || "unresolved"}. Crossing Submission: ${crossing.submissionRecordId}.`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      if (Object.keys(updatePayload).length > 0) {
        unlockUpdatesPending.push({ id: existingUnlock.id, fields: updatePayload });
        updatedExistingCount += 1;
      } else {
        skippedExistingCount += 1;
      }

      continue;
    }

    const unlockPayload = {};

    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.enrollment, [
      { id: enrollmentId },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.achievement, [
      { id: shotMilestoneAchievement.id },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.shotMilestone, [
      { id: milestone.record.id },
    ]);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.milestoneSourceKey, milestone.sourceKey);
    addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.active, true);
    addIfWritable(
      unlocksTable,
      unlockPayload,
      CONFIG.unlockFields.milestoneActivityDate,
      crossing.activityDate
    );

    if (weekResolved.weekId) {
      addIfWritable(unlocksTable, unlockPayload, CONFIG.unlockFields.week, [
        { id: weekResolved.weekId },
      ]);
      weekWriteCount += 1;
    }

    if (fieldExists(unlocksTable, CONFIG.unlockFields.xpAwardStatus)) {
      addIfWritable(
        unlocksTable,
        unlockPayload,
        CONFIG.unlockFields.xpAwardStatus,
        singleSelectValue(unlocksTable, CONFIG.unlockFields.xpAwardStatus, CONFIG.statuses.pending)
      );
    }

    addIfWritable(
      unlocksTable,
      unlockPayload,
      CONFIG.unlockFields.notes,
      [
        `Created by ${SCRIPT.scriptName} ${SCRIPT.version}.`,
        `Calculated total shots from Submissions: ${calculatedTotalShots}.`,
        `Enrollment reported total shots: ${enrollmentReportedTotalShots || 0}.`,
        `Milestone: ${milestone.label || milestone.shotCount}.`,
        `Milestone Shot Count: ${milestone.shotCount}.`,
        `Points Awarded: ${milestone.points}.`,
        `Milestone Activity Date: ${formatDateForNotes(crossing.activityDate)}.`,
        `Week: ${weekResolved.weekName || weekResolved.weekId || "unresolved"}.`,
        `Crossing Submission: ${crossing.submissionRecordId}.`,
        `Running total crossed from ${crossing.beforeTotal} to ${crossing.afterTotal}.`,
        `Submission shots counted: ${crossing.submissionShots}.`,
      ].join("\n")
    );

    if (Object.keys(unlockPayload).length === 0) {
      throw new Error("No writable fields available to create Athlete Achievement Unlock.");
    }

    unlockCreatesPending.push(unlockPayload);
    createdCount += 1;
  }

  debugStep = "9b - Apply batched unlock writes";
  setOutputSafe("debugStep", debugStep);

  await createRecordsInBatches(unlocksTable, unlockCreatesPending);
  await updateRecordsInBatches(unlocksTable, unlockUpdatesPending);

  debugStep = "10 - Clear run check and finish";
  setOutputSafe("debugStep", debugStep);

  await updateEnrollment(enrollmentsTable, enrollmentRecord, {
    [CONFIG.enrollmentFields.runCheck]: false,
  });

  const actionOut =
    createdCount > 0
      ? CONFIG.actions.created
      : updatedExistingCount > 0
        ? CONFIG.actions.updated
        : skippedExistingCount > 0
          ? CONFIG.actions.skippedExisting
          : CONFIG.actions.created;

  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("createdUnlocksOut", createdCount);
  setOutputSafe("updatedUnlocksOut", updatedExistingCount);
  setOutputSafe("skippedExistingUnlocksOut", skippedExistingCount);
  setOutputSafe("deactivatedUnlocksOut", deactivatedCount);
  setOutputSafe("milestoneReconciliationOut", "active_unlock_lifecycle_reconciled");
  emitGoalMetDateOutputs(goalMetDateResult);

  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut,
        enrollmentId,
        gradeBand: enrollmentGradeBand,
        calculatedTotalShots,
        enrollmentReportedTotalShots: enrollmentReportedTotalShots || 0,
        eligibleMilestones: eligibleMilestones.length,
        createdUnlocks: createdCount,
        updatedExistingUnlockDates: updatedExistingCount,
        skippedExistingUnlocks: skippedExistingCount,
        missingCrossingDates: missingCrossingDateCount,
        weekWrites: weekWriteCount,
        deactivatedUnlocks: deactivatedCount,
        milestoneReconciliation: "active_unlock_lifecycle_reconciled",
        goalMetDateActionOut: goalMetDateResult.action || "",
        goalMetDateOut: goalMetDateResult.dateKey || "",
      },
      null,
      2
    )
  );
}

/* =========================================================
   SECTION 9 — RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", message);
  console.log(
    JSON.stringify(
      {
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.error,
        errorOut: message,
      },
      null,
      2
    )
  );
  throw error;
}
