/*
Automation: 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
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
 * 033 - WEEKLY SUMMARY AND GOAL LOGIC
 * Assign Homework to Weekly Athlete Summary
 *
 * Version: v3.2
 * Date Written: 2026-05-27
 * Last Updated: 2026-08-05
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Reads the linked Week and Grade Band.
 * - Prefers matching active Program Homework Assignments (MVP junction) by
 *   Program Instance (from Enrollment when available) + Week + Grade Band.
 * - Falls back to legacy FBC Curriculum - SYNC Week + Grade Band matching when
 *   no junction matches exist (or the junction table is absent).
 * - Writes matched reusable library homework records to Weekly Athlete Summary → Homework.
 *
 * Version 3.2 updates (2026-08-05):
 * - Additive Program Homework Assignments resolution path for scheduling reuse.
 * - Legacy curriculum Week link path retained as fallback (not deleted).
 *
 * IMPORTANT DESIGN RULES
 * - This automation only assigns homework to the Weekly Athlete Summary.
 * - Match by Program Instance + Week + Grade Band when using the junction table.
 * - Legacy path still matches by BOTH Week and Grade Band on FBC Curriculum - SYNC.
 * - Do not create homework library records here.
 * - Do not write to formula, rollup, lookup, or other read-only fields.
 * - Do not modify FBC Curriculum - SYNC.Week links.
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 *
 * AUTOMATION NAME
 * - 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * TRIGGER TYPE
 * - When record enters view
 *
 * RECOMMENDED TRIGGER VIEW CONDITIONS
 * - Week is not empty
 * - Grade Band is not empty
 * - Homework is empty
 *
 * REQUIRED AUTOMATION INPUT
 * - recordId = Airtable record ID from the triggering Weekly Athlete Summary record
 *
 * TABLES USED
 * - Weekly Athlete Summary
 * - FBC Curriculum - SYNC
 *
 * OUTPUTS
 * - ok
 * - weeklySummaryId
 * - weekId
 * - gradeBandId
 * - matchedCountOut
 * - homeworkIdsOut
 * - homeworkTitlesOut
 * - updatedOut
 * - actionTaken
 * - statusOut
 * - errorOut
 * - debugStep
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: CONFIG
========================================================= */

const CONFIG = {
  scriptName: "033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary",
  version: "v3.2",

  tables: {
    weeklySummary: "Weekly Athlete Summary",
    curriculum: "FBC Curriculum - SYNC",
    programHomeworkAssignments: "Program Homework Assignments",
    enrollments: "Enrollments",
  },

  weeklySummary: {
    week: "Week",
    gradeBand: "Grade Band",
    homework: "Homework",
    enrollment: "Enrollment",
  },

  enrollments: {
    programInstance: "Program Instance",
  },

  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band",
    slot: "Homework Slot",
    active: "Active?",
  },

  curriculum: {
    assignmentFullName: "Assignment Full Name",
    week: "Week",
    gradeBand: "Grade Band",
    active: "Active?",
    published: "Published?",
    assignmentNumber: "Assignment Number",
  },

  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },

  actions: {
    assignedHomework: "assigned_homework",
    assignedHomeworkFromPha: "assigned_homework_from_pha",
    alreadyAssigned: "already_assigned",
    skippedNoMatches: "skipped_no_matching_homework",
  },

  debug: {
    logToConsole: true,
    requireActive: true,
    requirePublished: true,
  },
};

/* =========================================================
   SECTION 2: INPUTS
========================================================= */

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();

if (!recordId) {
  throw new Error("Missing required input: recordId");
}

/* =========================================================
   SECTION 3: TABLE REFERENCES
========================================================= */

const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
const curriculumTable = base.getTable(CONFIG.tables.curriculum);

let phaTable = null;
try {
  phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments);
} catch {
  phaTable = null;
}

let enrollmentsTable = null;
try {
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
} catch {
  enrollmentsTable = null;
}

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

