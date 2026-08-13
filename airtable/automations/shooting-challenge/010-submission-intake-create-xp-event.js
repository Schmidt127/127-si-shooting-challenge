/*
Automation: 010 - Submission Intake and Asset Creation - Create XP Event from Submission
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-06-21
Last GitHub Update: 2026-08-13

Purpose:
Reconcile one Submission's canonical Submission Base XP Event.

Trigger:
Submissions when Reconciliation Needed? = 1; pass the dynamic recordId.

Important Tables:
Submissions, XP Events, XP Reward Rules, Enrollments, Weeks,
Weekly Athlete Summary

Important Fields:
Reconciliation signature chain, Count This Submission?, Total Shots Counted,
Enrollment, Week, Weekly Athlete Summary, XP Events, Active?, Source Key

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
This automation does not write milestone/streak XP directly. 053/054 and
066/059 remain their canonical owners and fail closed when their source
ownership cannot be proven.
*/

/************************************************************
 * 010 - SUBMISSION INTAKE AND ASSET CREATION
 * Create/Reconcile Submission Base XP Event
 *
 * Version: v10.8
 * Date Written: 2026-06-06
 * Last Updated: 2026-08-13
 *
 * PURPOSE
 * - Reconcile one Submission after the approved signature formula changes.
 * - Preserve positive counted-shot XP creation and replay behavior.
 * - Deactivate or reactivate only the exact owned Submission XP Event.
 * - Ignore unrelated XP families (for example HOMEWORK_XP) that may also link
 *   to the same source Submission.
 *
 * IMPORTANT DESIGN RULES
 * - Source Key is exactly SUBMISSION_XP|{Submission Record ID}.
 * - XP Events are append-only; no XP Event is deleted.
 * - Exact Enrollment, Week, WAS, and event ownership are required.
 * - Zero/multiple Submission Base candidates, duplicate canonical keys, conflicting
 *   canonical/legacy Submission Base pairs, wrong ownership, future dates,
 *   formula lag, and partial writes fail closed.
 * - Airtable has no atomic uniqueness; the final recheck is mandatory.
 * - Last Reconciled Signature is written only after the expected Active? state
 *   is visible and Reconciliation Needed? rereads as 0.
 * - This is not the milestone/streak XP writer; 041/042 remain progression
 *   owners and are never called as XP writers.
 *
 * FOLDER
 * - 01 - Submission Intake and Asset Creation
 *
 * AUTOMATION NAME
 * - 010 - Submission Intake and Asset Creation - Create XP Event from Submission
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Reconciliation Needed? = 1
 * - Input variable recordId = triggering Submission record ID
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Count This Submission? alone; that positive-only filter cannot observe
 *   later exclusion, future-date, link, or Enrollment changes.
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = triggering Submission record ID
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created | reactivated_same_event | repaired_same_event |
 *   deactivated_same_event | skipped_ineligible | skipped_already_reconciled |
 *   blocked_* | error
 * - errorOut = message or empty
 * - debugStep = last step reached
 * - reconciliationAcknowledged = true only after post-write latch proof
 * - milestoneStreakReconciliation = requested | blocked_no_canonical_owner
 *
 * PRIMARY TABLES USED
 * - Submissions, XP Events, XP Reward Rules, Enrollments, Weeks,
 *   Weekly Athlete Summary
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Submission → XP Events, XP Award Status, Last Reconciled Signature
 * - XP Event → exact owned fields and Active?
 * - Enrollment → Run Shot Milestone Check? after a successful reconciliation
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "010 - Submission Intake and Asset Creation - Create XP Event from Submission",
  version: "v10.8",
  versionDate: "2026-08-13",
  originalWrittenDate: "2026-06-06",
  lastUpdated: "2026-08-13",
  folder: "01 - Submission Intake and Asset Creation",
  automationName: "010 - Submission Intake and Asset Creation - Create XP Event from Submission",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",
  formulaSettlementAttempts: 5,
  formulaSettlementDelayMs: 250,
  tables: {
    submissions: "Submissions",
    xpEvents: "XP Events",
    xpRules: "XP Reward Rules",
    enrollments: "Enrollments",
    weeks: "Weeks",
    weeklySummary: "Weekly Athlete Summary",
  },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpEvents: "XP Events",
    activityDate: "Activity Date",
    totalShotsCounted: "Total Shots Counted",
    countThisSubmission: "Count This Submission?",
    xpAwardStatus: "XP Award Status",
    currentSignature: "Current Reconciliation Signature",
    lastSignature: "Last Reconciled Signature",
    needed: "Reconciliation Needed?",
  },
  enrollments: {
    active: "Active?",
    programInstance: "Program Instance",
    runShotMilestoneCheck: "Run Shot Milestone Check?",
  },
  weeks: {
    programInstance: "Program Instance",
    startDate: "Start Date",
    endDate: "End Date",
  },
  weeklySummary: {
    enrollment: "Enrollment",
    week: "Week",
  },
  xpRules: { ruleKey: "Rule Key", xpAmount: "XP Amount", active: "Active?" },
  xpEvents: {
    active: "Active?",
    sourceKey: "Source Key",
    submission: "Submission",
    enrollment: "Enrollment",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    xpSource: "XP Source",
    xpBucket: "XP Bucket",
    xpPoints: "XP Points",
    xpReasonPublic: "XP Reason Public",
    xpReasonDebug: "XP Reason Debug",
    xpActivityDate: "XP Activity Date",
    xpActivityDateSource: "XP Activity Date Source",
  },
  values: {
    sourceKeyPrefix: "SUBMISSION_XP|",
    ruleKey: "SHOOTING_BASE",
    xpSource: "Submission Base",
    xpBucket: "Shooting Base",
    dateSource: "Submission Activity Date",
    awardStatus: "Awarded",
    errorStatus: "Error",
    submissionBaseSourceOptionId: "selZw4nOkwMJCgGyR",
  },
  foreignSourceKeyPrefixes: [
    "HOMEWORK_XP|",
    "VIDEO_SUBMISSION|",
    "STREAK_XP|",
    "SHOT_MILESTONE|",
    "PERFECT_WEEK|",
    "WEEKLY_THRESHOLD|",
    "ZOOM_",
  ],
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let submissionsTable;
let xpEventsTable;
let xpRulesTable;
let enrollmentsTable;
let weeksTable;
let weeklySummaryTable;

function setOutputSafe(name, value) {
  try { output.set(name, value); } catch { /* unmapped outputs are non-fatal */ }
}

