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
 * Version: v8.12
 * Date Written: 2026-05-29
 * Last Updated: 2026-09-01
 *
 * VERSION HISTORY
 * - v8.12 (2026-09-01): FUT-041 — payload adds xpEarned (SUBMISSION_XP| active
 *   points) and xpExtraCredit (0 until a stored daily extra-credit source exists).
 *   submissionXp mirrors xpEarned for backward-compatible Hub contracts.
 * - v8.11 (2026-08-22): Daily Submission payload adds canonical homeworkPageUrl
 *   (`/shoot/homework`); homeworkItems omit per-assignment library URLs.
 * - v8.10 (2026-08-22): Daily Submission payload — submissionStatMode,
 *   structured shootingDetails for Detailed Shooting, level cover image URLs,
 *   PHA grade-band filter allows all-grade assignments (legacy parity).
 * - v8.9 (2026-08-22): Goal settlement aligned with 057 v1.9 — compare WAS
 *   Goal Shots Target (season lookup) to Goal Record Total Shot Target; use
 *   Weekly Goal Shots Target only for weekly math. Fixes false fail-closed on
 *   settled 10,000 / 1,111… Production weeks.
 * - v8.8 (2026-08-22): Daily Submission payload enrichment for redesigned Hub
 *   template — weekDateRange, shootingPercentage, structured homeworkItems,
 *   athlete xpPageUrl, and footer URLs. Business guards unchanged.
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
 *   goal and settled season + weekly targets. Settlement compares WAS
 *   Goal Shots Target to Goal Record Total Shot Target (057 v1.9 pattern).
 *   Weekly Goal Shots Target (= Goal/9) is required for weekly math only.
 *   Explicit configured zero is valid; blank, unconfigured, or lagged zero
 *   never produces a daily email.
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
  version: "v8.12",
  versionDate: "2026-09-01",
  originalWrittenDate: "2026-05-29",
  lastUpdated: "2026-09-01",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "076 - Daily Submission Communications Hub Handoff",
};

const CANONICAL_URLS = {
  landing: "https://www.fairfieldbasketballclub.com",
  shoot: "https://www.fairfieldbasketballclub.com/shoot",
  homework: "https://www.fairfieldbasketballclub.com/shoot/homework",
  dailyForm: "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
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
    levels: "Levels",
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
      twoPtAttempted: "2PT Attempted Counted",
      twoPtMade: "2PT Made Counted",
      threePtAttempted: "3PT Attempted Counted",
      threePtMade: "3PT Made Counted",
      ftAttempted: "FT Attempted Counted",
      ftMade: "FT Made Counted",
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
      publicProfileEnabled: "Public Profile Enabled",
      publicProfileSlug: "Public Profile Slug",
    },
    was: {
      enrollment: "Enrollment",
      week: "Week",
      goalRecord: "Goal Record",
      hcs: "Homework Completions Link",
      xps: "XP Events",
      shots: "Total Shots This Week",
      seasonGoal: "Goal Shots Target",
      weeklyGoal: "Weekly Goal Shots Target",
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
      dailySubmissionUrl: "Daily Submission URL",
    },
    xp: {
      active: "Active?",
      points: "XP Points",
      sourceKey: "Source Key",
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
    hc: {
      enrollment: "Enrollment",
      week: "Week",
      pha: "Program Homework Assignment",
      homework: "Homework",
      satisfactory: "Satisfactory?",
      status: "Completion Status",
    },
    level: {
      name: "Level Name",
      coverImage: "Cover Image",
    },
    curr: {
      title: "Assignment Title",
      full: "Assignment Full Name",
      week: "Week",
      grade: "Grade Band",
      active: "Active?",
      published: "Published?",
      order: "Order",
      url: "URL",
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
const SUBMISSION_XP_SOURCE_KEY_PREFIX = "SUBMISSION_XP|";

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
  if (!value || Number.isNaN(date.getTime())) {
    return "";
  }
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return formatted.replace(/^([A-Za-z]{3})\s/, "$1. ");
}

function weekDateRangeText(week, weekT) {
  const start = dateText(raw(week, weekT, CONFIG.fields.week.start));
  const end = dateText(raw(week, weekT, CONFIG.fields.week.end));
  if (start && end) return `${start} – ${end}`;
  return first(start, end);
}

function mapHomeworkStatus(hc, hcT) {
  if (!hc) return "Not submitted";
  if (bool(hc, hcT, CONFIG.fields.hc.satisfactory)) return "Complete";
  const status = text(hc, hcT, CONFIG.fields.hc.status);
  const normalized = status.toLowerCase();
  if (!status) return "Not submitted";
  if (normalized === "not submitted") return "Not submitted";
  if (normalized === "complete" || normalized === "satisfactory") return "Complete";
  if (normalized === "in progress" || normalized === "needs revision") return "In progress";
  if (normalized === "submitted" || normalized === "under review" || normalized === "pending review") {
    return "Pending review";
  }
  return status;
}

function firstAttachmentUrl(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstAttachmentUrl(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object" && value.url) {
    return String(value.url).trim();
  }
  return "";
}

function optionalNonnegativeInteger(r, t, name) {
  if (!exists(t, name)) return null;
  const v = raw(r, t, name);
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v ?? "")
            .replace(/,/g, "")
            .trim()
        );
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function buildShootingSplit(r, t, attemptedField, madeField) {
  const attempted = optionalNonnegativeInteger(r, t, attemptedField);
  const made = optionalNonnegativeInteger(r, t, madeField);
  if (attempted === null && made === null) return null;
  const att = attempted ?? 0;
  const mk = made ?? 0;
  if (mk > att) return null;
  return {
    made: mk,
    missed: att - mk,
    percentage: att > 0 ? Math.round((mk / att) * 100) : null,
  };
}

