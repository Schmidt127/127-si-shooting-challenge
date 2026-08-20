/*
Automation: 076 - Daily Submission Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: 2026-08-13
Last GitHub Update: 2026-08-20 (v8.7 V2 standard structure)

Purpose:
Validate a fully processed Submission and create exactly one Ready
Email Handoff Queue row for Communications Hub (079 → Resend).

Trigger:
Automation 031 is the sole upstream owner that checks Build Daily Email Now?,
only after the 023 → 005 → 007 → 010 → 031 chain has settled
(confirm exact conditions in Airtable UI); pass the dynamic recordId.

Important Tables:
Submissions, Enrollments, Weekly Athlete Summary, Target Goal Shots, Weeks,
Program Instance - Sync, XP Events, Program Homework Assignments,
Homework Library, Email Handoff Queue

Important Fields:
Build Daily Email Now?, Count This Submission?, Submission Stat Mode,
Parent Email - Cleaned, Athlete Email - Cleaned, Handoff Key, Status

Notes:
GitHub is the source-of-truth copy. Airtable is the deployed/running copy.
Filename may still say email package; current path is Hub queue create only.
*/

/************************************************************
 * 076 - EMAIL, NOTIFICATIONS, AND EXTERNAL HANDOFFS
 * Daily Submission Communications Hub Handoff
 *
 * Version: v8.7
 * Date Written: 2026-05-29
 * Last Updated: 2026-08-20
 *
 * VERSION HISTORY
 * - v8.7 (2026-08-20): V2 Automation Standard structure — GitHub header,
 *   production docblock, numbered sections, hoisted debugStep, outer run
 *   wrapper. Business logic unchanged from v8.6.
 * - v8.6 (2026-08-13): Hub queue handoff with strict mode, goal, recipient,
 *   and single-select guards.
 *
 * PURPOSE
 * - Validate a fully processed Submission and create exactly one Ready
 *   Email Handoff Queue row.
 * - Hand off template data to Automation 079 / Communications Hub.
 *
 * IMPORTANT DESIGN RULES
 * - Hub owns subject, HTML, plain text, branding, validation, delivery,
 *   and Delivery proof.
 * - This script never calls Hub, Make, Gmail, or writes legacy daily email
 *   fields.
 * - One Submission maps to `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}`.
 * - Active XP only; missing Submission XP is represented as null plus
 *   pending status.
 * - Program Instance, Enrollment, Week, Weekly Athlete Summary, and PHA
 *   ownership are fail-closed.
 * - The WAS must resolve one active, exact Program Instance + Grade Band
 *   goal and a settled numeric weekly target. Explicit configured zero is
 *   valid; blank, unconfigured, or lagged zero never produces a daily email.
 * - Enrollment `Parent Email - Cleaned` is the authoritative parent recipient;
 *   raw `Parent Email` is never used as a fallback.
 * - 077 is retired as a pending retirement candidate and is never armed by
 *   this script.
 *
 * THIS IS NOT
 * - Weekly email package builder (072).
 * - Weekly Hub handoff (074).
 * - Video Feedback Hub handoff (073).
 * - Queue dispatcher to Hub (079).
 * - Direct Make / Gmail / Resend sender.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * AUTOMATION NAME
 * - 076 - Daily Submission Communications Hub Handoff
 *
 * TRIGGER TABLE
 * - Submissions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Automation 031 is the sole upstream owner that checks
 *   `Build Daily Email Now?`, only after the
 *   023 → 005 → 007 → 010 → 031 chain has settled.
 * - `Count This Submission?` and `Submission Stat Mode` remain supporting
 *   guards, and 076 fail-closes unless count evaluates checked/1 and the
 *   mode is exactly `Simple Total` or `Detailed Shooting` after trim/case
 *   normalization.
 * - Clear `Build Daily Email Now?` after an existing or newly created
 *   handoff so a successful replay cannot retrigger the source signal.
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Submission record ID
 *
 * OPTIONAL INPUT VARIABLES
 * - testMode = optional; default true for controlled Hub sends
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = created_handoff | existing_handoff | needs_review |
 *   skipped_not_ready | skipped_inactive_enrollment | error
 * - queueRecordId / handoffKey / errorOut / debugStep
 *
 * PRIMARY TABLES USED
 * - Submissions, Enrollments, Weekly Athlete Summary, Target Goal Shots,
 *   Weeks, Program Instance - Sync, XP Events, Homework Completions,
 *   Program Homework Assignments, Homework Library, Email Handoff Queue
 *
 * OUTPUT / WRITEBACK FIELDS
 * - Email Handoff Queue → Handoff Key, Status, payload/recipients, Test Mode?
 * - Submissions → Build Daily Email Now? (clear on success paths)
 *
 * HANDOFF KEY
 * - DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}
 ************************************************************/

