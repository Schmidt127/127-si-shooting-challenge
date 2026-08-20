/*
Automation: 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-09
Last GitHub Update: 2026-08-20 (v4.4 V2 standard structure)

Purpose:
Assign active Program Homework Assignment (PHA) homework to one Weekly Athlete
Summary and reconcile deferred Homework Completions for the same Enrollment + Week.

Trigger:
Weekly Athlete Summary when ready for homework assignment
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Weekly Athlete Summary, Enrollments, Program Homework Assignments,
Homework Library, Homework Completions

Important Fields:
Enrollment, Week, Homework, Program Instance, Homework Assignment,
Homework Slot, Active?, Weekly Athlete Summary Link

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Absorbs former standalone Automation 068 behavior (068 retired / keep OFF).
*/

/************************************************************
 * 033 - WEEKLY SUMMARY AND GOAL LOGIC
 * Assign Homework to Weekly Athlete Summary
 *
 * Version: v4.4
 * Date Written: 2026-06-20
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v4.4 (2026-08-20): V2 Automation Standard structure — full production
 *   docblock, SCRIPT metadata fields, numbered sections, hoisted debugStep,
 *   outer run wrapper. Business logic unchanged from v4.3.
 * - v4.3 (2026-08-09): PHA Grade Band eligibility-only; never used to select
 *   homework. Fail closed on duplicate active PHA rows per slot.
 * - v4.2 / earlier: PHA-only schedule; absorbs 068 deferred HC reconcile.
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary record.
 * - Requires exactly one Enrollment and Week, and exactly one Enrollment Program Instance.
 * - Assigns active PHA Homework Library records for that Program Instance + Week.
 * - Fails closed on duplicate active PHA rows for the same Homework Slot.
 * - Reconciles deferred Homework Completions for the same Enrollment + Week + assigned homework.
 * - Absorbs former standalone Automation 068 behavior.
 *
 * SCHEDULING AUTHORITY
 * - Program Homework Assignments (PHA) is the sole schedule authority.
 * - Exact schedule identity is Program Instance + Week + Homework Slot (+ Homework Assignment).
 * - PHA Grade Band is OPTIONAL eligibility/descriptive metadata only. It is NOT used to select homework.
 * - The same scheduled homework may therefore be assigned to athletes in every grade band.
 *
 * IMPORTANT DESIGN RULES
 * - Skip (not error) when no active PHA rows match Program Instance + Week.
 * - If WAS.Homework already set, it must equal current PHA truth (conflict fails closed).
 * - Deferred HC = Enrollment + Week + allowed Homework + blank Weekly Athlete Summary Link.
 * - Never write formula / rollup / lookup / count fields.
 * - Grade Band on WAS is metadata only (gradeBandSchedulingUsed always false).
 *
 * THIS IS NOT
 * - WAS create/find from Submission (031).
 * - Challenge Goal link to WAS (032).
 * - Grade Band copy to WAS (030).
 * - Previous-week helper values (034).
 * - Standalone deferred HC reconcile (068 — retired; keep OFF).
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
 * RECOMMENDED TRIGGER CONDITIONS
 * - Weekly Athlete Summary has Enrollment and Week linked
 * - Input variable recordId = triggering Weekly Athlete Summary record ID
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Run 068 in parallel (retired duplicate reconcile path)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Weekly Athlete Summary record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionTaken = assigned_homework_and_reconciled | reconciled_deferred_completions |
 *   already_aligned | skipped_no_matching_homework | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - ok = true | false
 * - weeklySummaryId / weekId / enrollmentIdOut / programInstanceIdOut
 * - gradeBandId / gradeBandSchedulingUsed (= false)
 * - matchedCountOut / homeworkIdsOut / homeworkTitlesOut
 * - reconciledCompletionCountOut / reconciledCompletionIdsOut
 * - updatedOut
 *
 * PRIMARY TABLES USED
 * - Weekly Athlete Summary, Enrollments, Program Homework Assignments,
 *   Homework Library, Homework Completions
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Weekly Athlete Summary → Homework (when blank and PHA matches exist)
 * - Homework Completions → Weekly Athlete Summary Link (deferred rows only)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "033 - Weekly Summary and Goal Logic - Assign Homework + Reconcile Completions",
  version: "v4.4",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-20",
  lastUpdated: "2026-08-20",
  folder: "03 - Weekly Summary and Goal Logic",
  automationName: "033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    weeklySummary: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    pha: "Program Homework Assignments",
    homeworkLibrary: "Homework Library",
    homeworkCompletions: "Homework Completions",
  },
  weeklySummary: {
    week: "Week",
    gradeBand: "Grade Band", // metadata only
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
    gradeBand: "Grade Band", // eligibility metadata only; never used for matching
    slot: "Homework Slot",
    active: "Active?",
  },
  homeworkLibrary: {
    assignmentFullName: "Assignment Full Name",
    assignmentTitle: "Assignment Title",
  },
  homeworkCompletions: {
    enrollment: "Enrollment",
    week: "Week",
    homework: "Homework",
    weeklySummary: "Weekly Athlete Summary Link",
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    assignedAndReconciled: "assigned_homework_and_reconciled",
    reconciledDeferred: "reconciled_deferred_completions",
    alreadyAligned: "already_aligned",
    skippedNoMatchingHomework: "skipped_no_matching_homework",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let lastRecordId = "";
let weekId = "";
let enrollmentId = "";
let programInstanceId = "";
let gradeBandIds = [];
let matchedHomeworkIds = [];
let reconciledCompletionIds = [];
let weeklySummaryTable;
let enrollmentsTable;
let phaTable;
let homeworkLibraryTable;
let homeworkCompletionsTable;

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) throw new Error(`Missing required field: ${table.name}.${fieldName}`);
}

function getRaw(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!record || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function linkedIds(record, table, fieldName) {
  const value = getRaw(record, table, fieldName);
  return Array.isArray(value) ? value.map((v) => v?.id).filter(Boolean) : [];
}

function oneLinkedId(record, table, fieldName, label) {
  const ids = linkedIds(record, table, fieldName);
  if (ids.length !== 1) throw new Error(`${label} must have exactly one linked record; found ${ids.length}.`);
  return ids[0];
}

function booleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw == null) return false;
  return ["true", "yes", "checked", "active", "1"].includes(String(raw).trim().toLowerCase());
}

function slotName(record) {
  const raw = getRaw(record, phaTable, CONFIG.pha.slot);
  if (raw && typeof raw === "object" && raw.name) return String(raw.name).trim();
  return getText(record, phaTable, CONFIG.pha.slot);
}

function sameSet(a, b) {
  const aa = [...new Set(a)].sort();
  const bb = [...new Set(b)].sort();
  return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
}

function linkedCell(ids) {
  return [...new Set(ids)].map((id) => ({ id }));
}

function libraryDisplayName(record) {
  if (!record) return "";
  return (
    getText(record, homeworkLibraryTable, CONFIG.homeworkLibrary.assignmentFullName) ||
    getText(record, homeworkLibraryTable, CONFIG.homeworkLibrary.assignmentTitle) ||
    record.name ||
    record.id
  );
}

function unloadQuerySafe(q) {
  if (typeof q?.unloadData === "function") {
    try {
      q.unloadData();
    } catch {
      // unload is best-effort
    }
  }
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  let homeworkWritten = false;

  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  lastRecordId = recordId;
  if (!recordId) throw new Error("Missing required input: recordId");
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

  step("2 - Load tables and validate schema");
  weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  phaTable = base.getTable(CONFIG.tables.pha);
  homeworkLibraryTable = base.getTable(CONFIG.tables.homeworkLibrary);
  homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);

  for (const [table, fields] of [
    [weeklySummaryTable, [CONFIG.weeklySummary.week, CONFIG.weeklySummary.homework, CONFIG.weeklySummary.enrollment]],
    [enrollmentsTable, [CONFIG.enrollments.programInstance]],
    [phaTable, [CONFIG.pha.homeworkAssignment, CONFIG.pha.programInstance, CONFIG.pha.week, CONFIG.pha.slot, CONFIG.pha.active]],
    [homeworkCompletionsTable, Object.values(CONFIG.homeworkCompletions)],
  ]) {
    for (const field of fields) requireField(table, field);
  }

  step("3 - Load summary");
  const summaryFields = [
    CONFIG.weeklySummary.week,
    CONFIG.weeklySummary.homework,
    CONFIG.weeklySummary.enrollment,
    ...(fieldExists(weeklySummaryTable, CONFIG.weeklySummary.gradeBand) ? [CONFIG.weeklySummary.gradeBand] : []),
  ];
  const summary = await weeklySummaryTable.selectRecordAsync(recordId, { fields: summaryFields });
  if (!summary) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);

  enrollmentId = oneLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.enrollment, "Weekly Athlete Summary.Enrollment");
  weekId = oneLinkedId(summary, weeklySummaryTable, CONFIG.weeklySummary.week, "Weekly Athlete Summary.Week");
  gradeBandIds = fieldExists(weeklySummaryTable, CONFIG.weeklySummary.gradeBand)
    ? linkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.gradeBand)
    : [];

  step("4 - Resolve program instance");
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId, {
    fields: [CONFIG.enrollments.programInstance],
  });
  if (!enrollment) throw new Error(`Enrollment not found: ${enrollmentId}`);
  programInstanceId = oneLinkedId(
    enrollment,
    enrollmentsTable,
    CONFIG.enrollments.programInstance,
    "Enrollment.Program Instance"
  );

  step("5 - Resolve exact PHA");
  const phaFields = [
    CONFIG.pha.homeworkAssignment,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.slot,
    CONFIG.pha.active,
    ...(fieldExists(phaTable, CONFIG.pha.gradeBand) ? [CONFIG.pha.gradeBand] : []),
  ];
  const phaQuery = await phaTable.selectRecordsAsync({ fields: phaFields });

  const matches = phaQuery.records.filter((record) => {
    const hwIds = linkedIds(record, phaTable, CONFIG.pha.homeworkAssignment);
    const piIds = linkedIds(record, phaTable, CONFIG.pha.programInstance);
    const weekIds = linkedIds(record, phaTable, CONFIG.pha.week);
    if (hwIds.length !== 1 || piIds.length !== 1 || weekIds.length !== 1) return false;
    if (piIds[0] !== programInstanceId) return false;
    if (weekIds[0] !== weekId) return false;
    if (!booleanish(record, phaTable, CONFIG.pha.active)) return false;
    return true;
  });

  const countsBySlot = new Map();
  for (const record of matches) {
    const slot = slotName(record) || "(blank)";
    countsBySlot.set(slot, (countsBySlot.get(slot) || 0) + 1);
  }
  const duplicateSlots = [...countsBySlot.entries()].filter(([, count]) => count > 1);
  if (duplicateSlots.length) {
    throw new Error(
      `Multiple active PHA rows for same Program Instance + Week + slot: ${duplicateSlots
        .map(([slot, count]) => `${slot}(${count})`)
        .join(", ")}`
    );
  }

  matches.sort((a, b) => {
    const rank = (s) => (s === "HW1" ? 1 : s === "HW2" ? 2 : 9);
    const ar = rank(slotName(a));
    const br = rank(slotName(b));
    return ar !== br ? ar - br : a.id.localeCompare(b.id);
  });

  matchedHomeworkIds = matches.map((record) =>
    oneLinkedId(record, phaTable, CONFIG.pha.homeworkAssignment, `PHA ${record.id}.Homework Assignment`)
  );
  unloadQuerySafe(phaQuery);

  if (matchedHomeworkIds.length === 0) {
    setOutputSafe("ok", true);
    setOutputSafe("statusOut", CONFIG.statuses.skipped);
    setOutputSafe("actionTaken", CONFIG.actions.skippedNoMatchingHomework);
    setOutputSafe("errorOut", "No active PHA rows for Program Instance + Week.");
    setOutputSafe("matchedCountOut", 0);
    setOutputSafe("reconciledCompletionCountOut", 0);
    setOutputSafe("weeklySummaryId", recordId);
    setOutputSafe("weekId", weekId);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("programInstanceIdOut", programInstanceId);
    setOutputSafe("gradeBandId", gradeBandIds.join(","));
    setOutputSafe("gradeBandSchedulingUsed", false);
    step("done_no_pha");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.skipped,
        actionTaken: CONFIG.actions.skippedNoMatchingHomework,
        weeklySummaryId: recordId,
        enrollmentId,
        programInstanceId,
        weekId,
        gradeBandSchedulingUsed: false,
      })
    );
    return;
  }

  step("6 - Write or validate summary homework");
  const existingHomeworkIds = linkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.homework);
  if (existingHomeworkIds.length === 0) {
    await weeklySummaryTable.updateRecordAsync(recordId, {
      [CONFIG.weeklySummary.homework]: linkedCell(matchedHomeworkIds),
    });
    homeworkWritten = true;
  } else if (!sameSet(existingHomeworkIds, matchedHomeworkIds)) {
    throw new Error(
      `Weekly Athlete Summary.Homework conflicts with current PHA truth. Existing=[${existingHomeworkIds.join(",")}], PHA=[${matchedHomeworkIds.join(",")}].`
    );
  }

  step("7 - Reconcile deferred homework completions");
  const completionQuery = await homeworkCompletionsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.homeworkCompletions),
  });
  const allowedHomework = new Set(matchedHomeworkIds);
  const deferred = completionQuery.records.filter((completion) => {
    const enrollmentIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.enrollment);
    const weekIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.week);
    const homeworkIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.homework);
    const summaryIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.weeklySummary);
    return (
      enrollmentIds.length === 1 &&
      enrollmentIds[0] === enrollmentId &&
      weekIds.length === 1 &&
      weekIds[0] === weekId &&
      homeworkIds.length === 1 &&
      allowedHomework.has(homeworkIds[0]) &&
      summaryIds.length === 0
    );
  });

  for (const completion of deferred) {
    await homeworkCompletionsTable.updateRecordAsync(completion.id, {
      [CONFIG.homeworkCompletions.weeklySummary]: [{ id: recordId }],
    });
    reconciledCompletionIds.push(completion.id);
  }
  unloadQuerySafe(completionQuery);

  step("8 - Load titles and finish");
  const libraryFields = [CONFIG.homeworkLibrary.assignmentFullName, CONFIG.homeworkLibrary.assignmentTitle].filter(
    (name) => fieldExists(homeworkLibraryTable, name)
  );
  const libraryQuery = await homeworkLibraryTable.selectRecordsAsync({ fields: libraryFields });
  const libraryById = new Map(libraryQuery.records.map((r) => [r.id, r]));
  const titles = matchedHomeworkIds.map((id) => libraryDisplayName(libraryById.get(id)) || id);
  unloadQuerySafe(libraryQuery);

  const actionTaken = homeworkWritten
    ? CONFIG.actions.assignedAndReconciled
    : reconciledCompletionIds.length
      ? CONFIG.actions.reconciledDeferred
      : CONFIG.actions.alreadyAligned;

  setOutputSafe("ok", true);
  setOutputSafe("weeklySummaryId", recordId);
  setOutputSafe("weekId", weekId);
  setOutputSafe("gradeBandId", gradeBandIds.join(","));
  setOutputSafe("gradeBandSchedulingUsed", false);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("programInstanceIdOut", programInstanceId);
  setOutputSafe("matchedCountOut", matchedHomeworkIds.length);
  setOutputSafe("homeworkIdsOut", matchedHomeworkIds.join(", "));
  setOutputSafe("homeworkTitlesOut", titles.join(" | "));
  setOutputSafe("reconciledCompletionCountOut", reconciledCompletionIds.length);
  setOutputSafe("reconciledCompletionIdsOut", reconciledCompletionIds.join(", "));
  setOutputSafe("updatedOut", homeworkWritten || reconciledCompletionIds.length > 0);
  setOutputSafe("actionTaken", actionTaken);
  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("errorOut", "");
  step("complete");

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      weeklySummaryId: recordId,
      enrollmentId,
      programInstanceId,
      weekId,
      gradeBandIds,
      gradeBandSchedulingUsed: false,
      matchedHomeworkIds,
      homeworkWritten,
      reconciledCompletionIds,
      actionTaken,
      xpEventsCreated: 0,
    })
  );
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("ok", false);
  setOutputSafe("weeklySummaryId", lastRecordId);
  setOutputSafe("weekId", weekId);
  setOutputSafe("gradeBandId", gradeBandIds.join(","));
  setOutputSafe("gradeBandSchedulingUsed", false);
  setOutputSafe("enrollmentIdOut", enrollmentId);
  setOutputSafe("programInstanceIdOut", programInstanceId);
  setOutputSafe("matchedCountOut", matchedHomeworkIds.length);
  setOutputSafe("reconciledCompletionCountOut", reconciledCompletionIds.length);
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionTaken", CONFIG.actions.error);
  setOutputSafe("errorOut", `FAILED AT: ${debugStep} | ${message}`);
  setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.error,
      actionTaken: CONFIG.actions.error,
      debugStep,
      errorOut: message,
      weeklySummaryId: lastRecordId,
      enrollmentId,
      programInstanceId,
      weekId,
    })
  );
  throw error;
}