function setOutputs(values) {
  for (const [name, value] of Object.entries(values)) setOutputSafe(name, value);
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", name);
}

function field(table, name) {
  try { return table.getField(name); } catch { return null; }
}

function requireField(table, name, writable = false) {
  const found = field(table, name);
  if (!found) throw new Error(`Missing required field: ${table.name} -> ${name}`);
  if (writable && !isWritable(found)) {
    throw new Error(`Required field is not writable: ${table.name} -> ${name}`);
  }
  return found;
}

function isWritable(found) {
  return Boolean(found) && found.isComputed !== true && !new Set([
    "formula", "rollup", "count", "lookup", "multipleLookupValues",
    "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy",
    "autoNumber", "button", "aiText", "externalSyncSource",
  ]).has(found.type);
}

function raw(record, table, name) {
  return field(table, name) ? record.getCellValue(name) : null;
}

function text(record, table, name) {
  if (!field(table, name)) return "";
  const value = raw(record, table, name);
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value) && value.name) return String(value.name).trim();
  return String(record.getCellValueAsString(name) || "").trim();
}

function number(record, table, name) {
  const value = raw(record, table, name);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(record?.getCellValueAsString(name) || value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanish(record, table, name) {
  const value = raw(record, table, name);
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  return ["true", "1", "yes", "checked", "active"].includes(String(value).toLowerCase().trim());
}

function ids(record, table, name) {
  const value = raw(record, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function one(record, table, name) {
  const values = ids(record, table, name);
  return values.length === 1 ? values[0] : "";
}

function linked(id) {
  return id ? [{ id }] : [];
}

function selectValue(table, name, value) {
  const found = field(table, name);
  if (!found) throw new Error(`Missing field: ${table.name} -> ${name}`);
  if (found.type !== "singleSelect") return value;
  const choice = (found.options?.choices || []).find((item) => item.name === value);
  if (!choice) throw new Error(`Missing single-select option "${value}" on ${table.name} -> ${name}`);
  return { id: choice.id };
}

function addWritable(payload, table, name, value) {
  if (value === undefined || value === null || !isWritable(field(table, name))) return;
  payload[name] = value;
}

function dateKey(value) {
  const textValue = String(value || "").trim();
  const iso = textValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const local = textValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return local ? `${local[3]}-${local[1].padStart(2, "0")}-${local[2].padStart(2, "0")}` : "";
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================================================
   SECTION 4: RECONCILIATION HELPERS
========================================================= */

function sourceKey(submissionId) {
  return `${CONFIG.values.sourceKeyPrefix}${submissionId}`;
}

function validateSchema() {
  for (const name of Object.values(CONFIG.submissions)) {
    if (name === CONFIG.submissions.lastSignature) requireField(submissionsTable, name, true);
    else requireField(submissionsTable, name);
  }
  for (const name of Object.values(CONFIG.enrollments)) requireField(enrollmentsTable, name);
  for (const name of Object.values(CONFIG.weeks)) requireField(weeksTable, name);
  for (const name of Object.values(CONFIG.weeklySummary)) requireField(weeklySummaryTable, name);
  for (const name of ["active", "sourceKey", "submission", "enrollment", "week", "weeklySummary", "xpSource", "xpBucket", "xpPoints", "xpReasonPublic", "xpReasonDebug"]) {
    requireField(xpEventsTable, CONFIG.xpEvents[name], name === "active" || name === "sourceKey" || name === "submission" || name === "enrollment" || name === "week" || name === "weeklySummary" || name === "xpSource" || name === "xpBucket" || name === "xpPoints" || name === "xpReasonPublic" || name === "xpReasonDebug");
  }
  for (const name of Object.values(CONFIG.xpRules)) requireField(xpRulesTable, name);
}

async function validWasIds(enrollmentId, weekId) {
  const query = await weeklySummaryTable.selectRecordsAsync({
    fields: [CONFIG.weeklySummary.enrollment, CONFIG.weeklySummary.week],
  });
  return query.records
    .filter((row) => one(row, weeklySummaryTable, CONFIG.weeklySummary.enrollment) === enrollmentId
      && one(row, weeklySummaryTable, CONFIG.weeklySummary.week) === weekId)
    .map((row) => row.id);
}

async function loadXpEvents() {
  return xpEventsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.xpEvents).filter((name) => field(xpEventsTable, name)),
  });
}

function eventOwned(event, submissionId, enrollmentId, weekId, wasId) {
  return submissionBaseLinkedOwned(event, submissionId, enrollmentId, weekId, wasId)
    && text(event, xpEventsTable, CONFIG.xpEvents.sourceKey) === sourceKey(submissionId);
}

function submissionBaseLinkedOwned(event, submissionId, enrollmentId, weekId, wasId) {
  return one(event, xpEventsTable, CONFIG.xpEvents.submission) === submissionId
    && one(event, xpEventsTable, CONFIG.xpEvents.enrollment) === enrollmentId
    && one(event, xpEventsTable, CONFIG.xpEvents.week) === weekId
    && ids(event, xpEventsTable, CONFIG.xpEvents.weeklySummary).length === 1
    && one(event, xpEventsTable, CONFIG.xpEvents.weeklySummary) === wasId;
}

function eventOwnedForAck(event, submissionId, enrollmentId, weekId, wasId) {
  return eventOwned(event, submissionId, enrollmentId, weekId, wasId)
    || (submissionBaseLinkedOwned(event, submissionId, enrollmentId, weekId, wasId)
      && isSubmissionBaseCandidate(event, submissionId));
}

function sourceKeyText(event) {
  return text(event, xpEventsTable, CONFIG.xpEvents.sourceKey);
}

function selectOptionId(record, table, name) {
  const value = raw(record, table, name);
  if (value && typeof value === "object" && value.id) return String(value.id);
  const found = field(table, name);
  if (!found || found.type !== "singleSelect") return "";
  const label = text(record, table, name);
  const choice = (found.options?.choices || []).find((item) => item.name === label);
  return choice?.id ? String(choice.id) : "";
}

function submissionLinked(event, submissionId) {
  return ids(event, xpEventsTable, CONFIG.xpEvents.submission).includes(submissionId);
}

function isForeignXpFamily(event) {
  const key = sourceKeyText(event);
  if (!key) return false;
  return CONFIG.foreignSourceKeyPrefixes.some((prefix) => key.startsWith(prefix));
}

function isCanonicalSubmissionBaseKey(event, submissionId) {
  return sourceKeyText(event) === sourceKey(submissionId);
}

function isLegacySubmissionBaseCandidate(event, submissionId) {
  if (!submissionLinked(event, submissionId)) return false;
  if (isForeignXpFamily(event)) return false;
  if (isCanonicalSubmissionBaseKey(event, submissionId)) return false;
  const key = sourceKeyText(event);
  if (key.startsWith(CONFIG.values.sourceKeyPrefix)) {
    const suffix = key.slice(CONFIG.values.sourceKeyPrefix.length);
    if (suffix && suffix !== submissionId) return false;
  }
  if (selectOptionId(event, xpEventsTable, CONFIG.xpEvents.xpSource) === CONFIG.values.submissionBaseSourceOptionId) {
    return true;
  }
  if (text(event, xpEventsTable, CONFIG.xpEvents.xpSource) === CONFIG.values.xpSource) return true;
  if (text(event, xpEventsTable, CONFIG.xpEvents.xpBucket) === CONFIG.values.xpBucket) return true;
  return false;
}

function isSubmissionBaseCandidate(event, submissionId) {
  return isCanonicalSubmissionBaseKey(event, submissionId)
    || isLegacySubmissionBaseCandidate(event, submissionId);
}

function findSubmissionBaseCandidates(records, submissionId) {
  return records.filter((row) => isSubmissionBaseCandidate(row, submissionId));
}

function resolveSubmissionBaseLookup(records, submissionId) {
  const exactKeyMatches = records.filter((row) => isCanonicalSubmissionBaseKey(row, submissionId));
  if (exactKeyMatches.length > 1) {
    throw new Error(`Duplicate canonical Source Key: ${sourceKey(submissionId)}`);
  }
  const linkedCandidates = findSubmissionBaseCandidates(
    records.filter((row) => submissionLinked(row, submissionId)),
    submissionId,
  );
  const canonicalLinked = linkedCandidates.filter((row) => isCanonicalSubmissionBaseKey(row, submissionId));
  const legacyLinked = linkedCandidates.filter((row) => isLegacySubmissionBaseCandidate(row, submissionId));
  if (canonicalLinked.length > 1) {
    throw new Error(`Multiple Submission Base XP Events are linked to Submission ${submissionId}.`);
  }
  if (legacyLinked.length > 1) {
    throw new Error(`Multiple legacy Submission Base XP Events are linked to Submission ${submissionId}.`);
  }
  if (canonicalLinked.length === 1 && legacyLinked.length === 1 && canonicalLinked[0].id !== legacyLinked[0].id) {
    throw new Error(`Submission ${submissionId} has conflicting canonical and legacy Submission Base XP Events.`);
  }
  if (exactKeyMatches[0] && legacyLinked.length === 1 && exactKeyMatches[0].id !== legacyLinked[0].id) {
    throw new Error(`Submission ${submissionId} has conflicting canonical and legacy Submission Base XP Events.`);
  }
  const resolved = exactKeyMatches[0] || canonicalLinked[0] || legacyLinked[0] || null;
  if (resolved && !submissionLinked(resolved, submissionId) && isCanonicalSubmissionBaseKey(resolved, submissionId)) {
    throw new Error(`Canonical XP Event ownership mismatch for ${sourceKey(submissionId)}.`);
  }
  if (
    resolved
    && submissionLinked(resolved, submissionId)
    && isLegacySubmissionBaseCandidate(resolved, submissionId)
    && sourceKeyText(resolved)
    && sourceKeyText(resolved) !== sourceKey(submissionId)
  ) {
    throw new Error(`Submission ${submissionId} has an XP Event with a non-canonical Source Key.`);
  }
  if (exactKeyMatches[0] && !submissionLinked(exactKeyMatches[0], submissionId)) {
    throw new Error(`Canonical XP Event ownership mismatch for ${sourceKey(submissionId)}.`);
  }
  return resolved;
}

async function findExactEvent(submissionId, enrollmentId, weekId, wasId) {
  const query = await loadXpEvents();
  const resolved = resolveSubmissionBaseLookup(query.records, submissionId);
  const linkedBaseCandidates = findSubmissionBaseCandidates(
    query.records.filter((row) => submissionLinked(row, submissionId)),
    submissionId,
  );
  const exactKeyMatches = query.records.filter((row) => isCanonicalSubmissionBaseKey(row, submissionId));
  if (exactKeyMatches.some((row) => !eventOwned(row, submissionId, enrollmentId, weekId, wasId))) {
    throw new Error(`Canonical XP Event ownership mismatch for ${sourceKey(submissionId)}.`);
  }
  if (linkedBaseCandidates.some((row) =>
    isCanonicalSubmissionBaseKey(row, submissionId)
    && !eventOwned(row, submissionId, enrollmentId, weekId, wasId))) {
    throw new Error(`Submission ${submissionId} has an XP Event with wrong ownership or links.`);
  }
  if (resolved && !eventOwned(resolved, submissionId, enrollmentId, weekId, wasId)) {
    if (isCanonicalSubmissionBaseKey(resolved, submissionId)) {
      throw new Error(`Canonical XP Event ownership mismatch for ${sourceKey(submissionId)}.`);
    }
    throw new Error(`Submission ${submissionId} has an XP Event with wrong ownership or links.`);
  }
  return resolved;
}

async function findCanonicalKeyEvent(submissionId) {
  const query = await loadXpEvents();
  return resolveSubmissionBaseLookup(query.records, submissionId);
}

async function findRule() {
  const query = await xpRulesTable.selectRecordsAsync({
    fields: [CONFIG.xpRules.ruleKey, CONFIG.xpRules.xpAmount, CONFIG.xpRules.active],
  });
  const matches = query.records.filter((row) => text(row, xpRulesTable, CONFIG.xpRules.ruleKey) === CONFIG.values.ruleKey
    && booleanish(row, xpRulesTable, CONFIG.xpRules.active));
  if (matches.length !== 1) throw new Error(`Expected exactly one active ${CONFIG.values.ruleKey} XP Reward Rule; found ${matches.length}.`);
  const points = number(matches[0], xpRulesTable, CONFIG.xpRules.xpAmount);
  if (!points || points <= 0) throw new Error("SHOOTING_BASE XP Amount must be positive.");
  return points;
}

async function acknowledgeAfterSettlement(recordId, expectedActive, priorSignature, expectedXpEventId = "") {
  for (let attempt = 1; attempt <= CONFIG.formulaSettlementAttempts; attempt += 1) {
    const refreshed = await submissionsTable.selectRecordAsync(recordId);
    const current = text(refreshed, submissionsTable, CONFIG.submissions.currentSignature);
    const needed = number(refreshed, submissionsTable, CONFIG.submissions.needed);
    const signatureChanged = Boolean(current) && current !== priorSignature;
    const expectedEventState = expectedXpEventId
      ? booleanish(
        await xpEventsTable.selectRecordAsync(expectedXpEventId),
        xpEventsTable,
        CONFIG.xpEvents.active,
      ) === expectedActive
      : !expectedActive;
    if (signatureChanged && expectedEventState && needed === 1) {
      const preAckEnrollmentIds = ids(refreshed, submissionsTable, CONFIG.submissions.enrollment);
      const preAckWeekIds = ids(refreshed, submissionsTable, CONFIG.submissions.week);
      const preAckWasIds = ids(refreshed, submissionsTable, CONFIG.submissions.weeklySummary);
      const preAckEvent = expectedXpEventId
        ? await xpEventsTable.selectRecordAsync(expectedXpEventId)
        : null;
      const ownershipBeforeAck = !expectedXpEventId
        || (preAckEnrollmentIds.length === 1
          && preAckWeekIds.length === 1
          && preAckWasIds.length === 1
          && eventOwnedForAck(
            preAckEvent,
            recordId,
            preAckEnrollmentIds[0],
            preAckWeekIds[0],
            preAckWasIds[0],
          ));
      if (!ownershipBeforeAck) {
        throw new Error("XP Event ownership changed before latch acknowledgement.");
      }
      await submissionsTable.updateRecordAsync(recordId, {
        [CONFIG.submissions.lastSignature]: current,
      });
      const acknowledged = await submissionsTable.selectRecordAsync(recordId);
      const enrollmentIds = ids(acknowledged, submissionsTable, CONFIG.submissions.enrollment);
      const weekIds = ids(acknowledged, submissionsTable, CONFIG.submissions.week);
      const wasIds = ids(acknowledged, submissionsTable, CONFIG.submissions.weeklySummary);
      const acknowledgedEvent = expectedXpEventId
        ? await xpEventsTable.selectRecordAsync(expectedXpEventId)
        : null;
      const ownershipStillExact = !expectedXpEventId
        || (enrollmentIds.length === 1
          && weekIds.length === 1
          && wasIds.length === 1
          && eventOwnedForAck(
            acknowledgedEvent,
            recordId,
            enrollmentIds[0],
            weekIds[0],
            wasIds[0],
          ));
      if (number(acknowledged, submissionsTable, CONFIG.submissions.needed) === 0 && ownershipStillExact) {
        return current;
      }
      if (!ownershipStillExact) {
        await submissionsTable.updateRecordAsync(recordId, {
          [CONFIG.submissions.lastSignature]: priorSignature,
        });
        throw new Error("Post-write XP Event ownership changed; reconciliation was not acknowledged.");
      }
    }
    if (attempt < CONFIG.formulaSettlementAttempts) await sleep(CONFIG.formulaSettlementDelayMs);
  }
  throw new Error("Formula settlement timeout; Last Reconciled Signature was not acknowledged.");
}

async function requestDownstreamRecalculation(enrollmentId) {
  if (!isWritable(field(enrollmentsTable, CONFIG.enrollments.runShotMilestoneCheck))) return false;
  await enrollmentsTable.updateRecordAsync(enrollmentId, {
    [CONFIG.enrollments.runShotMilestoneCheck]: true,
  });
  return true;
}

function debugReason(recordId, points, action) {
  return [
    `${SCRIPT.scriptName} ${SCRIPT.version}.`,
    `Action: ${action}.`,
    `Submission: ${recordId}.`,
    `Source Key: ${sourceKey(recordId)}.`,
    `XP Points: ${points}.`,
  ].join(" ");
}

/* =========================================================
   SECTION 5: MAIN
========================================================= */

async function main() {
  let recordId = "";
  let submission = null;
  let priorSignature = "";
  try {
    step("1 - Validate recordId");
    recordId = String(input.config().recordId || "").trim();
    if (!recordId || !recordId.startsWith("rec")) throw new Error("A valid Submission recordId is required.");

    step("2 - Load tables");
    submissionsTable = base.getTable(CONFIG.tables.submissions);
    xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    xpRulesTable = base.getTable(CONFIG.tables.xpRules);
    enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    weeksTable = base.getTable(CONFIG.tables.weeks);
    weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);

    step("3 - Validate approved reconciliation schema");
    validateSchema();

    step("4 - Load Submission");
    submission = await submissionsTable.selectRecordAsync(recordId);
    if (!submission) throw new Error(`Submission not found: ${recordId}`);
    priorSignature = text(submission, submissionsTable, CONFIG.submissions.lastSignature);

    const enrollmentIds = ids(submission, submissionsTable, CONFIG.submissions.enrollment);
    const weekIds = ids(submission, submissionsTable, CONFIG.submissions.week);
    const wasIds = ids(submission, submissionsTable, CONFIG.submissions.weeklySummary);
    if (enrollmentIds.length > 1 || weekIds.length > 1 || wasIds.length > 1) {
      throw new Error(`Submission ${recordId} has ambiguous Enrollment, Week, or WAS links.`);
    }
    const enrollmentId = enrollmentIds[0] || "";
    const weekId = weekIds[0] || "";
    const wasCandidates = enrollmentId && weekId ? await validWasIds(enrollmentId, weekId) : [];
    const wasId = wasCandidates.length === 1 ? wasCandidates[0] : "";
    const canonicalKeyEvent = await findCanonicalKeyEvent(recordId);
    const enrollment = enrollmentId ? await enrollmentsTable.selectRecordAsync(enrollmentId) : null;
    const week = weekId ? await weeksTable.selectRecordAsync(weekId) : null;
    const activityDate = dateKey(raw(submission, submissionsTable, CONFIG.submissions.activityDate));
    const eligible = Boolean(
      enrollment && week && enrollmentIds.length === 1 && weekIds.length === 1
      && wasCandidates.length === 1 && wasIds.length <= 1 && wasId
      && (wasIds.length === 0 || wasIds[0] === wasId)
      && booleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)
      && booleanish(submission, submissionsTable, CONFIG.submissions.countThisSubmission)
      && (number(submission, submissionsTable, CONFIG.submissions.totalShotsCounted) || 0) > 0
      && activityDate && activityDate <= todayKey()
      && activityDate >= dateKey(raw(week, weeksTable, CONFIG.weeks.startDate))
      && activityDate <= dateKey(raw(week, weeksTable, CONFIG.weeks.endDate))
      && one(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance)
      && one(week, weeksTable, CONFIG.weeks.programInstance) === one(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance),
    );

    if (!eligible) {
      step("5 - Correction or safe ineligible skip");
      if (!enrollmentId || !weekId || wasCandidates.length !== 1 || !wasId || wasIds.length > 1) {
        throw new Error(
          `Submission ${recordId} is ineligible with incomplete or ambiguous canonical identity; ` +
          "the existing XP Event remains unacknowledged.",
        );
      }
      const correctionEvent = canonicalKeyEvent
        && eventOwnedForAck(canonicalKeyEvent, recordId, enrollmentId, weekId, wasId)
        ? canonicalKeyEvent
        : null;
      if (canonicalKeyEvent && !correctionEvent) {
        throw new Error(
          `Submission ${recordId} has a canonical XP Event with ownership mismatch; no event was changed.`,
        );
      }
      if (correctionEvent) {
        await xpEventsTable.updateRecordAsync(correctionEvent.id, {
          [CONFIG.xpEvents.active]: false,
        });
        await requestDownstreamRecalculation(enrollmentId);
        const signature = await acknowledgeAfterSettlement(recordId, false, priorSignature, correctionEvent.id);
        setOutputs({
          ok: true, statusOut: "success", actionOut: "deactivated_same_event", errorOut: "", debugStep,
          submissionId: recordId, xpEventId: correctionEvent.id, sourceKey: sourceKey(recordId),
          reconciliationAcknowledged: true, reconciledSignature: signature,
          milestoneStreakReconciliation: "blocked_no_canonical_owner",
          downstreamRecalculationRequested: Boolean(enrollmentId),
        });
      } else {
        const signature = await acknowledgeAfterSettlement(recordId, false, priorSignature);
        setOutputs({
          ok: true, statusOut: "skipped", actionOut: "skipped_ineligible", errorOut: "", debugStep,
          submissionId: recordId, reconciliationAcknowledged: true, reconciledSignature: signature,
          milestoneStreakReconciliation: "blocked_no_canonical_owner",
        });
      }
      return;
    }

    step("6 - Load SHOOTING_BASE rule and build canonical payload");
    const xpPoints = await findRule();
    const payload = {
      [CONFIG.xpEvents.enrollment]: linked(enrollmentId),
      [CONFIG.xpEvents.submission]: linked(recordId),
      [CONFIG.xpEvents.week]: linked(weekId),
      [CONFIG.xpEvents.weeklySummary]: linked(wasId),
      [CONFIG.xpEvents.xpSource]: selectValue(xpEventsTable, CONFIG.xpEvents.xpSource, CONFIG.values.xpSource),
      [CONFIG.xpEvents.xpBucket]: selectValue(xpEventsTable, CONFIG.xpEvents.xpBucket, CONFIG.values.xpBucket),
      [CONFIG.xpEvents.xpPoints]: xpPoints,
      [CONFIG.xpEvents.xpReasonPublic]: "Shooting submission completed.",
      [CONFIG.xpEvents.xpReasonDebug]: debugReason(recordId, xpPoints, canonicalKeyEvent ? "reactivated_or_repaired" : "created"),
      [CONFIG.xpEvents.active]: true,
      [CONFIG.xpEvents.sourceKey]: sourceKey(recordId),
    };
    if (isWritable(field(xpEventsTable, CONFIG.xpEvents.xpActivityDate))) payload[CONFIG.xpEvents.xpActivityDate] = raw(submission, submissionsTable, CONFIG.submissions.activityDate);
    if (isWritable(field(xpEventsTable, CONFIG.xpEvents.xpActivityDateSource))) payload[CONFIG.xpEvents.xpActivityDateSource] = selectValue(xpEventsTable, CONFIG.xpEvents.xpActivityDateSource, CONFIG.values.dateSource);

    step("7 - Exact-key last-chance recheck and write");
    const lastChance = await findExactEvent(recordId, enrollmentId, weekId, wasId);
    let xpEventId;
    let actionOut;
    if (lastChance) {
      await xpEventsTable.updateRecordAsync(lastChance.id, payload);
      xpEventId = lastChance.id;
      actionOut = !booleanish(lastChance, xpEventsTable, CONFIG.xpEvents.active)
        ? "reactivated_same_event"
        : "repaired_same_event";
    } else {
      xpEventId = await xpEventsTable.createRecordAsync(payload);
      actionOut = "created";
    }
    const currentLinks = ids(submission, submissionsTable, CONFIG.submissions.xpEvents);
    const submissionUpdate = {};
    if (!currentLinks.includes(xpEventId)) {
      submissionUpdate[CONFIG.submissions.xpEvents] = [...new Set([...currentLinks, xpEventId])].map((id) => ({ id }));
    }
    if (wasIds.length === 0) submissionUpdate[CONFIG.submissions.weeklySummary] = linked(wasId);
    submissionUpdate[CONFIG.submissions.xpAwardStatus] = selectValue(
      submissionsTable,
      CONFIG.submissions.xpAwardStatus,
      CONFIG.values.awardStatus,
    );
    await submissionsTable.updateRecordAsync(recordId, submissionUpdate);

    step("8 - Request downstream recalculation");
    const downstreamRequested = await requestDownstreamRecalculation(enrollmentId);
    step("9 - Settle formulas and acknowledge latch");
    const signature = await acknowledgeAfterSettlement(recordId, true, priorSignature, xpEventId);
    setOutputs({
      ok: true, statusOut: "success", actionOut, errorOut: "", debugStep,
      submissionId: recordId, enrollmentId, weekId, weeklySummaryId: wasId, xpEventId,
      sourceKey: sourceKey(recordId), xpPoints, reconciliationAcknowledged: true,
      reconciledSignature: signature, downstreamRecalculationRequested: downstreamRequested,
      milestoneStreakReconciliation: "blocked_no_canonical_owner",
    });
    console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut, submissionId: recordId, xpEventId, sourceKey: sourceKey(recordId), debugStep }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputs({
      ok: false, statusOut: "error", actionOut: "error", errorOut: `FAILED AT: ${debugStep} — ${message}`,
      debugStep, submissionId: recordId, reconciliationAcknowledged: false,
      milestoneStreakReconciliation: "blocked_no_canonical_owner",
    });
    console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "error", actionOut: "error", errorOut: message, submissionId: recordId, debugStep }));
    throw error;
  }
}

try {
  await main();
} catch (error) {
  throw error;
}
