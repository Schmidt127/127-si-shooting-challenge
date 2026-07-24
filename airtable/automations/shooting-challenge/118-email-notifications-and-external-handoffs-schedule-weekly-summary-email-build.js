/*
Automation: 118 - Email - Schedule Weekly Summary Email Build
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (new - not yet deployed)
Last GitHub Update: 2026-07-24

Purpose:
Sunday 5:00 AM America/Denver batch: ensure Weekly Athlete Summary rows for the
prior ended week and arm Build Weekly Email Now? so automation 072 builds packages.
Does not call Make. DEV must use dryRun/Test until Mike enables.

Trigger:
At a scheduled time — Weekly — Sunday 05:00 — America/Denver

Notes:
Never commit webhook secrets. Exclude Schmidt test enrollment.
PROD: do not enable from agents.
*/

/************************************************************
 * 118 - Email - Schedule Weekly Summary Email Build
 *
 * Version: v1.3
 * Date Written: 2026-07-16
 * Last Updated: 2026-07-24
 *
 * VERSION HISTORY
 * - v1.3 (2026-07-24): Correct Summary Key documentation — live PROD shape
 *   verified 2026-07-23 is {Enrollment Key}|{Week Key} =
 *   ATH-{athleteRecId}|{schoolYear}|{weekRecId}, matching expectedSummaryKey.
 *   Enrollment+Week matching remains the fallback. Add emptyWeekPolicy input
 *   (default send_normal) as a recorded product-decision hook; suppress/short
 *   are NOT enforced until Mike decides. Schedules remain OFF by default.
 * - v1.2 (2026-07-23): Fix week End Date matching — Weeks End Date is a
 *   dateTime stored as Denver 23:59 (next-day UTC); date keys now convert to
 *   the America/Denver calendar date instead of UTC, so the Sunday run can
 *   actually find the prior-Saturday week. Add includeSchmidt input
 *   (default false) so the Schmidt test enrollment can be armed for
 *   controlled Test-mode email verification.
 * - v1.1 (2026-07-18): Emit scheduledWeekEndKeyOut; prefer Summary Key for WAS
 *   lookup; skip duplicate WAS arms; keep dryRun default true.
 * - v1.0 (2026-07-16): Initial schedule-arm script.
 *
 * PURPOSE
 * - Resolve prior ended Week (Saturday just ended at Sunday 05:00 Denver).
 * - For each Active? enrollment (excluding Schmidt), ensure WAS exists.
 * - Skip if Weekly Email Sent? or no cleaned email.
 * - Set Build Weekly Email Now? = true and sendMode = Test when dryRun=false.
 *
 * IMPORTANT DESIGN RULES
 * - Does not POST Make.
 * - Does not clear Weekly Email Sent?.
 * - dryRun=true (default) only counts; no writes.
 * - Schmidt enrollment excluded by default: recgP9qZYjAhE7NXm
 *   (override only via includeSchmidt=true for controlled Test-mode runs)
 * - Scheduled date key = prior Saturday Week End (America/Denver).
 * - Idempotent: one WAS per Enrollment+Week (Summary Key when present).
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * TRIGGER TYPE
 * - At a scheduled time (Weekly Sunday 05:00 America/Denver)
 *
 * INPUT VARIABLES
 * - dryRun = "true" | "false" (default true)
 * - sendMode = "Test" | "Live" (DEV must be Test)
 * - excludedEnrollmentIds = comma-separated (default includes Schmidt)
 * - includeSchmidt = "true" | "false" (default false). When true, the Schmidt
 *   test enrollment is NOT hard-excluded, enabling controlled Test-mode
 *   weekly email verification. Never combine with sendMode=Live.
 * - emptyWeekPolicy = "send_normal" | "send_short" | "suppress" (default
 *   send_normal). Recorded only until Mike decides; this script does not
 *   suppress empty-week arms yet.
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep
 * - armedCountOut, skippedCountOut, createdWasCountOut, errorCountOut
 * - emptyWeekPolicyOut
 *
 * AUTHORITY
 * - docs/v2/C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md
 * - docs/next-wave/was-email/EMPTY-WEEK-EMAIL-DECISION.md
 ************************************************************/

// @ts-nocheck