function buildShootingDetails(sub, subT) {
  const twoPoint = buildShootingSplit(sub, subT, CONFIG.fields.sub.twoPtAttempted, CONFIG.fields.sub.twoPtMade);
  const threePoint = buildShootingSplit(
    sub,
    subT,
    CONFIG.fields.sub.threePtAttempted,
    CONFIG.fields.sub.threePtMade
  );
  const freeThrow = buildShootingSplit(sub, subT, CONFIG.fields.sub.ftAttempted, CONFIG.fields.sub.ftMade);
  const details = {};
  if (twoPoint) details.twoPoint = twoPoint;
  if (threePoint) details.threePoint = threePoint;
  if (freeThrow) details.freeThrow = freeThrow;
  return Object.keys(details).length ? details : null;
}

async function resolveLevelInfo(enrollment, enrT, levelT, fieldName) {
  const levelIds = ids(enrollment, enrT, fieldName);
  const fallbackName = text(enrollment, enrT, fieldName);
  if (!levelIds.length) {
    return { name: fallbackName, imageUrl: "" };
  }
  const level = await levelT.selectRecordAsync(levelIds[0]);
  if (!level) {
    return { name: fallbackName, imageUrl: "" };
  }
  return {
    name: first(text(level, levelT, CONFIG.fields.level.name), level.name, fallbackName),
    imageUrl: firstAttachmentUrl(raw(level, levelT, CONFIG.fields.level.coverImage)),
  };
}

