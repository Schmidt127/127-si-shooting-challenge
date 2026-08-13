/*
 * PKG-034 — Read-only Zoom live-attendance XP lifecycle audit
 *
 * This extension never writes, deletes, or repairs records. It reports
 * evidence gaps and exact-key ownership problems for Automation 101's
 * ZOOM_ATTEND_* families. Recording-credit families are reported as
 * unsupported-by-PKG-034 and are never treated as live attendance.
 */

// @ts-nocheck

const CONFIG = {
  scriptName: "audit-zoom-live-attendance-xp-lifecycle",
  version: "v1.0",
  dryRun: true,
  tables: {
    zoom: "Zoom Meetings",
    enrollments: "Enrollments",
    weeks: "Weeks",
    rules: "XP Reward Rules",
    xp: "XP Events",
    was: "Weekly Athlete Summary",
  },
  zoom: {
    key: "Zoom Meeting Key",
    attendees: "Attendees",
    week: "Week",
    status: "Meeting Status",
    create: "Create XP Events",
    awardStatus: "XP Award Status",
    xpEvents: "XP Events",
    currentSignature: "Zoom XP Current Signature",
    lastSignature: "Last Zoom XP Reconciled Signature",
    needed: "Zoom XP Reconciliation Needed?",
    enrollmentSignatureLookup: "Zoom XP Enrollment Signature - Lkp",
    weekSignatureLookup: "Zoom XP Week Signature - Lkp",
    eventSignatureLookup: "Zoom XP Event Signature - Lkp",
  },
  enrollment: {
    active: "Active?",
    athlete: "Athlete",
    programInstance: "Program Instance",
    schoolYear: "School Year",
    signature: "Zoom XP Enrollment Signature",
  },
  week: {
    programInstance: "Program Instance",
    schoolYear: "School Year",
    signature: "Zoom XP Week Signature",
  },
  rule: {
    key: "Rule Key",
    active: "Active?",
    amount: "XP Amount",
  },
  xp: {
    sourceKey: "Source Key",
    enrollment: "Enrollment",
    week: "Week",
    was: "Weekly Athlete Summary",
    meeting: "Zoom Meeting",
    active: "Active?",
    bucket: "XP Bucket",
    source: "XP Source",
    points: "XP Points",
  },
  was: {
    enrollment: "Enrollment",
    week: "Week",
  },
  sourcePrefixes: ["ZOOM_ATTEND_BASE|", "ZOOM_ATTEND_BONUS_2|", "ZOOM_ATTEND_BONUS_3|"],
  supportedRuleKeys: ["ZOOM_ATTEND_BASE", "ZOOM_ATTEND_BONUS_2", "ZOOM_ATTEND_BONUS_3"],
};

const SAMPLE_LIMIT = 25;

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function raw(record, table, fieldName) {
  return fieldExists(table, fieldName) ? record.getCellValue(fieldName) : null;
}

