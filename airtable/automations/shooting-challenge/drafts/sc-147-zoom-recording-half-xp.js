/*
Automation: XXX (TBD) - Zoom Recording Credit - Award Half XP (SC-147 DRAFT — SUPERSEDED)
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: SUPERSEDED — use 147-zoom-recording-credit-award-half-xp.js (v1.0)

Purpose:
Award half Zoom XP for approved recording credit distinct from live 101 attendance.

Trigger:
Zoom Attendance when recording approval satisfied and exclusivity guards pass.

Important Tables:
Zoom Attendance, Zoom Meetings, Enrollments, XP Reward Rules, XP Events, Weekly Athlete Summary

Important Fields:
Recording Quiz Satisfactory?, Zoom Credit Conflict?, Enrollment, Zoom Meeting, Source Key

Notes:
DRAFT ONLY — do not paste to Production until Mike approves SC-147 slot + XP Reward Rule row.
Does NOT replace or extend automation 117 (email handoff only).
Does NOT write Zoom Meetings.Attendees.
*/

/************************************************************
 * XXX (TBD) - ZOOM RECORDING HALF XP (SC-147)
 * Award Half XP from Approved Recording Credit
 *
 * Version: draft-sc-147
 * Date Written: 2026-08-30
 * Last Updated: 2026-08-30
 *
 * PURPOSE
 * - Runs from one Zoom Attendance record on the recording-credit path.
 * - Creates exactly one XP Event with Source Key
 *   ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}.
 * - Awards floor(live/2) XP from XP Reward Rules row ZOOM_RECORDING when present,
 *   else floor(ZOOM_ATTEND_BASE / 2) with optional Config percent override.
 * - Skips when live 101 credit already exists for the same meeting+enrollment.
 * - Skips when Zoom Credit Conflict? rollup equals 1.
 * - Idempotent: rerun skips when Source Key already exists on an active XP Event.
 *
 * IMPORTANT DESIGN RULES
 * - Live attendance remains automation 101 (ZOOM_ATTEND_* keys only).
 * - Automation 117 is email-only — this script must not create Email Handoff Queue rows.
 * - Never write Zoom Meetings.Attendees (gate may use Recording Attendees separately).
 * - Recording-only credit must NOT count toward Perfect Week (057 reads live Attendees).
 * - One source meeting+enrollment pair → at most one of live or recording active XP.
 * - Do not write formula/rollup/lookup/count fields.
 * - XP Events reason fields: XP Reason Public / XP Reason Debug.
 *
 * THIS IS NOT
 * - Live Zoom attendance award (101).
 * - Parent approval email send (117).
 * - Perfect Week eligibility calculation (057).
 *
 * FOLDER
 * - 17 - Zoom Recording Credit
 *
 * AUTOMATION NAME (placeholder)
 * - XXX - Zoom Recording Credit - Award Half XP (SC-147)
 *
 * TRIGGER TABLE
 * - Zoom Attendance
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Attendance Method is Recording Quiz (or equivalent catalog value)
 * - Recording Quiz Satisfactory? is checked
 * - Zoom Credit Conflict? is not 1
 *
 * DO NOT USE THIS TRIGGER ON
 * - Automation 117 email handoff path (different responsibility)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Zoom Attendance record ID
 *
 * REQUIRED OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created | skipped_* | error
 * - errorOut
 * - debugStep
 * - sourceKeyOut
 * - xpEventIdOut
 * - xpAmountOut
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "XXX - Zoom Recording Credit - Award Half XP (SC-147 DRAFT)",
  version: "draft-sc-147",
  versionDate: "2026-08-30",
  originalWrittenDate: "2026-08-30",
  lastUpdated: "2026-08-30",
  folder: "17 - Zoom Recording Credit",
  automationName: "XXX - Zoom Recording Credit - Award Half XP (SC-147 DRAFT)",
};

const CONFIG = {
  timeZone: "America/Denver",
  tables: {
    zoomAttendance: "Zoom Attendance",
    zoomMeetings: "Zoom Meetings",
    enrollments: "Enrollments",
    xpRewardRules: "XP Reward Rules",
    xpEvents: "XP Events",
    weeklySummary: "Weekly Athlete Summary",
    config: "Config",
  },
  zoomAttendance: {
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    satisfactory: "Recording Quiz Satisfactory?",
    conflict: "Zoom Credit Conflict?",
    week: "Week",
    xpEvent: "XP Event",
  },
  zoom: {
    attendees: "Attendees",
    week: "Week",
    startTime: "Start Time",
  },
  enrollments: {
    active: "Active?",
    progressProcessingEnabled: "Progress Processing Enabled?",
  },
  xpRewardRules: {
    ruleKey: "Rule Key",
    xpAmount: "XP Amount",
    active: "Active?",
  },
  xpEvents: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    xpPoints: "XP Points",
    xpBucket: "XP Bucket",
    xpSource: "XP Source",
    week: "Week",
    weeklySummary: "Weekly Athlete Summary",
    activityDate: "Activity Date",
    xpActivityDate: "XP Activity Date",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    active: "Active?",
    zoomMeeting: "Zoom Meeting",
    zoomAttendance: "Zoom Attendance",
    awardedBy: "Awarded By",
  },
  configFields: {
    xpPercent: "Zoom Recording XP Percent of Live",
  },
  values: {
    sourceKeyPrefix: "ZOOM_RECORDING_CREDIT",
    ruleKeyLiveBase: "ZOOM_ATTEND_BASE",
    ruleKeyRecording: "ZOOM_RECORDING",
    liveLegacyPrefix: "ZOOM_ATTEND_BASE",
    liveCanonicalPrefix: "ZOOM_LIVE",
    xpBucket: "Zoom",
    xpSource: "Zoom Recording",
  },
};

function setOutputSafe(key, value) {
  try {
    output.set(key, value);
  } catch (error) {
    console.log(`output.set failed for ${key}: ${error}`);
  }
}

function fieldExists(table, fieldName) {
  return Boolean(table.fields.find((f) => f.name === fieldName));
}

function getRaw(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  return record.getCellValue(fieldName);
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (!raw) return [];
  return Array.isArray(raw) ? raw.map((l) => l.id).filter(Boolean) : [];
}

function getFirstLinkedId(record, table, fieldName) {
  const ids = getLinkedIds(record, table, fieldName);
  return ids[0] || "";
}

function isTruthyFlag(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  return raw === true || raw === 1 || raw === "1";
}

function buildSourceKey(enrollmentId, zoomMeetingId) {
  return `${CONFIG.values.sourceKeyPrefix}|${enrollmentId}|${zoomMeetingId}`;
}

function isLiveFamilyKey(sourceKey) {
  const key = String(sourceKey || "");
  return (
    key.startsWith(`${CONFIG.values.liveLegacyPrefix}|`)
    || key.startsWith(`${CONFIG.values.liveCanonicalPrefix}|`)
  );
}

function isRecordingCreditKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${CONFIG.values.sourceKeyPrefix}|`);
}

function pairFromLiveKey(sourceKey) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3) return null;
  const [prefix, mid, enrollmentId] = parts;
  if (prefix === CONFIG.values.liveCanonicalPrefix) {
    return `${mid}|${enrollmentId}`;
  }
  if (prefix === CONFIG.values.liveLegacyPrefix && String(mid).startsWith("rec")) {
    return `${mid}|${enrollmentId}`;
  }
  return null;
}

function computeHalfXp(liveAmount, recordingRuleAmount, configPercent) {
  if (Number.isFinite(recordingRuleAmount) && recordingRuleAmount >= 0) {
    return Math.floor(Number(recordingRuleAmount));
  }
  const live = Number(liveAmount);
  if (!Number.isFinite(live) || live < 0) {
    throw new Error("Invalid live base XP amount");
  }
  if (configPercent !== null && configPercent !== undefined && configPercent !== "") {
    const pct = Math.trunc(Number(configPercent));
    if (pct >= 0 && pct <= 100) {
      return Math.floor((live * pct) / 100);
    }
  }
  return Math.floor(live / 2);
}

async function main() {
  setOutputSafe("debugStep", "start");
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  setOutputSafe("errorOut", "");
  setOutputSafe("sourceKeyOut", "");
  setOutputSafe("xpEventIdOut", "");
  setOutputSafe("xpAmountOut", 0);

  const inputConfig = input.config();
  const recordId = String(inputConfig.recordId || "").trim();
  if (!recordId.startsWith("rec")) {
    setOutputSafe("errorOut", "Missing or invalid recordId");
    setOutputSafe("debugStep", "validate_input");
    throw new Error("Missing or invalid recordId");
  }

  setOutputSafe("debugStep", "load_zoom_attendance");
  const zaTable = base.getTable(CONFIG.tables.zoomAttendance);
  const za = await zaTable.selectRecordAsync(recordId);
  if (!za) {
    setOutputSafe("errorOut", "Zoom Attendance record not found");
    throw new Error("Zoom Attendance record not found");
  }

  const enrollmentId = getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.enrollment);
  const meetingId = getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.zoomMeeting);
  if (!enrollmentId.startsWith("rec") || !meetingId.startsWith("rec")) {
    setOutputSafe("actionOut", "skipped_missing_links");
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("debugStep", "validate_links");
    return;
  }

  if (!isTruthyFlag(za, zaTable, CONFIG.zoomAttendance.satisfactory)) {
    setOutputSafe("actionOut", "skipped_not_satisfactory");
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("debugStep", "gate_satisfactory");
    return;
  }

  const conflictRaw = getRaw(za, zaTable, CONFIG.zoomAttendance.conflict);
  if (Number(conflictRaw) === 1) {
    setOutputSafe("actionOut", "skipped_conflict_rollup");
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("debugStep", "gate_conflict");
    return;
  }

  const sourceKey = buildSourceKey(enrollmentId, meetingId);
  setOutputSafe("sourceKeyOut", sourceKey);
  setOutputSafe("debugStep", "scan_existing_xp");

  const xpTable = base.getTable(CONFIG.tables.xpEvents);
  const xpQuery = await xpTable.selectRecordsAsync({
    fields: [
      CONFIG.xpEvents.sourceKey,
      CONFIG.xpEvents.active,
      CONFIG.xpEvents.enrollment,
    ],
  });

  let liveBlocks = false;
  let alreadyAwarded = false;
  const token = `${meetingId}|${enrollmentId}`;

  try {
    for (const row of xpQuery.records) {
      const key = getText(row, xpTable, CONFIG.xpEvents.sourceKey);
      const active = isTruthyFlag(row, xpTable, CONFIG.xpEvents.active);
      if (!active) continue;
      if (key === sourceKey) {
        alreadyAwarded = true;
        break;
      }
      if (isLiveFamilyKey(key)) {
        const pair = pairFromLiveKey(key);
        if (pair === token) {
          liveBlocks = true;
          break;
        }
      }
    }
  } finally {
    xpQuery.unloadData();
  }

  if (alreadyAwarded) {
    setOutputSafe("actionOut", "skipped_already_awarded");
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("debugStep", "idempotent_skip");
    return;
  }

  if (liveBlocks) {
    setOutputSafe("actionOut", "skipped_live_101_exists");
    setOutputSafe("statusOut", "skipped");
    setOutputSafe("debugStep", "live_exclusivity");
    return;
  }

  setOutputSafe("debugStep", "resolve_xp_rules");
  const rulesTable = base.getTable(CONFIG.tables.xpRewardRules);
  const rulesQuery = await rulesTable.selectRecordsAsync({
    fields: [
      CONFIG.xpRewardRules.ruleKey,
      CONFIG.xpRewardRules.xpAmount,
      CONFIG.xpRewardRules.active,
    ],
  });

  let liveRuleAmount = null;
  let recordingRuleAmount = null;
  try {
    for (const rule of rulesQuery.records) {
      if (!isTruthyFlag(rule, rulesTable, CONFIG.xpRewardRules.active)) continue;
      const ruleKey = getText(rule, rulesTable, CONFIG.xpRewardRules.ruleKey);
      const amount = Number(getText(rule, rulesTable, CONFIG.xpRewardRules.xpAmount));
      if (ruleKey === CONFIG.values.ruleKeyLiveBase) liveRuleAmount = amount;
      if (ruleKey === CONFIG.values.ruleKeyRecording) recordingRuleAmount = amount;
    }
  } finally {
    rulesQuery.unloadData();
  }

  if (liveRuleAmount === null) {
    setOutputSafe("errorOut", `Missing active XP Reward Rule ${CONFIG.values.ruleKeyLiveBase}`);
    setOutputSafe("debugStep", "missing_live_rule");
    throw new Error(`Missing active XP Reward Rule ${CONFIG.values.ruleKeyLiveBase}`);
  }

  let configPercent = null;
  try {
    const configTable = base.getTable(CONFIG.tables.config);
    const configQuery = await configTable.selectRecordsAsync({
      fields: [CONFIG.configFields.xpPercent],
    });
    try {
      const first = configQuery.records[0];
      if (first && fieldExists(configTable, CONFIG.configFields.xpPercent)) {
        configPercent = getRaw(first, configTable, CONFIG.configFields.xpPercent);
      }
    } finally {
      configQuery.unloadData();
    }
  } catch {
    // Config table optional for draft — floor(live/2) fallback remains.
  }

  const xpAmount = computeHalfXp(liveRuleAmount, recordingRuleAmount, configPercent);
  setOutputSafe("xpAmountOut", xpAmount);
  setOutputSafe("debugStep", "create_xp_event");

  const zmTable = base.getTable(CONFIG.tables.zoomMeetings);
  const zm = await zmTable.selectRecordAsync(meetingId, {
    fields: [CONFIG.zoom.startTime, CONFIG.zoom.week],
  });
  const weekId = zm ? getFirstLinkedId(zm, zmTable, CONFIG.zoom.week) : getFirstLinkedId(za, zaTable, CONFIG.zoomAttendance.week);

  const payload = {
    [CONFIG.xpEvents.sourceKey]: sourceKey,
    [CONFIG.xpEvents.enrollment]: [{ id: enrollmentId }],
    [CONFIG.xpEvents.xpPoints]: xpAmount,
    [CONFIG.xpEvents.xpBucket]: { name: CONFIG.values.xpBucket },
    [CONFIG.xpEvents.xpSource]: { name: CONFIG.values.xpSource },
    [CONFIG.xpEvents.active]: true,
    [CONFIG.xpEvents.reasonPublic]: "Zoom recording credit (half XP)",
    [CONFIG.xpEvents.reasonDebug]: `SC-147 ${SCRIPT.version} ${sourceKey}`,
    [CONFIG.xpEvents.awardedBy]: SCRIPT.automationName,
  };

  if (weekId) payload[CONFIG.xpEvents.week] = [{ id: weekId }];
  if (fieldExists(xpTable, CONFIG.xpEvents.zoomMeeting)) {
    payload[CONFIG.xpEvents.zoomMeeting] = [{ id: meetingId }];
  }
  if (fieldExists(xpTable, CONFIG.xpEvents.zoomAttendance)) {
    payload[CONFIG.xpEvents.zoomAttendance] = [{ id: recordId }];
  }

  const createdId = await xpTable.createRecordAsync(payload);
  setOutputSafe("xpEventIdOut", createdId);
  setOutputSafe("actionOut", "created");
  setOutputSafe("statusOut", "success");
  setOutputSafe("debugStep", "done");

  console.log(
    JSON.stringify({
      automation: SCRIPT.automationName,
      version: SCRIPT.version,
      recordId,
      sourceKey,
      xpAmount,
      xpEventId: createdId,
      enrollmentId,
      meetingId,
    }),
  );
}

try {
  await main();
} catch (error) {
  setOutputSafe("errorOut", error && error.message ? error.message : String(error));
  setOutputSafe("statusOut", "error");
  setOutputSafe("actionOut", "error");
  throw error;
}
