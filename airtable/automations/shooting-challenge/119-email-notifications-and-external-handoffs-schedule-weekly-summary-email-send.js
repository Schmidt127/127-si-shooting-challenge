/*
Automation: 119 - Email - Schedule Weekly Summary Email Send
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (new - not yet deployed)
Last GitHub Update: 2026-07-18

Purpose:
Sunday 10:00 AM America/Denver batch: for Ready && !Sent weekly packages,
set Send to Make? so automation 074 posts to Make. Does not call Make itself.
DEV: dryRun default true; never enable Live scheduling from agents.

Trigger:
At a scheduled time — Weekly — Sunday 10:00 — America/Denver
*/

/************************************************************
 * 119 - Email - Schedule Weekly Summary Email Send
 *
 * Version: v1.1
 * Date Written: 2026-07-16
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.1 (2026-07-18): Emit scheduledWeekEndKeyOut; document ready-only send gate.
 * - v1.0 (2026-07-16): Initial schedule-arm script.
 *
 * PURPOSE
 * - Resolve prior ended Week (same Saturday-end rule as 118).
 * - For WAS rows on that Week: if Ready? and package present and !Sent?
 *   and enrollment Active? (not Schmidt) → set Send to Make? = true.
 *
 * IMPORTANT DESIGN RULES
 * - Does not POST Make (074 does).
 * - Skips Sent?, inactive, Schmidt, empty package.
 * - dryRun=true (default) counts only.
 * - eventId for Make: WEEKLY_EMAIL|{enrollmentId}|{weekId} (074 payload).
 * - Scheduled date key = prior Saturday Week End (America/Denver).
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * TRIGGER TYPE
 * - At a scheduled time (Weekly Sunday 10:00 America/Denver)
 *
 * INPUT VARIABLES
 * - dryRun = "true" | "false" (default true)
 * - excludedEnrollmentIds = comma-separated
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep
 * - armedCountOut, skippedCountOut, notReadyCountOut, errorCountOut
 *
 * AUTHORITY
 * - docs/v2/C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md
 ************************************************************/

// @ts-nocheck

const CONFIG = {
  scriptName: "119 - Email - Schedule Weekly Summary Email Send",
  version: "v1.1",
  timeZone: "America/Denver",
  schmidtEnrollmentId: "recgP9qZYjAhE7NXm",

  tables: {
    enrollments: "Enrollments",
    weeks: "Weeks",
    was: "Weekly Athlete Summary",
  },

  enrollments: {
    active: "Active?",
  },

  weeks: {
    endDate: "End Date",
    weekEndKey: "Week End Key",
  },

  was: {
    enrollment: "Enrollment",
    week: "Week",
    ready: "Weekly Email Ready?",
    sent: "Weekly Email Sent?",
    sendToMake: "Send to Make?",
    subject: "Weekly Email Subject",
    recipients: "Weekly Email Recipients",
    html: "Weekly Email HTML",
  },
};

function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // unmapped
  }
}

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function safeFields(table, names) {
  return [...new Set(names)].filter((n) => fieldExists(table, n));
}

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function text(record, fieldName) {
  const v = cell(record, fieldName);
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v.name) return String(v.name).trim();
  return String(v).trim();
}

function booleanish(record, fieldName) {
  const v = cell(record, fieldName);
  return v === true || v === 1 || String(v).toLowerCase() === "true";
}

function linkedIds(record, fieldName) {
  const v = cell(record, fieldName);
  if (!Array.isArray(v)) return [];
  return v.map((x) => x?.id).filter(Boolean);
}

function parseBool(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return fallback;
}

function denverDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    weekday: parts.weekday,
  };
}

/**
 * Most recently completed Week End (Saturday) in America/Denver.
 * Matches 118 — Sunday run and Mon–Sat manual reruns target the same prior Saturday.
 */
