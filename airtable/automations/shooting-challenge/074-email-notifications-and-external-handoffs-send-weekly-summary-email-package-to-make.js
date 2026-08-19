/*
GitHub header
Automation: 074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v3.0
Date Written: 2026-05-29
Last Updated: 2026-08-17

PURPOSE
- Validate one Weekly Athlete Summary that is ready for parent email handoff.
- Create exactly one Ready Email Handoff Queue row for Communications Hub.
- Hand off template data to Automation 079 / Communications Hub / Resend.

IMPORTANT DESIGN RULES
- Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
- This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
- Only Automation 079 may send Email Handoff Queue rows to the Hub.
- One WAS maps to WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{WAS Record ID}.
- Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
- Do not write Weekly Email Sent? or Weekly Email Sent At (Hub/downstream writeback).
- Clear Send to Make? on successful handoff; clear Weekly Email Error.
- testMode defaults true for controlled Hub sends.
- Trigger conceptually still after weekly package ready / Send to Make? checked.

TRIGGER (Airtable UI — keep unless Mike revises)
- Weekly Athlete Summary when record matches conditions:
  Weekly Email Ready? checked
  Weekly Email Sent? unchecked
  Send to Make? checked

INPUT
- recordId (required Weekly Athlete Summary record ID)
- testMode (optional; default true for controlled Hub sends)

OUTPUTS
- statusOut: success | skipped | error
- actionOut: created_handoff | existing_handoff | needs_review | error
- queueRecordId, handoffKey, errorOut, debugStep

FOLDER
- 07 - Email, Notifications, and External Handoffs

AUTOMATION NAME
- 074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff",
  version: "v3.0",
  versionDate: "2026-08-17",
  originalWrittenDate: "2026-05-29",
  lastUpdated: "2026-08-17",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "074 - Email, Notifications, and External Handoffs - Create Weekly Athlete Summary Communications Hub Handoff",
};

const CONFIG = {
  tables: {
    was: "Weekly Athlete Summary",
    enr: "Enrollments",
    week: "Weeks",
    pi: "Program Instance - Sync",
    queue: "Email Handoff Queue",
  },
  statuses: { draft: "Draft", ready: "Ready", needsReview: "Needs Review" },
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

function setOutput(name, value) {
  try {
    output.set(name, value);
  } catch {}
}

function debug(value) {
  setOutput("debugStep", value);
}

function exists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function raw(rec, table, name) {
  return rec && exists(table, name) ? rec.getCellValue(name) : null;
}

function text(rec, table, name) {
  return rec && exists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function ids(rec, table, name) {
  const value = raw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return raw(rec, table, name) === true;
}

function number(rec, table, name) {
  const value = raw(rec, table, name);
  const n = typeof value === "number" ? value : Number(text(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function one(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function first(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(text(rec, table, name));
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
  return Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
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
    if (exists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

async function main() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("recordId must be a valid Airtable record ID.");
  }
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);

  const wasT = base.getTable(CONFIG.tables.was);
  const enrT = base.getTable(CONFIG.tables.enr);
  const weekT = base.getTable(CONFIG.tables.week);
  const queueT = base.getTable(CONFIG.tables.queue);

  debug("01 - Load Weekly Athlete Summary");
  const was = await wasT.selectRecordAsync(recordId);
  if (!was) throw new Error(`Weekly Athlete Summary not found: ${recordId}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${recordId}`;

  debug("02 - Validate readiness gates");
  if (!checked(was, wasT, CONFIG.fields.was.ready)) {
    throw new Error("Weekly Email Ready? is not checked. Handoff blocked.");
  }
  if (checked(was, wasT, CONFIG.fields.was.sent)) {
    throw new Error("Weekly Email Sent? is already checked. Duplicate handoff blocked.");
  }
  if (!checked(was, wasT, CONFIG.fields.was.sendToMake)) {
    throw new Error("Send to Make? is not checked. Handoff blocked.");
  }

  debug("03 - Load Enrollment and Week");
  const enrollmentId = one(ids(was, wasT, CONFIG.fields.was.enrollment), "WAS Enrollment");
  const weekId = one(ids(was, wasT, CONFIG.fields.was.week), "WAS Week");
  const [enr, week] = await Promise.all([
    enrT.selectRecordAsync(enrollmentId),
    weekT.selectRecordAsync(weekId),
  ]);
  if (!enr || !week) throw new Error("WAS source Enrollment/Week not found.");
  if (exists(enrT, CONFIG.fields.enr.active) && !checked(enr, enrT, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is inactive. Handoff blocked.");
  }
  const programId = one(ids(enr, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");

  debug("04 - Resolve recipients and Hub payload");
  const parent = recipientEmail(enr, enrT, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");

  const athleteName = first(text(enr, enrT, CONFIG.fields.enr.athlete), "Athlete");
  const weekLabel = first(
    text(was, wasT, CONFIG.fields.was.weekLabel),
    text(was, wasT, CONFIG.fields.was.weekDisplay),
    text(week, weekT, CONFIG.fields.week.name)
  );
  if (!weekLabel) throw new Error("Week label/name is blank. Handoff blocked.");

  const prepared = safeJsonParse(text(was, wasT, CONFIG.fields.was.payload));
  const daysLogged = number(was, wasT, CONFIG.fields.was.days);
  const shots = number(was, wasT, CONFIG.fields.was.shots);
  const weeklyGoal = number(was, wasT, CONFIG.fields.was.goal);
  const weeklyXp = number(was, wasT, CONFIG.fields.was.weeklyXp);
  const homeworkAssigned = number(was, wasT, CONFIG.fields.was.homeworkAssigned);
  const homeworkSat = number(was, wasT, CONFIG.fields.was.homeworkSat);
  const currentLevel = text(enr, enrT, CONFIG.fields.enr.level);
  const nextLevel = text(enr, enrT, CONFIG.fields.enr.nextLevel);
  const streak = number(enr, enrT, CONFIG.fields.enr.streak);
  const streakStatus = text(enr, enrT, CONFIG.fields.enr.streakStatus);

  const homeworkLines = [];
  if (exists(wasT, CONFIG.fields.was.homeworkAssigned) || exists(wasT, CONFIG.fields.was.homeworkSat)) {
    homeworkLines.push(`Assigned: ${homeworkAssigned}; Satisfactory: ${homeworkSat}`);
  }

  let programName = "";
  try {
    const piT = base.getTable(CONFIG.tables.pi);
    const pi = await piT.selectRecordAsync(programId);
    if (pi) programName = first(text(pi, piT, CONFIG.fields.pi.name), pi.name);
  } catch {}

  const packageKind = first(prepared?.packageKind, daysLogged === 0 && shots === 0 ? "short_no_activity" : "normal");

  const recipients = [{ email: parent, role: "guardian" }];
  const payload = {
    athleteName,
    parentFirstName: text(enr, enrT, CONFIG.fields.enr.parentFirst),
    weekLabel,
    weekName: weekLabel,
    daysLogged,
    days: daysLogged,
    shots,
    weeklyGoal,
    goal: weeklyGoal,
    weeklyXp,
    currentLevel,
    level: currentLevel,
    streak,
    streakStatus,
    homeworkLines,
    packageKind,
  };
  if (nextLevel) {
    payload.nextLevel = nextLevel;
  }
  if (programName) {
    payload.programName = programName;
  }

  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.was,
    [CONFIG.fields.queue.eventType]: selectValue(queueT, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  debug("05 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueT.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutput("statusOut", "error");
    setOutput("actionOut", "needs_review");
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      setOutput("statusOut", "error");
      setOutput("actionOut", "needs_review");
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    const reuseUpdates = {};
    if (exists(wasT, CONFIG.fields.was.error)) reuseUpdates[CONFIG.fields.was.error] = "";
    if (exists(wasT, CONFIG.fields.was.sendToMake)) reuseUpdates[CONFIG.fields.was.sendToMake] = false;
    if (Object.keys(reuseUpdates).length) await wasT.updateRecordAsync(recordId, reuseUpdates);
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", existing[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "success",
        actionOut: "existing_handoff",
        queueRecordId: existing[0].id,
        handoffKey,
      })
    );
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
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", recheck[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
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

  const wasUpdates = {};
  if (exists(wasT, CONFIG.fields.was.error)) wasUpdates[CONFIG.fields.was.error] = "";
  if (exists(wasT, CONFIG.fields.was.sendToMake)) wasUpdates[CONFIG.fields.was.sendToMake] = false;
  if (Object.keys(wasUpdates).length) await wasT.updateRecordAsync(recordId, wasUpdates);

  setOutput("statusOut", "success");
  setOutput("actionOut", "created_handoff");
  setOutput("queueRecordId", created);
  setOutput("handoffKey", handoffKey);
  setOutput("errorOut", "");
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

try {
  await main();
} catch (error) {
  setOutput("statusOut", "error");
  setOutput("actionOut", "error");
  setOutput("errorOut", String(error.message || error));
  try {
    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    if (/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      const wasT = base.getTable(CONFIG.tables.was);
      if (exists(wasT, CONFIG.fields.was.error)) {
        await wasT.updateRecordAsync(recordId, {
          [CONFIG.fields.was.error]: String(error.message || error),
        });
      }
    }
  } catch {}
  throw error;
}