// @ts-nocheck

/* =========================================================
   SECTION 1: SCRIPT METADATA
========================================================= */

const SCRIPT = {
  scriptName: "076 - Daily Submission Communications Hub Handoff",
  version: "v8.7",
  versionDate: "2026-08-20",
  originalWrittenDate: "2026-05-29",
  lastUpdated: "2026-08-20",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "076 - Daily Submission Communications Hub Handoff",
};

/* =========================================================
   SECTION 2: CONFIGURATION
========================================================= */

const CONFIG = {
  tables: {
    sub: "Submissions",
    enr: "Enrollments",
    was: "Weekly Athlete Summary",
    goals: "Target Goal Shots",
    week: "Weeks",
    pi: "Program Instance - Sync",
    xp: "XP Events",
    hc: "Homework Completions",
    pha: "Program Homework Assignments",
    curr: "Homework Library",
    queue: "Email Handoff Queue",
  },
  statuses: {
    draft: "Draft",
    ready: "Ready",
    needsReview: "Needs Review",
  },
  fields: {
    sub: {
      enrollment: "Enrollment",
      week: "Week",
      was: "Weekly Athlete Summary",
      activity: "Activity Date",
      build: "Build Daily Email Now?",
      count: "Count This Submission?",
      mode: "Submission Stat Mode",
      shots: "Total Shots Counted",
      makes: "Total Makes Counted",
      hw1: "HW Sub 1",
      hw2: "HW Sub 2",
      video: "Video Upload",
      hcs: "Homework Completions",
    },
    enr: {
      active: "Active?",
      program: "Program Instance",
      grade: "Grade Band",
      parent: "Parent Email - Cleaned",
      athlete: "Athlete Email - Cleaned",
      name: "Full Athlete Name",
      first: "Athlete First Name",
      streak: "Current Shooting Streak",
      currentLevel: "Current Level",
      nextLevel: "Next Level",
    },
    was: {
      enrollment: "Enrollment",
      week: "Week",
      goalRecord: "Goal Record",
      hcs: "Homework Completions Link",
      xps: "XP Events",
      shots: "Total Shots This Week",
      goal: "Weekly Goal Shots Target",
      weekName: "Week - Display",
    },
    goals: {
      active: "Active?",
      program: "Program Instance",
      grade: "Grade Band",
      target: "Total Shot Target",
    },
    week: {
      name: "Week Name",
      start: "Start Date",
      end: "End Date",
      program: "Program Instance",
    },
    pi: {
      name: "Name - Program Instance",
    },
    xp: {
      active: "Active?",
      points: "XP Points",
      enrollment: "Enrollment",
      week: "Week",
      submission: "Submission",
    },
    pha: {
      homework: "Homework Assignment",
      program: "Program Instance",
      week: "Week",
      grade: "Grade Band",
      slot: "Homework Slot",
      active: "Active?",
    },
    curr: {
      title: "Assignment Title",
      full: "Assignment Full Name",
      week: "Week",
      grade: "Grade Band",
      active: "Active?",
      published: "Published?",
      order: "Order",
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
};

const TZ = "America/Denver";

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

function table(name) {
  return base.getTable(name);
}

function exists(t, name) {
  try {
    t.getField(name);
    return true;
  } catch {
    return false;
  }
}

function raw(r, t, name) {
  return r && exists(t, name) ? r.getCellValue(name) : null;
}

function text(r, t, name) {
  return r && exists(t, name) ? String(r.getCellValueAsString(name) || "").trim() : "";
}

function ids(r, t, name) {
  return Array.isArray(raw(r, t, name)) ? raw(r, t, name).map((v) => v?.id).filter(Boolean) : [];
}

function num(r, t, name, fallback = 0) {
  const v = raw(r, t, name);
  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v ?? "")
            .replace(/[$,%]/g, "")
            .replace(/,/g, "")
            .trim()
        );
  return Number.isFinite(n) ? n : fallback;
}

