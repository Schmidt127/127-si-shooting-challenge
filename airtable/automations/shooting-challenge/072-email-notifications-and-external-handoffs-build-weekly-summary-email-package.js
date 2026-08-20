/*
Automation: 072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-09
Last GitHub Update: 2026-08-20 (v4.2 V2 standard structure)

Purpose:
Build the Weekly Athlete Summary email package (subject/HTML/text/payload)
when Build Weekly Email Now? is checked. Does not send email.

Trigger:
Weekly Athlete Summary when Build Weekly Email Now? is checked;
pass the dynamic recordId.

Important Tables:
Weekly Athlete Summary, Enrollments, Weeks, Submissions, Homework Completions,
XP Events, Program Homework Assignments, Homework Library

Important Fields:
Build Weekly Email Now?, Weekly Email Ready?, Send to Make?, Weekly Email Sent?,
XP Earned This Week, Total Shots This Week, Homework Completions Link, XP Events

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Send plane: 118 → 072 → 119 → 074 → 079 → Communications Hub → Resend.
072 owns emptyWeekPolicy; 074 owns Hub handoff; 072 never fetches/webhooks.
*/

/************************************************************
 * 072 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Build Weekly Summary Email Package
 *
 * Version: v4.2
 * Date Written: 2026-06-20
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v4.2 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, SCRIPT metadata, readable CONFIG, numbered sections,
 *   debugStep, outer run wrapper. Business logic unchanged from v4.1.
 * - v4.1 (2026-08-08): Issue #104 repair — active XP only; shots/XP disagreement
 *   fail closed; PHA-first homework schedule with legacy Curriculum fallback;
 *   SC-035 empty-week policy; preserves 074 send ownership.
 *
 * PURPOSE
 * - Runs from one Weekly Athlete Summary when Build Weekly Email Now? is checked.
 * - Builds branded weekly summary (or short empty-week reminder) package fields.
 * - Clears Build Weekly Email Now?, sets Weekly Email Ready?, leaves Send to Make? false.
 *
 * IMPORTANT DESIGN RULES
 * - Current schema fields only for authoritative reporting inputs.
 * - Active XP Events only; every reported XP Event must match Enrollment + Week.
 * - Weekly XP / shots disagreement fails closed.
 * - Homework schedule is Program Homework Assignments first; legacy Homework Library
 *   fallback only when no active PHA schedule exists for PI + Week + Grade Band.
 * - Homework Completions validated against Enrollment + Week and, when PHA is current,
 *   against the current PHA schedule.
 * - Missing source XP is shown as pending/not awarded; configured XP amounts are never
 *   presented as earned.
 * - This automation BUILDS only — it does not send (074 / 079 own send).
 * - Preserves SC-035 empty-week policy (send_short | send_normal | suppress).
 *
 * THIS IS NOT
 * - Weekly email send / Hub handoff (074 / 079).
 * - Schedule build arm (118) or schedule send arm (119).
 * - Homework / video parent feedback Hub handoff (071 / 073).
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package
 *
 * TRIGGER TABLE
 * - Weekly Athlete Summary
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Build Weekly Email Now? is checked
 * - Input variable recordId = triggering Weekly Athlete Summary record ID
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Weekly Athlete Summary record ID
 *
 * OPTIONAL INPUT VARIABLES
 * - emptyWeekPolicy = send_short (default) | send_normal | suppress
 * - sendModeInput / sendMode = test | live (default test)
 * - allowSchmidtInput = true to allow Schmidt test enrollment
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = built_normal | built_short_empty_week | skipped_inactive |
 *   skipped_schmidt | skipped_already_sent | suppressed_empty_week | error
 * - errorOut / debugStep / recordId / enrollmentId / weekId /
 *   assignmentSource / activeXpCount / weekXp / sendMode
 *
 * PRIMARY TABLES USED
 * - Weekly Athlete Summary, Enrollments, Weeks, Submissions, Homework Completions,
 *   XP Events, Program Homework Assignments, Homework Library
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Weekly Athlete Summary → Weekly Email Subject/HTML/Text/Payload/Recipients,
 *   Ready?, Build?, Send?, Error, Revision, Week Label, Last Built At
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package",
  version: "v4.2",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-06-20",
  lastUpdated: "2026-08-20",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  timeZone: "America/Denver",
  schmidtEnrollmentId: "recCyFEPeATOVNlr9",
  tables: {
    weeklySummary: "Weekly Athlete Summary",
    enrollments: "Enrollments",
    weeks: "Weeks",
    submissions: "Submissions",
    homeworkCompletions: "Homework Completions",
    xpEvents: "XP Events",
    pha: "Program Homework Assignments",
    homeworkLibrary: "Homework Library",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
    submissions: "Submissions",
    homeworkCompletions: "Homework Completions Link",
    xpEvents: "XP Events",
    weeklyXp: "XP Earned This Week",
    daysLogged: "Days Logged This Week",
    shots: "Total Shots This Week",
    goal: "Weekly Goal Shots Target",
    goalPct: "Goal Completion %",
    weekDisplay: "Week - Display",
    homeworkAssigned: "Homework Assigned Count",
    homeworkSat: "Homework Satisfactory Count",
    buildNow: "Build Weekly Email Now?",
    sendMode: "sendMode",
    ready: "Weekly Email Ready?",
    sent: "Weekly Email Sent?",
    sentAt: "Weekly Email Sent At",
    error: "Weekly Email Error",
    revision: "Weekly Email Revision",
    send: "Send to Make?",
    subject: "Weekly Email Subject",
    recipients: "Weekly Email Recipients",
    html: "Weekly Email HTML",
    text: "Weekly Email Text",
    payload: "Weekly Email Payload JSON",
    weekLabel: "Weekly Email Week Label",
    builtAt: "Weekly Email Last Built At",
  },
  enrollments: {
    active: "Active?",
    programInstance: "Program Instance",
    gradeBand: "Grade Band",
    parentClean: "Parent Email - Cleaned",
    parentRaw: "Parent Email",
    athleteClean: "Athlete Email - Cleaned",
    athleteRaw: "Athlete Email",
    name: "Full Athlete Name",
    firstName: "Athlete First Name",
    level: "Current Level",
    streak: "Current Shooting Streak",
    streakStatus: "Current Shooting Streak Status",
  },
  weeks: {
    name: "Week Name",
    start: "Start Date",
    end: "End Date",
  },
  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    countThis: "Count This Submission?",
    shots: "Total Shots Counted",
    activityDate: "Activity Date",
  },
  homeworkCompletions: {
    enrollment: "Enrollment",
    week: "Week",
    homework: "Homework",
    slot: "Item Slot",
    pha: "Program Homework Assignment",
    satisfactory: "Satisfactory?",
    status: "Completion Status",
    coach: "Coach Feedback",
    xpEvents: "XP Events",
    xpTotal: "Total Homework XP Awarded",
    award: "Award Status",
  },
  xpEvents: {
    active: "Active?",
    points: "XP Points",
    enrollment: "Enrollment",
    week: "Week",
    submission: "Submission",
    homeworkCompletion: "Homework Completion",
    videoFeedback: "Video Feedback",
    unlock: "Achievement Unlock",
    source: "XP Source",
    bucket: "XP Bucket",
    reason: "XP Reason Public",
    sourceKey: "Source Key",
  },
  pha: {
    homework: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band",
    slot: "Homework Slot",
    active: "Active?",
  },
  homeworkLibrary: {
    title: "Assignment Title",
    full: "Assignment Full Name",
    week: "Week",
    gradeBand: "Grade Band",
    active: "Active?",
    published: "Published?",
    order: "Order",
  },
  statuses: {
    success: "success",
    skipped: "skipped",
    error: "error",
  },
  actions: {
    builtNormal: "built_normal",
    builtShortEmptyWeek: "built_short_empty_week",
    skippedInactive: "skipped_inactive",
    skippedSchmidt: "skipped_schmidt",
    skippedAlreadySent: "skipped_already_sent",
    suppressedEmptyWeek: "suppressed_empty_week",
    error: "error",
  },
};

/* =========================================================
   SECTION 3: OUTPUT AND FIELD HELPERS
========================================================= */

