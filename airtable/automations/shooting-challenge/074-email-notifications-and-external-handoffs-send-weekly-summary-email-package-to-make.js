/*
Automation: 074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-17
Last GitHub Update: 2026-09-01 (v3.4 videosSubmittedThisWeek forwarding)

Purpose:
Validate one Weekly Athlete Summary ready for parent email and create exactly
one Ready Email Handoff Queue row for Communications Hub (079 → Resend).

Trigger:
Weekly Athlete Summary when Weekly Email Ready?, Send to Make? checked,
and Sent? unchecked (confirm exact conditions in Airtable UI).

Important Tables:
Weekly Athlete Summary, Enrollments, Weeks, Program Instance - Sync,
Email Handoff Queue

Important Fields:
Weekly Email Ready?, Weekly Email Sent?, Send to Make?, Weekly Email Payload JSON,
Handoff Key, Status

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Filename may still say Make; current path is Hub queue create only.
*/

/************************************************************
 * 074 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Create Weekly Athlete Summary Communications Hub Handoff
 *
 * Version: v3.4
 * Date Written: 2026-05-29
 * Last Updated: 2026-09-01
 *
 * VERSION HISTORY
 * - v3.4 (2026-09-01): Forward 072 v4.9 videosSubmittedThisWeek to Hub payload.
 * - v3.3 (2026-08-24): Forward 072 v4.7 shootingDaysDisplay, goalCompletionDisplay,
 *   and secure-url video submissions; prefer canonical shooting days over PW fields.
 * - v3.2 (2026-08-23): Prefer canonical days/shots/makes/goal % from 072 payload JSON;
 *   enrich Hub payload with shooting %, video submissions, and Zoom attendance status.
 * - v3.1 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, numbered sections, hoisted debugStep, outer run
 *   wrapper. Business logic unchanged from v3.0.
 * - v3.0 (2026-08-17): Communications Hub queue handoff (not Make webhook).
 *
 * PURPOSE
 * - Validate one Weekly Athlete Summary that is ready for parent email handoff.
 * - Create exactly one Ready Email Handoff Queue row for Communications Hub.
 * - Hand off template data to Automation 079 / Communications Hub / Resend.
 *
 * IMPORTANT DESIGN RULES
 * - Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
 * - This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
 * - Only Automation 079 may send Email Handoff Queue rows to the Hub.
 * - One WAS maps to WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{WAS Record ID}.
 * - Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
 * - Do not write Weekly Email Sent? or Weekly Email Sent At (Hub/downstream writeback).
 * - Clear Send to Make? on successful handoff; clear Weekly Email Error.
 * - testMode defaults true for controlled Hub sends.
 *
 * THIS IS NOT
 * - Weekly email package builder (072).
 * - Schedule build/send arms (118 / 119).
 * - Queue dispatcher to Hub (079).
 * - Make/Gmail sender (retired path).
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Weekly Email Ready? checked
 * - Weekly Email Sent? unchecked
 * - Send to Make? checked
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Weekly Athlete Summary record ID
 *
 * OPTIONAL INPUT VARIABLES
 * - testMode = optional; default true for controlled Hub sends
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_handoff | existing_handoff | needs_review | error
 * - queueRecordId / handoffKey / errorOut / debugStep
 *
 * PRIMARY TABLES USED
 * - Weekly Athlete Summary, Enrollments, Weeks, Program Instance - Sync,
 *   Email Handoff Queue
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Email Handoff Queue → Handoff Key, Status, payload/recipients, Test Mode?
 * - Weekly Athlete Summary → Weekly Email Error (clear), Send to Make? (clear)
 *
 * HANDOFF KEY
 * - WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{WAS Record ID}
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff",
  version: "v3.4",
  versionDate: "2026-09-01",
  originalWrittenDate: "2026-05-29",
  lastUpdated: "2026-09-01",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    was: "Weekly Athlete Summary",
    enr: "Enrollments",
    week: "Weeks",
    pi: "Program Instance - Sync",
    queue: "Email Handoff Queue",
  },
  statuses: {
    draft: "Draft",
    ready: "Ready",
    needsReview: "Needs Review",
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    createdHandoff: "created_handoff",
    existingHandoff: "existing_handoff",
    needsReview: "needs_review",
    error: "error",
  },
  fields: {
    was: {
      enrollment: "Enrollment",
      week: "Week",
      ready: "Weekly Email Ready?",
      sent: "Weekly Email Sent?",
      sendToMake: "Send to Make?",
      error: "Weekly Email Error",
      weekLabel: "Weekly Email Week Label",
      weekDisplay: "Week - Display",
      days: "Days Logged This Week",
      shots: "Total Shots This Week",
      goal: "Weekly Goal Shots Target",
      weeklyXp: "XP Earned This Week",
      homeworkAssigned: "Homework Assigned Count",
      homeworkSat: "Homework Satisfactory Count",
      payload: "Weekly Email Payload JSON",
    },
    enr: {
      active: "Active?",
      program: "Program Instance",
      parentClean: "Parent Email - Cleaned",
      parentFirst: "Parent First Name",
      athlete: "Full Athlete Name",
      level: "Current Level",
      nextLevel: "Next Level",
      streak: "Current Shooting Streak",
      streakStatus: "Current Shooting Streak Status",
    },
    week: {
      name: "Week Name",
    },
    pi: {
      name: "Name - Program Instance",
    },
    queue: {
      key: "Handoff Key",
      status: "Status",
      sourceTable: "Source Table",
      eventType: "Event Type",
      payload: "Payload JSON",
      attempts: "Attempt Count",
      pi: "Program Instance Record ID",
      source: "Source Record ID",
      enrollment: "Enrollment Record ID",
      recipients: "Recipients JSON",
      template: "Template Key",
      testMode: "Test Mode?",
    },
  },
  values: {
    eventType: "WEEKLY_ATHLETE_SUMMARY",
    templateKey: "WEEKLY_ATHLETE_SUMMARY",
    sourceTableToken: "WEEKLY_ATHLETE_SUMMARY",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore unmapped output keys.
  }
}

function step(name) {
  debugStep = name;
  setOutputSafe("debugStep", debugStep);
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function getRaw(rec, table, name) {
  return rec && fieldExists(table, name) ? rec.getCellValue(name) : null;
}

function getText(rec, table, name) {
  return rec && fieldExists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function linkedIds(rec, table, name) {
  const value = getRaw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return getRaw(rec, table, name) === true;
}

function getNumber(rec, table, name) {
  const value = getRaw(rec, table, name);
  const n = typeof value === "number" ? value : Number(getText(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function oneLinkedId(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function firstNonEmpty(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function goalCompletionPercentFromRatio(ratio) {
  const raw = Number(ratio);
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

function goalCompletionRatioFromShotsAndGoal(shots, goal, ratioFromWas) {
  const weeklyShots = Number(shots || 0);
  const weeklyGoal = Number(goal || 0);
  if (weeklyGoal > 0) return weeklyShots / weeklyGoal;
  const raw = Number(ratioFromWas);
  if (!Number.isFinite(raw)) return null;
  return raw;
}

function goalCompletionPercentFromShotsAndGoal(shots, goal, ratioFromWas) {
  const ratio = goalCompletionRatioFromShotsAndGoal(shots, goal, ratioFromWas);
  return ratio == null ? null : goalCompletionPercentFromRatio(ratio);
}

function formatGoalCompletionDisplayForEmail(ratio) {
  const raw = Number(ratio);
  if (!Number.isFinite(raw)) return "—";
  if (raw + 1e-9 >= 1.5) return "150%+";
  if (raw + 1e-9 >= 1.25) return "125%";
  if (raw + 1e-9 >= 1.0) return "100%";
  return `${Math.round(raw * 100)}%`;
}

function nullableFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(getText(rec, table, name));
  return validEmail(email) ? email : "";
}

function safeJsonParse(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function selectValue(table, name, value) {
  const field = table.getField(name);
  if (field.type !== "singleSelect") return value;
  const choice = (field.options?.choices || []).find(
    (item) => String(item.name || "").toLowerCase() === String(value || "").toLowerCase()
  );
  if (!choice) throw new Error(`Missing option ${value} on ${table.name}.${name}`);
  return { name: choice.name };
}

function queueFields(queueTable, values) {
  return Object.fromEntries(Object.entries(values).filter(([name]) => fieldExists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function samePayload(left, right) {
  try {
    return stableJson(JSON.parse(left || "{}")) === stableJson(right);
  } catch {
    return false;
  }
}

async function markQueueNeedsReview(queueTable, rows) {
  for (const row of rows) {
    if (fieldExists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate recordId");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("recordId must be a valid Airtable record ID.");
  }
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);

  step("2 - Load tables");
  const wasTable = base.getTable(CONFIG.tables.was);
  const enrollmentsTable = base.getTable(CONFIG.tables.enr);
  const weeksTable = base.getTable(CONFIG.tables.week);
  const queueTable = base.getTable(CONFIG.tables.queue);

  step("01 - Load Weekly Athlete Summary");
  const was = await wasTable.selectRecordAsync(recordId);
  if (!was) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${recordId}`;

  step("02 - Validate readiness gates");
  if (!checked(was, wasTable, CONFIG.fields.was.ready)) {
    throw new Error("Weekly Email Ready? is not checked. Handoff blocked.");
  }
  if (checked(was, wasTable, CONFIG.fields.was.sent)) {
    throw new Error("Weekly Email Sent? is already checked. Duplicate handoff blocked.");
  }
  if (!checked(was, wasTable, CONFIG.fields.was.sendToMake)) {
    throw new Error("Send to Make? is not checked. Handoff blocked.");
  }

  step("03 - Load Enrollment and Week");
  const enrollmentId = oneLinkedId(linkedIds(was, wasTable, CONFIG.fields.was.enrollment), "WAS Enrollment");
  const weekId = oneLinkedId(linkedIds(was, wasTable, CONFIG.fields.was.week), "WAS Week");
  const [enrollment, week] = await Promise.all([
    enrollmentsTable.selectRecordAsync(enrollmentId),
    weeksTable.selectRecordAsync(weekId),
  ]);
  if (!enrollment || !week) throw new Error("WAS source Enrollment/Week not found.");
  if (fieldExists(enrollmentsTable, CONFIG.fields.enr.active) && !checked(enrollment, enrollmentsTable, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is inactive. Handoff blocked.");
  }
  const programId = oneLinkedId(linkedIds(enrollment, enrollmentsTable, CONFIG.fields.enr.program), "Enrollment Program Instance");

  step("04 - Resolve recipients and Hub payload");
  const parent = recipientEmail(enrollment, enrollmentsTable, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");

  const athleteName = firstNonEmpty(getText(enrollment, enrollmentsTable, CONFIG.fields.enr.athlete), "Athlete");
  const weekLabel = firstNonEmpty(
    getText(was, wasTable, CONFIG.fields.was.weekLabel),
    getText(was, wasTable, CONFIG.fields.was.weekDisplay),
    getText(week, weeksTable, CONFIG.fields.week.name)
  );
  if (!weekLabel) throw new Error("Week label/name is blank. Handoff blocked.");

  const prepared = safeJsonParse(getText(was, wasTable, CONFIG.fields.was.payload));
  const rollupDaysLogged = getNumber(was, wasTable, CONFIG.fields.was.days);
  const rollupShots = getNumber(was, wasTable, CONFIG.fields.was.shots);
  const weeklyGoal = getNumber(was, wasTable, CONFIG.fields.was.goal);
  const weeklyXp = getNumber(was, wasTable, CONFIG.fields.was.weeklyXp);
  const daysLogged = firstFiniteNumber(
    prepared?.canonicalDaysLogged,
    prepared?.perfectWeekCriteria?.daysLogged,
    prepared?.perfectWeekDaysLogged,
    prepared?.days,
    rollupDaysLogged
  );
  const shootingDaysLogged = firstFiniteNumber(
    prepared?.canonicalShootingDaysLogged,
    prepared?.shootingDaysLogged,
    rollupDaysLogged
  );
  const daysLoggedDisplay = firstNonEmpty(
    prepared?.daysLoggedDisplay,
    prepared?.perfectWeekCriteria?.daysLoggedDisplay,
    prepared?.perfectWeekDaysDisplay
  );
  const shootingDaysDisplay = firstNonEmpty(
    prepared?.shootingDaysDisplay,
    prepared?.perfectWeekCriteria?.shootingDaysDisplay
  );
  const shots = firstFiniteNumber(prepared?.canonicalShots, prepared?.shots, rollupShots);
  const makes = firstFiniteNumber(prepared?.canonicalMakes, prepared?.makes);
  const goalCompletionRatio =
    nullableFiniteNumber(prepared?.goalCompletionRatio) ??
    goalCompletionRatioFromShotsAndGoal(shots, weeklyGoal, prepared?.goalCompletionRatio);
  const goalCompletionDisplay = firstNonEmpty(
    prepared?.goalCompletionDisplay,
    formatGoalCompletionDisplayForEmail(goalCompletionRatio)
  );
  const goalCompletionPercent =
    goalCompletionRatio != null
      ? goalCompletionPercentFromRatio(goalCompletionRatio)
      : firstFiniteNumber(
          prepared?.canonicalGoalCompletionPercent,
          prepared?.goalCompletionPercent,
          goalCompletionPercentFromShotsAndGoal(shots, weeklyGoal, prepared?.goalCompletionRatio)
        );
  const shootingPercentage = firstFiniteNumber(
    prepared?.shootingPercentage,
    makes > 0 && shots > 0 ? Math.round((makes / shots) * 100) : 0
  );
  const homeworkAssigned = getNumber(was, wasTable, CONFIG.fields.was.homeworkAssigned);
  const homeworkSat = getNumber(was, wasTable, CONFIG.fields.was.homeworkSat);
  const currentLevel = getText(enrollment, enrollmentsTable, CONFIG.fields.enr.level);
  const nextLevel = getText(enrollment, enrollmentsTable, CONFIG.fields.enr.nextLevel);
  const streak = getNumber(enrollment, enrollmentsTable, CONFIG.fields.enr.streak);
  const streakStatus = getText(enrollment, enrollmentsTable, CONFIG.fields.enr.streakStatus);

  const homeworkLines = [];
  if (fieldExists(wasTable, CONFIG.fields.was.homeworkAssigned) || fieldExists(wasTable, CONFIG.fields.was.homeworkSat)) {
    homeworkLines.push(`Assigned: ${homeworkAssigned}; Satisfactory: ${homeworkSat}`);
  }

  let programName = "";
  try {
    const piTable = base.getTable(CONFIG.tables.pi);
    const pi = await piTable.selectRecordAsync(programId);
    if (pi) programName = firstNonEmpty(getText(pi, piTable, CONFIG.fields.pi.name), pi.name);
  } catch {
    // Program Instance - Sync is optional for payload enrichment.
  }

  const packageKind = firstNonEmpty(
    prepared?.packageKind,
    daysLogged === 0 && shots === 0 ? "short_no_activity" : "normal"
  );

  const weekDateRange =
    prepared?.weekStartKey && prepared?.weekEndKey
      ? `${prepared.weekStartKey} to ${prepared.weekEndKey}`
      : "";
  const videoSubmissions = Array.isArray(prepared?.videoSubmissions) ? prepared.videoSubmissions : [];
  const videosSubmittedThisWeek = Array.isArray(prepared?.videosSubmittedThisWeek)
    ? prepared.videosSubmittedThisWeek
    : [];
  const weeklyVideoCount = firstFiniteNumber(
    prepared?.videoSubmissionCount,
    videosSubmittedThisWeek.length,
    videoSubmissions.length
  );
  const weeklyVideoTarget = nullableFiniteNumber(
    prepared?.perfectWeekCriteria?.videoRequired ?? prepared?.perfectWeekCriteria?.requiredVideoCount
  );
  const zoomAttendanceStatus = firstNonEmpty(
    prepared?.zoomAttendanceStatus,
    prepared?.perfectWeekCriteria?.zoomRequirementStatus,
    prepared?.zoomSummary
  );
  const perfectWeekCriteria = prepared?.perfectWeekCriteria || null;
  const videoFeedbackStatus =
    videoSubmissions.length > 0
      ? videoSubmissions
          .map((row) => {
            const label = row.label || row.originalFileName || "Video";
            const date = row.reviewedAt ? ` (${row.reviewedAt})` : "";
            const url = row.secureUrl ? ` — ${row.secureUrl}` : "";
            return `${label}${date}${url}`;
          })
          .join("; ")
      : "No video submissions recorded for this week.";

  const recipients = [{ email: parent, role: "guardian" }];
  const payload = {
    athleteName,
    parentFirstName: getText(enrollment, enrollmentsTable, CONFIG.fields.enr.parentFirst),
    weekLabel,
    weekName: weekLabel,
    weekDateRange,
    shootingDaysLogged,
    shootingDaysDisplay,
    perfectWeekDaysLogged: daysLogged,
    perfectWeekDaysDisplay: daysLoggedDisplay,
    daysLogged,
    days: daysLogged,
    daysLoggedDisplay,
    shots,
    makes,
    weeklyGoal,
    goal: weeklyGoal,
    goalCompletionRatio,
    goalCompletionPercent,
    goalCompletionDisplay,
    shootingPercentage,
    weeklyXp,
    currentLevel,
    level: currentLevel,
    streak,
    streakStatus,
    homeworkLines,
    packageKind,
    videoSubmissions,
    videosSubmittedThisWeek,
    weeklyVideoCount,
    videoFeedbackStatus,
    zoomAttendanceStatus,
    perfectWeekCriteria,
  };
  if (weeklyVideoTarget != null) payload.weeklyVideoTarget = weeklyVideoTarget;
  if (nextLevel) payload.nextLevel = nextLevel;
  if (programName) payload.programName = programName;

  const queueData = queueFields(queueTable, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.was,
    [CONFIG.fields.queue.eventType]: selectValue(queueTable, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  step("05 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueTable.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueTable, existing);
    setOutputSafe("statusOut", CONFIG.statuses.error);
    setOutputSafe("actionOut", CONFIG.actions.needsReview);
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(getText(existing[0], queueTable, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueTable, existing);
      setOutputSafe("statusOut", CONFIG.statuses.error);
      setOutputSafe("actionOut", CONFIG.actions.needsReview);
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    const reuseUpdates = {};
    if (fieldExists(wasTable, CONFIG.fields.was.error)) reuseUpdates[CONFIG.fields.was.error] = "";
    if (fieldExists(wasTable, CONFIG.fields.was.sendToMake)) reuseUpdates[CONFIG.fields.was.sendToMake] = false;
    if (Object.keys(reuseUpdates).length) await wasTable.updateRecordAsync(recordId, reuseUpdates);
    setOutputSafe("statusOut", CONFIG.statuses.success);
    setOutputSafe("actionOut", CONFIG.actions.existingHandoff);
    setOutputSafe("queueRecordId", existing[0].id);
    setOutputSafe("handoffKey", handoffKey);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: CONFIG.statuses.success,
        actionOut: CONFIG.actions.existingHandoff,
        queueRecordId: existing[0].id,
        handoffKey,
      })
    );
    return;
  }

  const recheck = (
    await queueTable.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueTable, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    setOutputSafe("statusOut", CONFIG.statuses.success);
    setOutputSafe("actionOut", CONFIG.actions.existingHandoff);
    setOutputSafe("queueRecordId", recheck[0].id);
    setOutputSafe("handoffKey", handoffKey);
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", debugStep);
    return;
  }

  const created = await queueTable.createRecordAsync(queueData);
  const afterCreate = (
    await queueTable.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => fieldExists(queueTable, name)),
    })
  ).records.filter((row) => getText(row, queueTable, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueTable, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueTable.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });

  const wasUpdates = {};
  if (fieldExists(wasTable, CONFIG.fields.was.error)) wasUpdates[CONFIG.fields.was.error] = "";
  if (fieldExists(wasTable, CONFIG.fields.was.sendToMake)) wasUpdates[CONFIG.fields.was.sendToMake] = false;
  if (Object.keys(wasUpdates).length) await wasTable.updateRecordAsync(recordId, wasUpdates);

  step("06 - Complete");
  setOutputSafe("statusOut", CONFIG.statuses.success);
  setOutputSafe("actionOut", CONFIG.actions.createdHandoff);
  setOutputSafe("queueRecordId", created);
  setOutputSafe("handoffKey", handoffKey);
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", debugStep);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.success,
      actionOut: CONFIG.actions.createdHandoff,
      queueRecordId: created,
      handoffKey,
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
  setOutputSafe("statusOut", CONFIG.statuses.error);
  setOutputSafe("actionOut", CONFIG.actions.error);
  setOutputSafe("errorOut", `FAILED AT: ${debugStep} | ${message}`);
  setOutputSafe("debugStep", debugStep);
  try {
    const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
    const recordId = String(cfg.recordId || "").trim();
    if (/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      const wasTable = base.getTable(CONFIG.tables.was);
      if (fieldExists(wasTable, CONFIG.fields.was.error)) {
        await wasTable.updateRecordAsync(recordId, {
          [CONFIG.fields.was.error]: message,
        });
      }
    }
  } catch {
    // Best-effort error writeback.
  }
  throw error;
}
