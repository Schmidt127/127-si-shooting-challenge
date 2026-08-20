/*
Automation: 065 - Homework Review and XP - Create or Reconcile Homework XP Event
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-14
Last GitHub Update: 2026-08-20 (v10.2 V2 standard structure)

Purpose:
Create, replay, repair, deactivate, or reactivate the exact canonical
HOMEWORK_XP|<Homework Completion ID> XP Event for one Homework Completion.

Trigger:
Homework Completions when Homework XP Reconciliation Needed? = 1;
pass the dynamic recordId.

Important Tables:
Homework Completions, XP Events, Weekly Athlete Summary,
Program Homework Assignments, Enrollments

Important Fields:
Homework XP Current Signature, Last Homework XP Reconciled Signature,
Homework XP Reconciliation Needed?, Satisfactory?, Review Complete,
Coach Feedback, Total Homework XP Awarded, Source Key, Active?

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
v10.1 installed in Production per Mike evidence; v10.2 is structure-only.
*/

/************************************************************
 * 065 - HOMEWORK REVIEW AND XP
 * Create or Reconcile Homework XP Event
 *
 * Version: v10.2
 * Date Written: 2026-06-06
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v10.2 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata, readable CONFIG, numbered sections,
 *   hoisted debugStep, outer run wrapper. Business logic unchanged from v10.1.
 * - v10.1 (2026-08-12): Formula-backed reconcile lifecycle; PHA-first identity;
 *   canonical WAS required for positive award/reactivation; ineligible path
 *   deactivates owned event without WAS. Installed PROD per Mike evidence.
 *
 * PURPOSE
 * - One Homework Completion = one HOMEWORK_XP|<Homework Completion ID> XP Event.
 * - Creates, replays, repairs, deactivates, or reactivates that exact canonical row.
 * - Validates PHA-first identity when Program Homework Assignment exists.
 * - Requires exactly one canonical Weekly Athlete Summary before any positive award or reactivation.
 * - Ineligible corrections deactivate an owned event without requiring a Weekly Athlete Summary.
 *
 * IMPORTANT DESIGN RULES
 * - Source Key is exactly HOMEWORK_XP|{Homework Completion Record ID}.
 * - XP Events are append-only; no XP Event is deleted.
 * - Exact Enrollment, Week, Homework Completion, and Submission ownership required.
 * - Positive award/reactivation requires review eligibility + PHA eligibility (when PHA present)
 *   + Total Homework XP Awarded > 0 + exactly one canonical WAS.
 * - New XP also requires exactly one Submission link when no owned event exists yet.
 * - Final recheck before create/update is mandatory (Airtable has no atomic uniqueness).
 * - Last Homework XP Reconciled Signature is written only after formula settles and
 *   Homework XP Reconciliation Needed? rereads as 0.
 * - Never write formula / rollup / lookup / count fields.
 *
 * THIS IS NOT
 * - Homework XP prepare / Total Homework XP Awarded writer (064).
 * - Submission Base XP (010).
 * - Achievement / streak / video XP writers (059 / 054 / 114).
 * - Homework Completion create/link (020 / 067).
 *
 * FOLDER
 * - 02 - Homework Review and XP
 *
 * AUTOMATION NAME
 * - 065 - Homework Review and XP - Create or Reconcile Homework XP Event
 *
 * TRIGGER TABLE
 * - Homework Completions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Homework XP Reconciliation Needed? = 1
 * - Input variable recordId = triggering Homework Completion record ID
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Satisfactory? alone (cannot observe later withdrawal / signature changes)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Homework Completion record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_or_reactivated | reused_after_recheck |
 *   reconciled_ineligible | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - xpEventIdOut / sourceKeyOut / weeklySummaryIdOut
 * - xpEventDeactivatedOut / homeworkWritebackWarningOut
 *
 * PRIMARY TABLES USED
 * - Homework Completions, XP Events, Weekly Athlete Summary,
 *   Program Homework Assignments, Enrollments
 *
 * OUTPUT / WRITEBACK FIELDS
 * - XP Events → ownership links, Source Key, points, Active?, bucket/source, reasons
 * - Homework Completions → XP Events, Award Status, Automation Error (best-effort),
 *   Last Homework XP Reconciled Signature (after settle)
 *
 * SOURCE KEY
 * - HOMEWORK_XP|{Homework Completion Record ID}
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SOURCE_KEY_CONTRACT = {
  sourceKeyPrefix: "HOMEWORK_XP|",
};

const SCRIPT = {
  scriptName: "065 - Homework Review and XP - Create or Reconcile Homework XP Event",
  version: "v10.2",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-06",
  lastUpdated: "2026-08-20",
  folder: "02 - Homework Review and XP",
  automationName: "065 - Homework Review and XP - Create or Reconcile Homework XP Event",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    homeworkCompletions: "Homework Completions",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
    pha: "Program Homework Assignments",
    enrollments: "Enrollments",
  },
  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary Link",
    submissions: "Submissions - Linked",
    pha: "Program Homework Assignment",
    slot: "Item Slot",
    satisfactory: "Satisfactory?",
    reviewComplete: "Review Complete",
    coachFeedback: "Coach Feedback",
    totalXp: "Total Homework XP Awarded",
    awardStatus: "Award Status",
    xpEvents: "XP Events",
    completionKey: "Homework Completion Key",
    automationError: "Automation Error",
    currentSignature: "Homework XP Current Signature",
    lastSignature: "Last Homework XP Reconciled Signature",
    reconcileNeeded: "Homework XP Reconciliation Needed?",
  },
  pha: {
    active: "Active?",
    homeworkAssignment: "Homework Assignment",
    week: "Week",
    programInstance: "Program Instance",
    slot: "Homework Slot",
  },
  enrollments: {
    programInstance: "Program Instance",
    active: "Active?",
  },
  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },
  xpEvents: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    bucket: "XP Bucket",
    source: "XP Source",
    points: "XP Points",
    sourceKey: "Source Key",
    active: "Active?",
    processed: "Processed",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
  },
  values: {
    pending: "Pending",
    awarded: "Awarded",
    bucket: "Homework Completion",
    source: "Homework Completion",
    prefix: SOURCE_KEY_CONTRACT.sourceKeyPrefix,
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    createdOrReactivated: "created_or_reactivated",
    reusedAfterRecheck: "reused_after_recheck",
    reconciledIneligible: "reconciled_ineligible",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let homeworkTable;
let xpEventsTable;
let weeklySummaryTable;
let phaTable;
let enrollmentsTable;
const fieldCache = new Map();

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

function getField(table, name) {
  const cacheKey = `${table.name}:${name}`;
  if (fieldCache.has(cacheKey)) return fieldCache.get(cacheKey);
  let field = null;
  try {
    field = table.getField(name);
  } catch {
    field = null;
  }
  fieldCache.set(cacheKey, field);
  return field;
}

function requireField(table, name) {
  if (!getField(table, name)) throw new Error(`Missing required field: ${table.name} -> ${name}`);
}

function isWritable(table, name) {
  const field = getField(table, name);
  return (
    !!field &&
    !field.isComputed &&
    !new Set([
      "formula",
      "rollup",
      "lookup",
      "multipleLookupValues",
      "count",
      "createdTime",
      "lastModifiedTime",
      "autoNumber",
      "button",
      "externalSyncSource",
    ]).has(field.type)
  );
}

function getRaw(record, table, name) {
  return record && getField(table, name) ? record.getCellValue(name) : null;
}

function getText(record, table, name) {
  return record && getField(table, name) ? String(record.getCellValueAsString(name) || "").trim() : "";
}

function linkedIds(record, table, name) {
  const value = getRaw(record, table, name);
  return Array.isArray(value) ? value.map((x) => x?.id).filter(Boolean) : [];
}

function booleanish(record, table, name) {
  const value = getRaw(record, table, name);
  return (
    value === true ||
    value === 1 ||
    ["true", "1", "yes", "checked", "active"].includes(
      String(value?.name ?? value ?? "")
        .trim()
        .toLowerCase()
    )
  );
}

function getNumber(record, table, name) {
  const value = getRaw(record, table, name);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function linkedCell(ids) {
  return [...new Set(ids)].map((id) => ({ id }));
}

function sameIds(a, b) {
  return a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
}

function selectChoice(table, name, value) {
  const field = getField(table, name);
  if (field?.type !== "singleSelect") return value;
  const match = field.options?.choices?.find(
    (x) => x.name.trim().toLowerCase() === value.toLowerCase()
  );
  if (!match) throw new Error(`Missing option ${value}: ${table.name} -> ${name}`);
  return { id: match.id };
}

function sourceKeyFor(homeworkCompletionId) {
  return `${CONFIG.values.prefix}${homeworkCompletionId}`;
}

async function updateRecordSafe(table, id, fields) {
  const writableFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (isWritable(table, key) && value !== undefined) writableFields[key] = value;
  }
  if (Object.keys(writableFields).length) await table.updateRecordAsync(id, writableFields);
  return Object.keys(writableFields);
}

async function updateRecordBestEffort(table, id, fields) {
  try {
    return await updateRecordSafe(table, id, fields);
  } catch (error) {
    console.log("Best-effort writeback failed", String(error));
    return null;
  }
}

function finish(status, action, details = {}) {
  for (const [key, value] of Object.entries({
    statusOut: status,
    actionOut: action,
    errorOut: details.error || "",
    debugStep: details.step || debugStep,
    xpEventIdOut: details.xpId || "",
    sourceKeyOut: details.key || "",
    weeklySummaryIdOut: details.wasId || "",
    xpEventDeactivatedOut: details.deactivated || false,
    homeworkWritebackWarningOut: details.warning || "",
  })) {
    setOutputSafe(key, value);
  }
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: status,
      actionOut: action,
      ...details,
    })
  );
}

function matchXpEvents(records, homeworkCompletionId, key) {
  return records.filter(
    (row) =>
      linkedIds(row, xpEventsTable, CONFIG.xpEvents.homeworkCompletion).includes(homeworkCompletionId) ||
      getText(row, xpEventsTable, CONFIG.xpEvents.sourceKey) === key
  );
}

function assertOwned(xpEvent, ctx) {
  if (getText(xpEvent, xpEventsTable, CONFIG.xpEvents.sourceKey) !== ctx.key) {
    throw new Error(`XP Event ${xpEvent.id} Source Key mismatch.`);
  }
  if (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.homeworkCompletion), [ctx.id])) {
    throw new Error(`XP Event ${xpEvent.id} Homework Completion ownership mismatch.`);
  }
  if (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.enrollment), [ctx.enr])) {
    throw new Error(`XP Event ${xpEvent.id} Enrollment ownership mismatch.`);
  }
  if (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.week), [ctx.week])) {
    throw new Error(`XP Event ${xpEvent.id} Week ownership mismatch.`);
  }
  const submissionIds = linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission);
  if (submissionIds.length !== 1 || !ctx.subs.includes(submissionIds[0])) {
    throw new Error(`XP Event ${xpEvent.id} Submission ownership mismatch.`);
  }
  if (getNumber(xpEvent, xpEventsTable, CONFIG.xpEvents.points) !== ctx.total) {
    throw new Error(`XP Event ${xpEvent.id} points mismatch.`);
  }
}

async function canonicalWasCandidates(enrollmentId, weekId) {
  const query = await weeklySummaryTable.selectRecordsAsync({
    fields: [CONFIG.weeklySummary.enrollment, CONFIG.weeklySummary.week],
  });
  return query.records.filter(
    (row) =>
      sameIds(linkedIds(row, weeklySummaryTable, CONFIG.weeklySummary.enrollment), [enrollmentId]) &&
      sameIds(linkedIds(row, weeklySummaryTable, CONFIG.weeklySummary.week), [weekId])
  );
}

async function requireCanonicalWas(enrollmentId, weekId) {
  const candidates = await canonicalWasCandidates(enrollmentId, weekId);
  if (!candidates.length) {
    throw new Error(
      `No canonical Weekly Athlete Summary exists for Enrollment ${enrollmentId} + Week ${weekId}; positive Homework XP is blocked.`
    );
  }
  if (candidates.length !== 1) {
    throw new Error(
      `Multiple canonical Weekly Athlete Summaries for Enrollment ${enrollmentId} + Week ${weekId}; Needs Review: ${candidates.map((x) => x.id).join(", ")}`
    );
  }
  return candidates[0].id;
}

async function settleAndAcknowledge(homeworkCompletionId, xpEventId, expectedActive) {
  // These bounded immediate re-reads only accept a formula state that already
  // reflects the write. They never block this invocation or another slot.
  let settled = "";
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const fresh = await homeworkTable.selectRecordAsync(homeworkCompletionId);
    const current = getText(fresh, homeworkTable, CONFIG.homework.currentSignature);
    const eventState = expectedActive ? "|ACTIVE|KEY=" : "|INACTIVE|KEY=";
    if (!xpEventId || (current.includes(xpEventId) && current.includes(eventState))) {
      settled = current;
      break;
    }
  }
  if (!settled) {
    throw new Error(
      `Homework XP formula did not settle to the post-write XP Event state; reconciliation remains unacknowledged.`
    );
  }
  await updateRecordSafe(homeworkTable, homeworkCompletionId, {
    [CONFIG.homework.lastSignature]: settled,
  });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const fresh = await homeworkTable.selectRecordAsync(homeworkCompletionId);
    if (!booleanish(fresh, homeworkTable, CONFIG.homework.reconcileNeeded)) return settled;
  }
  throw new Error(`Homework XP reconciliation acknowledgement did not clear the formula trigger.`);
}

async function validatePha(homeworkCompletion, enrollmentId, weekId) {
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId);
  if (!enrollment || !booleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
    return { eligible: false, reason: `Enrollment ${enrollmentId} is missing or inactive.` };
  }
  if (!getField(homeworkTable, CONFIG.homework.pha)) {
    return {
      eligible: true,
      reason: "PHA field unavailable; legacy completion identity only.",
    };
  }
  const phaIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.pha);
  if (phaIds.length !== 1) {
    return {
      eligible: false,
      reason: `Program Homework Assignment must contain exactly one link; found ${phaIds.length}.`,
    };
  }
  const pha = await phaTable.selectRecordAsync(phaIds[0]);
  if (!pha || !booleanish(pha, phaTable, CONFIG.pha.active)) {
    return {
      eligible: false,
      reason: `Program Homework Assignment ${phaIds[0]} is missing or inactive.`,
    };
  }
  if (
    !sameIds(
      linkedIds(pha, phaTable, CONFIG.pha.homeworkAssignment),
      linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.homework)
    )
  ) {
    return { eligible: false, reason: `PHA Homework ownership mismatch.` };
  }
  if (!sameIds(linkedIds(pha, phaTable, CONFIG.pha.week), [weekId])) {
    return { eligible: false, reason: `PHA Week ownership mismatch.` };
  }
  if (
    getText(pha, phaTable, CONFIG.pha.slot) !==
    getText(homeworkCompletion, homeworkTable, CONFIG.homework.slot)
  ) {
    return { eligible: false, reason: `PHA Homework Slot ownership mismatch.` };
  }
  if (
    !sameIds(
      linkedIds(pha, phaTable, CONFIG.pha.programInstance),
      linkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance)
    )
  ) {
    return {
      eligible: false,
      reason: `PHA Program Instance does not match Enrollment.`,
    };
  }
  return { eligible: true, reason: "" };
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!recordId.startsWith("rec")) throw new Error(`Invalid recordId: ${recordId}`);
  const key = sourceKeyFor(recordId);

  step("2 - Load tables and validate schema");
  homeworkTable = base.getTable(CONFIG.tables.homeworkCompletions);
  xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  phaTable = base.getTable(CONFIG.tables.pha);
  enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  [
    CONFIG.homework.enrollment,
    CONFIG.homework.homework,
    CONFIG.homework.week,
    CONFIG.homework.submissions,
    CONFIG.homework.satisfactory,
    CONFIG.homework.reviewComplete,
    CONFIG.homework.coachFeedback,
    CONFIG.homework.totalXp,
    CONFIG.homework.awardStatus,
    CONFIG.homework.xpEvents,
    CONFIG.homework.completionKey,
    CONFIG.homework.slot,
    CONFIG.homework.currentSignature,
    CONFIG.homework.lastSignature,
    CONFIG.homework.reconcileNeeded,
  ].forEach((name) => requireField(homeworkTable, name));

  [
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.week,
    CONFIG.xpEvents.weeklySummary,
    CONFIG.xpEvents.submission,
    CONFIG.xpEvents.homeworkCompletion,
    CONFIG.xpEvents.bucket,
    CONFIG.xpEvents.source,
    CONFIG.xpEvents.points,
    CONFIG.xpEvents.sourceKey,
    CONFIG.xpEvents.active,
  ].forEach((name) => requireField(xpEventsTable, name));

  step("3 - Load homework completion");
  const homeworkCompletion = await homeworkTable.selectRecordAsync(recordId);
  if (!homeworkCompletion) throw new Error(`Homework Completion not found: ${recordId}`);

  const enrollmentIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.enrollment);
  const homeworkIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.homework);
  const weekIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.week);
  const submissionIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.submissions);
  const linkedXpIds = linkedIds(homeworkCompletion, homeworkTable, CONFIG.homework.xpEvents);

  if (enrollmentIds.length !== 1) {
    throw new Error(`Enrollment must contain exactly one link; found ${enrollmentIds.length}.`);
  }
  if (homeworkIds.length !== 1) {
    throw new Error(`Homework must contain exactly one link; found ${homeworkIds.length}.`);
  }
  if (weekIds.length !== 1) {
    throw new Error(`Week must contain exactly one link; found ${weekIds.length}.`);
  }
  if (!submissionIds.length) throw new Error(`At least one Submission link is required.`);
  if (linkedXpIds.length > 1) throw new Error(`Multiple linked XP Events: ${linkedXpIds.join(", ")}`);
  if (!getText(homeworkCompletion, homeworkTable, CONFIG.homework.completionKey)) {
    throw new Error(`Homework Completion Key is blank.`);
  }

  const signatureAtStart = getText(homeworkCompletion, homeworkTable, CONFIG.homework.currentSignature);
  if (!signatureAtStart) throw new Error(`Homework XP Current Signature is blank.`);

  const satisfactory = booleanish(homeworkCompletion, homeworkTable, CONFIG.homework.satisfactory);
  const reviewComplete = booleanish(homeworkCompletion, homeworkTable, CONFIG.homework.reviewComplete);
  const hasFeedback = Boolean(getText(homeworkCompletion, homeworkTable, CONFIG.homework.coachFeedback));
  const reviewEligible = satisfactory && reviewComplete && hasFeedback;
  const totalXp = getNumber(homeworkCompletion, homeworkTable, CONFIG.homework.totalXp);
  const ownershipContext = {
    id: recordId,
    key,
    enr: enrollmentIds[0],
    week: weekIds[0],
    subs: submissionIds,
    total: totalXp,
  };

  step("4 - Find existing XP event");
  let xpQuery = await xpEventsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.xpEvents).filter((name) => getField(xpEventsTable, name)),
  });
  let matches = matchXpEvents(xpQuery.records, recordId, key);
  if (matches.length > 1) {
    throw new Error(`Duplicate exact Homework XP Events: ${matches.map((x) => x.id).join(", ")}`);
  }

  let xpEvent = matches[0] || null;
  if (linkedXpIds.length === 1 && (!xpEvent || xpEvent.id !== linkedXpIds[0])) {
    throw new Error(`Linked XP Event does not match exact identity.`);
  }
  if (xpEvent) assertOwned(xpEvent, ownershipContext);

  const linkedEligibility = await validatePha(homeworkCompletion, enrollmentIds[0], weekIds[0]);
  const eligible = reviewEligible && linkedEligibility.eligible;

  if (!xpEvent && reviewEligible && !linkedEligibility.eligible) {
    throw new Error(`New Homework XP blocked: ${linkedEligibility.reason}`);
  }

  if (!eligible) {
    step("5 - Reconcile ineligible");
    if (xpEvent) {
      await updateRecordSafe(xpEventsTable, xpEvent.id, { [CONFIG.xpEvents.active]: false });
    }
    const writeback = await updateRecordBestEffort(homeworkTable, recordId, {
      [CONFIG.homework.awardStatus]: selectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.pending),
      ...(xpEvent ? { [CONFIG.homework.xpEvents]: linkedCell([xpEvent.id]) } : {}),
    });
    await settleAndAcknowledge(recordId, xpEvent?.id || "", false);
    return finish(CONFIG.statuses.skipped, CONFIG.actions.reconciledIneligible, {
      step: debugStep,
      key,
      xpId: xpEvent?.id || "",
      deactivated: Boolean(xpEvent),
      warning: writeback === null ? "Homework writeback failed after XP correction." : "",
      eligibilityReason: linkedEligibility.eligible
        ? "Review eligibility withdrawn."
        : linkedEligibility.reason,
    });
  }

  if (!(totalXp > 0)) throw new Error(`Total Homework XP Awarded must be positive.`);
  if (submissionIds.length !== 1 && !xpEvent) {
    throw new Error(`New Homework XP requires exactly one canonical Submission; found ${submissionIds.length}.`);
  }

  step("5 - Require canonical WAS");
  const weeklySummaryId = await requireCanonicalWas(enrollmentIds[0], weekIds[0]);
  if (xpEvent) assertOwned(xpEvent, ownershipContext);

  const payload = {
    [CONFIG.xpEvents.enrollment]: linkedCell(enrollmentIds),
    [CONFIG.xpEvents.week]: linkedCell(weekIds),
    [CONFIG.xpEvents.homeworkCompletion]: linkedCell([recordId]),
    [CONFIG.xpEvents.submission]: linkedCell([
      xpEvent ? linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission)[0] : submissionIds[0],
    ]),
    [CONFIG.xpEvents.bucket]: selectChoice(xpEventsTable, CONFIG.xpEvents.bucket, CONFIG.values.bucket),
    [CONFIG.xpEvents.source]: selectChoice(xpEventsTable, CONFIG.xpEvents.source, CONFIG.values.source),
    [CONFIG.xpEvents.points]: totalXp,
    [CONFIG.xpEvents.sourceKey]: key,
    [CONFIG.xpEvents.active]: true,
    [CONFIG.xpEvents.processed]: true,
    [CONFIG.xpEvents.reasonPublic]: "Homework completed.",
    [CONFIG.xpEvents.reasonDebug]: `Canonical Homework XP ${key}`,
    [CONFIG.xpEvents.weeklySummary]: linkedCell([weeklySummaryId]),
  };

  step("6 - Last-chance recheck");
  xpQuery = await xpEventsTable.selectRecordsAsync({
    fields: [
      CONFIG.xpEvents.sourceKey,
      CONFIG.xpEvents.homeworkCompletion,
      CONFIG.xpEvents.enrollment,
      CONFIG.xpEvents.week,
      CONFIG.xpEvents.submission,
      CONFIG.xpEvents.points,
      CONFIG.xpEvents.active,
      CONFIG.xpEvents.weeklySummary,
      CONFIG.xpEvents.source,
      CONFIG.xpEvents.bucket,
    ],
  });
  matches = matchXpEvents(xpQuery.records, recordId, key);
  if (matches.length > 1) throw new Error(`Duplicate exact XP Events during recheck.`);
  if (xpEvent && (!matches[0] || matches[0].id !== xpEvent.id)) {
    throw new Error(`Canonical XP Event changed during recheck.`);
  }
  if (matches[0]) {
    xpEvent = matches[0];
    assertOwned(xpEvent, ownershipContext);
  }

  step("7 - Write XP event");
  if (xpEvent) await updateRecordSafe(xpEventsTable, xpEvent.id, payload);
  else xpEvent = { id: await xpEventsTable.createRecordAsync(payload) };

  const writeback = await updateRecordBestEffort(homeworkTable, recordId, {
    [CONFIG.homework.xpEvents]: linkedCell([xpEvent.id]),
    [CONFIG.homework.awardStatus]: selectChoice(homeworkTable, CONFIG.homework.awardStatus, CONFIG.values.awarded),
    [CONFIG.homework.automationError]: "",
  });
  await settleAndAcknowledge(recordId, xpEvent.id, true);

  finish(
    CONFIG.statuses.success,
    matches[0] ? CONFIG.actions.reusedAfterRecheck : CONFIG.actions.createdOrReactivated,
    {
      step: debugStep,
      key,
      xpId: xpEvent.id,
      wasId: weeklySummaryId,
      warning: writeback === null ? "XP completed but Homework writeback failed." : "",
    }
  );
}

/* =========================================================
   SECTION 5: RUN
========================================================= */

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  finish(CONFIG.statuses.error, CONFIG.actions.error, {
    error: `FAILED AT: ${debugStep} | ${message}`,
    step: debugStep,
  });
  throw error;
}