function buildXpPageUrl(enrollment, enrT) {
  const enabled = bool(enrollment, enrT, CONFIG.fields.enr.publicProfileEnabled);
  const slug = text(enrollment, enrT, CONFIG.fields.enr.publicProfileSlug);
  if (enabled && slug) {
    return `${CANONICAL_URLS.shoot}/athletes/${encodeURIComponent(slug)}`;
  }
  return `${CANONICAL_URLS.shoot}/dashboard`;
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
  const hcT = table(CONFIG.tables.hc);
  const levelT = table(CONFIG.tables.levels);
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
  const settledSeasonGoal = settledNonnegativeNumber(was, wasT, CONFIG.fields.was.seasonGoal);
  const weeklyGoalTarget = settledNonnegativeNumber(was, wasT, CONFIG.fields.was.weeklyGoal);
  if (
    !bool(goal, goalsT, CONFIG.fields.goals.active) ||
    !same(goalProgramIds, [programId]) ||
    enrollmentGradeIds.length !== 1 ||
    !same(goalGradeIds, enrollmentGradeIds) ||
    settledSeasonGoal !== goalTarget
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
  const submissionBaseXpRows = submissionXpRows.filter((row) =>
    text(row, xpT, CONFIG.fields.xp.sourceKey).startsWith(SUBMISSION_XP_SOURCE_KEY_PREFIX)
  );
  const xpEarned = submissionBaseXpRows.length
    ? submissionBaseXpRows.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0)
    : null;
  const xpExtraCredit = 0;
  const submissionXp = xpEarned;
  const weeklyXp = activeXp.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0);
  const weeklyShots = num(was, wasT, CONFIG.fields.was.shots);
  const weeklyGoal = weeklyGoalTarget;

  step("03 - Resolve PHA-first homework context");
  const phaQuery = await load(phaT, Object.values(CONFIG.fields.pha));
  const phaRows = phaQuery.records.filter(
    (row) =>
      bool(row, phaT, CONFIG.fields.pha.active) &&
      same(ids(row, phaT, CONFIG.fields.pha.program), [programId]) &&
      same(ids(row, phaT, CONFIG.fields.pha.week), [weekId]) &&
      (!gradeId ||
        !ids(row, phaT, CONFIG.fields.pha.grade).length ||
        ids(row, phaT, CONFIG.fields.pha.grade).includes(gradeId))
  );
  const homeworkAssignments = phaRows
    .sort((a, b) => slot(text(a, phaT, CONFIG.fields.pha.slot)).localeCompare(slot(text(b, phaT, CONFIG.fields.pha.slot))))
    .map((row) => `${slot(text(row, phaT, CONFIG.fields.pha.slot)) || "Homework"}: ${text(row, phaT, CONFIG.fields.pha.homework)}`)
    .filter(Boolean);
  const currQuery = phaRows.length ? null : await load(currT, Object.values(CONFIG.fields.curr));
  const legacyRows = currQuery
    ? currQuery.records
        .filter(
          (row) =>
            same(ids(row, currT, CONFIG.fields.curr.week), [weekId]) &&
            (!exists(currT, CONFIG.fields.curr.active) || bool(row, currT, CONFIG.fields.curr.active)) &&
            (!gradeId || !ids(row, currT, CONFIG.fields.curr.grade).length || ids(row, currT, CONFIG.fields.curr.grade).includes(gradeId))
        )
        .sort((a, b) => num(a, currT, CONFIG.fields.curr.order, 9999) - num(b, currT, CONFIG.fields.curr.order, 9999))
        .slice(0, 2)
    : [];
  const legacyAssignments = legacyRows.map(
    (row, index) =>
      `HW${index + 1}: ${first(text(row, currT, CONFIG.fields.curr.title), text(row, currT, CONFIG.fields.curr.full), row.name)}`
  );
  const assignments = [...homeworkAssignments, ...legacyAssignments];

  const hcQuery = await load(hcT, Object.values(CONFIG.fields.hc));
  const hcRows = hcQuery.records.filter(
    (row) =>
      same(ids(row, hcT, CONFIG.fields.hc.enrollment), [enrollmentId]) &&
      same(ids(row, hcT, CONFIG.fields.hc.week), [weekId])
  );
  const hcByPha = new Map();
  for (const row of hcRows) {
    const phaId = ids(row, hcT, CONFIG.fields.hc.pha)[0];
    if (phaId) hcByPha.set(phaId, row);
  }
  const libraryIds = [...new Set(phaRows.flatMap((row) => ids(row, phaT, CONFIG.fields.pha.homework)))];
  const libraryById = new Map();
  for (const libId of libraryIds) {
    const lib = await currT.selectRecordAsync(libId);
    if (lib) libraryById.set(libId, lib);
  }
  let homeworkItems = phaRows
    .sort((a, b) => slot(text(a, phaT, CONFIG.fields.pha.slot)).localeCompare(slot(text(b, phaT, CONFIG.fields.pha.slot))))
    .map((row) => {
      const libId = ids(row, phaT, CONFIG.fields.pha.homework)[0];
      const lib = libId ? libraryById.get(libId) : null;
      const name = first(
        lib ? text(lib, currT, CONFIG.fields.curr.title) : "",
        lib ? text(lib, currT, CONFIG.fields.curr.full) : "",
        text(row, phaT, CONFIG.fields.pha.homework)
      );
      if (!name) return null;
      return {
        name,
        status: mapHomeworkStatus(hcByPha.get(row.id), hcT),
      };
    })
    .filter(Boolean);
  if (!homeworkItems.length && legacyRows.length) {
    homeworkItems = legacyRows
      .map((row) => {
        const name = first(text(row, currT, CONFIG.fields.curr.title), text(row, currT, CONFIG.fields.curr.full), row.name);
        if (!name) return null;
        return {
          name,
          status: "Not submitted",
        };
      })
      .filter(Boolean);
  }

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

  const statModeNormalized = normalizedStatMode(sub, subT, CONFIG.fields.sub.mode);
  const submissionStatMode = statModeNormalized === "detailed shooting" ? "Detailed Shooting" : "Simple Total";
  const [currentLevelInfo, nextLevelInfo] = await Promise.all([
    resolveLevelInfo(enrollment, enrT, levelT, CONFIG.fields.enr.currentLevel),
    resolveLevelInfo(enrollment, enrT, levelT, CONFIG.fields.enr.nextLevel),
  ]);

  const shots = nonnegativeInteger(sub, subT, CONFIG.fields.sub.shots);
  const makes = nonnegativeInteger(sub, subT, CONFIG.fields.sub.makes);
  const shootingDetails =
    submissionStatMode === "Detailed Shooting" ? buildShootingDetails(sub, subT) : null;
  const payload = {
    athleteName: first(text(enrollment, enrT, CONFIG.fields.enr.name), "Athlete"),
    activityDate: dateText(raw(sub, subT, CONFIG.fields.sub.activity)),
    weekName: first(text(was, wasT, CONFIG.fields.was.weekName), text(week, weekT, CONFIG.fields.week.name)),
    weekDateRange: weekDateRangeText(week, weekT),
    submissionStatMode,
    shots,
    makes,
    ...(shootingDetails ? { shootingDetails } : {}),
    shootingPercentage: shots > 0 ? Math.round((makes / shots) * 100) : null,
    submissionXp,
    xpEarned,
    xpExtraCredit,
    ...(submissionXp === null ? { submissionXpStatus: "Pending / not yet awarded" } : {}),
    weeklyShots,
    weeklyGoal,
    weeklyGoalPercentage: pct(weeklyShots, weeklyGoal),
    weeklyXp,
    currentStreak: num(enrollment, enrT, CONFIG.fields.enr.streak),
    currentLevel: first(currentLevelInfo.name, text(enrollment, enrT, CONFIG.fields.enr.currentLevel)),
    nextLevel: first(nextLevelInfo.name, text(enrollment, enrT, CONFIG.fields.enr.nextLevel)),
    ...(currentLevelInfo.imageUrl ? { currentLevelImageUrl: currentLevelInfo.imageUrl } : {}),
    ...(nextLevelInfo.imageUrl ? { nextLevelImageUrl: nextLevelInfo.imageUrl } : {}),
    programName: first(text(program, piT, CONFIG.fields.pi.name), program.name, "Shooting Challenge"),
    xpPageUrl: buildXpPageUrl(enrollment, enrT),
    landingPageUrl: CANONICAL_URLS.landing,
    shootPageUrl: CANONICAL_URLS.shoot,
    homeworkPageUrl: CANONICAL_URLS.homework,
    dailySubmissionFormUrl: first(text(program, piT, CONFIG.fields.pi.dailySubmissionUrl), CANONICAL_URLS.dailyForm),
    ...(homeworkItems.length ? { homeworkItems } : {}),
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