function nonnegativeInteger(r, t, name) {
  const v = raw(r, t, name);
  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v ?? "")
            .replace(/,/g, "")
            .trim()
        );
  if (v === null || v === undefined || v === "" || !Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a settled nonnegative integer.`);
  }
  return n;
}

const settledNonnegativeNumber = (r, t, name) => {
  const v = raw(r, t, name);
  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v ?? "")
            .replace(/,/g, "")
            .trim()
        );
  if (v === null || v === undefined || v === "" || !Number.isFinite(n) || n < 0) {
    throw new Error(`${name} must be a settled nonnegative numeric value.`);
  }
  return n;
};

function bool(r, t, name) {
  const v = raw(r, t, name);
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  return ["true", "yes", "checked", "1", "counted", "count"].includes(text(r, t, name).toLowerCase());
}

function checkedReadiness(r, t, name) {
  const v = raw(r, t, name);
  if (v === true || v === 1) return true;
  return ["true", "yes", "checked", "1"].includes(text(r, t, name).toLowerCase());
}

function normalizedStatMode(r, t, name) {
  return text(r, t, name).toLowerCase();
}

function one(values, label) {
  if (values.length !== 1) throw new Error(`${label} must have exactly one link; found ${values.length}.`);
  return values[0];
}

function same(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function first(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(r, t, name) {
  const email = cleanEmail(text(r, t, name));
  return validEmail(email) ? email : "";
}

function dateText(value) {
  const date = value instanceof Date ? value : new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function pct(value, target) {
  return Number(target) > 0 ? Math.round((Number(value) / Number(target)) * 100) : 0;
}

function selectValue(t, name, value) {
  const field = t.getField(name);
  if (field.type !== "singleSelect") return value;
  const choice = field.options.choices.find((item) => item.name.toLowerCase() === value.toLowerCase());
  if (!choice) throw new Error(`Missing option ${value} on ${t.name}.${name}`);
  return { name: choice.name };
}

function formula(field, value) {
  return `{${field}}='${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function load(t, fields) {
  return t.selectRecordsAsync({ fields: fields.filter((name) => exists(t, name)) });
}

function slot(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function queueFields(queueT, values) {
  return Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueT, name)));
}

