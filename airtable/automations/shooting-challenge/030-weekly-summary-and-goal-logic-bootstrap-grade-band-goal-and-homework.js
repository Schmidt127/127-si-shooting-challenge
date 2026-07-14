/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: Phase B / S23 — consolidate former 030 + 032 + 033
Folder: 03 - Weekly Summary and Goal Logic
Rollback: airtable/automations/shooting-challenge/_rollback/phase-b-030-032-033-2026-07-14/
*/

/************************************************************
 * 030 - Weekly Summary and Goal Logic -
 *       Bootstrap WAS Grade Band, Goal Record, and Homework
 *
 * Version: v1.0.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-14
 * Supersedes: separate 030 (copy GB) + 032 (link Goal) + 033 (assign HW)
 *
 * PURPOSE
 * - One Weekly Athlete Summary bootstrap pass that replaces three automations.
 * - Ordered steps (prefer single atomic write when possible):
 *   A) Copy Enrollment Grade Band → WAS Grade Band (when empty)
 *   B) Link challenge-wide Target Goal Shots → Goal Record (when empty)
 *   C) Assign FBC Curriculum homework → Homework (when empty)
 *
 * IMPORTANT DESIGN RULES
 * - Idempotent: skip each step if target field already filled.
 * - Soft-skip steps B/C when prerequisites (Week / Grade Band) are not
 *   ready — do not error for union-trigger fires that only need step A.
 * - Goal matching: Grade Band + Active? only. Never match by Week.
 * - Homework matching: Week + Grade Band (+ Active? / Published? when present).
 * - One active Target Goal Shots per Grade Band; duplicates → error.
 * - Prefer one updateRecordAsync for pending writable fields.
 * - This is not WAS create (031), previous-week helpers (034), Perfect Week
 *   (057/058), or Zoom 117.
 * - Former 032 + 033 must be retired only after DEV live smoke PASS.
 *
 * INPUT
 * - recordId (Weekly Athlete Summary) — required, must start with "rec"
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut
 * - debugStep
 * - actionOut: pipe of step actions (e.g. copied_grade_band|linked_goal_record|…)
 * - actionAOut, actionBOut, actionCOut
 * - weeklySummaryId, enrollmentId, weekId, gradeBandId
 * - goalRecordId, goalLabel, goalMatchCount
 * - homeworkIdsOut, homeworkTitlesOut, homeworkMatchedCountOut
 * - updatedFields
 *
 * TRIGGER (recommended — covers former 030 ∪ 032 ∪ 033)
 * - Table: Weekly Athlete Summary
 * - Type: When record matches conditions  (or When record is updated + Match ANY)
 * - Conditions — Match ANY of:
 *   1) Enrollment is not empty AND Week is not empty AND Grade Band is empty
 *   2) Week is not empty AND Grade Band is not empty AND Goal Record is empty
 *   3) Week is not empty AND Grade Band is not empty AND Homework is empty
 * - Script self-gates each step; broad Match ANY is preferred over three views.
 *
 * RECOMMENDED / OPTIONAL
 * - If using "When record is updated", watch: Enrollment, Week, Grade Band,
 *   Goal Record, Homework — so 031 create → enrollment/week fills still fire.
 *
 * DO NOT USE
 * - Folder 07 email/upload automations
 * - Separate paste of library 032/033 after Phase B PASS
 * - Trigger that omits the Grade-Band-empty arm (misses 030 path)
 *
 * AUTOMATION NAME
 * - 030 - Weekly Summary and Goal Logic - Bootstrap WAS Grade Band Goal Homework
 *
 * FOLDER
 * - 03 - Weekly Summary and Goal Logic
 ************************************************************/

// @ts-nocheck