function fieldExists(table, fieldName) {
  if (!table || !fieldName) return false;

  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getFieldSafe(table, fieldName) {
  if (!table || !fieldName) return null;

  try {
    return table.getField(fieldName);
  } catch {
    return null;
  }
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

function getNumber(record, table, fieldName, fallback = 999999) {
  const raw = getRaw(record, table, fieldName);

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  const text = String(raw ?? "").replace(/,/g, "").trim();
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
  return ["1", "true", "yes", "checked", "active"].includes(text);
}

function getLinkedRecordIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);

  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => item?.id)
    .filter(Boolean);
}

function getFirstLinkedRecordId(record, table, fieldName) {
  const ids = getLinkedRecordIds(record, table, fieldName);
  return ids[0] || "";
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

async function updateRecordSafe(table, targetRecordId, updates) {
  const safeUpdates = {};

  for (const [fieldName, value] of Object.entries(updates || {})) {
    if (!fieldExists(table, fieldName)) {
      log(`Skipped missing field: ${table.name}.${fieldName}`);
      continue;
    }

    if (!isWritableField(table, fieldName)) {
      log(`Skipped non-writable field: ${table.name}.${fieldName}`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    safeUpdates[fieldName] = value;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return [];
  }

  await table.updateRecordAsync(targetRecordId, safeUpdates);
  return Object.keys(safeUpdates);
}

function buildCurriculumFieldsToLoad() {
  return [
    CONFIG.curriculum.assignmentFullName,
    CONFIG.curriculum.week,
    CONFIG.curriculum.gradeBand,
    CONFIG.curriculum.active,
    CONFIG.curriculum.published,
    CONFIG.curriculum.assignmentNumber,
  ].filter(fieldName => fieldExists(curriculumTable, fieldName));
}

function setFinalOutputs({
  ok,
  weeklySummaryId,
  weekId,
  gradeBandId,
  matchedCountOut,
  homeworkIdsOut,
  homeworkTitlesOut,
  updatedOut,
  actionTaken,
  statusOut,
  errorOut,
  debugStep,
}) {
  setOutputSafe("ok", ok);
  setOutputSafe("weeklySummaryId", weeklySummaryId || recordId);
  setOutputSafe("weekId", weekId || "");
  setOutputSafe("gradeBandId", gradeBandId || "");
  setOutputSafe("matchedCountOut", matchedCountOut || 0);
  setOutputSafe("homeworkIdsOut", homeworkIdsOut || "");
  setOutputSafe("homeworkTitlesOut", homeworkTitlesOut || "");
  setOutputSafe("updatedOut", Boolean(updatedOut));
  setOutputSafe("actionTaken", actionTaken || "");
  setOutputSafe("statusOut", statusOut || "");
  setOutputSafe("errorOut", errorOut || "");
  setOutputSafe("debugStep", debugStep || "");
}

/* =========================================================
   SECTION 5: FIELD VALIDATION
========================================================= */

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.week,
  "Weekly Athlete Summary -> Week"
);

requireField(
  weeklySummaryTable,
  CONFIG.weeklySummary.gradeBand,
  "Weekly Athlete Summary -> Grade Band"
);

requireWritableField(
  weeklySummaryTable,
  CONFIG.weeklySummary.homework,
  "Weekly Athlete Summary -> Homework"
);

// Curriculum Week/Grade Band remain required only for legacy fallback validation when PHA is absent.
if (!phaTable) {
  requireField(
    curriculumTable,
    CONFIG.curriculum.week,
    "FBC Curriculum - SYNC -> Week"
  );

  requireField(
    curriculumTable,
    CONFIG.curriculum.gradeBand,
    "FBC Curriculum - SYNC -> Grade Band"
  );

  if (CONFIG.debug.requireActive && fieldExists(curriculumTable, CONFIG.curriculum.active)) {
    requireField(
      curriculumTable,
      CONFIG.curriculum.active,
      "FBC Curriculum - SYNC -> Active?"
    );
  }

  if (CONFIG.debug.requirePublished && fieldExists(curriculumTable, CONFIG.curriculum.published)) {
    requireField(
      curriculumTable,
      CONFIG.curriculum.published,
      "FBC Curriculum - SYNC -> Published?"
    );
  }
}

/* =========================================================
   SECTION 6: MAIN
========================================================= */

async function main() {
  let debugStep = "Start";

  let weekId = "";
  let gradeBandId = "";
  let matchedHomeworkIds = [];
  let homeworkTitles = [];
  let actionTaken = "";
  let updatedFields = [];

  try {
    debugStep = "1 - Validate recordId";
    setOutputSafe("debugStep", debugStep);

    if (!recordId.startsWith("rec")) {
      throw new Error(`Invalid Weekly Athlete Summary recordId input: ${recordId}`);
    }

    debugStep = "2 - Load Weekly Athlete Summary";
    setOutputSafe("debugStep", debugStep);

    const summaryRecord = await weeklySummaryTable.selectRecordAsync(recordId);

    if (!summaryRecord) {
      setFinalOutputs({
        ok: false,
        weeklySummaryId: recordId,
        actionTaken: "summary_not_found",
        statusOut: CONFIG.statuses.error,
        errorOut: `Weekly Athlete Summary record not found: ${recordId}`,
        debugStep,
      });
      return;
    }

    debugStep = "3 - Read Summary Links";
    setOutputSafe("debugStep", debugStep);

    weekId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );

    gradeBandId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.gradeBand
    );

    const existingHomeworkIds = getLinkedRecordIds(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.homework
    );

    log("033 input", {
      recordId,
      weekId,
      gradeBandId,
      existingHomeworkIds,
    });

    debugStep = "4 - Validate Summary State";
    setOutputSafe("debugStep", debugStep);

    if (existingHomeworkIds.length > 0) {
      actionTaken = CONFIG.actions.alreadyAssigned;

      setFinalOutputs({
        ok: true,
        weeklySummaryId: recordId,
        weekId,
        gradeBandId,
        matchedCountOut: existingHomeworkIds.length,
        homeworkIdsOut: existingHomeworkIds.join(", "),
        homeworkTitlesOut: "",
        updatedOut: false,
        actionTaken,
        statusOut: CONFIG.statuses.skipped,
        errorOut: "",
        debugStep: "Done - Already assigned",
      });

      return;
    }

    if (!weekId) {
      throw new Error("Weekly Athlete Summary is missing Week.");
    }

    if (!gradeBandId) {
      throw new Error("Weekly Athlete Summary is missing Grade Band.");
    }

    let programInstanceId = "";
    if (
      enrollmentsTable &&
      fieldExists(weeklySummaryTable, CONFIG.weeklySummary.enrollment) &&
      fieldExists(enrollmentsTable, CONFIG.enrollments.programInstance)
    ) {
      const enrollmentId = getFirstLinkedRecordId(
        summaryRecord,
        weeklySummaryTable,
        CONFIG.weeklySummary.enrollment
      );
      if (enrollmentId) {
        const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);
        if (enrollmentRecord) {
          programInstanceId = getFirstLinkedRecordId(
            enrollmentRecord,
            enrollmentsTable,
            CONFIG.enrollments.programInstance
          );
        }
      }
    }

    let matchSource = "legacy_curriculum";

    if (
      phaTable &&
      fieldExists(phaTable, CONFIG.pha.homeworkAssignment) &&
      fieldExists(phaTable, CONFIG.pha.week) &&
      fieldExists(phaTable, CONFIG.pha.gradeBand)
    ) {
      debugStep = "5 - Load Program Homework Assignments";
      setOutputSafe("debugStep", debugStep);

      const phaFields = [
        CONFIG.pha.homeworkAssignment,
        CONFIG.pha.programInstance,
        CONFIG.pha.week,
        CONFIG.pha.gradeBand,
        CONFIG.pha.slot,
        CONFIG.pha.active,
      ].filter(name => fieldExists(phaTable, name));

      const phaQuery = await phaTable.selectRecordsAsync({ fields: phaFields });

      debugStep = "6 - Find Matching Homework via PHA";
      setOutputSafe("debugStep", debugStep);

      const matchingPha = phaQuery.records.filter(phaRecord => {
        const phaWeekId = getFirstLinkedRecordId(phaRecord, phaTable, CONFIG.pha.week);
        const phaGradeBandId = getFirstLinkedRecordId(phaRecord, phaTable, CONFIG.pha.gradeBand);
        if (phaWeekId !== weekId) return false;
        if (phaGradeBandId !== gradeBandId) return false;

        if (programInstanceId && fieldExists(phaTable, CONFIG.pha.programInstance)) {
          const phaPi = getFirstLinkedRecordId(phaRecord, phaTable, CONFIG.pha.programInstance);
          if (phaPi && phaPi !== programInstanceId) return false;
        }

        if (fieldExists(phaTable, CONFIG.pha.active)) {
          if (!getBooleanish(phaRecord, phaTable, CONFIG.pha.active)) return false;
        }

        return Boolean(getFirstLinkedRecordId(phaRecord, phaTable, CONFIG.pha.homeworkAssignment));
      });

      matchingPha.sort((a, b) => {
        const aSlot = String(
          (a.getCellValue(CONFIG.pha.slot) && a.getCellValue(CONFIG.pha.slot).name) || ""
        );
        const bSlot = String(
          (b.getCellValue(CONFIG.pha.slot) && b.getCellValue(CONFIG.pha.slot).name) || ""
        );
        const rank = s => (s === "HW1" ? 1 : s === "HW2" ? 2 : 9);
        if (rank(aSlot) !== rank(bSlot)) return rank(aSlot) - rank(bSlot);
        return a.id.localeCompare(b.id);
      });

      const seenLibrary = new Set();
      matchedHomeworkIds = [];
      homeworkTitles = [];
      for (const phaRecord of matchingPha) {
        const libraryId = getFirstLinkedRecordId(
          phaRecord,
          phaTable,
          CONFIG.pha.homeworkAssignment
        );
        if (!libraryId || seenLibrary.has(libraryId)) continue;
        seenLibrary.add(libraryId);
        matchedHomeworkIds.push(libraryId);
        const slotName = String(
          (phaRecord.getCellValue(CONFIG.pha.slot) &&
            phaRecord.getCellValue(CONFIG.pha.slot).name) ||
            ""
        );
        homeworkTitles.push(slotName ? `${slotName}:${libraryId}` : libraryId);
      }

      if (matchedHomeworkIds.length > 0) {
        matchSource = "program_homework_assignments";
      }
    }

    if (matchedHomeworkIds.length === 0) {
      debugStep = "5b - Load Curriculum Records (legacy fallback)";
      setOutputSafe("debugStep", debugStep);

      const curriculumQuery = await curriculumTable.selectRecordsAsync({
        fields: buildCurriculumFieldsToLoad(),
      });

      debugStep = "6b - Find Matching Homework (legacy)";
      setOutputSafe("debugStep", debugStep);

      const matchingHomework = curriculumQuery.records.filter(homeworkRecord => {
        const homeworkWeekId = getFirstLinkedRecordId(
          homeworkRecord,
          curriculumTable,
          CONFIG.curriculum.week
        );

        const homeworkGradeBandIds = getLinkedRecordIds(
          homeworkRecord,
          curriculumTable,
          CONFIG.curriculum.gradeBand
        );

        if (homeworkWeekId !== weekId) return false;
        if (!homeworkGradeBandIds.includes(gradeBandId)) return false;

        if (
          CONFIG.debug.requireActive &&
          fieldExists(curriculumTable, CONFIG.curriculum.active)
        ) {
          if (!getBooleanish(homeworkRecord, curriculumTable, CONFIG.curriculum.active)) {
            return false;
          }
        }

        if (
          CONFIG.debug.requirePublished &&
          fieldExists(curriculumTable, CONFIG.curriculum.published)
        ) {
          if (!getBooleanish(homeworkRecord, curriculumTable, CONFIG.curriculum.published)) {
            return false;
          }
        }

        return true;
      });

      matchingHomework.sort((a, b) => {
        const aOrder = getNumber(a, curriculumTable, CONFIG.curriculum.assignmentNumber, 999999);
        const bOrder = getNumber(b, curriculumTable, CONFIG.curriculum.assignmentNumber, 999999);

        if (aOrder !== bOrder) return aOrder - bOrder;

        const aName = getText(a, curriculumTable, CONFIG.curriculum.assignmentFullName) || a.name;
        const bName = getText(b, curriculumTable, CONFIG.curriculum.assignmentFullName) || b.name;

        return aName.localeCompare(bName);
      });

      matchedHomeworkIds = matchingHomework.map(record => record.id);

      homeworkTitles = matchingHomework.map(record => {
        return (
          getText(record, curriculumTable, CONFIG.curriculum.assignmentFullName) ||
          record.name ||
          record.id
        );
      });
      matchSource = "legacy_curriculum";
    }

    if (matchedHomeworkIds.length === 0) {
      actionTaken = CONFIG.actions.skippedNoMatches;

      setFinalOutputs({
        ok: true,
        weeklySummaryId: recordId,
        weekId,
        gradeBandId,
        matchedCountOut: 0,
        homeworkIdsOut: "",
        homeworkTitlesOut: "",
        updatedOut: false,
        actionTaken,
        statusOut: CONFIG.statuses.skipped,
        errorOut:
          "No active Program Homework Assignments (or legacy curriculum matches) for this Week + Grade Band.",
        debugStep,
      });

      log("033 skipped: no matching homework", {
        recordId,
        weekId,
        gradeBandId,
        programInstanceId,
        matchSource,
      });

      return;
    }

    debugStep = "7 - Write Homework Links";
    setOutputSafe("debugStep", debugStep);

    updatedFields = await updateRecordSafe(weeklySummaryTable, recordId, {
      [CONFIG.weeklySummary.homework]: linkedCell(matchedHomeworkIds),
    });

    actionTaken =
      matchSource === "program_homework_assignments"
        ? CONFIG.actions.assignedHomeworkFromPha
        : CONFIG.actions.assignedHomework;

    debugStep = "8 - Outputs";
    setOutputSafe("debugStep", debugStep);

    setFinalOutputs({
      ok: true,
      weeklySummaryId: recordId,
      weekId,
      gradeBandId,
      matchedCountOut: matchedHomeworkIds.length,
      homeworkIdsOut: matchedHomeworkIds.join(", "),
      homeworkTitlesOut: homeworkTitles.join(" | "),
      updatedOut: updatedFields.length > 0,
      actionTaken,
      statusOut: CONFIG.statuses.success,
      errorOut: "",
      debugStep,
    });

    log("033 completed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      weeklySummaryId: recordId,
      weekId,
      gradeBandId,
      programInstanceId,
      matchSource,
      matchedCountOut: matchedHomeworkIds.length,
      homeworkIdsOut: matchedHomeworkIds,
      homeworkTitlesOut: homeworkTitles,
      updatedFields,
      actionTaken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    setFinalOutputs({
      ok: false,
      weeklySummaryId: recordId,
      weekId,
      gradeBandId,
      matchedCountOut: matchedHomeworkIds.length,
      homeworkIdsOut: matchedHomeworkIds.join(", "),
      homeworkTitlesOut: homeworkTitles.join(" | "),
      updatedOut: updatedFields.length > 0,
      actionTaken: actionTaken || "error",
      statusOut: CONFIG.statuses.error,
      errorOut: message,
      debugStep: `FAILED AT: ${debugStep}`,
    });

    log("033 failed", {
      scriptName: CONFIG.scriptName,
      version: CONFIG.version,
      weeklySummaryId: recordId,
      debugStep,
      error: message,
    });

    throw error;
  }
}

/* =========================================================
   SECTION 7: RUN
========================================================= */

await main();