function text(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function ids(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  return Array.isArray(value) ? [...new Set(value.map((item) => item?.id).filter(Boolean))] : [];
}

function booleanish(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  if (value === true || value === 1) return true;
  return ["true", "1", "yes", "checked", "active"].includes(
    String(value?.name ?? value ?? "").trim().toLowerCase(),
  );
}

function numberValue(record, table, fieldName) {
  const value = raw(record, table, fieldName);
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/[$,%]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function addIssue(report, type, row) {
  report.issueCounts[type] = (report.issueCounts[type] || 0) + 1;
  if ((report.samples[type] || []).length < SAMPLE_LIMIT) report.samples[type].push(row);
}

function one(idsValue) {
  const values = [...new Set(idsValue || [])];
  return values.length === 1 ? values[0] : "";
}

function sourceType(sourceKey) {
  const value = String(sourceKey || "");
  if (value.startsWith("ZOOM_ATTEND_BASE|")) return "base";
  if (value.startsWith("ZOOM_ATTEND_BONUS_2|")) return "bonus2";
  if (value.startsWith("ZOOM_ATTEND_BONUS_3|")) return "bonus3";
  if (value.startsWith("ZOOM_CREDIT|") || value.startsWith("ZOOM_RECORDING|")) return "unsupported_recording";
  return "";
}

function exactRuleMap(ruleRecords, rulesTable) {
  const map = new Map();
  for (const record of ruleRecords) {
    const key = text(record, rulesTable, CONFIG.rule.key).toUpperCase();
    if (!CONFIG.supportedRuleKeys.includes(key) || !booleanish(record, rulesTable, CONFIG.rule.active)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  return map;
}

async function main() {
  const zoomTable = base.getTable(CONFIG.tables.zoom);
  const enrollmentTable = base.getTable(CONFIG.tables.enrollments);
  const weekTable = base.getTable(CONFIG.tables.weeks);
  const rulesTable = base.getTable(CONFIG.tables.rules);
  const xpTable = base.getTable(CONFIG.tables.xp);
  const wasTable = base.getTable(CONFIG.tables.was);

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,
    readOnly: true,
    scope: "Zoom Meetings and XP Events using Automation 101 live source-key families",
    issueCounts: {},
    samples: {},
    counts: {},
    rewardRules: {},
    unsupportedRecordingXpEvents: [],
    backlinkGaps: [],
    lifecycleStateMismatches: [],
  };

  const zoomFields = Object.values(CONFIG.zoom).filter((fieldName) => fieldExists(zoomTable, fieldName));
  const enrollmentFields = Object.values(CONFIG.enrollment).filter((fieldName) => fieldExists(enrollmentTable, fieldName));
  const weekFields = Object.values(CONFIG.week).filter((fieldName) => fieldExists(weekTable, fieldName));
  const xpFields = Object.values(CONFIG.xp).filter((fieldName) => fieldExists(xpTable, fieldName));
  const wasFields = Object.values(CONFIG.was).filter((fieldName) => fieldExists(wasTable, fieldName));
  const ruleFields = Object.values(CONFIG.rule).filter((fieldName) => fieldExists(rulesTable, fieldName));

  const missingReconciliationFields = [
    CONFIG.zoom.currentSignature,
    CONFIG.zoom.lastSignature,
    CONFIG.zoom.needed,
    CONFIG.zoom.enrollmentSignatureLookup,
    CONFIG.zoom.weekSignatureLookup,
    CONFIG.zoom.eventSignatureLookup,
  ].filter((fieldName) => !fieldExists(zoomTable, fieldName));
  if (!fieldExists(enrollmentTable, CONFIG.enrollment.signature)) {
    missingReconciliationFields.push(`Enrollments.${CONFIG.enrollment.signature}`);
  }
  if (!fieldExists(weekTable, CONFIG.week.signature)) {
    missingReconciliationFields.push(`Weeks.${CONFIG.week.signature}`);
  }
  report.counts.missingReconciliationFields = missingReconciliationFields;
  if (missingReconciliationFields.length) {
    addIssue(report, "reconciliation_schema_missing", { missingReconciliationFields });
  }

  const [zoomQuery, enrollmentQuery, weekQuery, rulesQuery, xpQuery, wasQuery] = await Promise.all([
    zoomTable.selectRecordsAsync({ fields: zoomFields }),
    enrollmentTable.selectRecordsAsync({ fields: enrollmentFields }),
    weekTable.selectRecordsAsync({ fields: weekFields }),
    rulesTable.selectRecordsAsync({ fields: ruleFields }),
    xpTable.selectRecordsAsync({ fields: xpFields }),
    wasTable.selectRecordsAsync({ fields: wasFields }),
  ]);

  const enrollments = new Map(enrollmentQuery.records.map((record) => [record.id, record]));
  const weeks = new Map(weekQuery.records.map((record) => [record.id, record]));
  const zooms = new Map(zoomQuery.records.map((record) => [record.id, record]));
  const xpByKey = new Map();
  const xpByMeeting = new Map();
  for (const event of xpQuery.records) {
    const key = text(event, xpTable, CONFIG.xp.sourceKey);
    const type = sourceType(key);
    if (type === "unsupported_recording") report.unsupportedRecordingXpEvents.push({ id: event.id, sourceKey: key });
    if (!type || type === "unsupported_recording") continue;
    if (!xpByKey.has(key)) xpByKey.set(key, []);
    xpByKey.get(key).push(event);
    for (const meetingId of ids(event, xpTable, CONFIG.xp.meeting)) {
      if (!xpByMeeting.has(meetingId)) xpByMeeting.set(meetingId, []);
      xpByMeeting.get(meetingId).push(event);
    }
  }
  const wasByPair = new Map();
  for (const record of wasQuery.records) {
    const key = `${one(ids(record, wasTable, CONFIG.was.enrollment))}|${one(ids(record, wasTable, CONFIG.was.week))}`;
    if (!key.startsWith("|")) {
      if (!wasByPair.has(key)) wasByPair.set(key, []);
      wasByPair.get(key).push(record);
    }
  }

  const rules = exactRuleMap(rulesQuery.records, rulesTable);
  for (const key of CONFIG.supportedRuleKeys) {
    const records = rules.get(key) || [];
    report.rewardRules[key] = {
      activeCount: records.length,
      recordIds: records.map((record) => record.id),
      amounts: records.map((record) => numberValue(record, rulesTable, CONFIG.rule.amount)),
      exactKeyOnly: true,
    };
    if (records.length !== 1) addIssue(report, "reward_rule_ambiguity", { ruleKey: key, recordIds: records.map((record) => record.id) });
    if (records.length === 1 && !(numberValue(records[0], rulesTable, CONFIG.rule.amount) > 0)) {
      addIssue(report, "reward_rule_invalid_amount", { ruleKey: key, recordId: records[0].id });
    }
  }

  const duplicateMeetingKeys = new Map();
  for (const meeting of zoomQuery.records) {
    const key = text(meeting, zoomTable, CONFIG.zoom.key);
    if (!key) continue;
    if (!duplicateMeetingKeys.has(key)) duplicateMeetingKeys.set(key, []);
    duplicateMeetingKeys.get(key).push(meeting.id);
  }
  for (const [key, recordIds] of duplicateMeetingKeys) {
    if (recordIds.length > 1) addIssue(report, "duplicate_attendance_import", { meetingKey: key, recordIds });
  }

  for (const meeting of zoomQuery.records) {
    const attendeeIds = ids(meeting, zoomTable, CONFIG.zoom.attendees);
    const weekIds = ids(meeting, zoomTable, CONFIG.zoom.week);
    const meetingKey = text(meeting, zoomTable, CONFIG.zoom.key);
    const completed = text(meeting, zoomTable, CONFIG.zoom.status).toLowerCase() === "completed";
    const eventRows = xpByMeeting.get(meeting.id) || [];

    if (attendeeIds.length !== 1) addIssue(report, "wrong_or_multiple_enrollment_links", { meetingId: meeting.id, attendeeIds });
    if (weekIds.length !== 1) addIssue(report, "wrong_or_multiple_week_links", { meetingId: meeting.id, weekIds });
    if (!meetingKey) addIssue(report, "missing_meeting_identity", { meetingId: meeting.id });

    for (const enrollmentId of attendeeIds) {
      const enrollment = enrollments.get(enrollmentId);
      const week = weeks.get(weekIds[0]);
      if (!enrollment) {
        addIssue(report, "participant_identity_ambiguity", { meetingId: meeting.id, enrollmentId });
        continue;
      }
      if (!booleanish(enrollment, enrollmentTable, CONFIG.enrollment.active)) {
        addIssue(report, "inactive_enrollment", { meetingId: meeting.id, enrollmentId });
      }
      const enrollmentPi = ids(enrollment, enrollmentTable, CONFIG.enrollment.programInstance);
      const weekPi = week ? ids(week, weekTable, CONFIG.week.programInstance) : [];
      const enrollmentYear = text(enrollment, enrollmentTable, CONFIG.enrollment.schoolYear);
      const weekYear = week ? text(week, weekTable, CONFIG.week.schoolYear) : "";
      if (enrollmentPi.length !== 1 || weekPi.length !== 1 || enrollmentPi[0] !== weekPi[0]) {
        addIssue(report, "wrong_program_instance", { meetingId: meeting.id, enrollmentId, enrollmentPi, weekPi });
      }
      if (!enrollmentYear || !weekYear || enrollmentYear !== weekYear) {
        addIssue(report, "wrong_school_year", { meetingId: meeting.id, enrollmentId, enrollmentYear, weekYear });
      }

      const baseKey = meetingKey ? `ZOOM_ATTEND_BASE|${meetingKey}|${enrollmentId}` : "";
      const baseEvents = baseKey ? (xpByKey.get(baseKey) || []) : [];
      if (completed && baseEvents.length === 0) addIssue(report, "eligible_attendance_missing_xp", { meetingId: meeting.id, enrollmentId, sourceKey: baseKey });
      if (baseEvents.length > 1) addIssue(report, "duplicate_canonical_key", { meetingId: meeting.id, enrollmentId, sourceKey: baseKey, xpEventIds: baseEvents.map((event) => event.id) });

      for (const event of baseEvents) {
        const eventEnrollmentIds = ids(event, xpTable, CONFIG.xp.enrollment);
        const eventWeekIds = ids(event, xpTable, CONFIG.xp.week);
        const eventMeetingIds = ids(event, xpTable, CONFIG.xp.meeting);
        const eventWasIds = ids(event, xpTable, CONFIG.xp.was);
        if (!same(eventEnrollmentIds, [enrollmentId])) addIssue(report, "event_enrollment_ownership_gap", { eventId: event.id, meetingId: meeting.id, enrollmentId, eventEnrollmentIds });
        if (!same(eventWeekIds, weekIds)) addIssue(report, "event_week_ownership_gap", { eventId: event.id, meetingId: meeting.id, eventWeekIds, weekIds });
        if (!same(eventMeetingIds, [meeting.id])) addIssue(report, "event_meeting_ownership_gap", { eventId: event.id, meetingId: meeting.id, eventMeetingIds });
        const wasMatches = wasByPair.get(`${enrollmentId}|${weekIds[0]}`) || [];
        if (wasMatches.length === 0) addIssue(report, "zero_canonical_was", { eventId: event.id, enrollmentId, weekId: weekIds[0] });
        if (wasMatches.length > 1) addIssue(report, "multiple_canonical_was", { eventId: event.id, enrollmentId, weekId: weekIds[0], wasIds: wasMatches.map((row) => row.id) });
        if (eventWasIds.length !== 1 || (wasMatches.length === 1 && eventWasIds[0] !== wasMatches[0].id)) {
          addIssue(report, "blank_or_wrong_was_backlink", { eventId: event.id, eventWasIds, expectedWasIds: wasMatches.map((row) => row.id) });
        }
        if (!booleanish(event, xpTable, CONFIG.xp.active) && completed) addIssue(report, "eligible_inactive_xp", { eventId: event.id, meetingId: meeting.id, enrollmentId });
        if (booleanish(event, xpTable, CONFIG.xp.active) && (!completed || !booleanish(enrollment, enrollmentTable, CONFIG.enrollment.active))) {
          addIssue(report, "ineligible_active_xp", { eventId: event.id, meetingId: meeting.id, enrollmentId });
        }
      }
    }

    for (const event of eventRows) {
      const sourceKey = text(event, xpTable, CONFIG.xp.sourceKey);
      if (!sourceType(sourceKey)) continue;
      if (!ids(event, xpTable, CONFIG.xp.meeting).includes(meeting.id)) {
        addIssue(report, "orphan_zoom_xp_event", { eventId: event.id, meetingId: meeting.id, sourceKey });
      }
      if (!ids(event, xpTable, CONFIG.xp.was).length) addIssue(report, "backlink_gap", { eventId: event.id, field: CONFIG.xp.was });
    }

    if (fieldExists(zoomTable, CONFIG.zoom.needed)) {
      const needed = numberValue(meeting, zoomTable, CONFIG.zoom.needed);
      if (![0, 1].includes(needed)) addIssue(report, "reconciliation_needed_not_numeric", { meetingId: meeting.id, value: needed });
    }
  }

  for (const event of xpQuery.records) {
    const sourceKey = text(event, xpTable, CONFIG.xp.sourceKey);
    if (!sourceType(sourceKey) || sourceType(sourceKey) === "unsupported_recording") continue;
    const meetingIds = ids(event, xpTable, CONFIG.xp.meeting);
    if (meetingIds.length !== 1 || !zooms.has(meetingIds[0])) addIssue(report, "orphan_zoom_xp_event", { eventId: event.id, sourceKey, meetingIds });
  }

  report.counts.zoomMeetings = zoomQuery.records.length;
  report.counts.enrollments = enrollmentQuery.records.length;
  report.counts.weeks = weekQuery.records.length;
  report.counts.xpEvents = xpQuery.records.length;
  report.counts.zoomXpEvents = [...xpByKey.values()].reduce((sum, rows) => sum + rows.length, 0);
  report.counts.unsupportedRecordingXpEvents = report.unsupportedRecordingXpEvents.length;
  report.counts.issueTotal = Object.values(report.issueCounts).reduce((sum, value) => sum + value, 0);

  console.log("===== PKG-034 ZOOM LIVE-ATTENDANCE XP AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

function same(left, right) {
  const a = [...new Set(left || [])].sort();
  const b = [...new Set(right || [])].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

await main();