async function main() {
  const SCRIPT = {
    scriptName:
      "030 - Weekly Summary and Goal Logic - Bootstrap WAS Grade Band Goal Homework",
    version: "v1.0.0",
    versionDate: "2026-07-14",
    originalWrittenDate: "2026-07-14",
    lastUpdated: "2026-07-14",
    folder: "03 - Weekly Summary and Goal Logic",
    automationName:
      "030 - Weekly Summary and Goal Logic - Bootstrap WAS Grade Band Goal Homework",
  };

  const CONFIG = {
    tables: {
      weeklySummary: "Weekly Athlete Summary",
      enrollments: "Enrollments",
      targetGoalShots: "Target Goal Shots",
      curriculum: "FBC Curriculum - SYNC",
    },
    weeklySummary: {
      enrollment: "Enrollment",
      week: "Week",
      gradeBand: "Grade Band",
      goalRecord: "Goal Record",
      homework: "Homework",
    },
    enrollments: {
      gradeBand: "Grade Band",
    },
    targetGoalShots: {
      targetLabel: "Target Label",
      goalKey: "Goal Key",
      gradeBand: "Grade Band",
      totalShotTarget: "Total Shot Target",
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
    requireActiveGoalRecord: true,
    requireActiveHomework: true,
    requirePublishedHomework: true,
  };

  const fieldCache = new Map();
  let debugStep = "Start";

  function setOutputSafe(key, value) {
    try {
      output.set(key, value);
    } catch {
      // ignore unmapped outputs
    }
  }

  function setDebug(step) {
    debugStep = step;
    setOutputSafe("debugStep", step);
  }

  function log(message, data = null) {
    if (data === null || data === undefined) {
      console.log(message);
    } else {
      console.log(message, JSON.stringify(data, null, 2));
    }
  }

  function getFieldSafe(table, fieldName) {
    if (!table || !fieldName) return null;
    const cacheKey = `${table.name}:${fieldName}`;
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

  function requireField(table, fieldName, label) {
    if (!fieldExists(table, fieldName)) {
      throw new Error(`Missing required field: ${label} (${table.name} -> ${fieldName})`);
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

  function requireWritableField(table, fieldName, label) {
    requireField(table, fieldName, label);
    if (!isWritableField(table, fieldName)) {
      throw new Error(
        `Required field is not writable: ${label} (${table.name} -> ${fieldName})`
      );
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
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const text = String(raw ?? "")
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
    const text = String(raw ?? "")
      .trim()
      .toLowerCase();
    return ["1", "true", "yes", "checked", "active"].includes(text);
  }

  function getLinkedRecordIds(record, table, fieldName) {
    const raw = getRaw(record, table, fieldName);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => item?.id).filter(Boolean);
  }

  function getFirstLinkedRecordId(record, table, fieldName) {
    return getLinkedRecordIds(record, table, fieldName)[0] || "";
  }

  function linkedCell(ids) {
    return [...new Set((ids || []).filter(Boolean))].map((id) => ({ id }));
  }

  async function updateRecordSafe(table, targetRecordId, updates) {
    const safeUpdates = {};
    for (const [fieldName, value] of Object.entries(updates || {})) {
      if (!fieldExists(table, fieldName)) continue;
      if (!isWritableField(table, fieldName)) continue;
      if (value === undefined || value === null) continue;
      safeUpdates[fieldName] = value;
    }
    if (Object.keys(safeUpdates).length === 0) return [];
    await table.updateRecordAsync(targetRecordId, safeUpdates);
    return Object.keys(safeUpdates);
  }

  function setFinalOutputs(payload) {
    setOutputSafe("ok", payload.ok);
    setOutputSafe("weeklySummaryId", payload.weeklySummaryId || "");
    setOutputSafe("enrollmentId", payload.enrollmentId || "");
    setOutputSafe("weekId", payload.weekId || "");
    setOutputSafe("gradeBandId", payload.gradeBandId || "");
    setOutputSafe("goalRecordId", payload.goalRecordId || "");
    setOutputSafe("goalLabel", payload.goalLabel || "");
    setOutputSafe("goalMatchCount", payload.goalMatchCount || 0);
    setOutputSafe("homeworkIdsOut", payload.homeworkIdsOut || "");
    setOutputSafe("homeworkTitlesOut", payload.homeworkTitlesOut || "");
    setOutputSafe("homeworkMatchedCountOut", payload.homeworkMatchedCountOut || 0);
    setOutputSafe("actionOut", payload.actionOut || "");
    setOutputSafe("actionAOut", payload.actionAOut || "");
    setOutputSafe("actionBOut", payload.actionBOut || "");
    setOutputSafe("actionCOut", payload.actionCOut || "");
    setOutputSafe("updatedFields", payload.updatedFields || "");
    setOutputSafe("statusOut", payload.statusOut || "");
    setOutputSafe("errorOut", payload.errorOut || "");
    setOutputSafe("debugStep", payload.debugStep || debugStep);
  }

  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();

  setDebug("1 - Validate recordId");
  if (!recordId) throw new Error("Missing required input: recordId");
  if (!recordId.startsWith("rec")) {
    throw new Error(`Invalid Weekly Athlete Summary recordId input: ${recordId}`);
  }

  const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const targetGoalShotsTable = base.getTable(CONFIG.tables.targetGoalShots);
  const curriculumTable = base.getTable(CONFIG.tables.curriculum);

  setDebug("2 - Validate schema");
  requireField(weeklySummaryTable, CONFIG.weeklySummary.enrollment, "WAS -> Enrollment");
  requireField(weeklySummaryTable, CONFIG.weeklySummary.week, "WAS -> Week");
  requireWritableField(
    weeklySummaryTable,
    CONFIG.weeklySummary.gradeBand,
    "WAS -> Grade Band"
  );
  requireWritableField(
    weeklySummaryTable,
    CONFIG.weeklySummary.goalRecord,
    "WAS -> Goal Record"
  );
  requireWritableField(
    weeklySummaryTable,
    CONFIG.weeklySummary.homework,
    "WAS -> Homework"
  );
  requireField(enrollmentsTable, CONFIG.enrollments.gradeBand, "Enrollments -> Grade Band");
  requireField(
    targetGoalShotsTable,
    CONFIG.targetGoalShots.gradeBand,
    "Target Goal Shots -> Grade Band"
  );
  requireField(curriculumTable, CONFIG.curriculum.week, "Curriculum -> Week");
  requireField(curriculumTable, CONFIG.curriculum.gradeBand, "Curriculum -> Grade Band");
  if (
    CONFIG.requireActiveGoalRecord &&
    fieldExists(targetGoalShotsTable, CONFIG.targetGoalShots.active)
  ) {
    requireField(
      targetGoalShotsTable,
      CONFIG.targetGoalShots.active,
      "Target Goal Shots -> Active?"
    );
  }

  let actionAOut = "";
  let actionBOut = "";
  let actionCOut = "";
  let enrollmentId = "";
  let weekId = "";
  let gradeBandId = "";
  let goalRecordId = "";
  let goalLabel = "";
  let goalMatchCount = 0;
  let homeworkIds = [];
  let homeworkTitles = [];

  try {
    setDebug("3 - Load Weekly Athlete Summary");
    const summaryRecord = await weeklySummaryTable.selectRecordAsync(recordId);
    if (!summaryRecord) {
      setFinalOutputs({
        ok: false,
        weeklySummaryId: recordId,
        actionOut: "summary_not_found",
        actionAOut: "error",
        actionBOut: "error",
        actionCOut: "error",
        statusOut: CONFIG.statuses.error,
        errorOut: `Weekly Athlete Summary record not found: ${recordId}`,
        debugStep,
      });
      return;
    }

    setDebug("4 - Read WAS links");
    enrollmentId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment
    );
    weekId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.week
    );
    const existingGradeBandId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.gradeBand
    );
    const existingGoalRecordId = getFirstLinkedRecordId(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.goalRecord
    );
    const existingHomeworkIds = getLinkedRecordIds(
      summaryRecord,
      weeklySummaryTable,
      CONFIG.weeklySummary.homework
    );

    gradeBandId = existingGradeBandId;
    goalRecordId = existingGoalRecordId;

    const updates = {};

    // -------- Step A: Enrollment Grade Band → WAS --------
    setDebug("5 - Step A Copy Grade Band");
    if (existingGradeBandId) {
      actionAOut = "already_has_grade_band";
    } else {
      if (!enrollmentId) {
        throw new Error("Weekly Athlete Summary is missing Enrollment.");
      }
      if (!weekId) {
        throw new Error("Weekly Athlete Summary is missing Week.");
      }

      const enrollmentRecord = await enrollmentsTable.selectRecordAsync(enrollmentId);
      if (!enrollmentRecord) {
        throw new Error(`Linked Enrollment record not found: ${enrollmentId}`);
      }

      const enrollmentGradeBandId = getFirstLinkedRecordId(
        enrollmentRecord,
        enrollmentsTable,
        CONFIG.enrollments.gradeBand
      );

      if (!enrollmentGradeBandId) {
        actionAOut = "skipped_no_enrollment_grade_band";
      } else {
        gradeBandId = enrollmentGradeBandId;
        updates[CONFIG.weeklySummary.gradeBand] = linkedCell([enrollmentGradeBandId]);
        actionAOut = "copied_grade_band";
      }
    }

    // -------- Step B: Link Goal Record --------
    setDebug("6 - Step B Link Goal Record");
    if (existingGoalRecordId) {
      actionBOut = "already_linked";
      goalMatchCount = 1;
    } else if (!weekId || !gradeBandId) {
      actionBOut = "skipped_prereq_missing";
    } else {
      const goalFields = [
        CONFIG.targetGoalShots.targetLabel,
        CONFIG.targetGoalShots.goalKey,
        CONFIG.targetGoalShots.gradeBand,
        CONFIG.targetGoalShots.totalShotTarget,
        CONFIG.targetGoalShots.active,
      ].filter((name) => fieldExists(targetGoalShotsTable, name));

      const goalsQuery = await targetGoalShotsTable.selectRecordsAsync({
        fields: goalFields,
      });

      const matchingGoals = goalsQuery.records.filter((goalRecord) => {
        const goalGradeBandId = getFirstLinkedRecordId(
          goalRecord,
          targetGoalShotsTable,
          CONFIG.targetGoalShots.gradeBand
        );
        if (goalGradeBandId !== gradeBandId) return false;
        if (
          CONFIG.requireActiveGoalRecord &&
          fieldExists(targetGoalShotsTable, CONFIG.targetGoalShots.active)
        ) {
          return getBooleanish(
            goalRecord,
            targetGoalShotsTable,
            CONFIG.targetGoalShots.active
          );
        }
        return true;
      });

      try {
        goalsQuery.unloadData();
      } catch {
        // optional unload
      }

      goalMatchCount = matchingGoals.length;

      if (goalMatchCount === 0) {
        actionBOut = "skipped_no_matching_challenge_goal_record";
      } else if (goalMatchCount > 1) {
        const duplicateIds = matchingGoals.map((r) => r.id).join(", ");
        actionBOut = "error_duplicate_challenge_goal_records";
        throw new Error(
          `Multiple active challenge-wide Target Goal Shots records found for this Grade Band. Record IDs: ${duplicateIds}`
        );
      } else {
        const matchedGoal = matchingGoals[0];
        goalRecordId = matchedGoal.id;
        goalLabel =
          getText(matchedGoal, targetGoalShotsTable, CONFIG.targetGoalShots.targetLabel) ||
          getText(matchedGoal, targetGoalShotsTable, CONFIG.targetGoalShots.goalKey) ||
          matchedGoal.name ||
          goalRecordId;
        updates[CONFIG.weeklySummary.goalRecord] = [{ id: goalRecordId }];
        actionBOut = "linked_goal_record";
      }
    }

    // -------- Step C: Assign Homework --------
    setDebug("7 - Step C Assign Homework");
    if (existingHomeworkIds.length > 0) {
      actionCOut = "already_assigned";
      homeworkIds = existingHomeworkIds;
    } else if (!weekId || !gradeBandId) {
      actionCOut = "skipped_prereq_missing";
    } else {
      const curriculumFields = [
        CONFIG.curriculum.assignmentFullName,
        CONFIG.curriculum.week,
        CONFIG.curriculum.gradeBand,
        CONFIG.curriculum.active,
        CONFIG.curriculum.published,
        CONFIG.curriculum.assignmentNumber,
      ].filter((name) => fieldExists(curriculumTable, name));

      const curriculumQuery = await curriculumTable.selectRecordsAsync({
        fields: curriculumFields,
      });

      const matchingHomework = curriculumQuery.records.filter((homeworkRecord) => {
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
          CONFIG.requireActiveHomework &&
          fieldExists(curriculumTable, CONFIG.curriculum.active)
        ) {
          if (!getBooleanish(homeworkRecord, curriculumTable, CONFIG.curriculum.active)) {
            return false;
          }
        }
        if (
          CONFIG.requirePublishedHomework &&
          fieldExists(curriculumTable, CONFIG.curriculum.published)
        ) {
          if (
            !getBooleanish(homeworkRecord, curriculumTable, CONFIG.curriculum.published)
          ) {
            return false;
          }
        }
        return true;
      });

      matchingHomework.sort((a, b) => {
        const aOrder = getNumber(a, curriculumTable, CONFIG.curriculum.assignmentNumber);
        const bOrder = getNumber(b, curriculumTable, CONFIG.curriculum.assignmentNumber);
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aName =
          getText(a, curriculumTable, CONFIG.curriculum.assignmentFullName) || a.name;
        const bName =
          getText(b, curriculumTable, CONFIG.curriculum.assignmentFullName) || b.name;
        return aName.localeCompare(bName);
      });

      try {
        curriculumQuery.unloadData();
      } catch {
        // optional unload
      }

      homeworkIds = matchingHomework.map((r) => r.id);
      homeworkTitles = matchingHomework.map((r) => {
        return (
          getText(r, curriculumTable, CONFIG.curriculum.assignmentFullName) ||
          r.name ||
          r.id
        );
      });

      if (homeworkIds.length === 0) {
        actionCOut = "skipped_no_matching_homework";
      } else {
        updates[CONFIG.weeklySummary.homework] = linkedCell(homeworkIds);
        actionCOut = "assigned_homework";
      }
    }

    setDebug("8 - Atomic write");
    const updatedFieldNames = await updateRecordSafe(weeklySummaryTable, recordId, updates);

    const actionOut = [actionAOut, actionBOut, actionCOut].filter(Boolean).join("|");
    const anyWrite = updatedFieldNames.length > 0;
    const anyHardWork =
      actionAOut === "copied_grade_band" ||
      actionBOut === "linked_goal_record" ||
      actionCOut === "assigned_homework";

    const statusOut = anyWrite || anyHardWork ? CONFIG.statuses.success : CONFIG.statuses.skipped;

    setDebug("9 - Outputs");
    setFinalOutputs({
      ok: true,
      weeklySummaryId: recordId,
      enrollmentId,
      weekId,
      gradeBandId,
      goalRecordId,
      goalLabel,
      goalMatchCount,
      homeworkIdsOut: homeworkIds.join(", "),
      homeworkTitlesOut: homeworkTitles.join(" | "),
      homeworkMatchedCountOut: homeworkIds.length,
      actionOut,
      actionAOut,
      actionBOut,
      actionCOut,
      updatedFields: updatedFieldNames.join(", "),
      statusOut,
      errorOut: "",
      debugStep,
    });

    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        weeklySummaryId: recordId,
        actionOut,
        statusOut,
        updatedFields: updatedFieldNames,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setFinalOutputs({
      ok: false,
      weeklySummaryId: recordId,
      enrollmentId,
      weekId,
      gradeBandId,
      goalRecordId,
      goalLabel,
      goalMatchCount,
      homeworkIdsOut: homeworkIds.join(", "),
      homeworkTitlesOut: homeworkTitles.join(" | "),
      homeworkMatchedCountOut: homeworkIds.length,
      actionOut: [actionAOut || "error", actionBOut || "error", actionCOut || "error"].join(
        "|"
      ),
      actionAOut: actionAOut || "error",
      actionBOut: actionBOut || "error",
      actionCOut: actionCOut || "error",
      updatedFields: "",
      statusOut: CONFIG.statuses.error,
      errorOut: message,
      debugStep: `FAILED AT: ${debugStep}`,
    });
    log("030 bootstrap failed", {
      scriptName: SCRIPT.scriptName,
      version: SCRIPT.version,
      weeklySummaryId: recordId,
      debugStep,
      error: message,
    });
    throw error;
  }
}

try {
  await main();
} catch (error) {
  throw error;
}