function stableJson(value) {
  return Array.isArray(value)
    ? `[${value.map(stableJson).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
}

const samePayload = (left, right) => {
  try {
    return stableJson(JSON.parse(left || "{}")) === stableJson(right);
  } catch {
    return false;
  }
};

const clearBuildSignal = async (submissionTable, submissionId) => {
  if (
    exists(submissionTable, CONFIG.fields.sub.build) &&
    submissionTable.getField(CONFIG.fields.sub.build).type === "checkbox"
  ) {
    await submissionTable.updateRecordAsync(submissionId, { [CONFIG.fields.sub.build]: false });
  }
};

const markQueueNeedsReview = async (queueTable, rows) => {
  for (const row of rows) {
    if (exists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
};

/* =========================================================
   SECTION 4: MAIN
========================================================= */

async function main() {
  step("0 - Validate recordId");
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) throw new Error("recordId must be a valid Airtable record ID.");

  const subT = table(CONFIG.tables.sub);
  const enrT = table(CONFIG.tables.enr);
  const wasT = table(CONFIG.tables.was);
  const goalsT = table(CONFIG.tables.goals);
  const weekT = table(CONFIG.tables.week);
  const piT = table(CONFIG.tables.pi);
  const xpT = table(CONFIG.tables.xp);
  const phaT = table(CONFIG.tables.pha);
  const currT = table(CONFIG.tables.curr);
  const queueT = table(CONFIG.tables.queue);

  const sub = await subT.selectRecordAsync(recordId);
  if (!sub) throw new Error(`Submission not found: ${recordId}`);

  const handoffKey = `DAILY_SUBMISSION|SUBMISSIONS|${recordId}`;

  step("01 - Validate Submission readiness");
  if (!exists(subT, CONFIG.fields.sub.build)) {
    throw new Error(`Missing required readiness signal: ${CONFIG.fields.sub.build}.`);
  }
  if (!bool(sub, subT, CONFIG.fields.sub.build)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_ready");
    return;
  }
  if (!exists(subT, CONFIG.fields.sub.count) || !checkedReadiness(sub, subT, CONFIG.fields.sub.count)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_ready");
    return;
  }
  if (
    !exists(subT, CONFIG.fields.sub.mode) ||
    !["simple total", "detailed shooting"].includes(normalizedStatMode(sub, subT, CONFIG.fields.sub.mode))
  ) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_ready");
    return;
  }

  const enrollmentId = one(ids(sub, subT, CONFIG.fields.sub.enrollment), "Submission Enrollment");
  const weekId = one(ids(sub, subT, CONFIG.fields.sub.week), "Submission Week");
  const [enrollment, week] = await Promise.all([enrT.selectRecordAsync(enrollmentId), weekT.selectRecordAsync(weekId)]);
  if (!enrollment || !week) throw new Error("Submission Enrollment/Week not found.");
  if (exists(enrT, CONFIG.fields.enr.active) && !bool(enrollment, enrT, CONFIG.fields.enr.active)) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_inactive_enrollment");
    return;
  }

  const programId = one(ids(enrollment, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");
  const gradeId = ids(enrollment, enrT, CONFIG.fields.enr.grade)[0] || "";
  const program = await piT.selectRecordAsync(programId);
  if (!program) throw new Error("Program Instance not found.");
  if (ids(week, weekT, CONFIG.fields.week.program).length && !same(ids(week, weekT, CONFIG.fields.week.program), [programId])) {
    throw new Error("Week Program Instance does not match Enrollment.");
  }

  const wasIds = ids(sub, subT, CONFIG.fields.sub.was);
  if (wasIds.length > 1) throw new Error("Submission links multiple Weekly Athlete Summaries.");
  const was = wasIds.length ? await wasT.selectRecordAsync(wasIds[0]) : null;
  if (was && (!same(ids(was, wasT, CONFIG.fields.was.enrollment), [enrollmentId]) || !same(ids(was, wasT, CONFIG.fields.was.week), [weekId]))) {
    throw new Error("Weekly Athlete Summary is not canonical for Enrollment + Week.");
  }
  if (!was) throw new Error("Weekly Athlete Summary is required before Daily Submission email preparation.");

  const goalIds = ids(was, wasT, CONFIG.fields.was.goalRecord);
  if (goalIds.length !== 1) {
    throw new Error("Weekly Athlete Summary must link exactly one Goal Record before Daily Submission email preparation.");
  }
  const goal = await goalsT.selectRecordAsync(goalIds[0]);
  if (!goal) throw new Error("Linked Target Goal Shots record was not found.");

  const goalProgramIds = ids(goal, goalsT, CONFIG.fields.goals.program);
  const goalGradeIds = ids(goal, goalsT, CONFIG.fields.goals.grade);
  const enrollmentGradeIds = ids(enrollment, enrT, CONFIG.fields.enr.grade);
  const goalTarget = settledNonnegativeNumber(goal, goalsT, CONFIG.fields.goals.target);
  const settledWeeklyGoal = settledNonnegativeNumber(was, wasT, CONFIG.fields.was.goal);
  if (
    !bool(goal, goalsT, CONFIG.fields.goals.active) ||
    !same(goalProgramIds, [programId]) ||
    enrollmentGradeIds.length !== 1 ||
    !same(goalGradeIds, enrollmentGradeIds) ||
    settledWeeklyGoal !== goalTarget
  ) {
    throw new Error(
      "Weekly goal configuration is missing, ambiguous, wrong-scope, inactive, or unsettled; Daily Submission email is not prepared."
    );
  }

  step("02 - Reconcile active XP and weekly summary");
  const xpQuery = await load(xpT, Object.values(CONFIG.fields.xp));
  const activeXp = xpQuery.records.filter(
    (row) =>
      bool(row, xpT, CONFIG.fields.xp.active) &&
      same(ids(row, xpT, CONFIG.fields.xp.enrollment), [enrollmentId]) &&
      same(ids(row, xpT, CONFIG.fields.xp.week), [weekId])
  );
  const submissionXpRows = activeXp.filter((row) => ids(row, xpT, CONFIG.fields.xp.submission).includes(recordId));
  const submissionXp = submissionXpRows.length
    ? submissionXpRows.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0)
    : null;
  const weeklyXp = activeXp.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0);
  const weeklyShots = num(was, wasT, CONFIG.fields.was.shots);
  const weeklyGoal = settledWeeklyGoal;

  step("03 - Resolve PHA-first homework context");
  const phaQuery = await load(phaT, Object.values(CONFIG.fields.pha));
  const phaRows = phaQuery.records.filter(
    (row) =>
      bool(row, phaT, CONFIG.fields.pha.active) &&
      same(ids(row, phaT, CONFIG.fields.pha.program), [programId]) &&
      same(ids(row, phaT, CONFIG.fields.pha.week), [weekId]) &&
      (!gradeId || same(ids(row, phaT, CONFIG.fields.pha.grade), [gradeId]))
  );
  const homeworkAssignments = phaRows
    .sort((a, b) => slot(text(a, phaT, CONFIG.fields.pha.slot)).localeCompare(slot(text(b, phaT, CONFIG.fields.pha.slot))))
    .map((row) => `${slot(text(row, phaT, CONFIG.fields.pha.slot)) || "Homework"}: ${text(row, phaT, CONFIG.fields.pha.homework)}`)
    .filter(Boolean);
  const currQuery = phaRows.length ? null : await load(currT, Object.values(CONFIG.fields.curr));
  const legacyAssignments = currQuery
    ? currQuery.records
        .filter(
          (row) =>
            same(ids(row, currT, CONFIG.fields.curr.week), [weekId]) &&
            (!exists(currT, CONFIG.fields.curr.active) || bool(row, currT, CONFIG.fields.curr.active)) &&
            (!gradeId || !ids(row, currT, CONFIG.fields.curr.grade).length || ids(row, currT, CONFIG.fields.curr.grade).includes(gradeId))
        )
        .sort((a, b) => num(a, currT, CONFIG.fields.curr.order, 9999) - num(b, currT, CONFIG.fields.curr.order, 9999))
        .slice(0, 2)
        .map(
          (row, index) =>
            `HW${index + 1}: ${first(text(row, currT, CONFIG.fields.curr.title), text(row, currT, CONFIG.fields.curr.full), row.name)}`
        )
    : [];
  const assignments = [...homeworkAssignments, ...legacyAssignments];

  const parent = recipientEmail(enrollment, enrT, CONFIG.fields.enr.parent);
  const athlete = recipientEmail(enrollment, enrT, CONFIG.fields.enr.athlete);
  const displayName = text(enrollment, enrT, CONFIG.fields.enr.name);
  const recipients = [];
  for (const [email, role] of [
    [parent, "guardian"],
    [athlete, "athlete"],
  ]) {
    if (email && !recipients.some((recipient) => recipient.email === email)) {
      recipients.push({ email, role, displayName });
    }
  }
  if (!parent) throw new Error("No usable cleaned parent recipient.");

  const payload = {
    athleteName: first(text(enrollment, enrT, CONFIG.fields.enr.name), "Athlete"),
    activityDate: dateText(raw(sub, subT, CONFIG.fields.sub.activity)),
    weekName: first(text(was, wasT, CONFIG.fields.was.weekName), text(week, weekT, CONFIG.fields.week.name)),
    shots: nonnegativeInteger(sub, subT, CONFIG.fields.sub.shots),
    makes: nonnegativeInteger(sub, subT, CONFIG.fields.sub.makes),
    submissionXp,
    ...(submissionXp === null ? { submissionXpStatus: "Pending / not yet awarded" } : {}),
    weeklyShots,
    weeklyGoal,
    weeklyGoalPercentage: pct(weeklyShots, weeklyGoal),
    weeklyXp,
    currentStreak: num(enrollment, enrT, CONFIG.fields.enr.streak),
    currentLevel: text(enrollment, enrT, CONFIG.fields.enr.currentLevel),
    nextLevel: text(enrollment, enrT, CONFIG.fields.enr.nextLevel),
    programName: first(text(program, piT, CONFIG.fields.pi.name), program.name, "Shooting Challenge"),
    ...(assignments.length ? { homeworkAssignments: assignments } : {}),
  };
  if (!payload.activityDate || !payload.weekName) throw new Error("Submission Activity Date and Week Name are required.");
  if (payload.makes > payload.shots) throw new Error("Total Makes Counted cannot exceed Total Shots Counted.");

  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.sub,
    [CONFIG.fields.queue.eventType]: selectValue(queueT, CONFIG.fields.queue.eventType, "DAILY_SUBMISSION"),
    [CONFIG.fields.queue.template]: "DAILY_SUBMISSION",
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: cfg.testMode === undefined ? true : Boolean(cfg.testMode),
    [CONFIG.fields.queue.attempts]: 0,
  });

  step("04 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueT.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "needs_review");
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    await clearBuildSignal(subT, recordId);
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "existing_handoff");
    setOutputSafe("queueRecordId", existing[0].id);
    setOutputSafe("handoffKey", handoffKey);
    return;
  }

  const recheck = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueT, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    await clearBuildSignal(subT, recordId);
    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "existing_handoff");
    setOutputSafe("queueRecordId", recheck[0].id);
    setOutputSafe("handoffKey", handoffKey);
    return;
  }

  const created = await queueT.createRecordAsync(queueData);
  const afterCreate = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueT, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueT.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });
  await clearBuildSignal(subT, recordId);

  step("05 - Complete");
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "created_handoff");
  setOutputSafe("queueRecordId", created);
  setOutputSafe("handoffKey", handoffKey);
  setOutputSafe("errorOut", "");
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "created_handoff",
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
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", `FAILED AT: ${debugStep} | ${message}`);
  setOutputSafe("debugStep", debugStep);
  try {
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "error",
        errorOut: `FAILED AT: ${debugStep} | ${message}`,
        debugStep,
      })
    );
  } catch {
    // Ignore logging failures.
  }
  throw error;
}
