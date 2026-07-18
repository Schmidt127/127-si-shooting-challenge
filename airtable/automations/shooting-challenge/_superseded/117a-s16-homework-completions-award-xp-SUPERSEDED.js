/*
Automation: 117a - Zoom Recording Credit - Award XP from Quiz Completion
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth — READY FOR DEV INSTALL (not installed/verified in live Airtable by this commit)
Last GitHub Update: 2026-07-18

Purpose:
Award partial Zoom XP when a Zoom Recording Quiz Homework Completion is marked Satisfactory.

Trigger:
Homework Completions when Completion Status becomes Satisfactory and Zoom Meeting is linked
(confirm exact conditions in Airtable UI after DEV install).

Important Tables:
Homework Completions, Zoom Meetings, Enrollments, XP Reward Rules, XP Events, Config, Weeks

Important Fields:
Completion Status, Enrollment, Zoom Meeting, Source Key, Recording Attendees

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy — DEV paste only after Mike/OMNI schema prep.
Does NOT modify automation 101 live attendance logic.
*/

/************************************************************
 * 117a - ZOOM RECORDING CREDIT
 * Award XP from Quiz Completion (C-025)
 *
 * Version: v1.1
 * Date Written: 2026-07-15
 * Last Updated: 2026-07-18
 *
 * VERSION HISTORY
 * - v1.1 (2026-07-18): Align XP reason writes to canonical XP Reason Public / XP Reason Debug
 *   (schema snapshots + other XP workflows; bare Reason Public/Debug were non-writable typos).
 * - v1.0 (2026-07-15): Initial repository package from S16-approved design.
 *
 * PURPOSE
 * - Runs from one Homework Completion (Zoom Recording Quiz) when Satisfactory.
 * - Awards ZOOM_RECORDING|{meetingId}|{enrollmentId} XP Event at Config % of live base.
 * - Skips when live credit already exists for the same meeting+enrollment pair.
 * - Optionally links Enrollment onto Zoom Meetings.Recording Attendees for gate credit.
 *
 * IMPORTANT DESIGN RULES
 * - Never hardcode XP percent — read Config `Zoom Recording XP Percent of Live` (fallback 50).
 * - Live attendance remains automation 101 (`ZOOM_ATTEND_*` keys).
 * - Recording family is only `ZOOM_RECORDING|*`.
 * - One source pair → at most one of live or recording active XP.
 * - Idempotent: rerun skips when Source Key already exists.
 * - Do not write formula/rollup/lookup/count fields.
 * - XP Events reason fields are canonical: XP Reason Public / XP Reason Debug
 *   (not bare Reason Public / Reason Debug).
 *
 * THIS IS NOT
 * - Live Zoom attendance award (101).
 * - Parent approval email send (117b).
 * - Perfect Week eligibility rewrite (057) — Config toggle documented for OMNI follow-up.
 *
 * FOLDER
 * - 10 - Zoom Attendance and Recording Credit
 *
 * AUTOMATION NAME
 * - 117a - Zoom Recording Credit - Award XP from Quiz Completion
 *
 * TRIGGER TABLE
 * - Homework Completions
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - Completion Status is Satisfactory
 * - Zoom Meeting is not empty
 * - Enrollment is not empty
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - Homework Assignment name/type indicates Zoom Recording Quiz (confirm catalog naming in DEV)
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - Needs Review alone (would award before coach approval when Config requires Satisfactory)
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = Homework Completion record ID
 *
 * OUTPUTS
 * - statusOut = success | skipped | error
 * - actionOut = created | skipped_* | error
 * - errorOut
 * - debugStep
 * - sourceKeyOut
 * - xpEventIdOut
 * - xpAmountOut
 * - enrollmentIdOut
 * - meetingIdOut
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "117a - Zoom Recording Credit - Award XP from Quiz Completion",
  version: "v1.1",
  versionNumber: "v1.1",
  versionDate: "2026-07-18",
  originalWrittenDate: "2026-07-15",
  lastUpdated: "2026-07-18",
  folder: "10 - Zoom Attendance and Recording Credit",
  automationName: "117a - Zoom Recording Credit - Award XP from Quiz Completion",
};

const CONFIG = {
  timeZone: "America/Denver",
  tables: {
    homeworkCompletions: "Homework Completions",
    zoomMeetings: "Zoom Meetings",
    enrollments: "Enrollments",
    xpRewardRules: "XP Reward Rules",
    xpEvents: "XP Events",
    config: "Config",
    weeks: "Weeks",
  },
  homework: {
    enrollment: "Enrollment",
    zoomMeeting: "Zoom Meeting",
    completionStatus: "Completion Status",
    satisfactory: "Satisfactory?",
    week: "Week",
    activityDate: "Activity Date",
    xpEvent: "XP Event",
  },
  zoom: {
    attendees: "Attendees",
    recordingAttendees: "Recording Attendees",
    recordingAvailableAt: "Recording Available At",
    makeupWindowDaysOverride: "Makeup Window Days Override",
    deadlineModeOverride: "Deadline Mode Override",
    zoomMeetingKey: "Zoom Meeting Key",
    week: "Week",
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
    activityDate: "Activity Date",
    reasonPublic: "XP Reason Public",
    reasonDebug: "XP Reason Debug",
    active: "Active?",
    zoomMeeting: "Zoom Meeting",
    homeworkCompletion: "Homework Completion",
  },
  configFields: {
    xpPercent: "Zoom Recording XP Percent of Live",
    gateCredit: "Recording Gives Full Zoom Gate Credit?",
    makeupDays: "Zoom Recording Makeup Window Days",
    deadlineMode: "Zoom Recording Deadline Mode",
    requiresApproval: "Recording Quiz Requires Coach Approval?",
  },
  weeks: {
    endDate: "End Date",
  },
  values: {
    ruleKeyLiveBase: "ZOOM_ATTEND_BASE",
    recordingPrefix: "ZOOM_RECORDING",
    liveCanonicalPrefix: "ZOOM_LIVE",
    liveLegacyPrefix: "ZOOM_ATTEND_BASE",
    xpBucket: "Zoom",
    xpSource: "Zoom Recording",
    satisfactoryName: "Satisfactory",
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

function getNumber(record, table, fieldName, fallback = 0) {
  const raw = getRaw(record, table, fieldName);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = getText(record, table, fieldName);
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function getCheckbox(record, table, fieldName, fallback = false) {
  if (!fieldExists(table, fieldName)) return fallback;
  const raw = getRaw(record, table, fieldName);
  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  return fallback;
}

function getLinkedIds(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => item && item.id).filter(Boolean);
}

function firstLinkedId(record, table, fieldName) {
  return getLinkedIds(record, table, fieldName)[0] || "";
}

function isValidRecordId(recordId) {
  return Boolean(recordId) && String(recordId).startsWith("rec");
}

function toDateKeyFromText(textValue) {
  const text = String(textValue || "").trim();
  if (!text) return "";
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[1].padStart(2, "0")}-${localMatch[2].padStart(2, "0")}`;
  }
  return "";
}

function toDateKeyFromDateObject(value, timeZone = CONFIG.timeZone) {
  if (!value) return "";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function toSafeDateKey(record, table, fieldName) {
  const raw = getRaw(record, table, fieldName);
  const text = getText(record, table, fieldName);
  const fromText = toDateKeyFromText(text);
  if (fromText) return fromText;
  return toDateKeyFromDateObject(raw, CONFIG.timeZone);
}

function addCalendarDays(dateKey, days) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function buildRecordingSourceKey(meetingId, enrollmentId) {
  return `${CONFIG.values.recordingPrefix}|${meetingId}|${enrollmentId}`;
}

function isLiveFamilyKey(sourceKey) {
  const key = String(sourceKey || "");
  return key.startsWith(`${CONFIG.values.liveCanonicalPrefix}|`)
    || key.startsWith(`${CONFIG.values.liveLegacyPrefix}|`);
}

function isRecordingFamilyKey(sourceKey) {
  return String(sourceKey || "").startsWith(`${CONFIG.values.recordingPrefix}|`);
}

function meetingEnrollmentFromKey(sourceKey) {
  const parts = String(sourceKey || "").split("|");
  if (parts.length < 3) return null;
  return { prefix: parts[0], meetingToken: parts[1], enrollmentId: parts[2] };
}

async function main() {
  let debugStep = "Start";
  setOutputSafe("debugStep", debugStep);
  setOutputSafe("statusOut", "");
  setOutputSafe("actionOut", "");
  setOutputSafe("errorOut", "");
  setOutputSafe("sourceKeyOut", "");
  setOutputSafe("xpEventIdOut", "");
  setOutputSafe("xpAmountOut", 0);
  setOutputSafe("enrollmentIdOut", "");
  setOutputSafe("meetingIdOut", "");

  try {
    debugStep = "1 - Validate recordId";
    setOutputSafe("debugStep", debugStep);
    const inputConfig = input.config();
    const recordId = String(inputConfig.recordId || "").trim();
    if (!isValidRecordId(recordId)) {
      throw new Error(`Invalid recordId input: expected Homework Completion id starting with "rec". Got: ${recordId || "(empty)"}`);
    }

    debugStep = "2 - Load tables";
    setOutputSafe("debugStep", debugStep);
    const hcTable = base.getTable(CONFIG.tables.homeworkCompletions);
    const zoomTable = base.getTable(CONFIG.tables.zoomMeetings);
    const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);
    const rulesTable = base.getTable(CONFIG.tables.xpRewardRules);
    const xpEventsTable = base.getTable(CONFIG.tables.xpEvents);
    const configTable = base.getTable(CONFIG.tables.config);
    const weeksTable = base.getTable(CONFIG.tables.weeks);

    debugStep = "3 - Load Homework Completion";
    setOutputSafe("debugStep", debugStep);
    const completion = await hcTable.selectRecordAsync(recordId);
    if (!completion) {
      throw new Error(`Homework Completion not found: ${recordId}`);
    }

    const enrollmentId = firstLinkedId(completion, hcTable, CONFIG.homework.enrollment);
    const meetingId = firstLinkedId(completion, hcTable, CONFIG.homework.zoomMeeting);
    setOutputSafe("enrollmentIdOut", enrollmentId);
    setOutputSafe("meetingIdOut", meetingId);

    if (!isValidRecordId(enrollmentId) || !isValidRecordId(meetingId)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_missing_enrollment_or_meeting");
      setOutputSafe("errorOut", "Homework Completion must link Enrollment and Zoom Meeting.");
      console.log(JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "skipped",
        actionOut: "skipped_missing_enrollment_or_meeting",
      }));
      return;
    }

    const statusText = getText(completion, hcTable, CONFIG.homework.completionStatus);
    const satisfactoryCheckbox = getCheckbox(completion, hcTable, CONFIG.homework.satisfactory, false);
    const isSatisfactory = satisfactoryCheckbox
      || statusText.toLowerCase().includes("satisfactory");

    debugStep = "4 - Load Config + meeting + enrollment";
    setOutputSafe("debugStep", debugStep);
    const configQuery = await configTable.selectRecordsAsync({ fields: Object.values(CONFIG.configFields).filter((name) => fieldExists(configTable, name)) });
    const configRecord = configQuery.records[0] || null;
    const configValues = {
      "Zoom Recording XP Percent of Live": configRecord
        ? getNumber(configRecord, configTable, CONFIG.configFields.xpPercent, 50)
        : 50,
      "Recording Gives Full Zoom Gate Credit?": configRecord
        ? getCheckbox(configRecord, configTable, CONFIG.configFields.gateCredit, true)
        : true,
      "Zoom Recording Makeup Window Days": configRecord
        ? getNumber(configRecord, configTable, CONFIG.configFields.makeupDays, 7)
        : 7,
      "Zoom Recording Deadline Mode": configRecord
        ? (getText(configRecord, configTable, CONFIG.configFields.deadlineMode) || "Later of Both")
        : "Later of Both",
      "Recording Quiz Requires Coach Approval?": configRecord
        ? getCheckbox(configRecord, configTable, CONFIG.configFields.requiresApproval, true)
        : true,
    };
    if (configQuery.records.length) {
      // unload large queries when supported
      try { configQuery.unloadData(); } catch (e) { /* ignore */ }
    }

    if (configValues["Recording Quiz Requires Coach Approval?"] && !isSatisfactory) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_awaiting_coach_approval");
      console.log(JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "skipped",
        actionOut: "skipped_awaiting_coach_approval",
      }));
      return;
    }

    const enrollment = await enrollmentsTable.selectRecordAsync(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }
    if (fieldExists(enrollmentsTable, CONFIG.enrollments.active)
      && !getCheckbox(enrollment, enrollmentsTable, CONFIG.enrollments.active, true)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_inactive_enrollment");
      return;
    }
    if (fieldExists(enrollmentsTable, CONFIG.enrollments.progressProcessingEnabled)
      && !getCheckbox(enrollment, enrollmentsTable, CONFIG.enrollments.progressProcessingEnabled, true)) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_progress_disabled");
      return;
    }

    const meeting = await zoomTable.selectRecordAsync(meetingId);
    if (!meeting) {
      throw new Error(`Zoom Meeting not found: ${meetingId}`);
    }

    debugStep = "5 - Deadline check";
    setOutputSafe("debugStep", debugStep);
    const availableAtKey = toSafeDateKey(meeting, zoomTable, CONFIG.zoom.recordingAvailableAt);
    const weekId = firstLinkedId(completion, hcTable, CONFIG.homework.week)
      || firstLinkedId(meeting, zoomTable, CONFIG.zoom.week);
    let weekEndKey = "";
    if (weekId) {
      const week = await weeksTable.selectRecordAsync(weekId);
      if (week) weekEndKey = toSafeDateKey(week, weeksTable, CONFIG.weeks.endDate);
    }
    const activityDateKey = toSafeDateKey(completion, hcTable, CONFIG.homework.activityDate)
      || toDateKeyFromDateObject(new Date(), CONFIG.timeZone);

    if (availableAtKey && weekEndKey) {
      const daysOverrideRaw = fieldExists(zoomTable, CONFIG.zoom.makeupWindowDaysOverride)
        ? getRaw(meeting, zoomTable, CONFIG.zoom.makeupWindowDaysOverride)
        : null;
      const modeOverride = fieldExists(zoomTable, CONFIG.zoom.deadlineModeOverride)
        ? getText(meeting, zoomTable, CONFIG.zoom.deadlineModeOverride)
        : "";
      const days = (daysOverrideRaw !== null && daysOverrideRaw !== undefined && daysOverrideRaw !== "")
        ? Number(daysOverrideRaw)
        : Number(configValues["Zoom Recording Makeup Window Days"]);
      const mode = modeOverride || configValues["Zoom Recording Deadline Mode"];
      const daysDeadline = addCalendarDays(availableAtKey, days);
      let deadline = daysDeadline;
      if (mode === "End of Program Week") deadline = weekEndKey;
      else if (mode === "Earlier of Both") deadline = daysDeadline < weekEndKey ? daysDeadline : weekEndKey;
      else if (mode === "Later of Both") deadline = daysDeadline > weekEndKey ? daysDeadline : weekEndKey;
      else deadline = daysDeadline;
      if (activityDateKey > deadline) {
        setOutputSafe("statusOut", "skipped");
        setOutputSafe("actionOut", "skipped_past_makeup_deadline");
        return;
      }
    }

    debugStep = "6 - Resolve live XP base amount";
    setOutputSafe("debugStep", debugStep);
    const rulesQuery = await rulesTable.selectRecordsAsync({
      fields: [
        CONFIG.xpRewardRules.ruleKey,
        CONFIG.xpRewardRules.xpAmount,
        CONFIG.xpRewardRules.active,
      ].filter((name) => fieldExists(rulesTable, name)),
    });
    let liveBaseXp = null;
    for (const rule of rulesQuery.records) {
      const key = getText(rule, rulesTable, CONFIG.xpRewardRules.ruleKey);
      const active = !fieldExists(rulesTable, CONFIG.xpRewardRules.active)
        || getCheckbox(rule, rulesTable, CONFIG.xpRewardRules.active, true);
      if (active && key === CONFIG.values.ruleKeyLiveBase) {
        liveBaseXp = getNumber(rule, rulesTable, CONFIG.xpRewardRules.xpAmount, 0);
        break;
      }
    }
    try { rulesQuery.unloadData(); } catch (e) { /* ignore */ }
    if (liveBaseXp === null) {
      throw new Error(`Active XP Reward Rule not found for Rule Key ${CONFIG.values.ruleKeyLiveBase}`);
    }
    const pct = Number(configValues["Zoom Recording XP Percent of Live"]);
    const xpAmount = Math.floor((Number(liveBaseXp) * pct) / 100);
    setOutputSafe("xpAmountOut", xpAmount);
    if (xpAmount <= 0) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_zero_xp");
      return;
    }

    const sourceKey = buildRecordingSourceKey(meetingId, enrollmentId);
    setOutputSafe("sourceKeyOut", sourceKey);

    debugStep = "7 - Exclusivity + idempotency scan";
    setOutputSafe("debugStep", debugStep);
    const xpQuery = await xpEventsTable.selectRecordsAsync({
      fields: [
        CONFIG.xpEvents.sourceKey,
        CONFIG.xpEvents.active,
        CONFIG.xpEvents.enrollment,
      ].filter((name) => fieldExists(xpEventsTable, name)),
    });

    let existingRecordingId = "";
    let liveExists = false;
    for (const row of xpQuery.records) {
      const key = getText(row, xpEventsTable, CONFIG.xpEvents.sourceKey);
      const active = !fieldExists(xpEventsTable, CONFIG.xpEvents.active)
        || getCheckbox(row, xpEventsTable, CONFIG.xpEvents.active, true);
      if (!active || !key) continue;
      if (key === sourceKey) {
        existingRecordingId = row.id;
        continue;
      }
      const parsed = meetingEnrollmentFromKey(key);
      if (!parsed || parsed.enrollmentId !== enrollmentId) continue;
      if (isRecordingFamilyKey(key) && parsed.meetingToken === meetingId) {
        existingRecordingId = row.id;
        continue;
      }
      if (isLiveFamilyKey(key)) {
        const meetingToken = parsed.meetingToken;
        const meetingKey = fieldExists(zoomTable, CONFIG.zoom.zoomMeetingKey)
          ? getText(meeting, zoomTable, CONFIG.zoom.zoomMeetingKey)
          : meetingId;
        if (meetingToken === meetingId || meetingToken === meetingKey) {
          liveExists = true;
        }
      }
    }
    try { xpQuery.unloadData(); } catch (e) { /* ignore */ }

    if (existingRecordingId) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_already_awarded");
      setOutputSafe("xpEventIdOut", existingRecordingId);
      return;
    }
    if (liveExists) {
      setOutputSafe("statusOut", "skipped");
      setOutputSafe("actionOut", "skipped_live_exists");
      return;
    }

    debugStep = "8 - Create XP Event";
    setOutputSafe("debugStep", debugStep);
    const xpFields = {};
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.sourceKey)) {
      xpFields[CONFIG.xpEvents.sourceKey] = sourceKey;
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.enrollment)) {
      xpFields[CONFIG.xpEvents.enrollment] = [{ id: enrollmentId }];
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.xpPoints)) {
      xpFields[CONFIG.xpEvents.xpPoints] = xpAmount;
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.xpBucket)) {
      xpFields[CONFIG.xpEvents.xpBucket] = { name: CONFIG.values.xpBucket };
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.xpSource)) {
      xpFields[CONFIG.xpEvents.xpSource] = { name: CONFIG.values.xpSource };
    }
    if (weekId && fieldExists(xpEventsTable, CONFIG.xpEvents.week)) {
      xpFields[CONFIG.xpEvents.week] = [{ id: weekId }];
    }
    if (activityDateKey && fieldExists(xpEventsTable, CONFIG.xpEvents.activityDate)) {
      // date fields: prefer Date object at noon UTC for date-only
      const [y, m, d] = activityDateKey.split("-").map(Number);
      xpFields[CONFIG.xpEvents.activityDate] = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.reasonPublic)) {
      xpFields[CONFIG.xpEvents.reasonPublic] = "Zoom recording quiz credit";
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.reasonDebug)) {
      xpFields[CONFIG.xpEvents.reasonDebug] = `C-025 ${SCRIPT.version} ${sourceKey}`;
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.active)) {
      xpFields[CONFIG.xpEvents.active] = true;
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.zoomMeeting)) {
      xpFields[CONFIG.xpEvents.zoomMeeting] = [{ id: meetingId }];
    }
    if (fieldExists(xpEventsTable, CONFIG.xpEvents.homeworkCompletion)) {
      xpFields[CONFIG.xpEvents.homeworkCompletion] = [{ id: recordId }];
    }

    const xpEventId = await xpEventsTable.createRecordAsync(xpFields);
    setOutputSafe("xpEventIdOut", xpEventId);

    debugStep = "9 - Gate credit link (Recording Attendees)";
    setOutputSafe("debugStep", debugStep);
    if (configValues["Recording Gives Full Zoom Gate Credit?"]
      && fieldExists(zoomTable, CONFIG.zoom.recordingAttendees)) {
      const existing = getLinkedIds(meeting, zoomTable, CONFIG.zoom.recordingAttendees);
      if (!existing.includes(enrollmentId)) {
        await zoomTable.updateRecordAsync(meetingId, {
          [CONFIG.zoom.recordingAttendees]: [...existing, enrollmentId].map((id) => ({ id })),
        });
      }
    }

    if (fieldExists(hcTable, CONFIG.homework.xpEvent)) {
      await hcTable.updateRecordAsync(recordId, {
        [CONFIG.homework.xpEvent]: [{ id: xpEventId }],
      });
    }

    setOutputSafe("statusOut", "success");
    setOutputSafe("actionOut", "created");
    setOutputSafe("debugStep", "Done");
    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "created",
      sourceKeyOut: sourceKey,
      xpEventIdOut: xpEventId,
      xpAmountOut: xpAmount,
      enrollmentIdOut: enrollmentId,
      meetingIdOut: meetingId,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setOutputSafe("statusOut", "error");
    setOutputSafe("actionOut", "error");
    setOutputSafe("errorOut", message);
    setOutputSafe("debugStep", debugStep);
    console.log(JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "error",
      errorOut: message,
      debugStep,
    }));
    throw error;
  }
}

try {
  await main();
} catch (error) {
  // outputs already set in main
  throw error;
}
