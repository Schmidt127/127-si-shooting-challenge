/*
Automation: 118 - Email - Schedule Weekly Summary Email Build
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth
Last Synced From Airtable: (new - not yet deployed)
Last GitHub Update: 2026-08-13

Purpose:
Sunday 5:00 AM America/Denver batch: ensure Weekly Athlete Summary rows for the
prior ended week and arm Build Weekly Email Now? so automation 072 builds packages.
Does not call Make. PROD schedule verified ON 2026-07-24.

Trigger:
At a scheduled time — Weekly — Sunday 05:00 — America/Denver

Notes:
Never commit webhook secrets. Exclude Schmidt test enrollment.
PROD season: dryRun=false + sendMode=Live (never Live+includeSchmidt).
*/

/************************************************************
 * 118 - Email - Schedule Weekly Summary Email Build
 *
 * Version: v2.0
 * Date Written: 2026-07-16
 * Last Updated: 2026-08-13
 *
 * VERSION HISTORY
 * - v2.0 (2026-08-13): Requires a settled exact Summary Key as well as exact
 *   Enrollment + Week before arming an eligible WAS; formula lag now stops
 *   safely instead of permitting an email handoff.
 * - v1.9 (2026-08-13): 031 is the sole Weekly Athlete Summary creator.
 *   This scheduler filters excluded/inactive enrollments before strict
 *   validation and only resolves one existing canonical WAS; it never creates
 *   a summary. Missing or ambiguous eligible identities stop safely.
 * - v1.8 (2026-08-13): Exact WAS owner identity hardening.
 * - v1.7 (2026-08-06): Program Instance isolation — Week End Date match rejects
 *   multi-PI collisions; enrollments armed only when Enrollment.Program Instance
 *   matches the target Week. Exclude both Schmidt test enrollment RIDs.
 * - v1.6 (2026-08-05): Airtable runtime compatibility — guard optional
 *   QueryResult.unloadData() cleanup so unsupported cleanup cannot fail an
 *   otherwise successful automation run.
 * - v1.5 (2026-07-24): PROD schedules verified ON. Read sendMode from input
 *   (Test|Live) when arming WAS — do not hardcode Test. Allow dryRun=false
 *   with sendMode=Live for parent season. Refuse Live + includeSchmidt.
 *   Remove stale "refuse Live when dryRun=false" hard stop (blocked PROD Live).
 * - v1.4 (2026-07-24): SC-035 approved — default emptyWeekPolicy = send_short.
 *   Package branching is enforced in automation **072 v4.0** (short / full /
 *   suppress). 118 still arms Build for empty weeks; 072 applies the policy.
 * - v1.3 (2026-07-24): Correct Summary Key documentation — live PROD shape
 *   verified 2026-07-23 is {Enrollment Key}|{Week Key} =
 *   ATH-{athleteRecId}|{schoolYear}|{weekRecId}, matching expectedSummaryKey.
 *   Enrollment+Week matching remains the fallback. Add emptyWeekPolicy input
 *   (default send_short). Older "schedules OFF" notes are historical.
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
 * - For each Active? enrollment (excluding Schmidt), resolve one existing WAS.
 * - Skip if Weekly Email Sent? or no cleaned email.
 * - Set Build Weekly Email Now? = true and WAS sendMode from input when dryRun=false.
 *
 * IMPORTANT DESIGN RULES
 * - Does not POST Make.
 * - Does not clear Weekly Email Sent?.
 * - dryRun=true (default) only counts; no writes.
 * - PROD season: dryRun=false and sendMode=Live (verified ON 2026-07-24).
 * - Schmidt enrollment excluded by default: recgP9qZYjAhE7NXm
 *   (override only via includeSchmidt=true for controlled Test-mode runs)
 * - Never combine includeSchmidt=true with sendMode=Live.
 * - Scheduled date key = prior Saturday Week End (America/Denver).
 * - Automation 031 is the sole create-capable Weekly Athlete Summary owner.
 * - Idempotent only when exactly one canonical WAS identity is provable;
 *   ambiguity or absence fails closed rather than selecting or creating one.
 *
 * FOLDER
 * - 07 - Email, Notifications, and External Handoffs
 *
 * TRIGGER TYPE
 * - At a scheduled time (Weekly Sunday 05:00 America/Denver)
 *
 * INPUT VARIABLES
 * - dryRun = "true" | "false" (default true)
 * - sendMode = "Test" | "Live" (default Test; PROD season uses Live)
 * - excludedEnrollmentIds = comma-separated (default includes Schmidt)
 * - includeSchmidt = "true" | "false" (default false). When true, the Schmidt
 *   test enrollment is NOT hard-excluded (Test-mode verification only).
 *   Never combine with sendMode=Live.
 * - emptyWeekPolicy = "send_short" | "send_normal" | "suppress" (default
 *   send_short). Operator record of SC-035; **072 enforces** package shape.
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep
 * - armedCountOut, skippedCountOut, createdWasCountOut, errorCountOut
 * - emptyWeekPolicyOut
 *
 * AUTHORITY
 * - docs/next-wave/was-email/EMPTY-WEEK-EMAIL-DECISION.md
 ************************************************************/

