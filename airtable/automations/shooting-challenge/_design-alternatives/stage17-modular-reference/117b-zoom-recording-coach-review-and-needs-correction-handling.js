/*
GitHub Source of Truth — paste into Airtable starting AFTER this header block
(skip this GitHub header when pasting).
System: 127 SI Shooting Challenge
Backlog: C-025
Folder: 17 - Zoom Recording Credit
*/

/************************************************************
 * 117b - Zoom Recording Credit - Coach Review and Needs Correction Handling
 *
 * Version: v1.1.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * Architecture: Stage 17 Zoom Attendance path (S16 HC path superseded)
 *
 * PURPOSE
 * - Sync Recording Quiz Satisfactory? from Review Status.
 *
 * IMPORTANT DESIGN RULES
 * - Skip if already matches. Needs Correction clears Satisfactory without changing Zoom Credit Key.
 *
 * INPUT
 * - recordId (Zoom Attendance record id)
 *
 * OUTPUTS
 * - statusOut: success | skipped | error
 * - errorOut
 * - debugStep
 * - actionOut
 *
 * TRIGGER
 * - Zoom Attendance (see design package C-025-automation-packages-stage17.md)
 *
 * AUTOMATION NAME
 * - 117b - Zoom Recording Credit - Coach Review and Needs Correction Handling
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: '117b-zoom-recording-coach-review-and-needs-correction-handling',
  version: 'v1.1.0',
  versionDate: '2026-07-18',
  originalWrittenDate: '2026-07-14',
  lastUpdated: '2026-07-18',
  folder: "17 - Zoom Recording Credit",
  automationName: '117b - Zoom Recording Credit - Coach Review and Needs Correction Handling',
};

const CONFIG = {
  tables: { zoomAttendance: "Zoom Attendance" },
  fields: {
    attendanceMethod: "Attendance Method",
    reviewStatus: "Recording Quiz Review Status",
    satisfactory: "Recording Quiz Satisfactory?",
    correctionCount: "Recording Quiz Correction Count",
    reviewedAt: "Recording Quiz Reviewed At",
    needsCorrectionAt: "Recording Quiz Needs Correction At",
  },
  methods: { recordingQuiz: "Recording Quiz" },
  review: {
    satisfactory: "Satisfactory",
    needsCorrection: "Needs Correction",
    needsReview: "Needs Review",
  },
};


function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output && typeof output.set === "function") {
      output.set(key, value);
    }
  } catch (e) {
    console.log(`setOutputSafe(${key}) failed: ${e && e.message ? e.message : e}`);
  }
}

function requireRecId(recordId) {
  if (!recordId || typeof recordId !== "string" || !recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId: ${recordId}`);
  }
  return recordId;
}

function getLinkedIds(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (x && x.id) || x).filter(Boolean);
  if (v.id) return [v.id];
  return [];
}

function getText(record, fieldName) {
  const v = record.getCellValueAsString(fieldName);
  return v == null ? "" : String(v).trim();
}

function getNumber(record, fieldName) {
  const raw = record.getCellValue(fieldName);
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.length === 1) return getNumber({ getCellValue: () => raw[0] }, "x");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getCheckbox(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (Array.isArray(v) && v.length === 1) return getCheckbox({ getCellValue: () => v[0] }, "x");
  return false;
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (e) {
    return false;
  }
}

async function updateRecordSafe(table, recordId, fields) {
  const keys = Object.keys(fields || {});
  if (!keys.length) return;
  await table.updateRecordAsync(recordId, fields);
}



async function main() {
  let debugStep = "1 - Validate input";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  const cfg = input.config();
  const recordId = requireRecId(cfg.recordId);
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const rec = await zaTable.selectRecordAsync(recordId, { fields: Object.values(CONFIG.fields) });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  debugStep = "2 - Load row";
  setOutputSafe("debugStep", debugStep);
  if (getText(rec, CONFIG.fields.attendanceMethod) !== CONFIG.methods.recordingQuiz) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    return;
  }

  debugStep = "3 - Read Review Status";
  setOutputSafe("debugStep", debugStep);
  const status = getText(rec, CONFIG.fields.reviewStatus);
  const sat = getCheckbox(rec, CONFIG.fields.satisfactory);

  debugStep = "4 - Compare to current Satisfactory?";
  setOutputSafe("debugStep", debugStep);
  const patch = {};
  let actionOut = "skipped_unchanged";

  if (status === CONFIG.review.satisfactory) {
    if (!sat) {
      patch[CONFIG.fields.satisfactory] = true;
      if (fieldExists(zaTable, CONFIG.fields.reviewedAt)) patch[CONFIG.fields.reviewedAt] = new Date();
      actionOut = "marked_satisfactory";
    }
  } else if (status === CONFIG.review.needsCorrection) {
    if (sat) {
      patch[CONFIG.fields.satisfactory] = false;
      if (fieldExists(zaTable, CONFIG.fields.needsCorrectionAt)) patch[CONFIG.fields.needsCorrectionAt] = new Date();
      if (fieldExists(zaTable, CONFIG.fields.correctionCount)) {
        const cur = getNumber(rec, CONFIG.fields.correctionCount) || 0;
        patch[CONFIG.fields.correctionCount] = cur + 1;
      }
      actionOut = "marked_needs_correction";
    }
  }

  debugStep = "5 - Branch / write";
  setOutputSafe("debugStep", debugStep);
  if (Object.keys(patch).length) await updateRecordSafe(zaTable, recordId, patch);

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", actionOut);
  setOutputSafe("correctionCount", fieldExists(zaTable, CONFIG.fields.correctionCount) ? (getNumber(rec, CONFIG.fields.correctionCount) || 0) : 0);
  setOutputSafe("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut }));
}


try {
  await main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", msg);
  setOutputSafe("actionOut", "error");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "error", errorOut: msg }));
  throw err;
}