function priorSaturdayKeyDenver(now = new Date()) {
  const p = denverDateParts(now);
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[p.weekday];
  if (dow === undefined) {
    throw new Error(`Unable to resolve Denver weekday: ${p.weekday}`);
  }
  const daysBack = dow === 6 ? 7 : dow + 1;
  const utcNoon = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysBack);
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcNoon.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKeyFromCell(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function weeklyEmailEventId(enrollmentId, weekId) {
  return `WEEKLY_EMAIL|${enrollmentId}|${weekId}`;
}

async function main() {
  let debugStep = "1 - Start";
  setOutputSafe("debugStep", debugStep);

  const inputConfig = input.config();
  const dryRun = parseBool(inputConfig.dryRun, true);
  const excluded = new Set(
    String(inputConfig.excludedEnrollmentIds || CONFIG.schmidtEnrollmentId)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  excluded.add(CONFIG.schmidtEnrollmentId);

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const wasTable = base.getTable(CONFIG.tables.was);

  debugStep = "2 - Resolve target week";
  setOutputSafe("debugStep", debugStep);

  const targetEndKey = priorSaturdayKeyDenver();
  const weeksQuery = await weeksTable.selectRecordsAsync({
    fields: safeFields(weeksTable, Object.values(CONFIG.weeks)),
  });

  let targetWeek = null;
  for (const w of weeksQuery.records) {
    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));
    if (endKey === targetEndKey) {
      targetWeek = w;
      break;
    }
  }

  if (!targetWeek) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_no_target_week");
    setOutputSafe("errorOut", `No Week with End Date/Key ${targetEndKey}`);
    setOutputSafe("armedCountOut", "0");
    setOutputSafe("skippedCountOut", "0");
    setOutputSafe("notReadyCountOut", "0");
    setOutputSafe("errorCountOut", "0");
    setOutputSafe("debugStep", "skipped_no_target_week");
    return;
  }

  debugStep = "3 - Load WAS + enrollments";
  setOutputSafe("debugStep", debugStep);

  const enrQuery = await enrollmentsTable.selectRecordsAsync({
    fields: safeFields(enrollmentsTable, Object.values(CONFIG.enrollments)),
  });
  const enrById = new Map(enrQuery.records.map((r) => [r.id, r]));

  const wasQuery = await wasTable.selectRecordsAsync({
    fields: safeFields(wasTable, Object.values(CONFIG.was)),
  });

  let armed = 0;
  let skipped = 0;
  let notReady = 0;
  let errors = 0;

  debugStep = "4 - Arm sends";
  setOutputSafe("debugStep", debugStep);

  for (const row of wasQuery.records) {
    try {
      const weekId = linkedIds(row, CONFIG.was.week)[0];
      if (weekId !== targetWeek.id) continue;

      const enrollmentId = linkedIds(row, CONFIG.was.enrollment)[0];
      if (!enrollmentId || excluded.has(enrollmentId)) {
        skipped += 1;
        continue;
      }

      const enr = enrById.get(enrollmentId);
      if (
        enr &&
        fieldExists(enrollmentsTable, CONFIG.enrollments.active) &&
        !booleanish(enr, CONFIG.enrollments.active)
      ) {
        skipped += 1;
        continue;
      }

      if (booleanish(row, CONFIG.was.sent)) {
        skipped += 1;
        continue;
      }

      const ready = booleanish(row, CONFIG.was.ready);
      const subject = text(row, CONFIG.was.subject);
      const recipients = text(row, CONFIG.was.recipients);
      const html = text(row, CONFIG.was.html);
      if (!ready || !subject || !recipients || !html) {
        notReady += 1;
        continue;
      }

      const eventId = weeklyEmailEventId(enrollmentId, targetWeek.id);
      console.log(`119 candidate ${row.id} eventId=${eventId}`);

      if (dryRun) {
        armed += 1;
        continue;
      }

      if (fieldExists(wasTable, CONFIG.was.sendToMake)) {
        await wasTable.updateRecordAsync(row.id, {
          [CONFIG.was.sendToMake]: true,
        });
      }
      armed += 1;
    } catch (e) {
      errors += 1;
      console.log(`119 error WAS ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    enrQuery.unloadData();
    weeksQuery.unloadData();
    wasQuery.unloadData();
  } catch {
    // ignore
  }

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", dryRun ? "dry_run_complete" : "send_armed");
  setOutputSafe("errorOut", errors > 0 ? `${errors} row errors` : "");
  setOutputSafe("armedCountOut", String(armed));
  setOutputSafe("skippedCountOut", String(skipped));
  setOutputSafe("notReadyCountOut", String(notReady));
  setOutputSafe("errorCountOut", String(errors));
  setOutputSafe("scheduledWeekEndKeyOut", targetEndKey);
  setOutputSafe("targetWeekIdOut", targetWeek.id);
  setOutputSafe("debugStep", "complete");

  console.log(
    JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      dryRun,
      targetWeekId: targetWeek.id,
      scheduledWeekEndKey: targetEndKey,
      armed,
      skipped,
      notReady,
      errors,
    })
  );
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", message);
  setOutputSafe("debugStep", "error");
  console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, error: message }));
  throw error;
}