let debugStep = "0 - Start";
let weeklySummaryTable;

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

function getRaw(record, table, name) {
  return record && fieldExists(table, name) ? record.getCellValue(name) : null;
}

function getText(record, table, name) {
  return record && fieldExists(table, name) ? String(record.getCellValueAsString(name) || "").trim() : "";
}

function linkedIds(record, table, name) {
  const value = getRaw(record, table, name);
  return Array.isArray(value) ? value.map((x) => x?.id).filter(Boolean) : [];
}

function getNumber(record, table, name, fallback = 0) {
  const value = getRaw(record, table, name);
  const parsed =
    typeof value === "number"
      ? value
      : Number(
          String(value ?? "")
            .replace(/[$,%]/g, "")
            .replace(/,/g, "")
            .trim()
        );
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(record, table, name) {
  const value = getRaw(record, table, name);
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : Number(
          String(value)
            .replace(/[$,%]/g, "")
            .replace(/,/g, "")
            .trim()
        );
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanish(record, table, name) {
  const value = getRaw(record, table, name);
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return ["1", "true", "yes", "checked", "y", "count", "counted"].includes(
    getText(record, table, name).toLowerCase()
  );
}

function oneLinkedId(ids, label) {
  if (ids.length !== 1) throw new Error(`${label} must have exactly one link; found ${ids.length}.`);
  return ids[0];
}

function sameIds(a, b) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function firstNonEmpty(...values) {
  return values.map((x) => String(x ?? "").trim()).find(Boolean) || "";
}

function emailsJoined(value) {
  return [...new Set(String(value || "").split(/[,;\n]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))].join(",");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0";
}

function normalizeSlot(value) {
  const s = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (["HW1", "HOMEWORK1"].includes(s)) return "HW1";
  if (["HW2", "HOMEWORK2"].includes(s)) return "HW2";
  return s;
}

async function loadQuery(table, names) {
  return await table.selectRecordsAsync({ fields: names.filter((n) => fieldExists(table, n)) });
}

function normalizeMode(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  if (["live", "l", "real", "send", "parent"].includes(s)) return "live";
  if (["test", "t", "preview", "practice", "draft"].includes(s)) return "test";
  return "";
}

function normalizeEmptyWeekPolicy(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return ["send_short", "send_normal", "suppress"].includes(s) ? s : "send_short";
}

function listHtml(items) {
  return items.length ? `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "<p>None</p>";
}

function fullHtml(data) {
  return `<!doctype html><html><body style="margin:0;background:#F2F2F2;font-family:Arial,sans-serif;color:#262626"><div style="max-width:700px;margin:auto;background:#fff"><div style="background:#0034B7;color:#fff;padding:22px;border-bottom:6px solid #FF8B00"><h2 style="margin:0">Weekly Shooting Challenge Summary</h2><p style="margin:6px 0 0">${escapeHtml(data.weekLabel)}</p></div><div style="padding:22px"><p>Hi ${escapeHtml(data.firstName || data.athleteName)}, here is your weekly progress.</p><h3>Shooting</h3><p>Days Logged: <strong>${formatNumber(data.days)}</strong><br>Shots: <strong>${formatNumber(data.shots)}</strong><br>Weekly Goal: <strong>${data.goal ? formatNumber(data.goal) : "—"}</strong><br>Goal Completion: <strong>${data.goal ? Math.round((data.shots / data.goal) * 100) + "%" : "—"}</strong></p><h3>Homework Assigned</h3>${listHtml(data.assignments)}<h3>Homework Progress</h3>${listHtml(data.homework)}<h3>XP Earned</h3><p><strong>${formatNumber(data.weekXp)} XP</strong></p>${listHtml(data.xpLines)}<h3>Progression</h3><p>Current Level: <strong>${escapeHtml(data.level || "Not yet assigned")}</strong><br>Current Streak: <strong>${formatNumber(data.streak)} days</strong>${data.streakStatus ? `<br>Streak Status: <strong>${escapeHtml(data.streakStatus)}</strong>` : ""}</p></div></div></body></html>`;
}

function shortHtml(data) {
  return `<!doctype html><html><body style="margin:0;background:#F2F2F2;font-family:Arial,sans-serif;color:#262626"><div style="max-width:650px;margin:auto;background:#fff"><div style="background:#0034B7;color:#fff;padding:22px;border-bottom:6px solid #FF8B00"><h2 style="margin:0">Shooting Challenge Weekly Reminder</h2></div><div style="padding:22px"><p>Hi ${escapeHtml(data.firstName || data.athleteName)}, no countable shooting activity was recorded for ${escapeHtml(data.weekLabel)}.</p><p>Start a new week by getting one session logged and keep building consistency.</p></div></div></body></html>`;
}

function plainText(data, short) {
  if (short) {
    return `Shooting Challenge Weekly Reminder\n${data.weekLabel}\n\nNo countable shooting activity was recorded this week.`;
  }
  return `Weekly Shooting Challenge Summary\n${data.weekLabel}\nAthlete: ${data.athleteName}\nDays Logged: ${data.days}\nShots: ${data.shots}\nWeekly Goal: ${data.goal}\nWeekly XP: ${data.weekXp}\nHomework: ${data.homework.join(" | ")}\nXP: ${data.xpLines.join(" | ")}`;
}

async function skipBuild(recordId, action, message) {
  if (fieldExists(weeklySummaryTable, CONFIG.was.buildNow)) {
    await weeklySummaryTable.updateRecordAsync(recordId, { [CONFIG.was.buildNow]: false });
  }
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", action);
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", debugStep);
}

async function suppressEmptyWeek(recordId, message) {
  const updates = {};
  if (fieldExists(weeklySummaryTable, CONFIG.was.buildNow)) updates[CONFIG.was.buildNow] = false;
  if (fieldExists(weeklySummaryTable, CONFIG.was.ready)) updates[CONFIG.was.ready] = false;
  if (fieldExists(weeklySummaryTable, CONFIG.was.send)) updates[CONFIG.was.send] = false;
  if (fieldExists(weeklySummaryTable, CONFIG.was.error)) updates[CONFIG.was.error] = message;
  await weeklySummaryTable.updateRecordAsync(recordId, updates);
  setOutputSafe("statusOut", CONFIG.statuses.skipped);
  setOutputSafe("actionOut", CONFIG.actions.suppressedEmptyWeek);
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", debugStep);
}

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("1 - Validate inputs");
  const cfg = typeof input !== "undefined" && input?.config ? input.config() : {};
  const recordId = String(cfg.recordId || "").trim();
  const allowSchmidt = String(cfg.allowSchmidtInput || "").trim().toLowerCase() === "true";
  const emptyWeekPolicy = normalizeEmptyWeekPolicy(cfg.emptyWeekPolicy);
  const inputMode = normalizeMode(cfg.sendModeInput || cfg.sendMode);
  if (!recordId) throw new Error("Missing required input: recordId");

  step("2 - Load tables and summary");
  weeklySummaryTable = base.getTable(CONFIG.tables.weeklySummary);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const homeworkCompletionsTable = base.getTable(CONFIG.tables.homeworkCompletions);
  const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
  const phaTable = base.getTable(CONFIG.tables.pha);
  const homeworkLibraryTable = base.getTable(CONFIG.tables.homeworkLibrary);

  const summary = await weeklySummaryTable.selectRecordAsync(recordId);
  if (!summary) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);

  const enrollmentId = oneLinkedId(linkedIds(summary, weeklySummaryTable, CONFIG.was.enrollment), "WAS Enrollment");
  const weekId = oneLinkedId(linkedIds(summary, weeklySummaryTable, CONFIG.was.week), "WAS Week");
  const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId);
  const week = await weeksTable.selectRecordAsync(weekId);
  if (!enrollment || !week) throw new Error("WAS source Enrollment/Week not found.");

  step("3 - Gate inactive / Schmidt / already sent");
  if (fieldExists(enrollmentsTable, CONFIG.enrollments.active) && !booleanish(enrollment, enrollmentsTable, CONFIG.enrollments.active)) {
    await skipBuild(recordId, CONFIG.actions.skippedInactive, "Enrollment inactive.");
    return;
  }
  if (enrollmentId === CONFIG.schmidtEnrollmentId && !allowSchmidt) {
    await skipBuild(recordId, CONFIG.actions.skippedSchmidt, "Schmidt test enrollment excluded unless allowSchmidtInput=true.");
    return;
  }
  if (fieldExists(weeklySummaryTable, CONFIG.was.sent) && booleanish(summary, weeklySummaryTable, CONFIG.was.sent)) {
    await skipBuild(recordId, CONFIG.actions.skippedAlreadySent, "Weekly Email Sent? already checked.");
    return;
  }

  const programId = oneLinkedId(
    linkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance),
    "Enrollment Program Instance"
  );
  const gradeId = oneLinkedId(
    linkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.gradeBand),
    "Enrollment Grade Band"
  );

  step("4 - Canonical countable submissions / shots");
  const submissionQuery = await loadQuery(submissionsTable, [
    CONFIG.submissions.enrollment,
    CONFIG.submissions.week,
    CONFIG.submissions.countThis,
    CONFIG.submissions.shots,
    CONFIG.submissions.activityDate,
  ]);
  const linkedSubmissionIds = linkedIds(summary, weeklySummaryTable, CONFIG.was.submissions);
  const countableSubs = [];
  for (const sid of linkedSubmissionIds) {
    const submission = submissionQuery.getRecord(sid);
    if (!submission) throw new Error(`WAS linked Submission not found: ${sid}`);
    if (
      !sameIds(linkedIds(submission, submissionsTable, CONFIG.submissions.enrollment), [enrollmentId]) ||
      !sameIds(linkedIds(submission, submissionsTable, CONFIG.submissions.week), [weekId])
    ) {
      throw new Error(`WAS Submission ${sid} owned by another Enrollment/Week.`);
    }
    if (booleanish(submission, submissionsTable, CONFIG.submissions.countThis)) countableSubs.push(submission);
  }
  const days = new Set(
    countableSubs.map((s) => formatDate(getRaw(s, submissionsTable, CONFIG.submissions.activityDate))).filter(Boolean)
  ).size;
  const scannedShots = countableSubs.reduce(
    (sum, s) => sum + getNumber(s, submissionsTable, CONFIG.submissions.shots),
    0
  );
  const summaryShots = nullableNumber(summary, weeklySummaryTable, CONFIG.was.shots);
  if (summaryShots !== null && Math.abs(summaryShots - scannedShots) > 0.001) {
    throw new Error(`Weekly shots disagreement: summary=${summaryShots}, canonical submissions=${scannedShots}.`);
  }
  const shots = scannedShots;

  step("5 - Active XP Events only");
  const xpQuery = await loadQuery(xpEventsTable, [
    CONFIG.xpEvents.active,
    CONFIG.xpEvents.points,
    CONFIG.xpEvents.enrollment,
    CONFIG.xpEvents.week,
    CONFIG.xpEvents.submission,
    CONFIG.xpEvents.homeworkCompletion,
    CONFIG.xpEvents.videoFeedback,
    CONFIG.xpEvents.unlock,
    CONFIG.xpEvents.source,
    CONFIG.xpEvents.bucket,
    CONFIG.xpEvents.reason,
    CONFIG.xpEvents.sourceKey,
  ]);
  const activeXp = xpQuery.records.filter(
    (x) =>
      booleanish(x, xpEventsTable, CONFIG.xpEvents.active) &&
      sameIds(linkedIds(x, xpEventsTable, CONFIG.xpEvents.enrollment), [enrollmentId]) &&
      sameIds(linkedIds(x, xpEventsTable, CONFIG.xpEvents.week), [weekId])
  );
  for (const xid of linkedIds(summary, weeklySummaryTable, CONFIG.was.xpEvents)) {
    const xpEvent = xpQuery.getRecord(xid);
    if (!xpEvent) throw new Error(`WAS linked XP Event missing: ${xid}`);
    if (
      booleanish(xpEvent, xpEventsTable, CONFIG.xpEvents.active) &&
      (!sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.enrollment), [enrollmentId]) ||
        !sameIds(linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.week), [weekId]))
    ) {
      throw new Error(`WAS active XP Event ${xid} belongs to another Enrollment/Week.`);
    }
  }
  const weekXp = activeXp.reduce((sum, x) => sum + getNumber(x, xpEventsTable, CONFIG.xpEvents.points), 0);
  const summaryXp = nullableNumber(summary, weeklySummaryTable, CONFIG.was.weeklyXp);
  if (summaryXp !== null && Math.abs(summaryXp - weekXp) > 0.001) {
    throw new Error(`Weekly XP disagreement: summary=${summaryXp}, active canonical XP=${weekXp}.`);
  }
  const xpLines = activeXp.length
    ? activeXp.map(
        (x) =>
          `${firstNonEmpty(
            getText(x, xpEventsTable, CONFIG.xpEvents.reason),
            getText(x, xpEventsTable, CONFIG.xpEvents.source),
            getText(x, xpEventsTable, CONFIG.xpEvents.bucket),
            "XP"
          )}: ${formatNumber(getNumber(x, xpEventsTable, CONFIG.xpEvents.points))} XP`
      )
    : ["No active XP Events awarded for this week yet."];

  step("6 - Homework schedule (PHA first)");
  const phaQuery = await loadQuery(phaTable, [
    CONFIG.pha.homework,
    CONFIG.pha.programInstance,
    CONFIG.pha.week,
    CONFIG.pha.gradeBand,
    CONFIG.pha.slot,
    CONFIG.pha.active,
  ]);
  const phaRows = phaQuery.records.filter(
    (x) =>
      booleanish(x, phaTable, CONFIG.pha.active) &&
      sameIds(linkedIds(x, phaTable, CONFIG.pha.programInstance), [programId]) &&
      sameIds(linkedIds(x, phaTable, CONFIG.pha.week), [weekId]) &&
      sameIds(linkedIds(x, phaTable, CONFIG.pha.gradeBand), [gradeId])
  );

  let assignmentSource = "PHA";
  let assignments = [];
  if (phaRows.length) {
    for (const pha of phaRows.sort((a, b) =>
      normalizeSlot(getText(a, phaTable, CONFIG.pha.slot)).localeCompare(
        normalizeSlot(getText(b, phaTable, CONFIG.pha.slot))
      )
    )) {
      if (linkedIds(pha, phaTable, CONFIG.pha.homework).length !== 1) {
        throw new Error(`PHA ${pha.id} must link exactly one Homework Assignment.`);
      }
      assignments.push(
        `${normalizeSlot(getText(pha, phaTable, CONFIG.pha.slot)) || "Homework"}: ${getText(pha, phaTable, CONFIG.pha.homework)}`
      );
    }
  } else {
    assignmentSource = "LEGACY_CURRICULUM_NO_PHA";
    const libraryQuery = await loadQuery(homeworkLibraryTable, [
      CONFIG.homeworkLibrary.title,
      CONFIG.homeworkLibrary.full,
      CONFIG.homeworkLibrary.week,
      CONFIG.homeworkLibrary.gradeBand,
      CONFIG.homeworkLibrary.active,
      CONFIG.homeworkLibrary.published,
      CONFIG.homeworkLibrary.order,
    ]);
    assignments = libraryQuery.records
      .filter(
        (x) =>
          sameIds(linkedIds(x, homeworkLibraryTable, CONFIG.homeworkLibrary.week), [weekId]) &&
          (!fieldExists(homeworkLibraryTable, CONFIG.homeworkLibrary.active) ||
            booleanish(x, homeworkLibraryTable, CONFIG.homeworkLibrary.active)) &&
          (!fieldExists(homeworkLibraryTable, CONFIG.homeworkLibrary.published) ||
            booleanish(x, homeworkLibraryTable, CONFIG.homeworkLibrary.published)) &&
          (linkedIds(x, homeworkLibraryTable, CONFIG.homeworkLibrary.gradeBand).length === 0 ||
            linkedIds(x, homeworkLibraryTable, CONFIG.homeworkLibrary.gradeBand).includes(gradeId))
      )
      .sort(
        (a, b) =>
          getNumber(a, homeworkLibraryTable, CONFIG.homeworkLibrary.order, 9999) -
          getNumber(b, homeworkLibraryTable, CONFIG.homeworkLibrary.order, 9999)
      )
      .slice(0, 2)
      .map(
        (x, i) =>
          `HW${i + 1}: ${firstNonEmpty(
            getText(x, homeworkLibraryTable, CONFIG.homeworkLibrary.title),
            getText(x, homeworkLibraryTable, CONFIG.homeworkLibrary.full),
            x.name
          )}`
      );
  }
  if (!assignments.length) assignments = ["No scheduled homework found."];

  step("7 - Homework completion lines");
  const hcQuery = await loadQuery(homeworkCompletionsTable, [
    CONFIG.homeworkCompletions.enrollment,
    CONFIG.homeworkCompletions.week,
    CONFIG.homeworkCompletions.homework,
    CONFIG.homeworkCompletions.slot,
    CONFIG.homeworkCompletions.pha,
    CONFIG.homeworkCompletions.satisfactory,
    CONFIG.homeworkCompletions.status,
    CONFIG.homeworkCompletions.coach,
    CONFIG.homeworkCompletions.xpEvents,
    CONFIG.homeworkCompletions.xpTotal,
    CONFIG.homeworkCompletions.award,
  ]);
  const homework = [];
  for (const hid of linkedIds(summary, weeklySummaryTable, CONFIG.was.homeworkCompletions)) {
    const hc = hcQuery.getRecord(hid);
    if (!hc) throw new Error(`WAS linked Homework Completion not found: ${hid}`);
    if (
      !sameIds(linkedIds(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.enrollment), [enrollmentId]) ||
      !sameIds(linkedIds(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.week), [weekId])
    ) {
      throw new Error(`Homework Completion ${hid} belongs to another Enrollment/Week.`);
    }
    if (phaRows.length) {
      const phaIds = linkedIds(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.pha);
      if (phaIds.length !== 1 || !phaRows.some((p) => p.id === phaIds[0])) {
        throw new Error(`Homework Completion ${hid} is not linked to the current PHA schedule.`);
      }
    }
    const earned = linkedIds(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.xpEvents)
      .map((id) => xpQuery.getRecord(id))
      .filter(
        (x) =>
          x &&
          booleanish(x, xpEventsTable, CONFIG.xpEvents.active) &&
          sameIds(linkedIds(x, xpEventsTable, CONFIG.xpEvents.enrollment), [enrollmentId]) &&
          sameIds(linkedIds(x, xpEventsTable, CONFIG.xpEvents.week), [weekId])
      )
      .reduce((sum, x) => sum + getNumber(x, xpEventsTable, CONFIG.xpEvents.points), 0);
    homework.push(
      `${firstNonEmpty(
        getText(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.homework),
        normalizeSlot(getText(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.slot)),
        "Homework"
      )}: ${booleanish(hc, homeworkCompletionsTable, CONFIG.homeworkCompletions.satisfactory) ? "Satisfactory" : "Pending review"}; XP ${earned > 0 ? formatNumber(earned) + " awarded" : "pending / not awarded"}`
    );
  }
  if (!homework.length) homework.push("No homework completion has been recorded for this week.");

  step("8 - Build package and writeback");
  const athleteName = firstNonEmpty(getText(enrollment, enrollmentsTable, CONFIG.enrollments.name), "Athlete");
  const firstName = firstNonEmpty(
    getText(enrollment, enrollmentsTable, CONFIG.enrollments.firstName),
    athleteName.split(" ")[0]
  );
  const recipients = emailsJoined(
    [
      firstNonEmpty(
        getText(enrollment, enrollmentsTable, CONFIG.enrollments.parentClean),
        getText(enrollment, enrollmentsTable, CONFIG.enrollments.parentRaw)
      ),
      firstNonEmpty(
        getText(enrollment, enrollmentsTable, CONFIG.enrollments.athleteClean),
        getText(enrollment, enrollmentsTable, CONFIG.enrollments.athleteRaw)
      ),
    ].join(",")
  );
  if (!recipients) throw new Error("No parent/athlete email recipient found.");

  const weekLabel = firstNonEmpty(
    getText(summary, weeklySummaryTable, CONFIG.was.weekDisplay),
    getText(week, weeksTable, CONFIG.weeks.name),
    `${formatDate(getRaw(week, weeksTable, CONFIG.weeks.start))} - ${formatDate(getRaw(week, weeksTable, CONFIG.weeks.end))}`
  );
  const goal = getNumber(summary, weeklySummaryTable, CONFIG.was.goal);
  const sendMode = firstNonEmpty(inputMode, normalizeMode(getText(summary, weeklySummaryTable, CONFIG.was.sendMode)), "test");
  const isEmpty = countableSubs.length === 0;

  if (isEmpty && emptyWeekPolicy === "suppress") {
    await suppressEmptyWeek(recordId, "Empty week suppressed by policy.");
    return;
  }

  const short = isEmpty && emptyWeekPolicy === "send_short";
  const subject = short
    ? `Shooting Challenge Weekly Reminder - ${athleteName} - ${weekLabel}`
    : `Weekly Shooting Challenge Summary - ${athleteName} - ${weekLabel}`;
  const packageData = {
    athleteName,
    firstName,
    weekLabel,
    days,
    shots,
    goal,
    weekXp,
    assignments,
    homework,
    xpLines,
    level: getText(enrollment, enrollmentsTable, CONFIG.enrollments.level),
    streak: getNumber(enrollment, enrollmentsTable, CONFIG.enrollments.streak),
    streakStatus: getText(enrollment, enrollmentsTable, CONFIG.enrollments.streakStatus),
  };
  const html = short ? shortHtml(packageData) : fullHtml(packageData);
  const textOut = plainText(packageData, short);
  const diagnostics = {
    version: SCRIPT.version,
    recordId,
    enrollmentId,
    weekId,
    programId,
    gradeId,
    assignmentSource,
    countableSubmissionCount: countableSubs.length,
    activeXpCount: activeXp.length,
    canonicalWeekXp: weekXp,
    canonicalShots: shots,
    summaryXpObserved: summaryXp,
    summaryShotsObserved: summaryShots,
    emptyWeekPolicy,
    packageKind: short ? "short_no_activity" : "normal",
    sendMode,
  };

  const updates = {
    [CONFIG.was.buildNow]: false,
    [CONFIG.was.ready]: true,
    [CONFIG.was.send]: false,
    [CONFIG.was.error]: "",
    [CONFIG.was.revision]: SCRIPT.version,
    [CONFIG.was.subject]: subject,
    [CONFIG.was.recipients]: recipients,
    [CONFIG.was.html]: html,
    [CONFIG.was.text]: textOut,
    [CONFIG.was.payload]: JSON.stringify({ ...diagnostics, subject, recipients }),
    [CONFIG.was.weekLabel]: weekLabel,
    [CONFIG.was.builtAt]: new Date().toISOString(),
  };
  await weeklySummaryTable.updateRecordAsync(
    recordId,
    Object.fromEntries(Object.entries(updates).filter(([key]) => fieldExists(weeklySummaryTable, key)))
  );

  const actionOut = short ? CONFIG.actions.builtShortEmptyWeek : CONFIG.actions.builtNormal;
  for (const [key, value] of Object.entries({
    statusOut: CONFIG.statuses.success,
    actionOut,
    recordId,
    enrollmentId,
    weekId,
    assignmentSource,
    activeXpCount: activeXp.length,
    weekXp,
    sendMode,
    errorOut: "",
    debugStep,
  })) {
    setOutputSafe(key, value);
  }

  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: CONFIG.statuses.success,
      actionOut,
      recordId,
      enrollmentId,
      weekId,
      assignmentSource,
      activeXpCount: activeXp.length,
      weekXp,
      sendMode,
      emptyWeekPolicy,
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
    const id = String(cfg.recordId || "").trim();
    if (id) {
      const table = base.getTable(CONFIG.tables.weeklySummary);
      const updates = {};
      if (fieldExists(table, CONFIG.was.buildNow)) updates[CONFIG.was.buildNow] = false;
      if (fieldExists(table, CONFIG.was.ready)) updates[CONFIG.was.ready] = false;
      if (fieldExists(table, CONFIG.was.send)) updates[CONFIG.was.send] = false;
      if (fieldExists(table, CONFIG.was.error)) updates[CONFIG.was.error] = message;
      if (Object.keys(updates).length) await table.updateRecordAsync(id, updates);
    }
  } catch {
    // Best-effort error writeback.
  }
  throw error;
}