// @ts-nocheck

const CONFIG = {
  scriptName: "118 - Email - Schedule Weekly Summary Email Build",
  version: "v2.0",
  timeZone: "America/Denver",
  // Exclude both historical and current Schmidt test enrollments by default.
  schmidtEnrollmentId: "recCyFEPeATOVNlr9",
  schmidtEnrollmentIds: ["recCyFEPeATOVNlr9", "recgP9qZYjAhE7NXm"],

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
    programInstance: "Program Instance",
  },

  weeks: {
    endDate: "End Date",
    weekEndKey: "Week End Key",
    weekKey: "Week Key",
    weekCode: "Week Code",
    active: "Active?",
    activeWeek: "Active Week?",
    programInstance: "Program Instance",
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

/**
 * Airtable Scripting sometimes exposes unloadData on QueryResult; some automation
 * runtimes do not. Never let cleanup throw after successful business work.
 */
function unloadQuerySafe(queryResult) {
  if (typeof queryResult?.unloadData === "function") {
    try {
      queryResult.unloadData();
    } catch (error) {
      console.log(
        "Query unloadData skipped/failed (non-fatal)",
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
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

function exactlyOneLinkedId(record, fieldName) {
  const ids = [...new Set(linkedIds(record, fieldName))];
  return ids.length === 1 ? ids[0] : "";
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
  const sendModeRaw = String(inputConfig.sendMode || "Test").trim().toLowerCase();
  const sendMode = sendModeRaw === "live" ? "Live" : "Test";
  const includeSchmidt = parseBool(inputConfig.includeSchmidt, false);
  const emptyWeekPolicyRaw = String(inputConfig.emptyWeekPolicy || "send_short")
    .trim()
    .toLowerCase();
  const emptyWeekPolicy = ["send_normal", "send_short", "suppress"].includes(emptyWeekPolicyRaw)
    ? emptyWeekPolicyRaw
    : "send_short";
  setOutputSafe("emptyWeekPolicyOut", emptyWeekPolicy);
  setOutputSafe("sendModeOut", sendMode);
  const excluded = new Set(
    String(inputConfig.excludedEnrollmentIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (!includeSchmidt) {
    for (const id of CONFIG.schmidtEnrollmentIds || [CONFIG.schmidtEnrollmentId]) {
      excluded.add(id);
    }
  }

  // Never Live-send to Schmidt test enrollment via schedule.
  if (sendMode === "Live" && includeSchmidt) {
    throw new Error("118 refuses sendMode=Live when includeSchmidt=true.");
  }

  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const wasTable = base.getTable(CONFIG.tables.was);

  debugStep = "2 - Resolve target week";
  setOutputSafe("debugStep", debugStep);

  const targetEndKey = priorSaturdayKeyDenver();
  const weekFields = safeFields(weeksTable, Object.values(CONFIG.weeks));
  let weeksQuery = null;
  let enrollmentsQuery = null;
  let wasQuery = null;

  try {
  weeksQuery = await weeksTable.selectRecordsAsync({ fields: weekFields });

  function weekIsActive(w) {
    if (fieldExists(weeksTable, CONFIG.weeks.activeWeek) && booleanish(w, CONFIG.weeks.activeWeek)) {
      return true;
    }
    if (fieldExists(weeksTable, CONFIG.weeks.active) && booleanish(w, CONFIG.weeks.active)) {
      return true;
    }
    // If neither Active field exists, treat as eligible.
    if (
      !fieldExists(weeksTable, CONFIG.weeks.activeWeek) &&
      !fieldExists(weeksTable, CONFIG.weeks.active)
    ) {
      return true;
    }
    return false;
  }

  const endDateMatches = [];
  for (const w of weeksQuery.records) {
    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));
    if (endKey === targetEndKey) {
      endDateMatches.push(w);
    }
  }

  let targetCandidates = endDateMatches.filter((w) => weekIsActive(w));
  if (targetCandidates.length === 0) {
    targetCandidates = endDateMatches;
  }

  if (targetCandidates.length > 1) {
    const diag = targetCandidates
      .map((w) => {
        const pi = linkedIds(w, CONFIG.weeks.programInstance)[0] || "no-pi";
        return `${w.id}|PI=${pi}`;
      })
      .join("; ");
    throw new Error(
      `Multiple Weeks matched End Date/Key ${targetEndKey} (${targetCandidates.length}). ` +
        `Program Instance collision — deactivate overlapping fixtures or use a dedicated test PI. ` +
        `Candidates: ${diag}`
    );
  }

  const targetWeek = targetCandidates[0] || null;

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

  const targetWeekProgramInstanceId = fieldExists(weeksTable, CONFIG.weeks.programInstance)
    ? exactlyOneLinkedId(targetWeek, CONFIG.weeks.programInstance)
    : "";

  if (fieldExists(weeksTable, CONFIG.weeks.programInstance) && !targetWeekProgramInstanceId) {
    throw new Error(`Target Week ${targetWeek.id} must have exactly one Program Instance.`);
  }

  debugStep = "3 - Load enrollments + WAS";
  setOutputSafe("debugStep", debugStep);

  const enrFields = safeFields(enrollmentsTable, Object.values(CONFIG.enrollments));
  enrollmentsQuery = await enrollmentsTable.selectRecordsAsync({ fields: enrFields });

  const wasFields = safeFields(wasTable, Object.values(CONFIG.was));
  wasQuery = await wasTable.selectRecordsAsync({ fields: wasFields });

  const wasByEnrollment = new Map();
  const wasBySummaryKey = new Map();
  let duplicateWasSkipped = 0;
  for (const row of wasQuery.records) {
    const eId = exactlyOneLinkedId(row, CONFIG.was.enrollment);
    const wId = exactlyOneLinkedId(row, CONFIG.was.week);
    if (!(eId && wId === targetWeek.id)) continue;
    const summaryKey = fieldExists(wasTable, CONFIG.was.summaryKey)
      ? text(row, CONFIG.was.summaryKey)
      : "";
    if (summaryKey) {
      wasBySummaryKey.set(summaryKey, [...(wasBySummaryKey.get(summaryKey) || []), row]);
    }
    wasByEnrollment.set(eId, [...(wasByEnrollment.get(eId) || []), row]);
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
      if (targetWeekProgramInstanceId && fieldExists(enrollmentsTable, CONFIG.enrollments.programInstance)) {
        const enrPi = exactlyOneLinkedId(enr, CONFIG.enrollments.programInstance);
        if (enrPi !== targetWeekProgramInstanceId) {
          skipped += 1;
          continue;
        }
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
      if (!expectedSummaryKey) {
        skipped += 1;
        console.log(
          `118 skipped unsettled canonical Summary Key for eligible Enrollment ${enr.id} + Week ${targetWeek.id}.`
        );
        continue;
      }

      const candidates = (wasBySummaryKey.get(expectedSummaryKey) || []).filter(
        row =>
          exactlyOneLinkedId(row, CONFIG.was.enrollment) === enr.id
          && exactlyOneLinkedId(row, CONFIG.was.week) === targetWeek.id
      );
      if (candidates.length > 1) {
        duplicateWasSkipped += 1;
        skipped += 1;
        console.log(`118 skipped ambiguous WAS identity for Enrollment ${enr.id} + Week ${targetWeek.id}: ${candidates.map(row => row.id).join(", ")}`);
        continue;
      }
      let wasRow = candidates[0];
      if (!wasRow) {
        skipped += 1;
        console.log(
          `118 skipped missing canonical WAS for eligible Enrollment ${enr.id} + Week ${targetWeek.id}; 031 is the sole WAS creator.`
        );
        continue;
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
      if (fieldExists(wasTable, CONFIG.was.sendMode)) update[CONFIG.was.sendMode] = { name: sendMode };
      if (Object.keys(update).length > 0) {
        await wasTable.updateRecordAsync(wasRow.id, update);
      }
      armed += 1;
    } catch (e) {
      errors += 1;
      console.log(`118 error enrollment ${enr.id}: ${e instanceof Error ? e.message : String(e)}`);
      // A run that cannot prove a single owner must stop before it can arm
      // further email builds. Any prior write remains visible for controlled
      // retry; this script never attempts destructive cleanup.
      throw e;
    }
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
  } finally {
    unloadQuerySafe(enrollmentsQuery);
    unloadQuerySafe(weeksQuery);
    unloadQuerySafe(wasQuery);
  }
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
