/*
Automation: 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v4.2
Last Updated: 2026-08-09

Purpose:
- Runs from one Weekly Athlete Summary record.
- Requires exactly one Enrollment, Week, Grade Band, and Enrollment Program Instance.
- Uses Program Homework Assignments as the sole homework scheduling authority.
- Assigns the exact active PHA Homework Library records to Weekly Athlete Summary.Homework.
- Reconciles deferred Homework Completions for the same Enrollment + Week + assigned homework
  when Weekly Athlete Summary Link is still empty.
- Absorbs the former standalone Automation 068 behavior so no additional Airtable slot is needed.

Safety:
- Never reads Homework Library.Week or library Grade Band for scheduling.
- Exact Program Instance + Week + Grade Band matching only; no wildcards.
- Fails closed on duplicate active PHA rows for the same Homework Slot.
- Never creates Homework Library records, Homework Completions, Weekly Athlete Summaries, or XP Events.
- Existing non-empty Homework Completion -> Weekly Athlete Summary links are never changed.
- Existing Weekly Athlete Summary.Homework is not overwritten when it conflicts with current PHA truth.

Trigger / input:
- Existing Automation 033 trigger remains unchanged.
- recordId = triggering Weekly Athlete Summary record ID.
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "033 - Weekly Summary and Goal Logic - Assign Homework + Reconcile Completions",
  version: "v4.2",
  versionDate: "2026-08-09",
};

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
};

const cfg = input.config();
const recordId = String(cfg.recordId || "").trim();
if (!recordId) throw new Error("Missing required input: recordId");

const weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
const phaTable = base.getTable(CONFIG.tables.pha);
const homeworkLibraryTable = base.getTable(CONFIG.tables.homeworkLibrary);
const homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);

function setOutputSafe(key, value) {
  try { output.set(key, value); } catch {}
}

function fieldExists(table, fieldName) {
  try { table.getField(fieldName); return true; } catch { return false; }
}

function requireField(table, fieldName) {
  if (!fieldExists(table, fieldName)) {
    throw new Error(`Missing required field: ${table.name}.${fieldName}`);
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

function linkedIds(record, table, fieldName) {
  const value = getRaw(record, table, fieldName);
  return Array.isArray(value) ? value.map(v => v?.id).filter(Boolean) : [];
}

function oneLinkedId(record, table, fieldName, label) {
  const ids = linkedIds(record, table, fieldName);
  if (ids.length !== 1) {
    throw new Error(`${label} must have exactly one linked record; found ${ids.length}.`);
  }
  return ids[0];
}

function booleanish(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw == null) return false;
  const text = String(raw).trim().toLowerCase();
  return ["true", "yes", "checked", "active", "1"].includes(text);
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
  return [...new Set(ids)].map(id => ({ id }));
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

for (const [table, fields] of [
  [weeklySummaryTable, Object.values(CONFIG.weeklySummary)],
  [enrollmentsTable, Object.values(CONFIG.enrollments)],
  [phaTable, Object.values(CONFIG.pha)],
  [homeworkCompletionsTable, Object.values(CONFIG.homeworkCompletions)],
]) {
  for (const field of fields) requireField(table, field);
}

async function main() {
  let debugStep = "start";
  let weekId = "";
  let gradeBandId = "";
  let enrollmentId = "";
  let programInstanceId = "";
  let matchedHomeworkIds = [];
  let reconciledCompletionIds = [];
  let homeworkWritten = false;

  try {
    if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);

    debugStep = "load_summary";
    setOutputSafe("debugStep", debugStep);
    const summary = await weeklySummaryTable.selectRecordAsync(recordId, {
      fields: Object.values(CONFIG.weeklySummary),
    });
    if (!summary) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);

    enrollmentId = oneLinkedId(
      summary,
      weeklySummaryTable,
      CONFIG.weeklySummary.enrollment,
      "Weekly Athlete Summary.Enrollment"
    );
    weekId = oneLinkedId(
      summary,
      weeklySummaryTable,
      CONFIG.weeklySummary.week,
      "Weekly Athlete Summary.Week"
    );
    gradeBandId = oneLinkedId(
      summary,
      weeklySummaryTable,
      CONFIG.weeklySummary.gradeBand,
      "Weekly Athlete Summary.Grade Band"
    );

    debugStep = "resolve_program_instance";
    setOutputSafe("debugStep", debugStep);
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

    debugStep = "resolve_exact_pha";
    setOutputSafe("debugStep", debugStep);
    const phaQuery = await phaTable.selectRecordsAsync({
      fields: Object.values(CONFIG.pha),
    });

    const matches = phaQuery.records.filter(record => {
      const hwIds = linkedIds(record, phaTable, CONFIG.pha.homeworkAssignment);
      const piIds = linkedIds(record, phaTable, CONFIG.pha.programInstance);
      const weekIds = linkedIds(record, phaTable, CONFIG.pha.week);
      const gbIds = linkedIds(record, phaTable, CONFIG.pha.gradeBand);
      if (hwIds.length !== 1 || piIds.length !== 1 || weekIds.length !== 1 || gbIds.length !== 1) return false;
      if (piIds[0] !== programInstanceId) return false;
      if (weekIds[0] !== weekId) return false;
      if (gbIds[0] !== gradeBandId) return false;
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
        `Multiple active PHA rows for same slot: ${duplicateSlots
          .map(([slot, count]) => `${slot}(${count})`)
          .join(", ")}`
      );
    }

    matches.sort((a, b) => {
      const rank = s => (s === "HW1" ? 1 : s === "HW2" ? 2 : 9);
      const ar = rank(slotName(a));
      const br = rank(slotName(b));
      if (ar !== br) return ar - br;
      return a.id.localeCompare(b.id);
    });

    matchedHomeworkIds = matches.map(record =>
      oneLinkedId(record, phaTable, CONFIG.pha.homeworkAssignment, `PHA ${record.id}.Homework Assignment`)
    );

    if (matchedHomeworkIds.length === 0) {
      setOutputSafe("ok", true);
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionTaken", "skipped_no_matching_homework");
      setOutputSafe("errorOut", "No active exact PHA rows for Program Instance + Week + Grade Band.");
      setOutputSafe("matchedCountOut", 0);
      setOutputSafe("reconciledCompletionCountOut", 0);
      setOutputSafe("debugStep", "done_no_pha");
      return;
    }

    debugStep = "write_or_validate_summary_homework";
    setOutputSafe("debugStep", debugStep);
    const existingHomeworkIds = linkedIds(summary, weeklySummaryTable, CONFIG.weeklySummary.homework);
    if (existingHomeworkIds.length === 0) {
      await weeklySummaryTable.updateRecordAsync(recordId, {
        [CONFIG.weeklySummary.homework]: linkedCell(matchedHomeworkIds),
      });
      homeworkWritten = true;
    } else if (!sameSet(existingHomeworkIds, matchedHomeworkIds)) {
      throw new Error(
        `Weekly Athlete Summary.Homework conflicts with current PHA truth. ` +
        `Existing=[${existingHomeworkIds.join(",")}], PHA=[${matchedHomeworkIds.join(",")}].`
      );
    }

    debugStep = "reconcile_deferred_homework_completions";
    setOutputSafe("debugStep", debugStep);
    const completionQuery = await homeworkCompletionsTable.selectRecordsAsync({
      fields: Object.values(CONFIG.homeworkCompletions),
    });
    const allowedHomework = new Set(matchedHomeworkIds);

    const deferred = completionQuery.records.filter(completion => {
      const enrollmentIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.enrollment);
      const weekIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.week);
      const homeworkIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.homework);
      const summaryIds = linkedIds(completion, homeworkCompletionsTable, CONFIG.homeworkCompletions.weeklySummary);
      return (
        enrollmentIds.length === 1 && enrollmentIds[0] === enrollmentId &&
        weekIds.length === 1 && weekIds[0] === weekId &&
        homeworkIds.length === 1 && allowedHomework.has(homeworkIds[0]) &&
        summaryIds.length === 0
      );
    });

    for (const completion of deferred) {
      await homeworkCompletionsTable.updateRecordAsync(completion.id, {
        [CONFIG.homeworkCompletions.weeklySummary]: [{ id: recordId }],
      });
      reconciledCompletionIds.push(completion.id);
    }

    debugStep = "load_titles";
    setOutputSafe("debugStep", debugStep);
    const libraryFields = [
      CONFIG.homeworkLibrary.assignmentFullName,
      CONFIG.homeworkLibrary.assignmentTitle,
    ].filter(name => fieldExists(homeworkLibraryTable, name));
    const libraryQuery = await homeworkLibraryTable.selectRecordsAsync({ fields: libraryFields });
    const libraryById = new Map(libraryQuery.records.map(r => [r.id, r]));
    const titles = matchedHomeworkIds.map(id => libraryDisplayName(libraryById.get(id)) || id);

    setOutputSafe("ok", true);
    setOutputSafe("weeklySummaryId", recordId);
    setOutputSafe("weekId", weekId);
    setOutputSafe("gradeBandId", gradeBandId);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("programInstanceIdOut", programInstanceId);
    setOutputSafe("matchedCountOut", matchedHomeworkIds.length);
    setOutputSafe("homeworkIdsOut", matchedHomeworkIds.join(", "));
    setOutputSafe("homeworkTitlesOut", titles.join(" | "));
    setOutputSafe("reconciledCompletionCountOut", reconciledCompletionIds.length);
    setOutputSafe("reconciledCompletionIdsOut", reconciledCompletionIds.join(", "));
    setOutputSafe("updatedOut", homeworkWritten || reconciledCompletionIds.length > 0);
    setOutputSafe(
      "actionTaken",
      homeworkWritten
        ? "assigned_homework_and_reconciled"
        : reconciledCompletionIds.length
          ? "reconciled_deferred_completions"
          : "already_aligned"
    );
    setOutputSafe("statusOut", "success");
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", "complete");

    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      weeklySummaryId: recordId,
      enrollmentId,
      programInstanceId,
      weekId,
      gradeBandId,
      matchedHomeworkIds,
      homeworkWritten,
      reconciledCompletionIds,
      xpEventsCreated: 0,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("ok", false);
    setOutputSafe("weeklySummaryId", recordId);
    setOutputSafe("weekId", weekId);
    setOutputSafe("gradeBandId", gradeBandId);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("programInstanceIdOut", programInstanceId);
    setOutputSafe("matchedCountOut", matchedHomeworkIds.length);
    setOutputSafe("reconciledCompletionCountOut", reconciledCompletionIds.length);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionTaken", "error");
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", `FAILED AT: ${debugStep}`);
    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "error",
      debugStep,
      errorOut: message,
    }));
    throw error;
  }
}

await main();