const CONFIG = {
  scriptName: "118 - Email - Schedule Weekly Summary Email Build",
  version: "v1.3",
  timeZone: "America/Denver",
  schmidtEnrollmentId: "recgP9qZYjAhE7NXm",

  tables: {
    enrollments: "Enrollments",
    weeks: "Weeks",
    was: "Weekly Athlete Summary",
  },

  enrollments: {
    active: "Active?",
    enrollmentKey: "Enrollment Key",
    parentEmail: "Parent Email - Cleaned",
    athleteEmail: "Athlete Email - Cleaned",
  },

  weeks: {
    endDate: "End Date",
    weekEndKey: "Week End Key",
    weekKey: "Week Key",
    active: "Active?",
  },

  was: {
    enrollment: "Enrollment",
    week: "Week",
    summaryKey: "Summary Key",
    buildNow: "Build Weekly Email Now?",
    sent: "Weekly Email Sent?",
    sendMode: "sendMode",
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
 * Sunday schedule → yesterday Saturday. Manual Mon–Sat rerun → prior Saturday
 * (never "today" when today is Saturday — week still in progress until Sunday run).
 */
function priorSaturdayKeyDenver(now = new Date()) {
  const p = denverDateParts(now);
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[p.weekday];
  if (dow === undefined) {
    throw new Error(`Unable to resolve Denver weekday: ${p.weekday}`);
  }
  const daysBack = dow === 6 ? 7 : dow + 1; // Sun→1 … Fri→6, Sat→7
  // Build UTC noon on Denver calendar day, then step back (avoids DST hour math).
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
    // Pure date-only strings (YYYY-MM-DD) pass through unchanged.
    const m = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "";
  // Weeks Start/End Date are dateTime fields in America/Denver (Saturday
  // 23:59 Denver serializes as Sunday 05:59 UTC). Convert to the Denver
  // calendar date — UTC parts would shift the key one day forward.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  if (!y || !mo || !day) return "";
  return `${y}-${mo}-${day}`;
}

async function main() {
  let debugStep = "1 - Start";
  setOutputSafe("debugStep", debugStep);

  const inputConfig = input.config();
  const dryRun = parseBool(inputConfig.dryRun, true);
  const sendMode = String(inputConfig.sendMode || "Test").trim() || "Test";
  const includeSchmidt = parseBool(inputConfig.includeSchmidt, false);
  const emptyWeekPolicyRaw = String(inputConfig.emptyWeekPolicy || "send_normal")
    .trim()
    .toLowerCase();
  const emptyWeekPolicy = ["send_normal", "send_short", "suppress"].includes(emptyWeekPolicyRaw)
    ? emptyWeekPolicyRaw
    : "send_normal";
  setOutputSafe("emptyWeekPolicyOut", emptyWeekPolicy);
  // Product decision hook only — suppress/short are not enforced here yet.
  if (emptyWeekPolicy !== "send_normal") {
    console.log(
      JSON.stringify({
        automation: CONFIG.scriptName,
        version: CONFIG.version,
        note: "emptyWeekPolicy recorded but not enforced until Mike decides",
        emptyWeekPolicy,
      })
    );
  }
  const excluded = new Set(
    String(inputConfig.excludedEnrollmentIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (!includeSchmidt) {
    excluded.add(CONFIG.schmidtEnrollmentId);
  }

  if (String(sendMode).toLowerCase() === "live" && dryRun === false) {
    // Hard stop for accidental Live arming from this package
    throw new Error("118 refuses sendMode=Live when dryRun=false. Use Test only until Mike approves Live.");
  }

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const wasTable = base.getTable(CONFIG.tables.was);

  debugStep = "2 - Resolve target week";
  setOutputSafe("debugStep", debugStep);

  const targetEndKey = priorSaturdayKeyDenver();
  const weekFields = safeFields(weeksTable, Object.values(CONFIG.weeks));
  const weeksQuery = await weeksTable.selectRecordsAsync({ fields: weekFields });

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
    setOutputSafe("createdWasCountOut", "0");
    setOutputSafe("errorCountOut", "0");
    setOutputSafe("debugStep", "skipped_no_target_week");
    console.log(JSON.stringify({ automation: CONFIG.scriptName, version: CONFIG.version, targetEndKey, dryRun }));
    return;
  }

  debugStep = "3 - Load enrollments + WAS";
  setOutputSafe("debugStep", debugStep);

  const enrFields = safeFields(enrollmentsTable, Object.values(CONFIG.enrollments));
  const enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({ fields: enrFields });

  const wasFields = safeFields(wasTable, Object.values(CONFIG.was));
  const wasQuery = await wasTable.selectRecordsAsync({ fields: wasFields });

  const wasByEnrollment = new Map();
  const wasBySummaryKey = new Map();
  let duplicateWasSkipped = 0;
  for (const row of wasQuery.records) {
    const eId = linkedIds(row, CONFIG.was.enrollment)[0];
    const wId = linkedIds(row, CONFIG.was.week)[0];
    if (!(eId && wId === targetWeek.id)) continue;
    const summaryKey = fieldExists(wasTable, CONFIG.was.summaryKey)
      ? text(row, CONFIG.was.summaryKey)
      : "";
    if (summaryKey) {
      if (wasBySummaryKey.has(summaryKey)) {
        duplicateWasSkipped += 1;
        continue;
      }
      wasBySummaryKey.set(summaryKey, row);
    }
    if (wasByEnrollment.has(eId)) {
      duplicateWasSkipped += 1;
      continue;
    }
    wasByEnrollment.set(eId, row);
  }

  let armed = 0;
  let skipped = 0;
  let createdWas = 0;
  let errors = 0;

  debugStep = "4 - Arm builds";
  setOutputSafe("debugStep", debugStep);

  const weekKey = fieldExists(weeksTable, CONFIG.weeks.weekKey)
    ? text(targetWeek, CONFIG.weeks.weekKey)
    : "";

  for (const enr of enrollmentsQuery.records) {
    try {
      if (excluded.has(enr.id)) {
        skipped += 1;
        continue;
      }
      if (fieldExists(enrollmentsTable, CONFIG.enrollments.active) && !booleanish(enr, CONFIG.enrollments.active)) {
        skipped += 1;
        continue;
      }

      const parent = text(enr, CONFIG.enrollments.parentEmail);
      const athlete = text(enr, CONFIG.enrollments.athleteEmail);
      if (!parent && !athlete) {
        skipped += 1;
        continue;
      }

      const enrollmentKey = fieldExists(enrollmentsTable, CONFIG.enrollments.enrollmentKey)
        ? text(enr, CONFIG.enrollments.enrollmentKey)
        : "";
      const expectedSummaryKey =
        enrollmentKey && weekKey ? `${enrollmentKey}|${weekKey}` : "";

      let wasRow =
        (expectedSummaryKey && wasBySummaryKey.get(expectedSummaryKey))
        || wasByEnrollment.get(enr.id);
      if (!wasRow) {
        if (dryRun) {
          createdWas += 1;
          armed += 1;
          continue;
        }
        const createFields = {};
        createFields[CONFIG.was.enrollment] = [{ id: enr.id }];
        createFields[CONFIG.was.week] = [{ id: targetWeek.id }];
        const newId = await wasTable.createRecordAsync(createFields);
        wasRow = { id: newId };
        createdWas += 1;
        wasByEnrollment.set(enr.id, wasRow);
        if (expectedSummaryKey) wasBySummaryKey.set(expectedSummaryKey, wasRow);
      } else if (booleanish(wasRow, CONFIG.was.sent)) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        armed += 1;
        continue;
      }

      const update = {};
      if (fieldExists(wasTable, CONFIG.was.buildNow)) update[CONFIG.was.buildNow] = true;
      if (fieldExists(wasTable, CONFIG.was.sendMode)) update[CONFIG.was.sendMode] = { name: "Test" };
      if (Object.keys(update).length > 0) {
        await wasTable.updateRecordAsync(wasRow.id, update);
      }
      armed += 1;
    } catch (e) {
      errors += 1;
      console.log(`118 error enrollment ${enr.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    enrollmentsQuery.unloadData();
    weeksQuery.unloadData();
    wasQuery.unloadData();
  } catch {
    // older runtimes
  }

  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", dryRun ? "dry_run_complete" : "build_armed");
  setOutputSafe("errorOut", errors > 0 ? `${errors} enrollment errors` : "");
  setOutputSafe("armedCountOut", String(armed));
  setOutputSafe("skippedCountOut", String(skipped));
  setOutputSafe("createdWasCountOut", String(createdWas));
  setOutputSafe("errorCountOut", String(errors));
  setOutputSafe("scheduledWeekEndKeyOut", targetEndKey);
  setOutputSafe("targetWeekIdOut", targetWeek.id);
  setOutputSafe("duplicateWasSkippedOut", String(duplicateWasSkipped));
  setOutputSafe("debugStep", "complete");

  console.log(
    JSON.stringify({
      automation: CONFIG.scriptName,
      version: CONFIG.version,
      dryRun,
      emptyWeekPolicy,
      targetWeekId: targetWeek.id,
      scheduledWeekEndKey: targetEndKey,
      armed,
      skipped,
      createdWas,
      duplicateWasSkipped,
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
