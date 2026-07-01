/*
Extension Script: Audit Homework 071 Trigger Readiness
System: 127 SI Shooting Challenge
Purpose:
  Read-only check for why automation 071 may not fire on Homework Completions.
  Reports script-level send gates vs common Airtable trigger blockers (upload fields).

Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 30;

const CONFIG = {
  scriptName: "audit-homework071-trigger-readiness",
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
    coachFeedback: "Coach Feedback",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    baseXp: "Base XP Awarded",
    totalXp: "Total Homework XP Awarded",
    parentReady: "Parent Feedback Ready?",
    parentSent: "Parent Feedback Sent?",
    uploadReady: "Upload Ready?",
    writebackComplete: "Writeback Complete?",
    uploadStatus: "Upload Status",
    airtableAttachment: "Airtable Attachment",
    completionKey: "Homework Completion Key",
    parentError: "Parent Feedback Send Error",
  },

  values: {
    awarded: "Awarded",
    fillout: "Fillout",
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

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
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

function getNumberish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  if (typeof raw === "number") return raw;
  const parsed = Number(String(record.getCellValueAsString(fieldName) || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function scriptSendReady(record, table) {
  const issues = [];

  if (!getBooleanish(record, table, CONFIG.homework.parentReady)) {
    issues.push("parent_feedback_ready_unchecked");
  }
  if (getBooleanish(record, table, CONFIG.homework.parentSent)) {
    issues.push("parent_feedback_already_sent");
  }
  if (!getBooleanish(record, table, CONFIG.homework.satisfactory)) {
    issues.push("not_satisfactory");
  }
  if (!getText(record, table, CONFIG.homework.coachFeedback)) {
    issues.push("coach_feedback_blank");
  }
  if (getSelectName(record, table, CONFIG.homework.awardStatus) !== CONFIG.values.awarded) {
    issues.push("award_status_not_awarded");
  }
  if (!getLinkedIds(record, table, CONFIG.homework.xpEvents).length) {
    issues.push("xp_events_empty");
  }
  if (getNumberish(record, table, CONFIG.homework.baseXp) <= 0) {
    issues.push("base_xp_zero");
  }
  if (getNumberish(record, table, CONFIG.homework.totalXp) <= 0) {
    issues.push("total_xp_zero");
  }

  const isQuiz =
    getSelectName(record, table, CONFIG.homework.sourceSystem) === CONFIG.values.fillout &&
    getLinkedIds(record, table, CONFIG.homework.reflectionQuiz).length > 0 &&
    !getLinkedIds(record, table, CONFIG.homework.submissionAssets).length;

  if (!isQuiz && !getLinkedIds(record, table, CONFIG.homework.submissionAssets).length) {
    issues.push("missing_submission_assets");
  }

  return { ready: issues.length === 0, issues, isQuiz };
}

function triggerBlockers(record, table) {
  const blockers = [];

  if (getNumberish(record, table, CONFIG.homework.uploadReady) !== 1) {
    blockers.push("upload_ready_not_1");
  }
  if (getBooleanish(record, table, CONFIG.homework.writebackComplete)) {
    blockers.push("writeback_complete_checked");
  }
  const uploadStatus = getSelectName(record, table, CONFIG.homework.uploadStatus);
  if (uploadStatus && uploadStatus !== "Pending") {
    blockers.push(`upload_status_${uploadStatus.replace(/\s+/g, "_").toLowerCase()}`);
  }
  if (!getLinkedIds(record, table, CONFIG.homework.submissionAssets).length) {
    blockers.push("no_submission_assets");
  }
  if (!getText(record, table, CONFIG.homework.airtableAttachment)) {
    blockers.push("no_airtable_attachment");
  }

  return blockers;
}

async function main() {
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const query = await homeworkTable.selectRecordsAsync({
    fields: Object.values(CONFIG.homework),
  });

  const candidates = query.records.filter(record => {
    return (
      getBooleanish(record, homeworkTable, CONFIG.homework.satisfactory) &&
      getBooleanish(record, homeworkTable, CONFIG.homework.parentReady) &&
      !getBooleanish(record, homeworkTable, CONFIG.homework.parentSent)
    );
  });

  console.log(`Graded + parent-ready + not-sent: ${candidates.length}`);

  let scriptReady = 0;
  let likelyTriggerBlocked = 0;

  for (const record of candidates.slice(0, SAMPLE_LIMIT)) {
    const send = scriptSendReady(record, homeworkTable);
    const blockers = triggerBlockers(record, homeworkTable);
    const key = getText(record, homeworkTable, CONFIG.homework.completionKey) || record.id;

    if (send.ready) scriptReady += 1;
    if (blockers.length) likelyTriggerBlocked += 1;

    console.log(`\n${key}`);
    console.log(`  id: ${record.id}`);
    console.log(`  quiz path: ${send.isQuiz}`);
    console.log(`  script v3.4 send ready: ${send.ready}`);
    if (send.issues.length) console.log(`  script issues: ${send.issues.join(", ")}`);
    console.log(`  likely trigger blockers (if used in 071 UI): ${blockers.join(", ") || "(none)"}`);
    console.log(`  parent error: ${getText(record, homeworkTable, CONFIG.homework.parentError) || "(none)"}`);
  }

  console.log("\n---");
  console.log(`If 071 trigger includes Upload Ready / Writeback / Submission Assets,`);
  console.log(`quiz rows show blockers above and the automation will NOT run on checkbox toggle.`);
  console.log(`Fix: edit 071 trigger in Airtable — use only conditions in automation-trigger-map.md.`);
  console.log(`Then uncheck + recheck Parent Feedback Ready? on each row.`);
}

await main();
