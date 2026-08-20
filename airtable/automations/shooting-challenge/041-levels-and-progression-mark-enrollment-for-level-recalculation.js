/*
Automation: 041 - Levels and Progression - Mark Enrollment for Level Recalculation
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-15
Last GitHub Update: 2026-08-20 (v5.1 V2 standard structure)

Purpose:
Queue Enrollment level recalculation whenever an authoritative progression
input changes. Queue/request only — never writes progression outputs.

Trigger:
Scheduled reconciliation (Production: every 15 minutes on wflCRvaopntNPsc64),
or a controlled single-record run using optional recordId.

Important Tables:
Enrollments, Level Gate Rules, Levels

Important Fields:
Level Recalc Needed?, Progression Last Queued Signature,
Progression Last Reconciled Signature, Lifetime XP Total, gate stats,
Current Level, Next Level, Level Gate Rule, Level Status, Active?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
v5.0 installed in Production (PKG-036 complete 2026-08-15); v5.1 is structure-only.
*/

/************************************************************
 * 041 - LEVELS AND PROGRESSION
 * Mark Enrollment for Level Recalculation
 *
 * Version: v5.1
 * Date Written: 2026-05-28
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v5.1 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, numbered sections, hoisted debugStep, outer run
 *   wrapper. Business logic unchanged from v5.0.
 * - v5.0 (2026-08-08 / 2026-08-13): Signature-based queue vs 042 reconciled
 *   signature; inactive enrollments advance queued signature only; optional
 *   recordId controlled proof. Installed PROD PKG-036 (2026-08-15).
 *
 * PURPOSE
 * - Queue Enrollment recalculation whenever an authoritative progression input
 *   changes, including positive/negative XP corrections, deactivation, ownership
 *   moves, manual XP adjustments, gate-stat changes, and active gate-rule changes.
 *
 * IMPORTANT DESIGN RULES
 * - This is a queue/request mechanism only. It never writes progression outputs.
 * - Automation 042 remains the only writer of Current Level, Next Level,
 *   Level Gate Rule, Level Status, and the queue checkbox after processing.
 * - The scheduled trigger scans the authoritative Enrollment, Levels, and Level
 *   Gate Rules inputs. A controlled recordId input may be used for a single-record
 *   proof.
 * - Progression Last Queued Signature is additive state used to make replay
 *   idempotent. Progression Last Reconciled Signature is written only by 042;
 *   queueing compares the current input/output state to that acknowledged state.
 * - Inactive enrollments are not queued, but their signature state is advanced.
 *   This makes a later deactivation/reactivation observable without assigning
 *   progression while inactive.
 * - Signature payload version key remains 2 (internal JSON shape — not SCRIPT.version).
 *
 * THIS IS NOT
 * - Level assignment / gate blocking writer (042).
 * - Legacy Level Gate Rule from Next Level (043 — retired; do not recreate).
 * - XP Event create/reconcile (010 / 065 / 114 / etc.).
 *
 * FOLDER
 * - 04 - Levels and Progression
 *
 * AUTOMATION NAME
 * - 041 - Levels and Progression - Mark Enrollment for Level Recalculation
 *
 * TRIGGER TABLE
 * - Enrollments (scheduled scan) — or controlled single Enrollment via recordId
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Scheduled reconciliation (Production: every 15 minutes)
 * - Optional input variable recordId for a controlled single-record proof
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = optional Enrollment record ID for controlled proof
 * - No recordId: scheduled reconciliation of Enrollments
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = queued | skipped_unchanged | skipped_pending | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - queuedCount / scannedCount
 *
 * PRIMARY TABLES USED
 * - Enrollments, Level Gate Rules, Levels
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Enrollments → Level Recalc Needed? (active + changed only)
 * - Enrollments → Progression Last Queued Signature (queued + inactive signature advance)
 *
 * REQUIRED PROD ADDITIVE FIELDS
 * - Enrollments.Progression Last Queued Signature (single line text, writable)
 * - Enrollments.Progression Last Reconciled Signature (single line text, writable)
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
  version: "v5.1",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-05-28",
  lastUpdated: "2026-08-20",
  folder: "04 - Levels and Progression",
  automationName: "041 - Levels and Progression - Mark Enrollment for Level Recalculation",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  batchSize: 50,
  tables: {
    enrollments: "Enrollments",
    levelGateRules: "Level Gate Rules",
    levels: "Levels",
  },
  enrollmentFields: {
    active: "Active?",
    lifetimeXpTotal: "Lifetime XP Total",
    lifetimeXpManualAdjustments: "Lifetime XP Manual Adjustments",
    totalSubmissions: "Total Submissions",
    totalHomeworkCompletions: "Total Homework Completions",
    totalVideoSubmissions: "Total Video Submissions",
    totalZoomAttendances: "Total Zoom Attendances",
    longestStreakDays: "Longest Streak Days",
    schoolYear: "School Year",
    programInstance: "Program Instance",
    gateDebugSummary: "Gate Debug Summary",
    currentLevel: "Current Level",
    nextLevel: "Next Level",
    levelGateRule: "Level Gate Rule",
    levelStatus: "Level Status",
    levelRecalcNeeded: "Level Recalc Needed?",
    lastQueuedSignature: "Progression Last Queued Signature",
    lastReconciledSignature: "Progression Last Reconciled Signature",
  },
  gateRuleFields: {
    level: "Level",
    schoolYearRuleSet: "School Year / Rule Set",
    versionActive: "Version Active?",
    gateEnabled: "Gate Enabled?",
    minimumSubmissions: "Minimum Submissions",
    minimumHomework: "Minimum Homework",
    minimumVideos: "Minimum Videos",
    minimumZoomMeetings: "Minimum Zoom Meetings",
    minimumStreakDays: "Minimum Streak Days",
  },
  levelFields: {
    name: "Level Name",
    xpRequired: "XP Required (Cumulative)",
    active: "Active?",
    sortOrder: "Sort Order",
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    queued: "queued",
    skippedUnchanged: "skipped_unchanged",
    skippedPending: "skipped_pending",
    error: "error",
  },
  outputs: {
    status: "statusOut",
    action: "actionOut",
    error: "errorOut",
    debugStep: "debugStep",
    queuedCount: "queuedCount",
    scannedCount: "scannedCount",
  },
};

const NUMBER_FIELDS = [
  CONFIG.enrollmentFields.lifetimeXpTotal,
  CONFIG.enrollmentFields.lifetimeXpManualAdjustments,
  CONFIG.enrollmentFields.totalSubmissions,
  CONFIG.enrollmentFields.totalHomeworkCompletions,
  CONFIG.enrollmentFields.totalVideoSubmissions,
  CONFIG.enrollmentFields.totalZoomAttendances,
  CONFIG.enrollmentFields.longestStreakDays,
];

const TEXT_FIELDS = [CONFIG.enrollmentFields.schoolYear];

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";

function cleanString(value) {
  return String(value ?? "").trim();
}

function assertOptionalRecordId(recordId) {
  if (recordId && !recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId: expected an Airtable record ID starting with "rec".`);
  }
  return recordId;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function getText(record, fieldName) {
  try {
    return cleanString(record.getCellValueAsString(fieldName));
  } catch {
    return "";
  }
}

function getLinkedIds(record, fieldName) {
  let value;
  try {
    value = record.getCellValue(fieldName);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item?.id)).filter(Boolean).sort();
}

function getBoolean(record, fieldName) {
  return normalizeBoolean(record.getCellValue(fieldName));
}

function isSharedSchoolYear(value) {
  const normalized = cleanString(value).toLowerCase();
  return (
    normalized === "" ||
    normalized === "shared" ||
    normalized === "default" ||
    normalized === "all years"
  );
}

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    console.log(`Optional output unavailable: ${name}`);
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe(CONFIG.outputs.debugStep, debugStep);
}

function setOutputs({ status, action, error = "", debugStep: stepName = "", queuedCount = 0, scannedCount = 0 }) {
  if (stepName) step(stepName);
  setOutputSafe(CONFIG.outputs.status, status);
  setOutputSafe(CONFIG.outputs.action, action);
  setOutputSafe(CONFIG.outputs.error, error);
  setOutputSafe(CONFIG.outputs.debugStep, debugStep);
  setOutputSafe(CONFIG.outputs.queuedCount, queuedCount);
  setOutputSafe(CONFIG.outputs.scannedCount, scannedCount);
}

function fieldExists(table, fieldName) {
  return table.fields.some((field) => field.name === fieldName);
}

function requireFields(table, fieldNames) {
  for (const fieldName of fieldNames) {
    if (!fieldExists(table, fieldName)) {
      throw new Error(`Missing field "${fieldName}" in table "${table.name}".`);
    }
  }
}

function getEnrollmentSignatureValues(record) {
  const values = {};

  for (const fieldName of NUMBER_FIELDS) {
    values[fieldName] = normalizeNumber(record.getCellValue(fieldName));
  }

  for (const fieldName of TEXT_FIELDS) {
    values[fieldName] = getText(record, fieldName);
  }

  values[CONFIG.enrollmentFields.active] = getBoolean(record, CONFIG.enrollmentFields.active);

  return values;
}

function getGateRuleSignature(record) {
  return {
    id: record.id,
    level: getLinkedIds(record, CONFIG.gateRuleFields.level),
    schoolYearRuleSet: getText(record, CONFIG.gateRuleFields.schoolYearRuleSet),
    versionActive: getBoolean(record, CONFIG.gateRuleFields.versionActive),
    gateEnabled: getBoolean(record, CONFIG.gateRuleFields.gateEnabled),
    minimumSubmissions: normalizeNumber(record.getCellValue(CONFIG.gateRuleFields.minimumSubmissions)),
    minimumHomework: normalizeNumber(record.getCellValue(CONFIG.gateRuleFields.minimumHomework)),
    minimumVideos: normalizeNumber(record.getCellValue(CONFIG.gateRuleFields.minimumVideos)),
    minimumZoomMeetings: normalizeNumber(record.getCellValue(CONFIG.gateRuleFields.minimumZoomMeetings)),
    minimumStreakDays: normalizeNumber(record.getCellValue(CONFIG.gateRuleFields.minimumStreakDays)),
  };
}

function getLevelSignature(record) {
  return {
    id: record.id,
    name: getText(record, CONFIG.levelFields.name),
    xpRequired: normalizeNumber(record.getCellValue(CONFIG.levelFields.xpRequired)),
    active: getBoolean(record, CONFIG.levelFields.active),
    sortOrder: normalizeNumber(record.getCellValue(CONFIG.levelFields.sortOrder)),
  };
}

function getOutputSignatureValues(record) {
  return {
    currentLevel: getLinkedIds(record, CONFIG.enrollmentFields.currentLevel),
    nextLevel: getLinkedIds(record, CONFIG.enrollmentFields.nextLevel),
    levelGateRule: getLinkedIds(record, CONFIG.enrollmentFields.levelGateRule),
    levelStatus: getText(record, CONFIG.enrollmentFields.levelStatus),
  };
}

function buildRelevantConfiguration(enrollment, gateRules, levels) {
  const lifetimeXp = normalizeNumber(enrollment.getCellValue(CONFIG.enrollmentFields.lifetimeXpTotal));
  const currentLevelIds = getLinkedIds(enrollment, CONFIG.enrollmentFields.currentLevel);
  const nextLevelIds = getLinkedIds(enrollment, CONFIG.enrollmentFields.nextLevel);
  const relevantLevelIds = new Set([...currentLevelIds, ...nextLevelIds]);
  const activeLevels = levels
    .map((level) => ({
      record: level,
      threshold: normalizeNumber(level.getCellValue(CONFIG.levelFields.xpRequired)),
      active: getBoolean(level, CONFIG.levelFields.active),
    }))
    .filter((level) => level.active)
    .sort((a, b) => a.threshold - b.threshold);

  for (const level of activeLevels) {
    if (level.threshold <= lifetimeXp) {
      relevantLevelIds.add(level.record.id);
      continue;
    }
    relevantLevelIds.add(level.record.id);
    break;
  }

  const relevantLevels = levels.filter((level) => relevantLevelIds.has(level.id));
  const enrollmentSchoolYear = getText(enrollment, CONFIG.enrollmentFields.schoolYear).replace(/[–—−]/g, "-");
  const relevantGateRules = gateRules.filter(
    (rule) =>
      getLinkedIds(rule, CONFIG.gateRuleFields.level).some((levelId) => relevantLevelIds.has(levelId)) &&
      (isSharedSchoolYear(getText(rule, CONFIG.gateRuleFields.schoolYearRuleSet)) ||
        getText(rule, CONFIG.gateRuleFields.schoolYearRuleSet).replace(/[–—−]/g, "-") === enrollmentSchoolYear)
  );

  return { relevantLevels, relevantGateRules };
}

function buildProgressionSignature(enrollment, gateRules, levels) {
  const { relevantLevels, relevantGateRules } = buildRelevantConfiguration(enrollment, gateRules, levels);
  const gateRuleValues = relevantGateRules.map(getGateRuleSignature).sort((a, b) => a.id.localeCompare(b.id));
  const levelValues = relevantLevels.map(getLevelSignature).sort((a, b) => a.id.localeCompare(b.id));

  return JSON.stringify({
    version: 2,
    enrollmentId: enrollment.id,
    enrollment: getEnrollmentSignatureValues(enrollment),
    outputs: getOutputSignatureValues(enrollment),
    programInstance: getLinkedIds(enrollment, CONFIG.enrollmentFields.programInstance),
    levels: levelValues,
    gateRules: gateRuleValues,
  });
}

function shouldQueue(enrollment, currentSignature) {
  if (getBoolean(enrollment, CONFIG.enrollmentFields.levelRecalcNeeded)) {
    return { queue: false, reason: "already_pending" };
  }

  const lastReconciledSignature = getText(enrollment, CONFIG.enrollmentFields.lastReconciledSignature);

  if (lastReconciledSignature === currentSignature) {
    return { queue: false, reason: "unchanged_signature" };
  }

  return {
    queue: true,
    reason: lastReconciledSignature ? "signature_changed" : "initial_signature",
  };
}

function unloadQuerySafe(query) {
  if (typeof query?.unloadData === "function") {
    try {
      query.unloadData();
    } catch {
      console.log("Non-fatal query cleanup failure.");
    }
  }
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("01 - Validate input");
  const inputConfig = typeof input !== "undefined" && input?.config ? input.config() : {};
  const requestedRecordId = assertOptionalRecordId(cleanString(inputConfig.recordId));

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const gateRulesTable = base.getTable(CONFIG.tables.levelGateRules);
  const levelsTable = base.getTable(CONFIG.tables.levels);

  const requiredEnrollmentFields = [
    ...NUMBER_FIELDS,
    ...TEXT_FIELDS,
    CONFIG.enrollmentFields.active,
    CONFIG.enrollmentFields.levelRecalcNeeded,
    CONFIG.enrollmentFields.lastQueuedSignature,
    CONFIG.enrollmentFields.lastReconciledSignature,
    CONFIG.enrollmentFields.currentLevel,
    CONFIG.enrollmentFields.nextLevel,
    CONFIG.enrollmentFields.levelGateRule,
    CONFIG.enrollmentFields.levelStatus,
    CONFIG.enrollmentFields.programInstance,
  ];
  const requiredGateRuleFields = Object.values(CONFIG.gateRuleFields);
  const requiredLevelFields = Object.values(CONFIG.levelFields);

  step("02 - Validate schema");
  requireFields(enrollmentsTable, requiredEnrollmentFields);
  requireFields(gateRulesTable, requiredGateRuleFields);
  requireFields(levelsTable, requiredLevelFields);

  step("03 - Load gate rules");
  const gateRuleQuery = await gateRulesTable.selectRecordsAsync({
    fields: requiredGateRuleFields,
  });
  const gateRules = gateRuleQuery.records;

  step("04 - Load levels");
  const levelQuery = await levelsTable.selectRecordsAsync({
    fields: requiredLevelFields,
  });
  const levels = levelQuery.records;

  step("05 - Load enrollments");
  const enrollmentQuery = await enrollmentsTable.selectRecordsAsync({
    fields: requiredEnrollmentFields,
  });
  const enrollments = requestedRecordId
    ? enrollmentQuery.records.filter((record) => record.id === requestedRecordId)
    : enrollmentQuery.records;

  const updates = [];
  const signatureOnlyUpdates = [];
  let skippedPending = 0;
  let skippedUnchanged = 0;

  step("06 - Evaluate signatures");
  for (const enrollment of enrollments) {
    const signature = buildProgressionSignature(enrollment, gateRules, levels);
    const decision = shouldQueue(enrollment, signature);

    if (!getBoolean(enrollment, CONFIG.enrollmentFields.active)) {
      if (
        decision.reason !== "already_pending" &&
        getText(enrollment, CONFIG.enrollmentFields.lastQueuedSignature) !== signature
      ) {
        signatureOnlyUpdates.push({
          id: enrollment.id,
          fields: {
            [CONFIG.enrollmentFields.lastQueuedSignature]: signature,
          },
        });
      }
      continue;
    }

    if (!decision.queue) {
      if (decision.reason === "already_pending") skippedPending += 1;
      if (decision.reason === "unchanged_signature") skippedUnchanged += 1;
      continue;
    }

    updates.push({
      id: enrollment.id,
      fields: {
        [CONFIG.enrollmentFields.levelRecalcNeeded]: true,
        [CONFIG.enrollmentFields.lastQueuedSignature]: signature,
      },
    });
  }

  step("07 - Queue changed enrollments");
  for (let index = 0; index < signatureOnlyUpdates.length; index += CONFIG.batchSize) {
    await enrollmentsTable.updateRecordsAsync(signatureOnlyUpdates.slice(index, index + CONFIG.batchSize));
  }
  for (let index = 0; index < updates.length; index += CONFIG.batchSize) {
    await enrollmentsTable.updateRecordsAsync(updates.slice(index, index + CONFIG.batchSize));
  }

  unloadQuerySafe(gateRuleQuery);
  unloadQuerySafe(levelQuery);
  unloadQuerySafe(enrollmentQuery);

  const message = `Scanned ${enrollments.length}; queued ${updates.length}; skipped ${skippedPending} pending and ${skippedUnchanged} unchanged.`;
  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      requestedRecordId,
      scannedCount: enrollments.length,
      queuedCount: updates.length,
      skippedPending,
      skippedUnchanged,
    })
  );
  setOutputs({
    status: updates.length ? CONFIG.statuses.success : CONFIG.statuses.skipped,
    action: updates.length ? CONFIG.actions.queued : CONFIG.actions.skippedUnchanged,
    debugStep: "08 - Complete",
    queuedCount: updates.length,
    scannedCount: enrollments.length,
  });
  console.log(message);
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputs({
    status: CONFIG.statuses.error,
    action: CONFIG.actions.error,
    error: `FAILED AT: ${debugStep} | ${message}`,
    debugStep: `99 - Error (${debugStep})`,
  });
  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.error,
      actionOut: CONFIG.actions.error,
      errorOut: message,
      debugStep,
    })
  );
  throw error;
}
