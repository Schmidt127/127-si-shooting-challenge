/*
Automation: 117c - Zoom Recording Credit - Create Zoom XP Event (Stage 17)
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — DEV paste only when Mike authorizes
Last GitHub Update: 2026-07-18

Purpose:
Create or soft-void exactly one XP Event per Zoom Attendance Zoom Credit Key.

Trigger:
Zoom Attendance when Zoom Credit Approved? and Zoom XP Amount > 0

Important Tables:
Zoom Attendance, Zoom Meetings, XP Events, Enrollments

Important Fields:
Zoom Credit Key, Zoom Credit Approved?, Zoom Credit Conflict?, Zoom XP Amount,
XP Reason Public, XP Reason Debug, XP Activity Date, Source Key

Notes:
Stage 17 Zoom Attendance path. Does not use Homework Completions.
Skip GitHub header when pasting into Airtable.
*/

/************************************************************
 * 117c - Zoom Recording Credit - Create Zoom XP Event (Stage 17)
 *
 * Version: v1.1.0
 * Date Written: 2026-07-14
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.1.0 (2026-07-18): Canonical XP Activity Date + XP Bucket/Source for DEV;
 *   link Zoom Meeting; America/Denver date; validate select options; no HC writes.
 * - v1.0.0 (2026-07-14): Initial Stage 17 XP create/soft-void.
 *
 * PURPOSE
 * - Turn an Approved, non-conflicting Zoom Attendance recording-credit row into
 *   exactly one XP Event keyed by Zoom Credit Key.
 * - Soft-void (Active?=false) when approval later flips off / conflict.
 *
 * IMPORTANT DESIGN RULES
 * - Source Key = Zoom Credit Key = ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}
 * - Disjoint from live 101 keys (ZOOM_ATTEND_BASE|…).
 * - Amount from Zoom XP Amount formula (Config % of live) — do not rewrite Reward Rules.
 * - XP Bucket = Zoom Attendance; XP Source = Zoom Meeting Recording Quiz (DEV option).
 * - Date field = XP Activity Date (canonical on this base).
 * - Reasons: XP Reason Public / XP Reason Debug only.
 * - Never write Homework Completions.
 * - Never write Zoom Meetings.Attendees (live roster / Automation 101).
 * - Recheck-before-create; never steal another Source Key.
 *
 * INPUT
 * - recordId = Zoom Attendance record id
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep, xpEventId, xpPoints, sourceKeyOut
 *
 * TRIGGER
 * - Zoom Attendance · Zoom Credit Approved? · Zoom XP Amount > 0
 *
 * AUTOMATION NAME
 * - 117c - Zoom Recording Credit - Create Zoom XP Event
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117c - Zoom Recording Credit - Create Zoom XP Event",
  version: "v1.1.0",
  versionDate: "2026-07-18",
  originalWrittenDate: "2026-07-14",
  lastUpdated: "2026-07-18",
  folder: "17 - Zoom Recording Credit",
  automationName: "117c - Zoom Recording Credit - Create Zoom XP Event",
};

const CONFIG = {
  timeZone: "America/Denver",
  tables: {
    zoomAttendance: "Zoom Attendance",
    zoomMeetings: "Zoom Meetings",
    xpEvents: "XP Events",
  },
  za: {
    attendanceMethod: "Attendance Method",
    creditKey: "Zoom Credit Key",
    creditApproved: "Zoom Credit Approved?",
    creditConflict: "Zoom Credit Conflict?",
    xpAmount: "Zoom XP Amount",
    creditDebug: "Zoom Credit Debug",
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
  },
  zoom: {
    startTime: "Start Time",
    week: "Week",
  },
  xp: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    active: "Active?",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    xpActivityDate: "XP Activity Date",
    zoomMeeting: "Zoom Meeting",
    week: "Week",
    awardedBy: "Awarded By",
  },
  values: {
    xpBucket: "Zoom Attendance",
    xpSource: "Zoom Meeting Recording Quiz",
    reasonPublic: "Zoom recording quiz credit",
    recordingMethod: "Recording Quiz",
    awardedBy: "117c-stage17",
  },
};

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch (e) {
    console.log(`setOutputSafe(${key}) failed: ${e && e.message ? e.message : e}`);
  }
}

function requireRecId(recordId) {
  if (!recordId || typeof recordId !== "string" || !recordId.startsWith("rec")) {
    throw new Error(`Invalid recordId: ${recordId}`);
  }
  return recordId;
}

function fieldExists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch (e) {
    return false;
  }
}

function getLinkedIds(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (x && x.id) || x).filter(Boolean);
  if (v.id) return [v.id];
  return [];
}

function getText(record, fieldName) {
  try {
    const v = record.getCellValueAsString(fieldName);
    return v == null ? "" : String(v).trim();
  } catch (e) {
    return "";
  }
}

function getNumber(record, fieldName) {
  const raw = record.getCellValue(fieldName);
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw) && raw.length === 1) {
    return getNumber({ getCellValue: () => raw[0] }, "x");
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getCheckbox(record, fieldName) {
  const v = record.getCellValue(fieldName);
  if (v === true || v === 1 || v === "1") return true;
  if (Array.isArray(v) && v.length === 1) {
    return getCheckbox({ getCellValue: () => v[0] }, "x");
  }
  return false;
}

function isApproved(record, fieldName) {
  return getCheckbox(record, fieldName) || getNumber(record, fieldName) === 1;
}

function requireSingleSelectOption(table, fieldName, optionName) {
  const field = table.getField(fieldName);
  const choices = (field.options && field.options.choices) || [];
  const match = choices.find((c) => c && c.name === optionName);
  if (!match) {
    throw new Error(
      `Missing single-select option "${optionName}" on ${table.name}.${fieldName}. ` +
        `Add this DEV option before enabling 117c (Stage 17).`
    );
  }
  return { id: match.id, name: match.name };
}

function toDenverDateKey(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(dateObj).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateOnlyFromKey(dateKey) {
  const m = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

async function updateRecordSafe(table, recordId, fields) {
  const keys = Object.keys(fields || {});
  if (!keys.length) return;
  if (Object.prototype.hasOwnProperty.call(fields, "Attendees")) {
    throw new Error("Refuse write to Attendees — live roster reserved for Automation 101");
  }
  await table.updateRecordAsync(recordId, fields);
}

async function main() {
  let debugStep = "1 - Validate input";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("errorOut", "");
  setOutputSafe("sourceKeyOut", "");
  setOutputSafe("xpEventId", "");
  setOutputSafe("xpPoints", "");

  const cfg = input.config();
  const recordId = requireRecId(String(cfg.recordId || "").trim());

  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const zmTable = base.getTable(CONFIG.tables.zoomMeetings);

  debugStep = "2 - Validate XP schema";
  setOutputSafe("debugStep", debugStep);
  for (const name of [
    CONFIG.xp.sourceKey,
    CONFIG.xp.enrollment,
    CONFIG.xp.xpPoints,
    CONFIG.xp.xpBucket,
    CONFIG.xp.xpSource,
    CONFIG.xp.reasonPublic,
    CONFIG.xp.reasonDebug,
    CONFIG.xp.xpActivityDate,
  ]) {
    if (!fieldExists(xpTable, name)) {
      throw new Error(`XP Events missing required field: ${name}`);
    }
  }
  const bucketOpt = requireSingleSelectOption(xpTable, CONFIG.xp.xpBucket, CONFIG.values.xpBucket);
  const sourceOpt = requireSingleSelectOption(xpTable, CONFIG.xp.xpSource, CONFIG.values.xpSource);

  debugStep = "3 - Load Zoom Attendance row";
  setOutputSafe("debugStep", debugStep);
  const zaFields = Object.values(CONFIG.za).filter((n) => fieldExists(zaTable, n));
  const rec = await zaTable.selectRecordAsync(recordId, { fields: zaFields });
  if (!rec) throw new Error(`Zoom Attendance not found: ${recordId}`);

  const method = getText(rec, CONFIG.za.attendanceMethod);
  const key = getText(rec, CONFIG.za.creditKey);
  const approved = isApproved(rec, CONFIG.za.creditApproved);
  const conflict = isApproved(rec, CONFIG.za.creditConflict);
  const amount = getNumber(rec, CONFIG.za.xpAmount) || 0;
  const enrollIds = getLinkedIds(rec, CONFIG.za.enrollment);
  const meetingIds = getLinkedIds(rec, CONFIG.za.zoomMeeting);

  setOutputSafe("sourceKeyOut", key);

  if (method && method !== CONFIG.values.recordingMethod) {
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("actionOut", "skipped_not_recording_quiz");
    setOutputSafe("debugStep", "skipped_not_recording_quiz");
    console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, actionOut: "skipped_not_recording_quiz" }));
    return;
  }

  if (!key) {
    throw new Error("Blank Zoom Credit Key — refuse XP create");
  }
  if (!enrollIds.length) {
    throw new Error("Missing Enrollment link on Zoom Attendance");
  }
  if (!meetingIds.length) {
    throw new Error("Missing Zoom Meeting link on Zoom Attendance");
  }

  debugStep = "4 - Resolve meeting date (America/Denver)";
  setOutputSafe("debugStep", debugStep);
  let activityDate = null;
  const meetingId = meetingIds[0];
  const zmFieldList = [CONFIG.zoom.startTime, CONFIG.zoom.week].filter((n) => fieldExists(zmTable, n));
  const meeting = await zmTable.selectRecordAsync(meetingId, { fields: zmFieldList });
  if (meeting && fieldExists(zmTable, CONFIG.zoom.startTime)) {
    const start = meeting.getCellValue(CONFIG.zoom.startTime);
    if (start instanceof Date) {
      const keyDenver = toDenverDateKey(start);
      activityDate = dateOnlyFromKey(keyDenver);
    } else if (typeof start === "string" && start) {
      const parsed = new Date(start);
      if (!Number.isNaN(parsed.getTime())) {
        activityDate = dateOnlyFromKey(toDenverDateKey(parsed));
      }
    }
  }
  const weekIds =
    meeting && fieldExists(zmTable, CONFIG.zoom.week) ? getLinkedIds(meeting, CONFIG.zoom.week) : [];

  debugStep = "5 - Query XP Events by Source Key";
  setOutputSafe("debugStep", debugStep);
  const xpFieldList = [
    CONFIG.xp.sourceKey,
    CONFIG.xp.xpPoints,
    CONFIG.xp.active,
    CONFIG.xp.enrollment,
    CONFIG.xp.awardedBy,
  ].filter((n) => fieldExists(xpTable, n));
  const xpQuery = await xpTable.selectRecordsAsync({ fields: xpFieldList });
  const matches = xpQuery.records.filter((r) => getText(r, CONFIG.xp.sourceKey) === key);
  const existing = matches[0] || null;
  try {
    xpQuery.unloadData();
  } catch (e) {
    /* older runtimes */
  }

  debugStep = "6 - Branch approved / conflict";
  setOutputSafe("debugStep", debugStep);
  if (!approved || conflict || amount <= 0) {
    if (existing && fieldExists(xpTable, CONFIG.xp.active) && getCheckbox(existing, CONFIG.xp.active)) {
      await updateRecordSafe(xpTable, existing.id, { [CONFIG.xp.active]: false });
      setOutputSafe("statusOut", "success");
      setOutputSafe("actionOut", "deactivated_on_conflict");
      setOutputSafe("xpEventId", existing.id);
      setOutputSafe("xpPoints", "0");
      setOutputSafe("debugStep", "complete");
      console.log(
        JSON.stringify({
          automation: SCRIPT.scriptName,
          version: SCRIPT.version,
          actionOut: "deactivated_on_conflict",
          key,
        })
      );
      return;
    }
    setOutputSafe("statusOut", "skipped");
    setOutputSafe(
      "actionOut",
      !approved || conflict ? "skipped_not_approved" : "skipped_zero_amount"
    );
    setOutputSafe("xpEventId", existing ? existing.id : "");
    setOutputSafe("debugStep", "complete");
    return;
  }

  debugStep = "7 - Recheck before create";
  setOutputSafe("debugStep", debugStep);
  if (existing) {
    if (
      fieldExists(xpTable, CONFIG.xp.awardedBy) &&
      getText(existing, CONFIG.xp.awardedBy) &&
      getText(existing, CONFIG.xp.awardedBy) !== CONFIG.values.awardedBy &&
      !String(getText(existing, CONFIG.xp.awardedBy)).includes("117c")
    ) {
      throw new Error(
        `Source Key ${key} owned by another automation (${getText(existing, CONFIG.xp.awardedBy)}); refuse steal`
      );
    }
    const patch = {};
    if (fieldExists(xpTable, CONFIG.xp.xpPoints) && getNumber(existing, CONFIG.xp.xpPoints) !== amount) {
      patch[CONFIG.xp.xpPoints] = amount;
    }
    if (fieldExists(xpTable, CONFIG.xp.active) && !getCheckbox(existing, CONFIG.xp.active)) {
      patch[CONFIG.xp.active] = true;
    }
    if (Object.keys(patch).length) {
      await updateRecordSafe(xpTable, existing.id, patch);
      setOutputSafe("actionOut", "updated");
    } else {
      setOutputSafe("actionOut", "skipped_exists");
    }
    setOutputSafe("statusOut", "success");
    setOutputSafe("xpEventId", existing.id);
    setOutputSafe("xpPoints", String(amount));
    setOutputSafe("errorOut", "");
    setOutputSafe("debugStep", "complete");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "success",
        key,
        xpEventId: existing.id,
      })
    );
    return;
  }

  debugStep = "8 - Create XP Event";
  setOutputSafe("debugStep", debugStep);
  const createFields = {
    [CONFIG.xp.sourceKey]: key,
    [CONFIG.xp.xpPoints]: amount,
    [CONFIG.xp.active]: true,
    [CONFIG.xp.enrollment]: enrollIds.map((id) => ({ id })),
    [CONFIG.xp.xpBucket]: { id: bucketOpt.id },
    [CONFIG.xp.xpSource]: { id: sourceOpt.id },
    [CONFIG.xp.reasonPublic]: CONFIG.values.reasonPublic,
    [CONFIG.xp.reasonDebug]:
      getText(rec, CONFIG.za.creditDebug) || `C-025 ${SCRIPT.version} ${key}`,
  };
  if (fieldExists(xpTable, CONFIG.xp.zoomMeeting)) {
    createFields[CONFIG.xp.zoomMeeting] = meetingIds.map((id) => ({ id }));
  }
  if (fieldExists(xpTable, CONFIG.xp.week) && weekIds.length) {
    createFields[CONFIG.xp.week] = weekIds.map((id) => ({ id }));
  }
  if (fieldExists(xpTable, CONFIG.xp.xpActivityDate) && activityDate) {
    createFields[CONFIG.xp.xpActivityDate] = activityDate;
  }
  if (fieldExists(xpTable, CONFIG.xp.awardedBy)) {
    createFields[CONFIG.xp.awardedBy] = CONFIG.values.awardedBy;
  }

  const created = await xpTable.createRecordAsync(createFields);
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "created");
  setOutputSafe("xpEventId", created);
  setOutputSafe("xpPoints", String(amount));
  setOutputSafe("errorOut", "");
  setOutputSafe("debugStep", "complete");
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "created",
      key,
      xpEventId: created,
      amount,
      xpBucket: CONFIG.values.xpBucket,
      xpSource: CONFIG.values.xpSource,
    })
  );
}

try {
  await main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", msg);
  setOutputSafe("actionOut", "error");
  setOutputSafe("debugStep", "error");
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "error",
      errorOut: msg,
    })
  );
  throw err;
}
