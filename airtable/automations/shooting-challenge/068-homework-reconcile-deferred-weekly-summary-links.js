/*
Automation: 068 - Homework - Reconcile Deferred Weekly Summary Links
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Purpose:
Finds HW17 Homework Completions created by 067 that still have an empty
Weekly Athlete Summary Link, and links them only when exactly one canonical
Weekly Athlete Summary matches the same Enrollment + Week.

Trigger:
Scheduled automation run (recommended: every 15 minutes or hourly).
This is the automatic retry for 067 deferred_no_canonical_summary results.

Safety:
- Never creates Weekly Athlete Summary records.
- Fails closed on zero or multiple matching summaries.
- Never creates or modifies XP Events. Homework XP remains owned by 064/065.
- Existing non-empty Homework Completion links are not changed.
*/

// @ts-nocheck

const CONFIG = {
  scriptName: "068 - Homework - Reconcile Deferred Weekly Summary Links",
  version: "v1.0",
  tables: {
    curriculum: "FBC Curriculum - SYNC",
    homework: "Homework Completions",
    weeklySummaries: "Weekly Athlete Summary",
  },
  fields: {
    curriculumNumber: "Homework Number",
    curriculumActive: "Active?",
    curriculumWeek: "Week",
    homeworkEnrollment: "Enrollment",
    homeworkWeek: "Week",
    homeworkHomework: "Homework",
    homeworkSummary: "Weekly Athlete Summary Link",
    summaryEnrollment: "Enrollment",
    summaryWeek: "Week",
  },
  hw17Number: "HW 17",
};

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Output variables are optional for scheduled reconciliation runs.
  }
}

function linkedIds(record, fieldName) {
  const value = record.getCellValue(fieldName);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function selectName(record, fieldName) {
  const value = record.getCellValue(fieldName);
  return value?.name ? String(value.name).trim() : "";
}

function fields(table, names) {
  return names.filter((name) => table.fields.some((field) => field.name === name));
}

async function resolveHw17(table) {
  const query = await table.selectRecordsAsync({
    fields: fields(table, [
      CONFIG.fields.curriculumNumber,
      CONFIG.fields.curriculumActive,
      CONFIG.fields.curriculumWeek,
    ]),
  });
  const matches = query.records.filter(
    (record) =>
      selectName(record, CONFIG.fields.curriculumNumber) === CONFIG.hw17Number &&
      record.getCellValue(CONFIG.fields.curriculumActive) === true
  );
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one active HW17 curriculum record, found ${matches.length}.`);
  }
  const weekIds = linkedIds(matches[0], CONFIG.fields.curriculumWeek);
  if (weekIds.length !== 1) {
    throw new Error(`Expected exactly one Week for active HW17, found ${weekIds.length}.`);
  }
  return { homeworkId: matches[0].id, weekId: weekIds[0] };
}

function canonicalSummaryByKey(summaryRecords) {
  const byKey = new Map();
  for (const summary of summaryRecords) {
    const enrollmentIds = linkedIds(summary, CONFIG.fields.summaryEnrollment);
    const weekIds = linkedIds(summary, CONFIG.fields.summaryWeek);
    if (enrollmentIds.length !== 1 || weekIds.length !== 1) continue;
    const key = `${enrollmentIds[0]}|${weekIds[0]}`;
    const candidates = byKey.get(key) || [];
    candidates.push(summary);
    byKey.set(key, candidates);
  }
  return byKey;
}

async function main() {
  const curriculumTable = base.getTable(CONFIG.tables.curriculum);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const summariesTable = base.getTable(CONFIG.tables.weeklySummaries);
  const { homeworkId, weekId } = await resolveHw17(curriculumTable);

  const homeworkQuery = await homeworkTable.selectRecordsAsync({
    fields: fields(homeworkTable, [
      CONFIG.fields.homeworkEnrollment,
      CONFIG.fields.homeworkWeek,
      CONFIG.fields.homeworkHomework,
      CONFIG.fields.homeworkSummary,
    ]),
  });
  const summariesQuery = await summariesTable.selectRecordsAsync({
    fields: fields(summariesTable, [
      CONFIG.fields.summaryEnrollment,
      CONFIG.fields.summaryWeek,
    ]),
  });
  const summariesByKey = canonicalSummaryByKey(summariesQuery.records);
  let linked = 0;
  let deferred = 0;
  let skipped = 0;

  for (const completion of homeworkQuery.records) {
    const homeworkIds = linkedIds(completion, CONFIG.fields.homeworkHomework);
    const enrollmentIds = linkedIds(completion, CONFIG.fields.homeworkEnrollment);
    const completionWeekIds = linkedIds(completion, CONFIG.fields.homeworkWeek);
    const existingSummaryIds = linkedIds(completion, CONFIG.fields.homeworkSummary);

    if (homeworkIds.length !== 1 || homeworkIds[0] !== homeworkId) continue;
    if (completionWeekIds.length !== 1 || completionWeekIds[0] !== weekId) continue;
    if (existingSummaryIds.length > 0) {
      skipped += 1;
      continue;
    }
    if (enrollmentIds.length !== 1) {
      deferred += 1;
      continue;
    }

    const candidates = summariesByKey.get(`${enrollmentIds[0]}|${completionWeekIds[0]}`) || [];
    if (candidates.length !== 1) {
      deferred += 1;
      continue;
    }

    await homeworkTable.updateRecordAsync(completion.id, {
      [CONFIG.fields.homeworkSummary]: [{ id: candidates[0].id }],
    });
    linked += 1;
  }

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", linked > 0 ? "linked_deferred" : "no_changes");
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", "complete");
  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    linked,
    deferred,
    skipped,
    xpEventsCreated: 0,
  }));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");
  console.log(JSON.stringify({
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    statusOut: "error",
    errorOut: message,
  }));
  throw error;
}
