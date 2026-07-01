/*
Extension Script: Repair Homework 17 Quiz Parent Email Retrigger Prep
System: 127 SI Shooting Challenge
Purpose:
  Homework 17 (Final Reflection Quiz) completions have no Submission Assets.
  Automation 071 v3.4+ can email those rows using quiz summary instead of file links.

  This script finds graded quiz homework that is ready but not yet emailed,
  then toggles Parent Feedback Ready? off/on so automation 071 re-fires.

  Run AFTER:
  1) Deploying 071 v3.4 to the live Airtable automation script action.
  2) Fixing the 071 Airtable TRIGGER — remove Upload Ready?, Writeback Complete?,
     Submission Assets, and Airtable Attachment from trigger conditions (see
     airtable/schema/current/automation-trigger-map.md).

Default: dry run (no writes). Set CONFIRM_WRITE = true to apply.
*/

// @ts-nocheck

const CONFIRM_WRITE = false;
const PREVIEW_LIMIT = 50;

const CONFIG = {
  scriptName: "repair-homework17-retrigger-parent-email",
  version: "v1.0",

  tables: {
    homework: "Homework Completions",
  },

  homework: {
    sourceSystem: "Source System",
    reflectionQuiz: "Final Reflection Quiz Submissions",
    submissionAssets: "Submission Assets",
    satisfactory: "Satisfactory?",
    reviewComplete: "Review Complete",
    awardStatus: "Award Status",
    parentReady: "Parent Feedback Ready?",
    parentSent: "Parent Feedback Sent?",
    completionKey: "Homework Completion Key",
    parentError: "Parent Feedback Send Error",
  },

  values: {
    fillout: "Fillout",
    awarded: "Awarded",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function isQuizHomeworkReadyToResend(record, table) {
  if (getSelectName(record, table, CONFIG.homework.sourceSystem) !== CONFIG.values.fillout) {
    return false;
  }
  if (!getLinkedIds(record, table, CONFIG.homework.reflectionQuiz).length) {
    return false;
  }
  if (getLinkedIds(record, table, CONFIG.homework.submissionAssets).length) {
    return false;
  }
  if (!getBooleanish(record, table, CONFIG.homework.satisfactory)) return false;
  if (!getBooleanish(record, table, CONFIG.homework.reviewComplete)) return false;
  if (getSelectName(record, table, CONFIG.homework.awardStatus) !== CONFIG.values.awarded) {
    return false;
  }
  if (!getBooleanish(record, table, CONFIG.homework.parentReady)) return false;
  if (getBooleanish(record, table, CONFIG.homework.parentSent)) return false;
  return true;
}

async function main() {
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const query = await homeworkTable.selectRecordsAsync({
    fields: [
      CONFIG.homework.sourceSystem,
      CONFIG.homework.reflectionQuiz,
      CONFIG.homework.submissionAssets,
      CONFIG.homework.satisfactory,
      CONFIG.homework.reviewComplete,
      CONFIG.homework.awardStatus,
      CONFIG.homework.parentReady,
      CONFIG.homework.parentSent,
      CONFIG.homework.completionKey,
      CONFIG.homework.parentError,
    ],
  });

  const targets = query.records.filter(record =>
    isQuizHomeworkReadyToResend(record, homeworkTable)
  );

  console.log(`Found ${targets.length} quiz homework row(s) ready to retrigger 071.`);

  for (const record of targets.slice(0, PREVIEW_LIMIT)) {
    console.log(
      `- ${record.id} | ${getText(record, homeworkTable, CONFIG.homework.completionKey)} | error=${getText(record, homeworkTable, CONFIG.homework.parentError) || "(none)"}`
    );
  }

  if (!CONFIRM_WRITE) {
    console.log("\nDRY RUN — set CONFIRM_WRITE = true to toggle Parent Feedback Ready? off/on.");
    return;
  }

  for (const record of targets) {
    const updates = {
      [CONFIG.homework.parentReady]: false,
    };
    if (fieldExists(homeworkTable, CONFIG.homework.parentError)) {
      updates[CONFIG.homework.parentError] = "";
    }
    await homeworkTable.updateRecordAsync(record.id, updates);
    await homeworkTable.updateRecordAsync(record.id, {
      [CONFIG.homework.parentReady]: true,
    });
  }

  console.log(`Retriggered ${targets.length} row(s). Watch automation 071 runs.`);
}

await main();
